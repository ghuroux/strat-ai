#!/bin/bash
# ============================================================================
# StratAI Fresh Install Script
# ============================================================================
# Usage:
#   ./install.sh                           # Uses DATABASE_URL from .env
#   ./install.sh "postgresql://user:pass@host:5432/db"  # Direct connection
#
# This script:
# 1. Runs schema.sql to create all tables
# 2. Runs seed-data.sql to create test data
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "============================================"
echo "  StratAI Fresh Database Install"
echo "============================================"
echo ""

# Get database URL
if [ -n "$1" ]; then
    DATABASE_URL="$1"
elif [ -f "../.env" ]; then
    # Try to load from .env file
    source ../.env 2>/dev/null || true
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: No database URL provided${NC}"
    echo ""
    echo "Usage:"
    echo "  ./install.sh \"postgresql://user:pass@host:5432/stratai\""
    echo ""
    echo "Or set DATABASE_URL in your environment or .env file"
    exit 1
fi

# Confirm
echo "Database: ${DATABASE_URL//:*@/:***@}"  # Hide password in output
echo ""
echo -e "${YELLOW}WARNING: This will DROP all existing data!${NC}"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Step 1/2: Creating schema..."
echo "-------------------------------------------"
psql "$DATABASE_URL" -f schema.sql

if [ $? -ne 0 ]; then
    echo -e "${RED}Schema creation failed!${NC}"
    exit 1
fi

echo ""
echo "Step 2/2: Loading seed data..."
echo "-------------------------------------------"
psql "$DATABASE_URL" -f seed-data.sql

if [ $? -ne 0 ]; then
    echo -e "${RED}Seed data loading failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Configure your .env file with the DATABASE_URL"
echo "  2. Start the application: npm run dev"
echo ""
echo "Test users (password: password123):"
echo "  - gabriel@stratech.co.za (owner)"
echo "  - william@strathost.co.za (admin)"
echo ""
echo "Please change passwords after first login!"
echo ""
