/**
 * Areas Components
 *
 * Components for managing areas within spaces.
 * Renamed from Focus Areas - see DESIGN-SPACES-AND-FOCUS-AREAS.md
 */

export { default as AreaPills } from './AreaPills.svelte';
export { default as AreaModal } from './AreaModal.svelte';

// Re-export ContextPanel from focus-areas until we create a dedicated Area version
export { default as ContextPanel } from '../focus-areas/ContextPanel.svelte';

// Backwards compatibility - re-export with old names
export { default as FocusAreaPills } from '../focus-areas/FocusAreaPills.svelte';
export { default as FocusAreaModal } from '../focus-areas/FocusAreaModal.svelte';
