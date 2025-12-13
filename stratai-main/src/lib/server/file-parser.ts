/**
 * File Parser Service
 * Parses uploaded documents and extracts text content
 * Also handles image files for Claude vision API
 */

import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import type { AttachmentContent } from '$lib/types/chat';

// Content types for parsed files
export type ParsedTextContent = {
	type: 'text';
	data: string;
};

export type ParsedImageContent = {
	type: 'image';
	mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
	data: string; // base64 encoded
};

export type ParsedContent = ParsedTextContent | ParsedImageContent;

export interface ParsedFile {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
	content: ParsedContent;
	pageCount?: number;
	truncated: boolean;
	charCount: number;
}

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

// Configuration
const MAX_CONTENT_LENGTH = 100000; // ~25k tokens for text
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for documents
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images (Claude API limit)

// Document types
const DOCUMENT_TYPES: Record<string, string[]> = {
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

// Image types supported by Claude vision API
const IMAGE_TYPES: Record<string, string[]> = {
	'image/jpeg': ['.jpg', '.jpeg'],
	'image/png': ['.png'],
	'image/gif': ['.gif'],
	'image/webp': ['.webp']
};

// Combined allowed types
const ALLOWED_TYPES: Record<string, string[]> = {
	...DOCUMENT_TYPES,
	...IMAGE_TYPES
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

	// Check images by extension
	const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
	if (imageExtensions.includes(extension)) {
		return true;
	}

	return false;
}

/**
 * Check if file is an image type
 */
export function isImageFile(mimeType: string, filename: string): boolean {
	const extension = getExtension(filename);

	// Check by MIME type
	if (IMAGE_TYPES[mimeType]) {
		return true;
	}

	// Check by extension
	const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
	return imageExtensions.includes(extension);
}

/**
 * Get the normalized image media type
 */
function getImageMediaType(mimeType: string, filename: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
	const extension = getExtension(filename);

	// Normalize MIME type
	if (mimeType === 'image/jpeg' || extension === '.jpg' || extension === '.jpeg') {
		return 'image/jpeg';
	}
	if (mimeType === 'image/png' || extension === '.png') {
		return 'image/png';
	}
	if (mimeType === 'image/gif' || extension === '.gif') {
		return 'image/gif';
	}
	if (mimeType === 'image/webp' || extension === '.webp') {
		return 'image/webp';
	}

	// Default to jpeg if uncertain
	return 'image/jpeg';
}

/**
 * Validate a file before parsing
 */
export function validateFile(
	filename: string,
	mimeType: string,
	size: number
): ValidationResult {
	// Check file type first
	if (!isAllowedType(mimeType, filename)) {
		return {
			valid: false,
			error: 'Unsupported file type. Allowed: PDF, DOCX, TXT, MD, CSV, JSON, JPG, PNG, GIF, WebP'
		};
	}

	// Check file size based on type
	const isImage = isImageFile(mimeType, filename);
	const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

	if (size > maxSize) {
		const maxMB = maxSize / (1024 * 1024);
		return {
			valid: false,
			error: `${isImage ? 'Image' : 'File'} exceeds ${maxMB}MB limit`
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
			pageCount: infoResult.total
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
 * Parse image file to base64
 */
function parseImage(
	buffer: Buffer,
	mimeType: string,
	filename: string
): { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' } {
	try {
		const base64 = buffer.toString('base64');
		const mediaType = getImageMediaType(mimeType, filename);
		return { base64, mediaType };
	} catch (error) {
		console.error('Image parsing error:', error);
		throw new Error('Failed to process image file');
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

	// Handle image files
	if (isImageFile(mimeType, sanitizedFilename)) {
		const { base64, mediaType } = parseImage(buffer, mimeType, sanitizedFilename);
		return {
			id: generateId(),
			filename: sanitizedFilename,
			mimeType,
			size: buffer.length,
			content: {
				type: 'image',
				mediaType,
				data: base64
			},
			truncated: false,
			charCount: base64.length
		};
	}

	// Handle document files (text extraction)
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
		content: {
			type: 'text',
			data: content
		},
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
