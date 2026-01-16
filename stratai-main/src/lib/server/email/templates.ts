/**
 * Email Templates
 *
 * HTML and text email templates for the system.
 * See: docs/SENDGRID_EMAIL_INTEGRATION.md
 */

import { env } from '$env/dynamic/private';

/**
 * Get base URL for links in emails
 * Falls back to localhost for development
 */
function getBaseUrl(): string {
	return env.BASE_URL || 'http://localhost:5173';
}

interface PasswordResetTemplateData {
	userName: string;
	resetLink: string;
	expiresInMinutes: number;
}

/**
 * Generate password reset email content
 */
export function getPasswordResetEmail(data: PasswordResetTemplateData) {
	const { userName, resetLink, expiresInMinutes } = data;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
		<h1 style="color: white; margin: 0; font-size: 24px;">StratAI</h1>
	</div>
	<div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
		<h2 style="margin-top: 0;">Reset Your Password</h2>
		<p>Hi ${userName},</p>
		<p>We received a request to reset your password. Click the button below to create a new password:</p>
		<div style="text-align: center; margin: 30px 0;">
			<a href="${resetLink}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
		</div>
		<p style="color: #6b7280; font-size: 14px;">This link will expire in ${expiresInMinutes} minutes.</p>
		<p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
		<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
		<p style="color: #9ca3af; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a></p>
	</div>
</body>
</html>`;

	const text = `Reset Your Password

Hi ${userName},

We received a request to reset your password. Visit the link below to create a new password:

${resetLink}

This link will expire in ${expiresInMinutes} minutes.

If you didn't request this, you can safely ignore this email. Your password won't be changed.

- The StratAI Team`;

	return {
		subject: 'Reset Your StratAI Password',
		html,
		text
	};
}

/**
 * Create password reset link with token
 */
export function createPasswordResetLink(token: string): string {
	return `${getBaseUrl()}/reset-password?token=${token}`;
}

// ============================================================
// Space Invitation Email Template
// ============================================================

interface SpaceInviteTemplateData {
	/** Recipient's name (display name or email prefix if unknown) */
	recipientName: string;
	/** Name of the person who sent the invitation */
	inviterName: string;
	/** Name of the space being shared */
	spaceName: string;
	/** Role being granted (member, guest, admin) */
	role: string;
	/** Link to accept the invitation */
	inviteLink: string;
	/** Number of days until the invite expires */
	expiresInDays: number;
}

/**
 * Generate space invitation email content
 *
 * Used when a user is invited to collaborate on a Space.
 * The recipient may be an existing user or a new user who needs to sign up.
 */
export function getSpaceInviteEmail(data: SpaceInviteTemplateData) {
	const { recipientName, inviterName, spaceName, role, inviteLink, expiresInDays } = data;

	// Capitalize role for display
	const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>You've been invited to collaborate</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
		<h1 style="color: white; margin: 0; font-size: 24px;">StratAI</h1>
	</div>
	<div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
		<h2 style="margin-top: 0;">You're invited to collaborate!</h2>
		<p>Hi ${recipientName},</p>
		<p><strong>${inviterName}</strong> has invited you to join <strong>"${spaceName}"</strong> as a <strong>${roleDisplay}</strong>.</p>
		<p>Spaces in StratAI are collaborative workspaces where you can share conversations, documents, and AI-assisted workflows with your team.</p>
		<div style="text-align: center; margin: 30px 0;">
			<a href="${inviteLink}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Accept Invitation</a>
		</div>
		<p style="color: #6b7280; font-size: 14px;">This invitation will expire in ${expiresInDays} ${expiresInDays === 1 ? 'day' : 'days'}.</p>
		<p style="color: #6b7280; font-size: 14px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
		<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
		<p style="color: #9ca3af; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${inviteLink}" style="color: #667eea; word-break: break-all;">${inviteLink}</a></p>
	</div>
</body>
</html>`;

	const text = `You're invited to collaborate!

Hi ${recipientName},

${inviterName} has invited you to join "${spaceName}" as a ${roleDisplay}.

Spaces in StratAI are collaborative workspaces where you can share conversations, documents, and AI-assisted workflows with your team.

Click here to accept the invitation:
${inviteLink}

This invitation will expire in ${expiresInDays} ${expiresInDays === 1 ? 'day' : 'days'}.

If you weren't expecting this invitation, you can safely ignore this email.

- The StratAI Team`;

	return {
		subject: `${inviterName} invited you to "${spaceName}" on StratAI`,
		html,
		text
	};
}

/**
 * Create space invitation link with token
 *
 * The token encodes the invitation ID which can be verified server-side.
 * If the user doesn't have an account, they'll be prompted to sign up first.
 */
export function createSpaceInviteLink(token: string): string {
	return `${getBaseUrl()}/invites/space?token=${token}`;
}
