/**
 * Suggestion Configuration for Slash Commands
 *
 * This bridges @tiptap/suggestion with our Svelte CommandMenu component.
 * It handles rendering the menu as a Svelte component and managing its lifecycle.
 */

import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import type { SlashCommandItem } from './slash-commands';
import CommandMenu from '../CommandMenu.svelte';
import { mount, unmount } from 'svelte';

export interface SuggestionConfigOptions {
	items: SlashCommandItem[];
}

/**
 * Create suggestion configuration for slash commands
 */
export function createSuggestionConfig(
	options: SuggestionConfigOptions
): Partial<SuggestionOptions<SlashCommandItem>> {
	return {
		items: ({ query }) => {
			return options.items.filter((item) =>
				item.title.toLowerCase().includes(query.toLowerCase()) ||
				item.description.toLowerCase().includes(query.toLowerCase())
			);
		},

		render: () => {
			let component: ReturnType<typeof mount> | null = null;
			let container: HTMLElement | null = null;
			let menuInstance: { handleKeyDown: (e: KeyboardEvent) => boolean } | null = null;

			return {
				onStart: (props: SuggestionProps<SlashCommandItem>) => {
					// Create container for the Svelte component
					container = document.createElement('div');
					container.classList.add('slash-command-container');
					document.body.appendChild(container);

					// Mount the Svelte component
					component = mount(CommandMenu, {
						target: container,
						props: {
							items: props.items,
							command: props.command,
							clientRect: props.clientRect
						}
					});

					// Get reference to the component for keyboard handling
					// Note: We'll handle keyboard events through the TipTap suggestion plugin
					menuInstance = component as unknown as { handleKeyDown: (e: KeyboardEvent) => boolean };
				},

				onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
					if (!component || !container) return;

					// Update the component props
					// Svelte 5 mount returns a different interface, we need to remount
					unmount(component);
					component = mount(CommandMenu, {
						target: container,
						props: {
							items: props.items,
							command: props.command,
							clientRect: props.clientRect
						}
					});
					menuInstance = component as unknown as { handleKeyDown: (e: KeyboardEvent) => boolean };
				},

				onKeyDown: (props: { event: KeyboardEvent }) => {
					const { event } = props;

					// Handle escape - close menu
					if (event.key === 'Escape') {
						return true;
					}

					// Handle arrow keys and enter via the menu component
					if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter') {
						if (menuInstance?.handleKeyDown) {
							return menuInstance.handleKeyDown(event);
						}
					}

					return false;
				},

				onExit: () => {
					// Cleanup
					if (component) {
						unmount(component);
						component = null;
					}
					if (container) {
						container.remove();
						container = null;
					}
					menuInstance = null;
				}
			};
		}
	};
}
