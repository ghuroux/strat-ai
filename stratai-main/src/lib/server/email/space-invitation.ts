/**
 * Space Invitation Email Service
 *
 * Sends email notifications when users are added to a space.
 * See: docs/SENDGRID_EMAIL_INTEGRATION.md
 */

import { env } from '$env/dynamic/private';
import { sendEmail } from './sendgrid';
import { getSpaceInviteEmail } from './templates';
import { postgresUserRepository } from '../persistence';

/**
 * Get base URL for links in emails
 * Falls back to localhost for development
 */
function getBaseUrl(): string {
	return env.BASE_URL || 'http://localhost:5173';
}

/**
 * Create a direct link to a space
 * Used for notification emails (user already has access)
 */
export function createSpaceLink(spaceSlug: string): string {
	return `${getBaseUrl()}/spaces/${spaceSlug}`;
}

/**
 * Parameters for sending a space invitation email
 */
interface SendSpaceInvitationEmailParams {
	/** ID of the user being added to the space */
	userId: string;
	/** ID of the space */
	spaceId: string;
	/** URL-friendly slug of the space */
	spaceSlug: string;
	/** Display name of the space */
	spaceName: string;
	/** Role being assigned (admin, member, guest) */
	role: string;
	/** ID of the user who added the member (inviter) */
	invitedByUserId: string;
}

/**
 * Send a space invitation email to a user who has been added to a space
 *
 * This is a notification email - the user has already been added to the space.
 * The email contains a direct link to the space (no token required).
 *
 * @returns true if email was sent successfully, false otherwise
 */
export async function sendSpaceInvitationEmail(
	params: SendSpaceInvitationEmailParams
): Promise<boolean> {
	const { userId, spaceId, spaceSlug, spaceName, role, invitedByUserId } = params;

	try {
		// Fetch user details (the person being added)
		const user = await postgresUserRepository.findById(userId);
		if (!user) {
			console.error('[SPACE_INVITE_EMAIL] User not found:', userId);
			return false;
		}

		// Fetch inviter details
		const inviter = await postgresUserRepository.findById(invitedByUserId);

		// Determine display names with fallbacks
		// Falls back to 'there' if user has no firstName (e.g., "Hi there,")
		const recipientName = user.firstName ?? 'there';

		// Falls back to 'A team member' if inviter not found
		const inviterName = inviter?.displayName ?? inviter?.firstName ?? 'A team member';

		// Create direct link to the space
		const spaceLink = createSpaceLink(spaceSlug);

		// Generate email content
		// Note: Using getSpaceInviteEmail template which was designed for pending invitations.
		// For direct additions (user already has access), we use the space link directly.
		// The template messaging mentions "invitation" and "expires" which isn't ideal for
		// direct additions, but works for now. Consider creating a separate template for
		// direct addition notifications if messaging needs to be more accurate.
		const emailContent = getSpaceInviteEmail({
			recipientName,
			inviterName,
			spaceName,
			role,
			inviteLink: spaceLink,
			// Using 7 days as a reasonable default for the "expires" message.
			// For direct additions this isn't technically accurate (user already has access),
			// but the template requires this field.
			expiresInDays: 7
		});

		// Send the email
		const result = await sendEmail({
			to: user.email,
			subject: emailContent.subject,
			html: emailContent.html,
			text: emailContent.text,
			userId: userId,
			orgId: user.organizationId,
			emailType: 'space_invite',
			metadata: {
				spaceId,
				spaceSlug,
				spaceName,
				role,
				invitedByUserId
			}
		});

		if (!result.success) {
			console.error('[SPACE_INVITE_EMAIL] Failed to send:', result.error);
			return false;
		}

		console.log('[SPACE_INVITE_EMAIL] Sent successfully to:', user.email, 'for space:', spaceName);
		return true;
	} catch (error) {
		console.error('[SPACE_INVITE_EMAIL] Error sending email:', error);
		return false;
	}
}
