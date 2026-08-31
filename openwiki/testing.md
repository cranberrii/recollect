---
type: "Reference"
title: "Testing & CI"
openwiki_generated: true
---

# Testing & CI

## Backend
- Python tests: `backend/tests/`
- Run: `cd backend && pytest tests/`
- Lint: `ruff check app/`

## Frontend
- Run: `npm run lint:web` for web

## Extension
- No formal test suite—manual QA or add tests in `apps/extension/tests/`

## CI
- Not explicitly documented here; verify workflows in root or GitHub Actions

## Change Guidance
- Add tests before changing semantics, search, or DB logic
- Test extension capture and web flows manually
