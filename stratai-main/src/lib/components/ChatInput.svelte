<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import SearchToggle from './chat/SearchToggle.svelte';
	import ThinkingToggle from './chat/ThinkingToggle.svelte';
	import SummarizeButton from './chat/SummarizeButton.svelte';
	import FileUploadButton from './chat/FileUploadButton.svelte';
	import FilePreview from './chat/FilePreview.svelte';
	import ContextIndicator from './chat/ContextIndicator.svelte';
	import type { FileAttachment } from '$lib/types/chat';
	import {
		calculateConversationTokens,
		getContextUsagePercent,
		getContextWindowSize
	} from '$lib/services/tokenEstimation';

	// Svelte 5: Use $props with callback props instead of createEventDispatcher
	let {
		disabled = false,
		onsend,
		onstop,
		onsummarize,
		oncompact,
		isGeneratingSummary = false,
		isCompacting = false
	}: {
		disabled?: boolean;
		onsend?: (message: string, attachments?: FileAttachment[]) => void;
		onstop?: () => void;
		onsummarize?: () => void;
		oncompact?: () => void;
		isGeneratingSummary?: boolean;
		isCompacting?: boolean;
	} = $props();

	// Pending file attachments
	let pendingAttachments = $state<FileAttachment[]>([]);

	let webSearchFeatureEnabled = $derived(settingsStore.webSearchFeatureEnabled);
	let searchEnabled = $derived(settingsStore.webSearchEnabled);
	let thinkingEnabled = $derived(settingsStore.extendedThinkingEnabled);

	// Show summarize button when conversation has 6+ messages
	let showSummarizeButton = $derived(chatStore.messages.length >= 6);
	let hasSummary = $derived(!!chatStore.activeConversation?.summary);

	// Context window usage calculation
	let currentModel = $derived(chatStore.activeConversation?.model || settingsStore.selectedModel);
	let contextWindowSize = $derived(getContextWindowSize(currentModel));
	let continuationSummary = $derived(chatStore.activeConversation?.continuationSummary || '');
	let estimatedTokens = $derived(
		calculateConversationTokens(chatStore.messages, settingsStore.systemPrompt, continuationSummary, currentModel)
	);
	let contextUsagePercent = $derived(
		getContextUsagePercent(estimatedTokens, currentModel)
	);
	let showContextIndicator = $derived(
		chatStore.messages.length > 0 && contextUsagePercent >= settingsStore.contextThresholdPercent
	);

	// Svelte 5: Use $state for local reactive state
	let input = $state('');
	let textarea: HTMLTextAreaElement | undefined = $state();
	let isFocused = $state(false);

	// Drag and drop state
	let isDragging = $state(false);
	let isUploading = $state(false);
	let dragCounter = $state(0); // Track enter/leave to handle nested elements

	// Vision capability check
	let supportsVision = $derived(settingsStore.canUseVision);
	let modelName = $derived(modelCapabilitiesStore.currentDisplayName);

	// Accepted file types for drag-drop validation
	const DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
	const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
	const ACCEPTED_EXTENSIONS = $derived(
		supportsVision
			? [...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS]
			: DOCUMENT_EXTENSIONS
	);

	const DOCUMENT_MIME_TYPES = [
		'application/pdf',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'text/plain',
		'text/markdown',
		'text/csv',
		'application/json'
	];
	const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
	const ACCEPTED_MIME_TYPES = $derived(
		supportsVision
			? [...DOCUMENT_MIME_TYPES, ...IMAGE_MIME_TYPES]
			: DOCUMENT_MIME_TYPES
	);

	// Check if a file is an image
	function isImageFile(file: File): boolean {
		return file.type.startsWith('image/') ||
			IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
	}

	let charCount = $derived(input.length);
	let hasAttachments = $derived(pendingAttachments.length > 0);
	let canSend = $derived((input.trim().length > 0 || hasAttachments) && !disabled && !chatStore.isStreaming);

	function handleSubmit() {
		if (!canSend) return;
		onsend?.(input.trim(), pendingAttachments.length > 0 ? [...pendingAttachments] : undefined);
		input = '';
		pendingAttachments = [];
		// Reset textarea height to single row
		if (textarea) {
			textarea.style.height = '';
		}
	}

	function handleFileUpload(file: FileAttachment) {
		pendingAttachments = [...pendingAttachments, file];
	}

	function removeAttachment(id: string) {
		pendingAttachments = pendingAttachments.filter(a => a.id !== id);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && settingsStore.sendOnEnter) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function autoResize() {
		if (textarea) {
			textarea.style.height = 'auto';
			textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
		}
	}

	function handleStop() {
		onstop?.();
	}

	// Upload a file (shared by click upload and drag-drop)
	async function uploadFile(file: File): Promise<void> {
		if (disabled || chatStore.isStreaming || isUploading) return;

		// Check if trying to upload image when model doesn't support vision
		if (isImageFile(file) && !supportsVision) {
			toastStore.warning(`${modelName} doesn't support image analysis. Please select a vision-capable model or use a document file.`);
			return;
		}

		// Validate file type
		const extension = '.' + file.name.split('.').pop()?.toLowerCase();
		const isValidExtension = ACCEPTED_EXTENSIONS.includes(extension);
		const isValidMime = ACCEPTED_MIME_TYPES.includes(file.type) || file.type === '';

		if (!isValidExtension && !isValidMime) {
			const acceptedTypes = supportsVision
				? 'PDF, DOCX, TXT, MD, CSV, JSON, JPG, PNG, GIF, WebP'
				: 'PDF, DOCX, TXT, MD, CSV, JSON';
			toastStore.error(`Unsupported file type. Accepted: ${acceptedTypes}`);
			return;
		}

		isUploading = true;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (!response.ok || result.error) {
				throw new Error(result.error?.message || 'Upload failed');
			}

			// Success - add to pending attachments
			pendingAttachments = [...pendingAttachments, result as FileAttachment];
			toastStore.success(`${file.name} attached`);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to upload file';
			toastStore.error(message);
			console.error('Upload error:', err);
		} finally {
			isUploading = false;
		}
	}

	// Drag and drop handlers
	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragCounter++;

		// Check if dragging files
		if (e.dataTransfer?.types.includes('Files')) {
			isDragging = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragCounter--;

		// Only hide drop zone when fully left the area
		if (dragCounter === 0) {
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
		dragCounter = 0;

		if (disabled || chatStore.isStreaming) return;

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;

		// Process each dropped file
		for (const file of Array.from(files)) {
			await uploadFile(file);
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="border-t border-surface-800 p-4 bg-surface-900/80 backdrop-blur-xl relative"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
	<!-- Drop zone overlay -->
	{#if isDragging || isUploading}
		<div
			class="absolute inset-0 z-50 flex items-center justify-center
				   bg-gradient-to-b from-surface-900/98 to-surface-950/98 backdrop-blur-md
				   rounded-lg transition-all duration-300 animate-fadeIn"
		>
			<div class="text-center">
				{#if isUploading}
					<!-- Uploading state -->
					<div class="w-16 h-16 mx-auto mb-4 relative">
						<div class="absolute inset-0 rounded-full border-2 border-surface-700"></div>
						<div class="absolute inset-0 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
						<div class="absolute inset-3 flex items-center justify-center">
							<svg class="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
							</svg>
						</div>
					</div>
					<p class="text-lg font-medium text-surface-200">Processing file...</p>
					<p class="text-sm text-surface-500 mt-1">Extracting content</p>
				{:else}
					<!-- Drag state -->
					<div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center border border-primary-500/30 animate-pulse-subtle">
						<svg class="w-10 h-10 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<p class="text-lg font-medium text-surface-100">Drop to attach</p>
					<p class="text-sm text-surface-500 mt-2">
						{supportsVision ? 'Images, PDF, DOCX, TXT, MD, CSV, JSON' : 'PDF, DOCX, TXT, MD, CSV, JSON'}
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<div class="max-w-4xl mx-auto">
		<!-- Input container with gradient border on focus -->
		<div
			class="relative rounded-2xl transition-all duration-300
				   {isFocused ? 'gradient-border shadow-glow' : ''}
				   {isDragging ? 'ring-2 ring-primary-500/50 ring-offset-2 ring-offset-surface-900' : ''}"
		>
			<div class="flex items-end gap-3 bg-surface-800 rounded-2xl p-3 {isFocused ? '' : 'border border-surface-700'}">
				<!-- File upload button -->
				<FileUploadButton
					disabled={disabled || chatStore.isStreaming}
					onupload={handleFileUpload}
				/>

				<div class="flex-1 relative">
					<!-- File preview above textarea -->
					{#if hasAttachments}
						<FilePreview attachments={pendingAttachments} onremove={removeAttachment} />
					{/if}

					<textarea
						bind:this={textarea}
						bind:value={input}
						onkeydown={handleKeydown}
						oninput={autoResize}
						onfocus={() => (isFocused = true)}
						onblur={() => (isFocused = false)}
						placeholder={chatStore.isStreaming ? 'AI is responding...' : 'Type a message... (Shift+Enter for new line)'}
						rows="1"
						class="w-full bg-transparent text-surface-100 placeholder-surface-500
							   resize-none focus:outline-none leading-relaxed"
						disabled={disabled || chatStore.isStreaming}
					></textarea>
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-2">
					<!-- Summarize Button (only shown when 6+ messages) -->
					{#if showSummarizeButton}
						<div class="relative group">
							<SummarizeButton
								disabled={disabled || chatStore.isStreaming}
								isGenerating={isGeneratingSummary}
								{hasSummary}
								onclick={() => onsummarize?.()}
							/>
						</div>
					{/if}

					<!-- Extended Thinking Toggle (for Claude models) -->
					<div class="relative group">
						<ThinkingToggle disabled={disabled || chatStore.isStreaming} />
					</div>

					<!-- Web Search Toggle (only shown when feature is enabled) -->
					{#if webSearchFeatureEnabled}
						<div class="relative group">
							<SearchToggle disabled={disabled || chatStore.isStreaming} />
						</div>
					{/if}

					{#if chatStore.isStreaming}
						<button
							type="button"
							onclick={handleStop}
							class="flex items-center justify-center w-10 h-10 rounded-xl
								   bg-red-600 hover:bg-red-700 text-white
								   transition-all duration-200 hover:scale-105"
							title="Stop generating"
						>
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<rect x="6" y="6" width="12" height="12" rx="2" />
							</svg>
						</button>
					{:else}
						<button
							type="button"
							onclick={handleSubmit}
							disabled={!canSend}
							class="flex items-center justify-center w-10 h-10 rounded-xl
								   transition-all duration-200
								   {canSend
									? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white hover:scale-105 shadow-glow-sm'
									: 'bg-surface-700 text-surface-500 cursor-not-allowed'}"
							title="Send message"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
								/>
							</svg>
						</button>
					{/if}
				</div>
			</div>
		</div>

		<!-- Footer hints -->
		<div class="flex items-center justify-between mt-2 px-1">
			<div class="flex items-center gap-4 text-xs text-surface-500">
				{#if !chatStore.isStreaming}
					<span>
						<kbd class="px-1.5 py-0.5 bg-surface-800 rounded text-surface-400">Enter</kbd> to send
					</span>
					{#if thinkingEnabled}
						<span class="flex items-center gap-1.5 text-amber-400">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
							Extended thinking
						</span>
					{/if}
					{#if webSearchFeatureEnabled && searchEnabled}
						<span class="flex items-center gap-1.5 text-primary-400">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
							</svg>
							Web search
						</span>
					{/if}
					{#if !thinkingEnabled && !(webSearchFeatureEnabled && searchEnabled)}
						<span>
							<kbd class="px-1.5 py-0.5 bg-surface-800 rounded text-surface-400">Shift+Enter</kbd> new line
						</span>
					{/if}
				{:else}
					<span class="streaming-status flex items-center gap-2.5">
						<span class="status-orb">
							<span class="orb-core"></span>
							<span class="orb-ring"></span>
						</span>
						<span class="status-text">Generating response</span>
						<span class="status-dots">
							<span></span><span></span><span></span>
						</span>
					</span>
				{/if}
			</div>

			<!-- Right side: Context indicator or char count -->
			<div class="flex items-center gap-3">
				{#if showContextIndicator}
					<ContextIndicator
						usagePercent={contextUsagePercent}
						{estimatedTokens}
						{contextWindowSize}
						{isCompacting}
						oncompact={() => oncompact?.()}
						disabled={disabled || chatStore.isStreaming}
					/>
				{/if}
				{#if charCount > 0}
					<span class="text-xs text-surface-500">{charCount} chars</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* Drop zone animations */
	.animate-fadeIn {
		animation: fadeIn 0.2s ease-out forwards;
	}

	.animate-pulse-subtle {
		animation: pulseSublte 2s ease-in-out infinite;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes pulseSublte {
		0%, 100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.02);
			opacity: 0.9;
		}
	}

	/* Streaming status indicator */
	.streaming-status {
		padding: 4px 10px 4px 6px;
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(20, 184, 166, 0.08));
		border: 1px solid rgba(34, 197, 94, 0.2);
		border-radius: 20px;
	}

	.status-orb {
		position: relative;
		width: 14px;
		height: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.orb-core {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: linear-gradient(135deg, #22c55e, #14b8a6);
		box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
		animation: orbPulse 2s ease-in-out infinite;
	}

	.orb-ring {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 1.5px solid rgba(34, 197, 94, 0.4);
		animation: ringExpand 2s ease-out infinite;
	}

	.status-text {
		font-size: 12px;
		font-weight: 500;
		background: linear-gradient(90deg, #22c55e, #14b8a6);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.status-dots {
		display: flex;
		gap: 3px;
	}

	.status-dots span {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #22c55e;
		opacity: 0.4;
		animation: dotPulse 1.4s ease-in-out infinite;
	}

	.status-dots span:nth-child(1) { animation-delay: 0s; }
	.status-dots span:nth-child(2) { animation-delay: 0.15s; }
	.status-dots span:nth-child(3) { animation-delay: 0.3s; }

	@keyframes orbPulse {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
	}

	@keyframes ringExpand {
		0% {
			transform: scale(0.8);
			opacity: 0.6;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}

	@keyframes dotPulse {
		0%, 60%, 100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		30% {
			transform: translateY(-3px);
			opacity: 1;
		}
	}
</style>
