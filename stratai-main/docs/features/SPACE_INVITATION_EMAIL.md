# Space Invitation Email

> **Status:** Ready for Implementation
> **Created:** 2026-01-16
> **Effort:** ~2-3 hours (5 phases)
> **Depends on:** Welcome Email feature (for shared infrastructure)

---

## Implementation Summary

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Return URL support on login page | ~30 mins |
| 2 | Update welcome email to mention org space | ~20 mins |
| 3 | Space invitation email template | ~25 mins |
| 4 | Send email on space membership creation | ~30 mins |
| 5 | Testing and edge cases | ~20 mins |

---

## Problem Statement

When a user is added to a space, they have no way of knowing unless they happen to log in and notice. This creates:
- **Poor discoverability** - User doesn't know they have access to new content
- **Missed collaboration** - Inviter expects them to participate, but they never see the invite
- **Manual follow-up** - Inviter has to message them separately ("Hey, I added you to...")

---

## Solution

When someone is added to a space, automatically send them an email with:
- Who invited them
- What space they now have access to
- Their role (what they can do)
- Direct link to the space

**Key decisions:**
- **Separate from welcome email** - Independent flows, easier to maintain
- **Welcome email mentions org space** - New users see "You have access to [OrgName] workspace"
- **Owner + Admin can invite** - Based on existing `canManageSpaceMembers` permission
- **Deep links with return URL** - If not logged in, redirect to login → then to space

---

## User Flows

### Flow 1: Existing User Added to Space

```
Admin adds User B to "Marketing" space
    ↓
System sends email to User B
    ↓
User B clicks "View Marketing Space"
    ↓
Already logged in? → Goes directly to /spaces/marketing
Not logged in? → /login?returnUrl=/spaces/marketing → login → redirect to space
```

### Flow 2: New User Created (Welcome Email)

```
Admin creates User C
    ↓
Welcome email sent: "Welcome! Set your password to access [OrgName]"
    ↓
User sets password
    ↓
Redirected to org space (their default home)
```

**Note:** Org space access is mentioned in welcome email, NOT a separate space invitation.

### Flow 3: New User + Added to Additional Space

```
Admin creates User D
    ↓
Welcome email: "Welcome to [OrgName]! Set your password..."
    ↓
Admin adds User D to "Sales" space
    ↓
Space invitation email: "You've been added to Sales"
    ↓
User D sets password, logs in, sees both org space and Sales in sidebar
```

---

## Technical Design

### Phase 1: Return URL Support

**Problem:** Email links go to protected pages. If user isn't logged in, they need to:
1. Be redirected to login
2. After login, be redirected to original destination

**Implementation:**

**File:** `src/routes/login/+page.server.ts`

```typescript
// In the successful login handler
const returnUrl = url.searchParams.get('returnUrl');

// Validate returnUrl (prevent open redirect attacks)
const safeReturnUrl = validateReturnUrl(returnUrl);

// Priority: returnUrl > user home preference > default
const destination = safeReturnUrl || getHomePageUrl(user.preferences.homePage) || '/';
throw redirect(302, destination);
```

**Security:** `validateReturnUrl()` function:
```typescript
function validateReturnUrl(url: string | null): string | null {
    if (!url) return null;

    // Must start with / (relative URL only - no external redirects)
    if (!url.startsWith('/')) return null;

    // Block protocol-relative URLs (//evil.com)
    if (url.startsWith('//')) return null;

    // Block javascript: and data: URLs
    if (url.includes(':')) return null;

    return url;
}
```

**File:** `src/routes/login/+page.svelte`

```typescript
// Preserve returnUrl in form action
const returnUrl = $page.url.searchParams.get('returnUrl');

// Pass to form
<form method="POST" action="?/login{returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''}">
```

**Acceptance Criteria:**
- [ ] Login page accepts `returnUrl` query parameter
- [ ] After successful login, redirects to `returnUrl` if provided
- [ ] Falls back to user's home preference if no `returnUrl`
- [ ] Validates `returnUrl` to prevent open redirect attacks
- [ ] Works with "Remember me" flow if applicable

---

### Phase 2: Update Welcome Email

