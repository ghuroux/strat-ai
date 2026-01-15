# SendGrid Email Integration

## Overview

Comprehensive email system using SendGrid, starting with password reset functionality and designed for future expansion (email verification, team invites, notifications).

**Status:** Planned - Ready for implementation

**Design Principles:**
- Security-first (hashed tokens, rate limiting, timing attack prevention)
- Multi-tenant ready (organization-scoped)
- Extensible architecture for future email use cases
- Following existing codebase patterns (repository pattern, TypeScript types)

---

## Architecture

```
src/lib/
├── server/
│   ├── email/
│   │   ├── sendgrid.ts          # SendGrid HTTP client
│   │   ├── templates.ts         # Email templates (HTML + text)
│   │   └── index.ts             # Barrel export
│   └── persistence/
│       ├── password-reset-tokens-postgres.ts
│       ├── email-logs-postgres.ts
│       └── migrations/
│           └── 027-email-system.sql
├── types/
│   └── email.ts                 # Email types
└── routes/
    ├── api/auth/
    │   ├── forgot-password/+server.ts
    │   └── reset-password/+server.ts
    ├── forgot-password/+page.svelte
    └── reset-password/+page.svelte
```

---

## Files to Create/Modify

### New Files
```
src/lib/types/email.ts                                    # Email types
src/lib/server/email/sendgrid.ts                          # SendGrid HTTP client
src/lib/server/email/templates.ts                         # Email templates
src/lib/server/email/index.ts                             # Barrel export
src/lib/server/persistence/password-reset-tokens-postgres.ts
src/lib/server/persistence/email-logs-postgres.ts
src/lib/server/persistence/migrations/027-email-system.sql
src/routes/api/auth/forgot-password/+server.ts
src/routes/api/auth/reset-password/+server.ts
src/routes/forgot-password/+page.svelte
src/routes/reset-password/+page.svelte
```

### Modified Files
```
src/lib/server/persistence/index.ts                       # Add exports
src/hooks.server.ts                                       # Add routes to PUBLIC_ROUTES
src/routes/login/+page.svelte                             # Add forgot password link
.env.example                                              # Add SendGrid vars
```

---

## Phase 0: User Repository Updates

