# Enhancement Roadmap

> Comprehensive assessment and prioritized plan for taking StratAI from internal development to a production-ready, public-facing platform open to external developers.

**Assessment Date:** 2026-01-30
**Codebase Snapshot:** ~192K lines of code, ~670 source files, 32 database tables, 256 components, 22 stores, 113 API endpoints

---

## Documents

| Document | Scope | Key Findings |
|----------|-------|--------------|
| [Code Quality](./CODE_QUALITY.md) | Developer experience, patterns, test coverage, build tooling | ~~8 test files~~ → 51 smoke tests + 4 unit test files; ESLint unconfigured; god files; duplicated auth patterns |
| [Security Hardening](./SECURITY_HARDENING.md) | Auth, secrets, headers, encryption, input validation | ~~SHA-256 passwords~~ → ✅ bcrypt; default secret fallbacks; no security headers; no email verification |
| [Performance & Scalability](./PERFORMANCE_SCALABILITY.md) | Caching, queries, pagination, multi-instance, payloads | No caching layer; in-memory state breaks multi-instance; missing pagination |
| [Operational Readiness](./OPERATIONAL_READINESS.md) | Monitoring, logging, CI/CD, backups, legal, onboarding | No error monitoring; no CI/CD; console-only logging; no legal pages |

---

## What's Already Strong

These areas are production-ready and don't need work:

- **Type safety** — Strict TypeScript, only 37 `any` across 670 files, zero `@ts-expect-error`
- **Store patterns** — Perfect Svelte 5 runes consistency across 22 stores
- **Database layer** — Clean repository pattern, postgres.js camelCase, parameterized queries everywhere
- **Naming conventions** — Consistent PascalCase components, camelCase stores, `*-postgres.ts` repos
- **Import organization** — Consistent `$lib` alias, no relative import chaos
- **Decision log** — Architectural decisions documented with rationale
- **Rate limiting** — Sliding window on auth, chat, upload, mutation endpoints
- **OAuth encryption** — AES-256-GCM with proper IV and auth tags
- **Session cookies** — HMAC-SHA256, httpOnly, sameSite, secure, timing-safe validation
- **SQL injection prevention** — Parameterized queries everywhere
- **XSS prevention** — markdown-it `html: false`, URL scheme validation
- **Multi-tenancy** — Queries consistently scoped by userId/orgId
- **CSRF** — OAuth state tokens, SameSite cookies, open redirect prevention
- **Password reset** — Secure tokens, hashed before storage, single-use, enumeration-safe
- **Docker** — Multi-stage build, non-root user, health checks, precompression
- **Connection pooling** — postgres.js pool with idle timeout and graceful shutdown
- **File upload** — Type validation, size limits, path traversal prevention, sanitization
- **Database indexes** — Composite, partial, GIN full-text, and JSONB path indexes

---

## Priority Roadmap

### Phase 1: Security (Week 1) — In Progress

