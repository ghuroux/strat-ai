/**
 * Centralized file type configuration
 *
 * Used by:
 * - Backend: file-parser.ts for validation
 * - Frontend: All file upload components for accept attributes
 */

// Document types (text extraction)
export const DOCUMENT_EXTENSIONS = [
	'.pdf',
	'.docx',
	'.txt',
	'.md',
	'.csv',
	'.json',
	'.sql',
	'.html',
	'.xml',
	'.yml',
	'.yaml'
] as const;

// Image types (Claude vision API)
export const IMAGE_EXTENSIONS = [
	'.jpg',
	'.jpeg',
	'.png',
	'.gif',
	'.webp'
] as const;

// MIME types for images
export const IMAGE_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp'
] as const;

// For HTML accept attribute - documents only
export const ACCEPT_DOCUMENTS = DOCUMENT_EXTENSIONS.join(',');

// For HTML accept attribute - images only (with MIME types for better browser support)
export const ACCEPT_IMAGES = [...IMAGE_EXTENSIONS, ...IMAGE_MIME_TYPES].join(',');

// For HTML accept attribute - all files
export const ACCEPT_ALL = `${ACCEPT_DOCUMENTS},${ACCEPT_IMAGES}`;

// Human-readable list for error messages and tooltips
export const DOCUMENT_TYPES_DISPLAY = 'PDF, Word, TXT, Markdown, CSV, JSON, SQL, HTML, XML, YAML';
export const IMAGE_TYPES_DISPLAY = 'JPG, PNG, GIF, WebP';
export const ALL_TYPES_DISPLAY = `${DOCUMENT_TYPES_DISPLAY}, and images`;

/**
 * Check if a filename has a supported document extension
 */
export function isDocumentExtension(filename: string): boolean {
	const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
	return (DOCUMENT_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Check if a filename has a supported image extension
 */
export function isImageExtension(filename: string): boolean {
	const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
	return (IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Check if a filename has any supported extension
 */
export function isSupportedExtension(filename: string): boolean {
	return isDocumentExtension(filename) || isImageExtension(filename);
}
