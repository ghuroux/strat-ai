/**
 * Admin Settings Page Server
 *
 * Loads organization settings including system prompt.
 */

import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/persistence';

interface OrganizationWithPrompt {
	id: string;
	name: string;
	slug: string;
	systemPrompt: string | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.session!.organizationId;

	// Load organization with system_prompt
	const rows = await sql<OrganizationWithPrompt[]>`
		SELECT id, name, slug, system_prompt as "systemPrompt"
		FROM organizations
		WHERE id = ${orgId}
		  AND deleted_at IS NULL
	`;

	const org = rows[0] || null;

	return {
		organization: org ? {
			id: org.id,
			name: org.name,
			slug: org.slug,
			systemPrompt: org.systemPrompt || ''
		} : null
	};
};
