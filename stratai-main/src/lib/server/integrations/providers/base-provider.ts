/**
 * Base Provider Interface
 *
 * Abstract base class that all integration providers must extend.
 * Defines the contract for OAuth, tool execution, and context generation.
 *
 * This is the RECIPE foundation - new integrations implement this interface.
 *
 * See: docs/features/INTEGRATIONS_ARCHITECTURE.md
 */

import type {
	ServiceType,
	IntegrationTier,
	DecryptedCredential,
	IntegrationToolDefinition,
	IntegrationToolResult,
	ToolExecutionContext,
	Integration
} from '$lib/types/integrations';

// ============================================================================
// OAuth Types
// ============================================================================

/**
 * OAuth configuration for a provider
 */
export interface OAuthConfig {
	authorizationUrl: string;
	tokenUrl: string;
	clientId: string;
	clientSecret: string;
	scopes: string[];
	redirectUri: string;
}

/**
 * Result from OAuth token exchange
 */
export interface OAuthTokens {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number; // seconds
	scope?: string;
	tokenType?: string;
}

/**
 * Result from connection validation
 */
export interface ConnectionValidation {
	valid: boolean;
	error?: string;
	userInfo?: {
		id: string;
		email?: string;
		name?: string;
	};
}

// ============================================================================
// Base Provider Interface
// ============================================================================

/**
 * Abstract base class for integration providers
 *
 * To add a new integration:
 * 1. Create a new folder: providers/{service}/
 * 2. Extend this class in provider.ts
 * 3. Implement all abstract methods
 * 4. Add OAuth handlers in oauth.ts
 * 5. Add tool definitions in tools.ts
 */
export abstract class BaseProvider {
	protected integration: Integration;
	protected credentials: DecryptedCredential[];

	constructor(integration: Integration, credentials: DecryptedCredential[]) {
		this.integration = integration;
		this.credentials = credentials;
	}

	// ==========================================================================
	// Identity (must implement)
	// ==========================================================================

	/**
	 * The service type identifier
	 */
	abstract get serviceType(): ServiceType;

	/**
	 * Display name for UI
	 */
	abstract get displayName(): string;

	/**
	 * Integration tier (foundational or contextual)
	 */
	abstract get tier(): IntegrationTier;

	// ==========================================================================
	// Connection Management (must implement)
	// ==========================================================================

	/**
	 * Validate that the connection is working
	 * Should make a lightweight API call to verify tokens are valid
	 */
	abstract validateConnection(): Promise<ConnectionValidation>;

	/**
	 * Refresh OAuth credentials using refresh token
	 * @returns New credentials to store
	 */
	abstract refreshCredentials(): Promise<DecryptedCredential[]>;

	// ==========================================================================
	// AI Tool Integration (must implement)
	// ==========================================================================

	/**
	 * Get tool definitions for the AI to use
	 * These become available in the chat when the integration is connected
	 */
	abstract getToolDefinitions(): IntegrationToolDefinition[];

	/**
	 * Execute a tool call from the AI
	 * @param name - Tool name (e.g., 'calendar_list_events')
	 * @param params - Parameters from the AI
	 * @param ctx - Execution context (user, area, etc.)
	 */
	abstract executeTool(
		name: string,
		params: Record<string, unknown>,
		ctx: ToolExecutionContext
	): Promise<IntegrationToolResult>;

	// ==========================================================================
	// Context Generation (must implement)
	// ==========================================================================

	/**
	 * Get a summary of the integration's context for the AI
	 * This is injected into the system prompt
	 */
	abstract getContextSummary(): Promise<string>;

	// ==========================================================================
	// Helper Methods (available to subclasses)
	// ==========================================================================

	/**
	 * Get the access token for API calls
	 */
	protected getAccessToken(): string | null {
		const accessToken = this.credentials.find(c => c.type === 'access_token');
		return accessToken?.value ?? null;
	}

	/**
	 * Get the refresh token
	 */
	protected getRefreshToken(): string | null {
		const refreshToken = this.credentials.find(c => c.type === 'refresh_token');
		return refreshToken?.value ?? null;
	}

	/**
	 * Check if access token is expired or expiring soon
	 */
	protected isAccessTokenExpired(bufferMinutes: number = 5): boolean {
		const accessToken = this.credentials.find(c => c.type === 'access_token');
		if (!accessToken?.expiresAt) return false;

		const expiresAt = new Date(accessToken.expiresAt);
		const buffer = bufferMinutes * 60 * 1000;
		return expiresAt.getTime() - buffer < Date.now();
	}

	/**
	 * Make an authenticated API request
	 * Automatically adds Authorization header
	 */
	protected async fetchWithAuth(
		url: string,
		options: RequestInit = {}
	): Promise<Response> {
		const accessToken = this.getAccessToken();
		if (!accessToken) {
			throw new Error(`No access token available for ${this.serviceType}`);
		}

		const headers = new Headers(options.headers);
		headers.set('Authorization', `Bearer ${accessToken}`);

		return fetch(url, {
			...options,
			headers
		});
	}

	/**
	 * Make an authenticated JSON API request
	 */
	protected async fetchJsonWithAuth<T>(
		url: string,
		options: RequestInit = {}
	): Promise<T> {
		const headers = new Headers(options.headers);
		headers.set('Content-Type', 'application/json');

		const response = await this.fetchWithAuth(url, {
			...options,
			headers
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API request failed: ${response.status} ${errorText}`);
		}

		return response.json();
	}
}

// ============================================================================
// Provider Factory Types
// ============================================================================

/**
 * Factory function type for creating provider instances
 */
export type ProviderFactory = (
	integration: Integration,
	credentials: DecryptedCredential[]
) => BaseProvider;

/**
 * Registry of provider factories by service type
 */
export type ProviderRegistry = Map<ServiceType, ProviderFactory>;
