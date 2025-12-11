#!/bin/bash

# AnythingLLM Docker Compose Setup Script
# This script automates the initial setup process

set -e

echo "======================================"
echo "AnythingLLM Docker Setup Script"
echo "======================================"
echo ""

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose detected"
echo ""

# Create necessary directories
echo "Creating required directories..."
mkdir -p exports
mkdir -p custom-skills
mkdir -p init-scripts
echo "✅ Directories created"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    if [ -f .env.template ]; then
        echo "📝 Creating .env file from template..."
        cp .env.template .env
        
        # Generate secure JWT secret
        JWT_SECRET=$(openssl rand -hex 32)
        if [ "$(uname)" = "Darwin" ]; then
            # macOS
            sed -i '' "s/your-very-secure-jwt-secret-please-change-this-.*/$JWT_SECRET/" .env
        else
            # Linux
            sed -i "s/your-very-secure-jwt-secret-please-change-this-.*/$JWT_SECRET/" .env
        fi
        
        echo "✅ .env file created with generated JWT secret"
        echo ""
        echo "⚠️  IMPORTANT: Edit .env file to add your API keys:"
        echo "   - ANTHROPIC_API_KEY for Claude models"
        echo "   - OPENAI_API_KEY for OpenAI models"
        echo ""
        echo "Press Enter after editing .env file to continue..."
        read -r
    else
        echo "❌ .env.template file not found"
        exit 1
    fi
else
    echo "✅ .env file already exists"
fi

# Install custom skill dependencies
if [ -f custom-skills/package.json ]; then
    echo "Installing custom skill dependencies..."
    cd custom-skills
    
    # Check if npm is installed
    if command -v npm &> /dev/null; then
        npm install
        echo "✅ Custom skill dependencies installed"
    else
        echo "⚠️  npm not found. Skipping custom skill installation."
        echo "   Document export features may not work properly."
        echo "   Install Node.js/npm and run: cd custom-skills && npm install"
    fi
    cd ..
else
    echo "⚠️  custom-skills/package.json not found"
fi
echo ""

# Pull Docker images
echo "Pulling Docker images (this may take a few minutes)..."
docker-compose pull
echo "✅ Docker images pulled"
echo ""

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check service status
echo ""
echo "Service Status:"
echo "---------------"
docker-compose ps
echo ""

# Get container health status
ANYTHINGLLM_HEALTH=$(docker inspect anythingllm --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
POSTGRES_HEALTH=$(docker inspect anythingllm_postgres --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")

echo "Health Check:"
echo "  AnythingLLM: $ANYTHINGLLM_HEALTH"
echo "  PostgreSQL: $POSTGRES_HEALTH"
echo ""

# Display access information
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Access Points:"
echo "  📦 AnythingLLM: http://localhost:3001"
echo "  🔄 LiteLLM Proxy: http://localhost:4000"
echo "  📄 Gotenberg: http://localhost:3002"
echo "  🗄️ PostgreSQL: localhost:5432"
echo ""
echo "Default Credentials:"
echo "  PostgreSQL: anythingllm / securepassword123"
echo "  LiteLLM Master Key: Check your .env file"
echo ""
echo "Next Steps:"
echo "  1. Open http://localhost:3001 in your browser"
echo "  2. Create your admin account"
echo "  3. Configure your workspace"
echo "  4. Enable agent skills for document export"
echo ""
echo "Useful Commands:"
echo "  View logs: docker-compose logs -f anythingllm"
echo "  Stop services: docker-compose down"
echo "  Restart services: docker-compose restart"
echo "  Update services: docker-compose pull && docker-compose up -d"
echo ""
echo "Documentation Export:"
echo "  Exported files will be saved to: ./exports/"
echo "  Access via AnythingLLM UI: Settings → Workspace → Exports"
echo ""
echo "For troubleshooting, check TROUBLESHOOTING.md"
echo ""
