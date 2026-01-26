from openai import AsyncOpenAI

from app.core.config import settings


# OpenRouter client (OpenAI-compatible)
client = AsyncOpenAI(
    api_key=settings.openrouter_api_key,
    base_url=settings.openrouter_base_url,
)


async def generate_categories(title: str, description: str, content: str) -> list[str]:
    """Generate tags for a bookmark using LLM."""
    prompt = f"""Analyze this website and suggest 3-5 relevant tags or categories.

Title: {title}
Description: {description}
Content excerpt: {content[:10000] if content else 'N/A'}

Return only the tags as a comma-separated list, nothing else."""

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=256,  # TODO - why no generation?
    )

    tags_text = response.choices[0].message.content or ""
    tags = [tag.strip().lower() for tag in tags_text.split(",") if tag.strip()]

    return tags[:5]


async def summarize_content(content: str) -> str:
    """Generate a summary of bookmark content."""
    prompt = f"""Summarize the content in 2-3 sentences:

{content[:10000]}"""

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[{
            "role": "user", "content": prompt
        }],
        max_tokens=256,
    )

    return response.choices[0].message.content or ""
