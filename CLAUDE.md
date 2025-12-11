# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Docker Compose deployment package for AnythingLLM with enhanced document export capabilities (DOCX/PDF/Markdown). The deployment includes:
- **AnythingLLM** (main application, port 3001)
- **PostgreSQL 15** (persistent database, port 5432)
- **LiteLLM Proxy** (flexible LLM model management, port 4000)
- **Gotenberg** (advanced PDF conversion service, port 3002)
- **Custom Skills** (Node.js-based document export extensions)

## Essential Commands

### Setup and Deployment
```bash
# Automated setup (recommended)
./setup.sh

# Manual setup
cp .env.template .env
# Edit .env with API keys
mkdir -p exports custom-skills init-scripts
cd custom-skills && npm install && cd ..
docker-compose up -d

# View logs
docker-compose logs -f anythingllm

# Check service status
docker-compose ps
docker inspect anythingllm --format='{{.State.Health.Status}}'
```

### Development and Maintenance
```bash
# Restart services
docker-compose restart anythingllm

# Stop services
docker-compose down

# Update to latest versions
docker-compose pull
docker-compose up -d --force-recreate

# Backup data
./backup.sh
# Or manually:
docker exec anythingllm_postgres pg_dump -U anythingllm anythingllm_db > backup.sql

# Restore database
docker exec -i anythingllm_postgres psql -U anythingllm anythingllm_db < backup.sql
```

### Troubleshooting
```bash
# View logs for specific service
docker-compose logs -f anythingllm
docker-compose logs -f postgres
docker-compose logs -f litellm

# Check export issues
ls -la exports/
docker-compose logs anythingllm | grep -i export

# Fix permissions
chmod -R 755 exports/ custom-skills/

# Verify Gotenberg service
curl http://localhost:3002/health

# Reinstall custom skills
cd custom-skills && npm install && cd ..
docker-compose restart anythingllm
```

## Architecture

### Service Dependencies
```
AnythingLLM depends on:
  ├─ PostgreSQL (database, must be healthy before AnythingLLM starts)
  ├─ LiteLLM (optional, for model management)
  └─ Gotenberg (optional, for advanced PDF conversion)

LiteLLM depends on:
  └─ PostgreSQL (for litellm_db database)
```

### Volume Mounts and Data Persistence
- **Docker Volumes** (managed by Docker):
  - `anythingllm_storage` → `/app/server/storage`
  - `anythingllm_documents` → `/app/server/storage/documents`
  - `anythingllm_vector_cache` → `/app/server/storage/vector-cache`
  - `anythingllm_logs` → `/app/server/logs`
  - `postgres_data` → PostgreSQL data directory

- **Host Bind Mounts** (accessible from host):
  - `./custom-skills` → `/app/server/storage/plugins/agent-skills` (custom agent skills)
  - `./exports` → `/app/server/storage/exports` (exported documents)
  - `./litellm-config.yaml` → `/app/config.yaml` (LiteLLM configuration)
  - `./init-scripts` → `/docker-entrypoint-initdb.d` (PostgreSQL init scripts)

### Database Configuration
- Two databases run on the same PostgreSQL instance:
  - `anythingllm_db` - main application database
  - `litellm_db` - LiteLLM proxy database (auto-created)
- Connection string format: `postgresql://anythingllm:securepassword123@postgres:5432/anythingllm_db`
- **Critical:** AnythingLLM requires the environment variable `DATABASE_URL` (not `DATABASE_CONNECTION_STRING`) and must use the `:pg` Docker image
- LiteLLM caching is disabled by default (set `cache: false` in `litellm-config.yaml`) to avoid requiring Redis

### LLM Provider Configuration
The setup supports multiple LLM providers via environment variables in `.env`:

**Direct Anthropic:**
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
AGENT_PROVIDER=anthropic
AGENT_MODEL=claude-3-5-sonnet-20241022
```

**Via LiteLLM Proxy (recommended):**
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-1234  # LiteLLM master key
OPENAI_BASE_URL=http://litellm:4000
```

**Model Routing:**
- LiteLLM config (`litellm-config.yaml`) defines available models, fallback strategies, and rate limits
- Model aliases allow grouping (e.g., "claude" group includes sonnet and opus)
- Automatic fallback: if primary model fails, requests fall back to secondary models

### Custom Skills System
The document export functionality is implemented as a custom agent skill:

**Location:** `custom-skills/document-export.js`

