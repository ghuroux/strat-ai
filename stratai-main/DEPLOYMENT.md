# StratAI Deployment Guide

> **Last updated:** 2026-01-19

This guide covers deploying StratAI to production environments, specifically AWS.

## Table of Contents

- [Quick Start (Docker Compose)](#quick-start-docker-compose)
- [AWS Deployment](#aws-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [LiteLLM Configuration](#litellm-configuration)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (Docker Compose)

For a quick local or single-server deployment:

```bash
cd stratai-main

# 1. Create environment file
cp .env.example .env

# 2. Edit .env with your values:
#    - SESSION_SECRET (required): openssl rand -hex 32
#    - ANTHROPIC_API_KEY (required): Your Anthropic API key
#    - Other optional keys (OpenAI, Google, AWS Bedrock)

# 3. Start all services
docker compose -f docker-compose.prod.yml up -d

# 4. Check status
docker compose -f docker-compose.prod.yml ps

# 5. View logs
docker compose -f docker-compose.prod.yml logs -f stratai
```

Services:
- **StratAI App**: http://localhost:3000
- **LiteLLM Proxy**: http://localhost:4000
- **PostgreSQL**: localhost:5432

Default test users (password: `password123`):
- `gabriel@stratech.co.za` (owner)
- `william@strathost.co.za` (admin)

---

## AWS Deployment

### Architecture Options

#### Option A: EC2 + RDS (Recommended for simplicity)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ALB/ELB   │────▶│    EC2      │────▶│   RDS       │
│   (HTTPS)   │     │  (StratAI)  │     │ (PostgreSQL)│
└─────────────┘     │  (LiteLLM)  │     └─────────────┘
                    └─────────────┘
```

#### Option B: ECS/Fargate (Recommended for scale)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ALB/ELB   │────▶│    ECS      │────▶│   RDS       │
│   (HTTPS)   │     │  (Fargate)  │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
```

### Step-by-Step: EC2 + RDS

#### 1. Create RDS PostgreSQL Instance

```bash
# Via AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier stratai-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 17 \
  --master-username stratai_admin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --db-name stratai \
  --publicly-accessible false
```

**Important RDS settings:**
- PostgreSQL 17+ (required for `gen_random_uuid()`)
- Enable `pgcrypto` extension (done automatically by fresh-install)
- Use a VPC security group that allows access from your EC2 instance

#### 2. Create EC2 Instance

```bash
# Launch Amazon Linux 2023 or Ubuntu 22.04
# t3.medium or larger recommended

# Install Docker
sudo dnf install -y docker  # Amazon Linux
# or
sudo apt-get install -y docker.io  # Ubuntu

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. Clone and Configure

```bash
# Clone repository
git clone YOUR_REPO_URL /opt/stratai
cd /opt/stratai/stratai-main

# Create environment file
cp .env.example .env

# Edit .env with production values
nano .env
```

#### 4. Run Database Setup (Fresh Install)

```bash
# Set your RDS connection string
export DATABASE_URL="postgres://stratai_admin:PASSWORD@your-rds-endpoint.rds.amazonaws.com:5432/stratai?sslmode=require"

# Run fresh install (creates schema + seed data)
cd fresh-install
./install.sh "$DATABASE_URL"
```

#### 5. Build and Run

```bash
cd /opt/stratai/stratai-main

# Build the app
docker build -t stratai:latest .

# Run with docker-compose (exclude postgres service since using RDS)
docker compose -f docker-compose.prod.yml up -d stratai litellm
```

#### 6. Configure Load Balancer

Create an Application Load Balancer (ALB) with:
- HTTPS listener (port 443)
- Target group pointing to EC2:3000
- Health check path: `/api/health`
- SSL certificate from ACM

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/stratai` |
| `SESSION_SECRET` | 64-char hex for session encryption | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | `sk-ant-api03-...` |

### Optional (LLM Providers)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `GOOGLE_API_KEY` | Google AI API key |
| `AWS_ACCESS_KEY_ID` | AWS Bedrock access key |
| `AWS_SECRET_ACCESS_KEY` | AWS Bedrock secret key |
| `AWS_REGION_NAME` | AWS region (default: `us-east-1`) |

### Optional (Features)

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | SendGrid API key for emails |
| `SENDGRID_FROM_EMAIL` | From email address |
| `BRAVE_SEARCH_API_KEY` | Brave Search API key |
| `BASE_URL` | Public URL (for email links) |

### Docker-specific

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | `production` | Environment |

---

## Database Setup

### Fresh Install (Recommended for new deployments)

```bash
cd stratai-main/fresh-install

# Option 1: Using install.sh
./install.sh "postgres://user:pass@host:5432/stratai"

# Option 2: Manual
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -f seed-data.sql
```

### Migration-based (For existing databases)

```bash
cd stratai-main

# Using the setup script
./scripts/setup-db.sh "postgres://user:pass@host:5432/stratai"
```

### Verify Installation

```sql
-- Connect to database
psql "$DATABASE_URL"

-- Check tables (should be 33 including schema_migrations)
\dt

-- Check migration version
SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;

-- Check organizations
SELECT * FROM organizations;

-- Check users
SELECT id, email, display_name FROM users;
```

---

## LiteLLM Configuration

LiteLLM is configured via `litellm-config.yaml`. Key features:

- **Prompt caching** enabled for Anthropic models (90% cost savings)
- **Fallback models** configured for reliability
- **Multiple providers**: Anthropic, OpenAI, AWS Bedrock, Google

### Adding/Removing Models

Edit `litellm-config.yaml`:

```yaml
model_list:
  - model_name: my-custom-model
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY
      max_tokens: 8192
```

Then restart LiteLLM:

```bash
docker compose -f docker-compose.prod.yml restart litellm
```

---

## Health Checks

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Basic health check |
| `GET /api/health?db=true` | Health check with database connectivity |

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2026-01-19T12:00:00.000Z",
  "version": "0.1.0",
  "database": {
    "status": "connected",
    "latencyMs": 5
  }
}
```

### AWS ALB Configuration

- Health check path: `/api/health`
- Healthy threshold: 2
- Unhealthy threshold: 3
- Interval: 30 seconds
- Timeout: 10 seconds

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs stratai_app

# Common issues:
# - Missing DATABASE_URL
# - Invalid SESSION_SECRET (must be 64 hex chars)
# - Database not accessible
```

### Database connection failed

```bash
# Test connection from container
docker exec -it stratai_app psql "$DATABASE_URL" -c "SELECT 1"

# Check:
# - Security groups allow 5432 from EC2
# - RDS is in same VPC
# - SSL mode in connection string if required
```

### LiteLLM not responding

```bash
# Check LiteLLM logs
docker logs stratai_litellm

# Common issues:
# - Missing API keys
# - Invalid litellm-config.yaml
# - Port 4000 already in use
```

### Can't login with test users

```bash
# Check if seed data was loaded
psql "$DATABASE_URL" -c "SELECT email, status FROM users"

# If empty, run seed data again:
psql "$DATABASE_URL" -f fresh-install/seed-data.sql
```

### Check database schema version

```bash
psql "$DATABASE_URL" -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5"
```

---

## Security Checklist

Before going to production:

- [ ] Change default passwords (seed data uses `password123`)
- [ ] Generate strong `SESSION_SECRET` (`openssl rand -hex 32`)
- [ ] Use HTTPS (SSL/TLS termination at load balancer)
- [ ] Restrict RDS security group to app servers only
- [ ] Enable RDS encryption at rest
- [ ] Use IAM roles instead of access keys for Bedrock
- [ ] Enable CloudWatch logging
- [ ] Set up backup retention for RDS
- [ ] Configure CloudWatch alarms for health check failures

---

## Support

For issues:
1. Check container logs: `docker logs <container>`
2. Check database connectivity: `/api/health?db=true`
3. Review this guide's Troubleshooting section
4. Contact the StratAI team
