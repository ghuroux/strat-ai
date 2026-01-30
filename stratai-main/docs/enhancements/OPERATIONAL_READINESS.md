# Operational Readiness Assessment

> Findings on monitoring, logging, CI/CD, backups, legal compliance, and developer onboarding for a public-facing platform.

**Assessment Date:** 2026-01-30

---

## 1. Error Monitoring {#1-error-monitoring}

**Severity: HIGH**
**Current State: None**

### Problem

No error tracking service configured. Errors are logged to `console.error` and disappear into container stdout. In production:
- Server errors are invisible until users report them
- No error grouping, frequency tracking, or alerting
- No stack traces with source maps
- No user session context on errors

### Fix: Sentry Integration

```typescript
// src/hooks.server.ts
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% of requests for performance monitoring
    beforeSend(event) {
        // Scrub PII: email, session tokens, API keys
        if (event.request?.headers) {
            delete event.request.headers['cookie'];
            delete event.request.headers['authorization'];
        }
        return event;
    }
});

export const handleError = Sentry.handleErrorWithSentry();
```

```typescript
// src/hooks.client.ts
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
    dsn: process.env.PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()]
});
```

### Alerting Rules

| Condition | Channel | Action |
|-----------|---------|--------|
| 5xx rate > 1% of requests | Slack + Email | Investigate immediately |
| New error type (never seen before) | Slack | Triage within 4 hours |
| Error spike (10x normal rate) | PagerDuty | On-call response |
| Unhandled promise rejection | Slack | Fix in next sprint |

---

## 2. Structured Logging {#2-logging}

**Severity: MEDIUM-HIGH**
**Current State: Console-only, unstructured**

### Problem

35+ endpoints log with `console.error` in free-form strings:

```typescript
// Current pattern (everywhere)
console.error('Failed to fetch documents:', error);
console.error('Calendar sync failed for user', userId, error.message);
```

