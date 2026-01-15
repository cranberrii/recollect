from unittest.mock import MagicMock, patch

from tests.conftest import TEST_USER_ID


class TestSearchBookmarks:
    @patch("app.api.v1.search.get_embedding")
    def test_search_bookmarks_success(
        self, mock_get_embedding, client, mock_supabase, sample_bookmark
    ):
        mock_get_embedding.return_value = [0.1] * 1536
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(
            data=[{**sample_bookmark, "similarity": 0.95}]
        )

        response = client.post(
            "/api/v1/search",
            json={"query": "example search"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["similarity"] == 0.95

        mock_supabase.rpc.assert_called_once_with(
            "search_bookmarks",
            {
                "query_embedding": [0.1] * 1536,
                "match_threshold": 0.7,
                "match_count": 10,
                "p_user_id": TEST_USER_ID,
            },
        )

    @patch("app.api.v1.search.get_embedding")
    def test_search_bookmarks_empty_results(
        self, mock_get_embedding, client, mock_supabase
    ):
        mock_get_embedding.return_value = [0.1] * 1536
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])

        response = client.post(
            "/api/v1/search",
            json={"query": "no results query"},
        )

        assert response.status_code == 200
        assert response.json() == []

    @patch("app.api.v1.search.get_embedding")
    def test_search_bookmarks_with_custom_params(
        self, mock_get_embedding, client, mock_supabase, sample_bookmark
    ):
        mock_get_embedding.return_value = [0.1] * 1536
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(
            data=[{**sample_bookmark, "similarity": 0.85}]
        )

        response = client.post(
            "/api/v1/search",
            json={"query": "custom search", "limit": 5, "threshold": 0.8},
        )

        assert response.status_code == 200

        mock_supabase.rpc.assert_called_once_with(
            "search_bookmarks",
            {
                "query_embedding": [0.1] * 1536,
                "match_threshold": 0.8,
                "match_count": 5,
                "p_user_id": TEST_USER_ID,
            },
        )

    def test_search_bookmarks_missing_query(self, client):
        response = client.post(
            "/api/v1/search",
            json={},
        )

        assert response.status_code == 422

    @patch("app.api.v1.search.get_embedding")
    def test_search_bookmarks_null_response(
        self, mock_get_embedding, client, mock_supabase
    ):
        mock_get_embedding.return_value = [0.1] * 1536
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=None)

        response = client.post(
            "/api/v1/search",
            json={"query": "test"},
        )

        assert response.status_code == 200
        assert response.json() == []
