/**
 * Integration System Types
 *
 * Types for the integration infrastructure supporting OAuth connections
 * to external services (Calendar, GitHub, Linear, etc.)
 *
 * See: docs/features/INTEGRATIONS_ARCHITECTURE.md
 */

// ============================================================================
// Service Types
// ============================================================================

/**
 * Supported integration service types
 * Must match integrations.service_type CHECK constraint
 */
export type ServiceType = 'calendar' | 'github' | 'linear' | 'jira' | 'slack';

/**
 * Integration tier classification
 * - foundational: First-party UX, essential integrations (Calendar, Email)
 * - contextual: Add-on UX, specialized integrations (GitHub, Jira)
 */
export type IntegrationTier = 'foundational' | 'contextual';

/**
 * Integration connection status
 * Must match integrations.status CHECK constraint
 */
export type IntegrationStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'expired';

/**
 * Credential types stored for integrations
 * Must match integration_credentials.credential_type CHECK constraint
 */
export type CredentialType = 'access_token' | 'refresh_token' | 'api_key';

/**
 * Integration log event types
 * Must match integration_logs.event_type CHECK constraint
 */
export type IntegrationEventType = 'connect' | 'disconnect' | 'refresh' | 'tool_call' | 'error' | 'rate_limit';

/**
 * Integration log status
 * Must match integration_logs.status CHECK constraint
 */
export type IntegrationLogStatus = 'success' | 'failure' | 'rate_limited';

// ============================================================================
// Database Entities
// ============================================================================

/**
 * Integration entity - maps to integrations table
 */
export interface Integration {
	id: string;
	userId: string | null;
	spaceId: string | null;
	orgId: string | null;
	serviceType: ServiceType;
	status: IntegrationStatus;
	config: IntegrationConfig;
	lastError: string | null;
	lastErrorAt: Date | null;
	connectedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Provider-specific configuration stored in integrations.config
 */
export interface IntegrationConfig {
	// Calendar-specific
	calendarId?: string;
	calendarName?: string;
	defaultReminder?: number; // minutes before event

	// GitHub-specific
	selectedRepos?: string[];
	defaultBranch?: string;

	// Generic
	[key: string]: unknown;
}

/**
 * Integration credential entity - maps to integration_credentials table
 */
export interface IntegrationCredential {
	id: string;
	integrationId: string;
	credentialType: CredentialType;
	encryptedValue: string;
	encryptionIv: string;
	encryptionTag: string;
	expiresAt: Date | null;
	scope: string | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Decrypted credential for use in API calls
 */
export interface DecryptedCredential {
	type: CredentialType;
	value: string;
	expiresAt: Date | null;
	scope: string | null;
}

/**
 * Area integration entity - maps to area_integrations table
 */
export interface AreaIntegration {
	id: string;
	areaId: string;
	integrationId: string;
	isActive: boolean;
	overrides: AreaIntegrationOverrides;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Area-specific overrides for an integration
 */
export interface AreaIntegrationOverrides {
	// Calendar: use a specific calendar for this area
	calendarId?: string;

	// GitHub: only include certain repos for this area
	repoFilter?: string[];

	// Generic
	[key: string]: unknown;
}

/**
 * Integration log entity - maps to integration_logs table
 */
export interface IntegrationLog {
	id: string;
	integrationId: string | null;
	userId: string | null;
	orgId: string | null;
	eventType: IntegrationEventType;
	serviceType: ServiceType;
	action: string;
	requestSummary: Record<string, unknown> | null;
	responseSummary: Record<string, unknown> | null;
	status: IntegrationLogStatus;
	errorMessage: string | null;
	durationMs: number | null;
	createdAt: Date;
}

/**
 * OAuth state entity - maps to oauth_states table
 */
export interface OAuthState {
	id: string;
	state: string;
	userId: string;
	serviceType: ServiceType;
	redirectUri: string | null;
	context: OAuthStateContext;
	expiresAt: Date;
	createdAt: Date;
}

/**
 * Context stored with OAuth state for callback handling
 */
export interface OAuthStateContext {
	// For space-level integrations
	spaceId?: string;

	// Return URL after OAuth complete
	returnUrl?: string;

