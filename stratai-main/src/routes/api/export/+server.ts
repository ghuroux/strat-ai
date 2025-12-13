/**
 * Export API Endpoint
 * POST /api/export
 * Converts markdown content to MD, DOCX, or PDF format
 */

import { json } from '@sveltejs/kit';
import { exportMessage } from '$lib/server/export-service';
import type { RequestHandler } from './$types';

const MAX_CONTENT_LENGTH = 500000; // ~125k tokens worth of content

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Check session authentication
	if (!locals.session) {
		return json(
			{
				error: {
					type: 'auth_error',
					message: 'Not authenticated'
				}
			},
			{ status: 401 }
		);
	}

	// 2. Parse request body
	let content: string;
	let format: string;
	let title: string | undefined;

	try {
		const body = await request.json();
		content = body.content;
		format = body.format;
		title = body.title;
	} catch {
		return json(
			{
				error: {
					type: 'validation_error',
					message: 'Invalid JSON body'
				}
			},
			{ status: 400 }
		);
	}

	// 3. Validate required fields
	if (!content || typeof content !== 'string') {
		return json(
			{
				error: {
					type: 'validation_error',
					message: 'Missing or invalid content'
				}
			},
			{ status: 400 }
		);
	}

	if (!format || typeof format !== 'string') {
		return json(
			{
				error: {
					type: 'validation_error',
					message: 'Missing or invalid format'
				}
			},
			{ status: 400 }
		);
	}

	// 4. Validate format
	if (!['md', 'docx', 'pdf'].includes(format)) {
		return json(
			{
				error: {
					type: 'validation_error',
					message: 'Invalid format. Supported formats: md, docx, pdf'
				}
			},
			{ status: 400 }
		);
	}

	// 5. Validate content length
	if (content.length > MAX_CONTENT_LENGTH) {
		return json(
			{
				error: {
					type: 'validation_error',
					message: `Content too large. Maximum ${MAX_CONTENT_LENGTH} characters allowed`
				}
			},
			{ status: 400 }
		);
	}

	// 6. Generate document
	try {
		const result = await exportMessage({
			content,
			format: format as 'md' | 'docx' | 'pdf',
			title
		});

		// 7. Return file with appropriate headers for download
		return new Response(new Uint8Array(result.buffer), {
			status: 200,
			headers: {
				'Content-Type': result.mimeType,
				'Content-Disposition': `attachment; filename="${result.filename}"`,
				'Content-Length': result.buffer.length.toString(),
				'Cache-Control': 'no-store'
			}
		});
	} catch (err) {
		console.error('Export error:', err);

		return json(
			{
				error: {
					type: 'export_error',
					message: 'Failed to generate document. Please try again.'
				}
			},
			{ status: 500 }
		);
	}
};
