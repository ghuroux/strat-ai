# Welcome Email on User Creation

> **Status:** Ready for Implementation
> **Created:** 2026-01-16
> **Effort:** ~3-4 hours (7 phases)

---

## Implementation Summary

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Database migration (add `token_type` column) | ~15 mins |
| 2 | Welcome email template | ~20 mins |
| 3 | Token repository updates (types, expiration) | ~20 mins |
| 4 | Set password page | ~30 mins |
| 5 | Update admin create user flow | ~30 mins |
| 6 | Resend welcome email action | ~20 mins |
| 7 | **Invitations tab** (populate pending invitations) | ~45 mins |

---

## Problem Statement

When an admin creates a new user, there's no automated way to notify them. The admin must manually communicate login credentials (copy/paste email, verbal, etc.). This is:
- **Inconvenient** - Extra manual step for every user
- **Insecure** - Passwords may be shared via insecure channels
- **Poor UX** - New user doesn't know their account exists

---

## Solution

When admin creates a user, automatically send a **welcome email with a secure "Set Password" link**. The new user:
1. Receives professional welcome email
2. Clicks link to set their own password
3. Logs in with their chosen password

**Key decisions:**
- **Set password link** (not password in email) - More secure
- **Automatic on create** - No extra button clicks for admin
- **Block creation if email fails** - Ensures user always receives access

---

## User Flow

### Admin Flow
```
Admin clicks "Add User"
    ↓
Fills form (email, username, firstName, lastName, role)
    ↓
[Password field REMOVED - user sets their own]
    ↓
Clicks "Create User"
    ↓
System creates user + sends welcome email
    ↓
Success: "User created. Welcome email sent to {email}"
    ↓
[If email fails: User NOT created, show error]
```

### New User Flow
```
Receives welcome email
    ↓
Clicks "Set Your Password" button
    ↓
Taken to /set-password?token=xxx
    ↓
Enters + confirms new password
    ↓
Success: Redirected to login
    ↓
Logs in with email + new password
```

---

## Technical Design

### Reuse Existing Infrastructure

The **password reset** system already provides:
- `password_reset_tokens` table (secure token storage with expiration)
- `password_reset_attempts` table (rate limiting)
- Token generation + hashing
- `/reset-password` page for setting password
- SendGrid email integration

**Strategy:** Create new "welcome" token type and email template, reuse token infrastructure and password-setting page.

### Database Changes

**Option A: Add token type to existing table (Recommended)**

```sql
-- Add type column to distinguish welcome vs reset tokens
ALTER TABLE password_reset_tokens
ADD COLUMN token_type TEXT DEFAULT 'reset' CHECK (token_type IN ('reset', 'welcome'));

-- Update index for efficient lookup
CREATE INDEX idx_password_reset_tokens_type ON password_reset_tokens(token_type);
```

**Option B: Separate table**

Not recommended - duplicates logic unnecessarily.

### Token Expiration

| Token Type | Expiration |
|------------|------------|
| Password Reset | 1 hour |
| Welcome | 7 days |

Longer expiration for welcome emails because:
- User may not check email immediately
- Less urgency than "I forgot my password"
- Still secure (single-use, hashed)

### Files to Modify/Create

| File | Change |
|------|--------|
| `src/lib/server/persistence/migrations/039-welcome-tokens.sql` | Add `token_type` column |
| `src/lib/server/email/templates.ts` | Add `getWelcomeEmail()` template |
| `src/lib/server/persistence/password-reset-tokens-postgres.ts` | Update to support token types |
| `src/routes/admin/members/+page.server.ts` | Remove password field, send welcome email |
| `src/routes/admin/members/+page.svelte` | Remove password input from create form |
| `src/routes/set-password/+page.svelte` | New page (or reuse reset-password) |
| `src/routes/set-password/+page.server.ts` | Handle welcome token validation |

---

## Email Template

### Subject
```
Welcome to StratAI - Set Your Password
```

### HTML Content
```
┌─────────────────────────────────────────────┐
│ [StratAI Logo/Header - Purple Gradient]     │
├─────────────────────────────────────────────┤
│                                             │
│  Welcome to StratAI!                        │
│                                             │
│  Hi {firstName},                            │
│                                             │
│  You've been invited to join {orgName}      │
│  on StratAI. Click the button below to      │
│  set your password and get started:         │
│                                             │
│  ┌─────────────────────────────────┐        │
│  │     Set Your Password           │        │
│  └─────────────────────────────────┘        │
│                                             │
│  This link expires in 7 days.               │
│                                             │
│  Your login details:                        │
│  • Email: {email}                           │
│  • Organization: {orgName}                  │
│                                             │
│  ─────────────────────────────────────────  │
│  If button doesn't work, copy this link:    │
│  {setPasswordLink}                          │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database Migration (~15 mins)

Create migration to add `token_type` column.

**File:** `src/lib/server/persistence/migrations/039-welcome-tokens.sql`

```sql
-- Add token_type to distinguish welcome emails from password resets
ALTER TABLE password_reset_tokens
ADD COLUMN IF NOT EXISTS token_type TEXT DEFAULT 'reset'
CHECK (token_type IN ('reset', 'welcome'));