	// Generic
	[key: string]: unknown;
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for creating a new integration
 */
export interface CreateIntegrationInput {
	userId?: string;
	spaceId?: string;
	orgId?: string;
	serviceType: ServiceType;
	config?: IntegrationConfig;
}

/**
 * Input for updating an integration
 */
export interface UpdateIntegrationInput {
	status?: IntegrationStatus;
	config?: IntegrationConfig;
	lastError?: string | null;
	lastErrorAt?: Date | null;
	connectedAt?: Date | null;
}

/**
 * Input for creating a credential
 */
export interface CreateCredentialInput {
	integrationId: string;
	credentialType: CredentialType;
	value: string; // Will be encrypted before storage
	expiresAt?: Date | null;
	scope?: string | null;
}

/**
 * Input for creating an integration log
 */
export interface CreateIntegrationLogInput {
	integrationId?: string;
	userId?: string;
	orgId?: string;
	eventType: IntegrationEventType;
	serviceType: ServiceType;
	action: string;
	requestSummary?: Record<string, unknown>;
	responseSummary?: Record<string, unknown>;
	status: IntegrationLogStatus;
	errorMessage?: string;
	durationMs?: number;
}

/**
 * Input for creating OAuth state
 */
export interface CreateOAuthStateInput {
	userId: string;
	serviceType: ServiceType;
	redirectUri?: string;
	context?: OAuthStateContext;
	expiresInMinutes?: number; // Default: 10
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Tool definition for AI integration
 */
export interface IntegrationToolDefinition {
	name: string;
	description: string;
	parameters: {
		type: 'object';
		properties: Record<string, {
			type: string;
			description: string;
			enum?: string[];
		}>;
		required: string[];
	};
}

/**
 * Result from executing an integration tool
 */
export interface IntegrationToolResult {
	success: boolean;
	data?: unknown;
	error?: string;
}

/**
 * Context for tool execution
 */
export interface ToolExecutionContext {
	userId: string;
	orgId?: string;
	areaId?: string;
	conversationId?: string;
}

/**
 * Service metadata for UI display
 */
export interface ServiceMetadata {
	type: ServiceType;
	displayName: string;
	description: string;
	tier: IntegrationTier;
	icon: string; // Lucide icon name
	requiredScopes: string[];
	documentationUrl?: string;
}

/**
 * Integration with status info for UI
 */
export interface IntegrationWithStatus extends Integration {
	displayName: string;
	description: string;
	tier: IntegrationTier;
	icon: string;
	hasValidCredentials: boolean;
	credentialsExpireAt: Date | null;
}

// ============================================================================
// Service Metadata Registry
// ============================================================================

/**
 * Metadata for all supported integration services
 */
export const SERVICE_METADATA: Record<ServiceType, ServiceMetadata> = {
	calendar: {
		type: 'calendar',
		displayName: 'Microsoft Calendar',
		description: 'Access your Outlook calendar to view, create, and manage meetings',
		tier: 'foundational',
		icon: 'Calendar',
		requiredScopes: ['Calendars.ReadWrite', 'User.Read', 'offline_access'],
		documentationUrl: 'https://docs.microsoft.com/en-us/graph/api/resources/calendar'
	},
	github: {
		type: 'github',
		displayName: 'GitHub',
		description: 'Connect to GitHub for code context and ticket management',
		tier: 'contextual',
		icon: 'Github',
		requiredScopes: ['repo', 'read:user'],
		documentationUrl: 'https://docs.github.com/en/rest'
	},
	linear: {
		type: 'linear',
		displayName: 'Linear',
		description: 'Integrate with Linear for issue tracking and project management',
		tier: 'contextual',
		icon: 'SquareKanban',
		requiredScopes: ['read', 'write'],
		documentationUrl: 'https://developers.linear.app/docs'
	},
	jira: {
		type: 'jira',
		displayName: 'Jira',
		description: 'Connect to Jira for issue tracking and agile project management',
		tier: 'contextual',
		icon: 'Trello',
		requiredScopes: ['read:jira-work', 'write:jira-work'],
		documentationUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/'
	},
	slack: {
		type: 'slack',
		displayName: 'Slack',
		description: 'Integrate with Slack for team communication context',
		tier: 'contextual',
		icon: 'MessageSquare',
		requiredScopes: ['channels:read', 'chat:write'],
		documentationUrl: 'https://api.slack.com/docs'
	}
};

/**
 * Get service metadata by type
 */
export function getServiceMetadata(serviceType: ServiceType): ServiceMetadata {
	return SERVICE_METADATA[serviceType];
}

/**
 * Check if a service type is foundational
 */
export function isFoundationalService(serviceType: ServiceType): boolean {
	return SERVICE_METADATA[serviceType].tier === 'foundational';
}
