/**
 * Command Palette - Command Definitions
 *
 * Defines all available commands for the command palette.
 * Commands are organized by category and can be static or dynamic.
 */

import type { ComponentType } from 'svelte';
import { goto } from '$app/navigation';
import {
	Home,
	FolderOpen,
	Swords,
	Plus,
	PanelLeft,
	Moon,
	Sun,
	Settings,
	ListTodo,
	Target,
	MessageSquare,
	Sparkles,
	Search,
	ArrowRight
} from 'lucide-svelte';
import { spacesStore } from '$lib/stores/spaces.svelte';
import { areaStore } from '$lib/stores/areas.svelte';
import { taskStore } from '$lib/stores/tasks.svelte';
import { settingsStore } from '$lib/stores/settings.svelte';
import { chatStore } from '$lib/stores/chat.svelte';
import type { Conversation } from '$lib/types/chat';

// =============================================================================
// Types
// =============================================================================

export type CommandCategory = 'navigation' | 'action' | 'settings' | 'conversations';

export interface Command {
	id: string;
	label: string;
	description?: string;
	category: CommandCategory;
	icon: ComponentType;
	keywords: string[];
	shortcut?: string;
	action: () => void | Promise<void>;
	enabled?: () => boolean;
}

// =============================================================================
// Category Display Configuration
// =============================================================================

export const categoryConfig: Record<CommandCategory, { label: string; order: number }> = {
	navigation: { label: 'Navigation', order: 1 },
	action: { label: 'Actions', order: 2 },
	settings: { label: 'Settings', order: 3 },
	conversations: { label: 'Conversations', order: 4 }
};

// =============================================================================
// Static Commands
// =============================================================================

export function getStaticCommands(): Command[] {
	return [
		// =========================================================================
		// Navigation
		// =========================================================================
		{
			id: 'nav-home',
			label: 'Go to Main Chat',
			description: 'Return to the main chat interface',
			category: 'navigation',
			icon: Home,
			keywords: ['home', 'main', 'chat', 'start', 'index'],
			shortcut: '⌘⇧H',
			action: () => goto('/')
		},
		{
			id: 'nav-arena',
			label: 'Open Model Arena',
			description: 'Compare AI models side-by-side',
			category: 'navigation',
			icon: Swords,
			keywords: ['arena', 'battle', 'compare', 'models', 'versus', 'vs'],
			shortcut: '⌘⇧A',
			action: () => goto('/arena')
		},
		{
			id: 'nav-spaces',
			label: 'View All Spaces',
			description: 'Browse all your spaces',
			category: 'navigation',
			icon: FolderOpen,
			keywords: ['spaces', 'all', 'browse', 'list'],
			action: () => goto('/spaces')
		},

		// =========================================================================
		// Actions
		// =========================================================================
		{
			id: 'action-new-chat',
			label: 'New Conversation',
			description: 'Start a fresh conversation',
			category: 'action',
			icon: Plus,
			keywords: ['new', 'chat', 'conversation', 'create', 'fresh', 'start'],
			shortcut: '⌘N',
			action: () => {
				// Clear active conversation to start fresh
				chatStore.setActiveConversation(null);
				goto('/');
			}
		},
		{
			id: 'action-toggle-sidebar',
			label: 'Toggle Sidebar',
			description: 'Show or hide the sidebar',
			category: 'action',
			icon: PanelLeft,
			keywords: ['sidebar', 'panel', 'toggle', 'hide', 'show', 'collapse'],
			shortcut: '⌘\\',
			action: () => settingsStore.toggleSidebar()
		},

		// =========================================================================
		// Settings
		// =========================================================================
		{
			id: 'settings-theme-toggle',
			label: 'Toggle Theme',
			description: 'Switch between light and dark mode',
			category: 'settings',
			icon: Moon,
			keywords: ['theme', 'dark', 'light', 'mode', 'appearance', 'color'],
			action: () => {
				const current = settingsStore.theme;
				if (current === 'dark') {
					settingsStore.setTheme('light');
				} else {
					settingsStore.setTheme('dark');
				}
			}
		},
		{
			id: 'settings-theme-dark',
			label: 'Set Dark Theme',
			description: 'Switch to dark mode',
			category: 'settings',
			icon: Moon,
			keywords: ['theme', 'dark', 'mode', 'night'],
			action: () => settingsStore.setTheme('dark'),
			enabled: () => settingsStore.theme !== 'dark'
		},
		{
			id: 'settings-theme-light',
			label: 'Set Light Theme',
			description: 'Switch to light mode',
			category: 'settings',
			icon: Sun,
			keywords: ['theme', 'light', 'mode', 'day', 'bright'],
			action: () => settingsStore.setTheme('light'),
			enabled: () => settingsStore.theme !== 'light'
		}
	];
}

