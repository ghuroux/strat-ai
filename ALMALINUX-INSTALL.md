# LibreChat Installation Guide for AlmaLinux

Complete guide for deploying LibreChat with LiteLLM, MongoDB, PostgreSQL, and automatic PDF/DOCX export functionality on AlmaLinux.

## Table of Contents

- [System Requirements](#system-requirements)
- [Quick Start](#quick-start)
- [Manual Installation](#manual-installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## System Requirements

### Minimum Requirements
- **OS:** AlmaLinux 8.x or 9.x
- **CPU:** 2 cores
- **RAM:** 4GB
- **Disk:** 20GB free space
- **Network:** Ports 3001, 4000, 8080, 8081

### Recommended Requirements
- **OS:** AlmaLinux 9.x
- **CPU:** 4+ cores
- **RAM:** 8GB+
- **Disk:** 50GB+ SSD
- **Network:** 1Gbps

## Quick Start

### Option 1: Automated Installation (Recommended)

1. **Download the deployment package:**
   ```bash
   wget https://your-server/librechat-deployment.tar.gz
   # OR transfer from your local machine:
   # scp librechat-deployment.tar.gz user@server:/tmp/
   ```

2. **Extract and run installer:**
   ```bash
   cd /tmp
   tar xzf librechat-deployment-*.tar.gz
   cd librechat-deployment-*
   sudo bash install-almalinux.sh
   ```

3. **Access LibreChat:**
   - Open http://your-server-ip:3001
   - Login: `admin@librechat.local` / `admin123`

### Option 2: Create Deployment Package

On your development machine (macOS/Linux):

```bash
cd /Users/william/Downloads/anythingllm-docker-complete
bash create-deployment-package.sh
scp librechat-deployment-*.tar.gz user@almalinux-server:/tmp/
```

Then follow Option 1 steps 2-3 on the AlmaLinux server.

## Manual Installation

If you prefer to install step-by-step:

### Step 1: Install Prerequisites

```bash
# Update system
sudo dnf update -y

# Install required packages
sudo dnf install -y \
    curl \
    wget \
    git \
    nano \
    firewalld \
    dnf-plugins-core \
    yum-utils
```

### Step 2: Install Docker

```bash
# Add Docker repository
sudo dnf config-manager \
    --add-repo=https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker
sudo dnf install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group
sudo usermod -aG docker $USER

# Logout and login again for group changes to take effect
```

### Step 3: Install Pandoc

```bash
# Install EPEL repository
sudo dnf install -y epel-release

# Install Pandoc
sudo dnf install -y pandoc
```

### Step 4: Configure Firewall

```bash
# Start firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Open required ports
sudo firewall-cmd --permanent --add-port=3001/tcp  # LibreChat
sudo firewall-cmd --permanent --add-port=4000/tcp  # LiteLLM
sudo firewall-cmd --permanent --add-port=8080/tcp  # Download Server
sudo firewall-cmd --permanent --add-port=8081/tcp  # Export API

# Reload firewall
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-ports
```

### Step 5: Setup Application

```bash
# Create installation directory
sudo mkdir -p /opt/librechat
cd /opt/librechat

# Copy all configuration files here
# - docker-compose.yml
# - librechat.yaml
# - litellm-config.yaml
# - nginx-inject.conf
# - export-enhancer.js
# - export-api-v2.py
# - convert-export.sh
# - paste-and-convert.sh

# Create required directories
mkdir -p exports
mkdir -p init-scripts

# Create PostgreSQL init script
cat > init-scripts/01-create-litellm-db.sql << 'EOF'
CREATE DATABASE litellm_db;
GRANT ALL PRIVILEGES ON DATABASE litellm_db TO anythingllm;
EOF

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Create .env file
cat > .env << EOF
JWT_SECRET=$JWT_SECRET
AUTH_TOKEN=
OPENAI_API_KEY=sk-1234
OPENAI_BASE_URL=http://litellm:4000
LITELLM_MASTER_KEY=sk-1234
UI_USERNAME=admin
UI_PASSWORD=sk-1234
STORE_MODEL_IN_DB=True
POSTGRES_PASSWORD=securepassword123
ALLOW_REGISTRATION=true
ALLOW_UNVERIFIED_EMAIL_LOGIN=true
EOF

# Make scripts executable
chmod +x *.sh *.py 2>/dev/null || true

# Set permissions
sudo chown -R $USER:$USER /opt/librechat
```

### Step 6: Start Services

```bash
cd /opt/librechat

# Pull images (first time only)
docker compose pull

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 7: Create Admin User

```bash
cd /opt/librechat

# Wait for services to start (20-30 seconds)
sleep 30

# Create admin user
docker compose exec librechat npm run create-user \
    admin@librechat.local Admin admin admin123 \
    -- --email-verified=true
```

## Configuration

### Environment Variables

Edit `/opt/librechat/.env`:

```bash
# Security - Change these!
JWT_SECRET=your-secret-key-here
POSTGRES_PASSWORD=your-secure-password

# API Keys - Add your keys
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# LiteLLM Admin - Change these!
LITELLM_MASTER_KEY=your-secure-key
UI_USERNAME=admin
UI_PASSWORD=your-secure-password
```

### Adding LLM Models

1. **Via LiteLLM UI** (Recommended):
   - Open http://your-server:4000
   - Login with UI_USERNAME / UI_PASSWORD
   - Go to "Models" → "Add Model"
   - Enter your API keys
   - Save and test

2. **Via Configuration File**:
   Edit `/opt/librechat/litellm-config.yaml`:
   ```yaml
   model_list:
     - model_name: claude-3-5-sonnet
       litellm_params:
         model: anthropic/claude-3-5-sonnet-20241022
         api_key: os.environ/ANTHROPIC_API_KEY
   ```

### Customizing LibreChat

Edit `/opt/librechat/librechat.yaml`:

```yaml
endpoints:
  custom:
    - name: "My LLM"
      apiKey: "${OPENAI_API_KEY}"
      baseURL: "http://litellm:4000"
      models:
        default:
          - "claude-3-5-sonnet"
          - "gpt-4"
```

## Usage

### Accessing Services

- **LibreChat:** http://your-server:3001
  - Default Login: `admin@librechat.local` / `admin123`

- **LiteLLM UI:** http://your-server:4000
  - Default Login: `admin` / `sk-1234`

- **Download Server:** http://your-server:8080
  - Paste markdown and convert to PDF/DOCX

### Using Export Features

Export buttons appear **automatically** in LibreChat (bottom-right corner):

1. Have a conversation with the AI
2. Click **📕 Download PDF** or **📘 Download DOCX**
3. File downloads automatically!

No browser extensions needed - it's built-in!

### Managing Services

```bash
cd /opt/librechat

# View status
docker compose ps

# View logs
docker compose logs -f
docker compose logs -f librechat       # Specific service
docker compose logs -f export-api      # Export API logs

# Restart services
docker compose restart
docker compose restart librechat       # Specific service

# Stop services
docker compose down

# Start services
docker compose up -d

# Update images
docker compose pull
docker compose up -d

# Remove everything (including data!)
docker compose down -v
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
sudo systemctl status docker

# Check logs
cd /opt/librechat
docker compose logs

# Check port conflicts
sudo ss -tlnp | grep -E ':(3001|4000|8080|8081)'

# Restart Docker
sudo systemctl restart docker
docker compose up -d
```

### LibreChat Can't Connect to LiteLLM

```bash
# Check LiteLLM is running
docker compose ps litellm

# Check LiteLLM logs
docker compose logs litellm

# Test LiteLLM health
curl http://localhost:4000/health

# Restart LiteLLM
docker compose restart litellm librechat
```

### Export Buttons Not Appearing

```bash
# Check nginx proxy is running
docker compose ps nginx-proxy

# Check export API is running
docker compose ps export-api

# Test export API
curl http://localhost:8081/health

# Check browser console (F12) for errors

# Restart proxy
docker compose restart nginx-proxy
```

### PDF/DOCX Download Fails

```bash
# Check Gotenberg is running
docker compose ps gotenberg

# Check export API logs
docker compose logs export-api

# Test Gotenberg
curl http://localhost:3002/health

# Restart services
docker compose restart gotenberg export-api
```

### Permission Denied Errors

```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/librechat

# Fix script permissions
cd /opt/librechat
chmod +x *.sh *.py

# Check .env permissions
chmod 600 .env
```

### Firewall Issues

```bash
# Check firewall status
sudo firewall-cmd --list-all

# Open ports again
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=4000/tcp
sudo firewall-cmd --reload

# Temporarily disable firewall for testing (NOT for production!)
sudo systemctl stop firewalld
```

## Maintenance

### Backup

```bash
# Backup configuration
sudo tar czf librechat-config-backup-$(date +%Y%m%d).tar.gz \
    /opt/librechat/.env \
    /opt/librechat/*.yaml \
    /opt/librechat/*.conf

# Backup data volumes
docker compose down
sudo tar czf librechat-data-backup-$(date +%Y%m%d).tar.gz \
    /var/lib/docker/volumes/librechat*
docker compose up -d
```

### Updates

```bash
cd /opt/librechat

# Pull latest images
docker compose pull

# Recreate containers
docker compose up -d --force-recreate

# Check status
docker compose ps
```

### Logs Rotation

```bash
# View log sizes
du -sh /var/lib/docker/containers/*/*.log

# Configure log rotation in /etc/docker/daemon.json:
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
docker compose up -d
```

### Monitoring

```bash
# Resource usage
docker stats

# Disk usage
docker system df

# Clean up
docker system prune -a
```

## Security Considerations

### Production Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET
- [ ] Configure SSL/TLS (use nginx or Caddy)
- [ ] Restrict firewall rules
- [ ] Enable SELinux or AppArmor
- [ ] Regular backups
- [ ] Monitor logs
- [ ] Keep Docker updated
- [ ] Update container images regularly

### SSL/TLS Setup

Use Caddy for automatic HTTPS:

```bash
# Install Caddy
sudo dnf install -y caddy

# Configure Caddy
sudo nano /etc/caddy/Caddyfile
```

Add:
```
librechat.yourdomain.com {
    reverse_proxy localhost:3001
}

litellm.yourdomain.com {
    reverse_proxy localhost:4000
}
```

```bash
# Start Caddy
sudo systemctl start caddy
sudo systemctl enable caddy

# Open HTTPS port
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Support

### Logs

- Installation: `/var/log/librechat-install.log`
- Docker: `docker compose logs`
- System: `sudo journalctl -u docker`

### Resources

- LibreChat Docs: https://www.librechat.ai/
- LiteLLM Docs: https://docs.litellm.ai/
- Docker Docs: https://docs.docker.com/

### Common Issues

1. **Out of memory:** Increase RAM or add swap
2. **Disk full:** Clean up Docker: `docker system prune -a`
3. **Port conflicts:** Change ports in docker-compose.yml
4. **DNS issues:** Check /etc/resolv.conf

---

**Need help?** Check the logs and search for your specific error message.
