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
		<p>You've been invited to join <strong>${organizationName}</strong> on StratAI. To get started, please set up your password by clicking the button below:</p>
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

You've been invited to join ${organizationName} on StratAI. To get started, please set up your password by visiting the link below:

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
