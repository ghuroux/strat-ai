/**
 * Diagrams Components - Excalidraw integration for StratAI Pages
 *
 * ROLLBACK: Delete this folder and run: npm uninstall svelte-excalidraw
 */

export { default as ExcalidrawEditor } from './ExcalidrawEditor.svelte';
export { default as LibraryPicker } from './LibraryPicker.svelte';
export {
	DIAGRAM_LIBRARIES,
	CATEGORY_LABELS,
	getLibrariesByCategory,
	getLibraryById,
	fetchLibraryData,
	type DiagramLibrary
} from './diagram-libraries';
