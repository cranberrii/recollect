# Supabase & Database

## Overview
- **Supabase** hosts PostgreSQL with pgvector extension for semantic search
- Database stores bookmarks, summaries, categories, embeddings

## DB Setup
- Migrate: `supabase db push` (requires login/link)
- Schema: See migrations under `supabase/` directory

## Change Guidance
- Edit DB schema: Update migration scripts and backend models
- Adding new fields: Update backend/app/models.py
- Always run `supabase db push` after schema changes

## References
- [Backend](openwiki/backend.md)
- [AI Integration](openwiki/ai.md)
