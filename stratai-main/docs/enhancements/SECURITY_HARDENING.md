# Security Hardening Assessment

> Findings on authentication, secret management, security headers, input validation, and compliance requirements for a public-facing platform.

**Assessment Date:** 2026-01-30

---

## What's Already Secure

Before listing gaps, these are genuinely strong and production-ready:

| Area | Implementation | Status |
|------|----------------|--------|
| SQL injection | postgres.js parameterized queries everywhere | Secure |
| XSS | markdown-it `html: false`, URL scheme validation, minimal `{@html}` | Secure |
| Rate limiting | Sliding window on auth, chat, upload, mutation endpoints | Secure |
| OAuth tokens | AES-256-GCM encryption with proper IV and auth tags | Secure |
| Session cookies | HMAC-SHA256, httpOnly, sameSite, secure, 24hr expiry, timing-safe | Secure |
| CSRF | OAuth state tokens, SameSite cookies, open redirect prevention | Secure |
| Password reset | Secure 32-byte tokens, hashed before storage, single-use, enumeration-safe | Secure |
| Multi-tenancy | Queries scoped by userId/orgId, area membership checks | Secure |
| File upload | Type validation, size limits, path traversal prevention, sanitization | Secure |
| Token lifecycle | Centralized refresh with mutex, retry, Azure AD error parsing | Secure |

---

## 1. Password Hashing {#1-password-hashing}

**Severity: CRITICAL**
**File:** `src/lib/server/auth.ts`

### Current Implementation

```typescript
const HASH_ALGORITHM = 'sha256';

function hashPassword(password: string, salt: string): string {
    return createHash(HASH_ALGORITHM).update(password + salt).digest('hex');
}
```

### Problem

SHA-256 is a fast hash designed for data integrity, not password storage. Modern GPUs can compute ~10 billion SHA-256 hashes per second. A 8-character password with this scheme can be brute-forced in under a minute.

### Fix

bcrypt is already in `package.json` but not used for password hashing:

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}
```

### Migration Strategy

**Option A: Transparent migration (zero user disruption)**

For production with real users. Existing sessions stay valid; users migrate silently on next login.

1. Add `password_version` column to `users` table (default `1` = SHA-256, `2` = bcrypt)
2. On login, detect hash format (bcrypt hashes start with `$2b$`):
   - If bcrypt: verify with `bcrypt.compare()` (new path)
   - If SHA-256: verify with old `createHash()` logic, then re-hash with bcrypt and update the row
3. After 90 days: force password reset for any remaining v1 accounts that never logged in
4. Remove SHA-256 code path once all accounts are v2

**Option B: Clean break (recommended for pre-launch / test users only)**

Simpler — no legacy code path to maintain. Appropriate when all existing users are internal testers.

1. Switch `hashPassword()` and `verifyPassword()` to bcrypt
2. Invalidate all existing passwords: `UPDATE users SET password_hash = NULL, salt = NULL`
3. Send password reset emails to all users (or communicate directly if small team)
4. Remove SHA-256 `createHash` code entirely — no dual-path logic needed
5. Drop the `salt` column (bcrypt embeds its own salt in the hash string)

**Trade-off:** Option B is cleaner code (no version detection, no legacy path) but requires every user to reset their password. Option A is zero-disruption but carries a temporary dual-hash code path until all users have logged in.

---

## 2. Secret Management {#2-secret-management}

**Severity: HIGH**

### Default Secret Fallbacks

**File:** `src/lib/server/session.ts`

```typescript
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-me';
```

**File:** Various configuration files

```typescript
const LITELLM_API_KEY = process.env.LITELLM_API_KEY || 'sk-1234';
```

If a deployment omits these environment variables, the app runs silently with publicly-known secrets. Every session token becomes forgeable.

### Fix

Fail-fast on startup:

```typescript
function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`FATAL: Required environment variable ${name} is not set. Refusing to start.`);
    }
    return value;
}

// In session.ts
const SESSION_SECRET = requireEnv('SESSION_SECRET');

