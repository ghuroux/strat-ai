import type { RequestHandler } from './$types';
import { createChatCompletion, mapErrorMessage, supportsExtendedThinking } from '$lib/server/litellm';
import type { ChatCompletionRequest, ChatMessage, MessageContentBlock } from '$lib/types/api';
import { getFullSystemPrompt } from '$lib/config/system-prompts';
import { getAssistById } from '$lib/config/assists';

/**
 * Assist API endpoint
 *
 * Handles assist-specific chat completions with composed system prompts:
 * platform prompt + space context + assist-specific instructions
 */

interface AssistRequest {
	assistId: string;
	messages: ChatMessage[];
	model: string;
	spaceId: string;
	thinkingEnabled?: boolean;
	thinkingBudgetTokens?: number;
}

/**
 * Check if model supports explicit cache_control (Anthropic Claude models)
 */
function shouldUseCacheControl(model: string): boolean {
	const lowerModel = model.toLowerCase();
	return lowerModel.includes('claude') || lowerModel.includes('anthropic');
}

/**
 * Build the complete system prompt for an assist
 * Composes: platform prompt + space context + assist instructions
 * Note: For system spaces, spaceId is the same as the slug (work, research, etc.)
 */
function buildAssistSystemPrompt(model: string, spaceId: string, assistId: string): string | null {
	const assist = getAssistById(assistId);
	if (!assist) return null;

	// Get base system prompt (platform + space)
	// For system spaces, spaceId === slug, so we can pass it directly
	const basePrompt = getFullSystemPrompt(model, spaceId as 'work' | 'research' | 'random' | 'personal' | null);
	if (!basePrompt) return assist.systemPromptAddition;

	// Compose with assist-specific instructions
	return `${basePrompt}

---

${assist.systemPromptAddition}`;
}

/**
 * Add cache_control breakpoints for Anthropic prompt caching
 * Simplified version - just cache the system message and recent history
 */
function addCacheBreakpoints(messages: ChatMessage[], model: string): ChatMessage[] {
	if (!shouldUseCacheControl(model)) {
		return messages;
	}

	// Find indices to cache (max 4)
	const cacheIndices = new Set<number>();

	// Always cache system message
	const systemIndex = messages.findIndex(m => m.role === 'system');
	if (systemIndex >= 0) {
		cacheIndices.add(systemIndex);
	}

	// Cache last few non-system messages
	const lastUserIndex = messages.length - 1; // Current user message
	for (let i = lastUserIndex - 1; i >= 0 && cacheIndices.size < 4; i--) {
		if (messages[i].role !== 'system') {
			cacheIndices.add(i);
		}
	}

	return messages.map((msg, index) => {
		if (!cacheIndices.has(index) || msg.role === 'tool') {
			return msg;
		}

		if (typeof msg.content === 'string') {
			return {
				...msg,
				content: [{
					type: 'text' as const,
					text: msg.content,
					cache_control: { type: 'ephemeral' as const }
				}]
			};
		}

		if (Array.isArray(msg.content) && msg.content.length > 0) {
			const blocks = [...msg.content] as MessageContentBlock[];
			const lastBlock = blocks[blocks.length - 1];
			blocks[blocks.length - 1] = {
				...lastBlock,
				cache_control: { type: 'ephemeral' as const }
			};
			return { ...msg, content: blocks };
		}

		return msg;
	});
}

