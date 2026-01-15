from datetime import datetime

from pydantic import BaseModel, HttpUrl


class BookmarkBase(BaseModel):
    url: HttpUrl
    title: str | None = None
    description: str | None = None
    content: str | None = None
    favicon_url: str | None = None
    tags: list[str] = []
    is_favorite: bool = False


class BookmarkCreate(BookmarkBase):
    pass


class BookmarkUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    content: str | None = None
    tags: list[str] | None = None
    is_favorite: bool | None = None


class BookmarkResponse(BookmarkBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    similarity: float | None = None

    class Config:
        from_attributes = True


class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    threshold: float = 0.7
