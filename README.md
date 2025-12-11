# AnythingLLM Docker Deployment Package
## Complete Setup with DOCX/PDF Export Capabilities

This package contains everything you need to deploy AnythingLLM with full document export functionality using Docker Compose.

## 📁 Package Contents

### Core Configuration Files
- **`docker-compose.yml`** - Main Docker Compose configuration with all services
- **`.env.template`** - Environment variables template (copy to .env)
- **`litellm-config.yaml`** - LiteLLM proxy configuration for model management
- **`setup.sh`** - Automated setup script (run this first!)

### Documentation
- **`INSTALL.md`** - Comprehensive installation guide
- **`TROUBLESHOOTING.md`** - Detailed troubleshooting for export issues
- **`QUICK_REFERENCE.md`** - Command cheat sheet for daily operations
- **`README.md`** - This file

### Custom Features
- **`custom-skills/document-export.js`** - Enhanced document export skill
- **`custom-skills/package.json`** - Node.js dependencies for custom skills

## 🚀 Quick Start

### Automatic Setup (Recommended)
```bash
# Make setup script executable (if not already)
chmod +x setup.sh

# Run automated setup
./setup.sh
```

### Manual Setup
```bash
# 1. Copy environment template
cp .env.template .env

# 2. Edit .env with your API keys
nano .env

# 3. Create required directories
mkdir -p exports custom-skills init-scripts

# 4. Install custom skill dependencies
cd custom-skills && npm install && cd ..

# 5. Start services
docker-compose up -d

# 6. Access at http://localhost:3001
```

## 🔑 Key Features

### Document Export Capabilities
- ✅ DOCX (Word) document export
- ✅ PDF document generation
- ✅ Markdown export
- ✅ Custom formatting and templates
- ✅ Batch export support
- ✅ Workspace-based exports

### Infrastructure Components
- **AnythingLLM** - Main application
- **PostgreSQL** - Persistent database
- **LiteLLM Proxy** - Flexible LLM model management
- **Gotenberg** - Advanced PDF conversion service
- **Custom Skills** - Extended functionality

### LLM Support
- **Anthropic Claude** (3.5 Sonnet, Opus, Haiku)
- **OpenAI GPT** (GPT-4, GPT-3.5)
- **Any LiteLLM-compatible model**

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB disk space
- API keys (Anthropic or OpenAI)

## 🔧 Configuration

### Essential Environment Variables
```env
# Choose your LLM provider
ANTHROPIC_API_KEY=sk-ant-api03-...
AGENT_PROVIDER=anthropic
AGENT_MODEL=claude-3-5-sonnet-20241022

# Or use OpenAI
OPENAI_API_KEY=sk-...
AGENT_PROVIDER=openai
AGENT_MODEL=gpt-4-turbo-preview

# Enable features
ENABLE_EXPORT=true
AGENT_CUSTOM_SKILLS=true
```

## 📊 Service Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│                 │     │              │     │              │
│   AnythingLLM   │────▶│   LiteLLM    │────▶│  Claude/GPT  │
│    Port 3001    │     │  Port 4000   │     │     APIs     │
│                 │     │              │     │              │
└────────┬────────┘     └──────────────┘     └──────────────┘
         │
         │              ┌──────────────┐
         │              │              │
         ├─────────────▶│  PostgreSQL  │
         │              │  Port 5432   │
         │              │              │
         │              └──────────────┘
         │
         │              ┌──────────────┐
         │              │              │
         └─────────────▶│  Gotenberg   │
                        │  Port 3002   │
                        │              │
                        └──────────────┘
```

## 🎯 Next Steps

1. **Initial Setup:**
   - Run `./setup.sh` or follow manual steps
   - Configure API keys in `.env`
   - Access UI at http://localhost:3001

2. **Configure Workspace:**
   - Create admin account
   - Set up workspaces
   - Enable agent mode
   - Configure custom skills

3. **Test Export Features:**
   - Upload or create content
   - Test DOCX export: "Export this to Word"
   - Test PDF export: "Create a PDF document"
   - Check `./exports/` directory

4. **Production Deployment:**
   - Review security settings
   - Configure SSL/TLS
   - Set up automated backups
   - Monitor resource usage

## 🆘 Support Resources

- **Installation Issues:** See `INSTALL.md`
- **Export Problems:** See `TROUBLESHOOTING.md`
- **Quick Commands:** See `QUICK_REFERENCE.md`
- **GitHub Issues:** https://github.com/Mintplex-Labs/anything-llm/issues
- **Discord Community:** https://discord.gg/anythingllm

## 📝 Notes

- All data is persisted in Docker volumes
- Exports are saved to `./exports/` directory
- Custom skills require Node.js dependencies
- Regular backups recommended for production use

## ✅ Testing Checklist

After deployment, verify:
- [ ] AnythingLLM accessible at http://localhost:3001
- [ ] Can create and log into account
- [ ] LLM provider configured and working
- [ ] Agent mode enabled in workspace
- [ ] Document export skills visible
- [ ] DOCX export working
- [ ] PDF export working
- [ ] Files appear in `./exports/` directory

## 🔄 Updates

To update to latest versions:
```bash
docker-compose pull
docker-compose up -d --force-recreate
```

---

**Version:** 1.0.0  
**Created:** January 2025  
**Compatible with:** AnythingLLM latest
