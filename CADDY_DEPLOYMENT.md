# Caddy + Koning Mexico Deployment Guide

**Setup:** Containerized deployment with Caddy reverse proxy
**Automatic HTTPS:** Yes (Let's Encrypt)
**VPS:** Hetzner

---

## 🎯 Architecture

```
Internet (port 80/443)
         ↓
    Caddy Container
    (Reverse Proxy + SSL)
         ↓
   ┌─────┴─────┐
   ↓           ↓
Backend     Frontend
(Node.js)   (Nginx)
```

**All in Docker containers. No services on host.**

---

## 🚀 Quick Deployment

### 1. SSH to VPS

```bash
ssh root@46.224.179.228
```

### 2. Clone/Pull Repository

```bash
cd /opt/koningmexico
git pull origin master  # If already cloned
# Or: git clone https://github.com/dvanmelzen/koningmexico.nl-website.git .
```

### 3. Configure Environment

```bash
# Edit .env if needed
nano .env

# Should contain:
# NODE_ENV=production
# PORT=3001
# JWT_SECRET=[your secret]
# FRONTEND_URL=https://dev.koningmexico.nl
# CORS_ORIGIN=https://dev.koningmexico.nl
```

### 4. Run Deployment Script

```bash
chmod +x deploy-caddy.sh
./deploy-caddy.sh
```

**That's it!** Your site will be live at https://dev.koningmexico.nl

---

## 📊 What Gets Deployed

| Container | Image | Purpose | Ports |
|-----------|-------|---------|-------|
| **caddy-proxy** | caddy:2-alpine | Reverse proxy + SSL | 80, 443 |
| **mexico-backend** | Custom (Node.js) | API + WebSocket | Internal only |
| **mexico-frontend** | Custom (Nginx) | Static files | Internal only |

---

## 🔐 SSL Certificates

Caddy automatically:
- ✅ Obtains Let's Encrypt certificates
- ✅ Renews before expiration
- ✅ Handles HTTP to HTTPS redirect
- ✅ Supports HTTP/3

**No manual certificate management needed!**

---

## 🌐 Adding More Domains

Edit `Caddyfile`:

```caddy
dev.koningmexico.nl {
    # ... existing config
}

# Add new domain
app.yourdomain.com {
    reverse_proxy your-app:8080
}
```

Then restart Caddy:
```bash
docker compose -f docker-compose.caddy.yml restart
```

---

## 📝 Common Commands

### View Logs

```bash
# All containers
docker compose -f docker-compose.caddy.yml logs -f
docker compose -f docker-compose.mexico.yml logs -f

# Specific container
docker logs -f caddy-proxy
docker logs -f mexico-backend
docker logs -f mexico-frontend
```

### Restart Services

```bash
# Restart Caddy only
docker compose -f docker-compose.caddy.yml restart

# Restart Mexico only
docker compose -f docker-compose.mexico.yml restart

# Restart everything
./deploy-caddy.sh
```

### Check Status

```bash
# Container status
docker ps

# Caddy admin API
curl http://localhost:2019/config/

# Check SSL certificate
curl -I https://dev.koningmexico.nl
```

### Update Application

```bash
cd /opt/koningmexico
git pull origin master
docker compose -f docker-compose.mexico.yml build
docker compose -f docker-compose.mexico.yml up -d
```

---

## 🔧 Troubleshooting

### Site not accessible

**Check containers:**
```bash
docker ps
# All should show "Up"
```

**Check Caddy logs:**
```bash
docker logs caddy-proxy
```

**Common issues:**
- DNS not pointing to VPS → Check `nslookup dev.koningmexico.nl`
- Firewall blocking ports → `ufw allow 80/tcp && ufw allow 443/tcp`
- Containers not in same network → Check `docker network ls`

### SSL certificate not working

Wait 1-2 minutes after deployment for Caddy to provision certificates.

**Check certificate status:**
```bash
docker exec caddy-proxy caddy list-certificates
```

**Force refresh:**
```bash
docker compose -f docker-compose.caddy.yml restart
```

### Backend/Frontend not responding

**Test internally:**
```bash
docker exec mexico-backend wget -O- http://localhost:3001/health
docker exec mexico-frontend wget -O- http://localhost:8080/health
```

**Rebuild containers:**
```bash
docker compose -f docker-compose.mexico.yml build --no-cache
docker compose -f docker-compose.mexico.yml up -d
```

---

## 🧹 Cleanup

### Stop everything

```bash
docker compose -f docker-compose.mexico.yml down
docker compose -f docker-compose.caddy.yml down
```

### Remove volumes (⚠️ deletes database!)

```bash
docker compose -f docker-compose.mexico.yml down -v
docker compose -f docker-compose.caddy.yml down -v
```

### Full cleanup

```bash
docker system prune -a
```

---

## 📊 Resource Usage

| Service | Memory | CPU | Storage |
|---------|--------|-----|---------|
| Caddy | ~10MB | Low | ~50MB (certificates) |
| Backend | ~100MB | Low-Med | ~10MB (SQLite) |
| Frontend | ~10MB | Low | ~5MB |
| **Total** | **~120MB** | **Low** | **~65MB** |

---

## 🔄 Backup

### Database Backup

```bash
# Backup SQLite database
docker cp mexico-backend:/app/data/mexico.db ./backups/mexico-$(date +%Y%m%d).db

# Compress
gzip ./backups/mexico-$(date +%Y%m%d).db
```

### Caddy Data Backup

```bash
# Backup SSL certificates and config
docker run --rm -v koningmexico_caddy_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/caddy-data.tar.gz /data
```

---

## 🚀 Performance Tips

1. **Enable HTTP/3**: Already enabled by default in Caddy
2. **Add Caching**: Edit Caddyfile to add cache headers
3. **Compress responses**: Caddy automatically gzips responses
4. **Monitor logs**: Use `docker logs` to watch for issues

---

## 📚 References

- **Caddy Docs**: https://caddyserver.com/docs/
- **Caddy Docker**: https://hub.docker.com/_/caddy
- **Let's Encrypt**: https://letsencrypt.org/

---

**🎲 Veel speelplezier met Koning Mexico!**

*Fully containerized, automatic HTTPS, zero manual configuration.*
