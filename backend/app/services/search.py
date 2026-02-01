"""Hybrid search service combining semantic and category-based search."""

from supabase import Client

from app.models.bookmark import HybridSearchResponse, SearchMode
from app.services.embedding import get_embedding


def _tokenize_query(query: str) -> list[str]:
    """Split query into individual search terms."""
    return [term.strip().lower() for term in query.split() if term.strip()]


async def hybrid_search(
    query: str,
    user_id: str,
    supabase: Client,
    limit: int = 20,
    semantic_threshold: float = 0.5,
    mode: SearchMode = SearchMode.HYBRID,
) -> list[HybridSearchResponse]:
    """
    Perform search based on the specified mode.

    - KEYWORD mode: calls search_by_categories() RPC (no embedding)
    - SEMANTIC mode: calls existing search_bookmarks() RPC
    - HYBRID mode: calls hybrid_search_bookmarks() RPC
    """
    query_terms = _tokenize_query(query)

    if mode == SearchMode.KEYWORD:
        # Category-only search - no embedding needed
        response = supabase.rpc(
            "search_by_categories",
            {
                "query_terms": query_terms,
                "p_user_id": user_id,
                "match_count": limit,
            },
        ).execute()

        return [
            HybridSearchResponse(
                id=row["id"],
                url=row["url"],
                title=row.get("title"),
                description=row.get("description"),
                summary=row.get("summary"),
                favicon_url=row.get("favicon_url"),
                created_at=row.get("created_at"),
                semantic_score=0.0,
                category_score=row.get("category_score", 0.0),
                rrf_score=row.get("category_score", 0.0),  # Use category score as rank
                matched_categories=row.get("matched_categories", []),
            )
            for row in (response.data or [])
        ]

    # For SEMANTIC and HYBRID modes, we need the query embedding
    query_embedding = await get_embedding(query)

    if mode == SearchMode.SEMANTIC:
        # Semantic-only search using existing RPC
        response = supabase.rpc(
            "search_bookmarks",
            {
                "query_embedding": query_embedding,
                "match_threshold": semantic_threshold,
                "match_count": limit,
                "p_user_id": user_id,
            },
        ).execute()

        return [
            HybridSearchResponse(
                id=row["id"],
                url=row["url"],
                title=row.get("title"),
                description=row.get("description"),
                summary=row.get("summary"),
                favicon_url=row.get("favicon_url"),
                created_at=row.get("created_at"),
                semantic_score=row.get("similarity", 0.0),
                category_score=0.0,
                rrf_score=row.get("similarity", 0.0),  # Use similarity as rank
                matched_categories=[],
            )
            for row in (response.data or [])
        ]

    # HYBRID mode - combine semantic and category search
    response = supabase.rpc(
        "hybrid_search_bookmarks",
        {
            "query_embedding": query_embedding,
            "query_terms": query_terms,
            "p_user_id": user_id,
            "semantic_threshold": semantic_threshold,
            "match_count": limit,
        },
    ).execute()

    return [
        HybridSearchResponse(
            id=row["id"],
            url=row["url"],
            title=row.get("title"),
            description=row.get("description"),
            summary=row.get("summary"),
            favicon_url=row.get("favicon_url"),
            created_at=row.get("created_at"),
            semantic_score=row.get("semantic_score", 0.0),
            category_score=row.get("category_score", 0.0),
            rrf_score=row.get("rrf_score", 0.0),
            matched_categories=row.get("matched_categories", []),
        )
        for row in (response.data or [])
    ]
