# StratAI Fresh Install

This directory contains scripts for a clean database installation, replacing the migration-based approach with a single comprehensive schema.

## When to Use This

Use fresh install instead of migrations when:
- Starting a new test/staging environment
- Resetting for a new testing phase (e.g., broader user testing)
- Migration chain has become complex with many fixes
- You want a predictable, known-good database state

## Prerequisites

- PostgreSQL 15 or higher
- `psql` command-line tool
- Database user with CREATE privileges

## Files

| File | Description |
|------|-------------|
| `schema.sql` | Complete database schema (all tables, indexes, constraints, triggers) |
| `seed-data.sql` | Initial test data (StraTech org, test users, spaces) |
| `README.md` | This file |

## Installation Steps

### 1. Create the Database

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create the database
CREATE DATABASE stratai;

# Create a user (if needed)
CREATE USER stratai_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE stratai TO stratai_user;

# Exit
\q
```

### 2. Run the Schema

```bash
# From the fresh-install directory
psql -U stratai_user -d stratai -f schema.sql
```

Or if using a connection string:

```bash
psql "postgresql://user:password@host:5432/stratai" -f schema.sql
```

### 3. Run the Seed Data

```bash
psql -U stratai_user -d stratai -f seed-data.sql
```

### 4. Password Information

The seed data includes working password hashes for both users:
- **Password:** `password123`
- **Format:** Custom SHA256 (`salt:sha256(password+salt)`)

Users should change their passwords after first login via Settings > Password.

To generate a new password hash in Node.js:

```javascript
const crypto = require('crypto');
const password = 'your_password_here';
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
console.log(salt + ':' + hash);
```

Or use the app's auth module:

```javascript
const { hashPassword } = require('./src/lib/server/auth');
console.log(hashPassword('your_password_here'));
```

### 5. Verify Installation

```sql
-- Check tables
\dt

-- Should show 32 tables

-- Check organizations
SELECT * FROM organizations;

-- Check users
SELECT id, email, display_name FROM users;

-- Check spaces
SELECT id, name, type, space_type FROM spaces;

-- Check areas
SELECT id, name, space_id, is_general FROM areas;
```

## AWS RDS Installation

For AWS RDS PostgreSQL:

```bash
# Set your RDS endpoint
export RDS_HOST="your-instance.xxxxx.region.rds.amazonaws.com"
export RDS_USER="postgres"
export RDS_DB="stratai"

# Run schema
PGPASSWORD='your_password' psql -h $RDS_HOST -U $RDS_USER -d $RDS_DB -f schema.sql

# Run seed data
PGPASSWORD='your_password' psql -h $RDS_HOST -U $RDS_USER -d $RDS_DB -f seed-data.sql
```

## What's Included

### Tables (32 total)

**Core:**
- `organizations` - Companies/tenants
- `users` - User accounts
- `org_memberships` - User membership in orgs

**Groups:**
- `groups` - User groups within orgs
- `group_memberships` - User membership in groups

**Spaces:**
- `spaces` - Workspaces (system and custom)
- `space_memberships` - User/group access to spaces

**Areas:**
- `areas` - Focus areas within spaces
- `focus_areas` - Legacy table (compatibility)
- `area_memberships` - User access to restricted areas

**Content:**
- `conversations` - Chat conversations
- `documents` - Uploaded documents
- `document_area_shares` - Document sharing to areas
- `tasks` - User tasks
- `related_tasks` - Task relationships
- `task_documents` - Task-document links

**Pages:**
- `pages` - TipTap documents
- `page_versions` - Page history
- `page_conversations` - Page-chat links
- `page_user_shares` - Per-user page sharing
- `page_group_shares` - Per-group page sharing

**System:**
- `audit_events` - Audit trail
- `email_logs` - Email tracking
- `password_reset_tokens` - Password reset
- `password_reset_attempts` - Rate limiting
- `user_id_mappings` - Legacy ID mapping

**Analytics:**
- `routing_decisions` - Model routing analytics
- `llm_usage` - Token usage tracking

**Arena:**
- `arena_battles` - Model comparison battles
- `arena_battle_models` - Battle participants
- `model_rankings` - ELO rankings

**Meta:**
- `schema_migrations` - Migration tracking

### Seed Data

- **StraTech** organization
- **Gabriel Roux** (owner) - gabriel@stratech.co.za
- **William Mac Donald** (admin) - william@strathost.co.za
- Organization space with memberships
- Personal spaces for each user
- General areas for all spaces
- Sample welcome conversation

## Differences from Migration Approach

| Aspect | Migrations | Fresh Install |
|--------|-----------|---------------|
| Existing data | Preserved | **Lost** |
| Complexity | Cumulative | Single file |
| Debugging | Harder | Easier |
| State | Depends on history | Known-good |
| Speed | Slower (many files) | Fast |

## Rollback

There's no rollback for fresh install. If you need to restore:

1. Keep a database backup before running
2. Restore from backup if needed

```bash
# Backup before fresh install
pg_dump -U user -d stratai > backup_before_fresh_install.sql

# Restore if needed
psql -U user -d stratai < backup_before_fresh_install.sql
```

## Updating the Schema

When adding new features:

1. Add migrations as normal during development
2. When preparing for a release/reset, update `schema.sql` to include the changes
3. Keep `schema.sql` as the "canonical" schema representing the latest state

## Troubleshooting

### "relation already exists"

Database isn't empty. Drop and recreate:

```sql
DROP DATABASE stratai;
CREATE DATABASE stratai;
```

### "permission denied"

User doesn't have CREATE privileges:

```sql
GRANT ALL PRIVILEGES ON DATABASE stratai TO your_user;
```

### "could not connect"

Check:
- PostgreSQL is running
- Connection string is correct
- Firewall/security groups allow connection
- SSL mode if required (`?sslmode=require`)

## Contact

For issues with the fresh install, contact the StratAI team.
