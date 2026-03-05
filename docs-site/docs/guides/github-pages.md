---
sidebar_position: 3
title: Deploy to GitHub Pages
---

# Deploy to GitHub Pages

Step-by-step guide to deploy the GetThatQuick documentation site to GitHub Pages.

---

## Prerequisites

The docs site lives in the `docs-site/` directory and is built with Docusaurus. The `docusaurus.config.ts` is already configured with:

```ts
url: "https://gurkirat-singh-bit.github.io",
baseUrl: "/Get-that-quick/",
organizationName: "Gurkirat-Singh-bit",
projectName: "Get-that-quick",
```

---

## Method 1: GitHub Actions (Recommended)

Create the workflow file at `.github/workflows/deploy-docs.yml`:

```yaml
name: Deploy Docs to GitHub Pages

on:
  push:
    branches:
      - main
    paths:
      - "docs-site/**"

permissions:
  pages: write
  id-token: write
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: cd docs-site && bun install

      - name: Build
        run: cd docs-site && bun run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs-site/build

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

This workflow:

1. Triggers on pushes to `main` that modify files in `docs-site/**`
2. Installs dependencies and builds the Docusaurus site
3. Uploads the `docs-site/build` directory as a Pages artifact
4. Deploys to GitHub Pages

---

## Method 2: Manual Deploy

### Option A: Using `bun run deploy`

```bash
cd docs-site
bun install
bun run build
GIT_USER=<your-github-username> bun run deploy
```

This uses Docusaurus's built-in deploy command which pushes to the `gh-pages` branch.

### Option B: Manual branch push

```bash
cd docs-site
bun install
bun run build
# Manually push docs-site/build contents to the gh-pages branch
```

---

## GitHub Settings

### For Method 1 (GitHub Actions)

1. Go to your repository on GitHub
2. Navigate to **Settings → Pages**
3. Under **Source**, select **GitHub Actions**

### For Method 2 (Manual Deploy)

1. Go to your repository on GitHub
2. Navigate to **Settings → Pages**
3. Under **Source**, select **Deploy from a branch**
4. Set branch to `gh-pages` and folder to `/ (root)`

---

## Access the Docs

Once deployed, the documentation site is available at:

**https://gurkirat-singh-bit.github.io/Get-that-quick/**
