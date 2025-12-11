import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchModels, mapErrorMessage } from '$lib/server/litellm';

export const GET: RequestHandler = async ({ locals }) => {
	// Verify session
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const models = await fetchModels();
		return json(models);
	} catch (err) {
		console.error('Failed to fetch models:', err);
		return json(
			{
				error: {
					message: mapErrorMessage(err),
					type: 'api_error'
				}
			},
			{ status: 500 }
		);
	}
};
