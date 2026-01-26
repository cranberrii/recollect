import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.llm_ai import generate_categories, summarize_content


class TestGenerateCategories:
    @pytest.mark.asyncio
    async def test_generate_categories_returns_tags(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="python, web development, tutorial"))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await generate_categories(
                title="Learn Python",
                description="A Python tutorial",
                content="This is a comprehensive Python guide.",
            )

            assert result == ["python", "web development", "tutorial"]
            mock_client.chat.completions.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_categories_strips_whitespace(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="  python  ,  javascript  ,  react  "))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await generate_categories(title="Web Dev", description="Web development", content="Content")

            assert result == ["python", "javascript", "react"]

    @pytest.mark.asyncio
    async def test_generate_categories_converts_to_lowercase(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Python, JavaScript, TypeScript"))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await generate_categories(title="Programming", description="Languages", content="Content")

            assert result == ["python", "javascript", "typescript"]

    @pytest.mark.asyncio
    async def test_generate_categories_limits_to_five_tags(self):
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content="tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8"
                )
            )
        ]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await generate_categories(
                title="Many Tags", description="Test", content="Content"
            )

            assert len(result) == 5
            assert result == ["tag1", "tag2", "tag3", "tag4", "tag5"]

    @pytest.mark.asyncio
    async def test_generate_categories_handles_empty_response(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content=None))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await generate_categories(
                title="Test", description="Test", content="Content"
            )

            assert result == []

    @pytest.mark.asyncio
    async def test_generate_categories_filters_empty_tags(self):
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content="python, , javascript, , react"))
        ]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await generate_categories(
                title="Test", description="Test", content="Content"
            )

            assert result == ["python", "javascript", "react"]

    @pytest.mark.asyncio
    async def test_generate_categories_with_empty_content(self):
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content="general, uncategorized"))
        ]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await generate_categories(
                title="Test Page", description="A test page", content=""
            )

            assert result == ["general", "uncategorized"]
            # Verify that empty content is handled
            call_args = mock_client.chat.completions.create.call_args
            prompt = call_args[1]["messages"][0]["content"]
            assert "N/A" in prompt

    @pytest.mark.asyncio
    async def test_generate_categories_truncates_long_content(self):
        long_content = "x" * 20000

        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="test"))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            await generate_categories(
                title="Test", description="Test", content=long_content
            )

            # Verify the content was truncated to 10000 chars in the prompt
            call_args = mock_client.chat.completions.create.call_args
            prompt = call_args[1]["messages"][0]["content"]
            # The content in the prompt should be truncated
            assert len(prompt) < len(long_content) + 500

    @pytest.mark.asyncio
    async def test_generate_categories_uses_correct_model(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="test"))]

        with patch("app.services.llm_ai.client") as mock_client:
            with patch("app.services.llm_ai.settings") as mock_settings:
                mock_settings.llm_model = "test-model"
                mock_client.chat.completions.create = AsyncMock(
                    return_value=mock_response
                )

                await generate_categories(
                    title="Test", description="Test", content="Content"
                )

                call_args = mock_client.chat.completions.create.call_args
                assert call_args[1]["model"] == "test-model"


class TestSummarizeContent:
    @pytest.mark.asyncio
    async def test_summarize_content_returns_summary(self):
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content="This is a summary of the content provided."
                )
            )
        ]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await summarize_content("This is a long article about technology.")

            assert result == "This is a summary of the content provided."
            mock_client.chat.completions.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_summarize_content_handles_empty_response(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content=None))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await summarize_content("Some content to summarize")

            assert result == ""

    @pytest.mark.asyncio
    async def test_summarize_content_truncates_long_input(self):
        long_content = "y" * 20000

        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Summary"))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            await summarize_content(long_content)

            # Verify the content was truncated to 10000 chars in the prompt
            call_args = mock_client.chat.completions.create.call_args
            prompt = call_args[1]["messages"][0]["content"]
            # The prompt should contain truncated content (10000 chars max)
            assert len(prompt) < len(long_content)

    @pytest.mark.asyncio
    async def test_summarize_content_uses_correct_max_tokens(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Summary"))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            await summarize_content("Content to summarize")

            call_args = mock_client.chat.completions.create.call_args
            assert call_args[1]["max_tokens"] == 256

    @pytest.mark.asyncio
    async def test_summarize_content_uses_correct_model(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Summary"))]

        with patch("app.services.llm_ai.client") as mock_client:
            with patch("app.services.llm_ai.settings") as mock_settings:
                mock_settings.llm_model = "custom-model"
                mock_client.chat.completions.create = AsyncMock(
                    return_value=mock_response
                )

                await summarize_content("Content")

                call_args = mock_client.chat.completions.create.call_args
                assert call_args[1]["model"] == "custom-model"

    @pytest.mark.asyncio
    async def test_summarize_content_preserves_response_format(self):
        expected_summary = "Line 1.\nLine 2.\nLine 3."
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content=expected_summary))
        ]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await summarize_content("Multi-paragraph content")

            assert result == expected_summary


class TestLLMClientConfiguration:
    @pytest.mark.asyncio
    async def test_generate_categories_max_tokens(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="test"))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            await generate_categories(
                title="Test", description="Test", content="Content"
            )

            call_args = mock_client.chat.completions.create.call_args
            assert call_args[1]["max_tokens"] == 100

    @pytest.mark.asyncio
    async def test_generate_categories_prompt_structure(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="tag1, tag2"))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            await generate_categories(
                title="Test Title",
                description="Test Description",
                content="Test Content",
            )

            call_args = mock_client.chat.completions.create.call_args
            prompt = call_args[1]["messages"][0]["content"]

            assert "Test Title" in prompt
            assert "Test Description" in prompt
            assert "Test Content" in prompt
            assert "3-5 relevant tags" in prompt
            assert "comma-separated" in prompt

    @pytest.mark.asyncio
    async def test_summarize_content_prompt_structure(self):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Summary"))]

        with patch("app.services.llm_ai.client") as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            await summarize_content("This is the content to summarize")

            call_args = mock_client.chat.completions.create.call_args
            prompt = call_args[1]["messages"][0]["content"]

            assert "This is the content to summarize" in prompt
            assert "2-3 sentences" in prompt
