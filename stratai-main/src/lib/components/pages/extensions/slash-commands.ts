/**
 * Slash Commands Extension for TipTap
 *
 * Provides a "/" trigger that opens a command menu for quick actions:
 * - Create Diagram (Excalidraw)
 * - Insert Image (future)
 * - Insert Code Block (future)
 *
 * Based on @tiptap/suggestion for the trigger mechanism
 */

import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import type { Editor } from '@tiptap/core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = any; // Lucide icons have complex types that don't align with Svelte 5's Component type

export interface SlashCommandItem {
	id: string;
	title: string;
	description: string;
	icon: IconComponent; // Lucide icon component (rendered via svelte:component)
	command: (props: { editor: Editor; range: Range }) => void;
}

interface Range {
	from: number;
	to: number;
}

export interface SlashCommandsOptions {
	suggestion: Partial<SuggestionOptions<SlashCommandItem>>;
}

export const SlashCommands = Extension.create<SlashCommandsOptions>({
	name: 'slashCommands',

	addOptions() {
		return {
			suggestion: {
				char: '/',
				command: ({ editor, range, props }) => {
					props.command({ editor, range });
				}
			}
		};
	},

	addProseMirrorPlugins() {
		return [
			Suggestion({
				editor: this.editor,
				...this.options.suggestion
			})
		];
	}
});

// Import lucide icons for commands
import {
	GitBranch,
	Code,
	Table,
	ListChecks,
	Heading1,
	Heading2,
	Quote,
	Minus
} from 'lucide-svelte';

/**
 * Default slash command items
 * The actual commands are configured where the extension is used,
 * allowing different contexts to have different available commands.
 */
export function getDefaultCommands(
	onCreateDiagram: () => void
): SlashCommandItem[] {
	return [
		{
			id: 'diagram',
			title: 'Create Diagram',
			description: 'Draw flowcharts, architecture diagrams, and more',
			icon: GitBranch,
			command: ({ editor, range }) => {
				// Delete the "/" trigger text
				editor.chain().focus().deleteRange(range).run();
				// Trigger diagram creation
				onCreateDiagram();
			}
		},
		{
			id: 'codeblock',
			title: 'Code Block',
			description: 'Insert a code block with syntax highlighting',
			icon: Code,
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).setCodeBlock().run();
			}
		},
		{
			id: 'table',
			title: 'Table',
			description: 'Insert a table for structured data',
			icon: Table,
			command: ({ editor, range }) => {
				editor
					.chain()
					.focus()
					.deleteRange(range)
					.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
					.run();
			}
		},
		{
			id: 'tasklist',
			title: 'Task List',
			description: 'Create a checklist with checkboxes',
			icon: ListChecks,
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).toggleTaskList().run();
			}
		},
		{
			id: 'heading1',
			title: 'Heading 1',
			description: 'Large section heading',
			icon: Heading1,
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
			}
		},
		{
			id: 'heading2',
			title: 'Heading 2',
			description: 'Medium section heading',
			icon: Heading2,
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
			}
		},
		{
			id: 'blockquote',
			title: 'Quote',
			description: 'Highlight a quote or callout',
			icon: Quote,
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).setBlockquote().run();
			}
		},
		{
			id: 'divider',
			title: 'Divider',
			description: 'Insert a horizontal divider',
			icon: Minus,
			command: ({ editor, range }) => {
				editor.chain().focus().deleteRange(range).setHorizontalRule().run();
			}
		}
	];
}
