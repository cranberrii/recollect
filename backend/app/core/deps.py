from functools import lru_cache
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from supabase import Client, create_client

from app.core.config import settings


@lru_cache
def get_supabase_client() -> Client:
    """Get Supabase client with service role key."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
    supabase: Client = Depends(get_supabase_client),
) -> str:
    """Extract and verify user ID from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization.replace("Bearer ", "")

    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {e}")


# Type alias for dependency injection
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
SupabaseClient = Annotated[Client, Depends(get_supabase_client)]