Before implementing the email system, we need to add methods to the user repository that support cross-organization email lookup (password reset doesn't know which org the user belongs to).

### Update `src/lib/server/persistence/users-postgres.ts`

Add these methods to `postgresUserRepository`:

```typescript
/**
 * Find user by email across all organizations
 * Used for password reset where we don't know the org
 */
async findByEmailGlobal(email: string): Promise<User | null> {
    const rows = await sql<UserRow[]>`
        SELECT * FROM users
        WHERE email = ${email}
          AND deleted_at IS NULL
        LIMIT 1
    `;
    return rows.length > 0 ? rowToUser(rows[0]) : null;
},

/**
 * Update user's password hash
 * Convenience method for password reset
 */
async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    const result = await sql`
        UPDATE users
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
    `;
    return result.count > 0;
}
```

### Update `src/lib/server/persistence/types.ts`

Add to `UserRepository` interface:

```typescript
export interface UserRepository {
    // ... existing methods ...
    findByEmailGlobal(email: string): Promise<User | null>;
    updatePassword(id: string, passwordHash: string): Promise<boolean>;
}
```

---

## Phase 1: Database Schema

### Migration: `027-email-system.sql`

```sql
-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,           -- SHA256 hash of token
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,                -- NULL = unused
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Rate limiting for password reset requests
CREATE TABLE password_reset_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_reset_attempts_email ON password_reset_attempts(email, attempted_at);
CREATE INDEX idx_password_reset_attempts_ip ON password_reset_attempts(ip_address, attempted_at);

-- Email logs (for all email types)
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL,           -- 'password_reset', 'verification', 'invite', etc.
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    sendgrid_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX idx_email_logs_org ON email_logs(org_id);
CREATE INDEX idx_email_logs_user ON email_logs(user_id);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_status ON email_logs(status);
```

---

## Phase 2: TypeScript Types

### `src/lib/types/email.ts`

```typescript
export type EmailType =
    | 'password_reset'
    | 'email_verification'
    | 'team_invite'
    | 'notification';

export type EmailStatus =
    | 'pending'
    | 'sent'
    | 'failed'
    | 'delivered'
    | 'bounced';

export interface EmailLog {
    id: string;
    orgId: string | null;
    userId: string | null;
    emailType: EmailType;
    recipientEmail: string;
    subject: string;
    sendgridMessageId: string | null;
    status: EmailStatus;
    errorMessage: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    sentAt: Date | null;
}

export interface PasswordResetToken {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
}

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text: string;
    orgId?: string;
    userId?: string;
    emailType: EmailType;
    metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
```

---

## Phase 3: SendGrid Service

### `src/lib/server/email/sendgrid.ts`

Pattern: Follow `src/lib/server/brave-search.ts` for HTTP API integration

```typescript
import { env } from '$env/dynamic/private';
import type { SendEmailOptions, SendEmailResult } from '$lib/types/email';
import { postgresEmailLogRepository } from '../persistence/email-logs-postgres';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const apiKey = env.SENDGRID_API_KEY;
    const fromEmail = env.SENDGRID_FROM_EMAIL || 'noreply@stratai.app';

    if (!apiKey) {
        console.error('[EMAIL] SENDGRID_API_KEY not configured');
        return { success: false, error: 'Email service not configured' };
    }

    // Create email log entry
    const logId = await postgresEmailLogRepository.create({
        orgId: options.orgId || null,
        userId: options.userId || null,
        emailType: options.emailType,
        recipientEmail: options.to,
        subject: options.subject,
        metadata: options.metadata || {}
    });

    try {
        const response = await fetch(SENDGRID_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: options.to }] }],
                from: { email: fromEmail, name: 'StratAI' },
                subject: options.subject,
                content: [
                    { type: 'text/plain', value: options.text },
                    { type: 'text/html', value: options.html }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[EMAIL] SendGrid error:', response.status, errorText);

            await postgresEmailLogRepository.updateStatus(logId, 'failed', errorText);
            return { success: false, error: `SendGrid error: ${response.status}` };
        }

        // Extract message ID from headers
        const messageId = response.headers.get('X-Message-Id') || undefined;

        await postgresEmailLogRepository.updateStatus(logId, 'sent', null, messageId);

        console.log('[EMAIL] Sent successfully:', options.emailType, 'to', options.to);
        return { success: true, messageId };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[EMAIL] Failed to send:', errorMessage);

        await postgresEmailLogRepository.updateStatus(logId, 'failed', errorMessage);
        return { success: false, error: errorMessage };
    }
}
```

---

## Phase 4: Email Templates

### `src/lib/server/email/templates.ts`

```typescript
import { PUBLIC_BASE_URL } from '$env/static/public';

const BASE_URL = PUBLIC_BASE_URL || 'http://localhost:5173';

interface PasswordResetTemplateData {
    userName: string;
    resetLink: string;
    expiresInMinutes: number;
}

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

    const text = `
Reset Your Password

Hi ${userName},

We received a request to reset your password. Visit the link below to create a new password:

${resetLink}

This link will expire in ${expiresInMinutes} minutes.

If you didn't request this, you can safely ignore this email. Your password won't be changed.

- The StratAI Team
`;

    return {
        subject: 'Reset Your StratAI Password',
        html,
        text
    };
}

export function createPasswordResetLink(token: string): string {
    return `${BASE_URL}/reset-password?token=${token}`;
}
```

### `src/lib/server/email/index.ts`

Barrel export for clean imports:

```typescript
export { sendEmail } from './sendgrid';
export { getPasswordResetEmail, createPasswordResetLink } from './templates';
```

---

## Phase 5: Password Reset Token Repository

### `src/lib/server/persistence/password-reset-tokens-postgres.ts`

```typescript
import { createHash, randomBytes } from 'crypto';
import { sql } from './db';
import type { PasswordResetToken } from '$lib/types/email';

const TOKEN_EXPIRY_MINUTES = 60; // 1 hour

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export const postgresPasswordResetTokenRepository = {
    /**
     * Create a new password reset token
     * Returns the plain token (to send in email) - we only store the hash
     */
    async create(userId: string): Promise<string> {
        // Invalidate any existing tokens for this user
        await sql`
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE user_id = ${userId} AND used_at IS NULL
        `;

        // Generate secure random token
        const token = randomBytes(32).toString('hex');
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

        await sql`
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES (${userId}, ${tokenHash}, ${expiresAt})
        `;

        return token;
    },

    /**
     * Verify a token and return the associated user ID if valid
     */
    async verify(token: string): Promise<string | null> {
        const tokenHash = hashToken(token);

        const rows = await sql<{ userId: string }[]>`
            SELECT user_id
            FROM password_reset_tokens
            WHERE token_hash = ${tokenHash}
              AND used_at IS NULL
              AND expires_at > NOW()
        `;

        return rows[0]?.userId || null;
    },

    /**
     * Mark a token as used (single-use)
     */
    async markUsed(token: string): Promise<boolean> {
        const tokenHash = hashToken(token);

        const result = await sql`
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE token_hash = ${tokenHash}
              AND used_at IS NULL
              AND expires_at > NOW()
        `;

        return result.count > 0;
    },

    /**
     * Check rate limiting - returns true if request should be blocked
     */
    async isRateLimited(email: string, ipAddress: string | null): Promise<boolean> {
        const windowMinutes = 15;
        const maxAttempts = 5;

        // Calculate cutoff time in JS (safer than interpolating into INTERVAL)
        const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

        // Check by email
        const emailAttempts = await sql<{ count: number }[]>`
            SELECT COUNT(*)::int as count
            FROM password_reset_attempts
            WHERE email = ${email}
              AND attempted_at > ${cutoff}
        `;

        if (emailAttempts[0]?.count >= maxAttempts) {
            return true;
        }

        // Check by IP if provided
        if (ipAddress) {
            const ipAttempts = await sql<{ count: number }[]>`
                SELECT COUNT(*)::int as count
                FROM password_reset_attempts
                WHERE ip_address = ${ipAddress}
                  AND attempted_at > ${cutoff}
            `;

            if (ipAttempts[0]?.count >= maxAttempts * 2) { // More lenient for IP
                return true;
            }
        }

        return false;
    },

    /**
     * Record a password reset attempt for rate limiting
     */
    async recordAttempt(email: string, ipAddress: string | null): Promise<void> {
        await sql`
            INSERT INTO password_reset_attempts (email, ip_address)
            VALUES (${email}, ${ipAddress})
        `;
    },

    /**
     * Cleanup old tokens and attempts
     */
    async cleanup(): Promise<void> {
        // Delete tokens older than 24 hours
        await sql`DELETE FROM password_reset_tokens WHERE created_at < NOW() - INTERVAL '24 hours'`;

        // Delete attempts older than 1 hour
        await sql`DELETE FROM password_reset_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour'`;
    }
};
```

---

## Phase 6: Email Logs Repository

### `src/lib/server/persistence/email-logs-postgres.ts`

```typescript
import { sql, type JSONValue } from './db';
import type { EmailLog, EmailType, EmailStatus } from '$lib/types/email';

