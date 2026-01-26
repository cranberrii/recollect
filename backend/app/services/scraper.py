import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel


class ScrapedData(BaseModel):
    title: str | None = None
    description: str | None = None
    content: str | None = None
    favicon_url: str | None = None


async def scrape_url(url: str, timeout: float = 10.0) -> ScrapedData:
    """
    Scrape a URL and extract title, description, content, and favicon.

    Args:
        url: The URL to scrape
        timeout: Request timeout in seconds

    Returns:
        ScrapedData with extracted information
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")

    title = _extract_title(soup)
    description = _extract_description(soup)
    content = _extract_content(soup)
    favicon_url = _extract_favicon(soup, url)

    return ScrapedData(
        title=title,
        description=description,
        content=content,
        favicon_url=favicon_url,
    )


def _extract_title(soup: BeautifulSoup) -> str | None:
    """Extract title from page, preferring og:title over <title>."""
    # Try Open Graph title first
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        return og_title["content"].strip()

    # Try Twitter title
    twitter_title = soup.find("meta", attrs={"name": "twitter:title"})
    if twitter_title and twitter_title.get("content"):
        return twitter_title["content"].strip()

    # Fall back to <title> tag
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        return title_tag.string.strip()

    return None


def _extract_description(soup: BeautifulSoup) -> str | None:
    """Extract description from meta tags."""
    # Try Open Graph description
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        return og_desc["content"].strip()

    # Try Twitter description
    twitter_desc = soup.find("meta", attrs={"name": "twitter:description"})
    if twitter_desc and twitter_desc.get("content"):
        return twitter_desc["content"].strip()

    # Try standard meta description
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        return meta_desc["content"].strip()

    return None


def _extract_content(soup: BeautifulSoup) -> str | None:
    """Extract main text content from the page."""
    # Remove script, style, and other non-content elements
    for element in soup(["script", "style", "nav", "header", "footer", "aside", "noscript"]):
        element.decompose()

    # Try to find main content area
    main_content = (
        soup.find("main")
        or soup.find("article")
        or soup.find("div", class_=lambda x: x and "content" in x.lower() if x else False)
        or soup.find("div", id=lambda x: x and "content" in x.lower() if x else False)
        or soup.body
    )

    if not main_content:
        return None

    # Get text and clean it up
    text = main_content.get_text(separator=" ", strip=True)

    # Normalize whitespace
    text = " ".join(text.split())

    # Limit content length to avoid storing huge amounts of text
    max_length = 50000
    if len(text) > max_length:
        text = text[:max_length] + "..."

    return text if text else None


def _extract_favicon(soup: BeautifulSoup, url: str) -> str | None:
    """Extract favicon URL from the page."""
    from urllib.parse import urljoin

    # Try various favicon link tags
    favicon_selectors = [
        ("link", {"rel": "icon"}),
        ("link", {"rel": "shortcut icon"}),
        ("link", {"rel": "apple-touch-icon"}),
        ("link", {"rel": "apple-touch-icon-precomposed"}),
    ]

    for tag, attrs in favicon_selectors:
        link = soup.find(tag, attrs)
        if link and link.get("href"):
            href = link["href"]
            # Handle relative URLs
            return urljoin(url, href)

    # Fall back to /favicon.ico
    from urllib.parse import urlparse

    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/favicon.ico"
