/**
 * Areas Components
 *
 * Component-driven architecture for Area pages.
 * Renamed from Focus Areas - see DESIGN-SPACES-AND-FOCUS-AREAS.md
 */

// Area management
export { default as AreaPills } from './AreaPills.svelte';
export { default as AreaModal } from './AreaModal.svelte';

// Area page components
export { default as AreaHeader } from './AreaHeader.svelte';

// Panels
export { default as PanelBase } from './panels/PanelBase.svelte';
export { default as TasksPanel } from './panels/TasksPanel.svelte';
export { default as ContextPanel } from './panels/ContextPanel.svelte';
// Keep DocsPanel export for backwards compatibility
export { default as DocsPanel } from './panels/DocsPanel.svelte';

// Suggestions
export { default as TaskSuggestionCard } from './suggestions/TaskSuggestionCard.svelte';

// Backwards compatibility - re-export with old names
export { default as FocusAreaPills } from '../focus-areas/FocusAreaPills.svelte';
export { default as FocusAreaModal } from '../focus-areas/FocusAreaModal.svelte';
