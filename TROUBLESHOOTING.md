# Document Export Troubleshooting Guide
## AnythingLLM Docker Deployment

This guide addresses common issues with document export functionality in AnythingLLM, particularly DOCX and PDF generation problems.

## Common Export Issues and Solutions

### 1. Corrupted DOCX Files

**Symptoms:**
- Downloaded .docx files won't open in Word
- Error message: "The file is corrupt and cannot be opened"
- File size is unusually small (< 1KB)

**Solutions:**

#### Solution A: Enable Agent Skills
```bash
# Check if agent skills are enabled in your workspace
# In AnythingLLM UI:
# 1. Go to Workspace Settings → Agent Configuration
# 2. Enable "Agent" mode for the workspace
# 3. Under Agent Skills, enable:
#    - save-file-to-browser
#    - create-chart (if needed)
#    - Custom skills → document-export

# Verify in docker-compose.yml:
AGENT_SKILLS=web-browsing,web-scraping,save-file-to-browser,create-chart
AGENT_CUSTOM_SKILLS=true
```

#### Solution B: Install Dependencies
```bash
# Ensure Node dependencies are installed
cd custom-skills
npm install
cd ..

# Restart the container
docker-compose restart anythingllm

# Check logs for errors
docker-compose logs anythingllm | grep -i error
```

#### Solution C: File System Permissions
```bash
# Fix permissions on export directory
chmod -R 755 exports/
chown -R $(id -u):$(id -g) exports/

# Check if exports are being created
ls -la exports/

# Monitor export directory while generating document
watch -n 1 ls -la exports/
```

#### Solution D: Use Alternative Export Method
If built-in export fails, use the custom skill directly:
```
# In chat, explicitly request:
"Use the document-export skill to create a DOCX file"
"Generate a Word document using the custom export function"
```

### 2. PDF Export Issues

**Symptoms:**
- PDF generation hangs or times out
- Blank PDF files
- Formatting issues in PDF

**Solutions:**

#### Check Gotenberg Service
```bash
# Verify Gotenberg is running
docker-compose ps gotenberg

# Check Gotenberg logs
docker-compose logs gotenberg

# Test Gotenberg directly
curl -X POST http://localhost:3002/forms/chromium/convert/html \
  -F "files=@test.html" \
  -o test.pdf

# Restart if needed
docker-compose restart gotenberg
```

#### Memory Issues
```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.yml
services:
  gotenberg:
    mem_limit: 2g
    memswap_limit: 2g
```

### 3. Export Button Not Visible

**Symptoms:**
- No export option in chat interface
- Download button missing
- Export commands not working

**Solutions:**

```bash
# Verify environment variables
grep ENABLE_EXPORT .env
# Should show: ENABLE_EXPORT=true

# Check agent configuration
grep AGENT .env
# Ensure AGENT_PROVIDER and AGENT_MODEL are set

# Restart with updated configuration
docker-compose down
docker-compose up -d
```

### 4. Files Not Downloading

**Symptoms:**
- Export completes but no download starts
- File links are broken
- "File not found" errors

**Solutions:**

#### Check Volume Mounts
```bash
# Verify volume configuration
docker inspect anythingllm | grep -A 10 Mounts

# Ensure export directory is properly mounted
docker exec anythingllm ls -la /app/server/storage/exports

# Test file creation
docker exec anythingllm touch /app/server/storage/exports/test.txt
ls -la exports/test.txt
```

#### Browser Issues
- Clear browser cache and cookies
- Try different browser
- Disable ad blockers/extensions
- Check browser console for errors (F12)

### 5. Workspace-Specific Export Issues

**Symptoms:**
- Exports work in some workspaces but not others
- Inconsistent behavior across workspaces

**Solutions:**

```bash
# Reset workspace configuration
# In UI: Workspace Settings → Reset to Defaults

# Or via API:
curl -X POST http://localhost:3001/api/workspace/reset \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workspace": "your-workspace-name"}'
```

### 6. Custom Skill Not Loading

**Symptoms:**
- document-export skill not available
- Custom skills directory not recognized
- Skill errors in logs

**Solutions:**

#### Verify Skill Installation
```bash
# Check if skill file exists
ls -la custom-skills/document-export.js

# Verify Node modules
ls -la custom-skills/node_modules/

# Check skill loading in container
docker exec anythingllm ls -la /app/server/storage/plugins/agent-skills/

# View skill loading logs
docker-compose logs anythingllm | grep -i "skill\|plugin"
```

#### Reinstall Custom Skill
```bash
# Remove and reinstall
rm -rf custom-skills/node_modules
cd custom-skills
npm cache clean --force
npm install
cd ..
docker-compose restart anythingllm
```