interface CreateEmailLogInput {
    orgId: string | null;
    userId: string | null;
    emailType: EmailType;
    recipientEmail: string;
    subject: string;
    metadata?: Record<string, unknown>;
}

export const postgresEmailLogRepository = {
    async create(input: CreateEmailLogInput): Promise<string> {
        const rows = await sql<{ id: string }[]>`
            INSERT INTO email_logs (org_id, user_id, email_type, recipient_email, subject, metadata)
            VALUES (
                ${input.orgId},
                ${input.userId},
                ${input.emailType},
                ${input.recipientEmail},
                ${input.subject},
                ${sql.json((input.metadata || {}) as JSONValue)}
            )
            RETURNING id
        `;
        return rows[0].id;
    },

    async updateStatus(
        id: string,
        status: EmailStatus,
        errorMessage: string | null = null,
        sendgridMessageId: string | null = null
    ): Promise<void> {
        await sql`
            UPDATE email_logs
            SET status = ${status},
                error_message = ${errorMessage},
                sendgrid_message_id = ${sendgridMessageId},
                sent_at = ${status === 'sent' ? sql`NOW()` : sql`sent_at`}
            WHERE id = ${id}
        `;
    },

    async findByOrg(orgId: string, limit = 100): Promise<EmailLog[]> {
        return sql<EmailLog[]>`
            SELECT * FROM email_logs
            WHERE org_id = ${orgId}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    },

    async findByUser(userId: string, limit = 50): Promise<EmailLog[]> {
        return sql<EmailLog[]>`
            SELECT * FROM email_logs
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    }
};
```

---

## Phase 7: API Endpoints

### `POST /api/auth/forgot-password`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresUserRepository } from '$lib/server/persistence';
import { postgresPasswordResetTokenRepository } from '$lib/server/persistence/password-reset-tokens-postgres';
import { sendEmail } from '$lib/server/email/sendgrid';
import { getPasswordResetEmail, createPasswordResetLink } from '$lib/server/email/templates';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
    const startTime = Date.now();

    try {
        const { email } = await request.json();

        if (!email || typeof email !== 'string') {
            // Consistent timing to prevent enumeration
            await delay(startTime, 500);
            return json({ success: true }); // Don't reveal missing email
        }

        const normalizedEmail = email.toLowerCase().trim();
        const ipAddress = getClientAddress();

        // Check rate limiting
        const isLimited = await postgresPasswordResetTokenRepository.isRateLimited(normalizedEmail, ipAddress);
        if (isLimited) {
            await delay(startTime, 500);
            return json({ success: true }); // Don't reveal rate limiting
        }

        // Record attempt
        await postgresPasswordResetTokenRepository.recordAttempt(normalizedEmail, ipAddress);

        // Find user (cross-org lookup - we don't know which org they're in)
        const user = await postgresUserRepository.findByEmailGlobal(normalizedEmail);

        if (user) {
            // Create token and send email
            const token = await postgresPasswordResetTokenRepository.create(user.id);
            const resetLink = createPasswordResetLink(token);
            const template = getPasswordResetEmail({
                userName: user.displayName || user.username || 'there',
                resetLink,
                expiresInMinutes: 60
            });

            await sendEmail({
                to: normalizedEmail,
                subject: template.subject,
                html: template.html,
                text: template.text,
                userId: user.id,
                orgId: user.organizationId,
                emailType: 'password_reset'
            });
        }

        // Always return success (prevent email enumeration)
        await delay(startTime, 500);
        return json({ success: true });

    } catch (error) {
        console.error('[FORGOT_PASSWORD] Error:', error);
        await delay(startTime, 500);
        return json({ success: true }); // Don't reveal errors
    }
};

// Ensure consistent response timing
async function delay(startTime: number, minMs: number): Promise<void> {
    const elapsed = Date.now() - startTime;
    if (elapsed < minMs) {
        await new Promise(resolve => setTimeout(resolve, minMs - elapsed));
    }
}
```