The welcome email should mention the user's organization and that they have access to the org space.

**File:** `src/lib/server/email/templates.ts`

**Current welcome email structure:**
```
Welcome to StratAI!

Hi {firstName},

You've been invited to join {orgName} on StratAI.
Click below to set your password and get started...
```

**Updated welcome email structure:**
```
Welcome to StratAI!

Hi {firstName},

You've been invited to join {orgName} on StratAI.

Once you set your password, you'll have access to:
• The {orgName} workspace - your team's shared space for collaboration

Click below to set your password and get started...
```

**Template data interface:**
```typescript
interface WelcomeEmailTemplateData {
    firstName: string;
    orgName: string;        // Organization name
    setPasswordLink: string;
    expiresInDays: number;
}
```

**Acceptance Criteria:**
- [ ] Welcome email mentions org name
- [ ] Welcome email mentions org workspace access
- [ ] Template accepts `orgName` parameter
- [ ] Email renders correctly in HTML and plain text

---

### Phase 3: Space Invitation Email Template

**File:** `src/lib/server/email/templates.ts`

**Email content:**

```
Subject: You've been added to {spaceName}

┌─────────────────────────────────────────────┐
│ [StratAI Logo/Header - Purple Gradient]     │
├─────────────────────────────────────────────┤
│                                             │
│  You've been added to a space!              │
│                                             │
│  Hi {firstName},                            │
│                                             │
│  {inviterName} added you to the             │
│  "{spaceName}" space as a {roleName}.       │
│                                             │
│  As a {roleName}, you can:                  │
│  • {permission1}                            │
│  • {permission2}                            │
│  • {permission3}                            │
│                                             │
│  ┌─────────────────────────────────┐        │
│  │     View {spaceName}            │        │
│  └─────────────────────────────────┘        │
│                                             │
│  ─────────────────────────────────────────  │
│  If button doesn't work, copy this link:    │
│  {spaceLink}                                │
│                                             │
└─────────────────────────────────────────────┘
```

**Role permissions for email:**

| Role | Permissions shown in email |
|------|---------------------------|
| **Admin** | View all areas and content, Create and edit content, Manage space members |
| **Member** | View all areas and content, Create and edit content, Collaborate with team |
| **Guest** | View areas shared with you, Collaborate on shared content |

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

**Helper functions:**
```typescript
function getSpaceInvitationEmail(data: SpaceInvitationTemplateData) {
    // Returns { subject, html, text }
}

function createSpaceLink(spaceSlug: string): string {
    return `${getBaseUrl()}/spaces/${spaceSlug}`;
}

function getRoleDisplayName(role: string): string {
    const names = { admin: 'an Admin', member: 'a Member', guest: 'a Guest' };
    return names[role] || 'a Member';
}

function getRolePermissions(role: string): string[] {
    const permissions = {
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
```

**Acceptance Criteria:**
- [ ] `getSpaceInvitationEmail()` function created
- [ ] Email shows inviter name, space name, and role
- [ ] Role-specific permissions listed
- [ ] CTA button links to space with proper URL
- [ ] HTML and plain text versions
- [ ] Consistent styling with other emails (password reset, welcome)

---

### Phase 4: Send Email on Space Membership Creation

**Trigger point:** When `addUserMember()` is called in `space-memberships-postgres.ts`

**Option A: In repository layer**
```typescript
// In addUserMember()
const membership = await this.createMembership(...);
await sendSpaceInvitationEmail(membership);  // Could fail silently
return membership;
```

**Option B: In API endpoint (Recommended)**
```typescript
// In POST /api/spaces/[id]/members
const membership = await postgresSpaceMembershipsRepository.addUserMember(...);

// Send email (don't block on failure)
try {
    await sendSpaceInvitationEmail({
        userId: targetUserId,
        spaceId,
        role,
        invitedBy: userId
    });
} catch (error) {
    console.error('Failed to send space invitation email:', error);
    // Don't fail the request - membership was created successfully
}

return json(membership, { status: 201 });
```

**Recommendation:** Option B - Keep email sending in the API layer, not repository. This follows separation of concerns and allows the membership to succeed even if email fails.

