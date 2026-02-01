/**
 * Deterministic Markdown → TipTap JSON conversion pipeline
 *
 * Converts markdown to TipTap JSON via:
 *   markdown-it → HTML → @tiptap/html generateJSON → TipTap JSON
 *
 * Used by /api/pages/extract and /api/pages/generate to replace
 * the fragile AI-generated TipTap JSON approach.
 */

import MarkdownIt from 'markdown-it';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const taskLists = require('markdown-it-task-lists');
import { generateJSON } from '@tiptap/html/server';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import type { TipTapContent } from '$lib/types/page';

// Initialize markdown-it with safe defaults
const md = new MarkdownIt({
	html: false, // Security: don't allow raw HTML in AI output
	linkify: true, // Auto-link URLs
	breaks: false // Documents shouldn't convert single newlines to <br>
}).use(taskLists, { enabled: true });

// Initialize lowlight for code block syntax highlighting
const lowlight = createLowlight(common);

// TipTap extensions matching PageEditor subset (standard formatting only)
// Excludes: DiagramNode, SlashCommands, Placeholder (editor-only)
const extensions = [
	StarterKit.configure({
		codeBlock: false // Use CodeBlockLowlight instead
	}),
	Underline,
	Link.configure({
		openOnClick: false
	}),
	TaskList,
	TaskItem.configure({
		nested: true
	}),
	Table.configure({
		resizable: false
	}),
	TableRow,
	TableHeader,
	TableCell,
	CodeBlockLowlight.configure({
		lowlight
	})
];

/**
 * Convert markdown string to TipTap JSON content.
 *
 * Pipeline: markdown → HTML (markdown-it) → TipTap JSON (generateJSON)
 *
 * @param markdown - Markdown string to convert
 * @returns TipTap JSON content structure
 * @throws If conversion fails (caller should use textToTipTap as fallback)
 */
export function markdownToTipTap(markdown: string): TipTapContent {
	if (!markdown || !markdown.trim()) {
		return {
			type: 'doc',
			content: [{ type: 'paragraph' }]
		};
	}

	// Step 1: Markdown → HTML
	const html = md.render(markdown);

	// Step 2: HTML → TipTap JSON
	const json = generateJSON(html, extensions);

	// Step 3: Validate basic structure
	if (json.type !== 'doc' || !Array.isArray(json.content)) {
		throw new Error('generateJSON produced invalid structure');
	}

	return json as TipTapContent;
}

/**
 * Convert raw HTML to TipTap JSON content.
 *
 * Used for DOCX import (mammoth produces HTML) and any future HTML→TipTap needs.
 *
 * @param html - HTML string to convert
 * @returns TipTap JSON content structure
 * @throws If conversion fails (caller should use textToTipTap as fallback)
 */
export function htmlToTipTap(html: string): TipTapContent {
	if (!html || !html.trim()) {
		return {
			type: 'doc',
			content: [{ type: 'paragraph' }]
		};
	}

	const json = generateJSON(html, extensions);

	if (json.type !== 'doc' || !Array.isArray(json.content)) {
		throw new Error('generateJSON produced invalid structure');
	}

	return json as TipTapContent;
}

/**
 * Convert plain text to TipTap JSON content (paragraph fallback).
 *
 * Used when markdownToTipTap() fails. Always produces valid content.
 *
 * @param text - Raw text to wrap in paragraphs
 * @returns TipTap JSON content with text split into paragraphs
 */
export function textToTipTap(text: string): TipTapContent {
	if (!text || !text.trim()) {
		return {
			type: 'doc',
			content: [{ type: 'paragraph' }]
		};
	}

	const paragraphs = text.split(/\n\n+/).filter(Boolean);
	return {
		type: 'doc',
		content: paragraphs.map((p) => ({
			type: 'paragraph',
			content: [{ type: 'text', text: p.trim() }]
		}))
	};
}
