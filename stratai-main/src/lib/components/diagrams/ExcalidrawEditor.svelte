<script lang="ts">
	/**
	 * ExcalidrawEditor.svelte - Wrapper for svelte-excalidraw
	 *
	 * This component wraps the Excalidraw diagram editor for use in StratAI pages.
	 *
	 * Props:
	 * - initialData: Previous diagram data to restore
	 * - onReady: Called when editor is ready
	 * - onChange: Called when diagram changes (debounced)
	 * - onSave: Called with full diagram data for persistence
	 * - theme: 'light' | 'dark' (auto-detected if not provided)
	 * - onLibraryLoad: Called when a library is loaded (for UI feedback)
	 *
	 * ROLLBACK: Delete this file and run: npm uninstall svelte-excalidraw
	 */
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { type DiagramLibrary, fetchLibraryData } from './diagram-libraries';

	// Detect system/app theme
	function getTheme(): 'light' | 'dark' {
		if (!browser) return 'light';
		return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	}

	/**
	 * Prepare initialData for Excalidraw
	 * - Converts collaborators back to a Map (it's serialized as an array)
	 */
	function prepareInitialData(data: any): any {
		if (!data) return data;

		const prepared = { ...data };

		// Fix appState.collaborators - must be a Map, not array/object
		if (prepared.appState) {
			prepared.appState = {
				...prepared.appState,
				collaborators: new Map()
			};
		}

		return prepared;
	}

	interface Props {
		initialData?: any;
		onReady?: () => void;
		onChange?: (data: any) => void;
		onSave?: (data: any) => void;
		theme?: 'light' | 'dark';
		onLibraryLoad?: (libraryId: string, success: boolean) => void;
	}

	let { initialData, onReady, onChange, onSave, theme, onLibraryLoad }: Props = $props();

	// Use provided theme or auto-detect
	let activeTheme = $derived(theme ?? getTheme());

	let containerRef: HTMLDivElement | undefined = $state();
	let ExcalidrawComponent: any = $state(null);
	let exportToSvg: any = $state(null); // SVG export function
	let apiRef: any = $state(null); // Renamed to avoid collision with prop name
	let isReady = $state(false);
	let loadError = $state<string | null>(null);

	// Track loaded libraries to avoid duplicates
	let loadedLibraries = $state<Set<string>>(new Set());

	// Debounce timer for onChange
	let changeTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(async () => {
		if (!browser) return;

		try {
			// Dynamic import to avoid SSR issues
			const [svelteExcalidraw, excalidrawUtils] = await Promise.all([
				import('svelte-excalidraw'),
				import('@excalidraw/excalidraw')
			]);

			ExcalidrawComponent = svelteExcalidraw.default;
			exportToSvg = excalidrawUtils.exportToSvg;

			// Small delay to ensure DOM is ready
			await new Promise(resolve => setTimeout(resolve, 100));

			isReady = true;
			onReady?.();
		} catch (err) {
			console.error('[ExcalidrawEditor] Failed to load:', err);
			loadError = err instanceof Error ? err.message : String(err);
		}
	});

	onDestroy(() => {
		if (changeTimeout) {
			clearTimeout(changeTimeout);
		}
	});

	function handleChange(elements: any[], appState: any, files: any) {
		// Debounce onChange to avoid too many updates
		if (changeTimeout) {
			clearTimeout(changeTimeout);
		}

		changeTimeout = setTimeout(() => {
			const data = { elements, appState, files };
			onChange?.(data);
		}, 300);
	}

	async function handleSave() {
		if (!apiRef) {
			console.warn('[ExcalidrawEditor] No API available for save');
			return;
		}

		const elements = apiRef.getSceneElements();
		const appState = apiRef.getAppState();
		const files = apiRef.getFiles();

		// Generate SVG preview
		let svgString = '';
		if (exportToSvg && elements.length > 0) {
			try {
				const svg = await exportToSvg({
					elements,
					appState: {
						...appState,
						exportWithDarkMode: activeTheme === 'dark',
						exportBackground: true
					},
					files
				});
				svgString = svg.outerHTML;
			} catch (err) {
				console.warn('[ExcalidrawEditor] Failed to export SVG:', err);
			}
		}

		onSave?.({ elements, appState, files, svg: svgString });
	}

	// Export the API for parent components
	export function getAPI() {
		return apiRef;
	}

	export function getElements() {
		return apiRef?.getSceneElements() ?? [];
	}

	export function getSceneData() {
		if (!apiRef) return null;
		return {
			elements: apiRef.getSceneElements(),
			appState: apiRef.getAppState(),
			files: apiRef.getFiles()
		};
	}

	/**
	 * Load a library into Excalidraw
	 * @param library - Library definition to load
	 * @param merge - Whether to merge with existing library items (default: true)
	 */
	export async function loadLibrary(library: DiagramLibrary, merge = true): Promise<boolean> {
		if (!apiRef) {
			console.warn('[ExcalidrawEditor] Cannot load library - API not ready');
			return false;
		}

		if (loadedLibraries.has(library.id)) {
			console.log('[ExcalidrawEditor] Library already loaded:', library.id);
			return true;
		}

		try {
			console.log('[ExcalidrawEditor] Loading library:', library.name);

			const libraryItems = await fetchLibraryData(library);

			if (libraryItems.length === 0) {
				console.warn('[ExcalidrawEditor] Library has no items:', library.id);
				onLibraryLoad?.(library.id, false);
				return false;
			}

			// Use Excalidraw API to update library
			await apiRef.updateLibrary({
				libraryItems,
				merge,
				openLibraryMenu: true, // Show the library panel so user can see loaded items
				defaultStatus: 'published'
			});

			loadedLibraries.add(library.id);
			loadedLibraries = loadedLibraries; // Trigger reactivity

			console.log('[ExcalidrawEditor] Library loaded successfully:', library.name, `(${libraryItems.length} items)`);
			onLibraryLoad?.(library.id, true);
			return true;
		} catch (error) {
			console.error('[ExcalidrawEditor] Failed to load library:', library.id, error);
			onLibraryLoad?.(library.id, false);
			return false;
		}
	}

	/**
	 * Check if a library is already loaded
	 */
	export function isLibraryLoaded(libraryId: string): boolean {
		return loadedLibraries.has(libraryId);
	}

	/**
	 * Get list of loaded library IDs
	 */
	export function getLoadedLibraries(): string[] {
		return Array.from(loadedLibraries);
	}

	/**
	 * Toggle the Excalidraw library panel open/closed
	 */
	export function toggleLibraryPanel(): void {
		if (!apiRef) return;
		// Update appState to toggle the library menu
		const currentState = apiRef.getAppState();
		apiRef.updateScene({
			appState: {
				...currentState,
				openSidebar: currentState.openSidebar?.name === 'library' ? null : { name: 'library' }
			}
		});
	}

	/**
	 * Open the Excalidraw library panel
	 */
	export function openLibraryPanel(): void {
		if (!apiRef) return;
		apiRef.updateScene({
			appState: {
				openSidebar: { name: 'library' }
			}
		});
	}

	/**
	 * Unload a library from Excalidraw (removes items but keeps in cache for potential reload)
	 * Note: This clears ALL library items - Excalidraw doesn't support selective removal
	 */
	export async function clearLibraries(): Promise<void> {
		if (!apiRef) return;

		await apiRef.updateLibrary({
			libraryItems: [],
			merge: false
		});

		loadedLibraries = new Set();
		console.log('[ExcalidrawEditor] All libraries cleared');
	}

	/**
	 * Toggle a library on/off (load or unload)
	 * Note: Due to Excalidraw limitations, toggling OFF requires reloading other libraries
	 */
	export async function toggleLibrary(library: DiagramLibrary, allLibraries: DiagramLibrary[]): Promise<boolean> {
		if (!apiRef) return false;

		const isLoaded = loadedLibraries.has(library.id);

		if (isLoaded) {
			// Remove this library - need to reload others
			const remainingIds = Array.from(loadedLibraries).filter(id => id !== library.id);
			const remainingLibraries = allLibraries.filter(lib => remainingIds.includes(lib.id));

			// Clear all and reload remaining
			await apiRef.updateLibrary({
				libraryItems: [],
				merge: false
			});

			loadedLibraries = new Set();

			// Reload remaining libraries
			for (const lib of remainingLibraries) {
				await loadLibrary(lib, true);
			}

			console.log('[ExcalidrawEditor] Library unloaded:', library.id);
			onLibraryLoad?.(library.id, false);
			return false;
		} else {
			// Load the library
			return await loadLibrary(library, true);
		}
	}
