# PRD: Space Invitation Email

> **Created:** 2026-01-16
> **Parent Task ID:** space-invitation-email
> **Effort:** ~2-3 hours (6 stories)

---

## Introduction

When a user is added to a space, they currently have no way of knowing unless they happen to log in. This feature sends an automatic email notification when someone is added to a space, with a deep link that redirects them to the space after login.

## Research Findings

**Similar patterns found:**
- `src/lib/server/email/templates.ts` - Email template structure (password reset, welcome)
- `src/routes/login/+page.server.ts` - Login flow with redirect
- `src/routes/api/spaces/[id]/members/+server.ts` - Member addition API
- `src/lib/types/space-memberships.ts` - Role definitions (owner, admin, member, guest)

**Existing infrastructure:**
- SendGrid email integration working
- `getWelcomeEmail()` template exists
- `createSetPasswordLink()` helper exists
- `getBaseUrl()` helper exists

## Goals

- Automatically notify users when added to a space
- Provide deep links that work even when not logged in
- Maintain consistent email styling with existing templates
- Ensure email failures don't block membership creation

## User Stories

### US-001: Add returnUrl support to login page

**Description:** As a user clicking an email link, I want to be redirected to my intended destination after login so that I don't have to navigate there manually.

**What to do:**
- Add `validateReturnUrl()` function to validate URLs (security)
- Update login action to check for returnUrl param
- Update login form to preserve returnUrl in action URL

**Files:**
- `src/routes/login/+page.server.ts`
- `src/routes/login/+page.svelte`

**Acceptance Criteria:**
- [ ] Login page accepts `returnUrl` query parameter
- [ ] `validateReturnUrl()` validates URL (must start with /, no protocol-relative, no javascript:)
- [ ] After successful login, redirects to returnUrl if provided and valid
- [ ] Falls back to user's home preference if no valid returnUrl
- [ ] Form preserves returnUrl in action URL during submission
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-002: Update welcome email to mention org workspace

**Description:** As a new user receiving a welcome email, I want to know that I have access to my organization's workspace so that I understand what I'll see when I log in.

**What to do:**
- Update `getWelcomeEmail()` template to mention org workspace access

**Files:**
- `src/lib/server/email/templates.ts`

**Acceptance Criteria:**
- [ ] Welcome email template includes org workspace access messaging
- [ ] Email mentions "The {orgName} workspace - your team's shared space for collaboration"
- [ ] Both HTML and plain text versions updated
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-003: Create space invitation email template

**Description:** As a developer, I need a space invitation email template so that users can be notified when added to a space.

**What to do:**
- Add `getSpaceInvitationEmail()` function
- Add helper functions for role display and permissions
- Add `createSpaceLink()` helper

**Files:**
- `src/lib/server/email/templates.ts`

**Template data interface:**
```typescript
interface SpaceInvitationTemplateData {
    firstName: string;
    inviterName: string;
    spaceName: string;
    spaceSlug: string;
    role: 'admin' | 'member' | 'guest';
}
```

**Role permissions for email:**

| Role | Permissions shown |
|------|-------------------|
| Admin | View all areas and content, Create and edit content, Manage space members |
| Member | View all areas and content, Create and edit content, Collaborate with team |
| Guest | View areas shared with you, Collaborate on shared content |

**Acceptance Criteria:**
- [ ] `getSpaceInvitationEmail()` function created
- [ ] Template includes: inviter name, space name, role
- [ ] Role-specific permissions listed
- [ ] `getRoleDisplayName()` returns "an Admin", "a Member", "a Guest"
- [ ] `getRolePermissions()` returns permission array based on role
- [ ] `createSpaceLink()` generates `/spaces/{slug}` URL
- [ ] Both HTML and plain text versions
- [ ] Subject: "You've been added to {spaceName}"
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-004: Create space invitation email sending service

**Description:** As a developer, I need a service to send space invitation emails so that the API can trigger emails when members are added.

