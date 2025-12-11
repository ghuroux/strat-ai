# LibreChat AlmaLinux - Quick Start Guide

## One-Line Installation

```bash
# Download, extract, and install
curl -L https://your-server/librechat-deployment.tar.gz | tar xz && \
cd librechat-deployment-* && \
sudo bash install-almalinux.sh
```

## Manual Deployment Steps

### 1. Transfer Package to Server

```bash
scp librechat-deployment-20251204-165721.tar.gz user@almalinux-server:/tmp/
```

### 2. Extract and Install

```bash
ssh user@almalinux-server
cd /tmp
tar xzf librechat-deployment-*.tar.gz
cd librechat-deployment-*
sudo bash install-almalinux.sh
```

### 3. Access Services

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| LibreChat | http://server-ip:3001 | admin@librechat.local / admin123 |
| LiteLLM UI | http://server-ip:4000 | admin / sk-1234 |
| Export Server | http://server-ip:8080 | No login required |

## What Gets Installed

✅ **Docker** - Container runtime
✅ **Docker Compose** - Multi-container orchestration
✅ **Pandoc** - Document conversion
✅ **LibreChat** - AI chat interface
✅ **LiteLLM** - Multi-LLM proxy
✅ **MongoDB** - LibreChat database
✅ **PostgreSQL** - LiteLLM database
✅ **Gotenberg** - PDF conversion engine
✅ **Export API** - PDF/DOCX converter
✅ **Nginx Proxy** - Auto-injects export buttons
✅ **Firewall Rules** - Opens required ports

## Post-Installation Checklist

- [ ] Login to LibreChat (port 3001)
- [ ] Change admin password
- [ ] Login to LiteLLM UI (port 4000)
- [ ] Add your API keys (Anthropic, OpenAI, etc.)
- [ ] Test chat functionality
- [ ] Test PDF/DOCX export buttons
- [ ] Configure SSL/TLS for production
- [ ] Setup backups

## Essential Commands

```bash
# Navigate to installation
cd /opt/librechat

# Check status
docker compose ps

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Start services
docker compose up -d

# Update containers
docker compose pull && docker compose up -d
```

## Export Features

**Automatic Export Buttons** appear in LibreChat (bottom-right):

- **📕 Download PDF** - Export conversation as PDF
- **📘 Download DOCX** - Export conversation as DOCX

No browser extensions needed - built-in!

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | AlmaLinux 8+ | AlmaLinux 9+ |
| CPU | 2 cores | 4+ cores |
| RAM | 4GB | 8GB+ |
| Disk | 20GB | 50GB+ SSD |
| Network | 100Mbps | 1Gbps |

## Ports

| Port | Service | Purpose |
|------|---------|---------|
| 3001 | Nginx/LibreChat | Main web interface |
| 4000 | LiteLLM | Model management UI |
| 8080 | Download Server | Manual export interface |
| 8081 | Export API | PDF/DOCX conversion |

## Troubleshooting

### Services won't start
```bash
sudo systemctl status docker
docker compose logs
sudo systemctl restart docker && docker compose up -d
```

### Can't access on port 3001
```bash
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
curl http://localhost:3001
```

### Export buttons missing
```bash
docker compose ps nginx-proxy export-api
docker compose restart nginx-proxy
# Clear browser cache and reload
```

### LiteLLM connection error
```bash
docker compose logs litellm
docker compose restart litellm librechat
```

## Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| Environment | `/opt/librechat/.env` | API keys, passwords |
| Docker | `/opt/librechat/docker-compose.yml` | Services definition |
| LibreChat | `/opt/librechat/librechat.yaml` | Chat config |
| LiteLLM | `/opt/librechat/litellm-config.yaml` | Model config |
| Nginx | `/opt/librechat/nginx-inject.conf` | Proxy config |

## Security Tips

1. **Change Default Passwords**
   ```bash
   nano /opt/librechat/.env
   # Change JWT_SECRET, passwords
   docker compose down && docker compose up -d
   ```

2. **Enable SSL/TLS**
   ```bash
   sudo dnf install -y caddy
   sudo nano /etc/caddy/Caddyfile
   # Add: yourdomain.com { reverse_proxy localhost:3001 }
   sudo systemctl restart caddy
   ```

3. **Restrict Firewall**
   ```bash
   # Only allow specific IPs
   sudo firewall-cmd --permanent --add-rich-rule='
     rule family="ipv4"
     source address="YOUR_IP/32"
     port port="3001" protocol="tcp" accept'
   sudo firewall-cmd --reload
   ```

4. **Regular Updates**
   ```bash
   cd /opt/librechat
   docker compose pull
   docker compose up -d --force-recreate
   ```

## Support & Documentation

- **Installation Log:** `/var/log/librechat-install.log`
- **Service Logs:** `docker compose logs`
- **Full Guide:** `ALMALINUX-INSTALL.md`
- **Export Guide:** `EXPORT-SETUP.md`
- **Architecture:** `CLAUDE.md`

## Quick Links

- LibreChat Docs: https://www.librechat.ai/
- LiteLLM Docs: https://docs.litellm.ai/
- Docker Docs: https://docs.docker.com/
- AlmaLinux Wiki: https://wiki.almalinux.org/

---

**Need help?** Check logs first: `docker compose logs -f`
