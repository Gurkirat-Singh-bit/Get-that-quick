---
sidebar_position: 3
title: Changelog
---

# Changelog

This docs site should carry the release record, not just the repository.

## v1.1.1

Release date: April 25, 2026

- Redesigned the docs landing page into a minimal, card-based layout matching the docs style
- Added OS tab switcher (Linux/macOS and Windows) to the Quick Install section
- Fixed code block text visibility in dark mode (bright white text on dark background)
- Added custom scrollbar styling across the site
- Replaced the GitHub navbar text link with a clean icon
- Cleaned up the light/dark mode toggle (borderless, minimal)
- Fixed the navbar logo to use the transparent asset as-is
- Centered the footer content and links
- Replaced the ASCII architecture diagram with a cleaner version
- Removed em dashes from UI text for cleaner readability
- Added Prism syntax highlighting overrides for better code contrast

## v1.1.0

Release date: April 22, 2026

- Added release automation with Release Please
- Added a dedicated container workflow for build and publish
- Unified app, server, and docs around one visible project version
- Added version display in the app shell and docs UI
- Upgraded the docs landing page into a single product-style overview page
- Added this changelog page for public release history
- Removed raw HTML rendering from assistant markdown to reduce XSS risk
- Updated direct shipped dependencies including `hono`, `vite`, and Docusaurus packages

## v1.0.0

Stable baseline before the current release work.

- Core Bun + Hono backend
- React client
- Template system
- Speech-to-text support
- Docs site