**Key Implementation Details:**
- Exports content to `/app/server/storage/exports` (mapped to `./exports/` on host)
- Supports DOCX (via `docx` npm package), PDF (via `pdfkit`), and Markdown
- Parses content by detecting markdown syntax (headings with `#`, code blocks with ` ``` `)
- Creates structured documents with proper formatting and metadata

**Dependencies:** Defined in `custom-skills/package.json`
- `docx` - DOCX generation
- `pdfkit` - PDF generation
- `puppeteer`, `html-pdf` - HTML to PDF conversion
- `mammoth` - DOCX parsing

**Activation:**
1. Install dependencies: `cd custom-skills && npm install`
2. Enable in AnythingLLM UI: Settings → Agent Configuration → Enable "Custom Skills"
3. Must have `AGENT_CUSTOM_SKILLS=true` and `ENABLE_EXPORT=true` in `.env`

## Configuration Files

### `.env` (Environment Variables)
Primary configuration file. Key variables:
- `JWT_SECRET` - Must be set to secure random value (generated by `setup.sh`)
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` - LLM provider credentials
- `AGENT_PROVIDER`, `AGENT_MODEL` - LLM configuration
- `AGENT_SKILLS` - Comma-separated list of enabled agent skills
- `ENABLE_EXPORT=true` - Required for document export features
- `AGENT_CUSTOM_SKILLS=true` - Required for custom skills

### `docker-compose.yml`
Defines all services, networking, volumes, and health checks. Key points:
- Uses `unless-stopped` restart policy
- Health checks on PostgreSQL (10s interval) and AnythingLLM (30s interval)
- Bridge networking for inter-service communication
- AnythingLLM requires `SYS_ADMIN` capability and `apparmor:unconfined` for proper operation

### `litellm-config.yaml`
Configures LiteLLM proxy behavior:
- Model list with API keys and parameters
- Fallback routing and model aliases
- Rate limiting (50 parallel requests, 100 requests/minute)
- Retry configuration (3 attempts, 1s delay)
- Timeout settings (600s general, 60s streaming)
- Caching enabled (1 hour TTL)

## Important File Paths

**Inside AnythingLLM Container:**
- Storage: `/app/server/storage`
- Documents: `/app/server/storage/documents`
- Exports: `/app/server/storage/exports`
- Vector cache: `/app/server/storage/vector-cache`
- Custom skills: `/app/server/storage/plugins/agent-skills`

**On Host:**
- Exports: `./exports/` (accessible directly)
- Custom skills: `./custom-skills/`
- Configuration: `./.env`, `./docker-compose.yml`, `./litellm-config.yaml`

## Security Considerations

When modifying this deployment:
1. **Always change default passwords in production** (JWT_SECRET, POSTGRES_PASSWORD, LITELLM_MASTER_KEY)
2. **Never commit `.env` file** (contains API keys and secrets)
3. **Port exposure**: Only expose necessary ports; consider reverse proxy for production
4. **Database access**: PostgreSQL port 5432 is exposed for debugging but should be restricted in production
5. **File permissions**: Export directory must be writable by container (755 permissions)

## Common Development Tasks

### Adding New Models to LiteLLM
Edit `litellm-config.yaml` and add to `model_list`:
```yaml
- model_name: your-model-name
  litellm_params:
    model: provider/model-identifier
    api_key: ${YOUR_API_KEY}
    max_tokens: 4096
```
Then restart: `docker-compose restart litellm`

### Modifying Custom Skills
1. Edit `custom-skills/document-export.js`
2. Update dependencies in `custom-skills/package.json` if needed
3. Run `cd custom-skills && npm install && cd ..`
4. Restart AnythingLLM: `docker-compose restart anythingllm`

### Changing Database Passwords
1. Stop services: `docker-compose down`
2. Update password in `.env` and `docker-compose.yml` DATABASE_CONNECTION_STRING
3. Delete volumes: `docker volume rm anythingllm-docker-complete_postgres_data` (WARNING: deletes data)
4. Start fresh: `docker-compose up -d`

For production, backup data first and restore after password change.

### Accessing PostgreSQL Directly
```bash
# Via Docker exec
docker exec -it anythingllm_postgres psql -U anythingllm -d anythingllm_db

# Via host (requires psql client)
psql -h localhost -p 5432 -U anythingllm -d anythingllm_db
```

## Troubleshooting Guide

### Export Features Not Working
1. Check agent skills enabled in UI (Settings → Agent Configuration)
2. Verify `ENABLE_EXPORT=true` and `AGENT_CUSTOM_SKILLS=true` in `.env`
3. Ensure custom skills installed: `ls -la custom-skills/node_modules/`
4. Check export directory permissions: `chmod 755 exports/`
5. View logs: `docker-compose logs anythingllm | grep -i export`

### Container Won't Start
1. Check logs: `docker-compose logs anythingllm`
2. Verify `.env` exists and is configured
3. Check port availability: `lsof -i :3001`
4. Verify PostgreSQL is healthy: `docker-compose ps`

### Database Connection Issues
1. Verify PostgreSQL container is running and healthy
2. Check connection string matches in `.env` and `docker-compose.yml`
3. Test connection: `docker exec -it anythingllm_postgres psql -U anythingllm -d anythingllm_db`

### LiteLLM Proxy Issues
1. Check logs: `docker-compose logs litellm`
2. Verify API keys in `.env` are correct
3. Test proxy endpoint: `curl http://localhost:4000/health`
4. Check model configuration in `litellm-config.yaml`

## References

Additional documentation in this repository:
- `INSTALL.md` - Comprehensive installation guide
- `TROUBLESHOOTING.md` - Detailed troubleshooting steps
- `QUICK_REFERENCE.md` - Command cheat sheet
- `README.md` - Overview and quick start

External documentation:
- AnythingLLM: https://docs.anythingllm.com
- LiteLLM: https://docs.litellm.ai
- Gotenberg: https://gotenberg.dev