</script>

<div bind:this={containerRef} class="excalidraw-container w-full h-full">
	{#if loadError}
		<div class="flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4">
			<div class="text-center">
				<p class="font-semibold">Failed to load diagram editor</p>
				<p class="text-sm mt-2">{loadError}</p>
			</div>
		</div>
	{:else if !isReady}
		<div class="flex items-center justify-center h-full bg-zinc-50 dark:bg-zinc-800">
			<div class="text-center text-zinc-500">
				<div class="animate-spin w-8 h-8 border-2 border-zinc-300 border-t-blue-500 rounded-full mx-auto mb-3"></div>
				<p>Loading diagram editor...</p>
			</div>
		</div>
	{:else if ExcalidrawComponent}
		<svelte:component
			this={ExcalidrawComponent}
			initialData={prepareInitialData(initialData)}
			onChange={handleChange}
			onInit={(api: any) => {
				apiRef = api;
			}}
			theme={activeTheme}
		/>
	{/if}

	<!-- Save button overlay - outside the conditional to ensure it's always on top -->
	{#if onSave && isReady && ExcalidrawComponent}
		<div class="save-button-container">
			<button
				type="button"
				onclick={handleSave}
				class="save-button"
			>
				Save Diagram
			</button>
		</div>
	{/if}
</div>

<style>
	.excalidraw-container {
		position: relative;
	}

	/* Excalidraw takes 100% of container, ensure container has dimensions */
	.excalidraw-container :global(.excalidraw) {
		width: 100%;
		height: 100%;
	}

	/* Save button - positioned absolutely within container */
	.save-button-container {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 1000; /* High z-index to stay above Excalidraw UI */
	}

	.save-button {
		padding: 0.5rem 1rem;
		background: #2563eb;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		border: none;
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		transition: background-color 150ms ease;
	}

	.save-button:hover {
		background: #1d4ed8;
	}

	.save-button:active {
		background: #1e40af;
	}
</style>
