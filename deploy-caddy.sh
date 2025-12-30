#!/bin/bash
# Koning Mexico + Caddy VPS Deployment Script
# Complete containerized setup with automatic HTTPS

set -e  # Exit on error

echo "🚀 Starting Caddy + Koning Mexico deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running in correct directory
if [ ! -f "docker-compose.mexico.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.mexico.yml not found${NC}"
    echo "Please run this script from /opt/koningmexico directory"
    exit 1
fi

# Step 1: Environment configuration
echo -e "${YELLOW}📝 Step 1/7: Checking environment configuration...${NC}"
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

# Step 2: Create logs directory
echo -e "${YELLOW}📁 Step 2/7: Creating logs directory...${NC}"
mkdir -p logs
chmod 755 logs
echo -e "${GREEN}✅ Logs directory created${NC}"

# Step 3: Stop existing containers (if any)
echo -e "${YELLOW}🛑 Step 3/7: Stopping existing containers...${NC}"
docker compose -f docker-compose.caddy.yml down 2>/dev/null || true
docker compose -f docker-compose.mexico.yml down 2>/dev/null || true
echo -e "${GREEN}✅ Existing containers stopped${NC}"

# Step 4: Start Caddy reverse proxy
echo -e "${YELLOW}🌐 Step 4/7: Starting Caddy reverse proxy...${NC}"
docker compose -f docker-compose.caddy.yml up -d
sleep 5
echo -e "${GREEN}✅ Caddy started${NC}"

# Step 5: Build and start Mexico containers
echo -e "${YELLOW}🐳 Step 5/7: Building and starting Mexico containers...${NC}"
docker compose -f docker-compose.mexico.yml build
docker compose -f docker-compose.mexico.yml up -d
echo -e "${GREEN}✅ Mexico containers started${NC}"

# Step 6: Wait for health checks
echo -e "${YELLOW}🏥 Step 6/7: Waiting for containers to be healthy...${NC}"
sleep 15

# Check container status
CADDY_STATUS=$(docker inspect -f '{{.State.Status}}' caddy-proxy 2>/dev/null || echo "not found")
BACKEND_STATUS=$(docker inspect -f '{{.State.Health.Status}}' mexico-backend 2>/dev/null || echo "not found")
FRONTEND_STATUS=$(docker inspect -f '{{.State.Health.Status}}' mexico-frontend 2>/dev/null || echo "not found")

echo "Caddy status: $CADDY_STATUS"
echo "Backend status: $BACKEND_STATUS"
echo "Frontend status: $FRONTEND_STATUS"

# Step 7: Test endpoints
echo -e "${YELLOW}🧪 Step 7/7: Testing endpoints...${NC}"

# Test Caddy health
if curl -f http://localhost:2019/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Caddy health check: OK${NC}"
else
    echo -e "${RED}❌ Caddy health check: FAILED${NC}"
fi

# Final status
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Container Status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo -e "${BLUE}🌐 Your site is now live at:${NC}"
echo -e "   ${GREEN}https://dev.koningmexico.nl${NC}"
echo ""
echo -e "${BLUE}🔐 SSL Certificate:${NC}"
echo "   Caddy will automatically obtain and renew Let's Encrypt certificates"
echo "   Wait 1-2 minutes for initial certificate provisioning"
echo ""
echo -e "${BLUE}📝 View logs:${NC}"
echo "   docker logs -f caddy-proxy"
echo "   docker logs -f mexico-backend"
echo "   docker logs -f mexico-frontend"
echo ""
echo -e "${BLUE}📈 Caddy Admin API:${NC}"
echo "   curl http://localhost:2019/config/"
echo ""
