from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import bookmarks, search
from app.core.config import settings

app = FastAPI(
    title="Bookmark Orchestrator API",
    description="AI-powered bookmark manager backend",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Include routers
app.include_router(bookmarks.router, prefix="/api/v1/bookmarks", tags=["bookmarks"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
