# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Recollect is an AI-powered bookmark manager with semantic search, summarization, and categorization. It's a monorepo with three main components:

- **apps/web**: Next.js 14 frontend (App Router, Tailwind CSS, TypeScript, Lucide icons)
- **apps/extension**: Chrome extension (Manifest V3, Vite, React, @crxjs/vite-plugin)
- **backend**: FastAPI Python 3.12 backend (managed with `uv`)

## Development Commands

```bash
# Install dependencies
npm install                    # Root monorepo
cd backend && uv pip install -e ".[dev]"  # Python backend

# Run all services via Turbo
npm run dev

# Run services individually
npm run dev:web               # Next.js on http://localhost:3000
npm run dev:backend           # FastAPI on http://localhost:8000
npm run dev:extension         # Vite watch, load from apps/extension/dist

# Backend alternative (from backend/)
uv run uvicorn app.main:app --reload

# Build
npm run build                 # All
npm run build:web
npm run build:extension

# Backend tests (from backend/)
pytest tests/ -v
pytest tests/test_bookmarks.py -v   # Single file

# Linting
npm run lint                  # Turbo runs all linters
ruff check app/               # Python only (from backend/)
```

## Architecture

### Data Flow
1. Extension/web captures URL → POST to `/api/v1/bookmarks`
2. Backend scrapes URL (title, description, content, favicon)
3. Embedding generated via OpenRouter (configurable model, 1536 dims)
4. AI categorizes content and generates summary (configurable LLM model)
5. Data stored in Supabase PostgreSQL with pgvector
6. Search via `/api/v1/search` supports three modes: semantic, keyword (category-based), and hybrid (RRF fusion)

### Key Backend Services
- `backend/app/services/scraper.py`: URL content extraction (50KB limit, 10s timeout)
- `backend/app/services/embedding.py`: Vector embedding generation (32K char limit)
- `backend/app/services/llm_ai.py`: Category generation and summarization
- `backend/app/services/search.py`: Hybrid search combining semantic + keyword modes
- `backend/app/core/deps.py`: Auth dependency injection (JWT via Supabase)
- `backend/app/core/config.py`: Settings via pydantic-settings (env vars)

### API Routes (registered in `backend/app/main.py`)
- `backend/app/api/v1/bookmarks.py` → `/api/v1/bookmarks` (CRUD)
- `backend/app/api/v1/search.py` → `/api/v1/search` (hybrid/semantic/keyword)
- `GET /health` — health check

### Database
- PostgreSQL with pgvector extension for semantic search
- Row-Level Security: all tables enforce `auth.uid() = user_id`
- HNSW index on embeddings for efficient nearest-neighbor search
- RPC functions:
  - `search_bookmarks()`: vector similarity queries (cosine distance)
  - `hybrid_search_bookmarks()`: combined semantic + category search using Reciprocal Rank Fusion
  - `search_by_categories()`: category-only keyword search

### Auth Pattern
```python
# Backend: JWT token from Supabase Auth
@router.get("/bookmarks")
async def list(user_id: CurrentUserId, supabase: SupabaseClient):
    # user_id extracted from Authorization: Bearer {token}
```

```typescript
// Frontend: Supabase client handles auth
const { data: { session } } = await supabase.auth.getSession();
fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` }});
```

## Environment Variables

### Backend (`backend/.env`)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: Supabase connection
- `OPENROUTER_API_KEY`: For embeddings and LLM calls
- `OPENROUTER_BASE_URL`: API base URL (default: `https://openrouter.ai/api/v1`)
- `EMBEDDING_MODEL`: Embedding model (default: `openai/text-embedding-3-small`)
- `LLM_MODEL`: LLM model (default: `openai/gpt-4o-mini`)
- `CORS_ORIGINS`: Allowed origins (default: `["http://localhost:3000"]`)

### Frontend (`apps/web/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase connection
- `NEXT_PUBLIC_API_URL`: Backend API URL

### Extension (`apps/extension/.env`)
- `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: Extension config

## Code Patterns

### Adding API Endpoints
```python
# backend/app/api/v1/your_feature.py
router = APIRouter()

@router.get("")
async def list_items(user_id: CurrentUserId, supabase: SupabaseClient):
    return supabase.table("items").select("*").eq("user_id", user_id).execute().data

# Register in backend/app/main.py
app.include_router(your_feature.router, prefix="/api/v1/your_feature")
```

### Frontend Components
- Pages: `apps/web/app/` — routes include `/`, `/login`, `/dashboard`, `/auth/callback`
- Client components use `'use client'` directive
- Component directories: `components/auth/`, `components/bookmarks/`, `components/dashboard/`
- Supabase clients: `@/lib/supabase/client` (browser), `@/lib/supabase/server` (SSR), `@/lib/supabase/middleware` (middleware)

## Database Migrations

```bash
supabase db push     # Apply migrations from supabase/migrations/
supabase db pull     # Pull remote schema changes
```

Key tables: `bookmarks`, `bookmark_embeddings`, `categories`, `bookmark_categories`, `archived_content`

## Docker

- `backend/Dockerfile`: Python 3.12-slim, uses `uv`, exposes `$PORT` (default 8000)
- `apps/web/Dockerfile`: Node 20-alpine, multi-stage build with `output: 'standalone'`, exposes 3000
