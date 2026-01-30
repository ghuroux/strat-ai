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
	ArrowRight,
	BarChart3,
	UserPlus,
	Shield,
	Users,
	Layers,
	Terminal,
	FileText,
	FilePlus,
	Gamepad2
} from 'lucide-svelte';
import { easterEggsStore } from '$lib/stores/easter-eggs.svelte';
import { toastStore } from '$lib/stores/toast.svelte';
import { spacesStore } from '$lib/stores/spaces.svelte';
import { areaStore } from '$lib/stores/areas.svelte';
import { taskStore } from '$lib/stores/tasks.svelte';
import { settingsStore } from '$lib/stores/settings.svelte';
import { chatStore } from '$lib/stores/chat.svelte';
import { userStore } from '$lib/stores/user.svelte';
import { pageStore } from '$lib/stores/pages.svelte';
import { gameStore } from '$lib/stores/games.svelte';
import type { Conversation } from '$lib/types/chat';

// =============================================================================
// Types
// =============================================================================

export type CommandCategory = 'navigation' | 'action' | 'admin' | 'settings' | 'conversations' | 'search_results';

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
	admin: { label: 'Admin', order: 3 },
	settings: { label: 'Settings', order: 4 },
	conversations: { label: 'Conversations', order: 5 },
	search_results: { label: 'Search Results', order: 6 }
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
		{
			id: 'action-play-snake',
			label: 'Play Snake',
			description: 'Quick dopamine hit between tasks',
			category: 'action',
			icon: Gamepad2,
			keywords: ['snake', 'game', 'play', 'fun', 'break', 'arcade', 'mini'],
			action: () => gameStore.openSnake()
		},
		{
			id: 'action-play-wordle',
			label: 'Play Wordle',
			description: 'Daily word puzzle - guess the 5-letter word',
			category: 'action',
			icon: Gamepad2,
			keywords: ['wordle', 'game', 'play', 'word', 'puzzle', 'guess', 'daily', 'letters'],
			action: () => gameStore.openWordle()
		},
		{
			id: 'action-play-prompt-runner',
			label: 'Play Prompt Runner',
			description: 'Navigate the LLM pipeline - dodge errors',
			category: 'action',
			icon: Gamepad2,
			keywords: ['prompt', 'runner', 'game', 'play', 'run', 'jump', 'endless', 'arcade', 'llm', 'token'],
			action: () => gameStore.openPromptRunner()
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
		},

		// =========================================================================
		// Easter Egg Commands (Hidden but searchable)
		// =========================================================================
		{
			id: 'easter-theme-hacker',
			label: 'Hacker Mode',
			description: 'Enter the Matrix...',
			category: 'settings',
			icon: Terminal,
			keywords: ['theme:hacker', 'hacker', 'matrix', 'green', 'neo', 'morpheus', '1337'],
			action: () => {
				const body = document.body;
				const isActive = body.classList.contains('theme-hacker');

				if (isActive) {
					// Disable hacker mode
					body.classList.remove('theme-hacker');
					toastStore.info('Exiting the Matrix...', 3000);
				} else {
					// Enable hacker mode with dramatic entrance!
					// 1. Force dark theme first (required for hacker theme)
					settingsStore.setTheme('dark');

					// 2. Trigger matrix rain animation
					easterEggsStore.triggerMatrixRain();

					// 3. Apply hacker theme after short delay (so rain shows on dark bg first)
					setTimeout(() => {
						body.classList.add('theme-hacker');
						const isFirstTime = easterEggsStore.discover('hacker-theme');
						if (isFirstTime) {
							toastStore.discovery('Welcome to the Matrix. You found a secret theme!', 5000);
						} else {
							toastStore.success('Hacker mode activated. Type again to exit.', 3000);
						}
					}, 500);
				}
			}
		}
	];
}

// =============================================================================
// Admin Commands (only shown to admins/owners)
// =============================================================================

