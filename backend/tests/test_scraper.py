import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from app.services.scraper import (
    scrape_url,
    ScrapedData,
    _extract_title,
    _extract_description,
    _extract_content,
    _extract_favicon,
)
from bs4 import BeautifulSoup


class TestExtractTitle:
    def test_extract_og_title(self):
        html = '<html><head><meta property="og:title" content="OG Title"></head></html>'
        soup = BeautifulSoup(html, "lxml")
        assert _extract_title(soup) == "OG Title"

    def test_extract_twitter_title(self):
        html = '<html><head><meta name="twitter:title" content="Twitter Title"></head></html>'
        soup = BeautifulSoup(html, "lxml")
        assert _extract_title(soup) == "Twitter Title"

    def test_extract_title_tag(self):
        html = "<html><head><title>Page Title</title></head></html>"
        soup = BeautifulSoup(html, "lxml")
        assert _extract_title(soup) == "Page Title"

    def test_og_title_takes_precedence(self):
        html = '''<html><head>
            <meta property="og:title" content="OG Title">
            <meta name="twitter:title" content="Twitter Title">
            <title>Page Title</title>
        </head></html>'''
        soup = BeautifulSoup(html, "lxml")
        assert _extract_title(soup) == "OG Title"

    def test_twitter_title_over_title_tag(self):
        html = '''<html><head>
            <meta name="twitter:title" content="Twitter Title">
            <title>Page Title</title>
        </head></html>'''
        soup = BeautifulSoup(html, "lxml")
        assert _extract_title(soup) == "Twitter Title"

    def test_no_title(self):
        html = "<html><head></head></html>"
        soup = BeautifulSoup(html, "lxml")
        assert _extract_title(soup) is None

    def test_strips_whitespace(self):
        html = "<html><head><title>  Spaced Title  </title></head></html>"
        soup = BeautifulSoup(html, "lxml")
        assert _extract_title(soup) == "Spaced Title"


class TestExtractDescription:
    def test_extract_og_description(self):
        html = '<html><head><meta property="og:description" content="OG Description"></head></html>'
        soup = BeautifulSoup(html, "lxml")
        assert _extract_description(soup) == "OG Description"

    def test_extract_twitter_description(self):
        html = '<html><head><meta name="twitter:description" content="Twitter Description"></head></html>'
        soup = BeautifulSoup(html, "lxml")
        assert _extract_description(soup) == "Twitter Description"

    def test_extract_meta_description(self):
        html = '<html><head><meta name="description" content="Meta Description"></head></html>'
        soup = BeautifulSoup(html, "lxml")
        assert _extract_description(soup) == "Meta Description"

    def test_og_description_takes_precedence(self):
        html = '''<html><head>
            <meta property="og:description" content="OG Description">
            <meta name="description" content="Meta Description">
        </head></html>'''
        soup = BeautifulSoup(html, "lxml")
        assert _extract_description(soup) == "OG Description"

    def test_no_description(self):
        html = "<html><head></head></html>"
        soup = BeautifulSoup(html, "lxml")
        assert _extract_description(soup) is None


class TestExtractContent:
    def test_extract_from_main(self):
        html = "<html><body><main>Main content here</main><nav>Navigation</nav></body></html>"
        soup = BeautifulSoup(html, "lxml")
        content = _extract_content(soup)
        assert "Main content here" in content
        assert "Navigation" not in content

    def test_extract_from_article(self):
        html = "<html><body><article>Article content</article><footer>Footer</footer></body></html>"
        soup = BeautifulSoup(html, "lxml")
        content = _extract_content(soup)
        assert "Article content" in content
        assert "Footer" not in content

    def test_removes_script_and_style(self):
        html = """<html><body>
            <script>var x = 1;</script>
            <style>.foo { color: red; }</style>
            <p>Actual content</p>
        </body></html>"""
        soup = BeautifulSoup(html, "lxml")
        content = _extract_content(soup)
        assert "Actual content" in content
        assert "var x" not in content
        assert "color: red" not in content

    def test_normalizes_whitespace(self):
        html = "<html><body><p>Text   with   spaces</p></body></html>"
        soup = BeautifulSoup(html, "lxml")
        content = _extract_content(soup)
        assert "Text with spaces" in content

    def test_empty_body_returns_none(self):
        html = "<html><head></head></html>"
        soup = BeautifulSoup(html, "lxml")
        content = _extract_content(soup)
        assert content is None

    def test_truncates_long_content(self):
        long_text = "a" * 60000
        html = f"<html><body><p>{long_text}</p></body></html>"
        soup = BeautifulSoup(html, "lxml")
        content = _extract_content(soup)
        assert len(content) <= 50003  # 50000 + "..."
        assert content.endswith("...")