// =============================================================================
// Dynamic Commands - Spaces
// =============================================================================

export function getSpaceCommands(): Command[] {
	// spacesStore.spaces is a SvelteMap - convert to array
	const spaces = Array.from(spacesStore.spaces.values());
	if (spaces.length === 0) return [];

	return spaces.map((space) => ({
		id: `nav-space-${space.id}`,
		label: `Go to ${space.name}`,
		description: space.context ? space.context.slice(0, 60) + (space.context.length > 60 ? '...' : '') : `Open ${space.name} space`,
		category: 'navigation' as CommandCategory,
		icon: FolderOpen,
		keywords: ['space', 'go', 'open', space.name.toLowerCase(), space.slug],
		action: () => goto(`/spaces/${space.slug}`)
	}));
}

// =============================================================================
// Dynamic Commands - Areas
// =============================================================================

export function getAreaCommands(): Command[] {
	const commands: Command[] = [];
	// spacesStore.spaces is a SvelteMap - convert to array
	const spaces = Array.from(spacesStore.spaces.values());

	if (spaces.length === 0) return [];

	for (const space of spaces) {
		const areas = areaStore.getAreasForSpace(space.id);
		if (!areas || areas.length === 0) continue;

		for (const area of areas) {
			commands.push({
				id: `nav-area-${area.id}`,
				label: `Go to ${area.name}`,
				description: `${space.name} → ${area.name}`,
				category: 'navigation' as CommandCategory,
				icon: Target,
				keywords: ['area', 'go', 'open', area.name.toLowerCase(), space.name.toLowerCase()],
				action: () => goto(`/spaces/${space.slug}/${area.slug}`)
			});
		}
	}

	return commands;
}

// =============================================================================
// Dynamic Commands - Tasks
// =============================================================================

export function getTaskCommands(): Command[] {
	// taskStore.tasks is a SvelteMap - convert to array
	const allTasks = Array.from(taskStore.tasks.values());
	if (allTasks.length === 0) return [];

	// Only show active tasks (not completed), limit to 10
	const activeTasks = allTasks.filter((t) => t.status !== 'completed').slice(0, 10);

	return activeTasks.map((task) => {
		// Find the space for this task
		const area = task.areaId ? areaStore.getAreaById(task.areaId) : null;
		const space = area?.spaceId ? spacesStore.getSpaceById(area.spaceId) : null;

		return {
			id: `nav-task-${task.id}`,
			label: task.title,
			description: space ? `Task in ${space.name}` : 'Task',
			category: 'navigation' as CommandCategory,
			icon: ListTodo,
			keywords: ['task', 'go', 'open', task.title.toLowerCase()],
			action: () => {
				if (space) {
					goto(`/spaces/${space.slug}/task/${task.id}`);
				}
			},
			enabled: () => !!space
		};
	});
}

// =============================================================================
// Command Aggregation
// =============================================================================

/**
 * Get all available commands (static + dynamic)
 */
export function getAllCommands(): Command[] {
	const commands = [
		...getStaticCommands(),
		...getSpaceCommands(),
		...getAreaCommands(),
		...getTaskCommands()
	];

	// Filter out disabled commands
	return commands.filter((cmd) => !cmd.enabled || cmd.enabled());
}

// =============================================================================
// Search & Filtering
// =============================================================================

/**
 * Filter commands by search query
 * Uses simple substring matching on label, description, and keywords
 */
export function filterCommands(commands: Command[], query: string): Command[] {
	if (!query.trim()) return commands;

	const q = query.toLowerCase().trim();

	return commands.filter((cmd) => {
		// Check label (highest priority)
		if (cmd.label.toLowerCase().includes(q)) return true;
		// Check description
		if (cmd.description?.toLowerCase().includes(q)) return true;
		// Check keywords
		if (cmd.keywords.some((kw) => kw.toLowerCase().includes(q))) return true;
		return false;
	});
}