**Email sending logic:**

```typescript
// src/lib/server/email/space-invitation.ts
import { sendEmail } from './sendgrid';
import { getSpaceInvitationEmail, createSpaceLink } from './templates';
import { postgresUserRepository } from '$lib/server/persistence';
import { postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';

interface SendSpaceInvitationInput {
    userId: string;         // User being invited
    spaceId: string;        // Space they're invited to
    spaceSlug: string;      // For URL generation
    spaceName: string;      // For email content
    role: 'admin' | 'member' | 'guest';
    invitedByUserId: string; // Who invited them
}

export async function sendSpaceInvitationEmail(input: SendSpaceInvitationInput): Promise<void> {
    // Get user details
    const user = await postgresUserRepository.findById(input.userId);
    if (!user || !user.email) {
        throw new Error('User not found or has no email');
    }

    // Get inviter details
    const inviter = await postgresUserRepository.findById(input.invitedByUserId);
    const inviterName = inviter?.displayName || inviter?.email || 'A team member';

    // Generate email
    const emailContent = getSpaceInvitationEmail({
        firstName: user.firstName || user.displayName || 'there',
        inviterName,
        spaceName: input.spaceName,
        spaceSlug: input.spaceSlug,
        role: input.role
    });

    // Send
    await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
    });
}
```

**Skip email for:**
- Org space memberships (handled in welcome email)
- Self-additions (if user somehow adds themselves - shouldn't happen via UI)
- Group memberships (email individual users? or skip? - **Decision: Skip for V1**)

**Acceptance Criteria:**
- [ ] Email sent when user added to space via API
- [ ] Email NOT sent for org space (space_type = 'organization')
- [ ] Email NOT sent when adding yourself (edge case)
- [ ] Email NOT sent for group memberships (V1 simplification)
- [ ] Email failure doesn't block membership creation
- [ ] Email failure is logged for debugging

---

### Phase 5: Testing

**Manual test scenarios:**

| Scenario | Expected |
|----------|----------|
| Add existing user to space | They receive invitation email |
| Add user to org space | No email (org space is implicit) |
| Add yourself to a space | No email |
| Add group to space | No email (V1) |
| Click email link while logged in | Goes directly to space |
| Click email link while logged out | Login → redirect to space |
| Invalid/expired returnUrl | Falls back to home |

**Acceptance Criteria:**
- [ ] All scenarios above pass
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] Email renders correctly in email clients (Gmail, Outlook)

---

## Files Changed/Created

| File | Change |
|------|--------|
| `src/routes/login/+page.server.ts` | Add returnUrl handling |
| `src/routes/login/+page.svelte` | Preserve returnUrl in form |
| `src/lib/server/email/templates.ts` | Update welcome email, add space invitation template |
| `src/lib/server/email/space-invitation.ts` | **NEW** - Space invitation sending logic |
| `src/routes/api/spaces/[id]/members/+server.ts` | Send email after adding member |

---

## Edge Cases

| Case | Handling |
|------|----------|
| User has no email | Skip email, log warning |
| Inviter deleted | Use "A team member" as inviter name |
| Space deleted after email sent | Link will 404 - acceptable |
| User already a member (role update) | Send email for role changes? **Decision: No for V1** |
| Rapid re-invites (spam) | No rate limiting for V1 (admin action, low risk) |

---

## Security Considerations

1. **Return URL validation** - Only allow relative URLs starting with `/`
2. **No sensitive data in email** - Just names and links, no tokens
3. **Email goes to verified address** - User's registered email
4. **Links require authentication** - Must log in to access space

---

## Future Enhancements

- **Batch notifications** - If added to multiple spaces, one email
- **Notification preferences** - User can opt out of space invites
- **Group membership emails** - Email each group member individually
- **Role change notifications** - "Your role changed from Member to Admin"
- **Removal notifications** - "You've been removed from [Space]"

---

## Related Documentation

- **Welcome Email:** `docs/features/WELCOME_EMAIL_ON_USER_CREATION.md`
- **Space Memberships:** `src/lib/types/space-memberships.ts`
- **Email Templates:** `src/lib/server/email/templates.ts`
