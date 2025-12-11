# AnythingLLM Docker Quick Reference

## 🚀 Quick Commands

### Starting & Stopping
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart anythingllm

# Stop and remove all (preserves data volumes)
docker-compose down

# Stop and remove everything (INCLUDING DATA!)
docker-compose down -v
```

### Viewing Logs
```bash
# All services (follow mode)
docker-compose logs -f

# Specific service
docker-compose logs -f anythingllm

# Last 100 lines
docker-compose logs --tail=100 anythingllm

# Search for errors
docker-compose logs | grep -i error
```

### Service Status
```bash
# Check all services
docker-compose ps

# Health status
docker inspect anythingllm --format='{{.State.Health.Status}}'

# Resource usage
docker stats
```

## 📤 Document Export Commands

### In Chat Interface
```
"Export this conversation to Word"
"Create a PDF of our discussion"
"Save this as a DOCX file"
"Generate a markdown document"
```

### Via Custom Skill
```
@agent use document-export skill to create a DOCX
@agent export format:pdf title:"My Report"
```

### Direct API Calls
```bash
# Export conversation
curl -X POST http://localhost:3001/api/export \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"format":"docx","workspace":"default"}'

# Download exported file
curl -O http://localhost:3001/exports/document.docx
```

## 🔧 Configuration Changes

### Update Environment Variables
```bash
# Edit configuration
nano .env

# Apply changes
docker-compose down
docker-compose up -d
```

### Change LLM Provider
```bash
# Edit .env file:
AGENT_PROVIDER=anthropic  # or openai
AGENT_MODEL=claude-3-5-sonnet-20241022

# Restart
docker-compose restart anythingllm
```

### Enable/Disable Features
```bash
# In .env:
ENABLE_EXPORT=true
AGENT_CUSTOM_SKILLS=true
DISABLE_TELEMETRY=true
```

## 🛠️ Troubleshooting

### Quick Fixes
```bash
# Fix permissions
chmod -R 755 exports/ custom-skills/

# Clear cache
docker exec anythingllm rm -rf /app/server/storage/cache/*

# Restart everything
docker-compose restart

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Check Export Issues
```bash
# Verify exports directory
ls -la exports/

# Check skill installation
ls -la custom-skills/node_modules/

# Test Gotenberg
curl http://localhost:3002/health

# View export logs
docker-compose logs anythingllm | grep -i export
```

## 💾 Backup & Restore

### Quick Backup
```bash
# Backup everything
./backup.sh  # If script exists, or:

tar -czf backup-$(date +%Y%m%d).tar.gz \
  .env docker-compose.yml exports/ custom-skills/

# Backup database only
docker exec anythingllm_postgres \
  pg_dump -U anythingllm anythingllm_db > db-backup.sql
```

### Quick Restore
```bash
# Restore files
tar -xzf backup-20250115.tar.gz

# Restore database
docker exec -i anythingllm_postgres \
  psql -U anythingllm anythingllm_db < db-backup.sql
```

## 📊 Monitoring

### Real-time Monitoring
```bash
# Watch logs
watch docker-compose logs --tail=20

# Monitor resources
watch docker stats --no-stream

# Check exports
watch -n 2 'ls -la exports/ | tail -10'
```

### Health Checks
```bash
# All-in-one health check
echo "Services:" && docker-compose ps && \
echo -e "\nHealth:" && \
docker inspect anythingllm --format='{{.State.Health.Status}}'
```

## 🔐 Security

### Change Passwords
```bash
# Generate new JWT secret
openssl rand -hex 32

# Update in .env:
JWT_SECRET=<new-secret>

# Change DB password in .env:
POSTGRES_PASSWORD=<new-password>

# Restart all services
docker-compose down
docker-compose up -d
```

## 📡 API Access

### Get API Token
1. Login to UI at http://localhost:3001
2. Go to Settings → Developer → API Keys
3. Create new key

### Test API
```bash
# Set token
export TOKEN="your-api-token"

# Test connection
curl http://localhost:3001/api/ping \
  -H "Authorization: Bearer $TOKEN"

# List workspaces
curl http://localhost:3001/api/workspaces \
  -H "Authorization: Bearer $TOKEN"
```

## 🔄 Updates

### Update Services
```bash
# Pull latest images
docker-compose pull

# Recreate containers
docker-compose up -d --force-recreate

# Update specific service
docker-compose pull anythingllm
docker-compose up -d anythingllm
```

### Update Custom Skills
```bash
cd custom-skills
npm update
cd ..
docker-compose restart anythingllm
```

## 🌐 Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| AnythingLLM | http://localhost:3001 | Main interface |
| LiteLLM | http://localhost:4000 | Model proxy |
| Gotenberg | http://localhost:3002 | PDF conversion |
| PostgreSQL | localhost:5432 | Database |

## 🏷️ Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Claude API access | sk-ant-api03-... |
| `OPENAI_API_KEY` | OpenAI API access | sk-... |
| `AGENT_PROVIDER` | LLM provider | anthropic |
| `AGENT_MODEL` | Model to use | claude-3-5-sonnet-20241022 |
| `ENABLE_EXPORT` | Enable exports | true |
| `AGENT_SKILLS` | Agent capabilities | save-file-to-browser |

## ⚡ Performance Tips

1. **Allocate Resources:**
   ```bash
   # Docker Desktop: Settings → Resources
   # Recommended: 4GB RAM, 2 CPUs minimum
   ```

2. **Clean Up Regularly:**
   ```bash
   docker system prune -a -f --volumes
   ```

3. **Monitor Disk Space:**
   ```bash
   df -h /var/lib/docker
   ```

## 📝 Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Service won't start | Check logs: `docker-compose logs` |
| Can't export DOCX | Enable agent skills in UI |
| Database error | Restart postgres: `docker-compose restart postgres` |
| Out of memory | Increase Docker memory allocation |
| Port conflict | Change port in docker-compose.yml |
| Permission denied | Run: `chmod -R 755 exports/` |

---
Keep this reference handy for quick troubleshooting!