export function getAdminCommands(): Command[] {
	// Only show admin commands if user has admin privileges
	if (!userStore.isAdmin) {
		return [];
	}

	return [
		{
			id: 'admin-usage',
			label: 'View Usage',
			description: 'Monitor organization LLM usage and costs',
			category: 'admin' as CommandCategory,
			icon: BarChart3,
			keywords: ['admin', 'usage', 'analytics', 'costs', 'tokens', 'metrics'],
			action: () => goto('/admin/usage')
		},
		{
			id: 'admin-members',
			label: 'Manage Members',
			description: 'Add, remove, and manage organization members',
			category: 'admin' as CommandCategory,
			icon: Users,
			keywords: ['admin', 'members', 'users', 'team', 'people', 'invite'],
			action: () => goto('/admin/members')
		},
		{
			id: 'admin-groups',
			label: 'Manage Groups',
			description: 'Create and manage user groups',
			category: 'admin' as CommandCategory,
			icon: Users,
			keywords: ['admin', 'groups', 'teams', 'departments'],
			action: () => goto('/admin/groups')
		},
		{
			id: 'admin-model-access',
			label: 'Model Access',
			description: 'Configure model tiers and access controls',
			category: 'admin' as CommandCategory,
			icon: Layers,
			keywords: ['admin', 'models', 'tiers', 'access', 'permissions'],
			action: () => goto('/admin/model-access')
		},
		{
			id: 'admin-settings',
			label: 'Organization Settings',
			description: 'Configure organization-wide settings',
			category: 'admin' as CommandCategory,
			icon: Settings,
			keywords: ['admin', 'settings', 'organization', 'config', 'preferences'],
			action: () => goto('/admin/settings')
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
// Dynamic Commands - Pages (P9-CP-*)
// =============================================================================

/**
 * Get page commands for command palette
 * P9-CP-01: "New Page" command
 * P9-CP-02: "Search Pages" (navigation to pages list)
 * P9-CP-03: Commands appear in palette
 * P9-CP-04: Proper shortcuts
 */
export function getPageCommands(): Command[] {
	const commands: Command[] = [];
	const spaces = Array.from(spacesStore.spaces.values());

	// Add "New Page" commands for each area
	for (const space of spaces) {
		const areas = areaStore.getAreasForSpace(space.id);
		if (!areas || areas.length === 0) continue;

		for (const area of areas) {
			commands.push({
				id: `action-new-page-${area.id}`,
				label: `New Page in ${area.name}`,
				description: `Create a new page in ${space.name} → ${area.name}`,
				category: 'action' as CommandCategory,
				icon: FilePlus,
				keywords: ['new', 'page', 'create', 'document', area.name.toLowerCase(), space.name.toLowerCase()],
				action: () => goto(`/spaces/${space.slug}/${area.slug}/pages/new`)
			});
		}

		// Add "View Pages" command for each area
		for (const area of areas) {
			commands.push({
				id: `nav-pages-${area.id}`,
				label: `View ${area.name} Pages`,
				description: `Browse pages in ${space.name} → ${area.name}`,
				category: 'navigation' as CommandCategory,
				icon: FileText,
				keywords: ['pages', 'documents', 'view', 'list', area.name.toLowerCase(), space.name.toLowerCase()],
				action: () => goto(`/spaces/${space.slug}/${area.slug}/pages`)
			});
		}
	}

	// Add recent pages as quick access (limit to 10 most recent)
	const recentPages = pageStore.pageList.slice(0, 10);
	for (const page of recentPages) {
		// Find the area and space for this page
		const area = page.areaId ? areaStore.getAreaById(page.areaId) : null;
		const space = area?.spaceId ? spacesStore.getSpaceById(area.spaceId) : null;

		if (area && space) {
			commands.push({
				id: `nav-page-${page.id}`,
				label: page.title || 'Untitled Page',
				description: `${space.name} → ${area.name}`,
				category: 'navigation' as CommandCategory,
				icon: FileText,
				keywords: ['page', 'document', (page.title || '').toLowerCase(), area.name.toLowerCase()],
				action: () => goto(`/spaces/${space.slug}/${area.slug}/pages/${page.id}`)
			});
		}
	}

	return commands;
}

// =============================================================================
// Command Aggregation
// =============================================================================

/**
 * Get all available commands (static + dynamic + admin)
 */
export function getAllCommands(): Command[] {
	const commands = [
		...getStaticCommands(),
		...getAdminCommands(),
		...getSpaceCommands(),
		...getAreaCommands(),
		...getTaskCommands(),
		...getPageCommands()
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
	const orderedCategories: CommandCategory[] = ['navigation', 'action', 'admin', 'settings', 'conversations', 'search_results'];
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

// =============================================================================
// Server-Side Search Result Conversion
// =============================================================================

/**
 * Shape returned by GET /api/search
 */
export interface SearchResultItem {
	id: string;
	type: 'page' | 'task' | 'area' | 'space' | 'document' | 'conversation';
	title: string;
	description?: string;
	spaceId?: string;
	areaId?: string;
	slug?: string;
	status?: string;
	meta?: Record<string, string>;
}

const SEARCH_RESULT_ICONS: Record<string, ComponentType> = {
	page: FileText,
	task: ListTodo,
	area: Target,
	space: FolderOpen,
	document: FileText,
	conversation: MessageSquare
};

/**
 * Resolve navigation action + description for a search result
 * Returns null action if we can't build a valid navigation path
 */
function getSearchResultNavigation(result: SearchResultItem): { action: (() => void) | null; description: string } {
	switch (result.type) {
		case 'space': {
			if (!result.slug) return { action: null, description: '' };
			return {
				action: () => goto(`/spaces/${result.slug}`),
				description: 'Space'
			};
		}
		case 'area': {
			const space = result.spaceId ? spacesStore.getSpaceById(result.spaceId) : null;
			if (!space || !result.slug) return { action: null, description: '' };
			return {
				action: () => goto(`/spaces/${space.slug}/${result.slug}`),
				description: `Area in ${space.name}`
			};
		}
		case 'page': {
			const area = result.areaId ? areaStore.getAreaById(result.areaId) : null;
			const space = area?.spaceId ? spacesStore.getSpaceById(area.spaceId) : null;
			if (!area || !space) return { action: null, description: '' };
			const typeLabel = result.meta?.pageType
				? result.meta.pageType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
				: 'Page';
			return {
				action: () => goto(`/spaces/${space.slug}/${area.slug}/pages/${result.id}`),
				description: `${typeLabel} in ${space.name} → ${area.name}`
			};
		}
		case 'task': {
			let space = result.spaceId ? spacesStore.getSpaceById(result.spaceId) : null;
			if (!space && result.areaId) {
				const area = areaStore.getAreaById(result.areaId);
				space = area?.spaceId ? spacesStore.getSpaceById(area.spaceId) : null;
			}
			if (!space) return { action: null, description: '' };
			const statusLabel = result.status ? ` · ${result.status}` : '';
			return {
				action: () => goto(`/spaces/${space!.slug}/task/${result.id}`),
				description: `Task in ${space.name}${statusLabel}`
			};
		}
		default:
			return { action: null, description: '' };
	}
}

/**
 * Convert server-side search results into Command objects for the palette.
 * Only includes results where navigation can be resolved from client stores.
 * Filters to navigable entity types (pages, tasks, areas, spaces).
 */
export function convertSearchResults(results: SearchResultItem[]): Command[] {
	const commands: Command[] = [];

	for (const result of results) {
		if (!['page', 'task', 'area', 'space'].includes(result.type)) continue;

		const icon = SEARCH_RESULT_ICONS[result.type] || Search;
		const nav = getSearchResultNavigation(result);
		if (!nav.action) continue;

		commands.push({
			id: `search-${result.type}-${result.id}`,
			label: result.title,
			description: nav.description,
			category: 'search_results' as CommandCategory,
			icon,
			keywords: [],
			action: nav.action
		});
	}

	return commands;
}
