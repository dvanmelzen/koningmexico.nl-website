# Koning Mexico - Hetzner VPS Deployment Guide

**Version:** 1.0
**Last Updated:** 2025-12-30
**Target:** Hetzner VPS (Ubuntu 22.04)
**Existing Setup:** CFDS Financial System already running

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [DNS Configuration](#dns-configuration)
3. [Prepare VPS](#prepare-vps)
4. [Deploy Application](#deploy-application)
5. [Configure Nginx](#configure-nginx)
6. [SSL Certificate](#ssl-certificate)
7. [Database Backups](#database-backups)
8. [Testing](#testing)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### ✅ Already on VPS
- Docker & Docker Compose
- Nginx
- Certbot (Let's Encrypt)
- UFW Firewall
- Git

### ✅ Existing Services
- CFDS Financial System on port 3000
- PostgreSQL on port 5432

### 📦 What We'll Deploy
- **Koning Mexico Backend** on port 3001
- **Koning Mexico Frontend** on port 8080
- **SQLite Database** in Docker volume

---

## DNS Configuration

### Step 1: Point Domain to VPS

In your domain registrar (or Hetzner DNS):

```
Type: A
Name: @ (or koningmexico.nl)
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600

Type: A
Name: www
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600
```

**Wait 15-30 minutes for DNS propagation.**

Verify:
```bash
nslookup koningmexico.nl
```

---

## Prepare VPS

### Step 1: Connect to VPS

```bash
ssh cfdsadmin@YOUR_VPS_IP
# Or: ssh root@YOUR_VPS_IP
```

### Step 2: Create Application Directory

```bash
sudo mkdir -p /opt/koningmexico
sudo chown $USER:$USER /opt/koningmexico
```

### Step 3: Clone Repository

```bash
cd /opt/koningmexico
git clone https://github.com/yourusername/koningmexico.nl-website.git .

# Or if private repo:
git clone https://oauth2:YOUR_GITHUB_TOKEN@github.com/yourusername/koningmexico.nl-website.git .
```

---

## Deploy Application

### Step 1: Configure Environment

```bash
cd /opt/koningmexico

# Copy production environment template
cp .env.production .env

# Edit environment variables
nano .env
```

**Update these values:**

```bash
# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Set your domain
FRONTEND_URL=https://koningmexico.nl
CORS_ORIGIN=https://koningmexico.nl
```

**Complete `.env` file:**

```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
FRONTEND_URL=https://koningmexico.nl
CORS_ORIGIN=https://koningmexico.nl
DATABASE_PATH=/app/data/mexico.db
```

### Step 2: Build and Start Containers

```bash
cd /opt/koningmexico

# Build Docker images
docker compose -f docker-compose.mexico.yml build

# Start services
docker compose -f docker-compose.mexico.yml up -d

# Check status
docker compose -f docker-compose.mexico.yml ps
```

Expected output:
```
NAME                      STATUS          PORTS
mexico-backend-prod       Up (healthy)    127.0.0.1:3001->3001/tcp
mexico-frontend-prod      Up (healthy)    127.0.0.1:8080->8080/tcp
```

### Step 3: Verify Containers

```bash
# Check logs
docker compose -f docker-compose.mexico.yml logs

# Test backend health
curl http://localhost:3001/health

# Test frontend health
curl http://localhost:8080/health
```

---

## Configure Nginx

### Step 1: Copy Nginx Configuration

```bash
sudo cp /opt/koningmexico/nginx-vps.conf /etc/nginx/sites-available/koningmexico
```

### Step 2: Edit Configuration (Update Domain)

```bash
sudo nano /etc/nginx/sites-available/koningmexico
```

**Verify these lines have your domain:**
```nginx
server_name koningmexico.nl www.koningmexico.nl;
```

### Step 3: Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/koningmexico /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 4: Test HTTP Access

```bash
curl -I http://koningmexico.nl
```

Should return: `301 Moved Permanently` (redirect to HTTPS)

---

## SSL Certificate

### Step 1: Obtain Let's Encrypt Certificate

```bash
sudo certbot --nginx -d koningmexico.nl -d www.koningmexico.nl
```

**Follow prompts:**
1. Enter email address
2. Agree to Terms of Service
3. Choose: Redirect HTTP to HTTPS (Option 2)

### Step 2: Verify SSL

```bash
# Check certificate
sudo certbot certificates

# Test HTTPS
curl -I https://koningmexico.nl
```

### Step 3: Auto-Renewal Test

```bash
# Test renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

---

## Database Backups

### Step 1: Create Backup Script

```bash
sudo nano /opt/koningmexico/backup-db.sh
```

**Backup Script:**

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/opt/koningmexico/backups"
CONTAINER_NAME="mexico-backend-prod"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/mexico_backup_$TIMESTAMP.db"

# Copy SQLite database from container
docker cp "$CONTAINER_NAME:/app/data/mexico.db" "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created: ${BACKUP_FILE}.gz"

    # Delete old backups
    find "$BACKUP_DIR" -name "mexico_backup_*.db.gz" -mtime +$RETENTION_DAYS -delete
    echo "✅ Old backups cleaned (retention: $RETENTION_DAYS days)"
else
    echo "❌ Backup failed!"
    exit 1
fi
```

Make executable:
```bash
sudo chmod +x /opt/koningmexico/backup-db.sh
```

### Step 2: Schedule Daily Backups

```bash
# Edit crontab
crontab -e
```

Add daily backup at 3:00 AM:
```
0 3 * * * /opt/koningmexico/backup-db.sh >> /var/log/mexico-backup.log 2>&1
```

### Step 3: Test Backup

```bash
/opt/koningmexico/backup-db.sh
ls -lh /opt/koningmexico/backups/
```

---

## Testing

### Step 1: Verify Services

```bash
# Check all services on VPS
sudo systemctl status nginx
docker ps

# Check Koning Mexico containers
docker compose -f /opt/koningmexico/docker-compose.mexico.yml ps
```

### Step 2: Test Website

Open browser and visit:
- http://koningmexico.nl → Should redirect to HTTPS
- https://koningmexico.nl → Main website
- https://koningmexico.nl/spel_vs_computer.html → Game vs computer
- https://koningmexico.nl/multiplayer.html → Multiplayer (if exists)

### Step 3: Test Backend API

```bash
# Health check
curl https://koningmexico.nl/health

# API endpoint (should work after frontend connects)
curl https://koningmexico.nl/api/rooms
```

### Step 4: Test WebSocket

Open browser console on https://koningmexico.nl and run:
```javascript
const socket = io('https://koningmexico.nl');
socket.on('connect', () => console.log('✅ WebSocket connected!'));
```

---

## Monitoring

### Application Logs

```bash
# View live logs
docker compose -f /opt/koningmexico/docker-compose.mexico.yml logs -f

# View specific service
docker compose -f /opt/koningmexico/docker-compose.mexico.yml logs -f mexico-backend
docker compose -f /opt/koningmexico/docker-compose.mexico.yml logs -f mexico-frontend

# Nginx logs
sudo tail -f /var/log/nginx/koningmexico_access.log
sudo tail -f /var/log/nginx/koningmexico_error.log
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
df -h

# Check both applications
docker compose -f /opt/cfds/docker-compose.prod.yml ps
docker compose -f /opt/koningmexico/docker-compose.mexico.yml ps
```

### Health Check Script

Create monitoring script:

```bash
sudo nano /opt/koningmexico/health-check.sh
```

```bash
#!/bin/bash

HEALTH_URL="https://koningmexico.nl/health"

response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$response" -eq 200 ]; then
    echo "✅ Koning Mexico is healthy"
else
    echo "❌ Koning Mexico is down (HTTP $response)"
    # Optional: Restart containers
    # docker compose -f /opt/koningmexico/docker-compose.mexico.yml restart
fi
```

Make executable and schedule:
```bash
sudo chmod +x /opt/koningmexico/health-check.sh

# Add to crontab (every 5 minutes)
crontab -e
```

Add:
```
*/5 * * * * /opt/koningmexico/health-check.sh >> /var/log/mexico-health.log 2>&1
```

---

## Update Application

### Deploy New Version

```bash
cd /opt/koningmexico

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.mexico.yml down
docker compose -f docker-compose.mexico.yml build
docker compose -f docker-compose.mexico.yml up -d

# Check logs
docker compose -f docker-compose.mexico.yml logs -f
```

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
docker compose -f /opt/koningmexico/docker-compose.mexico.yml logs
```

**Common issues:**
1. Port conflict → Check if 3001/8080 already in use
2. Environment variables missing → Check `.env` file
3. Out of memory → Check `docker stats`

### Nginx 502 Bad Gateway

**Causes:**
1. Backend not running → Check `docker ps`
2. Wrong port in nginx config → Verify `proxy_pass` ports
3. Firewall blocking → Check UFW rules

**Fix:**
```bash
# Restart services
docker compose -f /opt/koningmexico/docker-compose.mexico.yml restart
sudo systemctl restart nginx
```

### WebSocket Connection Fails

**Check Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/koningmexico
```

Verify WebSocket headers:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

**Restart Nginx:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### DNS Not Resolving

```bash
# Check DNS
nslookup koningmexico.nl

# Flush DNS (local machine)
ipconfig /flushdns  # Windows
sudo systemd-resolve --flush-caches  # Linux
```

### SSL Certificate Issues

```bash
# Renew certificate manually
sudo certbot renew --force-renewal

# Check certificate
sudo certbot certificates

# Check Nginx SSL config
sudo nginx -t
```

### Port Conflicts

Check what's using ports:
```bash
sudo lsof -i :3001
sudo lsof -i :8080

# Check all services
sudo netstat -tulpn | grep LISTEN
```

---

## Resource Allocation

### Current VPS Usage

| Service | Port(s) | Memory | Notes |
|---------|---------|--------|-------|
| **CFDS Web** | 3000 | ~200MB | Next.js app |
| **CFDS DB** | 5432 | ~50MB | PostgreSQL |
| **Mexico Backend** | 3001 | ~100MB | Node.js/Socket.io |
| **Mexico Frontend** | 8080 | ~10MB | Nginx static |
| **Nginx** | 80, 443 | ~20MB | Reverse proxy |
| **Total** | | **~380MB** | |

**Hetzner VPS Recommendations:**
- **Minimum:** CX11 (2GB RAM, 1 vCPU) - Tight but works
- **Recommended:** CX21 (4GB RAM, 2 vCPU) - Comfortable
- **Optimal:** CX31 (8GB RAM, 2 vCPU) - Room to grow

---

## Security Checklist

- [ ] Firewall (UFW) configured for ports 80, 443, 22
- [ ] SSH key authentication enabled
- [ ] Strong JWT_SECRET generated
- [ ] SSL certificate installed and auto-renewing
- [ ] Nginx security headers configured
- [ ] Daily backups scheduled
- [ ] Health checks configured
- [ ] Services bound to localhost only (not 0.0.0.0)
- [ ] No sensitive data in Git repository
- [ ] `.env` file properly secured (not committed)

---

## Cost Breakdown

| Item | Cost (EUR/month) |
|------|------------------|
| **Hetzner CX21** | €6.35 |
| **Domain (.nl)** | ~€10/year (€0.83/month) |
| **Total** | **~€7.18/month** |

**Shared with CFDS:** Both applications run on same VPS, so no extra hosting cost!

---

## Support & References

- **Hetzner Cloud Console:** https://console.hetzner.cloud/
- **Let's Encrypt Docs:** https://letsencrypt.org/docs/
- **Docker Compose Docs:** https://docs.docker.com/compose/
- **Nginx Docs:** https://nginx.org/en/docs/

---

## Quick Commands Reference

```bash
# View all containers
docker ps -a

# Restart Koning Mexico
cd /opt/koningmexico
docker compose -f docker-compose.mexico.yml restart

# Restart CFDS
cd /opt/cfds
docker compose -f docker-compose.prod.yml restart

# View logs (follow)
docker compose -f docker-compose.mexico.yml logs -f

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check SSL certificates
sudo certbot certificates

# Manual backup
/opt/koningmexico/backup-db.sh

# Check disk space
df -h
docker system df
```

---

**🎲 Veel speelplezier met Koning Mexico!**

*Deployment guide specifically for Hetzner VPS running alongside CFDS Financial System.*
