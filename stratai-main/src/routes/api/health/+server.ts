/**
 * Health Check Endpoint
 *
 * GET /api/health - Returns service health status
 *
 * Used by:
 * - Docker HEALTHCHECK
 * - AWS ALB/ELB health checks
 * - Kubernetes liveness/readiness probes
 * - Monitoring systems
 *
 * Response:
 * - 200: Service is healthy
 * - 503: Service is unhealthy (database unreachable, etc.)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/persistence';

export const GET: RequestHandler = async ({ url }) => {
	const includeDb = url.searchParams.get('db') === 'true';

	const health: {
		status: 'healthy' | 'unhealthy';
		timestamp: string;
		version: string;
		database?: {
			status: 'connected' | 'disconnected';
			latencyMs?: number;
		};
	} = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		version: process.env.npm_package_version || '0.1.0'
	};

	// Optional: Check database connectivity
	if (includeDb) {
		try {
			const start = Date.now();
			await sql`SELECT 1`;
			const latencyMs = Date.now() - start;

			health.database = {
				status: 'connected',
				latencyMs
			};
		} catch {
			health.status = 'unhealthy';
			health.database = {
				status: 'disconnected'
			};
			return json(health, { status: 503 });
		}
	}

	return json(health);
};
