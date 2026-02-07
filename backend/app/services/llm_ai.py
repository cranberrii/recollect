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
Content excerpt: {content[:10000] if content else 'N/A'}

Return all the tags as a comma-separated list only, nothing else."""

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
        extra_body={"reasoning": {"enabled": False}}
    )

    tags_text = response.choices[0].message.content or ""
    # print(f"RAW category response - {response}")
    tags = [tag.strip().lower() for tag in tags_text.split(",") if tag.strip()]

    return tags[:5]


async def summarize_content(content: str) -> str:
    """Generate a summary of bookmark content."""
    print(f"RAW summary content - {content[:1000]}")

    prompt = f"""Summarize the content in 2-3 sentences:

{content[:10000]}"""

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
        extra_body={"reasoning": {"enabled": False}}
    )

    return response.choices[0].message.content or ""