class TestExtractFavicon:
    def test_extract_icon_link(self):
        html = '<html><head><link rel="icon" href="/favicon.png"></head></html>'
        soup = BeautifulSoup(html, "lxml")
        favicon = _extract_favicon(soup, "https://example.com/page")
        assert favicon == "https://example.com/favicon.png"

    def test_extract_shortcut_icon(self):
        html = '<html><head><link rel="shortcut icon" href="/shortcut.ico"></head></html>'
        soup = BeautifulSoup(html, "lxml")
        favicon = _extract_favicon(soup, "https://example.com/page")
        assert favicon == "https://example.com/shortcut.ico"

    def test_extract_apple_touch_icon(self):
        html = '<html><head><link rel="apple-touch-icon" href="/apple-icon.png"></head></html>'
        soup = BeautifulSoup(html, "lxml")
        favicon = _extract_favicon(soup, "https://example.com/page")
        assert favicon == "https://example.com/apple-icon.png"

    def test_absolute_favicon_url(self):
        html = '<html><head><link rel="icon" href="https://cdn.example.com/icon.png"></head></html>'
        soup = BeautifulSoup(html, "lxml")
        favicon = _extract_favicon(soup, "https://example.com/page")
        assert favicon == "https://cdn.example.com/icon.png"

    def test_fallback_to_default_favicon(self):
        html = "<html><head></head></html>"
        soup = BeautifulSoup(html, "lxml")
        favicon = _extract_favicon(soup, "https://example.com/page")
        assert favicon == "https://example.com/favicon.ico"

    def test_icon_link_takes_precedence(self):
        html = '''<html><head>
            <link rel="icon" href="/icon.png">
            <link rel="apple-touch-icon" href="/apple.png">
        </head></html>'''
        soup = BeautifulSoup(html, "lxml")
        favicon = _extract_favicon(soup, "https://example.com/page")
        assert favicon == "https://example.com/icon.png"


class TestScrapeUrl:
    test_url = "https://www.google.com"

    @pytest.mark.asyncio
    async def test_scrape_url_success(self):
        html_content = """
        <html>
        <head>
            <title>Test Page</title>
            <meta property="og:description" content="Test description">
            <link rel="icon" href="/favicon.ico">
        </head>
        <body>
            <main>This is the main content of the page.</main>
        </body>
        </html>
        """

        mock_response = MagicMock()
        mock_response.text = html_content
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            result = await scrape_url(self.test_url)

            assert result.title == "Test Page"
            assert result.description == "Test description"
            assert "main content" in result.content
            assert result.favicon_url == f"{self.test_url}/favicon.ico"

    @pytest.mark.asyncio
    async def test_scrape_url_http_error(self):
        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.side_effect = httpx.HTTPStatusError(
                "Not Found", request=MagicMock(), response=MagicMock(status_code=404)
            )
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            with pytest.raises(httpx.HTTPStatusError):
                await scrape_url(f"{self.test_url}/nonexistent")

    @pytest.mark.asyncio
    async def test_scrape_url_timeout(self):
        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.side_effect = httpx.TimeoutException("Timeout")
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            with pytest.raises(httpx.TimeoutException):
                await scrape_url("https://slow-site.com")

    @pytest.mark.asyncio
    async def test_scrape_url_returns_scraped_data_model(self):
        html_content = "<html><head><title>Test</title></head><body>Content</body></html>"

        mock_response = MagicMock()
        mock_response.text = html_content
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            result = await scrape_url(self.test_url)

            assert isinstance(result, ScrapedData)


class TestScrapedDataModel:
    def test_scraped_data_defaults(self):
        data = ScrapedData()
        assert data.title is None
        assert data.description is None
        assert data.content is None
        assert data.favicon_url is None

    def test_scraped_data_with_values(self):
        data = ScrapedData(
            title="Test Title",
            description="Test Description",
            content="Test Content",
            favicon_url="https://example.com/favicon.ico",
        )
        assert data.title == "Test Title"
        assert data.description == "Test Description"
        assert data.content == "Test Content"
        assert data.favicon_url == "https://example.com/favicon.ico"
