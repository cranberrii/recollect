# Bookmark Orchestrator

AI-powered bookmark manager with semantic search & summarization capabilities.

## Architecture

- **Frontend**: Next.js 14+ (App Router) with Tailwind CSS
- **Browser Extension**: Chrome extension (Manifest V3)
- **Backend**: Python FastAPI
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenRouter (OpenAI-compatible API)

## Project Structure

```
bookmark-orchestrator/
├── apps/
│   ├── web/              # Next.js frontend
│   └── extension/        # Chrome extension
├── backend/              # FastAPI backend
├── supabase/             # Database migrations
└── packages/             # Shared code
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- Supabase account
- OpenRouter API key

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/bookmark-orchestrator.git
cd bookmark-orchestrator
```

2. Install dependencies:
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (using uv)
cd backend
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Set up Supabase:
```bash
# Run migrations (or apply via Supabase dashboard)
supabase login

supabase link

supabase db push
```

### Development

```bash
# Run all services
npm run dev

# Or run individually
npm run dev:web        # Next.js frontend (http://localhost:3000)
npm run dev:backend    # FastAPI backend (http://localhost:8000)
npm run dev:extension  # Chrome extension (load from apps/extension/dist)
```

### Building

```bash
# Build all
npm run build

# Build individually
npm run build:web
npm run build:extension
```

## Features

- Save bookmarks from browser extension
- AI-powered semantic search
- Automatic tagging and categorization
- Content extraction and summarization

## License

MIT


### TODO - Next steps:
1. Copy .env.example to .env and fill in your Supabase/OpenRouter credentials
2. Run npm install in the root
3. Run pip install -e . in backend/
4. Apply the Supabase migration via dashboard or supabase db push
5. Add extension icons (16x16, 48x48, 128x128 PNG) to apps/extension/icons/
6. Start development: npm run dev:web and npm run dev:backend
