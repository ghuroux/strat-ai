/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		interface Locals {
			session: {
				userId: string;
				organizationId: string;
				displayName: string | null;
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
