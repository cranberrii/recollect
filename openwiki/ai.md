# AI Integration

## Embedding & Search
- Backend uses OpenRouter API (OpenAI-compatible)
- Bookmark text embedded and stored in pgvector
- Backend triggers embedding + summarization on new bookmark

## Categorization
- Semantic embedding used for AI-powered category assignment

## Guidance
- OpenRouter keys/API must be configured in backend `.env`
- Algorithm logic in `backend/app/semantics.py`
- Update embed/categorize flow carefully—test before deploying!

## References
- [Backend API](openwiki/backend.md)
- [Database](openwiki/supabase.md)
