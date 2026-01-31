/**
 * Send Security Upgrade Emails
 *
 * Self-contained script to email all users who need a forced password reset
 * after the SHA-256 → bcrypt migration.
 *
 * Usage:
 *   npx tsx scripts/send-security-upgrade-emails.ts           # Send emails
 *   npx tsx scripts/send-security-upgrade-emails.ts --dry-run # Preview only
 *
 * Requires .env with:
 *   DATABASE_URL, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL (optional),
 *   SENDGRID_FROM_NAME (optional), BASE_URL (optional)
 */

import postgres from 'postgres';
import { createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

// ============================================================
// Configuration from .env
// ============================================================

const envContent = readFileSync('.env', 'utf-8');

function getEnv(key: string, fallback?: string): string {
	const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
	const value = match?.[1]?.trim();
	if (!value && !fallback) {
		console.error(`Missing required env var: ${key}`);
		process.exit(1);
	}
	return value || fallback!;
}

const DATABASE_URL = getEnv('DATABASE_URL');
const SENDGRID_API_KEY = getEnv('SENDGRID_API_KEY');
const FROM_EMAIL = getEnv('SENDGRID_FROM_EMAIL', 'noreply@stratai.app');
const FROM_NAME = getEnv('SENDGRID_FROM_NAME', 'StratAI');
const BASE_URL = getEnv('BASE_URL', 'http://localhost:5173');

const dryRun = process.argv.includes('--dry-run');
const TOKEN_EXPIRY_MINUTES = 60; // 1 hour

const sql = postgres(DATABASE_URL);

// ============================================================
// Helpers
// ============================================================

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

function buildResetLink(token: string): string {
	return `${BASE_URL}/reset-password?token=${token}`;
}

function buildEmailHtml(userName: string, resetLink: string): string {
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Security Upgrade - Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
		<h1 style="color: white; margin: 0; font-size: 24px;">StratAI</h1>
	</div>
	<div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
		<h2 style="margin-top: 0;">Security Upgrade</h2>
		<p>Hi ${userName},</p>
		<p>We've upgraded our password security to use stronger encryption. As part of this upgrade, all existing passwords have been reset.</p>
		<p>Please set a new password to continue using StratAI:</p>
		<div style="text-align: center; margin: 30px 0;">
			<a href="${resetLink}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Set New Password</a>
		</div>
		<p style="color: #6b7280; font-size: 14px;">This link will expire in ${TOKEN_EXPIRY_MINUTES} minutes.</p>
		<p style="color: #6b7280; font-size: 14px;"><strong>Why is this happening?</strong> We've moved to bcrypt password hashing, an industry-standard algorithm that provides significantly stronger protection for your account. This is a one-time upgrade.</p>
		<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
		<p style="color: #9ca3af; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a></p>
	</div>
</body>
</html>`;
}

function buildEmailText(userName: string, resetLink: string): string {
	return `Security Upgrade - Reset Your Password

Hi ${userName},

We've upgraded our password security to use stronger encryption. As part of this upgrade, all existing passwords have been reset.

Please set a new password by visiting:

${resetLink}

This link will expire in ${TOKEN_EXPIRY_MINUTES} minutes.

Why is this happening? We've moved to bcrypt password hashing, an industry-standard algorithm that provides significantly stronger protection for your account. This is a one-time upgrade.

- The StratAI Team`;
}

// ============================================================
// Main
// ============================================================

async function main() {
	console.log(dryRun ? '\n=== DRY RUN MODE ===\n' : '\n=== SENDING SECURITY UPGRADE EMAILS ===\n');

	// 1. Find all users needing password reset
	const users = await sql<{ id: string; email: string; displayName: string | null; firstName: string | null; organizationId: string }[]>`
		SELECT id, email, display_name as "displayName", first_name as "firstName", organization_id as "organizationId"
		FROM users
		WHERE force_password_reset = true
		  AND deleted_at IS NULL
		  AND status = 'active'
	`;

	if (users.length === 0) {
		console.log('No users need password reset. Exiting.');
		await sql.end();
		return;
	}

	console.log(`Found ${users.length} user(s) needing password reset:\n`);

	for (const user of users) {
		const userName = user.displayName || user.firstName || user.email.split('@')[0];
		console.log(`  - ${userName} <${user.email}>`);
	}

	if (dryRun) {
		console.log('\n[DRY RUN] No emails sent. Remove --dry-run to send.');
		await sql.end();
		return;
	}

	console.log('\nSending emails...\n');

	let sent = 0;
	let failed = 0;

	for (const user of users) {
		const userName = user.displayName || user.firstName || user.email.split('@')[0];

		try {
			// 2. Invalidate any existing reset tokens for this user
			await sql`
				UPDATE password_reset_tokens
				SET used_at = NOW()
				WHERE user_id = ${user.id} AND used_at IS NULL AND token_type = 'reset'
			`;

			// 3. Create a new password reset token
			const token = randomBytes(32).toString('hex');
			const tokenHash = hashToken(token);
			const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

			await sql`
				INSERT INTO password_reset_tokens (user_id, token_hash, token_type, expires_at)
				VALUES (${user.id}, ${tokenHash}, 'reset', ${expiresAt})
			`;

			const resetLink = buildResetLink(token);

			// 4. Log email
			const subject = 'StratAI Security Upgrade — Please Reset Your Password';
			const logRows = await sql<{ id: string }[]>`
				INSERT INTO email_logs (org_id, user_id, email_type, recipient_email, subject, metadata)
				VALUES (${user.organizationId}, ${user.id}, 'security_upgrade', ${user.email}, ${subject}, '{}')
				RETURNING id
			`;
			const logId = logRows[0].id;

			// 5. Send via SendGrid
			const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${SENDGRID_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					personalizations: [{ to: [{ email: user.email }] }],
					from: { email: FROM_EMAIL, name: FROM_NAME },
					subject,
					content: [
						{ type: 'text/plain', value: buildEmailText(userName, resetLink) },
						{ type: 'text/html', value: buildEmailHtml(userName, resetLink) }
					]
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`  FAILED: ${user.email} — ${response.status}: ${errorText}`);
				await sql`UPDATE email_logs SET status = 'failed', error_message = ${errorText} WHERE id = ${logId}`;
				failed++;
			} else {
				const messageId = response.headers.get('X-Message-Id') || null;
				await sql`UPDATE email_logs SET status = 'sent', sendgrid_message_id = ${messageId}, sent_at = NOW() WHERE id = ${logId}`;
				console.log(`  SENT: ${user.email}`);
				sent++;
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			console.error(`  ERROR: ${user.email} — ${msg}`);
			failed++;
		}
	}

	console.log(`\nDone: ${sent} sent, ${failed} failed out of ${users.length} total.`);
	await sql.end();
}

main().catch((err) => {
	console.error('Script failed:', err);
	process.exit(1);
});