-- Default existing tokens to 'reset'
UPDATE password_reset_tokens SET token_type = 'reset' WHERE token_type IS NULL;

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_type
ON password_reset_tokens(token_type);

COMMENT ON COLUMN password_reset_tokens.token_type IS
'Token type: reset (password recovery) or welcome (new user setup)';
```

**Acceptance Criteria:**
- [ ] Migration runs successfully
- [ ] Existing tokens default to 'reset'
- [ ] New tokens can be 'reset' or 'welcome'

### Phase 2: Welcome Email Template (~20 mins)

Add welcome email template to existing templates file.

**File:** `src/lib/server/email/templates.ts`

**Acceptance Criteria:**
- [ ] `getWelcomeEmail()` function created
- [ ] Template includes: greeting, org name, set password button, email reminder
- [ ] Both HTML and plain text versions
- [ ] `createSetPasswordLink()` helper function

### Phase 3: Token Repository Updates (~20 mins)

Update token repository to support token types.

**File:** `src/lib/server/persistence/password-reset-tokens-postgres.ts`

Changes:
- `createToken()` accepts optional `tokenType` parameter
- `validateToken()` checks token type matches expected
- `TOKEN_EXPIRY` constant becomes `TOKEN_EXPIRY_MINUTES: { reset: 60, welcome: 10080 }` (7 days)

**Acceptance Criteria:**
- [ ] Can create tokens with type 'reset' or 'welcome'
- [ ] Welcome tokens expire in 7 days
- [ ] Reset tokens still expire in 1 hour
- [ ] Validation checks token type

### Phase 4: Set Password Page (~30 mins)

Create new page for setting password from welcome email.

**Files:**
- `src/routes/set-password/+page.svelte`
- `src/routes/set-password/+page.server.ts`

**Note:** Could potentially reuse `/reset-password` with query param to differentiate messaging, but separate page gives cleaner UX.

**Acceptance Criteria:**
- [ ] Page validates token on load
- [ ] Shows error if token expired/invalid
- [ ] Password + confirm password fields
- [ ] On success: sets password, deletes token, redirects to login
- [ ] Success message: "Password set! You can now log in."

### Phase 5: Update Admin Create User (~30 mins)

Modify user creation to send welcome email instead of setting password.

**Files:**
- `src/routes/admin/members/+page.server.ts`
- `src/routes/admin/members/+page.svelte`

Changes to `+page.server.ts` `create` action:
1. Remove password from required fields
2. Create user with random placeholder password hash
3. Create welcome token
4. Send welcome email
5. If email fails: rollback user creation, return error
6. Return success with "Welcome email sent" message

Changes to `+page.svelte`:
1. Remove password field from create form
2. Update success message to mention email sent
3. Add "Resend Welcome Email" option to user actions

**Acceptance Criteria:**
- [ ] Password field removed from create form
- [ ] User created with placeholder password (can't login until set)
- [ ] Welcome email sent automatically
- [ ] If email fails: user NOT created, error shown
- [ ] Success shows "Welcome email sent to {email}"
- [ ] Can resend welcome email from user menu

### Phase 6: Resend Welcome Email (~20 mins)

Add ability to resend welcome email for users who haven't set password.

**Changes:**
- Add `resendWelcome` action to `+page.server.ts`
- Add "Resend Welcome" button to user row (visible if user has never logged in)
- Track `passwordSetAt` or check `lastLoginAt` to determine eligibility

**Acceptance Criteria:**
- [ ] "Resend Welcome" button visible for users with null `lastLoginAt`
- [ ] Creates new welcome token (invalidates old one)
- [ ] Sends new welcome email
- [ ] Rate limited (max 3 per hour per user)

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Email send fails | User NOT created, show "Failed to send welcome email. Please try again." |
| User already exists | Show "Email already exists in this organization" (existing behavior) |
| Token expired | Show "This link has expired. Please contact your administrator." |
| Token already used | Show "This link has already been used." |
| Invalid token | Show "Invalid link. Please contact your administrator." |

---

## Security Considerations

1. **No password in email** - Only secure link
2. **Token hashed in database** - SHA256, like password reset
3. **Single-use tokens** - Deleted after password set
4. **7-day expiration** - Balance between convenience and security
5. **Rate limiting on resend** - Prevent abuse
6. **Placeholder password** - User can't login until they set password

---

## Testing Checklist

- [ ] Admin can create user without entering password
- [ ] Welcome email is sent to new user's email
- [ ] Email contains correct org name, user name, email
- [ ] Set password link works and validates token
- [ ] User can set password and login
- [ ] Expired token shows appropriate error
- [ ] Used token shows appropriate error
- [ ] Email failure prevents user creation
- [ ] Admin can resend welcome email
- [ ] Resend is rate limited
- [ ] TypeScript compiles (`npm run check`)
- [ ] Linting passes (`npm run lint`)

---

## UI Changes Summary

### Admin Members Page - Create User Modal

**Before:**
```
┌─────────────────────────────────────┐
│ Add New User                        │
├─────────────────────────────────────┤
│ Email:      [________________]      │
│ Username:   [________________]      │
│ First Name: [________________]      │
│ Last Name:  [________________]      │
│ Password:   [________________]      │  ← REMOVE
│ Role:       [Member ▼]              │
│                                     │
│         [Cancel]  [Create User]     │
└─────────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────┐
│ Add New User                        │
├─────────────────────────────────────┤
│ Email:      [________________]      │
│ Username:   [________________]      │
│ First Name: [________________]      │
│ Last Name:  [________________]      │
│ Role:       [Member ▼]              │
│                                     │
│ ℹ️ A welcome email will be sent     │
│   with a link to set password.      │
│                                     │
│         [Cancel]  [Create User]     │
└─────────────────────────────────────┘
```

### User Actions Menu

**Add option:**
```
┌──────────────────┐
│ Edit Details     │
│ Reset Password   │
│ Resend Welcome   │  ← NEW (if never logged in)
│ ────────────────│
│ Deactivate       │
└──────────────────┘
```

---

## Invitations Tab

The admin members page has an existing **Invitations tab** that shows "(0)". This feature should populate it with pending invitations.

### What is a "Pending Invitation"?

A user who:
- Has been created by admin
- Has a welcome token (hasn't set password yet)
- Has never logged in (`lastLoginAt IS NULL`)

### Invitations Tab UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Invitations (3)                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Email                  │ Invited    │ Expires    │ Status   │ Actions  │
├────────────────────────┼────────────┼────────────┼──────────┼──────────┤
│ john@example.com       │ 2 hours ago│ In 6 days  │ Pending  │ [Resend] │
│ jane@example.com       │ 5 days ago │ In 2 days  │ Pending  │ [Resend] │
│ bob@example.com        │ 10 days ago│ Expired    │ Expired  │ [Resend] │
└────────────────────────┴────────────┴────────────┴──────────┴──────────┘
```

