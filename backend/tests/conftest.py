from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_current_user_id, get_supabase_client
from app.main import app

TEST_USER_ID = "test-user-123"


@pytest.fixture
def mock_supabase():
    """Create a mock Supabase client."""
    return MagicMock()


@pytest.fixture
def client(mock_supabase):
    """Create a test client with mocked dependencies."""

    async def mock_user_id():
        return TEST_USER_ID

    def mock_supabase_client():
        return mock_supabase

    app.dependency_overrides[get_current_user_id] = mock_user_id
    app.dependency_overrides[get_supabase_client] = mock_supabase_client

    yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture
def sample_bookmark():
    """Sample bookmark data for testing."""
    return {
        "id": "bookmark-1",
        "user_id": TEST_USER_ID,
        "url": "https://example.com",
        "title": "Example Site",
        "description": "An example website with content.",
        "content": "Example content",
        "favicon_url": "https://example.com/favicon.ico",
        "tags": ["test", "example"],
        "is_favorite": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