**What to do:**
- Create new service file
- Implement `sendSpaceInvitationEmail()` function
- Handle user/inviter lookup with fallbacks

**Files:**
- `src/lib/server/email/space-invitation.ts` (NEW)

**Function signature:**
```typescript
interface SendSpaceInvitationInput {
    userId: string;         // User being invited
    spaceId: string;        // Space they're invited to
    spaceSlug: string;      // For URL generation
    spaceName: string;      // For email content
    role: 'admin' | 'member' | 'guest';
    invitedByUserId: string; // Who invited them
}

export async function sendSpaceInvitationEmail(input: SendSpaceInvitationInput): Promise<void>
```

**Acceptance Criteria:**
- [ ] New file created at `src/lib/server/email/space-invitation.ts`
- [ ] Function fetches user details (firstName, email) from repository
- [ ] Function fetches inviter details (displayName) from repository
- [ ] Falls back to "A team member" if inviter not found
- [ ] Falls back to "there" if user has no firstName
- [ ] Calls `sendEmail()` from sendgrid.ts
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-005: Send invitation email when user added to space

**Description:** As a space admin, I want users to receive an email when I add them to a space so that they know they have access.

**What to do:**
- Update POST handler to send email after membership creation
- Add space type check to skip org spaces
- Add self-add check
- Add group membership check
- Wrap email in try/catch (don't block on failure)

**Files:**
- `src/routes/api/spaces/[id]/members/+server.ts`

**Skip email for:**
- Org space memberships (`space_type = 'organization'`)
- Self-additions (`targetUserId === userId`)
- Group memberships (`groupId` provided instead of `targetUserId`)

**Acceptance Criteria:**
- [ ] POST sends email after successful membership creation
- [ ] Email NOT sent for org spaces
- [ ] Email NOT sent when adding yourself
- [ ] Email NOT sent for group memberships
- [ ] Email failure does NOT block membership creation
- [ ] Email failure is logged with error details
- [ ] Need to fetch space details (slug, name, space_type)
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-006: Manual testing and verification

**Description:** As a developer, I need to verify all scenarios work correctly so that users have a reliable experience.

**Test scenarios:**

| Scenario | Expected |
|----------|----------|
| Add existing user to space | They receive invitation email |
| Add user to org space | No email (org space is implicit) |
| Add yourself to a space | No email |
| Add group to space | No email (V1) |
| Click email link while logged in | Goes directly to space |
| Click email link while logged out | Login -> redirect to space |
| Invalid/expired returnUrl | Falls back to home |

**Acceptance Criteria:**
- [ ] All scenarios above pass
- [ ] npm run check passes
- [ ] npm run lint passes
- [ ] Email renders correctly in email clients (Gmail, Outlook)

---

## Non-Goals

- Batch notifications (if added to multiple spaces, one email) - V2
- Notification preferences (user opt-out) - V2
- Group membership emails (email each member) - V2
- Role change notifications - V2
- Removal notifications - V2

## Technical Considerations

- **Security:** validateReturnUrl() prevents open redirect attacks
- **Resilience:** Email failures don't block membership creation
- **Patterns:** Follow existing email template structure in templates.ts
- **postgres.js:** Use camelCase for column access (spaceType not space_type)

## Files Changed/Created Summary

| File | Change |
|------|--------|
| `src/routes/login/+page.server.ts` | Add returnUrl handling |
| `src/routes/login/+page.svelte` | Preserve returnUrl in form |
| `src/lib/server/email/templates.ts` | Update welcome email, add space invitation template |
| `src/lib/server/email/space-invitation.ts` | **NEW** - Space invitation sending logic |
| `src/routes/api/spaces/[id]/members/+server.ts` | Send email after adding member |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Email delivery failures | Wrap in try/catch, log errors, don't block membership |
| Open redirect attacks | validateReturnUrl() only allows relative URLs |
| User has no email | Skip email, log warning |
| Inviter deleted | Fall back to "A team member" as inviter name |
