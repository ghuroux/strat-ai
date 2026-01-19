/**
 * File Upload API Endpoint
 * Handles document uploads, parses content, and returns extracted text
 */

import type { RequestHandler } from './$types';
import { parseFile, validateFile } from '$lib/server/file-parser';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify session
	if (!locals.session) {
		return new Response(
			JSON.stringify({ error: { message: 'Unauthorized', type: 'auth_error' } }),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	try {
		// Parse FormData
		const formData = await request.formData();
		const file = formData.get('file');

		// Validate file exists
		if (!file || !(file instanceof File)) {
			return new Response(
				JSON.stringify({
					error: { message: 'No file provided', type: 'validation_error' }
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Validate file type and size
		const validation = validateFile(file.name, file.type, file.size);
		if (!validation.valid) {
			return new Response(
				JSON.stringify({
					error: { message: validation.error, type: 'validation_error' }
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Convert File to Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Parse the file
		const parsedFile = await parseFile(buffer, file.name, file.type);

		// Debug: Detailed upload logging
		console.log('[Upload Success]', {
			filename: parsedFile.filename,
			size: parsedFile.size,
			mimeType: parsedFile.mimeType,
			charCount: parsedFile.charCount,
			truncated: parsedFile.truncated,
			contentType: parsedFile.content.type,
			hasContent: parsedFile.content.type === 'text'
				? parsedFile.content.data.length > 0
				: !!parsedFile.content.data,
			contentPreview: parsedFile.content.type === 'text'
				? parsedFile.content.data.substring(0, 200) + (parsedFile.content.data.length > 200 ? '...' : '')
				: '[image data]'
		});

		// Return parsed content
		return new Response(JSON.stringify(parsedFile), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Upload endpoint error:', err);

		const message = err instanceof Error ? err.message : 'Failed to process file';

		return new Response(
			JSON.stringify({
				error: { message, type: 'parse_error' }
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
