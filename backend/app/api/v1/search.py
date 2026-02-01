from fastapi import APIRouter

from app.core.deps import CurrentUserId, SupabaseClient
from app.models.bookmark import HybridSearchRequest, HybridSearchResponse
from app.services.search import hybrid_search

router = APIRouter()


@router.post("", response_model=list[HybridSearchResponse])
async def search_bookmarks(
    request: HybridSearchRequest,
    user_id: CurrentUserId,
    supabase: SupabaseClient,
):
    """
    Search bookmarks using semantic, keyword, or hybrid search.

    Modes:
    - SEMANTIC: Vector similarity search on embeddings
    - KEYWORD: Category name matching (faster, no embedding)
    - HYBRID: Combines both using Reciprocal Rank Fusion
    """
    return await hybrid_search(
        query=request.query,
        user_id=user_id,
        supabase=supabase,
        limit=request.limit,
        semantic_threshold=request.threshold,
        mode=request.mode,
    )
