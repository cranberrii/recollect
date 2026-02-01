from unittest.mock import MagicMock, patch

from tests.conftest import TEST_USER_ID


class TestSearchBookmarks:
    @patch("app.services.search.get_embedding")
    def test_search_hybrid_mode(
        self, mock_get_embedding, client, mock_supabase, sample_bookmark
    ):
        """Test hybrid search (default mode) combining semantic and category results."""
        mock_get_embedding.return_value = [0.1] * 1536
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {
                    **sample_bookmark,
                    "semantic_score": 0.85,
                    "category_score": 2.0,
                    "rrf_score": 0.032,
                    "matched_categories": ["python", "web"],
                }
            ]
        )

        response = client.post(
            "/api/v1/search",
            json={"query": "python web", "mode": "hybrid"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["semantic_score"] == 0.85
        assert data[0]["category_score"] == 2.0
        assert data[0]["rrf_score"] == 0.032
        assert data[0]["matched_categories"] == ["python", "web"]

        mock_supabase.rpc.assert_called_once_with(
            "hybrid_search_bookmarks",
            {
                "query_embedding": [0.1] * 1536,
                "query_terms": ["python", "web"],
                "p_user_id": TEST_USER_ID,
                "semantic_threshold": 0.5,
                "match_count": 20,
            },
        )

    @patch("app.services.search.get_embedding")
    def test_search_semantic_mode(
        self, mock_get_embedding, client, mock_supabase, sample_bookmark
    ):
        """Test semantic-only search mode."""
        mock_get_embedding.return_value = [0.1] * 1536
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(
            data=[{**sample_bookmark, "similarity": 0.95}]
        )

        response = client.post(
            "/api/v1/search",
            json={"query": "example search", "mode": "semantic"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["semantic_score"] == 0.95

        mock_supabase.rpc.assert_called_once_with(
            "search_bookmarks",
            {
                "query_embedding": [0.1] * 1536,
                "match_threshold": 0.5,
                "match_count": 20,
                "p_user_id": TEST_USER_ID,
            },
        )

    def test_search_keyword_mode(self, client, mock_supabase, sample_bookmark):
        """Test keyword/category-only search mode (no embedding needed)."""
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {
                    **sample_bookmark,
                    "category_score": 1.0,
                    "matched_categories": ["python"],
                }
            ]
        )

        response = client.post(
            "/api/v1/search",
            json={"query": "python", "mode": "keyword"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["category_score"] == 1.0
        assert data[0]["matched_categories"] == ["python"]

        mock_supabase.rpc.assert_called_once_with(
            "search_by_categories",
            {
                "query_terms": ["python"],
                "p_user_id": TEST_USER_ID,
                "match_count": 20,
            },
        )

    @patch("app.services.search.get_embedding")
    def test_search_empty_results(self, mock_get_embedding, client, mock_supabase):
        """Test search with no matching results."""
        mock_get_embedding.return_value = [0.1] * 1536
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])

        response = client.post(
            "/api/v1/search",
            json={"query": "no results query"},
        )

        assert response.status_code == 200
        assert response.json() == []

    @patch("app.services.search.get_embedding")
    def test_search_with_custom_params(
        self, mock_get_embedding, client, mock_supabase, sample_bookmark
    ):
        """Test search with custom limit and threshold."""
        mock_get_embedding.return_value = [0.1] * 1536
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {
                    **sample_bookmark,
                    "semantic_score": 0.85,
                    "category_score": 0.0,
                    "rrf_score": 0.016,
                    "matched_categories": [],
                }
            ]
        )

        response = client.post(
            "/api/v1/search",
            json={"query": "custom search", "limit": 5, "threshold": 0.8},
        )

        assert response.status_code == 200

        mock_supabase.rpc.assert_called_once_with(
            "hybrid_search_bookmarks",
            {
                "query_embedding": [0.1] * 1536,
                "query_terms": ["custom", "search"],
                "p_user_id": TEST_USER_ID,
                "semantic_threshold": 0.8,
                "match_count": 5,
            },
        )

    def test_search_missing_query(self, client):
        """Test search with missing query parameter."""
        response = client.post(
            "/api/v1/search",
            json={},
        )

        assert response.status_code == 422

    @patch("app.services.search.get_embedding")
    def test_search_null_response(self, mock_get_embedding, client, mock_supabase):
        """Test search handles null response data."""
        mock_get_embedding.return_value = [0.1] * 1536
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=None)

        response = client.post(
            "/api/v1/search",
            json={"query": "test"},
        )

        assert response.status_code == 200
        assert response.json() == []

    @patch("app.services.search.get_embedding")
    def test_search_default_mode_is_hybrid(
        self, mock_get_embedding, client, mock_supabase, sample_bookmark
    ):
        """Test that default mode is hybrid when not specified."""
        mock_get_embedding.return_value = [0.1] * 1536
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(
            data=[
                {
                    **sample_bookmark,
                    "semantic_score": 0.8,
                    "category_score": 1.0,
                    "rrf_score": 0.03,
                    "matched_categories": ["test"],
                }
            ]
        )

        response = client.post(
            "/api/v1/search",
            json={"query": "test"},
        )

        assert response.status_code == 200
        # Verify hybrid_search_bookmarks was called (not search_bookmarks)
        mock_supabase.rpc.assert_called_once()
        call_args = mock_supabase.rpc.call_args
        assert call_args[0][0] == "hybrid_search_bookmarks"
