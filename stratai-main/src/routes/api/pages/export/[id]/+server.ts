/**
 * Page Export API
 *
 * GET /api/pages/export/[id]?format=markdown|docx
 * Exports a page as Markdown or Word document.
 *
 * Phase 9 acceptance criteria:
 * - P9-MD-*: Markdown export
 * - P9-DX-*: DOCX export
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import type { TipTapContent, TipTapNode, TipTapMark } from '$lib/types/page';
import {
	Document,
	Packer,
	Paragraph,
	TextRun,
	HeadingLevel,
	AlignmentType,
	ExternalHyperlink,
	UnderlineType
} from 'docx';

/**
 * Slugify a string for use in filenames
 */
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '') // Remove special characters
		.replace(/\s+/g, '-') // Replace spaces with dashes
		.replace(/-+/g, '-') // Remove duplicate dashes
		.trim()
		.substring(0, 50); // Limit length
}

/**
 * Convert TipTap content to Markdown
 * P9-MD-04: Headings converted correctly
 * P9-MD-05: Lists converted correctly
 * P9-MD-06: Code blocks preserved
 * P9-MD-07: Links preserved
 */
function convertToMarkdown(content: TipTapContent, title: string): string {
	const lines: string[] = [];

	// Add title as H1
	lines.push(`# ${title}`);
	lines.push('');

	function processNodes(nodes: TipTapNode[], listDepth = 0): void {
		for (const node of nodes) {
			switch (node.type) {
				case 'heading': {
					const level = Number(node.attrs?.level) || 1;
					const prefix = '#'.repeat(level);
					const text = extractText(node.content || []);
					lines.push(`${prefix} ${text}`);
					lines.push('');
					break;
				}

				case 'paragraph': {
					const text = extractText(node.content || []);
					if (text || listDepth === 0) {
						lines.push(text);
						lines.push('');
					}
					break;
				}

				case 'bulletList': {
					if (node.content) {
						for (const item of node.content) {
							if (item.type === 'listItem' && item.content) {
								const indent = '  '.repeat(listDepth);
								const text = extractListItemText(item.content);
								lines.push(`${indent}- ${text}`);
								// Handle nested lists
								const nestedList = item.content.find(
									(n) => n.type === 'bulletList' || n.type === 'orderedList'
								);
								if (nestedList && nestedList.content) {
									processNodes([nestedList], listDepth + 1);
								}
							}
						}
					}
					lines.push('');
					break;
				}

				case 'orderedList': {
					if (node.content) {
						let index = 1;
						for (const item of node.content) {
							if (item.type === 'listItem' && item.content) {
								const indent = '  '.repeat(listDepth);
								const text = extractListItemText(item.content);
								lines.push(`${indent}${index}. ${text}`);
								index++;
								// Handle nested lists
								const nestedList = item.content.find(
									(n) => n.type === 'bulletList' || n.type === 'orderedList'
								);
								if (nestedList && nestedList.content) {
									processNodes([nestedList], listDepth + 1);
								}
							}
						}
					}
					lines.push('');
					break;
				}

				case 'taskList': {
					if (node.content) {
						for (const item of node.content) {
							if (item.type === 'taskItem' && item.content) {
								const checked = item.attrs?.checked ? 'x' : ' ';
								const text = extractListItemText(item.content);
								lines.push(`- [${checked}] ${text}`);
							}
						}
					}
					lines.push('');
					break;
				}

				case 'codeBlock': {
					const language = node.attrs?.language || '';
					const code = node.content?.map((n) => n.text || '').join('') || '';
					lines.push('```' + language);
					lines.push(code);
					lines.push('```');
					lines.push('');
					break;
				}

				case 'blockquote': {
					if (node.content) {
						for (const child of node.content) {
							if (child.type === 'paragraph') {
								const text = extractText(child.content || []);
								lines.push(`> ${text}`);
							}
						}
					}
					lines.push('');
					break;
				}

				case 'horizontalRule': {
					lines.push('---');
					lines.push('');
					break;
				}
			}
		}
	}

	/**
	 * Extract text from inline content with marks
	 */
	function extractText(nodes: TipTapNode[]): string {
		return nodes
			.map((node) => {
				if (node.type === 'text' && node.text) {
					let text = node.text;

					// Apply marks
					if (node.marks) {
						for (const mark of node.marks) {
							switch (mark.type) {
								case 'bold':
									text = `**${text}**`;
									break;
								case 'italic':
									text = `*${text}*`;
									break;
								case 'strike':
									text = `~~${text}~~`;
									break;
								case 'code':
									text = `\`${text}\``;
									break;
								case 'link':
									text = `[${text}](${mark.attrs?.href || ''})`;
									break;
							}
						}
					}

					return text;
				}
				if (node.type === 'hardBreak') {
					return '\n';
				}
				return '';
			})
			.join('');
	}

	/**
	 * Extract text from list item content (first paragraph only)
	 */
	function extractListItemText(content: TipTapNode[]): string {
		const paragraph = content.find((n) => n.type === 'paragraph');
		if (paragraph && paragraph.content) {
			return extractText(paragraph.content);
		}
		return '';
	}

	if (content.content) {
		processNodes(content.content);
	}

	// Clean up extra blank lines
	return lines
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/**
 * Convert TipTap content to DOCX document
 * P9-DX-04: Headings styled correctly
 * P9-DX-05: Lists rendered correctly
 * P9-DX-06: Basic formatting preserved
 */
function convertToDocx(content: TipTapContent, title: string): Document {
	const children: Paragraph[] = [];

	// Add title
	children.push(
		new Paragraph({
			text: title,
			heading: HeadingLevel.TITLE,
			spacing: { after: 400 }
		})
	);

	function processNodes(nodes: TipTapNode[]): void {
		for (const node of nodes) {
			switch (node.type) {
				case 'heading': {
					const level = Number(node.attrs?.level) || 1;
					const headingLevel =
						level === 1
							? HeadingLevel.HEADING_1
							: level === 2
								? HeadingLevel.HEADING_2
								: HeadingLevel.HEADING_3;

					children.push(
						new Paragraph({
							children: createTextRuns(node.content || []),
							heading: headingLevel,
							spacing: { before: 300, after: 200 }
						})
					);
					break;
				}

				case 'paragraph': {
					children.push(
						new Paragraph({
							children: createTextRuns(node.content || []),
							spacing: { after: 200 }
						})
					);
					break;
				}

				case 'bulletList': {
					if (node.content) {
						for (const item of node.content) {
							if (item.type === 'listItem' && item.content) {
								const paragraph = item.content.find((n) => n.type === 'paragraph');
								if (paragraph) {
									children.push(
										new Paragraph({
											children: createTextRuns(paragraph.content || []),
											bullet: { level: 0 },
											spacing: { after: 100 }
										})
									);
								}
							}
						}
					}
					break;
				}

				case 'orderedList': {
					if (node.content) {
						let index = 1;
						for (const item of node.content) {
							if (item.type === 'listItem' && item.content) {
								const paragraph = item.content.find((n) => n.type === 'paragraph');
								if (paragraph) {
									children.push(
										new Paragraph({
											children: [
												new TextRun({ text: `${index}. ` }),
												...createTextRuns(paragraph.content || [])
											],
											indent: { left: 720 },
											spacing: { after: 100 }
										})
									);
									index++;
								}
							}
						}
					}
					break;
				}

				case 'taskList': {
					if (node.content) {
						for (const item of node.content) {
							if (item.type === 'taskItem' && item.content) {
								const checked = item.attrs?.checked ? '☑' : '☐';
								const paragraph = item.content.find((n) => n.type === 'paragraph');
								if (paragraph) {
									children.push(
										new Paragraph({
											children: [
												new TextRun({ text: `${checked} ` }),
												...createTextRuns(paragraph.content || [])
											],
											indent: { left: 720 },
											spacing: { after: 100 }
										})
									);
								}
							}
						}
					}
					break;
				}

				case 'codeBlock': {
					const code = node.content?.map((n) => n.text || '').join('') || '';
					const codeLines = code.split('\n');
					for (const line of codeLines) {
						children.push(
							new Paragraph({
								children: [
									new TextRun({
										text: line || ' ',
										font: 'Courier New',
										size: 20 // 10pt
									})
								],
								shading: { fill: 'F5F5F5' },
								spacing: { after: 0 }
							})
						);
					}
					// Add spacing after code block
					children.push(new Paragraph({ spacing: { after: 200 } }));
					break;
				}

				case 'blockquote': {
					if (node.content) {
						for (const child of node.content) {
							if (child.type === 'paragraph') {
								children.push(
									new Paragraph({
										children: createTextRuns(child.content || []),
										indent: { left: 720 },
										border: {
											left: { color: 'CCCCCC', size: 24, style: 'single', space: 10 }
										},
										spacing: { after: 200 }
									})
								);
							}
						}
					}
					break;
				}

				case 'horizontalRule': {
					children.push(
						new Paragraph({
							border: {
								bottom: { color: 'CCCCCC', size: 1, style: 'single' }
							},
							spacing: { before: 200, after: 200 }
						})
					);
					break;
				}
			}
		}
	}

	/**
	 * Create TextRun array from TipTap inline content
	 */
	function createTextRuns(nodes: TipTapNode[]): TextRun[] {
		const runs: TextRun[] = [];

		for (const node of nodes) {
			if (node.type === 'text' && node.text) {
				const options: {
					text: string;
					bold?: boolean;
					italics?: boolean;
					strike?: boolean;
					underline?: { type: typeof UnderlineType.SINGLE };
					font?: string;
				} = { text: node.text };

				// Apply marks
				if (node.marks) {
					for (const mark of node.marks) {
						switch (mark.type) {
							case 'bold':
								options.bold = true;
								break;
							case 'italic':
								options.italics = true;
								break;
							case 'strike':
								options.strike = true;
								break;
							case 'underline':
								options.underline = { type: UnderlineType.SINGLE };
								break;
							case 'code':
								options.font = 'Courier New';
								break;
							// Note: Links in DOCX require ExternalHyperlink which is more complex
							// For simplicity, we'll just show the text
						}
					}
				}

				runs.push(new TextRun(options));
			} else if (node.type === 'hardBreak') {
				runs.push(new TextRun({ break: 1 }));
			}
		}

		return runs;
	}

	if (content.content) {
		processNodes(content.content);
	}

	return new Document({
		sections: [
			{
				properties: {},
				children
			}
		]
	});
}

/**
 * GET /api/pages/export/[id]?format=markdown|docx
 *
 * P9-MD-01, P9-DX-01: Export endpoint works
 * P9-MD-02: Content-Type is text/markdown
 * P9-MD-03, P9-DX-03: Filename includes doc title
 * P9-DX-02: Content-Type is correct MIME type
 * P9-MD-08: File downloads
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	if (!locals.session) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.session.userId;
	const { id } = params;
	const format = url.searchParams.get('format') || 'markdown';

	// Fetch the page
	const page = await postgresPageRepository.findById(id, userId);
	if (!page) {
		throw error(404, 'Page not found');
	}

	const filename = slugify(page.title) || 'untitled';

	if (format === 'markdown') {
		const markdown = convertToMarkdown(page.content, page.title);

		return new Response(markdown, {
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}.md"`
			}
		});
	}

	if (format === 'docx') {
		const doc = convertToDocx(page.content, page.title);
		const buffer = await Packer.toBuffer(doc);

		// Convert Buffer to Uint8Array for Response body
		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'Content-Disposition': `attachment; filename="${filename}.docx"`
			}
		});
	}

	throw error(400, `Unsupported format: ${format}. Use 'markdown' or 'docx'.`);
};
