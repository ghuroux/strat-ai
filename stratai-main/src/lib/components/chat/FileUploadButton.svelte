<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { FileAttachment } from '$lib/types/chat';

	interface Props {
		disabled?: boolean;
		onupload?: (file: FileAttachment) => void;
	}

	let { disabled = false, onupload }: Props = $props();

	let isUploading = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();

	const ACCEPTED_TYPES = '.pdf,.docx,.txt,.md,.csv,.json';

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

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

			// Success - pass the parsed file to parent
			onupload?.(result as FileAttachment);
			toastStore.success(`${file.name} attached`);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to upload file';
			toastStore.error(message);
			console.error('Upload error:', err);
		} finally {
			isUploading = false;
			// Reset input so same file can be selected again
			if (fileInput) {
				fileInput.value = '';
			}
		}
	}

	function triggerFileSelect() {
		if (!disabled && !isUploading) {
			fileInput?.click();
		}
	}
</script>

<!-- Hidden file input -->
<input
	type="file"
	bind:this={fileInput}
	onchange={handleFileSelect}
	accept={ACCEPTED_TYPES}
	class="hidden"
	aria-hidden="true"
/>

<!-- Upload button - matches SearchToggle styling -->
<button
	type="button"
	onclick={triggerFileSelect}
	disabled={disabled || isUploading}
	class="file-upload-btn flex items-center justify-center w-10 h-10 rounded-xl
		   transition-all duration-200
		   text-surface-400 hover:text-surface-200 hover:bg-surface-700
		   {disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}"
	title={isUploading ? 'Uploading...' : 'Attach file (PDF, DOCX, TXT, MD, CSV, JSON)'}
>
	{#if isUploading}
		<!-- Loading spinner -->
		<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
			<circle
				class="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				stroke-width="4"
			></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
	{:else}
		<!-- Paperclip icon -->
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
			/>
		</svg>
	{/if}
</button>
