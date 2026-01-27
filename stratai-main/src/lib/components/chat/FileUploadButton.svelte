<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import type { FileAttachment } from '$lib/types/chat';
	import {
		ACCEPT_DOCUMENTS,
		ACCEPT_ALL,
		DOCUMENT_TYPES_DISPLAY,
		ALL_TYPES_DISPLAY,
		isImageExtension
	} from '$lib/config/file-types';

	interface Props {
		disabled?: boolean;
		onupload?: (file: FileAttachment) => void;
	}

	let { disabled = false, onupload }: Props = $props();

	let isUploading = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();

	// Check if current model supports vision
	let supportsVision = $derived(settingsStore.canUseVision);
	let modelName = $derived(modelCapabilitiesStore.currentDisplayName);

	// Dynamic accepted types based on vision support
	let acceptedTypes = $derived(supportsVision ? ACCEPT_ALL : ACCEPT_DOCUMENTS);

	// Tooltip text based on capabilities
	let tooltipText = $derived.by(() => {
		if (isUploading) return 'Uploading...';
		if (supportsVision) {
			return `Attach file (${ALL_TYPES_DISPLAY})`;
		}
		return `Attach file (${DOCUMENT_TYPES_DISPLAY}) - Images not supported by ${modelName}`;
	});

	// Check if a file is an image
	function isImageFile(file: File): boolean {
		return file.type.startsWith('image/') || isImageExtension(file.name);
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;

		// Filter out images if model doesn't support vision
		const validFiles: File[] = [];
		let skippedImages = 0;

		for (const file of Array.from(files)) {
			if (isImageFile(file) && !supportsVision) {
				skippedImages++;
			} else {
				validFiles.push(file);
			}
		}

		if (skippedImages > 0) {
			toastStore.warning(`${skippedImages} image${skippedImages > 1 ? 's' : ''} skipped - ${modelName} doesn't support image analysis.`);
		}

		if (validFiles.length === 0) {
			if (fileInput) fileInput.value = '';
			return;
		}

		isUploading = true;
		let successCount = 0;

		try {
			for (const file of validFiles) {
				const formData = new FormData();
				formData.append('file', file);

				const response = await fetch('/api/upload', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();

				if (!response.ok || result.error) {
					toastStore.error(`Failed to upload ${file.name}: ${result.error?.message || 'Upload failed'}`);
					continue;
				}

				// Success - pass the parsed file to parent
				onupload?.(result as FileAttachment);
				successCount++;
			}

			if (successCount > 0) {
				toastStore.success(`${successCount} file${successCount > 1 ? 's' : ''} attached`);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to upload files';
			toastStore.error(message);
			console.error('Upload error:', err);
		} finally {
			isUploading = false;
			// Reset input so same files can be selected again
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
	accept={acceptedTypes}
	multiple
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
	title={tooltipText}
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
