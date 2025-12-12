import type { RequestHandler } from './$types';
import { MODEL_CAPABILITIES, getModelsByProvider } from '$lib/config/model-capabilities';

/**
 * GET /api/models/capabilities
 * Returns the full model capabilities map for frontend use
 */
export const GET: RequestHandler = async ({ locals }) => {
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

	return new Response(
		JSON.stringify({
			capabilities: MODEL_CAPABILITIES,
			byProvider: getModelsByProvider()
		}),
		{
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		}
	);
};
