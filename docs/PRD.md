
---

# 📄 PRD — Self-Hosted Prompt Toolkit

## 🧩 Product Overview

A self-hosted prompt toolkit/workbench that runs locally in a Docker container and is accessed through the browser.
The tool converts spoken input into structured prompts using selectable templates and provides a clean system to store, manage, and update prompts.

It is designed as a **personal, local-first productivity tool**, not a SaaS platform.

---

## 🎯 Vision

Create a fast, lightweight, self-hosted prompt workbench that lets users:

* speak naturally
* instantly generate structured prompts
* manage reusable prompt templates
* stay fully local and containerized
* run the tool on Windows, macOS, and Linux

The experience should feel immediate, simple, and reliable for daily use.

---

## 🚨 Core Problem

Power users and developers face friction when working with prompts:

* thinking is faster than typing
* raw speech transcripts are messy
* prompt formatting is repetitive
* reusable prompt organization is weak
* most tools are cloud-dependent
* local/self-hosted options are poor

Users need a **fast local pipeline from voice → clean prompt → reusable template**.

---

## ✅ Primary Goals (Checklist)

* [ ] Fully self-hosted and Docker-runnable
* [ ] Accessible entirely from the browser UI
* [ ] Speech-to-text runs locally using Vosk (no cloud STT)
* [ ] Convert transcript into structured prompt via selected template
* [ ] Simple prompt management (create, edit, delete, organize)
* [ ] Support both local prompts and community prompts
* [ ] One-click import and export of prompts
* [ ] Simple backup capability
* [ ] Community prompts can be updated from remote repository
* [ ] Optional Google Drive / OneDrive sync support
* [ ] Works cross-platform (Windows, macOS, Linux)
* [ ] Minimal setup — run container and open browser

---

## 🔥 Core Features

### 1. Speech to Text (Local)

* Uses **Vosk via JavaScript/WASM or Node binding**
* Fully local processing
* No external speech APIs
* Push-to-talk recording UX
* Produces clean transcript for prompt pipeline

**Purpose:** fast local voice input without cloud dependency.

---

### 2. Prompt Generation via Templates

After transcription:

```
speech → transcript → template applied → final prompt
```

Requirements:

* user selects template
* variables injected into template
* deterministic output
* fast response after transcript

This is the main productivity multiplier.

---

### 3. Prompt Management

System must support two prompt types.

#### Local Prompts (User-Owned)

* created and edited by user
* fully customizable
* stored locally
* never auto-overwritten
* used for personal workflows

#### Community Prompts (Remote-Driven)

* pulled from maintained repository
* versioned
* updateable
* read-only by default
* user can duplicate to local to modify

---

### 4. Import / Export / Backup

Users must be able to:

* import prompt files (.md or .prompt)
* export individual prompts
* export all prompts
* perform simple backup

Goal: zero friction portability.

---

### 5. Community Prompt Updates

Inspired by tools like Nuclei.

Behavior:

* user clicks update
* system fetches remote repository index
* compares versions
* downloads new or updated prompts
* refreshes available community prompts

Must be simple and reliable.

---

### 6. Cloud Sync (Optional but In Scope)

Support manual sync with:

* Google Drive
* OneDrive

Use cases:

* backup prompts
* restore prompts
* move between machines

Not required to block initial release but part of planned capability.

---

## 🧠 Technical Direction (High Level)

* Frontend: React + TypeScript + Vite
* Runtime: Bun/Node environment
* STT: Vosk (local)
* UI accessed via browser
* Packaged and runnable in Docker
* Single unified application (no separate backend service)

---

## 🧭 Cross-Platform Requirement

The containerized app must run correctly on:

* Windows (Docker Desktop)
* macOS
* Linux

File handling and paths must be implemented in a cross-platform safe way.

---

## 🧪 Success Criteria

The product is successful when a user can:

1. Run the container
2. Open the browser UI
3. Press record and speak
4. Instantly get a structured prompt
5. Save and reuse prompts
6. Update community prompts
7. Import/export without friction

If this loop feels fast and reliable, the product succeeds.

---
