from fastapi import APIRouter, HTTPException

from app.core.deps import CurrentUserId, SupabaseClient
from app.models.bookmark import BookmarkCreate, BookmarkResponse, BookmarkUpdate
from app.services.embedding import get_embedding
from app.services.llm_ai import generate_categories, summarize_content
from app.services.scraper import scrape_url


router = APIRouter()


def get_or_create_category(
    supabase: SupabaseClient,
    user_id: str,
    category_name: str,
) -> str:
    """Get existing category ID or create a new one. Returns category UUID."""
    name = category_name.strip().lower()

    # Try to find existing AI category for this user with this name
    response = (
        supabase.table("categories")
        .select("id")
        .eq("user_id", user_id)
        .eq("name", name)
        .eq("type", "ai")
        .execute()
    )
    if response.data:
        return response.data[0]["id"]

    # Create new AI category if not exists
    response = (
        supabase.table("categories")
        .insert({
            "user_id": user_id,
            "name": name,
            "type": "ai",
        }).execute()
    )
    return response.data[0]["id"]


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
    """Create a new bookmark with automatic URL scraping and embedding."""
    data = bookmark.model_dump(mode="json")
    data["user_id"] = user_id

    # Scrape URL to extract title, description, content, and favicon
    try:
        scraped = await scrape_url(str(bookmark.url))
        # Only fill in fields that weren't provided by the user
        if not data.get("title") and scraped.title:
            data["title"] = scraped.title
        if not data.get("description") and scraped.description:
            data["description"] = scraped.description
        if not data.get("content") and scraped.content:
            data["content"] = scraped.content
        if not data.get("favicon_url") and scraped.favicon_url:
            data["favicon_url"] = scraped.favicon_url
        print(f"URL scraped for {bookmark.url} - {scraped.title}")
    except Exception as e:
        print(f"URL scraping failed for {bookmark.url}: {e}")
        # Continue without scraped data - bookmark will still be created

    # TODO - Generate AI summary if description or content is available
    if data.get("title") or data.get("content"):
        try:
            summary = await summarize_content(data.get('title') or "" + "\n\n" + data.get("content") or "")
            if summary:
                data["summary"] = summary
                print(f"AI summary generated for {bookmark.url}")
        except Exception as e:
            print(f"AI summary generation failed for {bookmark.url}: {e}")
            # TODO Error code: 521 - {'error': {'message': 'Provider returned error', 'code': 521,

    response = supabase.table("bookmarks").insert(data).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create bookmark")

    bookmark_data = response.data[0]

    # Generate embedding and save to bookmark_embeddings table
    text_for_embedding = f"{data.get('title') or ''} {data.get('description') or ''} {data.get('content') or ''}"
    if text_for_embedding.strip():
        try:
            embedding = await get_embedding(text_for_embedding)
            supabase.table("bookmark_embeddings").insert({
                "bookmark_id": bookmark_data["id"],
                "embedding": embedding,
            }).execute()
            print(f"Embedding saved: {data.get('title')}")
        except Exception as e:
            print(f"Embedding generation error: {e}")

    # Generate AI categories and save to bookmark_categories table
    if data.get("title") or data.get("description") or data.get("content"):
        try:
            categories = await generate_categories(
                title=data.get("title") or "",
                description=data.get("description") or "",
                content=data.get("content") or "",
            )
            for category_name in categories:
                category_id = get_or_create_category(supabase, user_id, category_name)
                supabase.table("bookmark_categories").insert({
                    "bookmark_id": bookmark_data["id"],
                    "category_id": category_id,
                }).execute()
            print(f"AI categories generated for {bookmark.url}: {categories}")
        except Exception as e:
            print(f"AI category generation failed for {bookmark.url}: {e}")
    print(f"Processing completed for id: {bookmark_data.get('id')}")
    return bookmark_data


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

    response = (
        supabase.table("bookmarks")
        .update(data)
        .eq("id", bookmark_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    bookmark_data = response.data[0]

    # Regenerate embedding if content fields changed
    if any(k in data for k in ["title", "description", "content"]):
        text_for_embedding = f"{bookmark_data.get('title', '')} {bookmark_data.get('description', '')} {bookmark_data.get('content', '')}"
        if text_for_embedding.strip():
            try:
                embedding = await get_embedding(text_for_embedding)
                # Upsert embedding (update if exists, insert if not)
                supabase.table("bookmark_embeddings").upsert({
                    "bookmark_id": bookmark_id,
                    "embedding": embedding,
                }).execute()
                print(f"Embedding updated for {bookmark_data.get('title')}")
            except Exception as e:
                print(f"Embedding update error: {e}")

        # Regenerate AI categories if content fields changed
        try:
            # Delete existing categories
            supabase.table("bookmark_categories").delete().eq("bookmark_id", bookmark_id).execute()
            # Generate new categories
            categories = await generate_categories(
                title=bookmark_data.get("title") or "",
                description=bookmark_data.get("description") or "",
                content=bookmark_data.get("content") or "",
            )
            for category_name in categories:
                category_id = get_or_create_category(supabase, user_id, category_name)
                supabase.table("bookmark_categories").insert({
                    "bookmark_id": bookmark_id,
                    "category_id": category_id,
                }).execute()
            print(f"AI categories regenerated for bookmark {bookmark_id}: {categories}")
        except Exception as e:
            print(f"AI category regeneration failed for bookmark {bookmark_id}: {e}")

    return bookmark_data


@router.delete("/{bookmark_id}")
async def delete_bookmark(
    bookmark_id: str,
    user_id: CurrentUserId,
    supabase: SupabaseClient,
):
    """Delete a bookmark and its associated embedding."""
    response = (
        supabase.table("bookmarks")
        .delete()
        .eq("id", bookmark_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    # Delete associated embedding if it exists
    embedding_response = (
        supabase.table("bookmark_embeddings")
        .select("bookmark_id")
        .eq("bookmark_id", bookmark_id)
        .execute()
    )
    if embedding_response.data:
        supabase.table("bookmark_embeddings").delete().eq("bookmark_id", bookmark_id).execute()

    # Delete associated categories if they exist
    categories_response = (
        supabase.table("bookmark_categories")
        .select("bookmark_id")
        .eq("bookmark_id", bookmark_id)
        .execute()
    )
    if categories_response.data:
        supabase.table("bookmark_categories").delete().eq("bookmark_id", bookmark_id).execute()

    return {"message": "Bookmark deleted"}
