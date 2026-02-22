import json

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # OpenRouter (OpenAI-compatible)
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    embedding_model: str = "openai/text-embedding-3-small"
    llm_model: str = "openai/gpt-4o-mini"

    # CORS — stored as raw str to avoid pydantic-settings v2 calling json.loads()
    # on list[str] fields before validators run. Accepts comma-separated URLs or
    # a JSON array string. Parsed into a list via the cors_origins_list property.
    # e.g. CORS_ORIGINS=https://foo.com,https://bar.com
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        v = self.cors_origins.strip()
        if v.startswith("["):
            return json.loads(v)
        return [o.strip() for o in v.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