export const POST: RequestHandler = async ({ request, locals }) => {
	console.log('Assist API called');

	// Verify session
	if (!locals.session) {
		return new Response(
			JSON.stringify({ error: { message: 'Unauthorized', type: 'auth_error' } }),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Parse request body
	let body: AssistRequest;
	try {
		body = await request.json();
	} catch {
		return new Response(
			JSON.stringify({ error: { message: 'Invalid JSON', type: 'parse_error' } }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Validate request
	if (!body.model || !body.messages || !body.assistId || !body.spaceId) {
		return new Response(
			JSON.stringify({
				error: { message: 'Invalid request: model, messages, assistId, and spaceId are required', type: 'validation_error' }
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Validate assist exists
	const assist = getAssistById(body.assistId);
	if (!assist) {
		return new Response(
			JSON.stringify({
				error: { message: `Unknown assist: ${body.assistId}`, type: 'validation_error' }
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Check if extended thinking is enabled
	const thinkingEnabled = body.thinkingEnabled && supportsExtendedThinking(body.model);

	console.log('Assist request:', {
		assistId: body.assistId,
		assistName: assist.name,
		model: body.model,
		spaceId: body.spaceId,
		messageCount: body.messages.length,
		thinkingEnabled
	});

	try {
		// Build complete system prompt
		const systemPrompt = buildAssistSystemPrompt(body.model, body.spaceId, body.assistId);

		// Prepare messages with system prompt
		let messages: ChatMessage[] = systemPrompt
			? [{ role: 'system' as const, content: systemPrompt }, ...body.messages]
			: body.messages;

		// Add cache breakpoints
		messages = addCacheBreakpoints(messages, body.model);

		// Build request
		const llmRequest: ChatCompletionRequest = {
			model: body.model,
			messages,
			stream: true
		};

		// Add thinking config if enabled
		if (thinkingEnabled) {
			const budgetTokens = body.thinkingBudgetTokens || 10000;
			llmRequest.thinking = {
				type: 'enabled',
				budget_tokens: budgetTokens
			};
			// max_tokens must be greater than thinking.budget_tokens
			llmRequest.max_tokens = budgetTokens + 8000;
		}

		// Make request to LiteLLM
		const litellmResponse = await createChatCompletion(llmRequest);

		if (!litellmResponse.ok) {
			const errorBody = await litellmResponse.text();
			console.error('LiteLLM error:', litellmResponse.status, errorBody);

			let errorMessage = `LiteLLM error: ${litellmResponse.statusText}`;
			try {
				const errorJson = JSON.parse(errorBody);
				if (errorJson.error?.message) {
					errorMessage = errorJson.error.message;
				}
			} catch {
				// Use default error message
			}

			return new Response(
				JSON.stringify({
					error: {
						message: mapErrorMessage(new Error(errorMessage)),
						type: 'upstream_error'
					}
				}),
				{
					status: litellmResponse.status,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Stream the response
		return streamAssistResponse(litellmResponse, thinkingEnabled ?? false);

	} catch (err) {
		console.error('Assist endpoint error:', err);
		return new Response(
			JSON.stringify({
				error: {
					message: mapErrorMessage(err),
					type: 'server_error'
				}
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};

/**
 * Stream assist response with thinking support
 * Uses the same SSE format as the main chat API
 */
function streamAssistResponse(litellmResponse: Response, thinkingEnabled: boolean): Response {
	const reader = litellmResponse.body?.getReader();
	if (!reader) {
		return new Response(
			JSON.stringify({ error: { message: 'No response body', type: 'stream_error' } }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	const stream = new ReadableStream({
		async start(controller) {
			let buffer = '';
			let isThinking = false;

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						// End thinking if still active
						if (isThinking) {
							controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking_end' })}\n\n`));
						}
						controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
						controller.close();
						break;
					}

					const decoded = decoder.decode(value, { stream: true });
					buffer += decoded;

					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							if (data === '[DONE]') {
								continue;
							}

							try {
								const chunk = JSON.parse(data);
								const delta = chunk.choices?.[0]?.delta;

								if (delta) {
									// Check for thinking content
									const thinkingContent = delta.thinking || delta.reasoning_content;
									if (thinkingContent) {
										if (!isThinking) {
											isThinking = true;
											controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking_start' })}\n\n`));
										}
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: thinkingContent })}\n\n`));
										continue;
									}

									// Check for thinking_blocks in provider_specific_fields
									if (delta.provider_specific_fields?.thinking_blocks) {
										const blocks = delta.provider_specific_fields.thinking_blocks;
										if (Array.isArray(blocks)) {
											for (const block of blocks) {
												if (block.thinking) {
													if (!isThinking) {
														isThinking = true;
														controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking_start' })}\n\n`));
													}
													controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: block.thinking })}\n\n`));
												}
											}
											continue;
										}
									}

									// Regular text content
									if (delta.content) {
										if (isThinking) {
											isThinking = false;
											controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking_end' })}\n\n`));
										}
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`));
									}
								}
							} catch {
								// Pass through unparseable lines
								controller.enqueue(encoder.encode(`${line}\n`));
							}
						}
					}
				}
			} catch (err) {
				console.error('Stream error:', err);
				controller.error(err);
			}
		},
		cancel() {
			reader.cancel();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}
