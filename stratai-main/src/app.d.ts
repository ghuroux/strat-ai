/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		interface Locals {
			session: {
				userId: string;
				organizationId: string;
				firstName: string | null;
				lastName: string | null;
				displayName: string | null;
				email: string | null;
				role: 'owner' | 'admin' | 'member';
				createdAt: number;
			} | null;
		}
		interface Error {
			message: string;
			code?: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
