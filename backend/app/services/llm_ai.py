import json
import logging
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


# OpenRouter client (OpenAI-compatible)
client = AsyncOpenAI(
    api_key=settings.openrouter_api_key,
    base_url=settings.openrouter_base_url,
)


@dataclass
class BookmarkEnrichment:
    summary: str
    categories: list[str]


async def enrich_bookmark(
    title: str, description: str, content: str
) -> BookmarkEnrichment:
    """Generate a bookmark summary and categories in one LLM request."""
    prompt = f"""Analyze this website.

Title: {title}
Description: {description}
Content excerpt: {content[:10000]}

Summarize the content in 2-3 sentences and suggest 3-5 relevant categories."""

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "bookmark_enrichment",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "minItems": 3,
                            "maxItems": 5,
                        },
                    },
                    "required": ["summary", "categories"],
                    "additionalProperties": False,
                },
            },
        },
        extra_body={"reasoning": {"enabled": False}},
    )

    result = json.loads(response.choices[0].message.content or "{}")
    categories = [
        category.strip().lower().replace("_", " ")
        for category in result.get("categories", [])
        if category.strip()
    ]
    return BookmarkEnrichment(
        summary=result.get("summary", ""),
        categories=categories[:5],
    )


async def generate_categories(title: str, description: str, content: str) -> list[str]:
    """Generate tags for a bookmark using LLM."""
    prompt = f"""Analyze this website and suggest 3-5 relevant tags or categories.

Title: {title}
Content excerpt: {content[:10000]}

Return all the tags as a comma-separated list only, nothing else."""

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
        extra_body={"reasoning": {"enabled": False}}
    )

    tags_text = response.choices[0].message.content or ""
    # print(f"RAW category response - {response}")
    tags = [tag.strip().lower().replace("_", " ") for tag in tags_text.split(",") if tag.strip()]
    return tags[:5]


async def summarize_content(content: str) -> str:
    """Generate a summary of bookmark content."""
    logger.info(f"RAW summary content - {content[:1000]}")

    prompt = f"""Summarize the content in 2-3 sentences:

{content[:10000]}"""

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
        extra_body={"reasoning": {"enabled": False}}
    )

    return response.choices[0].message.content or ""
