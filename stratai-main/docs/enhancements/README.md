# Enhancement Roadmap

> Comprehensive assessment and prioritized plan for taking StratAI from internal development to a production-ready, public-facing platform open to external developers.

**Assessment Date:** 2026-01-30
**Codebase Snapshot:** ~192K lines of code, ~670 source files, 32 database tables, 256 components, 22 stores, 113 API endpoints

---

## Documents

| Document | Scope | Key Findings |
|----------|-------|--------------|
| [Code Quality](./CODE_QUALITY.md) | Developer experience, patterns, test coverage, build tooling | 8 test files for 192K LOC; ESLint unconfigured; god files; duplicated auth patterns |
| [Security Hardening](./SECURITY_HARDENING.md) | Auth, secrets, headers, encryption, input validation | SHA-256 passwords; default secret fallbacks; no security headers; no email verification |
| [Performance & Scalability](./PERFORMANCE_SCALABILITY.md) | Caching, queries, pagination, multi-instance, payloads | No caching layer; in-memory state breaks multi-instance; N+1 in chat; missing pagination |
| [Operational Readiness](./OPERATIONAL_READINESS.md) | Monitoring, logging, CI/CD, backups, legal, onboarding | No error monitoring; no CI/CD; console-only logging; no legal pages; outdated README |

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

### Phase 1: Security (Week 1)

| Item | Effort | Document |
|------|--------|----------|
| Migrate password hashing to bcrypt | Small | [Security](./SECURITY_HARDENING.md#1-password-hashing) |
| Fail-fast on missing secrets | Small | [Security](./SECURITY_HARDENING.md#2-secret-management) |
| Add security headers middleware | Small | [Security](./SECURITY_HARDENING.md#3-security-headers) |
| Configure HTTPS / reverse proxy | Medium | [Security](./SECURITY_HARDENING.md#4-https) |

### Phase 2: Ops Foundation (Week 2)

| Item | Effort | Document |
|------|--------|----------|
| Error monitoring (Sentry) | Small | [Ops](./OPERATIONAL_READINESS.md#1-error-monitoring) |
| Structured logging | Medium | [Ops](./OPERATIONAL_READINESS.md#2-logging) |
| CI/CD pipeline (GitHub Actions) | Small | [Ops](./OPERATIONAL_READINESS.md#3-cicd) |
| Database backup strategy | Medium | [Ops](./OPERATIONAL_READINESS.md#4-backups) |

### Phase 3: Developer Experience (Week 3)

| Item | Effort | Document |
|------|--------|----------|
| ESLint configuration | Small | [Code Quality](./CODE_QUALITY.md#2-build-tooling) |
| README rewrite + CONTRIBUTING.md | Medium | [Ops](./OPERATIONAL_READINESS.md#6-contribution-infrastructure) |
| Centralized API error handling | Medium | [Code Quality](./CODE_QUALITY.md#3-api-error-handling) |
| Pre-commit hooks (husky/lint-staged) | Small | [Ops](./OPERATIONAL_READINESS.md#6-contribution-infrastructure) |

### Phase 4: Legal + Auth (Week 3-4)

| Item | Effort | Document |
|------|--------|----------|
| Privacy policy + Terms of Service pages | Medium | [Ops](./OPERATIONAL_READINESS.md#5-legal) |
| Email verification flow | Medium | [Security](./SECURITY_HARDENING.md#5-email-verification) |
| Remove env var password override | Small | [Security](./SECURITY_HARDENING.md#2-secret-management) |

### Phase 5: Scale Preparation (Week 4-5)

| Item | Effort | Document |
|------|--------|----------|
| Redis for rate limiter + cache + mutex | Medium | [Performance](./PERFORMANCE_SCALABILITY.md#1-caching) |
| Pagination on tasks/documents | Small | [Performance](./PERFORMANCE_SCALABILITY.md#4-pagination) |
| Batch document fetching in chat | Medium | [Performance](./PERFORMANCE_SCALABILITY.md#3-n1-queries) |
| Input validation library (Zod) | Medium | [Security](./SECURITY_HARDENING.md#6-input-validation) |

### Phase 6: Structural Quality (Ongoing)

| Item | Effort | Document |
|------|--------|----------|
| API endpoint test suite (top 20) | Large | [Code Quality](./CODE_QUALITY.md#1-test-coverage) |
| Split chat server monolith | Large | [Code Quality](./CODE_QUALITY.md#4-god-files) |
| Split large components | Medium | [Code Quality](./CODE_QUALITY.md#4-god-files) |
| Store unit tests | Medium | [Code Quality](./CODE_QUALITY.md#1-test-coverage) |
| SSO / WorkOS integration | Large | [Security](./SECURITY_HARDENING.md#7-sso) |
| Image storage migration | Large | [Performance](./PERFORMANCE_SCALABILITY.md#6-image-storage) |

---

## Assessment Methodology

This assessment was conducted through:

1. **Structural analysis** — Directory trees, file counts, line counts across all 670 source files
2. **Pattern sampling** — 5-6 files examined per category (components, endpoints, stores, repos)
3. **Security audit** — Auth flows, secret handling, input validation, header inspection
4. **Performance audit** — Query patterns, caching, connection pooling, pagination, payload handling
5. **Tooling audit** — Build scripts, lint configs, test framework, CI/CD, dependency health
6. **Multi-instance analysis** — In-memory state inventory, horizontal scaling readiness
