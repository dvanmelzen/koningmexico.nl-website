#!/bin/bash
# Koning Mexico VPS Deployment Script
# Run this on your VPS after cloning the repository

set -e  # Exit on error

echo "🚀 Starting Koning Mexico deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running in correct directory
if [ ! -f "docker-compose.mexico.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.mexico.yml not found${NC}"
    echo "Please run this script from /opt/koningmexico directory"
    exit 1
fi

# Step 1: Environment configuration
echo -e "${YELLOW}📝 Step 1/6: Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env not found, creating from template...${NC}"
    cp .env.production .env

    echo -e "${YELLOW}Generating JWT_SECRET...${NC}"
    JWT_SECRET=$(openssl rand -base64 32)

    # Update .env with generated secret
    sed -i "s|JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING|JWT_SECRET=$JWT_SECRET|g" .env

    echo -e "${GREEN}✅ .env created with generated JWT_SECRET${NC}"
    echo -e "${YELLOW}⚠️  Please verify .env settings:${NC}"
    cat .env
    echo ""
    read -p "Press Enter to continue or Ctrl+C to edit .env first..."
else
    echo -e "${GREEN}✅ .env already exists${NC}"
fi

# Step 2: Docker build
echo -e "${YELLOW}🐳 Step 2/6: Building Docker images...${NC}"
docker compose -f docker-compose.mexico.yml build
echo -e "${GREEN}✅ Docker images built${NC}"

# Step 3: Start containers
echo -e "${YELLOW}🚀 Step 3/6: Starting containers...${NC}"
docker compose -f docker-compose.mexico.yml up -d
echo -e "${GREEN}✅ Containers started${NC}"

# Step 4: Wait for health checks
echo -e "${YELLOW}🏥 Step 4/6: Waiting for containers to be healthy...${NC}"
sleep 10

# Check container status
BACKEND_STATUS=$(docker inspect -f '{{.State.Health.Status}}' mexico-backend-prod 2>/dev/null || echo "not found")
FRONTEND_STATUS=$(docker inspect -f '{{.State.Health.Status}}' mexico-frontend-prod 2>/dev/null || echo "not found")

echo "Backend status: $BACKEND_STATUS"
echo "Frontend status: $FRONTEND_STATUS"

# Step 5: Test locally
echo -e "${YELLOW}🧪 Step 5/6: Testing local endpoints...${NC}"

if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend health check: OK${NC}"
else
    echo -e "${RED}❌ Backend health check: FAILED${NC}"
fi

if curl -f http://localhost:8080/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend health check: OK${NC}"
else
    echo -e "${RED}❌ Frontend health check: FAILED${NC}"
fi

# Step 6: Nginx configuration
echo -e "${YELLOW}🌐 Step 6/6: Checking Nginx configuration...${NC}"

if [ ! -L "/etc/nginx/sites-enabled/koningmexico" ]; then
    echo -e "${YELLOW}⚠️  Nginx not configured yet. Running configuration...${NC}"

    # Copy config
    sudo cp nginx-vps.conf /etc/nginx/sites-available/koningmexico

    # Enable site
    sudo ln -s /etc/nginx/sites-available/koningmexico /etc/nginx/sites-enabled/

    # Test config
    if sudo nginx -t; then
        echo -e "${GREEN}✅ Nginx configuration valid${NC}"

        # Reload Nginx
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ Nginx reloaded${NC}"
    else
        echo -e "${RED}❌ Nginx configuration invalid${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Nginx already configured${NC}"
fi

# Final status
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.mexico.yml ps
echo ""
echo "🌐 Next Steps:"
echo "1. Install SSL certificate:"
echo "   sudo certbot --nginx -d dev.koningmexico.nl"
echo ""
echo "2. Test your site:"
echo "   http://dev.koningmexico.nl (will redirect to HTTPS after SSL)"
echo ""
echo "📝 View logs:"
echo "   docker compose -f docker-compose.mexico.yml logs -f"
echo ""
