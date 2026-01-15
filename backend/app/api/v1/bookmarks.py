from fastapi import APIRouter, HTTPException

from app.core.deps import CurrentUserId, SupabaseClient
from app.models.bookmark import BookmarkCreate, BookmarkResponse, BookmarkUpdate
from app.services.embedding import get_embedding

router = APIRouter()


@router.get("", response_model=list[BookmarkResponse])
async def list_bookmarks(
    user_id: CurrentUserId,
    supabase: SupabaseClient,
    limit: int = 50,
    offset: int = 0,
):
    """List all bookmarks for the current user."""
    response = (
        supabase.table("bookmarks")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return response.data


@router.post("", response_model=BookmarkResponse)
async def create_bookmark(
    bookmark: BookmarkCreate,
    user_id: CurrentUserId,
    supabase: SupabaseClient,
):
    """Create a new bookmark with optional embedding."""
    data = bookmark.model_dump()
    data["user_id"] = user_id

    # Generate embedding if content is available
    text_for_embedding = f"{bookmark.title or ''} {bookmark.description or ''} {bookmark.content or ''}"
    if text_for_embedding.strip():
        try:
            embedding = await get_embedding(text_for_embedding)
            data["embedding"] = embedding
        except Exception as e:
            print(f"create bookmark error: {e}")
            pass  # Skip embedding on error

    response = supabase.table("bookmarks").insert(data).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create bookmark")

    return response.data[0]


@router.get("/{bookmark_id}", response_model=BookmarkResponse)
async def get_bookmark(
    bookmark_id: str,
    user_id: CurrentUserId,
    supabase: SupabaseClient,
):
    """Get a specific bookmark."""
    response = (
        supabase.table("bookmarks")
        .select("*")
        .eq("id", bookmark_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    return response.data


@router.patch("/{bookmark_id}", response_model=BookmarkResponse)
async def update_bookmark(
    bookmark_id: str,
    bookmark: BookmarkUpdate,
    user_id: CurrentUserId,
    supabase: SupabaseClient,
):
    """Update a bookmark."""
    data = bookmark.model_dump(exclude_unset=True)

    # Regenerate embedding if content fields changed
    if any(k in data for k in ["title", "description", "content"]):
        existing = (
            supabase.table("bookmarks")
            .select("title, description, content")
            .eq("id", bookmark_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if existing.data:
            merged = {**existing.data, **data}
            text_for_embedding = f"{merged.get('title', '')} {merged.get('description', '')} {merged.get('content', '')}"
            if text_for_embedding.strip():
                try:
                    embedding = await get_embedding(text_for_embedding)
                    data["embedding"] = embedding
                except Exception:
                    pass

    response = (
        supabase.table("bookmarks")
        .update(data)
        .eq("id", bookmark_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    return response.data[0]


@router.delete("/{bookmark_id}")
async def delete_bookmark(
    bookmark_id: str,
    user_id: CurrentUserId,
    supabase: SupabaseClient,
):
    """Delete a bookmark."""
    response = (
        supabase.table("bookmarks")
        .delete()
        .eq("id", bookmark_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    return {"message": "Bookmark deleted"}