/**
 * Sort commands by relevance to query
 */
export function sortByRelevance(commands: Command[], query: string): Command[] {
	if (!query.trim()) return commands;

	const q = query.toLowerCase().trim();

	return [...commands].sort((a, b) => {
		// Exact label match first
		const aLabelMatch = a.label.toLowerCase().startsWith(q);
		const bLabelMatch = b.label.toLowerCase().startsWith(q);
		if (aLabelMatch && !bLabelMatch) return -1;
		if (bLabelMatch && !aLabelMatch) return 1;

		// Then by label contains
		const aLabelContains = a.label.toLowerCase().includes(q);
		const bLabelContains = b.label.toLowerCase().includes(q);
		if (aLabelContains && !bLabelContains) return -1;
		if (bLabelContains && !aLabelContains) return 1;

		return 0;
	});
}

/**
 * Group commands by category for display
 */
export function groupByCategory(commands: Command[]): Map<CommandCategory, Command[]> {
	const groups = new Map<CommandCategory, Command[]>();

	// Initialize groups in order
	const orderedCategories: CommandCategory[] = ['navigation', 'action', 'settings', 'conversations'];
	for (const cat of orderedCategories) {
		groups.set(cat, []);
	}

	// Populate groups
	for (const cmd of commands) {
		const existing = groups.get(cmd.category) || [];
		existing.push(cmd);
		groups.set(cmd.category, existing);
	}

	// Remove empty groups
	for (const [key, value] of groups) {
		if (value.length === 0) {
			groups.delete(key);
		}
	}

	return groups;
}

// =============================================================================
// Conversation Search (Search-Only Feature)
// =============================================================================

/**
 * Look up a space by ID or slug
 * System spaces use slugs as IDs, custom spaces use UUIDs
 */
function getSpaceByIdOrSlug(spaceId: string) {
	// Try by UUID first (custom spaces)
	const byId = spacesStore.getSpaceById(spaceId);
	if (byId) return byId;

	// Fall back to slug lookup (system spaces use slugs as IDs)
	return spacesStore.spacesBySlug.get(spaceId);
}

/**
 * Get context description for a conversation
 * Shows where the conversation lives (Main Chat, Space → Area, Task, etc.)
 */
function getConversationContext(conv: Conversation): string {
	// Task conversation
	if (conv.taskId) {
		const task = taskStore.tasks.get(conv.taskId);
		if (task) {
			const area = task.areaId ? areaStore.getAreaById(task.areaId) : null;
			const space = area?.spaceId ? getSpaceByIdOrSlug(area.spaceId) : null;
			const taskTitle = task.title.length > 30 ? task.title.slice(0, 30) + '...' : task.title;
			return space ? `Task: ${taskTitle}` : `Task: ${taskTitle}`;
		}
	}

	// Area conversation
	if (conv.areaId) {
		const area = areaStore.getAreaById(conv.areaId);
		if (area) {
			const space = area.spaceId ? getSpaceByIdOrSlug(area.spaceId) : null;
			return space ? `${space.name} → ${area.name}` : area.name;
		}
	}

	// Space conversation (no specific area)
	if (conv.spaceId) {
		const space = getSpaceByIdOrSlug(conv.spaceId);
		return space ? space.name : 'Space';
	}

	// Main chat
	return 'Main Chat';
}

/**
 * Get the appropriate icon for a conversation based on its context
 */
function getConversationIcon(conv: Conversation): ComponentType {
	if (conv.taskId) return ListTodo;
	if (conv.areaId) return Target;
	if (conv.spaceId) return FolderOpen;
	return MessageSquare;
}

/**
 * Navigate to a conversation in its proper context
 */
