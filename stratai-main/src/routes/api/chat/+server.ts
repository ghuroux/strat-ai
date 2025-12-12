import type { RequestHandler } from './$types';
import { createChatCompletion, createChatCompletionWithTools, mapErrorMessage, supportsExtendedThinking } from '$lib/server/litellm';
import { searchWeb, formatSearchResultsForLLM, isBraveSearchConfigured } from '$lib/server/brave-search';
import type { ChatCompletionRequest, ToolDefinition, ThinkingConfig, ChatMessage, MessageContentBlock } from '$lib/types/api';
import { getPlatformPrompt } from '$lib/config/system-prompts';

/**
 * Check if model supports explicit cache_control (Anthropic Claude models)
 * OpenAI handles caching automatically, so we only add cache_control for Claude
 */
function shouldUseCacheControl(model: string): boolean {
	const lowerModel = model.toLowerCase();
	return lowerModel.includes('claude') || lowerModel.includes('anthropic');
}

/**
 * Add cache_control breakpoints to conversation history for Anthropic prompt caching
 * This marks historical messages (all except the current user message) for caching,
 * achieving up to 90% cost reduction on cached tokens.
 *
 * Cache breakpoints tell Anthropic: "cache everything up to and including this point"
 * - System prompts: always cached
 * - Historical messages: cached (all messages before the current user message)
 * - Current user message: NOT cached (it's new each turn)
 */
function addCacheBreakpoints(messages: ChatMessage[], model: string): ChatMessage[] {
	// Only apply cache_control for Claude models
	if (!shouldUseCacheControl(model)) {
		return messages;
	}

	// Find the last user message index (current turn - don't cache this one)
	let lastUserIndex = -1;
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === 'user') {
			lastUserIndex = i;
			break;
		}
	}

	return messages.map((msg, index) => {
		// Don't add cache_control to the current user message
		if (index === lastUserIndex) {
			return msg;
		}

		// Skip tool messages - they have special handling
		if (msg.role === 'tool') {
			return msg;
		}

		// Convert string content to content block with cache_control
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

		// If already array, add cache_control to last block
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

/**
 * Inject platform-level system prompt before user messages
 * This provides consistent baseline behavior across all conversations
 * The platform prompt is composed with any user-provided system prompt
 */
function injectPlatformPrompt(messages: ChatMessage[], model: string): ChatMessage[] {
	const platformPrompt = getPlatformPrompt(model);
	if (!platformPrompt) return messages;

	// Find the first system message (if any)
	const systemIndex = messages.findIndex(m => m.role === 'system');

	if (systemIndex >= 0) {
		// Prepend platform prompt to existing system message
		const existingSystem = messages[systemIndex];
		const existingContent = typeof existingSystem.content === 'string'
			? existingSystem.content
			: Array.isArray(existingSystem.content)
				? existingSystem.content.map(c => 'text' in c ? c.text : '').join('\n')
				: '';

		const updatedMessages = [...messages];
		updatedMessages[systemIndex] = {
			...existingSystem,
			content: `${platformPrompt}\n\n---\n\nUser Instructions:\n${existingContent}`
		};
		return updatedMessages;
	} else {
		// Add new system message at the beginning
		return [
			{ role: 'system' as const, content: platformPrompt },
			...messages
		];
	}
}

// Web search tool definition for Claude
const webSearchTool: ToolDefinition = {
	name: 'web_search',
	description: 'Search the web for current information. Use this when the user asks about recent events, current news, real-time data, weather, prices, or anything that might have changed since your training cutoff. The search returns titles, URLs, and description snippets from relevant web pages. After receiving results, synthesize the information into a helpful, comprehensive answer.',
	input_schema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'The search query to look up on the web. Be specific and include relevant details like location, date, or context.'
			}
		},
		required: ['query']
	}
};

// System message to add when search is enabled
const searchSystemMessage = `You have access to web search. When you use the web_search tool:
1. Analyze the search results carefully and extract relevant information from the snippets
2. Synthesize the information into a clear, helpful response that directly answers the user's question
3. If the snippets don't contain enough detail, explain what you found and suggest the user visit the sources for more details
4. Always cite your sources by mentioning which results you drew information from
5. For weather, prices, or time-sensitive data, note that the information comes from web search and may need verification`;

