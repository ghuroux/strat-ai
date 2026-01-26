/**
 * Documents API - List and Create
 *
 * GET /api/documents - List user's documents with optional space filter
 * POST /api/documents - Upload and persist a document
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresDocumentRepository } from '$lib/server/persistence/documents-postgres';
import { parseFile, validateFile } from '$lib/server/file-parser';
import { resolveSpaceIdAccessible } from '$lib/server/persistence/spaces-postgres';
import { generateSummaryBackground, generateImageDescriptionBackground } from '$lib/server/summarization';

/**
 * GET /api/documents
 * Query params:
 * - spaceId: Filter by space ID or slug (resolved to proper ID)
 * - shared: If 'true', returns documents shared with user (not owned)
 * - areaId: If provided with spaceId, returns documents available for this Area
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const spaceIdParam = url.searchParams.get('spaceId') ?? undefined;
		const shared = url.searchParams.get('shared') === 'true';
		const areaId = url.searchParams.get('areaId') ?? undefined;

		// Resolve space identifier (slug or ID) to proper ID
		let resolvedSpaceId: string | undefined;
		if (spaceIdParam) {
			const resolved = await resolveSpaceIdAccessible(spaceIdParam, userId);
			if (!resolved) {
				return json({ error: `Space not found: ${spaceIdParam}` }, { status: 404 });
			}
			resolvedSpaceId = resolved;
		}

		let documents;

		if (areaId && resolvedSpaceId) {
			// Get documents available for activation in this Area
			documents = await postgresDocumentRepository.findAvailableForArea(
				userId,
				areaId,
				resolvedSpaceId
			);
		} else if (shared && resolvedSpaceId) {
			// Get documents shared with user's Areas in this Space (not owned)
			documents = await postgresDocumentRepository.findSharedWithUser(
				userId,
				resolvedSpaceId
			);
		} else {
			// Get user's own documents (existing behavior)
			documents = await postgresDocumentRepository.findAll(
				userId,
				resolvedSpaceId
			);
		}

		// Return without full content to reduce payload size
		const summaries = documents.map((doc) => ({
			id: doc.id,
			filename: doc.filename,
			mimeType: doc.mimeType,
			fileSize: doc.fileSize,
			charCount: doc.charCount,
			pageCount: doc.pageCount,
			title: doc.title,
			summary: doc.summary,
			truncated: doc.truncated,
			spaceId: doc.spaceId,
			visibility: doc.visibility,
			contentType: doc.contentType,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt
		}));

		return json({ documents: summaries });
	} catch (error) {
		console.error('Failed to fetch documents:', error);
		return json(
			{
				error: 'Failed to fetch documents',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/documents
 * Upload and persist a document
 * Content-Type: multipart/form-data
 * Fields:
 * - file: The file to upload
 * - spaceId: (optional) Space ID or slug to associate with the document
 * - title: (optional) Custom title for the document
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const formData = await request.formData();
		const file = formData.get('file');
		const spaceIdParam = formData.get('spaceId') as string | null;
		const title = formData.get('title') as string | null;

		if (!file || !(file instanceof File)) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// Resolve space identifier (slug or ID) to proper ID
		let resolvedSpaceId: string | undefined;
		if (spaceIdParam) {
			const resolved = await resolveSpaceIdAccessible(spaceIdParam, userId);
			if (!resolved) {
				return json({ error: `Space not found: ${spaceIdParam}` }, { status: 404 });
			}
			resolvedSpaceId = resolved;
		}

		// Validate file type and size
		const validation = validateFile(file.name, file.type, file.size);
		if (!validation.valid) {
			return json({ error: validation.error }, { status: 400 });
		}

		// Parse file content
		const buffer = Buffer.from(await file.arrayBuffer());
		const parsed = await parseFile(buffer, file.name, file.type);

		// Check for duplicate by content hash (deduplication)
		// Note: We create a simple hash check in the repository

		// Determine content type and prepare document data
		const isImage = parsed.content.type === 'image';

		// Create the document with appropriate content type
		const document = await postgresDocumentRepository.create(
			{
				filename: parsed.filename,
				mimeType: parsed.mimeType,
				fileSize: parsed.size,
				content: parsed.content.data,
				// For images, charCount is 0 (no text to count); for text it's the character count
				charCount: isImage ? 0 : parsed.charCount,
				pageCount: isImage ? undefined : parsed.pageCount,
				truncated: isImage ? false : parsed.truncated,
				spaceId: resolvedSpaceId,
				title: title ?? undefined,
				contentType: isImage ? 'image' : 'text'
			},
			userId
		);

		// Trigger background summarization/description
		// Fire-and-forget: don't await, don't block the response
		if (isImage && parsed.content.data) {
			// For images: generate AI description using vision
			generateImageDescriptionBackground(
				document.id,
				parsed.content.data, // base64 content
				document.mimeType,
				document.filename,
				userId,
				locals.session.organizationId
			).catch((err) => console.error('[ImageDescription] Background generation failed:', err));
		} else if (!isImage && document.charCount > 500 && parsed.content.data) {
			// For text documents: generate summary
			generateSummaryBackground(
				document.id,
				parsed.content.data,
				document.filename,
				userId,
				locals.session.organizationId
			).catch((err) => console.error('[Summarization] Background generation failed:', err));
		}

		return json(
			{
				document: {
					id: document.id,
					filename: document.filename,
					mimeType: document.mimeType,
					fileSize: document.fileSize,
					charCount: document.charCount,
					pageCount: document.pageCount,
					title: document.title,
					truncated: document.truncated,
					spaceId: document.spaceId,
					visibility: document.visibility,
					contentType: document.contentType,
					createdAt: document.createdAt,
					updatedAt: document.updatedAt
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Failed to create document:', error);
		return json(
			{
				error: 'Failed to create document',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
