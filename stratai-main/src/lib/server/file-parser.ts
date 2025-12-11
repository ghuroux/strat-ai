/**
 * File Parser Service
 * Parses uploaded documents and extracts text content
 */

import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParsedFile {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
	content: string;
	pageCount?: number;
	truncated: boolean;
	charCount: number;
}

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

// Configuration
const MAX_CONTENT_LENGTH = 100000; // ~25k tokens
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES: Record<string, string[]> = {
	'application/pdf': ['.pdf'],
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
	'text/plain': ['.txt'],
	'text/markdown': ['.md'],
	'text/csv': ['.csv'],
	'application/json': ['.json'],
	// Some browsers report these MIME types
	'application/x-pdf': ['.pdf'],
	'text/x-markdown': ['.md']
};

/**
 * Generate a unique ID for the file
 */
function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
	// Remove path separators and null bytes
	return filename
		.replace(/[/\\]/g, '_')
		.replace(/\0/g, '')
		.trim();
}

/**
 * Get file extension from filename
 */
function getExtension(filename: string): string {
	const lastDot = filename.lastIndexOf('.');
	return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
}

/**
 * Check if MIME type is allowed
 */
function isAllowedType(mimeType: string, filename: string): boolean {
	const extension = getExtension(filename);

	// Check if MIME type is in allowed list
	if (ALLOWED_TYPES[mimeType]) {
		return true;
	}

	// Fallback: check by extension for common text types
	const textExtensions = ['.txt', '.md', '.csv', '.json'];
	if (textExtensions.includes(extension)) {
		return true;
	}

	// Check PDF by extension
	if (extension === '.pdf') {
		return true;
	}

	// Check DOCX by extension
	if (extension === '.docx') {
		return true;
	}

	return false;
}

/**
 * Validate a file before parsing
 */
export function validateFile(
	filename: string,
	mimeType: string,
	size: number
): ValidationResult {
	// Check file size
	if (size > MAX_FILE_SIZE) {
		const maxMB = MAX_FILE_SIZE / (1024 * 1024);
		return {
			valid: false,
			error: `File exceeds ${maxMB}MB limit`
		};
	}

	// Check file type
	if (!isAllowedType(mimeType, filename)) {
		return {
			valid: false,
			error: 'Unsupported file type. Allowed: PDF, DOCX, TXT, MD, CSV, JSON'
		};
	}

	return { valid: true };
}

/**
 * Parse PDF file and extract text
 */
async function parsePDF(buffer: Buffer): Promise<{ content: string; pageCount: number }> {
	let parser: PDFParse | undefined;
	try {
		// pdf-parse v2.x uses a class-based API
		parser = new PDFParse({ data: buffer });
		const textResult = await parser.getText();
		const infoResult = await parser.getInfo();

		return {
			content: textResult.text,
			pageCount: infoResult.numPages
		};
	} catch (error) {
		console.error('PDF parsing error:', error);
		throw new Error('Failed to parse PDF file');
	} finally {
		// Clean up resources
		if (parser) {
			await parser.destroy();
		}
	}
}

/**
 * Parse DOCX file and extract text
 */
async function parseDOCX(buffer: Buffer): Promise<{ content: string }> {
	try {
		const result = await mammoth.extractRawText({ buffer });
		return {
			content: result.value
		};
	} catch (error) {
		console.error('DOCX parsing error:', error);
		throw new Error('Failed to parse DOCX file');
	}
}

/**
 * Parse text-based files (TXT, MD, CSV, JSON)
 */
function parseText(buffer: Buffer): { content: string } {
	try {
		const content = buffer.toString('utf-8');
		return { content };
	} catch (error) {
		console.error('Text parsing error:', error);
		throw new Error('Failed to read text file');
	}
}

/**
 * Truncate content if it exceeds max length
 */
function truncateContent(content: string): { content: string; truncated: boolean } {
	if (content.length <= MAX_CONTENT_LENGTH) {
		return { content, truncated: false };
	}

	// Truncate at a word boundary if possible
	let truncated = content.slice(0, MAX_CONTENT_LENGTH);
	const lastSpace = truncated.lastIndexOf(' ');
	if (lastSpace > MAX_CONTENT_LENGTH - 100) {
		truncated = truncated.slice(0, lastSpace);
	}

	truncated += '\n\n[Content truncated due to length...]';

	return { content: truncated, truncated: true };
}

/**
 * Main function to parse a file
 */
export async function parseFile(
	buffer: Buffer,
	filename: string,
	mimeType: string
): Promise<ParsedFile> {
	const sanitizedFilename = sanitizeFilename(filename);
	const extension = getExtension(sanitizedFilename);

	let rawContent: string;
	let pageCount: number | undefined;

	// Parse based on file type
	if (extension === '.pdf' || mimeType === 'application/pdf' || mimeType === 'application/x-pdf') {
		const result = await parsePDF(buffer);
		rawContent = result.content;
		pageCount = result.pageCount;
	} else if (
		extension === '.docx' ||
		mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	) {
		const result = await parseDOCX(buffer);
		rawContent = result.content;
	} else {
		// Treat as text file
		const result = parseText(buffer);
		rawContent = result.content;
	}

	// Clean up content
	rawContent = rawContent
		.replace(/\r\n/g, '\n') // Normalize line endings
		.replace(/\t/g, '  ') // Replace tabs with spaces
		.replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
		.trim();

	// Truncate if necessary
	const { content, truncated } = truncateContent(rawContent);

	return {
		id: generateId(),
		filename: sanitizedFilename,
		mimeType,
		size: buffer.length,
		content,
		pageCount,
		truncated,
		charCount: content.length
	};
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	} else if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	} else {
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
}
