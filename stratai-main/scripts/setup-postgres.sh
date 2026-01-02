#!/bin/bash
#
# StratAI PostgreSQL Setup Script
# ================================
# This script installs PostgreSQL 18, creates the database, and runs all schema files.
# Designed for macOS with Homebrew.
#
# Usage:
#   chmod +x scripts/setup-postgres.sh
#   ./scripts/setup-postgres.sh
#
# Configuration (set via environment variables or edit below):
#   DB_NAME    - Database name (default: stratai)
#   DB_USER    - Database user (default: current system user)

set -e  # Exit on error

# Configuration
DB_NAME="${DB_NAME:-stratai}"
DB_USER="${DB_USER:-$(whoami)}"
PG_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Get script directory (where schema files are)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PERSISTENCE_DIR="$PROJECT_ROOT/src/lib/server/persistence"

echo ""
echo "========================================"
echo "  StratAI PostgreSQL Setup Script"
echo "========================================"
echo ""
info "Database: $DB_NAME"
info "User: $DB_USER"
echo ""

# Step 1: Check for Homebrew
info "Checking for Homebrew..."
if ! command -v brew &> /dev/null; then
    warn "Homebrew not found. Installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH for Apple Silicon
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    success "Homebrew found"
fi

# Step 2: Install PostgreSQL 18
info "Checking for PostgreSQL $PG_VERSION..."
if brew list postgresql@$PG_VERSION &>/dev/null; then
    success "PostgreSQL $PG_VERSION already installed"
else
    info "Installing PostgreSQL $PG_VERSION..."
    brew install postgresql@$PG_VERSION
    success "PostgreSQL $PG_VERSION installed"
fi

# Determine PostgreSQL paths
if [[ -d "/opt/homebrew/opt/postgresql@$PG_VERSION" ]]; then
    PG_HOME="/opt/homebrew/opt/postgresql@$PG_VERSION"
elif [[ -d "/usr/local/opt/postgresql@$PG_VERSION" ]]; then
    PG_HOME="/usr/local/opt/postgresql@$PG_VERSION"
else
    error "Could not find PostgreSQL installation directory"
fi

PSQL="$PG_HOME/bin/psql"
PG_ISREADY="$PG_HOME/bin/pg_isready"
CREATEDB="$PG_HOME/bin/createdb"

# Step 3: Start PostgreSQL service
info "Starting PostgreSQL service..."
brew services start postgresql@$PG_VERSION 2>/dev/null || true

# Wait for PostgreSQL to be ready
info "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if "$PG_ISREADY" -q 2>/dev/null; then
        success "PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        error "PostgreSQL failed to start within 30 seconds"
    fi
    sleep 1
done

# Step 4: Create database (if it doesn't exist)
info "Checking if database '$DB_NAME' exists..."
if "$PSQL" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    warn "Database '$DB_NAME' already exists"
    echo ""
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Dropping database '$DB_NAME'..."
        "$PSQL" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
        info "Creating database '$DB_NAME'..."
        "$CREATEDB" "$DB_NAME"
        success "Database recreated"
    else
        info "Keeping existing database"
    fi
else
    info "Creating database '$DB_NAME'..."
    "$CREATEDB" "$DB_NAME"
    success "Database '$DB_NAME' created"
fi

# Step 5: Run schema files in order
# Order matters due to foreign key dependencies
SCHEMA_FILES=(
    "schema.sql"           # Conversations (base)
    "spaces-schema.sql"    # Spaces
    "focus-areas-schema.sql" # Focus areas (depends on spaces reference)
    "tasks-schema.sql"     # Tasks (depends on focus_areas)
    "documents-schema.sql" # Documents and task_documents (depends on tasks)
    "arena-schema.sql"     # Arena battles
    "tool-cache-schema.sql" # Tool result cache
)

echo ""
info "Running schema files..."

for schema in "${SCHEMA_FILES[@]}"; do
    schema_path="$PERSISTENCE_DIR/$schema"
    if [[ -f "$schema_path" ]]; then
        info "  Running $schema..."
        "$PSQL" -d "$DB_NAME" -f "$schema_path" -q 2>/dev/null || warn "  Some statements in $schema may have been skipped (already exist)"
    else
        warn "  Schema file not found: $schema"
    fi
done

success "Schema files completed"

# Step 6: Run migrations in order
MIGRATION_DIR="$PERSISTENCE_DIR/migrations"

if [[ -d "$MIGRATION_DIR" ]]; then
    echo ""
    info "Running migrations..."

    # Get migration files sorted by number
    for migration in $(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort -V); do
        migration_name=$(basename "$migration")
        info "  Running $migration_name..."
        "$PSQL" -d "$DB_NAME" -f "$migration" -q 2>/dev/null || warn "  Some statements in $migration_name may have been skipped"
    done

    success "Migrations completed"
else
    info "No migrations directory found, skipping"
fi

# Step 7: Verify setup
echo ""
info "Verifying database setup..."

# Count tables
TABLE_COUNT=$("$PSQL" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)

# List tables
echo ""
info "Tables in database:"
"$PSQL" -d "$DB_NAME" -c "\dt" 2>/dev/null || true

# Step 8: Update .env file reminder
echo ""
echo "========================================"
success "Setup Complete!"
echo "========================================"
echo ""
echo "Make sure your .env file has the correct DATABASE_URL:"
echo ""
echo "  DATABASE_URL=postgres://$DB_USER@localhost:5432/$DB_NAME"
echo ""
echo "To connect to the database manually:"
echo ""
echo "  $PSQL -d $DB_NAME"
echo ""
echo "To check PostgreSQL status:"
echo ""
echo "  brew services list | grep postgresql"
echo ""
