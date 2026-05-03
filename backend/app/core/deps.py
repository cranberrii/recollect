from functools import lru_cache
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from supabase import Client, create_client
from supabase_auth.types import User

from app.core.config import settings


@lru_cache
def get_supabase_client() -> Client:
    """Get Supabase client with service role key."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _verify_token(authorization: str | None, supabase: Client) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    token = authorization.replace("Bearer ", "")
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return response.user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {e}")


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    supabase: Client = Depends(get_supabase_client),
) -> User:
    return _verify_token(authorization, supabase)


async def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
    supabase: Client = Depends(get_supabase_client),
) -> str:
    return _verify_token(authorization, supabase).id


# Type aliases for dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
SupabaseClient = Annotated[Client, Depends(get_supabase_client)]
