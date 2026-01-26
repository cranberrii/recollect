from openai import AsyncOpenAI

from app.core.config import settings

# OpenRouter client (OpenAI-compatible)
client = AsyncOpenAI(
    api_key=settings.openrouter_api_key,
    base_url=settings.openrouter_base_url,
)


async def get_embedding(text: str) -> list[float]:
    """Generate embedding for text using OpenRouter."""
    # Truncate text if too long (max ~8000 tokens for most models)
    text = text[:32000]  # qwen3-8b 32K tokens

    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=text,
        dimensions=1536  # orig qwen3-8b: 4096
    )

    return response.data[0].embedding