### Invitation Statuses

| Status | Condition |
|--------|-----------|
| **Pending** | Welcome token exists and not expired |
| **Expired** | Welcome token expired (>7 days) or no token exists |

### Data Loading

**In `+page.server.ts` load function:**

```typescript
// Get pending invitations (users who haven't logged in + have welcome tokens)
const pendingInvitations = await sql<InvitationRow[]>`
    SELECT
        u.id,
        u.email,
        u.display_name,
        u.created_at as invited_at,
        prt.expires_at,
        prt.created_at as token_created_at,
        CASE
            WHEN prt.expires_at > NOW() THEN 'pending'
            ELSE 'expired'
        END as status
    FROM users u
    LEFT JOIN password_reset_tokens prt
        ON u.email = prt.email
        AND prt.token_type = 'welcome'
        AND prt.used_at IS NULL
    WHERE u.organization_id = ${orgId}
        AND u.last_login_at IS NULL
    ORDER BY u.created_at DESC
`;
```

**Return in load:**
```typescript
return {
    users: usersWithRoles,
    invitations: pendingInvitations,  // NEW
    groups: groups,
    currentUserId: locals.session!.userId
};
```

### Invitation Actions

| Action | Description |
|--------|-------------|
| **Resend** | Creates new welcome token, sends new email |
| **Revoke** | Deletes user entirely (they never logged in) |

### Implementation Notes

1. **Tab count:** `Invitations ({data.invitations.length})`
2. **Filter from members:** Users with `lastLoginAt === null` could appear in both tabs, or only in Invitations tab (decide: probably only Invitations to avoid confusion)
3. **After password set:** User moves from Invitations → Members tab automatically (they now have `lastLoginAt`)

---

## Updated Implementation Plan

### Phase 7: Invitations Tab (~45 mins)

**Files:**
- `src/routes/admin/members/+page.server.ts` - Add invitations query to load
- `src/routes/admin/members/+page.svelte` - Populate Invitations tab UI

**Acceptance Criteria:**
- [ ] Invitations tab shows count of pending invitations
- [ ] Table shows: Email, Invited date, Expires, Status, Actions
- [ ] Pending status for valid tokens
- [ ] Expired status for expired/missing tokens
- [ ] Resend button sends new welcome email
- [ ] Revoke button deletes user (with confirmation)
- [ ] Users with `lastLoginAt` NOT shown in Invitations tab
- [ ] After user sets password + logs in, they move to Members tab

---

## Related Documentation

- **SendGrid Integration:** `docs/SENDGRID_EMAIL_INTEGRATION.md` (if exists)
- **Password Reset Flow:** `src/routes/reset-password/`
- **Email Templates:** `src/lib/server/email/templates.ts`
- **Token Repository:** `src/lib/server/persistence/password-reset-tokens-postgres.ts`