Issues:
- No log levels (info, warn, error, debug)
- No structured format (can't query in log aggregator)
- No request correlation (can't trace a request across logs)
- No PII redaction (user IDs, emails may appear in logs)
- Upload endpoint logs file content previews

### Fix: Structured Logger

```typescript
// src/lib/server/logger.ts
import pino from 'pino';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => ({ level: label })
    },
    redact: {
        paths: ['email', 'password', 'token', 'sessionId', 'req.headers.cookie'],
        censor: '[REDACTED]'
    },
    serializers: {
        err: pino.stdSerializers.err,
        req: pino.stdSerializers.req
    }
});

// Usage in endpoints:
logger.info({ userId, spaceId, action: 'document.create' }, 'Document created');
logger.error({ userId, err, endpoint: '/api/chat' }, 'Chat stream failed');
```

### Log Aggregation

Ship logs to a centralized service:
- **Development:** pino-pretty to stdout
- **Production:** JSON to stdout → Docker log driver → CloudWatch / Datadog / Grafana Loki

### Migration Path

1. Add pino dependency
2. Create `logger.ts` with redaction rules
3. Replace `console.error` calls endpoint-by-endpoint (35+ files)
4. Add request ID middleware in `hooks.server.ts` for correlation
5. Configure log shipping in Docker/deployment

---

## 3. CI/CD Pipeline {#3-cicd}

**Severity: HIGH**
**Current State: No `.github/workflows/` directory**

### Problem

No automated checks on pull requests. Every merge is a manual trust exercise:
- Type errors can be introduced without detection
- Linting issues accumulate
- Tests aren't run before merge
- Build failures discovered in production

### Fix: GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: stratai-main/package-lock.json

      - name: Install dependencies
        working-directory: stratai-main
        run: npm ci

      - name: Type check
        working-directory: stratai-main
        run: npm run check

      - name: Lint
        working-directory: stratai-main
        run: npm run lint

      - name: Unit tests
        working-directory: stratai-main
        run: npm test

      - name: Build
        working-directory: stratai-main
        run: npm run build

  # Smoke tests run separately (need database)
  smoke:
    runs-on: ubuntu-latest
    needs: quality
    services:
      postgres:
        image: postgres:18
        env:
          POSTGRES_DB: stratai_test
          POSTGRES_USER: stratai
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: stratai-main/package-lock.json

      - name: Install dependencies
        working-directory: stratai-main
        run: npm ci

      - name: Install Playwright
        working-directory: stratai-main
        run: npx playwright install --with-deps chromium

      - name: Setup test database
        working-directory: stratai-main
        run: psql -f fresh-install/schema.sql
        env:
          DATABASE_URL: postgres://stratai:test@localhost:5432/stratai_test

      - name: Run smoke tests (Tier 1 only on PR)
        working-directory: stratai-main
        run: npm run test:smoke:tier1
        env:
          DATABASE_URL: postgres://stratai:test@localhost:5432/stratai_test
```

### Branch Protection

After CI is in place, configure GitHub branch protection on `main`:
- Require status checks to pass (quality job)
- Require pull request reviews (1 reviewer minimum)
- Require branches to be up to date before merging

---

## 4. Database Backups {#4-backups}

**Severity: HIGH**
**Current State: Manual `stratai-backup.dump` at repo root (one-time snapshot)**

### Problem

No automated backup strategy. One bad migration, accidental deletion, or disk failure loses all enterprise conversation data, meeting notes, decisions, and context.

### Fix: Automated Backup Strategy

```bash
#!/bin/bash
# scripts/backup.sh — run via cron or scheduled task

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/stratai"
RETENTION_DAYS=30

# Full backup with compression
pg_dump -Fc --no-owner \
  -h localhost -U stratai -d stratai \
  > "${BACKUP_DIR}/stratai_${TIMESTAMP}.dump"

# Upload to S3/R2
aws s3 cp "${BACKUP_DIR}/stratai_${TIMESTAMP}.dump" \
  "s3://stratai-backups/daily/${TIMESTAMP}.dump"

# Cleanup old local backups
find "${BACKUP_DIR}" -name "*.dump" -mtime +${RETENTION_DAYS} -delete
```

### Backup Schedule

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Full backup | Daily (2am UTC) | 30 days | S3/R2 |
| WAL archiving | Continuous | 7 days | S3/R2 |
| Point-in-time recovery | Always available | 7 day window | WAL + base backup |

### Testing Backups

Schedule monthly restore tests:
1. Restore backup to test database
2. Run smoke tests against restored data
3. Verify row counts match production
4. Document results in ops log

---

## 5. Legal Compliance {#5-legal}

**Severity: HIGH (launch blocker)**
**Current State: No legal pages exist**

### Required Pages

| Page | Route | Required By |
|------|-------|-------------|
| Privacy Policy | `/privacy` | GDPR, CCPA, app stores |
| Terms of Service | `/terms` | Legal protection, user agreement |
| Cookie Policy | `/cookies` | GDPR (if using cookies — we do) |
| Acceptable Use | `/acceptable-use` | Enterprise governance, LLM usage |

### Privacy Policy Must Cover

For an LLM-powered platform handling enterprise data:

1. **Data collection:** What user data is collected (conversations, documents, meetings, tasks)
2. **LLM processing:** How conversations are sent to third-party LLM providers (Anthropic, OpenAI, Google)
3. **Data retention:** How long conversations and documents are stored
4. **Data deletion:** User's right to delete their data (GDPR Article 17)
5. **Third-party sharing:** LLM providers, email (SendGrid), calendar (Microsoft Graph)
6. **Enterprise data segregation:** How org data is isolated (multi-tenancy model)
7. **Cookie usage:** Session cookies, localStorage usage
8. **Sub-processors:** List of third-party services that process user data

### Terms of Service Must Cover

1. **LLM output disclaimer:** AI outputs may be inaccurate, user responsible for verification
2. **Acceptable use:** No illegal content, no prompt injection attacks, no circumventing guardrails
3. **Data ownership:** User owns their content; StratAI has license to process
4. **Service availability:** No SLA guarantee (for non-enterprise tiers)
5. **Account termination:** Conditions under which accounts can be suspended
6. **Billing terms:** Subscription, cancellation, refund policy

### Implementation

1. Engage legal counsel for policy drafting (not AI-generated)
2. Create static routes: `/privacy`, `/terms`, `/cookies`, `/acceptable-use`
3. Add footer links to all pages
4. Add consent checkbox to registration flow
5. Track consent version (when user agreed to which version)

---

## 6. Contribution Infrastructure {#6-contribution-infrastructure}

**Severity: MEDIUM (for opening to other developers)**

### Current State

| Asset | Exists? | Quality |
|-------|---------|---------|
| README.md | Yes | Outdated (acknowledged in Known Issues) |
| CONTRIBUTING.md | No | — |
| CLAUDE.md | Yes | Excellent (but AI-oriented, not human-oriented) |
| PR template | Yes | `.github/pull_request_template.md` |
| Issue templates | No | — |
| CODEOWNERS | No | — |
| Pre-commit hooks | No | — |
| Architecture docs | Yes | Thorough but scattered |

### README Rewrite

The README should cover:

```markdown
# StratAI

Enterprise LLM context-aware routing platform.

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 18
- Docker & Docker Compose

### Setup
1. Clone the repository
2. Copy environment file: `cp .env.example .env`
3. Start infrastructure: `docker-compose up -d`
4. Install dependencies: `cd stratai-main && npm install`
5. Setup database: `npm run db:setup`
6. Start dev server: `npm run dev`
7. Open http://localhost:5173

### Key Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run check` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests |
| `npm run test:smoke` | E2E smoke tests |
| `npm run build` | Production build |

### Architecture
See [docs/enhancements/README.md](docs/enhancements/README.md) for
codebase assessment and [docs/architecture/](docs/architecture/) for
design documents.

### Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
```

### CONTRIBUTING.md

```markdown
# Contributing to StratAI

## Development Workflow
1. Create a feature branch from `main`
2. Make changes following our coding standards
3. Run quality checks: `npm run check && npm run lint && npm test`
4. Submit a pull request using the PR template
5. Address review feedback

## Coding Standards
- **Components:** Svelte 5 runes ($state, $derived, $effect)
- **Stores:** SvelteMap for collections, $state for flags, _version counter
- **Database:** Always access columns as camelCase (row.userId, not row.user_id)
- **Icons:** Use lucide-svelte (not inline SVG)
- **Theme:** Support both dark and light modes (dark: prefix pattern)
- **API:** Use locals.session for auth (never custom cookie parsing)

## File Naming
- Components: PascalCase.svelte
- Stores: camelCase.svelte.ts
- Repositories: entity-postgres.ts
- Routes: lowercase with [params]

## Before Submitting
- [ ] `npm run check` passes (0 errors)
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds
- [ ] Both dark and light mode tested for UI changes
```

### Pre-Commit Hooks

```bash
npm install --save-dev husky lint-staged
npx husky init
```

```json
// package.json
"lint-staged": {
    "*.{ts,svelte}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
}
```

### GitHub Issue Templates

Create `.github/ISSUE_TEMPLATE/`:
- `bug_report.md` — Steps to reproduce, expected vs actual behavior
- `feature_request.md` — Problem statement, proposed solution, alternatives
- `enhancement.md` — Existing feature improvement

### CODEOWNERS

```
# .github/CODEOWNERS
# Default owners for everything
* @stratai/core-team

# Security-sensitive files require security review
src/lib/server/auth.ts @stratai/security
src/lib/server/session.ts @stratai/security
src/hooks.server.ts @stratai/security

# Database changes require DB review
src/lib/server/persistence/migrations/ @stratai/database
fresh-install/schema.sql @stratai/database
```

---

## 7. Health Checks & Uptime Monitoring {#7-health}

**Severity: MEDIUM**

### Current State

A basic health endpoint exists at `/api/health` and `/api/integrations/calendar/health`. No external uptime monitoring.

### Fix

1. **Expand health check** to verify all dependencies:

```typescript
// GET /api/health
export async function GET() {
    const checks = {
        database: await checkDatabase(),
        litellm: await checkLiteLLM(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version
    };

    const healthy = Object.values(checks)
        .filter(v => typeof v === 'object')
        .every(c => c.status === 'ok');

    return json(checks, { status: healthy ? 200 : 503 });
}
```

2. **External monitoring** (UptimeRobot, Better Stack, Checkly):
   - Ping `/api/health` every 60 seconds
   - Alert on 2 consecutive failures
   - Track response time trends

3. **Docker health check** (already partially in place):

```yaml
healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

---

## 8. Environment Documentation {#8-environment}

**Severity: LOW-MEDIUM**

### Current State

`.env.example` exists but may not be comprehensive.

### Fix

Maintain a complete `.env.example` with comments:

```bash
# === Required ===
DATABASE_URL=postgres://user:password@localhost:5432/stratai
SESSION_SECRET=generate-a-64-char-random-string
ENCRYPTION_KEY=generate-a-32-byte-hex-string

# === LLM Routing ===
LITELLM_API_KEY=your-litellm-key
LITELLM_URL=http://localhost:4000

# === Email (Optional — required for password reset, notifications) ===
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@yourdomain.com

# === Calendar Integration (Optional) ===
AZURE_CLIENT_ID=your-azure-app-client-id
AZURE_CLIENT_SECRET=your-azure-app-client-secret
AZURE_TENANT_ID=your-azure-tenant-id

# === Monitoring (Optional — recommended for production) ===
SENTRY_DSN=https://your-sentry-dsn
PUBLIC_SENTRY_DSN=https://your-public-sentry-dsn
LOG_LEVEL=info

# === Development ===
NODE_ENV=development
```

---

## Summary of Recommended Actions

| Priority | Action | Effort | Blocks Launch? |
|----------|--------|--------|---------------|
| **P0** | Error monitoring (Sentry) | Small | Yes — blind without it |
| **P0** | CI/CD pipeline (GitHub Actions) | Small | Yes — quality gate |
| **P0** | Legal pages (privacy, terms) | Medium | Yes — legal blocker |
| **P0** | Database backup automation | Medium | Yes — data safety |
| **P1** | Structured logging (pino) | Medium | Recommended |
| **P1** | README rewrite | Medium | Recommended for devs |
| **P1** | CONTRIBUTING.md | Small | Recommended for devs |
| **P2** | Pre-commit hooks (husky) | Small | Nice to have |
| **P2** | Health check expansion | Small | Nice to have |
| **P2** | GitHub issue templates | Small | Nice to have |
| **P2** | CODEOWNERS | Small | Nice to have |
| **P3** | External uptime monitoring | Small | Post-launch |
| **P3** | Environment documentation | Small | Ongoing |
