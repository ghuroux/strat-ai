/**
 * Page Import API
 *
 * POST /api/pages/import
 * Imports a .md or .docx file as a new draft Page.
 *
 * Accepts multipart/form-data:
 * - file: The file to import (.md or .docx)
 * - areaId: Area to create the page in (required)
 * - title: Page title (required)
 *
 * Pipeline:
 *   .md   → read as UTF-8 → markdownToTipTap() → TipTap JSON
 *   .docx → mammoth.convertToHtml() → htmlToTipTap() → TipTap JSON
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import mammoth from 'mammoth';
import { markdownToTipTap, htmlToTipTap, textToTipTap } from '$lib/server/markdown-to-tiptap';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import { postgresAuditRepository } from '$lib/server/persistence/audit-postgres';
import type { CreatePageInput, TipTapContent } from '$lib/types/page';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.md', '.docx'];

function getExtension(filename: string): string {
	return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const formData = await request.formData();
		const file = formData.get('file');
		const areaId = formData.get('areaId') as string | null;
		const title = formData.get('title') as string | null;

		// Validate required fields
		if (!file || !(file instanceof File)) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		if (!areaId) {
			return json({ error: 'Missing required field: areaId' }, { status: 400 });
		}

		if (!title || !title.trim()) {
			return json({ error: 'Missing required field: title' }, { status: 400 });
		}

		// Validate file extension
		const ext = getExtension(file.name);
		if (!ALLOWED_EXTENSIONS.includes(ext)) {
			return json(
				{ error: `Unsupported file type: ${ext}. Only .md and .docx files are supported.` },
				{ status: 400 }
			);
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			return json(
				{ error: `File too large. Maximum size is 10MB.` },
				{ status: 400 }
			);
		}

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Convert to TipTap JSON based on file type
		let content: TipTapContent;

		if (ext === '.md') {
			const text = buffer.toString('utf-8');
			try {
				content = markdownToTipTap(text);
			} catch {
				content = textToTipTap(text);
			}
		} else {
			// .docx — convert to HTML first, then to TipTap
			try {
				const result = await mammoth.convertToHtml({ buffer });
				content = htmlToTipTap(result.value);
			} catch {
				// Fall back to raw text extraction
				const textResult = await mammoth.extractRawText({ buffer });
				content = textToTipTap(textResult.value);
			}
		}

		// Create the page
		const input: CreatePageInput = {
			areaId,
			title: title.trim(),
			content,
			pageType: 'general',
			visibility: 'private'
		};

		const page = await postgresPageRepository.create(input, userId);

		// Log audit event
		postgresAuditRepository.logEvent(
			userId, 'page_created', 'page', page.id, 'create',
			{
				page_type: 'general',
				visibility: 'private',
				area_id: areaId,
				import_source: file.name,
				import_type: ext
			},
			locals.session.organizationId
		);

		return json({ page });
	} catch (error) {
		console.error('Failed to import page:', error);
		return json(
			{
				error: 'Failed to import file',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