| Item | Effort | Document | Status |
|------|--------|----------|--------|
| Migrate password hashing to bcrypt | Small | [Security](./SECURITY_HARDENING.md#1-password-hashing) | ✅ Done |
| Fail-fast on missing secrets | Small | [Security](./SECURITY_HARDENING.md#2-secret-management) | TODO |
| Add security headers middleware | Small | [Security](./SECURITY_HARDENING.md#3-security-headers) | TODO |
| Configure HTTPS / reverse proxy | Medium | [Security](./SECURITY_HARDENING.md#4-https) | TODO |

### Phase 2: Ops Foundation (Week 2)

| Item | Effort | Document |
|------|--------|----------|
| Error monitoring (Sentry) | Small | [Ops](./OPERATIONAL_READINESS.md#1-error-monitoring) |
| Structured logging | Medium | [Ops](./OPERATIONAL_READINESS.md#2-logging) |
| CI/CD pipeline (GitHub Actions) | Small | [Ops](./OPERATIONAL_READINESS.md#3-cicd) |
| Database backup strategy | Medium | [Ops](./OPERATIONAL_READINESS.md#4-backups) |

### Phase 3: Auth Hardening (Week 3)

| Item | Effort | Document |
|------|--------|----------|
| Email verification flow | Medium | [Security](./SECURITY_HARDENING.md#5-email-verification) |
| Remove env var password override | Small | [Security](./SECURITY_HARDENING.md#2-secret-management) |
| Input validation on public endpoints (Zod) | Medium | [Security](./SECURITY_HARDENING.md#6-input-validation) |

### Phase 4: Developer Experience (Week 3-4)

| Item | Effort | Document |
|------|--------|----------|
| ESLint configuration | Small | [Code Quality](./CODE_QUALITY.md#2-build-tooling) |
| CONTRIBUTING.md | Small | [Ops](./OPERATIONAL_READINESS.md#6-contribution-infrastructure) |
| Centralized API error handling | Medium | [Code Quality](./CODE_QUALITY.md#3-api-error-handling) |
| Pre-commit hooks (husky/lint-staged) | Small | [Ops](./OPERATIONAL_READINESS.md#6-contribution-infrastructure) |

### Phase 5: Legal + Scale (Week 4-5)

| Item | Effort | Document |
|------|--------|----------|
| Privacy policy + Terms of Service pages | Medium | [Ops](./OPERATIONAL_READINESS.md#5-legal) |
| Pagination on tasks/documents | Small | [Performance](./PERFORMANCE_SCALABILITY.md#4-pagination) |
| Redis for rate limiter + cache + mutex | Medium | [Performance](./PERFORMANCE_SCALABILITY.md#1-caching) |

### Phase 6: Structural Quality (Ongoing) — Partially Started

| Item | Effort | Document | Status |
|------|--------|----------|--------|
| Smoke test suite (Playwright, 3 tiers) | Large | [Code Quality](./CODE_QUALITY.md#1-test-coverage) | ✅ 51 tests |
| API endpoint test suite (top 20) | Large | [Code Quality](./CODE_QUALITY.md#1-test-coverage) | TODO |
| Split chat server monolith | Large | [Code Quality](./CODE_QUALITY.md#4-god-files) | TODO |
| Split large components | Medium | [Code Quality](./CODE_QUALITY.md#4-god-files) | TODO |
| Store unit tests | Medium | [Code Quality](./CODE_QUALITY.md#1-test-coverage) | TODO |
| SSO / WorkOS integration | Large | [Security](./SECURITY_HARDENING.md#7-sso) | TODO |
| Image storage migration | Large | [Performance](./PERFORMANCE_SCALABILITY.md#6-image-storage) | TODO |

---

## Not Yet Assessed

These areas were not covered in this round but should be evaluated before public launch:

| Area | Why It Matters |
|------|----------------|
| **Accessibility (WCAG)** | Enterprise customers require WCAG 2.1 AA compliance; no audit has been done |
| **Internationalization (i18n)** | Non-English enterprise markets; all strings are currently hardcoded English |
| **Data export / portability** | GDPR Article 20 requires data portability beyond just a privacy policy page |
| **Disaster recovery (RTO/RPO)** | Backup strategy exists but no defined recovery time or recovery point objectives |

---

## Assessment Methodology

This assessment was conducted through:

1. **Structural analysis** — Directory trees, file counts, line counts across all 670 source files
2. **Pattern sampling** — 5-6 files examined per category (components, endpoints, stores, repos)
3. **Security audit** — Auth flows, secret handling, input validation, header inspection
4. **Performance audit** — Query patterns, caching, connection pooling, pagination, payload handling
5. **Tooling audit** — Build scripts, lint configs, test framework, CI/CD, dependency health
6. **Multi-instance analysis** — In-memory state inventory, horizontal scaling readiness

### Verification Pass (2026-01-30)

A follow-up verification confirmed key claims against actual source code:

| Claim | Verified? | Notes |
|-------|-----------|-------|
| ~~SHA-256 password hashing~~ | ✅ Fixed | Migrated to bcrypt (12 rounds) on 2026-01-31 |
| Secret fallbacks | Confirmed | `SESSION_SECRET` defaults to `'default-secret-change-me'`; `LITELLM_API_KEY` defaults to `'sk-1234'` in 3 files |
| No security headers | Confirmed | `hooks.server.ts` sets zero response headers |
| ESLint unconfigured | Confirmed | No config file; runs with defaults |
| No Prettier config | Confirmed | No `.prettierrc` or `prettier.config.js` |
| WorkOS integrated | **Not confirmed** | Decision log only; no packages or code exist |
| No CI/CD | Confirmed | `.github/workflows/` does not exist |
| N+1 document fetching | **Not confirmed** | Chat endpoint iterates pre-fetched data, not per-document queries |
| No error monitoring | Confirmed | No Sentry packages; docs-only references |
| package.json name outdated | Confirmed | Still reads `"sveltekit-chat"` |

Corrections applied: N+1 severity downgraded to LOW, Redis priority deferred, severity labels adjusted, WorkOS status clarified, `requireAuth()` pattern updated to use SvelteKit idioms, "Not Yet Assessed" section added.

### Progress Update (2026-01-31)

| Item | Change |
|------|--------|
| Password hashing | ✅ Migrated from SHA-256 to bcrypt (12 rounds). Clean break: all existing passwords invalidated, security upgrade emails sent, force-reset flow implemented. |
| Smoke test coverage | ✅ Expanded from ~30 tests to **51 tests** across 3 tiers. Phase 2 (core workflows: chat streaming, CRUD, panels, command palette, error recovery, admin) and Phase 3 (theme persistence, arena, task creation) complete. See `docs/SMOKE_TEST_PLAN.md`. |
| Modal overflow UX | ✅ Fixed SpaceModal and AreaModal CSS — `max-height: 90vh` + flexbox + `overflow-y: auto` on content. |
| Rate limiting (dev) | ✅ Relaxed for dev mode (`import.meta.env.DEV`) to prevent test flakiness. |
| Pre-existing T3 bug | ✅ Fixed "user menu accessible" test — dual header strict mode violation. |
