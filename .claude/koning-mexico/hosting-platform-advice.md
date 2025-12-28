# Hosting Platform Advies voor Daniël

**Last Updated:** 2025-12-28
**Context:** DevOps learning path voor ervaren systeembeheerder

---

## Profiel

- **Ervaring:** 15+ jaar systeembeheerder
- **Specialisaties:**
  - Informatiebeveiliging
  - Intune/Autopilot (Microsoft ecosysteem)
  - PowerShell scripting/automation
- **Huidige fase:** Transitie naar DevOps Engineer
- **Achtergrond:** Gewend aan enterprise tooling, diepgaande configuratie, security mindset

---

## Platform Advies: **Fly.io**

### Waarom Fly.io voor dit profiel?

#### 1. **Past bij technische diepgang**
- Volledige infrastructuur-controle (vergelijkbaar met PowerShell/Intune ervaring)
- Leert echte DevOps concepten: VMs, networking, global distribution, load balancing
- Complexiteit is geen probleem voor iemand met 15+ jaar ervaring
- CLI-first approach (voelt vertrouwd voor PowerShell gebruikers)

#### 2. **Security & Compliance mindset**
- Transparantie en controle over infrastructuur
- Uitgebreide security documentatie
- Network policies, firewalls, isolatie zelf configureerbaar
- Static IP's, private networking, secrets management zijn first-class
- **GDPR compliant** met Data Processing Agreement (DPA) beschikbaar

#### 3. **Leercurve = leerkansen**
- "Steilere leercurve" is investment in echte DevOps kennis
- Concepten zijn toepasbaar op AWS, Azure, GCP
- Voor carrièrepad (systeembeheer → DevOps) is diepgang waardevol
- Railway abstraheert te veel weg - minder leerwaarde

#### 4. **Enterprise-ready features**
- Multi-region deployments (zoals Azure regions)
- Private networking tussen services
- Managed Postgres met HA/backups
- Metrics en logging integraties

---

## Europese Regio's (GDPR)

Fly.io heeft **5 actieve Gateway regio's** in Europa:

| Code | Locatie | Status |
|------|---------|--------|
| **ams** | Amsterdam, Nederland | ✅ Gateway |
| **arn** | Stockholm, Zweden | ✅ Gateway |
| **cdg** | Parijs, Frankrijk | ✅ Gateway |
| **fra** | Frankfurt, Duitsland | ✅ Gateway |
| **lhr** | Londen, Verenigd Koninkrijk | ✅ Gateway |

### GDPR Compliance
- ✅ Data Processing Agreement (DPA) beschikbaar
- ✅ Gecertificeerd onder EU-U.S. Data Privacy Framework
- ✅ Apps en databases volledig in Europa hostbaar
- ⚠️ Fly.io is Amerikaans bedrijf - expliciet DPA aanvragen voor compliance
- Contact: `compliance@fly.io`

### Praktisch gebruik:
```bash
# Deploy naar specifieke EU regio
fly deploy --region ams

# Multi-region binnen Europa (High Availability)
fly regions add ams fra cdg
fly deploy
```

---

## Alternatieven (Afgewezen)

### Railway.io
- ❌ **Te simpel** - abstraheert te veel weg voor leerdoelen
- ❌ **Beperkte controle** - frustrerend voor ervaren sysadmin
- ❌ **Minder overdraagbare kennis** - Railway-specifieke concepten
- ❌ **Beperkte security configuratie** - minder diepgang dan gewenst
- ✅ **Wel goed voor:** Snelle prototypes zonder leerdoel

### Scaleway (Frans, EU-native)
- ✅ **Europees bedrijf** - GDPR "by default"
- ✅ **Serverless Containers** - vergelijkbaar met Fly.io
- ❌ **Kleinere community** - minder tutorials/resources
- ❌ **Minder datacenters** dan Fly.io
- ❌ **Minder mature** platform
- **Advies:** Overweeg later als EU-sovereignty kritiek is

### Hetzner (Duits)
- ✅ **Zeer goedkoop** - beste prijs/prestatie
- ✅ **EU compliance**
- ❌ **Geen PaaS** - alleen VPS/bare metal
- ❌ **Te basic** voor DevOps learning
- ❌ Leert oude patterns in plaats van moderne DevOps
- **Advies:** Niet geschikt voor DevOps learning path

### Northflank (UK)
- ✅ **BYOC** (Bring Your Own Cloud) model
- ✅ **Full control** over compliance
- ❌ **Te complex** voor beginnen met DevOps
- ❌ **Duurder** - cloud kosten + Northflank
- **Advies:** Overkill, meer voor enterprise

---

## Praktisch Stappenplan

