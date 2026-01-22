/**
 * Diagram Library Proxy Endpoint
 *
 * Proxies requests to libraries.excalidraw.com to avoid CORS issues.
 * The [source] param is the library path (e.g., "dofbi/aws-architecture-icons.excalidrawlib")
 *
 * GET /api/diagrams/library/dofbi/aws-architecture-icons.excalidrawlib
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const LIBRARY_BASE_URL = 'https://libraries.excalidraw.com/libraries';

// Simple in-memory cache for library data (persists during server runtime)
const libraryCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export const GET: RequestHandler = async ({ params }) => {
	const source = params.source;

	if (!source) {
		throw error(400, 'Library source path is required');
	}

	// Validate source path (prevent directory traversal)
	if (source.includes('..') || source.startsWith('/')) {
		throw error(400, 'Invalid library source path');
	}

	// Check cache first
	const cached = libraryCache.get(source);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return json(cached.data, {
			headers: {
				'Cache-Control': 'public, max-age=3600'
			}
		});
	}

	try {
		const url = `${LIBRARY_BASE_URL}/${source}`;
		console.log(`[DiagramLibrary] Fetching: ${url}`);

		const response = await fetch(url, {
			headers: {
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			console.error(`[DiagramLibrary] Failed to fetch ${source}: ${response.status}`);
			throw error(response.status, `Failed to fetch library: ${response.statusText}`);
		}

		const data = await response.json();

		// Cache the response
		libraryCache.set(source, { data, timestamp: Date.now() });

		return json(data, {
			headers: {
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (err) {
		console.error(`[DiagramLibrary] Error fetching ${source}:`, err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, 'Failed to fetch library');
	}
};
