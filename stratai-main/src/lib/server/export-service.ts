/**
 * Export Service
 * Converts markdown content to various document formats (MD, DOCX, PDF)
 */

import {
	Document,
	Packer,
	Paragraph,
	TextRun,
	HeadingLevel,
	Table,
	TableRow,
	TableCell,
	WidthType,
	BorderStyle,
	ShadingType,
	AlignmentType
} from 'docx';
import PDFDocument from 'pdfkit';
import { marked } from 'marked';

export interface ExportOptions {
	content: string;
	format: 'md' | 'docx' | 'pdf';
	title?: string;
}

export interface ExportResult {
	buffer: Buffer;
	mimeType: string;
	filename: string;
}

// Type definitions for marked tokens
type Token = marked.Token;
type Tokens = marked.TokensList;

/**
 * Main export function - routes to appropriate converter
 */
export async function exportMessage(options: ExportOptions): Promise<ExportResult> {
	const { content, format, title = 'response' } = options;
	const sanitizedTitle = sanitizeFilename(title);
	const timestamp = new Date().toISOString().split('T')[0];
	const baseFilename = `${sanitizedTitle}-${timestamp}`;

	switch (format) {
		case 'md':
			return exportAsMarkdown(content, baseFilename);
		case 'docx':
			return await exportAsDocx(content, baseFilename, title);
		case 'pdf':
			return await exportAsPdf(content, baseFilename, title);
		default:
			throw new Error(`Unsupported format: ${format}`);
	}
}

/**
 * Sanitize filename to prevent path traversal and invalid characters
 */
