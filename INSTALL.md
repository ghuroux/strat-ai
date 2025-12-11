# AnythingLLM Docker Compose Installation Guide
## With Enhanced Document Export Capabilities (DOCX & PDF)

This guide provides a complete setup for AnythingLLM with full document export functionality using Docker Compose.

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose 2.0+ installed
- At least 4GB RAM available
- 10GB free disk space
- API keys for your preferred LLM provider (Anthropic Claude or OpenAI)

## Quick Start

### 1. Clone or Download Files

Create a project directory and download all configuration files:

```bash
# Create project directory
mkdir anythingllm-docker && cd anythingllm-docker

# Download the configuration files provided, or create them manually
```

### 2. Configure Environment Variables

```bash
# Copy the environment template
cp .env.template .env

# Edit the .env file with your API keys
nano .env  # or use your preferred editor
```

**Required configurations in .env:**

- Set `ANTHROPIC_API_KEY` if using Claude models
- Set `OPENAI_API_KEY` if using OpenAI models
- Change `JWT_SECRET` to a secure random value
- Update database passwords for production use

### 3. Create Required Directories

```bash
# Create directories for exports and custom skills
mkdir -p exports
mkdir -p custom-skills
mkdir -p init-scripts
```

### 4. Install Custom Skill Dependencies

```bash
# Navigate to custom skills directory
cd custom-skills

# Install Node.js dependencies for document export
npm install

# Return to main directory
cd ..
```

### 5. Start the Services

```bash
# Start all services in detached mode
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f anythingllm
```

### 6. Access AnythingLLM

Open your browser and navigate to: `http://localhost:3001`

**First-time setup:**
1. Create your admin account
2. Configure your workspace
3. Set up your LLM provider (will use settings from .env)
4. Enable agent skills for document export

## Configuration Options

### Using Direct Anthropic API

In your `.env` file:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
AGENT_PROVIDER=anthropic
AGENT_MODEL=claude-3-5-sonnet-20241022
```

### Using LiteLLM Proxy (Recommended)

The setup includes LiteLLM proxy for flexible model management:

1. Access LiteLLM UI at: `http://localhost:4000`
2. Use master key from `.env` for authentication
3. Configure AnythingLLM to use LiteLLM:
   ```env
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-1234  # Your LiteLLM master key
   OPENAI_BASE_URL=http://litellm:4000
   ```

### Using Gotenberg for Advanced PDF Export

Gotenberg service is included for advanced document conversion:
- Accessible at: `http://localhost:3002`
- Automatically used by document export skills
- Supports complex HTML to PDF conversion

## Document Export Features

### Enabling Export Capabilities

1. **In AnythingLLM UI:**
   - Go to Settings → Agent Configuration
   - Enable "Custom Skills"
   - Select "document-export" skill
   - Save settings

2. **Available Export Commands:**

   When chatting with an agent-enabled workspace:
   ```
   "Export this conversation to PDF"
   "Save this as a Word document"
   "Create a DOCX file with our discussion"
   "Generate a PDF report of this analysis"
   ```

3. **Export Locations:**
   - Files are saved to: `./exports/` directory
   - Accessible via UI: Settings → Workspace → Exports
   - Direct download links provided in chat

### Troubleshooting Document Exports

**Issue: DOCX files appear corrupted**
- Solution: Ensure custom skills are properly installed
- Run: `cd custom-skills && npm install`
- Restart AnythingLLM container: `docker-compose restart anythingllm`

**Issue: PDF export fails**
- Check Gotenberg service: `docker-compose logs gotenberg`
- Ensure sufficient memory allocated to Docker
- Verify file permissions on exports directory

**Issue: Export button not visible**
- Enable agent mode for the workspace
- Ensure AGENT_SKILLS includes "save-file-to-browser"
- Check that ENABLE_EXPORT=true in .env

## Data Management

### Backup

```bash
# Backup all data
docker-compose down
tar -czf anythingllm-backup-$(date +%Y%m%d).tar.gz \
  exports/ \
  custom-skills/ \
  .env \
  docker-compose.yml

# Backup just the database
docker exec anythingllm_postgres pg_dump -U anythingllm anythingllm_db > backup.sql
```

### Restore

```bash
# Restore from backup
tar -xzf anythingllm-backup-20240115.tar.gz

# Restore database
docker exec -i anythingllm_postgres psql -U anythingllm anythingllm_db < backup.sql
```

### Data Locations

- **Documents:** Stored in Docker volume `anythingllm_documents`
- **Vector Cache:** Stored in Docker volume `anythingllm_vector_cache`
- **Exports:** Local directory `./exports/`
- **Database:** PostgreSQL volume `postgres_data`

## Monitoring and Maintenance

### Check Service Health

```bash
# Check all services
docker-compose ps

# Check specific service health
docker inspect anythingllm --format='{{.State.Health.Status}}'

# View resource usage
docker stats
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f anythingllm
docker-compose logs -f postgres
docker-compose logs -f litellm
```

### Update Services

```bash
# Pull latest images
docker-compose pull

# Recreate containers with new images
docker-compose up -d --force-recreate
```

## Security Considerations

1. **Change default passwords** in production
2. **Use HTTPS** with a reverse proxy (nginx/traefik)
3. **Restrict port exposure** - only expose necessary ports
4. **Regular backups** - automate daily backups
5. **Update regularly** - keep images and dependencies current
6. **Network isolation** - use Docker networks appropriately

## Advanced Configuration

### Custom LLM Models

Edit `litellm-config.yaml` to add more models:
```yaml
model_list:
  - model_name: your-custom-model
    litellm_params:
      model: provider/model-name
      api_key: ${YOUR_API_KEY}
```

### Scaling for Production

For production deployments:
1. Use external PostgreSQL database
2. Implement Redis for caching
3. Add reverse proxy with SSL
4. Configure automated backups
5. Set up monitoring (Prometheus/Grafana)

## Common Issues and Solutions

### Container Fails to Start

```bash
# Check logs
docker-compose logs anythingllm

# Common fixes:
# 1. Ensure .env file exists and is configured
# 2. Check port availability
lsof -i :3001
# 3. Verify Docker resources
docker system df
```

### Database Connection Issues

```bash
# Test database connection
docker exec -it anythingllm_postgres psql -U anythingllm -d anythingllm_db

# Reset database if needed
docker-compose down -v  # Warning: This deletes all data
docker-compose up -d
```

### Permission Issues

```bash
# Fix export directory permissions
chmod 755 exports/
chmod 755 custom-skills/

# Fix Docker socket permissions (if needed)
sudo usermod -aG docker $USER
newgrp docker
```

## Support and Resources

- **AnythingLLM Documentation:** https://docs.anythingllm.com
- **GitHub Issues:** https://github.com/Mintplex-Labs/anything-llm/issues
- **Discord Community:** https://discord.gg/anythingllm
- **LiteLLM Docs:** https://docs.litellm.ai
- **Gotenberg Docs:** https://gotenberg.dev

## Next Steps

1. **Configure Workspaces:** Create specialized workspaces for different use cases
2. **Upload Documents:** Add your documents for RAG capabilities
3. **Customize Prompts:** Fine-tune system prompts for your needs
4. **Enable Integrations:** Connect external tools and APIs
5. **Set Up Automation:** Use the API for programmatic access

## License

This configuration is provided as-is for use with AnythingLLM. Please refer to the AnythingLLM license for terms of use.

---

**Note:** This setup has been tested with AnythingLLM latest version as of January 2025. Features and configuration options may change in future releases.