### `POST /api/auth/reset-password`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresUserRepository } from '$lib/server/persistence';
import { postgresPasswordResetTokenRepository } from '$lib/server/persistence/password-reset-tokens-postgres';
import { hashPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return json({ error: 'Token and password required' }, { status: 400 });
        }

        if (password.length < 8) {
            return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        // Verify token
        const userId = await postgresPasswordResetTokenRepository.verify(token);

        if (!userId) {
            return json({ error: 'Invalid or expired reset link' }, { status: 400 });
        }

        // Hash new password and update user
        const passwordHash = await hashPassword(password);
        await postgresUserRepository.updatePassword(userId, passwordHash);

        // Mark token as used
        await postgresPasswordResetTokenRepository.markUsed(token);

        return json({ success: true });

    } catch (error) {
        console.error('[RESET_PASSWORD] Error:', error);
        return json({ error: 'Failed to reset password' }, { status: 500 });
    }
};
```

---

## Phase 8: UI Pages

### `/forgot-password/+page.svelte`

```svelte
<script lang="ts">
    import { goto } from '$app/navigation';

    let email = $state('');
    let loading = $state(false);
    let submitted = $state(false);
    let error = $state('');

    async function handleSubmit(e: Event) {
        e.preventDefault();
        error = '';
        loading = true;

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            // Always show success (security - don't reveal if email exists)
            submitted = true;
        } catch (err) {
            // Still show success for security
            submitted = true;
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Forgot Password - StratAI</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-xl">
        <h1 class="text-2xl font-bold text-center mb-2">Reset Password</h1>

        {#if submitted}
            <div class="text-center">
                <div class="mb-4 p-4 bg-green-900/50 border border-green-700 rounded-lg">
                    <p class="text-green-200">
                        If an account exists with that email, you'll receive a password reset link shortly.
                    </p>
                </div>
                <a href="/login" class="text-blue-400 hover:text-blue-300">
                    Back to login
                </a>
            </div>
        {:else}
            <p class="text-gray-400 text-center mb-6">
                Enter your email and we'll send you a reset link.
            </p>

            <form onsubmit={handleSubmit}>
                <div class="mb-4">
                    <label for="email" class="block text-sm font-medium mb-2 text-gray-300">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        bind:value={email}
                        required
                        class="input-field"
                        placeholder="you@example.com"
                        autocomplete="email"
                    />
                </div>

                <button type="submit" class="w-full btn-primary" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>

            <p class="text-center mt-4">
                <a href="/login" class="text-blue-400 hover:text-blue-300 text-sm">
                    Back to login
                </a>
            </p>
        {/if}
    </div>
</div>
```

### `/reset-password/+page.svelte`

```svelte
<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';

    let password = $state('');
    let confirmPassword = $state('');
    let loading = $state(false);
    let error = $state('');
    let success = $state(false);

    // Get token from URL
    const token = $derived($page.url.searchParams.get('token') || '');

    // Password validation
    const passwordValid = $derived(password.length >= 8);
    const passwordsMatch = $derived(password === confirmPassword);
    const canSubmit = $derived(passwordValid && passwordsMatch && !loading);

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!canSubmit) return;

        error = '';
        loading = true;

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (!response.ok) {
                error = data.error || 'Failed to reset password';
                return;
            }

            success = true;
            // Redirect to login after 2 seconds
            setTimeout(() => goto('/login'), 2000);
        } catch (err) {
            error = 'An unexpected error occurred';
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Reset Password - StratAI</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-xl">
        <h1 class="text-2xl font-bold text-center mb-2">Create New Password</h1>

        {#if !token}
            <div class="text-center">
                <div class="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                    <p class="text-red-200">Invalid reset link. Please request a new one.</p>
                </div>
                <a href="/forgot-password" class="text-blue-400 hover:text-blue-300">
                    Request new reset link
                </a>
            </div>
        {:else if success}
            <div class="text-center">
                <div class="mb-4 p-4 bg-green-900/50 border border-green-700 rounded-lg">
                    <p class="text-green-200">
                        Password reset successfully! Redirecting to login...
                    </p>
                </div>
            </div>
        {:else}
            <p class="text-gray-400 text-center mb-6">
                Enter your new password below.
            </p>

            {#if error}
                <div class="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                    {error}
                </div>
            {/if}

            <form onsubmit={handleSubmit}>
                <div class="mb-4">
                    <label for="password" class="block text-sm font-medium mb-2 text-gray-300">
                        New Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        bind:value={password}
                        required
                        minlength="8"
                        class="input-field"
                        placeholder="At least 8 characters"
                        autocomplete="new-password"
                    />
                    {#if password && !passwordValid}
                        <p class="text-red-400 text-xs mt-1">Password must be at least 8 characters</p>
                    {/if}
                </div>

                <div class="mb-6">
                    <label for="confirmPassword" class="block text-sm font-medium mb-2 text-gray-300">
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        bind:value={confirmPassword}
                        required
                        class="input-field"
                        placeholder="Confirm your password"
                        autocomplete="new-password"
                    />
                    {#if confirmPassword && !passwordsMatch}
                        <p class="text-red-400 text-xs mt-1">Passwords don't match</p>
                    {/if}
                </div>

                <button type="submit" class="w-full btn-primary" disabled={!canSubmit}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>

            <p class="text-center mt-4">
                <a href="/login" class="text-blue-400 hover:text-blue-300 text-sm">
                    Back to login
                </a>
            </p>
        {/if}
    </div>
</div>
```

---

## Phase 9: Environment Variables

Add to `.env`:
```
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@stratai.app
PUBLIC_BASE_URL=https://app.stratai.app
```

Add to `.env.example`:
```
# SendGrid Email (required for password reset)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
PUBLIC_BASE_URL=http://localhost:5173
```

---

## Phase 10: Update Existing Files

### hooks.server.ts
```typescript
const PUBLIC_ROUTES = ['/login', '/logout', '/forgot-password', '/reset-password'];
```

### persistence/index.ts
```typescript
export { postgresPasswordResetTokenRepository } from './password-reset-tokens-postgres';
export { postgresEmailLogRepository } from './email-logs-postgres';
```

### login/+page.svelte

Add forgot password link after the submit button:

```svelte
<!-- Add after the submit button, before closing </form> -->
<div class="flex justify-between items-center mt-4 text-sm">
    <a href="/forgot-password" class="text-blue-400 hover:text-blue-300">
        Forgot password?
    </a>
</div>
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Token theft | SHA256 hashed in DB, plain only in email |
| Token reuse | Single-use, marked on consumption |
| Brute force | Rate limiting by email + IP |
| Email enumeration | Consistent response + timing |
| Timing attacks | 500ms minimum response time |
| Token expiry | 1-hour lifetime |

---

## Email Roadmap

### Priority Tier 1: Security & Trust (Critical)

These emails are essential for security and user trust. Implement first.

#### 1. Email Verification
**Priority:** Critical
**Status:** Not started
**Complexity:** Low (reuses password reset token pattern)

**Purpose:** Verify user email ownership, prevent fake accounts

**Implementation:**
- Reuse `password_reset_tokens` table (add `token_type` column)
- Or create separate `email_verification_tokens` table
- Send verification email on signup
- Block certain features until verified (optional)
- Add `email_verified` boolean to users table

**Template:** Simple "Verify Your Email" with CTA button

**Dependencies:**
- Existing: Token repository pattern, email service
- New: User registration flow integration

---

#### 2. Password Changed Notification
**Priority:** High
**Status:** Not started
**Complexity:** Very Low

**Purpose:** Security alert when password is changed (detect unauthorized changes)

**Implementation:**
- Trigger email after successful password update
- No token needed (notification only)
- Include timestamp, IP address, device info
- "Wasn't you? Reset your password" CTA

**Template:** Security alert style (yellow/orange warning)

**Dependencies:**
- Modify `updatePassword()` method to trigger email
- Optional: Track login sessions for device info

---

#### 3. Suspicious Activity Alert
**Priority:** Medium
**Status:** Not started
**Complexity:** Medium (requires activity tracking)

**Purpose:** Alert users to unusual login patterns

**Triggers:**
- Login from new IP/location
- Multiple failed login attempts
- Password reset from unknown IP

**Implementation:**
- Track login history (IP, timestamp, user agent)
- Anomaly detection (new location, unusual time)
- Rate limiting bypass attempts

**Template:** Security alert with "Secure my account" CTA

**Dependencies:**
- Login history tracking table
- Geolocation lookup (optional)

---

### Priority Tier 2: Team Collaboration (High - Enterprise Core)

These emails enable the multi-tenant collaboration features. High business value.

#### 4. Organization Invitation
**Priority:** Critical for multi-tenant
**Status:** Not started
**Complexity:** Medium

**Purpose:** Invite users to join an organization

**Flow:**
1. Admin invites user by email
2. Email sent with invite link
3. User clicks link → auto-creates account or links existing account
4. User added to organization with specified role

**Implementation:**
- New table: `organization_invites` (email, org_id, role, token_hash, expires_at)
- Invitation tokens (7-day expiration, single-use)
- Handle existing vs new users
- Conflict resolution (already a member)

**Template:** "You've been invited to join [Org Name] on StratAI"

**Dependencies:**
- Organization membership system (already exists)
- Role assignment logic

---

#### 5. Space Sharing Invitation
**Priority:** High
**Status:** Not started
**Complexity:** Medium

**Purpose:** Share a Space with another user (cross-organization)

**Context:** From DOCUMENT_SHARING.md - Spaces can be shared across orgs

**Flow:**
1. User shares Space with email address
2. Email sent with invitation link
3. Recipient accepts → granted access to Space

**Implementation:**
- New table: `space_invites` (email, space_id, role, token_hash, expires_at)
- Access control updates
- Notification to owner when accepted

**Template:** "[User] invited you to collaborate on [Space Name]"

**Dependencies:**
- Space sharing access control (planned)
- Cross-org Space access

---

#### 6. Area Sharing Invitation
**Priority:** High
**Status:** Not started
**Complexity:** Medium

**Purpose:** Share an Area with users or groups

**Context:** From ENTITY_MODEL.md - Areas support granular sharing

**Flow:**
1. User shares Area with user/group
2. Email sent to affected users
3. Recipients can access shared Area

**Implementation:**
- Use existing `area_memberships` table
- Email notification when added
- Batch emails for group additions

**Template:** "[User] shared [Area Name] with you"

**Dependencies:**
- Area sharing implementation (planned)
- area_memberships table

---

#### 7. Group Membership Notification
**Priority:** Medium
**Status:** Not started
**Complexity:** Low

**Purpose:** Notify users when added to a group

**Flow:**
1. Admin adds user to group
2. User receives notification email
3. Email explains group permissions

**Implementation:**
- Trigger on group_memberships INSERT
- List group permissions/access
- Link to group settings

**Template:** "You've been added to [Group Name]"

**Dependencies:**
- Groups system (already exists)
- Group permissions display

---

### Priority Tier 3: Activity & Engagement (Medium)

These emails keep users engaged and informed about activity.

#### 8. @Mention Notifications
**Priority:** Medium
**Status:** Not started
**Complexity:** Medium

**Purpose:** Notify users when mentioned in conversations

**Flow:**
1. User types @username in conversation
2. Email sent to mentioned user
3. Email includes context snippet
4. Click link → jump to conversation

**Implementation:**
- Parse messages for @mentions
- Batch mentions (don't spam per message)
- User preference: real-time vs digest
- Mark as read when user views

**Template:** "[User] mentioned you in [Area/Space]"

**Dependencies:**
- @mention parsing in message handler
- User notification preferences
- Deep linking to conversation position

---

#### 9. Task Assignment
**Priority:** Medium
**Status:** Not started
**Complexity:** Low

**Purpose:** Notify users when assigned a task

**Context:** From ENTITY_MODEL.md - Tasks support assignment

**Flow:**
1. Task assigned to user
2. Email sent with task details
3. Click link → view task

**Implementation:**
- Trigger on task assignment
- Include task title, due date, priority
- Link to task in context

**Template:** "[User] assigned you: [Task Title]"

**Dependencies:**
- Task assignment system
- Task detail page/modal

---

#### 10. Document Shared Notification
**Priority:** Medium
**Status:** Not started
**Complexity:** Low

**Purpose:** Notify when document is shared with user's Area

**Context:** From DOCUMENT_SHARING.md - Documents shared at Area level

**Flow:**
1. Document shared with Area
2. Email sent to Area members
3. Link to document viewer

**Implementation:**
- Trigger on document_area_shares INSERT
- Batch for multiple members
- Show document preview/summary

**Template:** "[User] shared [Document] in [Area Name]"

**Dependencies:**
- Document sharing implementation (planned)

---

#### 11. Page Shared Notification
**Priority:** Low
**Status:** Not started
**Complexity:** Low

**Purpose:** Notify when Page visibility changes to 'shared'

**Context:** From DOCUMENT_SYSTEM.md (Pages) - Pages have private/shared visibility

**Flow:**
1. Page owner sets visibility to 'shared'
2. Email sent to Area members
3. Link to page

**Implementation:**
- Trigger on pages visibility update
- Include page type and preview
- Batch for Area members

**Template:** "[User] shared [Page Title] with your Area"

**Dependencies:**
- Pages system (already exists)

---

### Priority Tier 4: Administrative (Medium - Enterprise Operations)

#### 12. Usage Quota Warnings
**Priority:** High for paid tiers
**Status:** Not started
**Complexity:** Medium

**Purpose:** Alert organizations before hitting usage limits

**Triggers:**
- 80% of monthly quota consumed
- 90% of monthly quota consumed
- 100% quota reached (service paused)

**Implementation:**
- Check usage_records aggregates
- Send to org admins only
- Include current usage, limit, billing period
- Upgrade CTA for free tier

**Template:** "Usage Alert: [80%] of your StratAI quota used"

**Dependencies:**
- Usage tracking system (already exists)
- Organization admin role detection

---

#### 13. Billing Notifications
**Priority:** High for paid tiers
**Status:** Not started
**Complexity:** Low

**Purpose:** Payment confirmations, failed payments, invoice delivery

**Types:**
- Payment successful (monthly receipt)
- Payment failed (retry instructions)
- Plan upgraded/downgraded
- Subscription canceled

**Implementation:**
- Integrate with payment provider webhooks (Stripe/Paddle)
- Include invoice PDF attachment
- Link to billing portal

**Template:** Various (receipt, alert, confirmation)

**Dependencies:**
- Payment provider integration (future)

---

#### 14. New Member Joined
**Priority:** Low
**Status:** Not started
**Complexity:** Low

**Purpose:** Notify org admins when new member joins

**Flow:**
1. User accepts org invite
2. Email sent to org admins
3. Shows new member name, email, role

**Implementation:**
- Trigger on org_memberships INSERT (where invite accepted)
- Send to admins only
- Include member profile link

**Template:** "[User] joined your organization"

**Dependencies:**
- Organization admin detection

---

### Priority Tier 5: Product & Retention (Low - Growth Features)

#### 15. Weekly Activity Digest
**Priority:** Low
**Status:** Not started
**Complexity:** High

**Purpose:** Re-engage users, show activity summary

**Content:**
- Conversations this week
- Tasks completed
- Documents added
- Team activity

**Implementation:**
- Scheduled job (weekly cron)
- Aggregate user activity
- User preference (opt-in/out, frequency)
- Only send if activity exists

**Template:** Rich HTML with activity cards

**Dependencies:**
- Activity aggregation queries
- User notification preferences
- Scheduled job infrastructure

---

#### 16. Feature Announcements
**Priority:** Low
**Status:** Not started
**Complexity:** Low

**Purpose:** Announce new features, updates, tips

**Flow:**
1. Admin creates announcement
2. Email sent to all users (or segment)
3. Track opens/clicks

**Implementation:**
- Admin panel for announcements
- User segments (free vs paid, active vs inactive)
- SendGrid marketing features
- Unsubscribe support (required by law)

**Template:** Marketing email with imagery

**Dependencies:**
- Admin announcement system
- Marketing email compliance (CAN-SPAM, GDPR)

---

#### 17. Onboarding Email Series
**Priority:** Low
**Status:** Not started
**Complexity:** High

**Purpose:** Help new users discover features

**Series:**
- Day 1: Welcome + getting started
- Day 3: Spaces & Areas explained
- Day 7: Advanced features (Model Arena, Documents)
- Day 14: Team collaboration

**Implementation:**
- User journey tracking
- Drip campaign logic
- Conditional sends (skip if user already active)
- A/B testing support

**Template:** Educational emails with screenshots

**Dependencies:**
- User onboarding state tracking
- Drip campaign infrastructure

---

## Implementation Priority Queue

### Immediate Next (Post-Password Reset)

1. **Email Verification** (Security + Trust)
2. **Organization Invitation** (Unlock multi-tenant)
3. **Password Changed Notification** (Security alert)

### Q1 Priorities (Enterprise Collaboration)

4. **Space Sharing Invitation**
5. **Area Sharing Invitation**
6. **Usage Quota Warnings**

### Q2 Priorities (Engagement & Activity)

7. **@Mention Notifications**
8. **Task Assignment**
9. **Document Shared Notification**
10. **Group Membership Notification**

### Future (Growth & Retention)

11. **New Member Joined**
12. **Page Shared Notification**
13. **Billing Notifications**
14. **Weekly Activity Digest**
15. **Feature Announcements**
16. **Onboarding Email Series**

---

## Technical Patterns by Email Type

### Token-Based Emails (One-Time Actions)

**Pattern:** Create token → Send email → User clicks → Verify token → Action

**Examples:**
- Email verification
- Organization invites
- Space sharing invites
- Password reset (✅ implemented)

**Shared Infrastructure:**
- Token generation and hashing
- Expiration logic
- Single-use enforcement
- Database table: `[feature]_tokens`

---

### Notification Emails (No Action Required)

**Pattern:** Event occurs → Send email → User informed

**Examples:**
- Password changed
- Task assigned
- @Mentions
- Document shared
- Group membership added

**Implementation:**
- Simple trigger on database events
- No token needed
- Optional: "View in app" CTA link
- Batch when appropriate (avoid spam)

---

### Digest Emails (Aggregated Content)

**Pattern:** Scheduled job → Aggregate data → Send summary

**Examples:**
- Weekly activity digest
- Daily task reminders
- Usage summaries

**Implementation:**
- Cron job infrastructure
- Aggregation queries
- User preferences (frequency, opt-out)
- Only send if content exists

---

### Transactional Emails (Critical Business Events)

**Pattern:** Business event → Immediate email → User action

**Examples:**
- Billing/payment emails
- Security alerts
- Quota warnings

**Implementation:**
- High priority delivery
- Cannot be unsubscribed from
- Include support contact info

---

## Email Preference System (Future)

**User Controls:**
- ✅ Security emails (always on - can't disable)
- ⚙️ Team collaboration (invites, sharing)
- ⚙️ Activity notifications (mentions, assignments)
- ⚙️ Digests (frequency: daily, weekly, never)
- ⚙️ Product updates (announcements, tips)

**Database:**
```sql
CREATE TABLE user_email_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    security_emails BOOLEAN DEFAULT true,      -- Can't disable
    collaboration_emails BOOLEAN DEFAULT true,
    activity_emails BOOLEAN DEFAULT true,
    digest_frequency TEXT DEFAULT 'weekly',    -- daily, weekly, never
    product_emails BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation:**
- Add preferences to user settings page
- Check preferences before sending (except security emails)
- Include unsubscribe link (legal requirement for marketing)

---

## SendGrid Webhooks (Event Tracking)

**Purpose:** Track email delivery, opens, clicks, bounces

**Events to Track:**
- `delivered` - Email successfully delivered
- `bounce` - Email bounced (invalid address)
- `open` - User opened email (tracking pixel)
- `click` - User clicked link in email

**Implementation:**
```typescript
// POST /api/webhooks/sendgrid
// Receives events from SendGrid
// Updates email_logs.status based on event type
```

**Benefits:**
- Detect invalid email addresses (clean database)
- Track engagement metrics
- Identify delivery issues
- Update email_logs automatically

**Setup:**
- Configure webhook URL in SendGrid dashboard
- Verify webhook signature (security)
- Handle batch events (SendGrid sends in batches)

---

## Email Template System (Future Enhancement)

**Current:** Templates hardcoded in `templates.ts`
**Future:** Database-driven templates with admin editor

**Tables:**
```sql
CREATE TABLE email_templates (
    id UUID PRIMARY KEY,
    email_type TEXT NOT NULL,              -- matches EmailType
    name TEXT NOT NULL,
    subject_template TEXT NOT NULL,        -- "Reset your {{app_name}} password"
    html_template TEXT NOT NULL,
    text_template TEXT NOT NULL,
    variables JSONB,                       -- {"userName": "string", "resetLink": "url"}
    is_active BOOLEAN DEFAULT true,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Benefits:**
- Admins can edit templates without code deployment
- A/B testing different subject lines
- Multi-language support
- Version history

**Complexity:** High - requires template engine, admin UI, validation

---

## Cost & Compliance Considerations

### SendGrid Pricing Tiers

| Tier | Price | Emails/Month | Use Case |
|------|-------|--------------|----------|
| Free | $0 | 100/day (~3,000/mo) | Development, small teams |
| Essentials | $20/mo | 50,000 | Growing teams |
| Pro | $90/mo | 1,500,000 | Enterprise |

**StratAI Impact:**
- Password reset: Low volume (sporadic)
- Email verification: 1 per new user signup
- Invitations: Moderate (team growth)
- Notifications: High volume (if not batched)
- Digests: Predictable (weekly per user)

**Cost Management:**
- Batch notifications (daily digest of mentions)
- User preferences to reduce volume
- Monitor email_logs for sending patterns

### Legal Compliance

**CAN-SPAM Act (US):**
- ✅ Accurate "From" name and email
- ✅ Clear subject line
- ⚠️ Include physical address (add to templates)
- ⚠️ Unsubscribe mechanism (for marketing emails)

**GDPR (EU):**
- ✅ Legitimate interest for transactional emails
- ⚠️ Explicit consent for marketing emails
- ⚠️ User data export must include email logs
- ✅ Right to be forgotten (delete email_logs on user deletion)

**Implementation:**
- Add company address to email templates (footer)
- Unsubscribe link in non-transactional emails
- Track consent for marketing emails
- Include email_logs in data export

---

## Recommended Implementation Order

### Phase 1: Security Foundation (Month 1)
1. ✅ Password reset (complete)
2. Email verification
3. Password changed notification

### Phase 2: Collaboration Core (Month 2)
4. Organization invitation
5. Space sharing invitation
6. Area sharing invitation

### Phase 3: Activity & Engagement (Month 3)
7. @Mention notifications
8. Task assignment
9. Document shared notification
10. Usage quota warnings

### Phase 4: Advanced Features (Month 4+)
11. SendGrid webhooks (delivery tracking)
12. Email preferences system
13. Weekly activity digest
14. Billing notifications

### Phase 5: Growth & Retention (Future)
15. Onboarding email series
16. Feature announcements
17. Database-driven template system

---

## Success Metrics

**Track for each email type:**
- **Send volume**: Total emails sent per day/week
- **Delivery rate**: Sent ÷ Delivered (should be >95%)
- **Bounce rate**: Bounces ÷ Sent (should be <5%)
- **Open rate**: Opens ÷ Delivered (transactional: 60-80%)
- **Click rate**: Clicks ÷ Opens (varies by email)

**Query from email_logs:**
```sql
SELECT
    email_type,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM email_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY email_type;
```

**Red flags:**
- Bounce rate >10% (list hygiene issue)
- Delivery rate <90% (SendGrid config issue)
- High failure rate (API issues)

---

## Architecture Notes

The current email infrastructure is designed for extensibility:

✅ **EmailType enum** - Add new types easily
✅ **Email logs** - Audit trail for all email types
✅ **Template pattern** - Add templates in templates.ts
✅ **SendGrid service** - Reusable for all emails
✅ **Rate limiting** - Extend for other email types

**When adding new email types:**
1. Add to `EmailType` enum in `src/lib/types/email.ts`
2. Add CHECK constraint to migration
3. Create template function in `templates.ts`
4. Trigger email in appropriate service layer
5. Update email_logs queries if needed

---

## Implementation Checklist

### Phase 0: Prerequisites
- [ ] Add `findByEmailGlobal()` method to `src/lib/server/persistence/users-postgres.ts`
- [ ] Add `updatePassword()` method to `src/lib/server/persistence/users-postgres.ts`
- [ ] Update `UserRepository` interface in `src/lib/server/persistence/types.ts`

### Phase 1-6: Core Infrastructure
- [ ] Create migration `027-email-system.sql`
- [ ] Create types in `src/lib/types/email.ts`
- [ ] Create token repository `src/lib/server/persistence/password-reset-tokens-postgres.ts`
- [ ] Create email logs repository `src/lib/server/persistence/email-logs-postgres.ts`
- [ ] Create SendGrid service `src/lib/server/email/sendgrid.ts`
- [ ] Create email templates `src/lib/server/email/templates.ts`
- [ ] Create barrel export `src/lib/server/email/index.ts`

### Phase 7-8: API & UI
- [ ] Create forgot-password API endpoint `src/routes/api/auth/forgot-password/+server.ts`
- [ ] Create reset-password API endpoint `src/routes/api/auth/reset-password/+server.ts`
- [ ] Create forgot-password UI page `src/routes/forgot-password/+page.svelte`
- [ ] Create reset-password UI page `src/routes/reset-password/+page.svelte`

### Phase 9-10: Integration
- [ ] Update PUBLIC_ROUTES in `hooks.server.ts`
- [ ] Add forgot password link to login page
- [ ] Update `.env.example` with SendGrid vars
- [ ] Update `persistence/index.ts` exports

### Verification
- [ ] `npm run check` passes
- [ ] Test forgot password flow (valid email, invalid email, rate limiting)
- [ ] Test reset password flow (valid token, expired token, used token)
- [ ] Verify email delivery in SendGrid dashboard
- [ ] Test on production

---

## Verification

1. **Forgot password flow:**
   - Submit valid email → check email received
   - Submit invalid email → same success message (no enumeration)
   - Submit 6 times rapidly → rate limited

2. **Reset password flow:**
   - Valid token → password reset success
   - Expired token → error message
   - Already used token → error message
   - Reuse same link → error message

3. **Email delivery:**
   - Check SendGrid dashboard for delivery status
   - Verify email_logs table populated

4. **TypeScript check:** `npm run check` passes

5. **Production:** Test with real email on deployed server
