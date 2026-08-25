# Architecture & Data Flow

## Main Components
- **Frontend (apps/web):** Next.js (App Router), serves web UI for bookmarks, semantic search, summaries, categories.
- **Extension (apps/extension):** Chrome extension for bookmark capture, sharing state with web.
- **Backend (backend):** FastAPI Python API, handles bookmark CRUD, categorization, summarization, embedding, search. Integrates with Supabase and OpenRouter.
- **Database (supabase):** PostgreSQL+pgvector, stores bookmarks, embeddings, categories. Managed via Supabase migrations.

## Data Flow Overview
1. **Capture:** Extension saves bookmark via backend API, or web UI creates bookmark.
2. **Storage:** Backend writes to Supabase (PostgreSQL).
3. **Embedding:** Backend calls OpenRouter API for semantic embeddings & summaries.
4. **Categorize:** Backend auto-categorizes with embedding-based logic.
5. **Search:** Frontend queries backend for bookmarks, powered by vector search.

## Service Interactions
- **Web/Extension → Backend:** REST API (bookmark CRUD, search, summary/categorize)
- **Backend → Supabase:** ORM/direct pgvector for storage and search
- **Backend → OpenRouter:** Embedding and summarization through OpenAI-compatible endpoint

## Source Highlights
- `apps/web/app/`: Next.js pages/routes
- `apps/extension/src/`: Chrome extension react code
- `backend/app/main.py`: FastAPI entrypoint
- `backend/app/api.py`: API endpoints
- `backend/app/semantics.py`: Embedding, categorization logic
- `supabase/`: Database config/migrations

## Change Guidance
- Changing data models: Update backend/app/models.py and supabase migrations
- Adding features: Update API endpoints, frontend pages, and extension code
- See [Testing](openwiki/testing.md) before pushing major changes