function navigateToConversation(conv: Conversation): void {
	// Set the active conversation first
	chatStore.setActiveConversation(conv.id);

	// Task conversation
	if (conv.taskId) {
		const task = taskStore.tasks.get(conv.taskId);
		if (task) {
			const area = task.areaId ? areaStore.getAreaById(task.areaId) : null;
			const space = area?.spaceId ? getSpaceByIdOrSlug(area.spaceId) : null;
			if (space) {
				goto(`/spaces/${space.slug}/task/${task.id}`);
				return;
			}
		}
	}

	// Area conversation
	if (conv.areaId) {
		const area = areaStore.getAreaById(conv.areaId);
		if (area) {
			const space = area.spaceId ? getSpaceByIdOrSlug(area.spaceId) : null;
			if (space) {
				goto(`/spaces/${space.slug}/${area.slug}`);
				return;
			}
		}
	}

	// Space conversation
	if (conv.spaceId) {
		const space = getSpaceByIdOrSlug(conv.spaceId);
		if (space) {
			goto(`/spaces/${space.slug}`);
			return;
		}
	}

	// Default to main chat
	goto('/');
}

/**
 * Check if a conversation's context references are valid (not orphaned)
 * Returns false if the conversation references a space/area/task that doesn't exist
 */
function isConversationContextValid(conv: Conversation): boolean {
	// Task conversation - check if task and its space exist
	if (conv.taskId) {
		const task = taskStore.tasks.get(conv.taskId);
		if (!task) return false;
		if (task.areaId) {
			const area = areaStore.getAreaById(task.areaId);
			if (!area) return false;
			if (area.spaceId && !getSpaceByIdOrSlug(area.spaceId)) return false;
		}
		return true;
	}

	// Area conversation - check if area and its space exist
	if (conv.areaId) {
		const area = areaStore.getAreaById(conv.areaId);
		if (!area) return false;
		if (area.spaceId && !getSpaceByIdOrSlug(area.spaceId)) return false;
		return true;
	}

	// Space conversation - check if space exists
	if (conv.spaceId) {
		return !!getSpaceByIdOrSlug(conv.spaceId);
	}

	// Main chat conversation - always valid
	return true;
}

/**
 * Search conversations by title and message content
 * Only returns results when query is 2+ characters
 *
 * Scoring:
 * - Title starts with query: 100 points
 * - Title contains query: 50 points
 * - Message contains query: 25 points
 */
export function searchConversations(query: string): Command[] {
	// Only search if query is 2+ characters
	const q = query.trim().toLowerCase();
	if (q.length < 2) return [];

	// Get all conversations, sorted by most recent, limited for performance
	// Filter out orphaned conversations (those with invalid context references)
	const allConversations = Array.from(chatStore.conversations.values())
		.filter((conv) => isConversationContextValid(conv))
		.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
		.slice(0, 100); // Only search 100 most recent

	// Score and filter conversations
	const scored = allConversations
		.map((conv) => {
			let score = 0;
			let matchType: 'title' | 'message' = 'title';

			// Title match (higher priority)
			const title = (conv.title || 'New Chat').toLowerCase();
			if (title.startsWith(q)) {
				score = 100;
				matchType = 'title';
			} else if (title.includes(q)) {
				score = 50;
				matchType = 'title';
			}

			// Message content match (lower priority, only if no title match)
			if (score === 0 && conv.messages.length > 0) {
				// Search first 10 messages for performance
				const messagesToSearch = conv.messages.slice(0, 10);
				const hasMatch = messagesToSearch.some((m) => m.content.toLowerCase().includes(q));
				if (hasMatch) {
					score = 25;
					matchType = 'message';
				}
			}

			return { conv, score, matchType };
		})
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 8); // Limit to 8 results

	// Convert to Command format
	return scored.map(({ conv, matchType }) => {
		const context = getConversationContext(conv);
		const title = conv.title || 'New Chat';

		// Add hint for message-only matches
		const description = matchType === 'message' ? `${context} · Match in messages` : context;

		return {
			id: `conv-${conv.id}`,
			label: title,
			description,
			category: 'conversations' as CommandCategory,
			icon: getConversationIcon(conv),
			keywords: [], // Not used for conversation search
			action: () => navigateToConversation(conv)
		};
	});
}

/**
 * Filter commands AND search conversations
 * Conversations only appear when there's an active search query (2+ chars)
 */
export function filterWithConversations(commands: Command[], query: string): Command[] {
	const filteredCommands = filterCommands(commands, query);

	// Only search conversations if query is 2+ characters
	if (query.trim().length >= 2) {
		const conversationResults = searchConversations(query);
		return [...filteredCommands, ...conversationResults];
	}

	return filteredCommands;
}