/**
 * Prepare messages with search system context
 * Adds or augments the system message with search instructions
 */
function prepareMessagesWithSearchContext(messages: ChatCompletionRequest['messages']): ChatCompletionRequest['messages'] {
	const result = [...messages];

	// Check if there's already a system message
	const systemIndex = result.findIndex(m => m.role === 'system');

	if (systemIndex >= 0) {
		// Augment existing system message
		const existingSystem = result[systemIndex];
		// System messages should always be strings, not content arrays
		const existingContent = typeof existingSystem.content === 'string'
			? existingSystem.content
			: JSON.stringify(existingSystem.content);
		result[systemIndex] = {
			...existingSystem,
			content: `${existingContent}\n\n${searchSystemMessage}`
		};
	} else {
		// Add new system message at the beginning
		result.unshift({
			role: 'system',
			content: searchSystemMessage
		});
	}

	return result;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	console.log('Chat API called');

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
	let body: ChatCompletionRequest;
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
	if (!body.model || !body.messages || !Array.isArray(body.messages)) {
		return new Response(
			JSON.stringify({
				error: { message: 'Invalid request: model and messages are required', type: 'validation_error' }
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Check if search is enabled and Brave Search is configured
	const braveConfigured = isBraveSearchConfigured();
	const searchEnabled = body.searchEnabled && braveConfigured;

	// Check if extended thinking is enabled for Claude models
	const thinkingEnabled = body.thinkingEnabled && supportsExtendedThinking(body.model);

	console.log('Search debug:', {
		bodySearchEnabled: body.searchEnabled,
		braveConfigured,
		searchEnabled
	});

	console.log('Thinking debug:', {
		thinkingEnabled: body.thinkingEnabled,
		modelSupportsThinking: supportsExtendedThinking(body.model),
		actualThinkingEnabled: thinkingEnabled,
		budgetTokens: body.thinkingBudgetTokens
	});

	// Remove client-specific fields before forwarding to LiteLLM
	const { searchEnabled: _, thinkingEnabled: __, thinkingBudgetTokens: ___, ...cleanBody } = body;

	// Add thinking config if enabled
	if (thinkingEnabled) {
		cleanBody.thinking = {
			type: 'enabled',
			budget_tokens: body.thinkingBudgetTokens || 10000
		};
	}

	try {
		console.log('Forwarding to LiteLLM:', cleanBody.model, cleanBody.messages.length, 'messages', searchEnabled ? '(search enabled)' : '', thinkingEnabled ? '(thinking enabled)' : '');

		// Log message structure for debugging vision messages
		cleanBody.messages.forEach((msg, idx) => {
			const contentType = Array.isArray(msg.content) ? 'array' : typeof msg.content;
			const contentPreview = Array.isArray(msg.content)
				? `[${msg.content.map(c => c.type).join(', ')}]`
				: (typeof msg.content === 'string' ? msg.content.slice(0, 50) + '...' : String(msg.content));
			console.log(`  Message ${idx}: role=${msg.role}, contentType=${contentType}, preview=${contentPreview}`);
		});

		// If search is enabled, use tool handling
		if (searchEnabled) {
			return await handleChatWithTools(cleanBody, thinkingEnabled);
		}

		// Inject platform system prompt (before cache breakpoints so it gets cached)
		const messagesWithPlatformPrompt = injectPlatformPrompt(cleanBody.messages, cleanBody.model);

		// Apply cache breakpoints for Claude models (conversation history caching)
		const messagesWithCache = addCacheBreakpoints(messagesWithPlatformPrompt, cleanBody.model);

		// Log cache breakpoint application for debugging
		if (shouldUseCacheControl(cleanBody.model)) {
			const cachedCount = messagesWithCache.filter(m =>
				Array.isArray(m.content) &&
				m.content.some((c: MessageContentBlock) => 'cache_control' in c)
			).length;
			console.log(`Cache breakpoints: ${cachedCount}/${messagesWithCache.length} messages marked for caching`);
		}

		// Standard streaming response without tools
		const litellmResponse = await createChatCompletion({
			...cleanBody,
			messages: messagesWithCache
		});
		console.log('LiteLLM response status:', litellmResponse.status);

		// Log cache statistics if available (for monitoring prompt caching effectiveness)
		const cacheHeader = litellmResponse.headers.get('x-litellm-cache-key');
		if (cacheHeader) {
			console.log('Cache key:', cacheHeader);
		}

		// Check for cache statistics in response headers (Anthropic returns these)
		const cacheCreation = litellmResponse.headers.get('x-cache-creation-input-tokens');
		const cacheRead = litellmResponse.headers.get('x-cache-read-input-tokens');
		if (cacheCreation || cacheRead) {
			console.log('Cache stats:', {
				created: cacheCreation || '0',
				read: cacheRead || '0',
				savings: cacheRead ? `${Math.round(parseInt(cacheRead) * 0.9)} tokens at 90% off` : 'N/A'
			});
		}

		if (!litellmResponse.ok) {
			return await handleLiteLLMError(litellmResponse);
		}

		return streamResponse(litellmResponse, thinkingEnabled);

	} catch (err) {
		console.error('Chat endpoint error:', err);
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
 * Handle chat with tools (web search)
 * This uses non-streaming for the initial request to detect tool use
 * Supports interleaved thinking for Claude 4+ models when thinkingEnabled is true
 *
 * IMPORTANT: Anthropic requires ALL tool_use blocks to have corresponding
 * tool_result blocks in the immediately following message. We must:
 * 1. Execute ALL tool calls first
 * 2. Collect ALL results
 * 3. Send ALL tool_result blocks together in ONE message
 */
async function handleChatWithTools(body: ChatCompletionRequest, thinkingEnabled: boolean = false): Promise<Response> {
	const encoder = new TextEncoder();

	// Inject platform prompt, then cache breakpoints, then search context
	const messagesWithPlatformPrompt = injectPlatformPrompt(body.messages, body.model);
	const cachedMessages = addCacheBreakpoints(messagesWithPlatformPrompt, body.model);
	const messagesWithSearchContext = prepareMessagesWithSearchContext(cachedMessages);

	// Create a ReadableStream for SSE
	const stream = new ReadableStream({
		async start(controller) {
			try {
				// Make initial request with tools (non-streaming to detect tool use)
				const initialResponse = await createChatCompletionWithTools({
					...body,
					messages: messagesWithSearchContext,
					stream: false,
					tools: [webSearchTool]
				});

				if (!initialResponse.ok) {
					const errorBody = await initialResponse.text();
					console.error('LiteLLM error with tools:', initialResponse.status, errorBody);
					sendSSE(controller, encoder, {
						type: 'error',
						error: `Request failed: ${initialResponse.statusText}`
					});
					controller.close();
					return;
				}

				const responseData = await initialResponse.json();
				console.log('Initial response:', JSON.stringify(responseData, null, 2).slice(0, 1000));

				// Extract and send any thinking content from the initial response
				// This happens BEFORE tool execution for the premium UX
				if (thinkingEnabled) {
					const thinkingContent = extractThinkingFromResponse(responseData);
					if (thinkingContent) {
						sendSSE(controller, encoder, { type: 'thinking_start' });
						// Send thinking in chunks for streaming effect
						const chunkSize = 50;
						for (let i = 0; i < thinkingContent.length; i += chunkSize) {
							sendSSE(controller, encoder, {
								type: 'thinking',
								content: thinkingContent.slice(i, i + chunkSize)
							});
							await new Promise(resolve => setTimeout(resolve, 10));
						}
						sendSSE(controller, encoder, { type: 'thinking_end' });
					}
				}

				// Check if the model wants to use a tool
				const message = responseData.choices?.[0]?.message;
				const toolCalls = message?.tool_calls;

				if (toolCalls && toolCalls.length > 0) {
					console.log(`Processing ${toolCalls.length} tool calls`);

					// Collect ALL sources and tool results
					const allSources: Array<{ title: string; url: string; snippet: string }> = [];
					const toolResults: Array<{ tool_call_id: string; content: string }> = [];
					const searchQueries: string[] = [];

					// First pass: collect all queries for status display
					for (const toolCall of toolCalls) {
						if (toolCall.function?.name === 'web_search') {
							const args = JSON.parse(toolCall.function.arguments || '{}');
							if (args.query) {
								searchQueries.push(args.query);
							}
						}
					}

					// Send searching status with first query (or combined)
					const statusQuery = searchQueries.length === 1
						? searchQueries[0]
						: `${searchQueries.length} searches: ${searchQueries.slice(0, 2).join(', ')}${searchQueries.length > 2 ? '...' : ''}`;

					sendSSE(controller, encoder, {
						type: 'status',
						status: 'searching',
						query: statusQuery
					});

					// Execute ALL tool calls and collect results
					for (const toolCall of toolCalls) {
						if (toolCall.function?.name === 'web_search') {
							const args = JSON.parse(toolCall.function.arguments || '{}');
							const query = args.query;

							if (query) {
								console.log('Executing web search:', query);

								try {
									const searchResults = await searchWeb(query);
									console.log('Search returned', searchResults.length, 'results for:', query);

									// Collect sources
									allSources.push(...searchResults.map(r => ({
										title: r.title,
										url: r.url,
										snippet: r.description
									})));

									// Format results for LLM
									const formattedResults = formatSearchResultsForLLM(searchResults);

									// Store tool result for this tool call
									toolResults.push({
										tool_call_id: toolCall.id,
										content: formattedResults
									});
								} catch (searchError) {
									console.error('Search error for query:', query, searchError);
									// Still add a tool result even on error (required by Anthropic)
									toolResults.push({
										tool_call_id: toolCall.id,
										content: `Search failed for "${query}": ${searchError instanceof Error ? searchError.message : 'Unknown error'}`
									});
								}
							} else {
								// No query provided - add empty result
								toolResults.push({
									tool_call_id: toolCall.id,
									content: 'No search query provided'
								});
							}
						} else {
							// Unknown tool - still need to provide a result
							toolResults.push({
								tool_call_id: toolCall.id,
								content: `Unknown tool: ${toolCall.function?.name}`
							});
						}
					}

					// Send sources preview immediately so UI can show favicons
					if (allSources.length > 0) {
						// Deduplicate sources by URL
						const uniqueSources = allSources.filter((source, index, self) =>
							index === self.findIndex(s => s.url === source.url)
						);

						sendSSE(controller, encoder, {
							type: 'sources_preview',
							sources: uniqueSources
						});
					}

					// Build the messages with ALL tool results
					// Anthropic requires: assistant message with tool_calls, then tool messages for EACH tool_call
					const messagesWithToolResults: ChatCompletionRequest['messages'] = [
						...messagesWithSearchContext,
						{
							role: 'assistant' as const,
							content: message.content || null,
							tool_calls: toolCalls
						},
						// Add ALL tool results as separate messages
						...toolResults.map(result => ({
							role: 'tool' as const,
							tool_call_id: result.tool_call_id,
							content: result.content
						}))
					];

					console.log('Sending', toolResults.length, 'tool results to LLM');
					console.log('Messages being sent:', JSON.stringify(messagesWithToolResults.slice(-4), null, 2).slice(0, 1000));

					// Send status update - now processing results
					sendSSE(controller, encoder, { type: 'status', status: 'processing' });

					// Add instruction to synthesize results (not make more searches)
					const synthesisInstruction = {
						role: 'user' as const,
						content: 'Please synthesize the search results above into a comprehensive answer. Do not make any more searches - use only the information you have received.'
					};

					// Get final response (streaming)
					// Must include tools because Anthropic requires it when tool_calls are in history
					const finalResponse = await createChatCompletionWithTools({
						...body,
						messages: [...messagesWithToolResults, synthesisInstruction],
						tools: [webSearchTool],
						stream: true
					});

					console.log('Final response status:', finalResponse.status, finalResponse.ok);

					if (!finalResponse.ok) {
						const errorText = await finalResponse.text();
						console.error('Final response error:', errorText);
						sendSSE(controller, encoder, {
							type: 'error',
							error: 'Failed to get final response'
						});
					} else {
						console.log('Starting to stream final response...');
						// Stream the final response
						await streamToController(finalResponse, controller, encoder, thinkingEnabled);
						console.log('Finished streaming final response');

						// Send sources after content (deduplicated)
						if (allSources.length > 0) {
							const uniqueSources = allSources.filter((source, index, self) =>
								index === self.findIndex(s => s.url === source.url)
							);

							sendSSE(controller, encoder, {
								type: 'sources',
								sources: uniqueSources
							});
						}
					}
				} else {
					// No tool use - stream the content directly
					if (message?.content) {
						// For non-streaming response, send content in chunks for better UX
						const content = message.content;
						const chunkSize = 10; // Characters per chunk
						for (let i = 0; i < content.length; i += chunkSize) {
							sendSSE(controller, encoder, {
								type: 'content',
								content: content.slice(i, i + chunkSize)
							});
							// Small delay for streaming effect
							await new Promise(resolve => setTimeout(resolve, 20));
						}
					}
				}

				sendSSE(controller, encoder, '[DONE]');
				controller.close();

			} catch (err) {
				console.error('Tool handling error:', err);
				sendSSE(controller, encoder, {
					type: 'error',
					error: err instanceof Error ? err.message : 'Unknown error'
				});
				controller.close();
			}
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

/**
 * Extract thinking content from a non-streaming response
 * Handles various formats from LiteLLM/Anthropic
 */
function extractThinkingFromResponse(responseData: Record<string, unknown>): string | null {
	try {
		const message = (responseData.choices as Array<{ message?: Record<string, unknown> }>)?.[0]?.message;
		if (!message) return null;

		// Check for thinking field directly
		if (typeof message.thinking === 'string' && message.thinking) {
			return message.thinking;
		}

		// Check for reasoning_content (alternative field name)
		if (typeof message.reasoning_content === 'string' && message.reasoning_content) {
			return message.reasoning_content;
		}

		// Check for thinking_blocks in provider_specific_fields
		const providerFields = message.provider_specific_fields as Record<string, unknown> | undefined;
		if (providerFields?.thinking_blocks) {
			const blocks = providerFields.thinking_blocks as Array<{ thinking?: string }>;
			if (Array.isArray(blocks)) {
				const thinkingParts = blocks
					.filter(b => b.thinking)
					.map(b => b.thinking);
				if (thinkingParts.length > 0) {
					return thinkingParts.join('\n');
				}
			}
		}

		// Check for content array with thinking blocks (native Anthropic format)
		if (Array.isArray(message.content)) {
			const thinkingBlocks = (message.content as Array<{ type?: string; thinking?: string }>)
				.filter(block => block.type === 'thinking' && block.thinking)
				.map(block => block.thinking);
			if (thinkingBlocks.length > 0) {
				return thinkingBlocks.join('\n');
			}
		}

		return null;
	} catch (err) {
		console.error('Error extracting thinking:', err);
		return null;
	}
}

/**
 * Send SSE event
 */
function sendSSE(
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder,
	data: string | object
) {
	const payload = typeof data === 'string' ? data : JSON.stringify(data);
	controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
}

/**
 * Stream response from LiteLLM to controller
 * Supports extended thinking content when thinkingEnabled is true
 */
async function streamToController(
	response: Response,
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder,
	thinkingEnabled: boolean = false
) {
	const reader = response.body?.getReader();
	if (!reader) {
		console.error('No reader available for streaming');
		return;
	}

	const decoder = new TextDecoder();
	let buffer = '';
	let chunkCount = 0;
	let isThinking = false;
	let hasReceivedContent = false;

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			console.log(`Stream complete. Total chunks processed: ${chunkCount}`);
			// If we were in thinking mode at the end, close it
			if (isThinking) {
				sendSSE(controller, encoder, { type: 'thinking_end' });
			}
			break;
		}

		const decoded = decoder.decode(value, { stream: true });
		buffer += decoded;

		// Log first chunk to see format
		if (chunkCount === 0) {
			console.log('First stream chunk:', decoded.slice(0, 500));
		}
		chunkCount++;

		const lines = buffer.split('\n');
		buffer = lines.pop() || '';

		for (const line of lines) {
			if (line.startsWith('data: ')) {
				const data = line.slice(6);
				if (data === '[DONE]') {
					console.log('Received [DONE] signal');
					continue;
				}

				try {
					const chunk = JSON.parse(data);
					const delta = chunk.choices?.[0]?.delta;

					// Log chunks to debug thinking content format
					if (thinkingEnabled && chunkCount <= 10) {
						console.log(`Stream chunk #${chunkCount}:`, JSON.stringify(delta).slice(0, 800));
					}

					if (delta) {
						// Check for thinking content - multiple possible field names from LiteLLM
						const thinkingContent = delta.thinking || delta.reasoning_content;
						if (thinkingContent) {
							if (!isThinking) {
								isThinking = true;
								sendSSE(controller, encoder, { type: 'thinking_start' });
							}
							sendSSE(controller, encoder, { type: 'thinking', content: thinkingContent });
							continue;
						}

						// Check for thinking_blocks in provider_specific_fields (LiteLLM format)
						if (delta.provider_specific_fields?.thinking_blocks) {
							const blocks = delta.provider_specific_fields.thinking_blocks;
							if (Array.isArray(blocks)) {
								for (const block of blocks) {
									if (block.thinking) {
										if (!isThinking) {
											isThinking = true;
											sendSSE(controller, encoder, { type: 'thinking_start' });
										}
										sendSSE(controller, encoder, { type: 'thinking', content: block.thinking });
									}
								}
								continue;
							}
						}

						// Check for content block with type "thinking" (native Anthropic format)
						if (delta.content_block?.type === 'thinking') {
							isThinking = true;
							sendSSE(controller, encoder, { type: 'thinking_start' });
							continue;
						}

						// Check for content block with type "text" - end thinking mode
						if (delta.content_block?.type === 'text' && isThinking) {
							isThinking = false;
							sendSSE(controller, encoder, { type: 'thinking_end' });
						}

						// Regular text content
						if (delta.content) {
							// If we were in thinking mode and get regular content, end thinking
							if (isThinking) {
								isThinking = false;
								sendSSE(controller, encoder, { type: 'thinking_end' });
							}
							sendSSE(controller, encoder, { type: 'content', content: delta.content });
							hasReceivedContent = true;
						}
					}
				} catch (e) {
					// Log parse errors for debugging
					console.error('JSON parse error:', e, 'Data:', data.slice(0, 200));
				}
			}
		}
	}
}

/**
 * Handle LiteLLM error response
 */
async function handleLiteLLMError(response: Response): Promise<Response> {
	const errorBody = await response.text();
	console.error('LiteLLM error:', response.status, errorBody);

	let errorMessage = `LiteLLM error: ${response.statusText}`;
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
			status: response.status,
			headers: { 'Content-Type': 'application/json' }
		}
	);
}

/**
 * Stream response with extended thinking support
 * Parses the stream to extract thinking content and regular content separately
 */
function streamResponse(litellmResponse: Response, thinkingEnabled: boolean = false): Response {
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
			let isThinking = false; // Don't start in thinking mode - wait for actual thinking content
			let hasReceivedContent = false; // Track if we've received any content yet

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						// Send done signal
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

								// Log first few chunks to debug thinking content
								if (!hasReceivedContent && thinkingEnabled) {
									console.log('Stream chunk (thinking enabled):', JSON.stringify(chunk).slice(0, 500));
								}

								if (delta) {
									// Check for thinking content - multiple possible field names from LiteLLM
									const thinkingContent = delta.thinking || delta.reasoning_content;
									if (thinkingContent) {
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

									// Check for thinking_blocks in provider_specific_fields (LiteLLM format)
									if (delta.provider_specific_fields?.thinking_blocks) {
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

									// Check for content block with type "thinking" (native Anthropic format)
									if (delta.content_block?.type === 'thinking') {
										isThinking = true;
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({
											type: 'thinking_start'
										})}\n\n`));
										continue;
									}

									// Check for content block with type "text" - end thinking mode
									if (delta.content_block?.type === 'text' && isThinking) {
										isThinking = false;
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({
											type: 'thinking_end'
										})}\n\n`));
									}

									// Regular text content - always send as content (not thinking)
									if (delta.content) {
										// If we were in thinking mode and get regular content, end thinking
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
										hasReceivedContent = true;
									}
								}
							} catch {
								// If we can't parse the JSON, pass through the line as-is
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
