from datetime import datetime
from enum import Enum

from pydantic import BaseModel, HttpUrl


class SearchMode(str, Enum):
    SEMANTIC = "semantic"
    HYBRID = "hybrid"
    KEYWORD = "keyword"


class BookmarkBase(BaseModel):
    url: HttpUrl
    title: str | None = None
    description: str | None = None
    content: str | None = None
    favicon_url: str | None = None
    # tags: list[str] = []
    is_favorite: bool = False


class BookmarkUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    content: str | None = None
    # tags: list[str] | None = None
    is_favorite: bool | None = None


class BookmarkCreate(BookmarkBase):
    pass


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


class HybridSearchRequest(BaseModel):
    query: str
    limit: int = 20
    threshold: float = 0.5
    mode: SearchMode = SearchMode.HYBRID


class HybridSearchResponse(BaseModel):
    id: str
    url: str
    title: str | None = None
    description: str | None = None
    summary: str | None = None
    favicon_url: str | None = None
    created_at: datetime | None = None
    semantic_score: float = 0.0
    category_score: float = 0.0
    rrf_score: float = 0.0
    matched_categories: list[str] = []

    class Config:
        from_attributes = True