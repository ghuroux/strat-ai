/**
 * Microsoft Graph Email Client
 *
 * HTTP client for Microsoft Graph Mail API operations.
 * Handles email sending via the /me/sendMail endpoint.
 *
 * See: https://docs.microsoft.com/en-us/graph/api/user-sendmail
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Input for sending an email
 */
export interface SendEmailInput {
	to: string[];       // Recipient email addresses
	cc?: string[];      // CC email addresses
	bcc?: string[];     // BCC email addresses
	subject: string;
	body: string;       // HTML body content
	saveToSentItems?: boolean; // Default: true
}

/**
 * Result from sending an email
 */
export interface SendEmailResult {
	success: boolean;
	recipientCount: number;
	subject: string;
}

// ============================================================================
// Client Class
// ============================================================================

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

/**
 * Microsoft Graph Email API client
 */
export class EmailClient {
	private accessToken: string;

	constructor(accessToken: string) {
		this.accessToken = accessToken;
	}

	/**
	 * Make an authenticated request to Microsoft Graph
	 */
	private async request(
		endpoint: string,
		options: RequestInit = {}
	): Promise<void> {
		const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE_URL}${endpoint}`;

		const headers = new Headers(options.headers);
		headers.set('Authorization', `Bearer ${this.accessToken}`);
		headers.set('Content-Type', 'application/json');

		console.log(`[Email API] ${options.method || 'GET'} ${url}`);

		const response = await fetch(url, {
			...options,
			headers
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage = errorData.error?.message || `Request failed: ${response.status}`;
			console.error('[Email API] Error response:', {
				status: response.status,
				statusText: response.statusText,
				error: errorData
			});
			throw new Error(errorMessage);
		}

		// sendMail returns 202 Accepted with no body
		console.log(`[Email API] Response: ${response.status} OK`);
	}

	// ==========================================================================
	// Email Operations
	// ==========================================================================

	/**
	 * Send an email via Microsoft Graph
	 * POST /me/sendMail returns 202 Accepted (no response body)
	 */
	async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
		const toRecipients = input.to.map(email => ({
			emailAddress: { address: email }
		}));

		const ccRecipients = input.cc?.map(email => ({
			emailAddress: { address: email }
		})) || [];

		const bccRecipients = input.bcc?.map(email => ({
			emailAddress: { address: email }
		})) || [];

		const body = {
			message: {
				subject: input.subject,
				body: {
					contentType: 'HTML',
					content: input.body
				},
				toRecipients,
				ccRecipients,
				bccRecipients
			},
			saveToSentItems: input.saveToSentItems !== false // Default true
		};

		await this.request('/me/sendMail', {
			method: 'POST',
			body: JSON.stringify(body)
		});

		return {
			success: true,
			recipientCount: input.to.length + (input.cc?.length || 0) + (input.bcc?.length || 0),
			subject: input.subject
		};
	}
}
