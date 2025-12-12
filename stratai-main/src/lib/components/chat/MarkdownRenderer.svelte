<script lang="ts">
	import { marked } from 'marked';
	import { parse as parseEmoji } from '@twemoji/parser';
	import { getFluentEmojiUrl } from '$lib/utils/fluentEmoji';

	let { content, isStreaming = false }: { content: string; isStreaming?: boolean } = $props();

	let containerRef: HTMLDivElement;

	// Configure marked for security and features
	marked.setOptions({
		breaks: true, // Convert \n to <br>
		gfm: true // GitHub Flavored Markdown
	});

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

	// Parse markdown to HTML with Fluent Emoji
	let htmlContent = $derived.by(() => {
		if (!content) return '';
		try {
			const result = marked.parse(content);
			const html = typeof result === 'string' ? result : '';
			return replaceEmojisWithFluentEmoji(html);
		} catch {
			return content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		}
	});
</script>

<div class="markdown-content prose prose-invert prose-sm max-w-none" bind:this={containerRef}>
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

	/* Code blocks */
	.markdown-content :global(pre) {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1em;
		margin: 0.75em 0;
		overflow-x: auto;
	}

	.markdown-content :global(pre code) {
		background: transparent;
		padding: 0;
		font-size: 0.875em;
		color: #e2e8f0;
		white-space: pre;
	}

	/* Inline code */
	.markdown-content :global(code) {
		background: #334155;
		color: #f472b6;
		padding: 0.15em 0.4em;
		border-radius: 0.25rem;
		font-size: 0.875em;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
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
	.markdown-content :global(img) {
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

	:global(html.light) .markdown-content :global(pre) {
		background: #f4f4f5;
		border-color: #e4e4e7;
	}

	:global(html.light) .markdown-content :global(pre code) {
		color: #18181b;
	}

	:global(html.light) .markdown-content :global(code) {
		background: #e4e4e7;
		color: #db2777;
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