// In litellm config
const LITELLM_API_KEY = requireEnv('LITELLM_API_KEY');
```

### Environment Variable Inventory

All secrets that should be validated on startup:

| Variable | Purpose | Current Default |
|----------|---------|----------------|
| `SESSION_SECRET` | Cookie signing | `'default-secret-change-me'` |
| `LITELLM_API_KEY` | LLM proxy auth | `'sk-1234'` |
| `DATABASE_URL` | PostgreSQL connection | Falls back to localhost |
| `ENCRYPTION_KEY` | OAuth token encryption | Unknown |
| `SENDGRID_API_KEY` | Email delivery | Optional but should warn |
| `AZURE_CLIENT_SECRET` | Calendar OAuth | Optional |

**Create** `src/lib/server/env.ts` — centralized env validation that runs once on server startup.

---

## 3. Security Headers {#3-security-headers}

**Severity: HIGH**
**File:** `src/hooks.server.ts`

### Current State

No security headers are set. The `hooks.server.ts` file handles auth but not response headers.

### Required Headers

```typescript
// In hooks.server.ts handle function:
const response = await resolve(event);

response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('X-XSS-Protection', '0'); // Disabled per OWASP (modern browsers)
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

// CSP (start permissive, tighten over time)
response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",  // Svelte needs inline for hydration
    "style-src 'self' 'unsafe-inline'",   // Tailwind uses inline styles
    "img-src 'self' data: blob:",         // Base64 images
    "connect-src 'self'",                 // API calls
    "font-src 'self'",
    "frame-ancestors 'none'"              // Replaces X-Frame-Options for modern browsers
].join('; '));

// HSTS (only when HTTPS is configured)
if (event.url.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

return response;
```

### Impact Without Headers

| Missing Header | Risk |
|---------------|------|
| X-Frame-Options | App can be embedded in iframes (clickjacking) |
| X-Content-Type-Options | Browser may MIME-sniff responses as executable |
| CSP | Any injected script runs with full privileges |
| HSTS | Downgrade attacks from HTTPS to HTTP |
| Referrer-Policy | Full URLs leaked to external services |
| Permissions-Policy | Browser APIs accessible to embedded content |

---

## 4. HTTPS Configuration {#4-https}

**Severity: HIGH**

### Current State

`docker-compose.prod.yml` exposes raw ports:

```yaml
ports:
  - "3000:3000"   # SvelteKit (unencrypted)
  - "5432:5432"   # PostgreSQL (exposed to network!)
  - "4000:4000"   # LiteLLM (unencrypted)
```

No reverse proxy (nginx, caddy, traefik) is configured. Session cookies are set `secure: !dev` — but without enforced HTTPS, the flag provides no protection.

### Fix

Add nginx or Caddy as reverse proxy with TLS termination:

```yaml
# docker-compose.prod.yml additions
services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - app

  app:
    # Remove port exposure — only accessible via Caddy
    expose:
      - "3000"

  postgres:
    # NEVER expose to external network
    # Remove ports section entirely
```

```
# Caddyfile
stratai.example.com {
    reverse_proxy app:3000
}
```

**Critical:** Remove PostgreSQL port exposure from production compose file. Database should only be accessible from the internal Docker network.

---

## 5. Email Verification {#5-email-verification}

**Severity: MEDIUM-HIGH**

### Current State

Registration accepts any email address without verification. There's no check that the registrant owns the email.

### Risks

- Spam account creation at scale
- Impersonation (register with someone else's email)
- Password reset to unverified email = account takeover vector
- Bad sender reputation (sending emails to addresses that bounce)

### Fix

1. On registration, set `email_verified = false`
2. Send verification email with signed token (same pattern as password reset)
3. Gate sensitive features behind `email_verified = true`:
   - Sending emails to others (meeting invites, task assignment notifications)
   - Joining org spaces
   - Calendar integration (OAuth redirect)
4. Allow basic usage (personal spaces, chat) without verification to reduce friction

---

## 6. Input Validation {#6-input-validation}

**Severity: MEDIUM**

### Current State

Input validation is manual and inconsistent:

```typescript
// Some endpoints validate thoroughly:
if (!email || typeof email !== 'string' || !email.includes('@')) {
    return json({ error: 'Invalid email' }, { status: 400 });
}

// Others trust the input:
const { title, description, spaceId } = await request.json();
// No validation — title could be 10MB, description could be SQL
```

### Fix

Adopt Zod for schema validation:

```typescript
import { z } from 'zod';

const CreateTaskSchema = z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(10000).optional(),
    spaceId: z.string().uuid(),
    areaId: z.string().uuid().optional(),
    assigneeId: z.string().uuid().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    dueDate: z.string().datetime().optional()
});