### Week 1-2: Basis
```bash
# Installeer Fly CLI (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Deploy eerste app (Node.js, .NET, of andere stack)
fly launch
fly status
fly logs
```

### Week 3-4: Dieper duiken
- Multi-region deployment opzetten (ams, fra, cdg)
- Database koppelen (Managed Postgres)
- Secrets management configureren
- Monitoring/alerting instellen

### Maand 2+: Geavanceerd
- Private networking tussen services
- CI/CD pipeline via GitHub Actions
- Infrastructure as Code (Terraform)
- Security hardening (network policies, WAF)

---

## Fly.io vs Azure (Bekende concepten)

| Azure Concept | Fly.io Equivalent |
|---------------|-------------------|
| Resource Groups | Fly Apps |
| VM Scale Sets | Fly Machines scaling |
| Azure Regions | Fly Regions |
| VNet | Fly Private Network |
| Key Vault | Fly Secrets |
| Application Insights | Fly Metrics + Grafana |

---

## Pricing Model (2025)

Fly.io gebruikt **pay-as-you-go** sinds oktober 2024:

- **Compute:** ~$0.0027/uur voor 256MB instance ($1.94/maand continuous)
- **Storage:** $0.15/GB/maand (persistent volumes)
- **Bandwidth:** $0.02/GB (Noord-Amerika/Europa), inbound gratis
- **Managed Postgres:** vanaf $38/maand (Basic, 1GB)
- **Tip:** Facturen onder $5 worden vaak kwijtgescholden

---

## CLI Cheat Sheet (PowerShell-friendly)

```bash
# Basis commands
fly auth login                    # Authenticatie
fly launch                        # Nieuwe app deployen
fly deploy                        # App updaten
fly status                        # Status checken
fly logs                          # Logs bekijken (live)

# Regio management
fly platform regions              # Toon beschikbare regio's
fly regions add ams fra           # Voeg regio's toe
fly regions list                  # Toon actieve regio's

# Scaling
fly scale count 3                 # Schaal naar 3 instances
fly scale memory 512              # Schaal memory

# Database
fly postgres create               # Nieuwe Postgres database
fly postgres connect              # Verbind met database

# SSH/Debugging
fly ssh console                   # SSH naar VM
fly ssh sftp shell                # SFTP sessie

# Secrets management
fly secrets set KEY=value         # Secret toevoegen
fly secrets list                  # Secrets bekijken
```

---

## Security Best Practices

1. **Deploy alleen in EU regio's** (voor GDPR compliance)
   ```bash
   fly regions add ams fra cdg
   fly regions remove iad dfw  # Verwijder US regio's
   ```

2. **Vraag DPA aan** bij Fly.io (compliance@fly.io)

3. **Gebruik Fly Secrets** voor credentials (nooit in code)
   ```bash
   fly secrets set DB_PASSWORD=xxx
   ```

4. **Private networking** voor services onderling
   ```bash
   fly wireguard create  # Private network opzetten
   ```

5. **Monitoring & Alerting** instellen
   - Integreer met Grafana/Prometheus
   - Set up health checks

---

## Wanneer Overstappen naar Scaleway?

Overweeg Scaleway (Frans alternatief) als:
- ✅ Werkgever **EU-sovereignty** vereist
- ✅ **Geen data** naar VS mag (zelfs met DPA)
- ✅ **Compliance** belangrijker dan features/community
- ✅ Je de basis van DevOps onder de knie hebt (Fly.io kennis is overdraagbaar)

---

## Resources

### Officiële Documentatie
- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Regions](https://fly.io/docs/reference/regions/)
- [Fly.io Pricing](https://fly.io/pricing/)
- [GDPR Compliance](https://fly.io/documents)

### Community
- [Fly.io Community Forum](https://community.fly.io/)
- [Fly.io Discord](https://fly.io/discord)

### Comparison Resources
- [Railway vs Fly.io](https://docs.railway.com/maturity/compare-to-fly)
- [Fly.io vs Scaleway](https://getdeploying.com/flyio-vs-scaleway)

---

## Next Steps

1. **Installeer Fly CLI** op je werkstation
2. **Deploy eerste test-app** (bijv. simpele Node.js/Python app)
3. **Experimenteer met EU regio's** (ams, fra, cdg)
4. **Vraag DPA aan** voor GDPR compliance
5. **Bouw kennis op** richting productie-ready deployments

---

## Contact & Support

- **Fly.io Support:** community forum of Discord
- **Compliance vragen:** compliance@fly.io
- **Pricing calculator:** https://fly.io/calculator

---

*Dit advies is specifiek voor Daniël's profiel: ervaren systeembeheerder (15+ jaar) met infosec/PowerShell achtergrond die DevOps leert. Voor andere profielen kunnen andere platforms beter passen.*
