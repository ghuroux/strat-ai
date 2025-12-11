import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSession, setSessionCookie } from '$lib/server/session';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const password = data.get('password')?.toString() || '';

		// Get admin password from environment
		const adminPassword = env.ADMIN_PASSWORD;

		if (!adminPassword) {
			console.error('ADMIN_PASSWORD not set in environment');
			return fail(500, { error: 'Server configuration error' });
		}

		// Simple password comparison for POC
		// In production, use hashed passwords
		if (password !== adminPassword) {
			return fail(401, { error: 'Invalid password' });
		}

		// Create session and set cookie
		const token = createSession('admin');
		setSessionCookie(cookies, token);

		throw redirect(303, '/');
	}
};
