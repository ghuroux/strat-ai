/**
 * Email AI Tool Definitions
 *
 * Defines the tools that the AI can use to send emails via Microsoft Graph.
 * These are injected into the chat when the calendar/email integration is connected.
 *
 * IMPORTANT: The AI must draft the email in conversation and get explicit user
 * confirmation before calling the send tool.
 */

import type { IntegrationToolDefinition } from '$lib/types/integrations';
import type { ToolDefinition } from '$lib/types/api';
import { EmailClient, type SendEmailInput, type SendEmailResult } from './email-client';

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Send an email via Microsoft Graph
 */
export const sendEmailToolDefinition: IntegrationToolDefinition = {
	name: 'email_send_email',
	description: 'Send an email on behalf of the user via Microsoft Outlook. CRITICAL: You MUST draft the email in the conversation and get explicit user approval before calling this tool. Never call this tool without user confirmation.',
	parameters: {
		type: 'object',
		properties: {
			to: {
				type: 'string',
				description: 'Comma-separated list of recipient email addresses (To field)'
			},
			cc: {
				type: 'string',
				description: 'Comma-separated list of CC email addresses (optional)'
			},
			bcc: {
				type: 'string',
				description: 'Comma-separated list of BCC email addresses (optional)'
			},
			subject: {
				type: 'string',
				description: 'Email subject line'
			},
			body: {
				type: 'string',
				description: 'Email body in HTML format. Use <p> tags for paragraphs, <br> for line breaks, <strong> for bold, <em> for italic.'
			},
			saveToSentItems: {
				type: 'string',
				description: 'Whether to save the email in Sent Items folder. Defaults to "true".',
				enum: ['true', 'false']
			}
		},
		required: ['to', 'subject', 'body']
	}
};

// ============================================================================
// All Email Tools
// ============================================================================

/**
 * Get all email tool definitions
 */
export function getEmailToolDefinitions(): IntegrationToolDefinition[] {
	return [sendEmailToolDefinition];
}

// ============================================================================
// Chat Integration Helpers
// ============================================================================

/**
 * Email tools in Anthropic ToolDefinition format for chat integration
 */
export const emailTools: ToolDefinition[] = getEmailToolDefinitions().map(tool => ({
	name: tool.name,
	description: tool.description,
	input_schema: {
		type: 'object' as const,
		properties: tool.parameters.properties,
		required: tool.parameters.required || []
	}
}));

/**
 * Check if a tool name is an email tool
 */
export function isEmailTool(toolName: string): boolean {
	return toolName.startsWith('email_');
}

/**
 * Execute an email tool and return formatted result
 * @param toolName - The email tool to execute
 * @param input - Tool input parameters from AI
 * @param accessToken - Microsoft Graph access token
 */
export async function executeEmailTool(
	toolName: string,
	input: Record<string, unknown>,
	accessToken: string
): Promise<string> {
	const client = new EmailClient(accessToken);

	switch (toolName) {
		case 'email_send_email': {
			const toStr = input.to as string;
			const ccStr = input.cc as string | undefined;
			const bccStr = input.bcc as string | undefined;
			const subject = input.subject as string;
			const body = input.body as string;
			const saveToSentItems = input.saveToSentItems !== 'false';

			// Parse comma-separated email addresses and validate
			const to = parseEmails(toStr);
			const cc = ccStr ? parseEmails(ccStr) : undefined;
			const bcc = bccStr ? parseEmails(bccStr) : undefined;

			if (to.length === 0) {
				return 'Error: No valid recipient email addresses provided.';
			}

			const sendInput: SendEmailInput = {
				to,
				cc,
				bcc,
				subject,
				body,
				saveToSentItems
			};

			console.log('[Email] Sending email:', JSON.stringify({
				to,
				cc,
				bcc,
				subject,
				bodyLength: body.length,
				saveToSentItems
			}, null, 2));

			const result = await client.sendEmail(sendInput);

			console.log('[Email] Email sent successfully:', JSON.stringify(result, null, 2));

			return formatSentEmailForAI(result, to, cc, bcc);
		}

		default:
			throw new Error(`Unknown email tool: ${toolName}`);
	}
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse comma-separated email string into validated email array
 */
function parseEmails(emailStr: string): string[] {
	return emailStr
		.split(',')
		.map(e => e.trim())
		.filter(e => e.includes('@'));
}

/**
 * Format sent email confirmation for AI response
 */
function formatSentEmailForAI(
	result: SendEmailResult,
	to: string[],
	cc?: string[],
	bcc?: string[]
): string {
	let response = `✅ Email sent successfully!\n`;
	response += `📧 Subject: "${result.subject}"\n`;
	response += `📬 To: ${to.join(', ')}\n`;

	if (cc && cc.length > 0) {
		response += `📋 CC: ${cc.join(', ')}\n`;
	}

	if (bcc && bcc.length > 0) {
		response += `🔒 BCC: ${bcc.length} recipient${bcc.length > 1 ? 's' : ''}\n`;
	}

	response += `📊 Total recipients: ${result.recipientCount}`;

	return response;
}
