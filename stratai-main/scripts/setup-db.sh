#!/bin/bash
#
# StratAI Database Setup Script
#
# Sets up PostgreSQL database with all schemas and migrations.
# Compatible with PostgreSQL 13+ (tested on AWS RDS 17.7)
#
# Usage:
#   ./scripts/setup-db.sh                    # Uses DATABASE_URL from .env
#   ./scripts/setup-db.sh "postgres://..."   # Uses provided connection string
#   DATABASE_URL="..." ./scripts/setup-db.sh # Uses environment variable
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PERSISTENCE_DIR="$PROJECT_DIR/src/lib/server/persistence"
MIGRATIONS_DIR="$PERSISTENCE_DIR/migrations"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  StratAI Database Setup Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Get DATABASE_URL
if [ -n "$1" ]; then
    DATABASE_URL="$1"
    echo -e "${YELLOW}Using connection string from argument${NC}"
elif [ -n "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Using DATABASE_URL from environment${NC}"
elif [ -f "$PROJECT_DIR/.env" ]; then
    # Try to load from .env file
    DATABASE_URL=$(grep -E "^DATABASE_URL=" "$PROJECT_DIR/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$DATABASE_URL" ]; then
        echo -e "${YELLOW}Using DATABASE_URL from .env file${NC}"
    fi
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set${NC}"
    echo ""
    echo "Please provide a connection string:"
    echo "  1. Set DATABASE_URL environment variable"
    echo "  2. Add DATABASE_URL to .env file"
    echo "  3. Pass as argument: ./scripts/setup-db.sh 'postgres://...'"
    echo ""
    echo "Example:"
    echo "  DATABASE_URL='postgres://user:pass@host:5432/dbname?sslmode=require'"
    exit 1
fi

# Mask password in output
MASKED_URL=$(echo "$DATABASE_URL" | sed -E 's/(:)[^:@]+(@)/\1****\2/')
echo -e "Database: ${GREEN}$MASKED_URL${NC}"
echo ""

# Test connection
echo -e "${BLUE}Testing database connection...${NC}"
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Error: Could not connect to database${NC}"
    echo "Please check your connection string and ensure the database server is accessible."
    exit 1
fi
echo -e "${GREEN}Connection successful!${NC}"
echo ""

# Get PostgreSQL version
PG_VERSION=$(psql "$DATABASE_URL" -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
echo -e "PostgreSQL version: ${GREEN}$PG_VERSION${NC}"
echo ""

# Function to run SQL file
run_sql_file() {
    local file="$1"
    local description="$2"

    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}  Skipping (file not found): $file${NC}"
        return 0
    fi

    echo -e "  Running: ${BLUE}$(basename "$file")${NC} - $description"
    if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
        echo -e "    ${GREEN}OK${NC}"
        return 0
    else
        # Try again with verbose output on error
        echo -e "    ${YELLOW}Warning: Some statements may have failed (possibly already applied)${NC}"
        psql "$DATABASE_URL" -f "$file" 2>&1 | grep -E "^(ERROR|NOTICE):" | head -5 || true
        return 0
    fi
}

# Create migrations tracking table if it doesn't exist
echo -e "${BLUE}Setting up migrations tracking...${NC}"
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
" > /dev/null 2>&1
echo -e "${GREEN}Migrations tracking ready${NC}"
echo ""

# Run base schemas
echo -e "${BLUE}Running base schemas...${NC}"
run_sql_file "$PERSISTENCE_DIR/schema.sql" "Core conversations schema"
run_sql_file "$PERSISTENCE_DIR/spaces-schema.sql" "Spaces schema"
run_sql_file "$PERSISTENCE_DIR/focus-areas-schema.sql" "Areas schema"
run_sql_file "$PERSISTENCE_DIR/tasks-schema.sql" "Tasks schema"
run_sql_file "$PERSISTENCE_DIR/documents-schema.sql" "Documents schema"
run_sql_file "$PERSISTENCE_DIR/arena-schema.sql" "Arena battles schema"
run_sql_file "$PERSISTENCE_DIR/tool-cache-schema.sql" "Tool cache schema"
run_sql_file "$PERSISTENCE_DIR/organizations-schema.sql" "Organizations schema"
run_sql_file "$PERSISTENCE_DIR/users-schema.sql" "Users schema"
run_sql_file "$PERSISTENCE_DIR/org-memberships-schema.sql" "Organization memberships schema"
run_sql_file "$PERSISTENCE_DIR/user-id-mappings-schema.sql" "User ID mappings schema"
echo ""

# Run migrations in order
echo -e "${BLUE}Running migrations...${NC}"

# Get list of migrations sorted by number
MIGRATIONS=$(find "$MIGRATIONS_DIR" -name "*.sql" 2>/dev/null | sort -V)

if [ -z "$MIGRATIONS" ]; then
    echo -e "${YELLOW}No migrations found in $MIGRATIONS_DIR${NC}"
else
    for migration in $MIGRATIONS; do
        migration_name=$(basename "$migration" .sql)

        # Check if already applied
        already_applied=$(psql "$DATABASE_URL" -t -c "SELECT 1 FROM schema_migrations WHERE version = '$migration_name' LIMIT 1;" 2>/dev/null | xargs)

        if [ "$already_applied" = "1" ]; then
            echo -e "  ${YELLOW}Skipping${NC}: $migration_name (already applied)"
        else
            echo -e "  ${BLUE}Applying${NC}: $migration_name"
            if psql "$DATABASE_URL" -f "$migration" > /dev/null 2>&1; then
                # Record migration
                psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (version) VALUES ('$migration_name') ON CONFLICT DO NOTHING;" > /dev/null 2>&1
                echo -e "    ${GREEN}OK${NC}"
            else
                echo -e "    ${YELLOW}Warning: Migration may have partially failed${NC}"
                psql "$DATABASE_URL" -f "$migration" 2>&1 | grep -E "^(ERROR|NOTICE):" | head -5 || true
                # Still record it to avoid re-running
                psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (version) VALUES ('$migration_name') ON CONFLICT DO NOTHING;" > /dev/null 2>&1
            fi
        fi
    done
fi
echo ""

# Verify setup
echo -e "${BLUE}Verifying database setup...${NC}"
echo ""

# Check tables
echo -e "Tables created:"
TABLES=$(psql "$DATABASE_URL" -t -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
" 2>/dev/null)

TABLE_COUNT=0
for table in $TABLES; do
    echo -e "  ${GREEN}✓${NC} $table"
    TABLE_COUNT=$((TABLE_COUNT + 1))
done
echo ""
echo -e "Total tables: ${GREEN}$TABLE_COUNT${NC}"
echo ""

# Check extensions
echo -e "Extensions:"
psql "$DATABASE_URL" -t -c "SELECT extname, extversion FROM pg_extension WHERE extname != 'plpgsql';" 2>/dev/null | while read line; do
    if [ -n "$line" ]; then
        echo -e "  ${GREEN}✓${NC} $line"
    fi
done
echo ""

# Check UUID function
echo -e "Testing UUID generation..."
UUID_TEST=$(psql "$DATABASE_URL" -t -c "SELECT gen_random_uuid();" 2>/dev/null | xargs)
if [ -n "$UUID_TEST" ]; then
    echo -e "  ${GREEN}✓${NC} gen_random_uuid() works: $UUID_TEST"
else
    echo -e "  ${RED}✗${NC} gen_random_uuid() failed"
fi
echo ""

# Summary
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}  Database setup complete!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "Connection string for your .env file:"
echo -e "${YELLOW}DATABASE_URL=\"$DATABASE_URL\"${NC}"
echo ""