### 7. Database Issues Affecting Exports

**Symptoms:**
- Exports fail with database errors
- Conversation history not available for export
- Workspace data corruption

**Solutions:**

```bash
# Check database connection
docker exec -it anythingllm_postgres psql -U anythingllm -d anythingllm_db -c "SELECT 1;"

# Check database logs
docker-compose logs postgres

# Repair database if needed
docker exec -it anythingllm_postgres psql -U anythingllm -d anythingllm_db
VACUUM ANALYZE;
REINDEX DATABASE anythingllm_db;
\q

# Restart services
docker-compose restart
```

## Diagnostic Commands

### Complete System Check
```bash
#!/bin/bash
echo "=== AnythingLLM Export Diagnostics ==="
echo ""
echo "1. Service Status:"
docker-compose ps
echo ""
echo "2. Container Health:"
docker inspect anythingllm --format='{{.State.Health.Status}}'
echo ""
echo "3. Export Directory:"
ls -la exports/
echo ""
echo "4. Custom Skills:"
ls -la custom-skills/
echo ""
echo "5. Recent Errors:"
docker-compose logs --tail=50 anythingllm | grep -i error
echo ""
echo "6. Memory Usage:"
docker stats --no-stream
echo ""
echo "7. Volume Mounts:"
docker inspect anythingllm | grep -A 5 "Mounts"
```

### Export Test Script
```javascript
// Save as test-export.js and run in browser console
async function testExport() {
  const response = await fetch('/api/workspace/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
    },
    body: JSON.stringify({
      format: 'docx',
      content: 'Test export content'
    })
  });
  
  if (response.ok) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-export.docx';
    a.click();
    console.log('Export successful');
  } else {
    console.error('Export failed:', await response.text());
  }
}

testExport();
```

## Logging and Debugging

### Enable Verbose Logging
```bash
# Add to docker-compose.yml environment:
- LOG_LEVEL=debug
- DEBUG=true

# Restart and watch logs
docker-compose up -d
docker-compose logs -f anythingllm
```

### Monitor File Operations
```bash
# Watch file system events in export directory
inotifywait -m -r exports/

# Or using watch
watch -n 0.5 'ls -la exports/ | tail -20'
```

## Fallback Export Methods

### Method 1: Direct API Export
```bash
# Export via API
curl -X POST http://localhost:3001/api/document/export \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "docx",
    "conversationId": "conversation-id-here",
    "includeSystemMessages": false
  }' \
  -o exported-document.docx
```

### Method 2: Manual Export via Database
```bash
# Export conversation from database
docker exec -it anythingllm_postgres psql -U anythingllm -d anythingllm_db \
  -c "COPY (SELECT * FROM conversations WHERE workspace='your-workspace') TO '/tmp/export.csv' CSV HEADER;"

docker cp anythingllm_postgres:/tmp/export.csv ./conversation-export.csv
```

### Method 3: Copy-Paste Workaround
1. Select all text in conversation
2. Copy to clipboard (Ctrl+C)
3. Paste into Word/Google Docs
4. Save as DOCX/PDF

## Prevention Tips

1. **Regular Maintenance:**
   ```bash
   # Weekly cleanup
   docker system prune -f
   docker volume prune -f
   ```

2. **Monitor Disk Space:**
   ```bash
   df -h /var/lib/docker
   ```

3. **Backup Configuration:**
   ```bash
   # Backup working configuration
   tar -czf config-backup.tar.gz .env docker-compose.yml custom-skills/
   ```

4. **Test After Updates:**
   - Always test export functionality after updating
   - Keep previous working image tags noted

## Getting Help

If issues persist after trying these solutions:

1. **Collect Diagnostic Information:**
   ```bash
   docker-compose logs > anythingllm-logs.txt
   docker inspect anythingllm > container-inspect.txt
   docker-compose config > compose-config.txt
   ```

2. **Check GitHub Issues:**
   - https://github.com/Mintplex-Labs/anything-llm/issues

3. **Discord Community:**
   - Join: https://discord.gg/anythingllm
   - Post in #support with diagnostic info

4. **File Bug Report:**
   Include:
   - Docker version
   - OS version
   - Exact error messages
   - Steps to reproduce
   - Diagnostic logs

## Version-Specific Issues

### Latest Version (as of Jan 2025)
- Known issue: DOCX export may fail with certain Unicode characters
- Workaround: Export as PDF or clean text before export

### v1.0.0 - v1.5.0
- Custom skills require manual installation
- Agent mode must be explicitly enabled per workspace

Remember to check the [official documentation](https://docs.anythingllm.com) for the most up-to-date information.
