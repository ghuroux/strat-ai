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

/**
 * Create set password link for welcome emails
 */
export function createSetPasswordLink(token: string): string {
	return `${getBaseUrl()}/set-password?token=${token}`;
}

// ============================================================
// Welcome Email Template (for new users invited to org)
// ============================================================

interface WelcomeEmailTemplateData {
	firstName: string;
	organizationName: string;
	setPasswordLink: string;
	email: string;
	expiresInDays: number;
}

/**
 * Generate welcome email content for new users
 */
export function getWelcomeEmail(data: WelcomeEmailTemplateData) {
	const { firstName, organizationName, setPasswordLink, email, expiresInDays } = data;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Welcome to StratAI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
		<h1 style="color: white; margin: 0; font-size: 24px;">StratAI</h1>
	</div>
	<div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
		<h2 style="margin-top: 0;">Welcome to StratAI!</h2>
		<p>Hi ${firstName},</p>
		<p>You've been invited to join <strong>${organizationName}</strong> on StratAI.</p>
		<p>Once you set your password, you'll have access to:</p>
		<ul style="color: #374151; margin: 10px 0 20px 0; padding-left: 20px;">
			<li>The <strong>${organizationName}</strong> workspace - your team's shared space for collaboration</li>
		</ul>
		<p>Click the button below to get started:</p>
		<div style="text-align: center; margin: 30px 0;">
			<a href="${setPasswordLink}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Set Your Password</a>
		</div>
		<p style="color: #6b7280; font-size: 14px;"><strong>Your email:</strong> ${email}</p>
		<p style="color: #6b7280; font-size: 14px;">This link will expire in ${expiresInDays} days.</p>
		<p style="color: #6b7280; font-size: 14px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
		<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
		<p style="color: #9ca3af; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${setPasswordLink}" style="color: #667eea; word-break: break-all;">${setPasswordLink}</a></p>
	</div>
</body>
</html>`;

	const text = `Welcome to StratAI!

Hi ${firstName},

You've been invited to join ${organizationName} on StratAI.

Once you set your password, you'll have access to:
• The ${organizationName} workspace - your team's shared space for collaboration

Click the link below to get started:

${setPasswordLink}

Your email: ${email}

This link will expire in ${expiresInDays} days.

If you weren't expecting this invitation, you can safely ignore this email.

- The StratAI Team`;

	return {
		subject: 'Welcome to StratAI - Set Your Password',
		html,
		text
	};
}

// ============================================================
// Space Invite Email Template (token-based, for pending invitations)
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
 * Generate space invitation email content (token-based)
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

// ============================================================
// Space Invitation Email Template (for existing users added to a space)
// ============================================================

/**
 * Create space link for invitation emails
 */
export function createSpaceLink(spaceSlug: string): string {
	return `${getBaseUrl()}/spaces/${spaceSlug}`;
}

/**
 * Get display name for a role (with article)
 */
function getRoleDisplayName(role: string): string {
	const names: Record<string, string> = {
		admin: 'an Admin',
		member: 'a Member',
		guest: 'a Guest'
	};
	return names[role] || 'a Member';
}

/**
 * Get permissions list for a role
 */
function getRolePermissions(role: string): string[] {
	const permissions: Record<string, string[]> = {
		admin: [
			'View all areas and content',
			'Create and edit content',
			'Manage space members'
		],
		member: [
			'View all areas and content',
			'Create and edit content',
			'Collaborate with the team'
		],
		guest: [
			'View areas shared with you',
			'Collaborate on shared content'
		]
	};
	return permissions[role] || permissions.member;
}

interface SpaceInvitationTemplateData {
	firstName: string;
	inviterName: string;
	spaceName: string;
	spaceSlug: string;
	role: 'admin' | 'member' | 'guest';
}

/**
 * Generate space invitation email content
 * Used when an existing user is added to a space
 */
export function getSpaceInvitationEmail(data: SpaceInvitationTemplateData) {
	const { firstName, inviterName, spaceName, spaceSlug, role } = data;
	const spaceLink = createSpaceLink(spaceSlug);
	const roleDisplay = getRoleDisplayName(role);
	const permissions = getRolePermissions(role);

	const permissionsHtml = permissions
		.map(p => `<li style="margin: 5px 0;">${p}</li>`)
		.join('\n');

	const permissionsText = permissions
		.map(p => `• ${p}`)
		.join('\n');

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>You've been added to ${spaceName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
		<h1 style="color: white; margin: 0; font-size: 24px;">StratAI</h1>
	</div>
	<div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
		<h2 style="margin-top: 0;">You've been added to a space!</h2>
		<p>Hi ${firstName},</p>
		<p><strong>${inviterName}</strong> added you to the <strong>"${spaceName}"</strong> space as ${roleDisplay}.</p>
		<p>As ${roleDisplay}, you can:</p>
		<ul style="color: #374151; margin: 10px 0 20px 0; padding-left: 20px;">
			${permissionsHtml}
		</ul>
		<div style="text-align: center; margin: 30px 0;">
			<a href="${spaceLink}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View ${spaceName}</a>
		</div>
		<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
		<p style="color: #9ca3af; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${spaceLink}" style="color: #667eea; word-break: break-all;">${spaceLink}</a></p>
	</div>
</body>
</html>`;

	const text = `You've been added to a space!

Hi ${firstName},

${inviterName} added you to the "${spaceName}" space as ${roleDisplay}.

As ${roleDisplay}, you can:
${permissionsText}

View the space here:
${spaceLink}

- The StratAI Team`;

	return {
		subject: `You've been added to ${spaceName}`,
		html,
		text
	};
}
