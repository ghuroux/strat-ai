import { env } from '$env/dynamic/private';

export interface SearchResult {
	title: string;
	url: string;
	description: string;
	age?: string;
}

interface BraveWebResult {
	title: string;
	url: string;
	description: string;
	age?: string;
}

interface BraveSearchResponse {
	web?: {
		results: BraveWebResult[];
	};
	query?: {
		original: string;
	};
}

/**
 * Search the web using Brave Search API
 * @param query - The search query
 * @param count - Number of results to return (default 5)
 * @returns Array of search results
 */
export async function searchWeb(query: string, count: number = 5): Promise<SearchResult[]> {
	const apiKey = env.BRAVE_SEARCH_API_KEY;

	if (!apiKey) {
		throw new Error('BRAVE_SEARCH_API_KEY is not configured');
	}

	const url = new URL('https://api.search.brave.com/res/v1/web/search');
	url.searchParams.set('q', query);
	url.searchParams.set('count', String(count));
	url.searchParams.set('safesearch', 'moderate');

	const response = await fetch(url.toString(), {
		method: 'GET',
		headers: {
			'Accept': 'application/json',
			'Accept-Encoding': 'gzip',
			'X-Subscription-Token': apiKey
		}
	});

	if (!response.ok) {
		const errorText = await response.text();

		if (response.status === 429) {
			throw new Error('Brave Search rate limit exceeded');
		}
		if (response.status === 401) {
			throw new Error('Invalid Brave Search API key');
		}

		throw new Error(`Brave Search error: ${response.status} ${errorText}`);
	}

	const data: BraveSearchResponse = await response.json();

	if (!data.web?.results) {
		return [];
	}

	return data.web.results.map((result) => ({
		title: result.title,
		url: result.url,
		description: result.description,
		age: result.age
	}));
}

/**
 * Format search results for LLM context
 * @param results - Array of search results
 * @returns Formatted string for LLM context
 */
export function formatSearchResultsForLLM(results: SearchResult[]): string {
	if (results.length === 0) {
		return 'No search results found.';
	}

	const formattedResults = results.map((result, index) => {
		let entry = `[${index + 1}] ${result.title}\n`;
		entry += `    URL: ${result.url}\n`;
		entry += `    ${result.description}`;
		if (result.age) {
			entry += ` (${result.age})`;
		}
		return entry;
	}).join('\n\n');

	return `Web search results:\n\n${formattedResults}`;
}

/**
 * Check if Brave Search is configured
 */
export function isBraveSearchConfigured(): boolean {
	return !!env.BRAVE_SEARCH_API_KEY;
}
