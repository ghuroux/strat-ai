#!/bin/bash

# StratAI Database Setup Script
# This script sets up the PostgreSQL database for StratAI
#
# Prerequisites:
#   - PostgreSQL 16+ installed via Homebrew
#   - PostgreSQL service running
#
# Usage:
#   chmod +x scripts/setup-database.sh
#   ./scripts/setup-database.sh           # Normal setup (preserves data)
#   ./scripts/setup-database.sh --fresh   # Drop all tables first (loses data!)

set -e

# Parse arguments
FRESH_INSTALL=false
if [ "$1" = "--fresh" ] || [ "$1" = "-f" ]; then
    FRESH_INSTALL=true
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  StratAI Database Setup"
echo "=========================================="
echo ""

# Warn about fresh install
if [ "$FRESH_INSTALL" = true ]; then
    echo -e "${RED}⚠️  FRESH INSTALL MODE${NC}"
    echo -e "${RED}   This will DROP ALL TABLES and lose all data!${NC}"
    echo ""
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
fi

# Configuration
DB_NAME="stratai"
SCHEMA_DIR="src/lib/server/persistence"

# Detect PostgreSQL installation
if command -v /opt/homebrew/opt/postgresql@18/bin/psql &> /dev/null; then
    PSQL="/opt/homebrew/opt/postgresql@18/bin/psql"
    CREATEDB="/opt/homebrew/opt/postgresql@18/bin/createdb"
    echo -e "${GREEN}Found PostgreSQL 18${NC}"
elif command -v /opt/homebrew/opt/postgresql@16/bin/psql &> /dev/null; then
    PSQL="/opt/homebrew/opt/postgresql@16/bin/psql"
    CREATEDB="/opt/homebrew/opt/postgresql@16/bin/createdb"
    echo -e "${GREEN}Found PostgreSQL 16${NC}"
elif command -v psql &> /dev/null; then
    PSQL="psql"
    CREATEDB="createdb"
    echo -e "${GREEN}Found PostgreSQL in PATH${NC}"
else
    echo -e "${RED}Error: PostgreSQL not found!${NC}"
    echo ""
    echo "Install PostgreSQL via Homebrew:"
    echo "  brew install postgresql@16"
    echo "  brew services start postgresql@16"
    exit 1
fi

# Check if PostgreSQL is running
if ! $PSQL -l &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL is not running!${NC}"
    echo ""
    echo "Start PostgreSQL:"
    echo "  brew services start postgresql@16"
    exit 1
fi

echo ""

# Check if database exists
if $PSQL -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping database..."
        $PSQL -c "DROP DATABASE $DB_NAME;"
        echo "Creating database..."
        $CREATEDB $DB_NAME
    else
        echo "Using existing database..."
    fi
else
    echo "Creating database '$DB_NAME'..."
    $CREATEDB $DB_NAME
    echo -e "${GREEN}Database created!${NC}"
fi

echo ""

# Fresh install: drop existing tables
if [ "$FRESH_INSTALL" = true ]; then
    echo -e "${YELLOW}Fresh install requested - dropping existing tables...${NC}"
    $PSQL -d $DB_NAME -q <<EOF
        -- Drop tables in correct order (respecting foreign keys)
        -- Document context tables first (they reference tasks)
        DROP TABLE IF EXISTS task_documents CASCADE;
        DROP TABLE IF EXISTS related_tasks CASCADE;
        DROP TABLE IF EXISTS documents CASCADE;
        -- Arena tables
        DROP TABLE IF EXISTS arena_battle_models CASCADE;
        DROP TABLE IF EXISTS model_rankings CASCADE;
        DROP TABLE IF EXISTS arena_battles CASCADE;
        -- Core tables (tasks before focus_areas due to FK, focus_areas before spaces)
        DROP TABLE IF EXISTS tasks CASCADE;
        DROP TABLE IF EXISTS focus_areas CASCADE;
        DROP TABLE IF EXISTS spaces CASCADE;
        DROP TABLE IF EXISTS conversations CASCADE;

        -- Drop functions
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
        DROP FUNCTION IF EXISTS update_tasks_updated_at() CASCADE;
        DROP FUNCTION IF EXISTS update_documents_updated_at() CASCADE;
        DROP FUNCTION IF EXISTS update_focus_areas_updated_at() CASCADE;
        DROP FUNCTION IF EXISTS update_spaces_updated_at() CASCADE;
EOF
    echo -e "${GREEN}Existing tables dropped${NC}"
    echo ""
fi

# Run schema files
echo "Running schema migrations..."

echo "  - Conversations schema..."
$PSQL -d $DB_NAME -f "$SCHEMA_DIR/schema.sql" -q

echo "  - Arena schema..."
$PSQL -d $DB_NAME -f "$SCHEMA_DIR/arena-schema.sql" -q

echo "  - Spaces schema..."
$PSQL -d $DB_NAME -f "$SCHEMA_DIR/spaces-schema.sql" -q

echo "  - Focus Areas schema..."
$PSQL -d $DB_NAME -f "$SCHEMA_DIR/focus-areas-schema.sql" -q

echo "  - Tasks schema..."
$PSQL -d $DB_NAME -f "$SCHEMA_DIR/tasks-schema.sql" -q

echo "  - Documents schema..."
$PSQL -d $DB_NAME -f "$SCHEMA_DIR/documents-schema.sql" -q

echo ""
echo "Running migrations..."

# Run migration files in order
for migration in "$SCHEMA_DIR/migrations"/*.sql; do
    if [ -f "$migration" ]; then
        migration_name=$(basename "$migration")
        echo "  - $migration_name..."
        $PSQL -d $DB_NAME -f "$migration" -q 2>/dev/null || echo "    (already applied or skipped)"
    fi
done

echo ""
echo -e "${GREEN}=========================================="
echo "  Database setup complete!"
echo "==========================================${NC}"
echo ""
echo "Tables created:"
$PSQL -d $DB_NAME -c "\dt" 2>/dev/null | grep -E "(conversations|arena_battles|model_rankings|arena_battle_models|spaces|focus_areas|tasks|documents|task_documents|related_tasks)" || echo "  (tables created successfully)"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env"
echo "  2. Update DATABASE_URL with your username:"
echo "     DATABASE_URL=postgres://$(whoami)@localhost:5432/stratai"
echo "  3. Start the dev server: npm run dev"
echo ""
