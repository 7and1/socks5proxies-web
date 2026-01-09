#!/bin/bash
# Migration script for Socks5Proxies PostgreSQL schema
# Usage: ./scripts/migrate.sh [database_url]
#
# If DATABASE_URL is not provided, reads from .env file

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/migrations"

# Default database connection info
DB_HOST="${DB_HOST:-supabase-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-postgres}"
DB_SCHEMA="${DB_SCHEMA:-socksproxies}"

# Load .env file if exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${GREEN}Loading .env file...${NC}"
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

# Use provided DATABASE_URL or construct from components
if [ -n "$1" ]; then
    DATABASE_URL="$1"
elif [ -n "$DATABASE_URL" ]; then
    DATABASE_URL="$DATABASE_URL"
else
    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${RED}Error: DB_PASSWORD or DATABASE_URL must be set${NC}"
        exit 1
    fi
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

echo -e "${GREEN}Running migrations for Socks5Proxies...${NC}"
echo "Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo "Schema: $DB_SCHEMA"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    echo "Install postgresql-client or use docker exec:"
    echo "  docker exec -it supabase-db psql -U postgres"
    exit 1
fi

# Run migrations
for migration in "$MIGRATIONS_DIR"/*.up.sql; do
    if [ -f "$migration" ]; then
        echo -e "${YELLOW}Applying: $(basename "$migration")${NC}"
        psql "$DATABASE_URL" -f "$migration"

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Success: $(basename "$migration")${NC}"
        else
            echo -e "${RED}Failed: $(basename "$migration")${NC}"
            exit 1
        fi
    fi
done

echo -e "${GREEN}All migrations completed successfully!${NC}"

# Verify schema
echo -e "${YELLOW}Verifying schema...${NC}"
psql "$DATABASE_URL" -c "\dn $DB_SCHEMA" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Schema '$DB_SCHEMA' exists${NC}"
    psql "$DATABASE_URL" -c "\dt $DB_SCHEMA.*"
else
    echo -e "${RED}Schema '$DB_SCHEMA' not found${NC}"
    exit 1
fi
