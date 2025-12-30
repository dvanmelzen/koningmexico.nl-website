# 🚀 Koning Mexico - Quick Deploy op Hetzner VPS

**Subdomein:** dev.koningmexico.nl
**VPS:** Hetzner (naast CFDS Financial System)

---

## 📋 Checklist

### 1. DNS Configuratie (5 minuten)

Bij je domain registrar (waar je koningmexico.nl hebt gekocht):

```
Type: A
Name: dev
Value: [JE_HETZNER_VPS_IP_ADRES]
TTL: 3600
```

**Voorbeeld:**
```
A    dev    95.217.123.45    3600
```

**Verificatie (na 15 minuten):**
```bash
nslookup dev.koningmexico.nl
# Moet je VPS IP returnen
```

---

### 2. VPS Voorbereiding (10 minuten)

```bash
# SSH naar VPS
ssh cfdsadmin@JE_VPS_IP

# Create directory
sudo mkdir -p /opt/koningmexico
sudo chown $USER:$USER /opt/koningmexico

# Clone repository
cd /opt/koningmexico
git clone https://github.com/jouw-username/koningmexico.nl-website.git .

# Of met SSH key:
git clone git@github.com:jouw-username/koningmexico.nl-website.git .
```

---

### 3. Configuratie (5 minuten)

```bash
cd /opt/koningmexico

# Kopieer environment template
cp .env.production .env

# Genereer JWT secret
openssl rand -base64 32

# Edit environment file
nano .env
```

**Plak in `.env`:**
```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=PLAK_HIER_DE_GEGENEREERDE_SECRET
FRONTEND_URL=https://dev.koningmexico.nl
CORS_ORIGIN=https://dev.koningmexico.nl
DATABASE_PATH=/app/data/mexico.db
```

**Save:** Ctrl+O, Enter, Ctrl+X

---

### 4. Docker Deployment (5 minuten)

```bash
cd /opt/koningmexico

# Build containers
docker compose -f docker-compose.mexico.yml build

# Start services
docker compose -f docker-compose.mexico.yml up -d

# Check status
docker compose -f docker-compose.mexico.yml ps

# View logs
docker compose -f docker-compose.mexico.yml logs -f
```

**Verwachte output:**
```
NAME                      STATUS          PORTS
mexico-backend-prod       Up (healthy)    127.0.0.1:3001->3001/tcp
mexico-frontend-prod      Up (healthy)    127.0.0.1:8080->8080/tcp
```

**Test lokaal:**
```bash
curl http://localhost:3001/api/health
curl http://localhost:8080/health
```

---

### 5. Nginx Configuratie (5 minuten)

```bash
# Kopieer config
sudo cp /opt/koningmexico/nginx-vps.conf /etc/nginx/sites-available/koningmexico

# Enable site
sudo ln -s /etc/nginx/sites-available/koningmexico /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

**Test HTTP:**
```bash
curl -I http://dev.koningmexico.nl
# Moet 301 redirect geven (naar HTTPS)
```

---

### 6. SSL Certificate (2 minuten)

```bash
sudo certbot --nginx -d dev.koningmexico.nl
```

**Prompts beantwoorden:**
1. Email adres: [jouw email]
2. Agree to Terms: (Y)es
3. Share email: (N)o
4. Redirect HTTP to HTTPS: 2 (Yes)

**Verificatie:**
```bash
sudo certbot certificates

# Test HTTPS
curl -I https://dev.koningmexico.nl
```

---

### 7. Testen (5 minuten)

**In browser, bezoek:**
- https://dev.koningmexico.nl → Hoofdpagina
- https://dev.koningmexico.nl/spel_vs_computer.html → Spel vs computer
- https://dev.koningmexico.nl/multiplayer.html → Multiplayer

**Test WebSocket (browser console):**
```javascript
const socket = io('https://dev.koningmexico.nl');
socket.on('connect', () => console.log('✅ Connected!'));
```

**Backend API test:**
```bash
# Health check
curl https://dev.koningmexico.nl/api/health

# Rooms list
curl https://dev.koningmexico.nl/api/rooms
```

---

## ✅ Deployment Complete!

Je applicatie draait nu op:
- **URL:** https://dev.koningmexico.nl
- **Backend:** Port 3001 (via Nginx)
- **Frontend:** Port 8080 (via Nginx)
- **Database:** SQLite in Docker volume

**Beide applicaties draaien:**
- CFDS: https://cfds.yourdomain.nl (port 3000)
- Mexico: https://dev.koningmexico.nl (port 3001/8080)

---

## 🔧 Handige Commando's

```bash
# View logs
docker compose -f /opt/koningmexico/docker-compose.mexico.yml logs -f

# Restart services
docker compose -f /opt/koningmexico/docker-compose.mexico.yml restart

# Stop services
docker compose -f /opt/koningmexico/docker-compose.mexico.yml down

# Check all containers
docker ps

# Check Nginx logs
sudo tail -f /var/log/nginx/koningmexico_dev_access.log
sudo tail -f /var/log/nginx/koningmexico_dev_error.log
```

---

## 🔄 Updates Deployen

```bash
cd /opt/koningmexico

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.mexico.yml down
docker compose -f docker-compose.mexico.yml build
docker compose -f docker-compose.mexico.yml up -d
```

---

## 📊 Resource Gebruik

**Na deployment:**
```bash
docker stats

# Je ziet nu:
# - cfds-web-prod: ~200MB
# - cfds-postgres-prod: ~50MB
# - mexico-backend-prod: ~100MB
# - mexico-frontend-prod: ~10MB
# Totaal: ~360MB (ruim binnen 4GB VPS)
```

---

## 🆘 Troubleshooting

### Containers starten niet
```bash
docker compose -f /opt/koningmexico/docker-compose.mexico.yml logs
```

### Nginx 502 error
```bash
# Check of containers draaien
docker ps

# Restart everything
docker compose -f /opt/koningmexico/docker-compose.mexico.yml restart
sudo systemctl restart nginx
```

### SSL certificate issues
```bash
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

### DNS werkt niet
```bash
nslookup dev.koningmexico.nl
# Als dit faalt: wacht nog 15 minuten, DNS propagatie duurt even
```

---

## 📱 Share met Vrienden

Na deployment kunnen vrienden meteen spelen op:
**https://dev.koningmexico.nl**

Geen installatie nodig, werkt op:
- Desktop (Chrome, Firefox, Safari, Edge)
- Mobiel (iOS Safari, Chrome Android)
- Tablet

---

**🎲 Veel plezier met Mexico!**

*Total deployment time: ~30-40 minuten*
