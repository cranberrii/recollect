---
type: "Reference"
title: "Backend API & Services"
openwiki_generated: true
---

# Backend API & Services

## FastAPI Overview
- Main entry: `backend/app/main.py` (uvicorn)
- API endpoints: `backend/app/api.py`
- Models: `backend/app/models.py` (bookmark, category)
- Semantics: `backend/app/semantics.py`

## Key Features
- Bookmark CRUD
- Semantic embedding (OpenRouter via OpenAI API)
- Auto-categorization
- Summary generation
- Vector search (pgvector/Supabase)

## Config & Local Env
- Copy `.env.example` and fill values for DB URL, OpenRouter, etc.
- Backend expects DB and AI API keys

## Change Guidance
- Changing DB schema: Update `models.py` and Supabase migration
- Algorithm updates: Edit `semantics.py` for categorization/search
- API changes: Extend `api.py` and update OpenAPI docs

## References
- [Supabase/DB Setup](openwiki/supabase.md)
- [AI Integration](openwiki/ai.md)
