# Admin Tools - Koning Mexico

Beheer tools voor de Koning Mexico multiplayer server.

## Wachtwoord Reset

### Gebruik

**Automatisch wachtwoord genereren:**
```bash
cd /opt/koningmexico/backend
node reset-password.js user@example.com
```

Output:
```
✅ Wachtwoord succesvol gereset!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Gebruiker: JanDoe
📧 Email: user@example.com
🔐 Nieuw wachtwoord: aB3$xY9zK2#m
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Geef dit wachtwoord aan de gebruiker via een veilig kanaal
⚠️  Verwijder dit wachtwoord uit je terminal history
⚠️  Gebruiker moet wachtwoord wijzigen bij eerste login
```

**Handmatig wachtwoord instellen:**
```bash
node reset-password.js user@example.com "NewPass123!"
```

### Wachtwoord Vereisten

Het nieuwe wachtwoord moet voldoen aan:
- ✅ Minimaal 8 karakters
- ✅ Minimaal 1 kleine letter
- ✅ Minimaal 1 hoofdletter
- ✅ Minimaal 1 cijfer
- ✅ Minimaal 1 speciaal teken (!@#$%.,)

### Veiligheid

- Wachtwoorden worden gehashed met bcrypt (10 salt rounds)
- Wachtwoorden worden NOOIT in platte tekst opgeslagen
- Tool vereist directe toegang tot de database
- Alleen voor admin gebruik

### Proces

1. Gebruiker neemt contact op: "Ik ben mijn wachtwoord vergeten"
2. Admin verifieert identiteit via alternatieve methode
3. Admin draait reset script op server
4. Admin stuurt nieuw wachtwoord via veilig kanaal (WhatsApp/Signal/etc)
5. Gebruiker logt in en wijzigt wachtwoord

### Troubleshooting

**Gebruiker niet gevonden:**
```bash
❌ Gebruiker met email "wrong@example.com" niet gevonden
```
→ Check spelfouten in email adres

**Wachtwoord te zwak:**
```bash
❌ Wachtwoord moet minimaal 8 karakters zijn
```
→ Gebruik automatische generatie of voldoe aan vereisten

### Terminal History Opschonen

**Linux/Mac (Bash):**
```bash
history -d $(history | tail -n 2 | head -n 1 | awk '{print $1}')
```

**Windows (PowerShell):**
```powershell
Clear-History
```

---

## Andere Admin Functies

### Database Backup

```bash
cd /opt/koningmexico
docker cp mexico-backend:/app/data/mexico.db ./backups/mexico-$(date +%Y%m%d).db
gzip ./backups/mexico-$(date +%Y%m%d).db
```

### Database Restore

```bash
docker cp ./backups/mexico-20251230.db mexico-backend:/app/data/mexico.db
docker restart mexico-backend
```

### Logs Bekijken

```bash
# Backend logs
docker logs -f mexico-backend

# Frontend logs
docker logs -f mexico-frontend

# Caddy logs
journalctl -u caddy -f
```

### Container Status

```bash
docker ps
docker stats mexico-backend mexico-frontend
```

---

**Vragen?** Neem contact op met de systeembeheerder.
