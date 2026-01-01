# Deployment & Verification Rules for Koning Mexico

**Last Updated:** 2026-01-01
**Purpose:** Prevent deployment mistakes and ensure thorough verification
**Auto-loaded by Claude Code**

---

## ⚠️ CRITICAL DEPLOYMENT RULES

### Rule 1: HTML/CSS/JS Changes ALWAYS Require Rebuild

**NEVER just restart containers for frontend changes!**

```bash
# ❌ WRONG - Only restarts, doesn't update files in container
docker compose -f docker-compose.mexico.yml restart mexico-frontend

# ✅ CORRECT - Rebuilds container with new files
docker compose -f docker-compose.mexico.yml down
docker compose -f docker-compose.mexico.yml build --no-cache mexico-frontend
docker compose -f docker-compose.mexico.yml up -d
```

**Why?** HTML/CSS/JS files are copied into the Docker image during build. A restart uses the old image with old files.

**When to rebuild:**
- ✅ Any change to .html files
- ✅ Any change to .js files
- ✅ Any change to .css files
- ✅ Any change to nginx.conf
- ✅ Any change to static assets

**When restart is sufficient:**
- ✅ Backend code changes (if using volume mounts)
- ✅ Environment variable changes (in docker-compose.yml)

---

## 📋 Mandatory Verification Checklist

After EVERY deployment, verify in this order:

### 1. Source Repository Check
```bash
# Verify file is correct in git repo
ssh root@46.224.179.228 "grep -n 'YOUR_CHANGE' /opt/koningmexico/YOUR_FILE"
```

### 2. Container File Check
```bash
# Verify file is correct INSIDE the container
ssh root@46.224.179.228 "docker exec mexico-frontend cat /usr/share/nginx/html/YOUR_FILE | grep 'YOUR_CHANGE'"
```

### 3. Served Content Check
```bash
# Verify what nginx actually serves
ssh root@46.224.179.228 "curl -s http://localhost:8080/YOUR_FILE | grep 'YOUR_CHANGE'"
```

### 4. Container Health Check
```bash
# Verify containers are healthy
ssh root@46.224.179.228 "docker compose -f /opt/koningmexico/docker-compose.mexico.yml ps"
```

### 5. Count Verification (for ID changes)
```bash
# Example: verify button only appears once
ssh root@46.224.179.228 "docker exec mexico-frontend grep -c 'id=\"someBtn\"' /usr/share/nginx/html/multiplayer.html"
```

---

## 🔍 Think Beyond the Immediate Problem

### Before Marking Complete:

1. **Check for duplicate IDs**
   - If you added an element with an ID, search for that ID in the entire file
   - Multiple elements with same ID will cause JavaScript bugs

2. **Check for orphaned event handlers**
   - If you removed a button, did you remove its event handler in JS?
   - Orphaned handlers waste memory and can cause errors

3. **Check for broken references**
   - If you renamed something, did you update all references?
   - Search the entire codebase for the old name

4. **Check responsive behavior**
   - If you changed layout, does it work on mobile?
   - Does it work in both light and dark mode?

5. **Check related functionality**
   - If you moved a button, does its click handler still work?
   - Are there any CSS rules that depend on the old location?

---

## 🚫 Never Blame Browser Cache

**Rules:**
- ❌ NEVER say "it's probably browser cache" without verifying server-side first
- ❌ NEVER assume the user hasn't done a hard refresh
- ✅ ALWAYS verify the container is serving the correct files before concluding it's cache
- ✅ ALWAYS assume the user is testing properly (multiple devices, incognito, hard refresh)

**Verification order:**
1. Check files in container
2. Check what nginx serves
3. Check container health
4. Only THEN consider client-side issues

---

## 📝 Standard Deployment Flow

```bash
# 1. Commit changes locally
cd /d/repos/koningmexico.nl-website
git add [files]
git commit -m "Clear description of changes"
git push origin master

# 2. Deploy to VPS with proper rebuild
ssh root@46.224.179.228 "cd /opt/koningmexico && \
  git pull origin master && \
  docker compose -f docker-compose.mexico.yml down && \
  docker compose -f docker-compose.mexico.yml build --no-cache mexico-frontend && \
  docker compose -f docker-compose.mexico.yml up -d"

# 3. Verify deployment (run ALL checks from checklist above)

# 4. Inform user with evidence of verification
```

---

## 🎯 Complete Verification Example

```bash
# After deploying a "Verlaten" button change:

# 1. Check in repo
ssh root@46.224.179.228 "grep -n 'Verlaten' /opt/koningmexico/multiplayer.html"
# Expected: 1 match at correct line

# 2. Check in container
ssh root@46.224.179.228 "docker exec mexico-frontend grep -n 'Verlaten' /usr/share/nginx/html/multiplayer.html"
# Expected: 1 match at correct line

# 3. Check what's served
ssh root@46.224.179.228 "curl -s http://localhost:8080/multiplayer.html | grep -c 'Verlaten'"
# Expected: 1

# 4. Check no duplicates
ssh root@46.224.179.228 "docker exec mexico-frontend grep -c 'id=\"leaveGameBtn\"' /usr/share/nginx/html/multiplayer.html"
# Expected: 1 (not 2!)

# 5. Check removed items are gone
ssh root@46.224.179.228 "docker exec mexico-frontend grep -i 'reset UI' /usr/share/nginx/html/multiplayer.html"
# Expected: exit code 1 (not found)

# 6. Check JS handlers
ssh root@46.224.179.228 "docker exec mexico-frontend grep 'leaveGameBtn' /usr/share/nginx/html/multiplayer.js"
# Expected: event handler present

ssh root@46.224.179.228 "docker exec mexico-frontend grep 'resetUIBtn' /usr/share/nginx/html/multiplayer.js"
# Expected: exit code 1 (not found)

# 7. Check container health
ssh root@46.224.179.228 "docker compose -f /opt/koningmexico/docker-compose.mexico.yml ps"
# Expected: All containers "healthy"
```

---

## 🛠️ Common Mistakes to Avoid

### Mistake 1: Partial Deployment
**Wrong:** Only rebuilding one container when changes affect multiple
**Right:** Rebuild all affected containers

### Mistake 2: Assuming Restart Works
**Wrong:** `docker compose restart` after HTML change
**Right:** `docker compose down && build && up` after HTML change

### Mistake 3: Not Verifying Inside Container
**Wrong:** Only checking files in repo
**Right:** Check repo, container, and served content

### Mistake 4: Single Point Verification
**Wrong:** Only checking if new element exists
**Right:** Check new element exists, old element gone, no duplicates, handlers updated

### Mistake 5: Incomplete Cleanup
**Wrong:** Adding new button but not removing old one
**Right:** Add new, remove old, verify both changes

---

## 🎓 Lessons Learned

### 2026-01-01: Button Reorganization Issue
**Problem:** Only did `restart` instead of `rebuild` for HTML changes
**Impact:** User saw old HTML with duplicate buttons
**Root Cause:** Docker images contain static files, restart doesn't update them
**Solution:** Always rebuild for frontend changes
**Prevention:** This rules file

---

## 🤖 Claude's Commitment

When deploying changes, I will:
1. ✅ Always rebuild containers for HTML/CSS/JS changes (not just restart)
2. ✅ Always run the complete verification checklist
3. ✅ Always check for side effects and related issues
4. ✅ Always verify both what exists AND what was removed
5. ✅ Never blame browser cache without server-side verification first
6. ✅ Always think beyond the immediate problem
7. ✅ Always provide evidence of successful verification to the user

---

*These rules are automatically loaded by Claude Code to prevent deployment mistakes and ensure thorough verification.*
