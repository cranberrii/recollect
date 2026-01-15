from fastapi import APIRouter

from app.core.deps import CurrentUserId, SupabaseClient
from app.models.bookmark import BookmarkResponse, SearchRequest
from app.services.embedding import get_embedding

router = APIRouter()


@router.post("", response_model=list[BookmarkResponse])
async def search_bookmarks(
    request: SearchRequest,
    user_id: CurrentUserId,
    supabase: SupabaseClient,
):
    """Semantic search for bookmarks using vector similarity."""
    # Generate embedding for the search query
    query_embedding = await get_embedding(request.query)

    # Call the Supabase RPC function for vector search
    response = supabase.rpc(
        "search_bookmarks",
        {
            "query_embedding": query_embedding,
            "match_threshold": request.threshold,
            "match_count": request.limit,
            "p_user_id": user_id,
        },
    ).execute()

    return response.data or []
