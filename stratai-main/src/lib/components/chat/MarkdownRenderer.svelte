<script lang="ts">
	import MarkdownIt from 'markdown-it';
	import { parse as parseEmoji } from '@twemoji/parser';
	import { getFluentEmojiUrl } from '$lib/utils/fluentEmoji';
	import hljs from 'highlight.js';
	import { copyCodeToClipboard, getLanguageDisplayName } from '$lib/utils/codeBlocks';
	// @ts-ignore - named export
	import { katex as katexPlugin } from '@mdit/plugin-katex';
	import 'katex/dist/katex.min.css';

	let { content, isStreaming = false }: { content: string; isStreaming?: boolean } = $props();

	let containerRef: HTMLDivElement;

	// Store code blocks by ID for copy functionality (avoids data attribute encoding issues)
	let codeBlockStore: Record<string, string> = {};

	// Generate unique ID for each code block
	let codeBlockCounter = 0;

	// Initialize markdown-it with security options
	const md = new MarkdownIt({
		html: false,        // CRITICAL: Disable raw HTML (XSS protection)
		breaks: true,       // Convert \n to <br>
		linkify: true,      // Auto-convert URLs to links
		typographer: false  // Keep raw quotes
	});

	// Add KaTeX support for math rendering
	// Supports: $...$ (inline), $$...$$ (display), \(...\) (inline), \[...\] (display)
	md.use(katexPlugin, {
		throwOnError: false,  // Don't throw on invalid LaTeX, show error message instead
		errorColor: '#cc0000',
		strict: false,        // Allow non-strict LaTeX
		output: 'html'        // Output HTML (vs mathml)
	});

	// Additional security: Block dangerous URL schemes in links
	md.validateLink = (url: string) => {
		const normalizedUrl = url.trim().toLowerCase();
		return !normalizedUrl.startsWith('javascript:') &&
		       !normalizedUrl.startsWith('vbscript:') &&
		       !normalizedUrl.startsWith('data:text/html');
	};

	// Custom fence renderer for code blocks with header and copy button
	md.renderer.rules.fence = function(tokens, idx, options, env, self) {
		const token = tokens[idx];
		const code = token.content;
		const lang = token.info.trim().split(/\s+/)[0] || '';

		const blockId = `code-block-${codeBlockCounter++}`;
		const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
		const displayLang = lang ? getLanguageDisplayName(lang) : 'plaintext';

		// Store raw code for copy functionality
		codeBlockStore[blockId] = code;

		let highlightedCode: string;
		try {
			highlightedCode = hljs.highlight(code, { language: validLang }).value;
		} catch {
			// Fallback: escape HTML manually
			highlightedCode = md.utils.escapeHtml(code);
		}

		return `<div class="code-block-wrapper" data-block-id="${blockId}"><div class="code-block-header"><span class="code-language">${displayLang}</span><button type="button" class="copy-code-btn" data-block-id="${blockId}" title="Copy code"><svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg><svg class="check-icon hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg><span class="copy-text">Copy</span></button></div><pre><code class="hljs language-${validLang}">${highlightedCode}</code></pre></div>`;
	};

	// Replace emojis with Fluent Emoji 3D images (with Twemoji SVG fallback)
	function replaceEmojisWithFluentEmoji(text: string): string {
		const entities = parseEmoji(text);
		if (entities.length === 0) return text;

		let result = '';
		let lastIndex = 0;

		for (const entity of entities) {
			// Add text before the emoji
			result += text.slice(lastIndex, entity.indices[0]);

			// Get Fluent Emoji 3D URL (with Twemoji as fallback via onerror)
			const fluentUrl = getFluentEmojiUrl(entity.text);
			const twemojiUrl = entity.url;

			// Use Fluent 3D emoji with Twemoji SVG fallback
			result += `<img class="emoji-icon" src="${fluentUrl}" alt="${entity.text}" draggable="false" onerror="this.onerror=null;this.src='${twemojiUrl}'" />`;
			lastIndex = entity.indices[1];
		}

		// Add remaining text after last emoji
		result += text.slice(lastIndex);
		return result;
	}

	// Minimal fix for unclosed extended fences (4+ backticks)
	// Only handles the common case where an LLM forgets to close a 4+ backtick fence
	// Does NOT try to be clever about nested fences - just ensures extended fences are closed
	function closeUnclosedExtendedFences(text: string): string {
		// Match fence openings with 4+ backticks: ````lang or just ````
		const extendedFenceRegex = /^(`{4,})([^\n]*)?$/gm;
		const fences: { backticks: string; index: number }[] = [];

		let match;
		while ((match = extendedFenceRegex.exec(text)) !== null) {
			const backticks = match[1];
			const hasLang = match[2] && match[2].trim().length > 0;

			// If it has a language tag, it's an opening fence
			// If it's just backticks, check if it closes an existing fence of same length
			if (hasLang || fences.length === 0) {
				fences.push({ backticks, index: match.index });
			} else {
				// Look for a matching opening fence to close
				for (let i = fences.length - 1; i >= 0; i--) {
					if (fences[i].backticks.length <= backticks.length) {
						fences.splice(i, 1);
						break;
					}
				}
			}
		}

		// If there are unclosed extended fences, close them
		if (fences.length > 0) {
			// Close each unclosed fence with matching backticks
			let result = text;
			for (const fence of fences.reverse()) {
				result += '\n' + fence.backticks;
			}
			return result;
		}

		return text;
	}

	// Parse markdown to HTML with Fluent Emoji and syntax highlighting
	let htmlContent = $derived.by(() => {
		if (!content) return '';
		// Reset code block counter and store for each render
		codeBlockCounter = 0;
		codeBlockStore = {};
		try {
			// Only apply minimal fix for unclosed 4+ backtick fences
			const processedContent = closeUnclosedExtendedFences(content);
			const html = md.render(processedContent);
			return replaceEmojisWithFluentEmoji(html);
		} catch {
			// Fallback: escape HTML and return as plain text
			return md.utils.escapeHtml(content);
		}
	});

	// Handle copy button clicks via event delegation
	function handleClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const copyBtn = target.closest('.copy-code-btn') as HTMLButtonElement;

		if (copyBtn) {
			const blockId = copyBtn.dataset.blockId || '';
			// Get code from store instead of data attribute (avoids encoding issues)
			const code = codeBlockStore[blockId] || '';

			copyCodeToClipboard(code).then(success => {
				if (success) {
					// Show success state
					const copyIcon = copyBtn.querySelector('.copy-icon');
					const checkIcon = copyBtn.querySelector('.check-icon');
					const copyText = copyBtn.querySelector('.copy-text');

					copyIcon?.classList.add('hidden');
					checkIcon?.classList.remove('hidden');
					if (copyText) copyText.textContent = 'Copied!';

					setTimeout(() => {
						copyIcon?.classList.remove('hidden');
						checkIcon?.classList.add('hidden');
						if (copyText) copyText.textContent = 'Copy';
					}, 2000);
				}
			});
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="markdown-content prose prose-invert prose-sm max-w-none"
	bind:this={containerRef}
	onclick={handleClick}
>
	{@html htmlContent}{#if isStreaming}<span class="streaming-cursor"></span>{/if}
</div>

<style>
	/* Markdown content styles */
	.markdown-content {
		line-height: 1.6;
	}

	/* Emoji styling - premium Fluent 3D look, sized to blend with text */
	.markdown-content :global(.emoji-icon) {
		height: 1.1em;
		width: 1.1em;
		vertical-align: -0.1em;
		margin: 0 0.05em;
		display: inline-block;
		border-radius: 0;
		max-width: none;
		/* Smooth rendering for 3D emojis */
		image-rendering: -webkit-optimize-contrast;
		transform: translateZ(0);
		transition: transform 0.12s ease;
	}

	/* Subtle hover interaction */
	.markdown-content :global(.emoji-icon:hover) {
		transform: scale(1.1) translateZ(0);
	}

	/* Override prose defaults for dark theme */
	.markdown-content :global(h1),
	.markdown-content :global(h2),
	.markdown-content :global(h3),
	.markdown-content :global(h4),
	.markdown-content :global(h5),
	.markdown-content :global(h6) {
		color: #e5e7eb;
		margin-top: 1em;
		margin-bottom: 0.5em;
		font-weight: 600;
	}

	.markdown-content :global(h1) {
		font-size: 1.5em;
	}

	.markdown-content :global(h2) {
		font-size: 1.3em;
	}

	.markdown-content :global(h3) {
		font-size: 1.1em;
	}

	.markdown-content :global(p) {
		margin-bottom: 0.75em;
		color: #d1d5db;
	}

	.markdown-content :global(p:last-child) {
		margin-bottom: 0;
	}

	/* Lists */
	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		margin: 0.5em 0;
		padding-left: 1.5em;
		color: #d1d5db;
	}

	.markdown-content :global(li) {
		margin: 0.25em 0;
	}

	.markdown-content :global(ul) {
		list-style-type: disc;
	}

	.markdown-content :global(ol) {
		list-style-type: decimal;
	}

	/* Code block wrapper with header */
	.markdown-content :global(.code-block-wrapper) {
		margin: 0.75em 0;
		border-radius: 0.5rem;
		overflow: hidden;
		border: 1px solid #334155;
		background: #1e293b;
	}

	.markdown-content :global(.code-block-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background: #283548;
		border-bottom: 1px solid #334155;
	}

	.markdown-content :global(.code-language) {
		font-size: 0.75rem;
		font-weight: 500;
		color: #94a3b8;
		text-transform: lowercase;
	}

	.markdown-content :global(.copy-code-btn) {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		color: #94a3b8;
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.markdown-content :global(.copy-code-btn:hover) {
		background: rgba(148, 163, 184, 0.1);
		color: #e2e8f0;
	}

	.markdown-content :global(.copy-code-btn svg) {
		width: 1rem;
		height: 1rem;
	}

	.markdown-content :global(.copy-code-btn .hidden) {
		display: none;
	}

	.markdown-content :global(.copy-code-btn .check-icon) {
		color: #22c55e;
	}

	/* Code blocks */
	.markdown-content :global(.code-block-wrapper pre) {
		margin: 0;
		padding: 1em;
		overflow-x: auto;
		background: transparent;
		border: none;
		border-radius: 0;
	}

	.markdown-content :global(.code-block-wrapper pre code) {
		background: transparent;
		padding: 0;
		font-size: 0.875em;
		color: #e2e8f0;
		white-space: pre;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
	}

	/* Fallback for code blocks without wrapper (e.g., inline) */
	.markdown-content :global(pre:not(.code-block-wrapper pre)) {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1em;
		margin: 0.75em 0;
		overflow-x: auto;
	}

	.markdown-content :global(pre:not(.code-block-wrapper pre) code) {
		background: transparent;
		padding: 0;
		font-size: 0.875em;
		color: #e2e8f0;
		white-space: pre;
	}

	/* Inline code */
	.markdown-content :global(code:not(pre code)) {
		background: #334155;
		color: #f472b6;
		padding: 0.15em 0.4em;
		border-radius: 0.25rem;
		font-size: 0.875em;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
	}

	/* Highlight.js syntax highlighting theme - VS Code Dark+ inspired */
	.markdown-content :global(.hljs-keyword),
	.markdown-content :global(.hljs-selector-tag),
	.markdown-content :global(.hljs-built_in),
	.markdown-content :global(.hljs-name) {
		color: #c586c0; /* Purple - keywords */
	}

	.markdown-content :global(.hljs-function),
	.markdown-content :global(.hljs-title.function_) {
		color: #dcdcaa; /* Yellow - functions */
	}

	.markdown-content :global(.hljs-string),
	.markdown-content :global(.hljs-attr) {
		color: #ce9178; /* Orange - strings */
	}

	.markdown-content :global(.hljs-number),
	.markdown-content :global(.hljs-literal) {
		color: #b5cea8; /* Light green - numbers */
	}

	.markdown-content :global(.hljs-comment),
	.markdown-content :global(.hljs-quote) {
		color: #6a9955; /* Green - comments */
		font-style: italic;
	}

	.markdown-content :global(.hljs-variable),
	.markdown-content :global(.hljs-template-variable) {
		color: #9cdcfe; /* Light blue - variables */
	}

	.markdown-content :global(.hljs-type),
	.markdown-content :global(.hljs-class),
	.markdown-content :global(.hljs-title.class_) {
		color: #4ec9b0; /* Teal - types/classes */
	}

	.markdown-content :global(.hljs-params) {
		color: #9cdcfe; /* Light blue - parameters */
	}

	.markdown-content :global(.hljs-meta) {
		color: #569cd6; /* Blue - meta/decorators */
	}

	.markdown-content :global(.hljs-tag) {
		color: #569cd6; /* Blue - HTML tags */
	}

	.markdown-content :global(.hljs-attribute) {
		color: #9cdcfe; /* Light blue - HTML attributes */
	}

	.markdown-content :global(.hljs-selector-class),
	.markdown-content :global(.hljs-selector-id) {
		color: #d7ba7d; /* Gold - CSS selectors */
	}

	.markdown-content :global(.hljs-property) {
		color: #9cdcfe; /* Light blue - properties */
	}

	.markdown-content :global(.hljs-operator),
	.markdown-content :global(.hljs-punctuation) {
		color: #d4d4d4; /* Light gray - operators */
	}

	.markdown-content :global(.hljs-regexp) {
		color: #d16969; /* Red - regex */
	}

	.markdown-content :global(.hljs-symbol) {
		color: #b5cea8; /* Light green - symbols */
	}

	.markdown-content :global(.hljs-doctag) {
		color: #608b4e; /* Darker green - doc tags */
	}

	/* Blockquotes */
	.markdown-content :global(blockquote) {
		border-left: 3px solid #3b82f6;
		margin: 0.75em 0;
		padding: 0.5em 1em;
		background: rgba(59, 130, 246, 0.1);
		color: #9ca3af;
	}

	.markdown-content :global(blockquote p) {
		margin: 0;
	}

	/* Links */
	.markdown-content :global(a) {
		color: #60a5fa;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.markdown-content :global(a:hover) {
		color: #93c5fd;
	}

	/* Tables */
	.markdown-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0.75em 0;
		font-size: 0.875em;
	}

	.markdown-content :global(th),
	.markdown-content :global(td) {
		border: 1px solid #334155;
		padding: 0.5em 0.75em;
		text-align: left;
	}

	.markdown-content :global(th) {
		background: #1e293b;
		font-weight: 600;
		color: #e5e7eb;
	}

	.markdown-content :global(td) {
		color: #d1d5db;
	}

	.markdown-content :global(tr:nth-child(even)) {
		background: rgba(30, 41, 59, 0.5);
	}

	/* Horizontal rules */
	.markdown-content :global(hr) {
		border: none;
		border-top: 1px solid #334155;
		margin: 1em 0;
	}

	/* Strong and emphasis */
	.markdown-content :global(strong) {
		color: #f3f4f6;
		font-weight: 600;
	}

	.markdown-content :global(em) {
		font-style: italic;
	}

	/* Images */
	.markdown-content :global(img:not(.emoji-icon)) {
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
		margin: 0.5em 0;
	}

	/* Streaming cursor */
	.streaming-cursor {
		display: inline-block;
		width: 2px;
		height: 1em;
		background: #60a5fa;
		margin-left: 2px;
		animation: blink 1s step-end infinite;
		vertical-align: text-bottom;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}

	/* Light Mode Overrides */
	:global(html.light) .markdown-content :global(h1),
	:global(html.light) .markdown-content :global(h2),
	:global(html.light) .markdown-content :global(h3),
	:global(html.light) .markdown-content :global(h4),
	:global(html.light) .markdown-content :global(h5),
	:global(html.light) .markdown-content :global(h6) {
		color: #18181b;
	}

	:global(html.light) .markdown-content :global(p) {
		color: #27272a;
	}

	:global(html.light) .markdown-content :global(ul),
	:global(html.light) .markdown-content :global(ol) {
		color: #27272a;
	}

	:global(html.light) .markdown-content :global(li) {
		color: #27272a;
	}

	:global(html.light) .markdown-content :global(.code-block-wrapper) {
		background: #f8fafc;
		border-color: #e2e8f0;
	}

	:global(html.light) .markdown-content :global(.code-block-header) {
		background: #f1f5f9;
		border-color: #e2e8f0;
	}

	:global(html.light) .markdown-content :global(.code-language) {
		color: #64748b;
	}

	:global(html.light) .markdown-content :global(.copy-code-btn) {
		color: #64748b;
	}

	:global(html.light) .markdown-content :global(.copy-code-btn:hover) {
		background: rgba(100, 116, 139, 0.1);
		color: #334155;
	}

	:global(html.light) .markdown-content :global(.code-block-wrapper pre code) {
		color: #1e293b;
	}

	:global(html.light) .markdown-content :global(pre:not(.code-block-wrapper pre)) {
		background: #f4f4f5;
		border-color: #e4e4e7;
	}

	:global(html.light) .markdown-content :global(pre:not(.code-block-wrapper pre) code) {
		color: #18181b;
	}

	:global(html.light) .markdown-content :global(code:not(pre code)) {
		background: #e4e4e7;
		color: #db2777;
	}

	/* Light mode syntax highlighting */
	:global(html.light) .markdown-content :global(.hljs-keyword),
	:global(html.light) .markdown-content :global(.hljs-selector-tag),
	:global(html.light) .markdown-content :global(.hljs-built_in),
	:global(html.light) .markdown-content :global(.hljs-name) {
		color: #af00db;
	}

	:global(html.light) .markdown-content :global(.hljs-function),
	:global(html.light) .markdown-content :global(.hljs-title.function_) {
		color: #795e26;
	}

	:global(html.light) .markdown-content :global(.hljs-string),
	:global(html.light) .markdown-content :global(.hljs-attr) {
		color: #a31515;
	}

	:global(html.light) .markdown-content :global(.hljs-number),
	:global(html.light) .markdown-content :global(.hljs-literal) {
		color: #098658;
	}

	:global(html.light) .markdown-content :global(.hljs-comment),
	:global(html.light) .markdown-content :global(.hljs-quote) {
		color: #008000;
	}

	:global(html.light) .markdown-content :global(.hljs-variable),
	:global(html.light) .markdown-content :global(.hljs-template-variable),
	:global(html.light) .markdown-content :global(.hljs-params) {
		color: #001080;
	}

	:global(html.light) .markdown-content :global(.hljs-type),
	:global(html.light) .markdown-content :global(.hljs-class),
	:global(html.light) .markdown-content :global(.hljs-title.class_) {
		color: #267f99;
	}

	:global(html.light) .markdown-content :global(.hljs-meta) {
		color: #0000ff;
	}

	:global(html.light) .markdown-content :global(.hljs-tag) {
		color: #800000;
	}

	:global(html.light) .markdown-content :global(.hljs-attribute) {
		color: #e50000;
	}

	:global(html.light) .markdown-content :global(.hljs-property) {
		color: #001080;
	}

	:global(html.light) .markdown-content :global(blockquote) {
		background: rgba(59, 130, 246, 0.08);
		color: #52525b;
	}

	:global(html.light) .markdown-content :global(a) {
		color: #2563eb;
	}

	:global(html.light) .markdown-content :global(a:hover) {
		color: #1d4ed8;
	}

	:global(html.light) .markdown-content :global(th),
	:global(html.light) .markdown-content :global(td) {
		border-color: #e4e4e7;
	}

	:global(html.light) .markdown-content :global(th) {
		background: #f4f4f5;
		color: #18181b;
	}

	:global(html.light) .markdown-content :global(td) {
		color: #27272a;
	}

	:global(html.light) .markdown-content :global(tr:nth-child(even)) {
		background: rgba(244, 244, 245, 0.5);
	}

	:global(html.light) .markdown-content :global(hr) {
		border-top-color: #e4e4e7;
	}

	:global(html.light) .markdown-content :global(strong) {
		color: #18181b;
	}

	:global(html.light) .streaming-cursor {
		background: #2563eb;
	}
</style>
