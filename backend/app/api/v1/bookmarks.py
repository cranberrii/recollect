import asyncio

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.core.deps import CurrentUserId, SupabaseClient, get_supabase_client
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


MAX_BOOKMARKS = 50


async def _noop():
    return None


async def _process_bookmark_ai(
    bookmark_id: str,
    user_id: str,
    title: str,
    description: str,
    content: str,
    delete_existing_categories: bool = False,
) -> None:
    """Run summarize, embed, and categorize in parallel, then persist results."""
    supabase = get_supabase_client()
    text_for_embedding = f"{title} {description} {content}".strip()

    summary, embedding, categories = await asyncio.gather(
        summarize_content(content) if content else _noop(),
        get_embedding(text_for_embedding) if text_for_embedding else _noop(),
        generate_categories(title=title, description=description, content=content),
        return_exceptions=True,
    )

    if isinstance(summary, str) and summary:
        supabase.table("bookmarks").update({"summary": summary}).eq("id", bookmark_id).execute()
        print(f"Summary saved for {bookmark_id}")
    elif isinstance(summary, Exception):
        print(f"Summary generation failed for {bookmark_id}: {summary}")

    if isinstance(embedding, list):
        supabase.table("bookmark_embeddings").upsert({
            "bookmark_id": bookmark_id,
            "embedding": embedding,
        }).execute()
        print(f"Embedding saved for {bookmark_id}")
    elif isinstance(embedding, Exception):
        print(f"Embedding generation failed for {bookmark_id}: {embedding}")

    if isinstance(categories, list):
        if delete_existing_categories:
            supabase.table("bookmark_categories").delete().eq("bookmark_id", bookmark_id).execute()
        for category_name in categories:
            category_id = get_or_create_category(supabase, user_id, category_name)
            supabase.table("bookmark_categories").insert({
                "bookmark_id": bookmark_id,
                "category_id": category_id,
            }).execute()
        print(f"Categories saved for {bookmark_id}: {categories}")
    elif isinstance(categories, Exception):
        print(f"Category generation failed for {bookmark_id}: {categories}")


@router.post("", response_model=BookmarkResponse)
async def create_bookmark(
    bookmark: BookmarkCreate,
    user_id: CurrentUserId,
    supabase: SupabaseClient,
    background_tasks: BackgroundTasks,
):
    """Create a new bookmark with automatic URL scraping and AI enrichment."""
    # Check bookmark limit
    count_response = (
        supabase.table("bookmarks")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    if count_response.count >= MAX_BOOKMARKS:
        raise HTTPException(
            status_code=403,
            detail=f"Bookmark limit reached. Maximum {MAX_BOOKMARKS} bookmarks allowed.",
        )

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

    response = supabase.table("bookmarks").insert(data).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create bookmark")

    bookmark_data = response.data[0]

    # AI enrichment (summarize + embed + categorize) runs in background
    background_tasks.add_task(
        _process_bookmark_ai,
        bookmark_id=bookmark_data["id"],
        user_id=user_id,
        title=data.get("title") or "",
        description=data.get("description") or "",
        content=data.get("content") or "",
    )
    print(f"AI enrichment scheduled for {bookmark_data['id']}")

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
    background_tasks: BackgroundTasks,
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

    # Re-enrich AI fields if any content fields changed
    if any(k in data for k in ["title", "description", "content"]):
        background_tasks.add_task(
            _process_bookmark_ai,
            bookmark_id=bookmark_id,
            user_id=user_id,
            title=bookmark_data.get("title") or "",
            description=bookmark_data.get("description") or "",
            content=bookmark_data.get("content") or "",
            delete_existing_categories=True,
        )
        print(f"AI re-enrichment scheduled for {bookmark_id}")

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
