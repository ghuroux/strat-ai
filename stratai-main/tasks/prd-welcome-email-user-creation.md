# PRD: Welcome Email on User Creation

**Parent Task ID:** welcome-email-user-creation
**Created:** 2026-01-16
**Estimated Effort:** ~3-4 hours (7 stories)

---

## Introduction

When admins create new users, the system will automatically send a secure welcome email with a "Set Password" link instead of requiring the admin to manually share passwords. This improves security (no passwords in email or shared verbally) and provides a better user experience.

---

## Research Findings

### Similar Patterns Found
- `src/lib/server/persistence/password-reset-tokens-postgres.ts` - Token generation, hashing, verification
- `src/lib/server/email/templates.ts` - Email template structure (HTML + plain text)
- `src/lib/server/email/sendgrid.ts` - SendGrid integration with audit logging
- `src/routes/admin/members/+page.server.ts` - User creation flow, form actions

### Existing Infrastructure
- **password_reset_tokens table**: Already has token_hash, expires_at, used_at columns
- **SendGrid integration**: Fully functional with audit logging
- **Email templates**: Pattern established in templates.ts
- **Admin members page**: Has Invitations tab placeholder showing "(0)"

### Migration Numbering
- Next available migration number: 039

---

## Goals

1. **Improve Security**: No passwords shared via email or verbally
2. **Streamline Admin Workflow**: One-click user creation, automatic notification
3. **Track Pending Users**: Invitations tab shows who hasn't set up their account
4. **Enable Recovery**: Admins can resend welcome emails for expired links

---

## User Stories

### US-001: Add token_type column to password_reset_tokens table

**Description:** As a developer, I need to distinguish between password reset tokens and welcome tokens so that different expiration times and flows can be applied.

**Files:**
- `src/lib/server/persistence/migrations/039-welcome-tokens.sql`

**Acceptance Criteria:**
- [ ] Migration 039-welcome-tokens.sql creates token_type column with CHECK constraint for 'reset' and 'welcome' values
- [ ] Existing tokens default to 'reset' type
- [ ] Index created on token_type column for efficient lookup
- [ ] Migration is idempotent (IF NOT EXISTS / IF EXISTS patterns)
- [ ] email_logs_type_check constraint updated to include 'welcome' email type
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-002: Create welcome email template

**Description:** As a system, I need a professional welcome email template so that new users receive a branded, informative email with their set password link.

**Files:**
- `src/lib/server/email/templates.ts`

**Acceptance Criteria:**
- [ ] getWelcomeEmail() function added to templates.ts
- [ ] Template includes: greeting with firstName, organization name, set password button, email reminder, 7-day expiration note
- [ ] Both HTML and plain text versions provided
- [ ] createSetPasswordLink() helper function created
- [ ] Template matches existing password reset email styling (purple gradient header)
- [ ] Subject line: 'Welcome to StratAI - Set Your Password'
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-003: Update token repository to support token types and variable expiration

**Description:** As a developer, I need the token repository to support different token types with their own expiration times so that welcome tokens can expire in 7 days while reset tokens expire in 1 hour.

**Files:**
- `src/lib/server/persistence/password-reset-tokens-postgres.ts`
- `src/lib/types/email.ts`

**Schema Context:**

| Column (snake_case) | Property (camelCase) | Type | Nullable |
|---------------------|----------------------|------|----------|
| token_type | tokenType | string | NO |

**Acceptance Criteria:**
- [ ] TOKEN_EXPIRY_MINUTES constant replaced with TOKEN_EXPIRY_MINUTES object: { reset: 60, welcome: 10080 }
- [ ] create() method accepts optional tokenType parameter (defaults to 'reset')
- [ ] create() uses correct expiration based on tokenType
- [ ] verify() method accepts optional expectedType parameter to validate token type matches
- [ ] PasswordResetTokenRow interface updated to include tokenType field
- [ ] rowToToken() converter updated to include tokenType
- [ ] createByEmail() method added for welcome tokens (creates token by email, not userId)
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-004: Create set-password page for welcome emails

**Description:** As a new user, I need a dedicated set-password page so that I can set my password after receiving a welcome email.

**Files:**
- `src/routes/set-password/+page.svelte`
- `src/routes/set-password/+page.server.ts`
- `src/hooks.server.ts` (PUBLIC_ROUTES)

