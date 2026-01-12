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
import { postgresEmailLogRepository } from '$lib/server/persistence';

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

---

## Phase 5: Password Reset Token Repository

### `src/lib/server/persistence/password-reset-tokens-postgres.ts`

```typescript
import { createHash, randomBytes } from 'crypto';
import sql from './db';
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

        // Check by email
        const emailAttempts = await sql<{ count: number }[]>`
            SELECT COUNT(*)::int as count
            FROM password_reset_attempts
            WHERE email = ${email}
              AND attempted_at > NOW() - INTERVAL '${sql.unsafe(String(windowMinutes))} minutes'
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
                  AND attempted_at > NOW() - INTERVAL '${sql.unsafe(String(windowMinutes))} minutes'
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
import sql from './db';
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
            VALUES (${input.orgId}, ${input.userId}, ${input.emailType}, ${input.recipientEmail}, ${input.subject}, ${JSON.stringify(input.metadata || {})})
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

        // Find user
        const user = await postgresUserRepository.findByEmail(normalizedEmail);

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
                orgId: user.orgId || undefined,
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

Simple form with:
- Email input
- Submit button with loading state
- Success message (always shown after submit for security)
- Link back to login

### `/reset-password/+page.svelte`

- Extract token from URL query param
- Password + confirm password inputs
- Password strength indicator
- Submit button with loading state
- Success: redirect to login
- Error: show invalid/expired message with link to try again

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
Add "Forgot password?" link below login form pointing to `/forgot-password`

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

## Future Expansion

This architecture supports:

1. **Email Verification** - Same token pattern, different template
2. **Team Invites** - Org-scoped tokens with role assignment
3. **Notifications** - Task assignments, mentions, digests
4. **Webhooks** - SendGrid event webhooks for delivery tracking

---

## Implementation Checklist

- [ ] Create migration `027-email-system.sql`
- [ ] Create types in `src/lib/types/email.ts`
- [ ] Create token repository
- [ ] Create email logs repository
- [ ] Create SendGrid service
- [ ] Create email templates
- [ ] Create forgot-password API endpoint
- [ ] Create reset-password API endpoint
- [ ] Create forgot-password UI page
- [ ] Create reset-password UI page
- [ ] Update PUBLIC_ROUTES in hooks.server.ts
- [ ] Add forgot password link to login page
- [ ] Update .env.example
- [ ] Update persistence/index.ts exports
- [ ] Test end-to-end flow
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
