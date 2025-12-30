# 🌐 DNS Setup voor dev.koningmexico.nl

## Voor het Subdomein

Je hoeft **geen nieuw domein** te kopen! Je gebruikt een **subdomein** van koningmexico.nl.

---

## Stap 1: Waar heb je koningmexico.nl gekocht?

Ga naar de website waar je **koningmexico.nl** hebt geregistreerd:

- **TransIP.nl** → https://www.transip.nl/cp/
- **Versio.nl** → https://www.versio.nl/customer/
- **Hetzner** → https://dns.hetzner.com/
- **GoDaddy** → https://dcc.godaddy.com/control/dns
- **Namecheap** → https://ap.www.namecheap.com/domains/domaincontrolpanel/
- **Andere registrar** → Log in op hun control panel

---

## Stap 2: Zoek DNS Management

In je control panel, zoek naar:
- "DNS Instellingen"
- "DNS Management"
- "Nameservers / DNS"
- "Domain Management" → DNS

---

## Stap 3: Voeg A Record Toe

**Klik op "Add Record" of "Nieuw Record"**

Vul in:

```
Type:     A
Name:     dev
Value:    [JE_HETZNER_VPS_IP_ADRES]
TTL:      3600 (of laat op default)
```

### Voorbeelden per Provider

#### TransIP
```
Type:   A
Naam:   dev
Waarde: 95.217.123.45  (jouw VPS IP)
TTL:    3600
```

#### Hetzner DNS
```
Type:   A
Name:   dev
Value:  95.217.123.45
TTL:    3600
```

#### Andere Providers (Generic)
```
Host/Name:    dev
Type:         A
Points to:    95.217.123.45
TTL:          3600 (1 hour)
```

---

## Stap 4: Hoe kom je aan je VPS IP?

### In Hetzner Cloud Console:

1. Ga naar https://console.hetzner.cloud/
2. Klik op je VPS/Server
3. Kopieer het **IPv4 adres**

**Of via SSH:**
```bash
ssh cfdsadmin@YOUR_VPS_IP
curl ifconfig.me
```

---

## Stap 5: Verificatie

**Na 5-30 minuten** (DNS propagatie), test of het werkt:

### Windows Command Prompt
```cmd
nslookup dev.koningmexico.nl
```

**Verwachte output:**
```
Server:  dns.google
Address:  8.8.8.8

Name:    dev.koningmexico.nl
Address: 95.217.123.45  (jouw VPS IP)
```

### Online Check
- https://www.whatsmydns.net/#A/dev.koningmexico.nl
- Moet je VPS IP tonen (groen vinkje wereldwijd)

---

## Veelvoorkomende Problemen

### "DNS name does not exist"
- **Oorzaak:** Record is nog niet toegevoegd of DNS is nog aan het propageren
- **Oplossing:** Wacht nog 15 minuten, probeer opnieuw

### Record is toegevoegd maar werkt niet
- **Check spelling:** Moet exact `dev` zijn (geen `Dev` of `DEV`)
- **Check type:** Moet `A` record zijn (geen `CNAME`)
- **Check TTL:** 3600 is goed (1 uur)

### IP adres veranderd
```bash
# Update het A record met nieuwe IP
# In je DNS provider, wijzig de Value naar nieuwe IP
```

---

## Complete DNS Setup Overzicht

Na deze stap heb je:

```
koningmexico.nl          → (jouw website, later)
www.koningmexico.nl      → (jouw website, later)
dev.koningmexico.nl      → [VPS IP] ✅ Koning Mexico game
```

Andere subdomeinen die je kunt toevoegen:
```
test.koningmexico.nl     → Testomgeving
staging.koningmexico.nl  → Staging omgeving
api.koningmexico.nl      → API endpoint (als je later wilt scheiden)
```

---

## Volgende Stap

✅ DNS is klaar? Ga verder met deployment:

```bash
# Volg QUICK_DEPLOY.md vanaf stap 2
cat QUICK_DEPLOY.md
```

Of gebruik de complete guide:
```bash
cat DEPLOYMENT_HETZNER.md
```

---

## Screenshots Hulp

Kan je het niet vinden? Stuur me:
- De naam van je domain registrar (bijv. "TransIP")
- Screenshot van je control panel

Dan kan ik je exact vertellen waar je moet klikken!

---

**DNS propagatie duurt 5-30 minuten. Wees geduldig! ☕**