**Acceptance Criteria:**
- [ ] Route created at /set-password with +page.svelte and +page.server.ts
- [ ] Page validates token on load via URL parameter
- [ ] Invalid/expired/used token shows appropriate error message with contact administrator guidance
- [ ] Form has password and confirm password fields with validation
- [ ] Passwords must match validation
- [ ] On successful submission: password set, token marked as used, redirect to /login with success message
- [ ] Route added to PUBLIC_ROUTES in hooks.server.ts
- [ ] Page styling matches existing reset-password page
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-005: Update admin create user flow to send welcome email

**Description:** As an admin, I want user creation to automatically send a welcome email so that new users receive secure access without me manually sharing passwords.

**Files:**
- `src/routes/admin/members/+page.server.ts`
- `src/routes/admin/members/+page.svelte`

**Acceptance Criteria:**
- [ ] Password field removed from create user form in +page.svelte
- [ ] Info message added: 'A welcome email will be sent with a link to set password'
- [ ] Create action in +page.server.ts: removes password from required fields
- [ ] Create action: creates user with random placeholder password hash (cannot be used to login)
- [ ] Create action: creates welcome token using createByEmail()
- [ ] Create action: sends welcome email via sendEmail()
- [ ] Create action: if email fails, rolls back user creation and returns error
- [ ] Success message shows 'User created. Welcome email sent to {email}'
- [ ] createForm state in +page.svelte no longer includes password field
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-006: Add resend welcome email action

**Description:** As an admin, I need to resend welcome emails for users who haven't set their password yet so that they can receive a fresh link if the original expired.

**Files:**
- `src/routes/admin/members/+page.server.ts`
- `src/routes/admin/members/+page.svelte`

**Acceptance Criteria:**
- [ ] resendWelcome action added to +page.server.ts
- [ ] Action validates user has never logged in (lastLoginAt IS NULL)
- [ ] Action creates new welcome token (invalidates any existing tokens)
- [ ] Action sends new welcome email
- [ ] Action is rate limited: max 3 resends per user per hour
- [ ] Resend button visible in user actions menu for users with lastLoginAt === null
- [ ] Success message: 'Welcome email resent to {email}'
- [ ] Error message if rate limited: 'Please wait before resending'
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-007: Populate Invitations tab with pending invitations

**Description:** As an admin, I want to see pending invitations in the Invitations tab so that I can track who hasn't set up their account yet and take action.

**Files:**
- `src/routes/admin/members/+page.server.ts`
- `src/routes/admin/members/+page.svelte`

**Acceptance Criteria:**
- [ ] Load function queries pending invitations: users with lastLoginAt IS NULL
- [ ] Query joins with password_reset_tokens to get welcome token status (pending/expired)
- [ ] Invitations tab shows count: 'Invitations ({count})'
- [ ] Table displays: Email, Invited date (user created_at), Expires (token expires_at), Status (pending/expired), Actions
- [ ] Status shows 'Pending' if valid token exists, 'Expired' if token expired or missing
- [ ] Resend button sends new welcome email
- [ ] Revoke button deletes user entirely (with confirmation modal)
- [ ] Users with lastLoginAt NOT shown in Invitations tab
- [ ] Users move from Invitations to Members after setting password and logging in
- [ ] Members tab filters out users who appear in Invitations tab
- [ ] npm run check passes
- [ ] npm run lint passes

---

## Non-Goals

- Email verification (users are invited by admins, not self-registering)
- Bulk user import with welcome emails (V2)
- Custom welcome email templates per organization (V2)
- Integration with external identity providers (handled separately)

---

## Technical Considerations

### Token Expiration
| Token Type | Expiration |
|------------|------------|
| Password Reset | 1 hour |
| Welcome | 7 days |

### Security
1. **No password in email** - Only secure link
2. **Token hashed in database** - SHA256, like password reset
3. **Single-use tokens** - Deleted after password set
4. **Rate limiting on resend** - Prevent abuse
5. **Placeholder password** - User can't login until they set password

### Error Handling
| Scenario | Behavior |
|----------|----------|
| Email send fails | User NOT created, show error |
| Token expired | Show "Link expired. Contact admin." |
| Token already used | Show "Link already used." |
| Invalid token | Show "Invalid link. Contact admin." |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| SendGrid rate limits | Use existing rate limiting infrastructure |
| Email delivery issues | Provide resend action and clear error messages |
| Users losing emails | Invitations tab shows pending users, admins can resend |
| Token brute-force | SHA256 hashing, single-use, 7-day expiration |

---

## Related Documentation

- **Spec:** `docs/features/WELCOME_EMAIL_ON_USER_CREATION.md`
- **SendGrid Integration:** `docs/SENDGRID_EMAIL_INTEGRATION.md`
- **Password Reset Flow:** `src/routes/reset-password/`
- **Email Templates:** `src/lib/server/email/templates.ts`
