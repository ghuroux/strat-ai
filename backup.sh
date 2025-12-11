#!/bin/bash

# AnythingLLM Backup Script
# Creates timestamped backups of all configuration and data

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="anythingllm_backup_${TIMESTAMP}"

echo "======================================"
echo "AnythingLLM Backup Script"
echo "======================================"
echo ""
echo "Creating backup: ${BACKUP_NAME}"
echo ""

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Create temporary backup directory
TEMP_BACKUP="${BACKUP_DIR}/${BACKUP_NAME}"
mkdir -p ${TEMP_BACKUP}

echo "📁 Backing up configuration files..."
cp -v .env ${TEMP_BACKUP}/ 2>/dev/null || echo "⚠️  .env not found"
cp -v docker-compose.yml ${TEMP_BACKUP}/
cp -v litellm-config.yaml ${TEMP_BACKUP}/ 2>/dev/null || true
echo "✅ Configuration backed up"
echo ""

echo "📁 Backing up custom skills..."
if [ -d "custom-skills" ]; then
    cp -r custom-skills ${TEMP_BACKUP}/
    echo "✅ Custom skills backed up"
else
    echo "⚠️  Custom skills directory not found"
fi
echo ""

echo "📁 Backing up exported documents..."
if [ -d "exports" ] && [ "$(ls -A exports)" ]; then
    cp -r exports ${TEMP_BACKUP}/
    echo "✅ Exports backed up"
else
    echo "ℹ️  No exports to backup"
fi
echo ""

echo "💾 Backing up database..."
if docker ps --format '{{.Names}}' | grep -q "anythingllm_postgres"; then
    docker exec anythingllm_postgres pg_dump -U anythingllm anythingllm_db > ${TEMP_BACKUP}/database.sql
    echo "✅ Database backed up"
else
    echo "⚠️  PostgreSQL container not running - skipping database backup"
fi
echo ""

echo "🔍 Gathering Docker volume information..."
# Save volume information for reference
docker volume ls | grep anythingllm > ${TEMP_BACKUP}/docker_volumes.txt 2>/dev/null || true

# Optionally backup Docker volumes (this can be large!)
read -p "Do you want to backup Docker volumes? This may take significant space (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Backing up Docker volumes..."
    
    # Export each volume
    for volume in $(docker volume ls -q | grep anythingllm); do
        echo "  Backing up volume: ${volume}"
        docker run --rm -v ${volume}:/source:ro -v ${TEMP_BACKUP}:/backup alpine \
            tar czf /backup/${volume}.tar.gz -C /source .
    done
    echo "✅ Docker volumes backed up"
fi
echo ""

echo "🗜️ Creating compressed archive..."
cd ${BACKUP_DIR}
tar -czf ${BACKUP_NAME}.tar.gz ${BACKUP_NAME}/
rm -rf ${BACKUP_NAME}
cd ..

# Calculate backup size
BACKUP_SIZE=$(du -h ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz | cut -f1)

echo "✅ Backup completed successfully!"
echo ""
echo "📊 Backup Details:"
echo "  Location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "  Size: ${BACKUP_SIZE}"
echo "  Timestamp: ${TIMESTAMP}"
echo ""

# Cleanup old backups (optional)
echo "🧹 Backup management:"
BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/anythingllm_backup_*.tar.gz 2>/dev/null | wc -l)
echo "  Total backups: ${BACKUP_COUNT}"

if [ ${BACKUP_COUNT} -gt 5 ]; then
    echo ""
    echo "⚠️  You have ${BACKUP_COUNT} backups. Consider cleaning old ones:"
    echo "  Oldest backups:"
    ls -1t ${BACKUP_DIR}/anythingllm_backup_*.tar.gz | tail -3
    echo ""
    read -p "Do you want to keep only the 5 most recent backups? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ls -1t ${BACKUP_DIR}/anythingllm_backup_*.tar.gz | tail -n +6 | xargs rm -f
        echo "✅ Old backups removed"
    fi
fi

echo ""
echo "======================================"
echo "Restore Instructions:"
echo "======================================"
echo "To restore from this backup:"
echo ""
echo "1. Extract the backup:"
echo "   tar -xzf ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz -C ${BACKUP_DIR}/"
echo ""
echo "2. Restore configuration:"
echo "   cp ${BACKUP_DIR}/${BACKUP_NAME}/.env ."
echo "   cp ${BACKUP_DIR}/${BACKUP_NAME}/docker-compose.yml ."
echo ""
echo "3. Restore database:"
echo "   docker exec -i anythingllm_postgres psql -U anythingllm anythingllm_db < ${BACKUP_DIR}/${BACKUP_NAME}/database.sql"
echo ""
echo "4. Restore volumes (if backed up):"
echo "   docker run --rm -v anythingllm_storage:/target -v ${BACKUP_DIR}/${BACKUP_NAME}:/backup alpine tar xzf /backup/anythingllm_storage.tar.gz -C /target"
echo ""
echo "======================================"