function sanitizeFilename(filename: string): string {
	return filename
		.replace(/[/\\:*?"<>|]/g, '-')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 50);
}

/**
 * Export as Markdown - simply returns the raw content
 */
function exportAsMarkdown(content: string, baseFilename: string): ExportResult {
	return {
		buffer: Buffer.from(content, 'utf-8'),
		mimeType: 'text/markdown',
		filename: `${baseFilename}.md`
	};
}

/**
 * Export as DOCX with rich formatting
 */
async function exportAsDocx(
	content: string,
	baseFilename: string,
	title: string
): Promise<ExportResult> {
	const tokens = marked.lexer(content);
	const children = tokensToDocxElements(tokens);

	const doc = new Document({
		title,
		creator: 'StratHost Chat',
		sections: [
			{
				properties: {},
				children
			}
		]
	});

	const buffer = await Packer.toBuffer(doc);

	return {
		buffer: Buffer.from(buffer),
		mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		filename: `${baseFilename}.docx`
	};
}

/**
 * Convert marked tokens to DOCX paragraph elements
 */
function tokensToDocxElements(tokens: Tokens): Paragraph[] {
	const elements: Paragraph[] = [];

	for (const token of tokens) {
		const converted = tokenToDocx(token);
		if (Array.isArray(converted)) {
			elements.push(...converted);
		} else if (converted) {
			elements.push(converted);
		}
	}

	return elements;
}

/**
 * Convert a single token to DOCX element(s)
 */
function tokenToDocx(token: Token): Paragraph | Paragraph[] | Table | null {
	switch (token.type) {
		case 'heading':
			return createHeadingParagraph(token.text, token.depth);

		case 'paragraph':
			return createParagraph(token.tokens || [], token.text);

		case 'code':
			return createCodeBlock(token.text, token.lang);

		case 'list':
			return createList(token.items, token.ordered);

		case 'table':
			return createTable(token.header, token.rows);

		case 'blockquote':
			return createBlockquote(token.tokens || []);

		case 'hr':
			return createHorizontalRule();

		case 'space':
			return new Paragraph({ children: [] });

		default:
			// For unhandled types, try to extract text
			if ('text' in token && typeof token.text === 'string') {
				return new Paragraph({
					children: [new TextRun(token.text)]
				});
			}
			return null;
	}
}

/**
 * Create a heading paragraph
 */
function createHeadingParagraph(text: string, depth: number): Paragraph {
	const headingLevelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
		1: HeadingLevel.HEADING_1,
		2: HeadingLevel.HEADING_2,
		3: HeadingLevel.HEADING_3,
		4: HeadingLevel.HEADING_4,
		5: HeadingLevel.HEADING_5,
		6: HeadingLevel.HEADING_6
	};

	return new Paragraph({
		heading: headingLevelMap[depth] || HeadingLevel.HEADING_1,
		children: [
			new TextRun({
				text,
				bold: true
			})
		],
		spacing: { before: 240, after: 120 }
	});
}

/**
 * Create a paragraph with inline formatting
 */
function createParagraph(inlineTokens: Token[], fallbackText: string): Paragraph {
	const children: TextRun[] = [];

	if (inlineTokens.length > 0) {
		for (const inline of inlineTokens) {
			children.push(...inlineTokenToTextRuns(inline));
		}
	} else {
		children.push(new TextRun(fallbackText));
	}

	return new Paragraph({
		children,
		spacing: { after: 120 }
	});
}

/**
 * Convert inline tokens to TextRun elements
 */
function inlineTokenToTextRuns(token: Token): TextRun[] {
	switch (token.type) {
		case 'text':
			return [new TextRun(token.text)];

		case 'strong':
			return [
				new TextRun({
					text: token.text,
					bold: true
				})
			];

		case 'em':
			return [
				new TextRun({
					text: token.text,
					italics: true
				})
			];

		case 'codespan':
			return [
				new TextRun({
					text: token.text,
					font: 'Courier New',
					size: 20, // 10pt
					shading: {
						type: ShadingType.SOLID,
						color: 'E8E8E8'
					}
				})
			];

		case 'link':
			return [
				new TextRun({
					text: token.text,
					color: '0066CC',
					underline: {}
				})
			];

		case 'br':
			return [new TextRun({ break: 1 })];

		default:
			if ('text' in token && typeof token.text === 'string') {
				return [new TextRun(token.text)];
			}
			if ('raw' in token && typeof token.raw === 'string') {
				return [new TextRun(token.raw)];
			}
			return [];
	}
}

/**
 * Create a code block with styling
 */
function createCodeBlock(code: string, _lang?: string): Paragraph[] {
	const lines = code.split('\n');

	return lines.map(
		(line) =>
			new Paragraph({
				children: [
					new TextRun({
						text: line || ' ', // Use space for empty lines to preserve them
						font: 'Courier New',
						size: 20 // 10pt
					})
				],
				shading: {
					type: ShadingType.SOLID,
					color: 'F5F5F5'
				},
				spacing: { before: 0, after: 0 },
				indent: { left: 360 } // 0.25 inch indent
			})
	);
}

/**
 * Create a list (ordered or unordered)
 */
function createList(
	items: Array<{ text: string; tokens?: Token[] }>,
	ordered: boolean
): Paragraph[] {
	return items.map((item, index) => {
		const bullet = ordered ? `${index + 1}. ` : '\u2022 '; // bullet point

		const children: TextRun[] = [new TextRun(bullet)];

		if (item.tokens && item.tokens.length > 0) {
			for (const t of item.tokens) {
				if (t.type === 'text' || t.type === 'paragraph') {
					children.push(...inlineTokenToTextRuns(t));
				}
			}
		} else {
			children.push(new TextRun(item.text));
		}

		return new Paragraph({
			children,
			indent: { left: 720 }, // 0.5 inch indent
			spacing: { after: 60 }
		});
	});
}

/**
 * Create a table
 */
function createTable(
	header: Array<{ text: string }>,
	rows: Array<Array<{ text: string }>>
): Table {
	const tableRows: TableRow[] = [];

	// Header row
	tableRows.push(
		new TableRow({
			children: header.map(
				(cell) =>
					new TableCell({
						children: [
							new Paragraph({
								children: [
									new TextRun({
										text: cell.text,
										bold: true
									})
								]
							})
						],
						shading: {
							type: ShadingType.SOLID,
							color: 'E8E8E8'
						}
					})
			)
		})
	);

	// Data rows
	for (const row of rows) {
		tableRows.push(
			new TableRow({
				children: row.map(
					(cell) =>
						new TableCell({
							children: [
								new Paragraph({
									children: [new TextRun(cell.text)]
								})
							]
						})
				)
			})
		);
	}

	return new Table({
		rows: tableRows,
		width: {
			size: 100,
			type: WidthType.PERCENTAGE
		}
	});
}

/**
 * Create a blockquote
 */
function createBlockquote(tokens: Token[]): Paragraph[] {
	const paragraphs: Paragraph[] = [];

	for (const token of tokens) {
		if (token.type === 'paragraph') {
			paragraphs.push(
				new Paragraph({
					children: [
						new TextRun({
							text: token.text,
							italics: true,
							color: '666666'
						})
					],
					indent: { left: 720 },
					border: {
						left: {
							style: BorderStyle.SINGLE,
							size: 12,
							color: 'CCCCCC'
						}
					},
					spacing: { after: 120 }
				})
			);
		}
	}

	return paragraphs;
}

/**
 * Create a horizontal rule
 */
function createHorizontalRule(): Paragraph {
	return new Paragraph({
		border: {
			bottom: {
				style: BorderStyle.SINGLE,
				size: 6,
				color: 'CCCCCC'
			}
		},
		spacing: { before: 240, after: 240 }
	});
}

/**
 * Export as PDF with rich formatting
 */
async function exportAsPdf(
	content: string,
	baseFilename: string,
	title: string
): Promise<ExportResult> {
	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({
				size: 'A4',
				margin: 72, // 1 inch margins
				info: {
					Title: title,
					Creator: 'StratHost Chat'
				}
			});

			const chunks: Buffer[] = [];
			doc.on('data', (chunk: Buffer) => chunks.push(chunk));
			doc.on('end', () => {
				const buffer = Buffer.concat(chunks);
				resolve({
					buffer,
					mimeType: 'application/pdf',
					filename: `${baseFilename}.pdf`
				});
			});
			doc.on('error', reject);

			const tokens = marked.lexer(content);
			renderTokensToPdf(doc, tokens);

			doc.end();
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Render markdown tokens to PDF
 */
function renderTokensToPdf(doc: PDFKit.PDFDocument, tokens: Tokens): void {
	const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

	for (const token of tokens) {
		renderTokenToPdf(doc, token, pageWidth);
	}
}

/**
 * Render a single token to PDF
 */
function renderTokenToPdf(doc: PDFKit.PDFDocument, token: Token, pageWidth: number): void {
	switch (token.type) {
		case 'heading':
			renderHeading(doc, token.text, token.depth);
			break;

		case 'paragraph':
			renderParagraph(doc, token.text);
			break;

		case 'code':
			renderCodeBlock(doc, token.text, pageWidth);
			break;

		case 'list':
			renderList(doc, token.items, token.ordered);
			break;

		case 'table':
			renderTable(doc, token.header, token.rows, pageWidth);
			break;

		case 'blockquote':
			renderBlockquote(doc, token.tokens || []);
			break;

		case 'hr':
			renderHorizontalRule(doc, pageWidth);
			break;

		case 'space':
			doc.moveDown(0.5);
			break;

		default:
			// For unhandled types, try to extract and render text
			if ('text' in token && typeof token.text === 'string') {
				doc.font('Helvetica').fontSize(11).text(token.text);
				doc.moveDown(0.5);
			}
	}
}

/**
 * Render a heading to PDF
 */
function renderHeading(doc: PDFKit.PDFDocument, text: string, depth: number): void {
	const sizeMap: Record<number, number> = {
		1: 24,
		2: 20,
		3: 16,
		4: 14,
		5: 12,
		6: 11
	};

	doc.moveDown(0.5);
	doc.font('Helvetica-Bold').fontSize(sizeMap[depth] || 16).text(text);
	doc.moveDown(0.3);
}

/**
 * Render a paragraph to PDF
 */
function renderParagraph(doc: PDFKit.PDFDocument, text: string): void {
	// Simple text rendering - strip markdown formatting for clean output
	const cleanText = text
		.replace(/\*\*(.+?)\*\*/g, '$1') // bold
		.replace(/\*(.+?)\*/g, '$1') // italic
		.replace(/`(.+?)`/g, '$1') // inline code
		.replace(/\[(.+?)\]\(.+?\)/g, '$1'); // links

	doc.font('Helvetica').fontSize(11).text(cleanText, {
		align: 'left',
		lineGap: 3
	});
	doc.moveDown(0.5);
}

/**
 * Render a code block to PDF
 */
function renderCodeBlock(doc: PDFKit.PDFDocument, code: string, pageWidth: number): void {
	const x = doc.x;
	const y = doc.y;
	const padding = 10;

	// Calculate height needed
	doc.font('Courier').fontSize(10);
	const textHeight = doc.heightOfString(code, { width: pageWidth - padding * 2 });

	// Draw background
	doc.rect(x, y, pageWidth, textHeight + padding * 2).fill('#F5F5F5');

	// Draw code text
	doc.fillColor('black').text(code, x + padding, y + padding, {
		width: pageWidth - padding * 2
	});

	doc.moveDown(0.5);
}

/**
 * Render a list to PDF
 */
function renderList(
	doc: PDFKit.PDFDocument,
	items: Array<{ text: string }>,
	ordered: boolean
): void {
	items.forEach((item, index) => {
		const bullet = ordered ? `${index + 1}. ` : '\u2022 ';
		doc.font('Helvetica').fontSize(11).text(bullet + item.text, {
			indent: 20
		});
	});
	doc.moveDown(0.5);
}

/**
 * Render a table to PDF
 */
function renderTable(
	doc: PDFKit.PDFDocument,
	header: Array<{ text: string }>,
	rows: Array<Array<{ text: string }>>,
	pageWidth: number
): void {
	const colWidth = pageWidth / header.length;
	const startX = doc.x;
	let y = doc.y;

	// Header row
	doc.font('Helvetica-Bold').fontSize(10);
	header.forEach((cell, i) => {
		doc.rect(startX + i * colWidth, y, colWidth, 20).fillAndStroke('#E8E8E8', '#CCCCCC');
		doc.fillColor('black').text(cell.text, startX + i * colWidth + 5, y + 5, {
			width: colWidth - 10
		});
	});
	y += 20;

	// Data rows
	doc.font('Helvetica').fontSize(10);
	for (const row of rows) {
		row.forEach((cell, i) => {
			doc.rect(startX + i * colWidth, y, colWidth, 20).stroke('#CCCCCC');
			doc.text(cell.text, startX + i * colWidth + 5, y + 5, {
				width: colWidth - 10
			});
		});
		y += 20;
	}

	doc.y = y;
	doc.moveDown(0.5);
}

/**
 * Render a blockquote to PDF
 */
function renderBlockquote(doc: PDFKit.PDFDocument, tokens: Token[]): void {
	const x = doc.x;

	// Draw left border
	doc.moveTo(x, doc.y).lineTo(x, doc.y + 20).lineWidth(3).stroke('#CCCCCC');

	for (const token of tokens) {
		if (token.type === 'paragraph') {
			doc.font('Helvetica-Oblique').fontSize(11).fillColor('#666666').text(token.text, x + 15);
		}
	}

	doc.fillColor('black');
	doc.moveDown(0.5);
}

/**
 * Render a horizontal rule to PDF
 */
function renderHorizontalRule(doc: PDFKit.PDFDocument, pageWidth: number): void {
	doc.moveDown(0.5);
	const y = doc.y;
	doc.moveTo(doc.x, y).lineTo(doc.x + pageWidth, y).lineWidth(1).stroke('#CCCCCC');
	doc.moveDown(0.5);
}
