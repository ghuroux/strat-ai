import type { RequestHandler } from './$types';
import { createChatCompletion, mapErrorMessage, supportsExtendedThinking } from '$lib/server/litellm';
import { postgresConversationRepository } from '$lib/server/persistence';
import type { ChatMessage, ChatCompletionRequest } from '$lib/types/api';

/**
 * System prompt for second opinion requests
 * Encourages independent thinking while acknowledging the context
 * Includes structured Key Guidance section for efficient injection back to original LLM
 */
const SECOND_OPINION_SYSTEM_PROMPT = `You are providing an independent second opinion on an AI conversation.

The user has been chatting with another AI assistant and wants your perspective on the most recent exchange.

Please:
1. Provide your own answer to the user's question
2. Note where you agree with the previous response (if applicable)
3. Highlight any concerns, alternatives, or additions you would suggest
4. Be constructive and helpful, not adversarial

Focus on being genuinely helpful - if the previous response was good, say so. If you have a different perspective, explain your reasoning.

IMPORTANT: At the end of your response, include a section titled "## Key Guidance" that summarizes the essential corrections, alternative approaches, or key insights that the original assistant should incorporate. Be concise but don't sacrifice important nuance - include what's necessary to redirect effectively. This section will be used to guide the original assistant if the user chooses to apply your suggestions.`;

/**
 * POST /api/chat/second-opinion
 * Get a second opinion from a different model
 *
 * Request body:
 * - conversationId: string - The conversation to get context from
 * - sourceMessageIndex: number - Index of the assistant message to get second opinion on
 * - modelId: string - The model to use for the second opinion
 * - thinkingEnabled?: boolean - Enable extended thinking if supported
 * - thinkingBudgetTokens?: number - Budget for thinking tokens
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	console.log('Second Opinion API called');

	// Verify session
	if (!locals.session) {
		console.log('No session found');
		return new Response(
			JSON.stringify({ error: { message: 'Unauthorized', type: 'auth_error' } }),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Parse request body
	let body: {
		conversationId: string;
		sourceMessageIndex: number;
		modelId: string;
		thinkingEnabled?: boolean;
		thinkingBudgetTokens?: number;
	};

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
	if (!body.conversationId || body.sourceMessageIndex === undefined || !body.modelId) {
		return new Response(
			JSON.stringify({
				error: {
					message: 'conversationId, sourceMessageIndex, and modelId are required',
					type: 'validation_error'
				}
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	try {
		// Fetch the conversation
		const conversation = await postgresConversationRepository.findById(
			body.conversationId,
			locals.session.userId
		);

		if (!conversation) {
			return new Response(
				JSON.stringify({ error: { message: 'Conversation not found', type: 'not_found' } }),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Validate source message index
		if (body.sourceMessageIndex < 0 || body.sourceMessageIndex >= conversation.messages.length) {
			return new Response(
				JSON.stringify({ error: { message: 'Invalid sourceMessageIndex', type: 'validation_error' } }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const sourceMessage = conversation.messages[body.sourceMessageIndex];
		if (sourceMessage.role !== 'assistant') {
			return new Response(
				JSON.stringify({ error: { message: 'Source message must be an assistant message', type: 'validation_error' } }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Build message history up to (but not including) the source message
		// This gives us the context the original assistant had
		const messagesUpToSource = conversation.messages.slice(0, body.sourceMessageIndex);

		// Find the user message that prompted the source response
		// (should be the message right before the source)
		const userMessageIndex = body.sourceMessageIndex - 1;
		const userMessage = userMessageIndex >= 0 ? conversation.messages[userMessageIndex] : null;

		// Build the messages for the second opinion request
		const messages: ChatMessage[] = [
			// System prompt for second opinion context
			{
				role: 'system',
				content: SECOND_OPINION_SYSTEM_PROMPT
			}
		];

		// Add conversation history (excluding the last user message, we'll handle that specially)
		const historyMessages = messagesUpToSource.slice(0, -1);
		for (const msg of historyMessages) {
			if (msg.role === 'user' || msg.role === 'assistant') {
				messages.push({
					role: msg.role,
					content: msg.content
				});
			}
		}

		// Add the user's question that prompted the original response
		if (userMessage && userMessage.role === 'user') {
			messages.push({
				role: 'user',
				content: userMessage.content
			});
		}

		// Add context about the original response
		messages.push({
			role: 'user',
			content: `The previous AI assistant responded:\n\n---\n${sourceMessage.content}\n---\n\nNow provide your independent perspective on this question.`
		});

		// Check if extended thinking is enabled for this model
		const thinkingEnabled = !!(body.thinkingEnabled && supportsExtendedThinking(body.modelId));

		console.log('Second opinion request:', {
			model: body.modelId,
			messageCount: messages.length,
			thinkingEnabled,
			sourceMessageIndex: body.sourceMessageIndex
		});

		// Build the request
		const thinkingBudget = body.thinkingBudgetTokens || 10000;
		const chatRequest: ChatCompletionRequest = {
			model: body.modelId,
			messages,
			stream: true
		};

		// Add thinking config if enabled
		// max_tokens must be greater than thinking.budget_tokens for Claude
		if (thinkingEnabled) {
			chatRequest.thinking = {
				type: 'enabled',
				budget_tokens: thinkingBudget
			};
			// Ensure max_tokens > budget_tokens (add 16K for response)
			chatRequest.max_tokens = thinkingBudget + 16000;
		}

		// Make the request to LiteLLM
		const litellmResponse = await createChatCompletion(chatRequest);
		console.log('LiteLLM second opinion response status:', litellmResponse.status);

		if (!litellmResponse.ok) {
			const errorBody = await litellmResponse.text();
			console.error('LiteLLM second opinion error:', litellmResponse.status, errorBody);

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
		return streamSecondOpinionResponse(litellmResponse, thinkingEnabled);

	} catch (err) {
		console.error('Second opinion endpoint error:', err);
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
 * Stream the second opinion response with extended thinking support
 */
function streamSecondOpinionResponse(litellmResponse: Response, thinkingEnabled: boolean): Response {
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
									if (thinkingContent && thinkingEnabled) {
										if (!isThinking) {
											isThinking = true;
											controller.enqueue(encoder.encode(`data: ${JSON.stringify({
												type: 'thinking_start'
											})}\n\n`));
										}
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({
											type: 'thinking',
											content: thinkingContent
										})}\n\n`));
										continue;
									}

									// Check for thinking_blocks in provider_specific_fields
									if (delta.provider_specific_fields?.thinking_blocks && thinkingEnabled) {
										const blocks = delta.provider_specific_fields.thinking_blocks;
										if (Array.isArray(blocks)) {
											for (const block of blocks) {
												if (block.thinking) {
													if (!isThinking) {
														isThinking = true;
														controller.enqueue(encoder.encode(`data: ${JSON.stringify({
															type: 'thinking_start'
														})}\n\n`));
													}
													controller.enqueue(encoder.encode(`data: ${JSON.stringify({
														type: 'thinking',
														content: block.thinking
													})}\n\n`));
												}
											}
											continue;
										}
									}

									// Regular content
									if (delta.content) {
										// End thinking mode if active
										if (isThinking) {
											isThinking = false;
											controller.enqueue(encoder.encode(`data: ${JSON.stringify({
												type: 'thinking_end'
											})}\n\n`));
										}
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({
											type: 'content',
											content: delta.content
										})}\n\n`));
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
				console.error('Second opinion stream error:', err);
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
