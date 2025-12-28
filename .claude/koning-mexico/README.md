# Koning Mexico Context Documentation

This directory contains comprehensive documentation about the **Koning Mexico** project for quick context loading in new Claude Code sessions.

## Purpose

When you start a new Claude Code session and want to work on Koning Mexico, simply say:

> "Read the .claude/koning-mexico/ documentation"

Claude will then have full context about the project without you needing to explain everything again.

---

## Documentation Files

### Core Documentation

1. **[project-overview.md](project-overview.md)** - High-level overview
   - What is Koning Mexico?
   - Core features
   - Project goals
   - Current status

2. **[architecture.md](architecture.md)** - Technical architecture
   - Game engine design
   - AI psychology system
   - Technology stack
   - Data flow

3. **[directory-structure.md](directory-structure.md)** - File organization
   - Complete directory tree
   - Key files explained
   - Asset management
   - Documentation structure

4. **[key-features.md](key-features.md)** - Feature reference
   - Game modes (Solo, vs AI)
   - AI psychology principles
   - Interactive features
   - Easter eggs

5. **[development-notes.md](development-notes.md)** - Developer guide
   - Local development setup
   - Common workflows
   - Testing guidelines
   - Deployment process

6. **[hosting-platform-advice.md](hosting-platform-advice.md)** - Platform selection guide
   - DevOps learning path recommendations
   - Fly.io vs Railway vs European alternatives
   - GDPR compliance considerations
   - Security best practices

---

## Project Quick Facts

**Project Name:** Koning Mexico (Mexico Dobbelspel)
**Type:** Interactive dice game website
**Status:** ✅ Production (Live on GitHub Pages)
**Version:** 2.0 (Complete Platform)
**Repository:** github.com/dvanmelzen/koningmexico.nl-website
**Last Updated:** December 2025

### Technology Stack
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
- **Deployment:** GitHub Pages
- **Build:** No build step (static site)
- **Zero dependencies:** Pure performance

### What's Included
- 🏠 Landing page with game introduction
- 📖 Complete digital rulebook
- 🎲 Solo practice mode (1 player)
- 🤖 AI opponent mode (1v1 with psychological AI)
- 🧠 AI psychology technical documentation

---

## Usage in Claude Code

### Starting a New Session

```
You: "Read .claude/koning-mexico/ documentation"

Claude: [Reads all 6 documentation files]
Claude: "I now have full context on the Koning Mexico project..."
```

### Quick Reference

```
You: "What AI psychology principles are implemented?"

Claude: "8 principles from behavioral economics:
         1. Loss Aversion
         2. Risk Tolerance Variance
         3. Overconfidence Bias
         ..."
```

### Working on Features

```
You: "I want to add a new game mode"

Claude: [Already has context from .claude/koning-mexico/]
Claude: "Let me help. The game engine is in game_vs_computer.js.
         Current architecture shows... [details]"
```

---

## Quick Links

**Project Documentation:**
- [Main README](../../README.md)
- [Product Requirements Document](../../PRD.md)
- [Spelregels](../../SPELREGELS.md)
- [AI Psychology](../../AI_PSYCHOLOGY.md)
- [Test Plan](../../TESTPLAN.md)

**Code Files:**
- [Landing Page](../../index.html)
- [Spelregels Page](../../spelregels.html)
- [Solo Mode](../../spel.html)
- [vs Computer Mode](../../spel_vs_computer.html)
- [AI Psychology Page](../../ai_psychology.html)

**Scripts:**
- [Landing Page JS](../../script.js)
- [Solo Game Engine](../../game.js)
- [AI Engine](../../game_vs_computer.js)

**Context Docs:**
- [Project Overview](project-overview.md)
- [Architecture](architecture.md)
- [Directory Structure](directory-structure.md)
- [Key Features](key-features.md)
- [Development Notes](development-notes.md)
- [Hosting Platform Advice](hosting-platform-advice.md)

---

## Maintenance

### When to Update

Update these docs when:
- ✅ New features added
- ✅ Game rules change
- ✅ AI psychology modified
- ✅ File structure changes
- ✅ Major refactoring

### How to Update

1. **Manual edits**: Edit .md files directly
2. **Regeneration**: Ask Claude to regenerate if structure changed
3. **Review**: Always review auto-generated changes
4. **Commit**: Commit changes to version control

---

## File Sizes

Current documentation size:
- `project-overview.md`: ~15 KB
- `architecture.md`: ~30 KB
- `directory-structure.md`: ~18 KB
- `key-features.md`: ~25 KB
- `development-notes.md`: ~20 KB
- `hosting-platform-advice.md`: ~12 KB
- **Total**: ~120 KB

This is negligible storage and easily fits in Claude's context window.

---

**Last Updated:** 2025-12-28
**Version:** 1.0
**Maintained By:** Daniel van Melzen

*This documentation system enables persistent context across Claude Code sessions!*
