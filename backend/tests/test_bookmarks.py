from unittest.mock import MagicMock, patch, AsyncMock

from app.services.scraper import ScrapedData
from tests.conftest import TEST_USER_ID


class TestListBookmarks:
    def test_list_bookmarks_success(self, client, mock_supabase, sample_bookmark):
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[sample_bookmark]
        )

        response = client.get("/api/v1/bookmarks")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "bookmark-1"

    def test_list_bookmarks_empty(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[]
        )

        response = client.get("/api/v1/bookmarks")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_bookmarks_with_pagination(self, client, mock_supabase, sample_bookmark):
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[sample_bookmark]
        )

        response = client.get("/api/v1/bookmarks?limit=10&offset=5")

        assert response.status_code == 200
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.assert_called_with(
            5, 14
        )


class TestCreateBookmark:
    @patch("app.api.v1.bookmarks.scrape_url")
    @patch("app.api.v1.bookmarks.get_embedding")
    def test_create_bookmark_success(
        self, mock_get_embedding, mock_scrape_url, client, mock_supabase, sample_bookmark
    ):
        mock_get_embedding.return_value = [0.1] * 4096
        mock_scrape_url.return_value = ScrapedData(
            title="Scraped Title",
            description="Scraped description",
            content="Scraped content",
            favicon_url="https://example.com/favicon.ico",
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[sample_bookmark]
        )

        response = client.post(
            "/api/v1/bookmarks",
            json={
                "url": "https://example.com",
                "title": "Example Site",
                "description": "An example website",
            },
        )

        assert response.status_code == 200
        assert response.json()["url"] == "https://example.com/"

    @patch("app.api.v1.bookmarks.scrape_url")
    @patch("app.api.v1.bookmarks.get_embedding")
    def test_create_bookmark_without_optional_fields(
        self, mock_get_embedding, mock_scrape_url, client, mock_supabase, sample_bookmark
    ):
        mock_get_embedding.return_value = [0.1] * 4096
        mock_scrape_url.return_value = ScrapedData(
            title="Scraped Title",
            description="Scraped description",
            content="Scraped content",
            favicon_url="https://example.com/favicon.ico",
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[sample_bookmark]
        )

        response = client.post(
            "/api/v1/bookmarks",
            json={"url": "https://example.com"},
        )

        assert response.status_code == 200

    @patch("app.api.v1.bookmarks.scrape_url")
    @patch("app.api.v1.bookmarks.get_embedding")
    def test_create_bookmark_uses_scraped_data_when_not_provided(
        self, mock_get_embedding, mock_scrape_url, client, mock_supabase, sample_bookmark
    ):
        """Test that scraped data is used when user doesn't provide title/description."""
        mock_get_embedding.return_value = [0.1] * 4096
        mock_scrape_url.return_value = ScrapedData(
            title="Scraped Title",
            description="Scraped description",
            content="Scraped content",
            favicon_url="https://example.com/scraped-favicon.ico",
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{**sample_bookmark, "title": "Scraped Title", "description": "Scraped description"}]
        )

        response = client.post(
            "/api/v1/bookmarks",
            json={"url": "https://example.com"},
        )

        assert response.status_code == 200
        # Verify scraper was called
        mock_scrape_url.assert_called_once_with("https://example.com/")
        # Verify the insert was called with scraped data
        insert_call = mock_supabase.table.return_value.insert.call_args
        inserted_data = insert_call[0][0]
        assert inserted_data["title"] == "Scraped Title"
        assert inserted_data["description"] == "Scraped description"
        assert inserted_data["content"] == "Scraped content"
        assert inserted_data["favicon_url"] == "https://example.com/scraped-favicon.ico"

    @patch("app.api.v1.bookmarks.scrape_url")
    @patch("app.api.v1.bookmarks.get_embedding")
    def test_create_bookmark_user_data_takes_precedence(
        self, mock_get_embedding, mock_scrape_url, client, mock_supabase, sample_bookmark
    ):
        """Test that user-provided data takes precedence over scraped data."""
        mock_get_embedding.return_value = [0.1] * 4096
        mock_scrape_url.return_value = ScrapedData(
            title="Scraped Title",
            description="Scraped description",
            content="Scraped content",
            favicon_url="https://example.com/scraped-favicon.ico",
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[sample_bookmark]
        )

        response = client.post(
            "/api/v1/bookmarks",
            json={
                "url": "https://example.com",
                "title": "User Title",
                "description": "User description",
            },
        )

        assert response.status_code == 200
        # Verify the insert was called with user-provided data, not scraped data
        insert_call = mock_supabase.table.return_value.insert.call_args
        inserted_data = insert_call[0][0]
        assert inserted_data["title"] == "User Title"
        assert inserted_data["description"] == "User description"
        # Content should be from scraper since user didn't provide it
        assert inserted_data["content"] == "Scraped content"

    @patch("app.api.v1.bookmarks.scrape_url")
    @patch("app.api.v1.bookmarks.get_embedding")
    def test_create_bookmark_scraper_failure_doesnt_block(
        self, mock_get_embedding, mock_scrape_url, client, mock_supabase, sample_bookmark
    ):
        """Test that scraper failure doesn't prevent bookmark creation."""
        mock_get_embedding.return_value = [0.1] * 4096
        mock_scrape_url.side_effect = Exception("Network error")
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[sample_bookmark]
        )

        response = client.post(
            "/api/v1/bookmarks",
            json={
                "url": "https://example.com",
                "title": "Manual Title",
            },
        )

        assert response.status_code == 200

    def test_create_bookmark_invalid_url(self, client):
        response = client.post(
            "/api/v1/bookmarks",
            json={"url": "not-a-valid-url"},
        )

        assert response.status_code == 422


class TestGetBookmark:
    def test_get_bookmark_success(self, client, mock_supabase, sample_bookmark):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=sample_bookmark
        )

        response = client.get("/api/v1/bookmarks/bookmark-1")

        assert response.status_code == 200
        assert response.json()["id"] == "bookmark-1"

    def test_get_bookmark_not_found(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=None
        )

        response = client.get("/api/v1/bookmarks/nonexistent")

        assert response.status_code == 404


class TestUpdateBookmark:
    @patch("app.api.v1.bookmarks.get_embedding")
    def test_update_bookmark_success(
        self, mock_get_embedding, client, mock_supabase, sample_bookmark
    ):
        mock_get_embedding.return_value = [0.1] * 4096
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=sample_bookmark
        )
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{**sample_bookmark, "title": "Updated Title"}]
        )

        response = client.patch(
            "/api/v1/bookmarks/bookmark-1",
            json={"title": "Updated Title"},
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    def test_update_bookmark_not_found(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=None
        )
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=None
        )

        response = client.patch(
            "/api/v1/bookmarks/nonexistent",
            json={"title": "Updated Title"},
        )

        assert response.status_code == 404


class TestDeleteBookmark:
    def test_delete_bookmark_success(self, client, mock_supabase, sample_bookmark):
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_bookmark]
        )

        response = client.delete("/api/v1/bookmarks/bookmark-1")

        assert response.status_code == 200
        assert response.json()["message"] == "Bookmark deleted"

    def test_delete_bookmark_not_found(self, client, mock_supabase):
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=None
        )

        response = client.delete("/api/v1/bookmarks/nonexistent")

        assert response.status_code == 404