// In endpoint:
const result = CreateTaskSchema.safeParse(await request.json());
if (!result.success) {
    return json({ error: { message: 'Validation failed', details: result.error.flatten() } }, { status: 400 });
}
const { title, description, spaceId } = result.data; // Typed and validated
```

### Priority Endpoints for Validation

| Endpoint | Risk | Reason |
|----------|------|--------|
| `POST /api/auth/register` | High | Public-facing, creates accounts |
| `POST /api/auth/login` | High | Public-facing, auth boundary |
| `POST /api/upload` | High | File handling |
| `POST /api/chat` | Medium | LLM prompt injection surface |
| `POST /api/spaces` | Medium | Creates org-scoped resources |
| `POST /api/tasks` | Medium | Cross-user data (assignment) |
| `POST /api/pages` | Medium | Content storage |

---

## 7. SSO / Enterprise Auth {#7-sso}

**Severity: MEDIUM (for enterprise positioning)**

### Current State

Password-only authentication. WorkOS is in the Decision Log as planned but not implemented.

### Recommendation

For enterprise customers, SSO is table stakes:

1. **Phase 1:** WorkOS integration for SAML SSO (Decision Log says $125/connection — already chosen)
2. **Phase 2:** 2FA via TOTP for admin accounts
3. **Phase 3:** Social login (Google, Microsoft) for self-service signups

WorkOS provides:
- SAML SSO ($125/connection/month)
- Directory sync (SCIM)
- 1M MAU free tier
- Native SvelteKit SDK

---

## 8. Account Lockout {#8-account-lockout}

**Severity: LOW-MEDIUM**

### Current State

Rate limiting exists on auth endpoints (good), but there's no account lockout after N failed attempts. A determined attacker can slowly brute-force passwords by staying under the rate limit.

### Fix

```typescript
// Track failed attempts per account (not per IP)
// After 5 failures in 15 minutes: lock account for 30 minutes
// After 10 failures in 1 hour: lock account, send email notification
// Admin can unlock manually
```

This complements rate limiting (which is per-IP) with per-account protection.

---

## 9. Dependency Security {#9-dependencies}

**Severity: LOW**

### Current State

No `npm audit` step in any script or CI pipeline. Dependencies may have known vulnerabilities.

### Fix

1. Add `npm audit --production` to CI pipeline
2. Configure Dependabot or Renovate for automated dependency updates
3. Pin major versions in `package.json` (currently using `^` ranges)

---

## Summary of Recommended Actions

| Priority | Action | Effort | Blocks Launch? |
|----------|--------|--------|---------------|
| **P0** | Migrate to bcrypt | Small | Yes |
| **P0** | Fail-fast on missing secrets | Small | Yes |
| **P0** | Add security headers | Small | Yes |
| **P0** | HTTPS via reverse proxy | Medium | Yes |
| **P0** | Remove PostgreSQL port exposure | Small | Yes |
| **P1** | Email verification flow | Medium | Recommended |
| **P1** | Zod validation on public endpoints | Medium | Recommended |
| **P2** | WorkOS SSO integration | Large | For enterprise |
| **P2** | Account lockout | Small | Nice to have |
| **P2** | 2FA for admin accounts | Medium | For enterprise |
| **P3** | Dependency audit in CI | Small | Best practice |
| **P3** | Dependabot/Renovate setup | Small | Best practice |
