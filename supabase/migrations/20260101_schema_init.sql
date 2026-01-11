-- Enable pgvector extension for embeddings
create extension if not exists vector with schema extensions;

-- Bookmarks table
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text,
  description text,
  content text,
  favicon_url text,
  -- AI-generated fields
  summary text,
  key_points jsonb,  -- Array of key points
  categories text[], -- Auto-assigned categories
  -- User fields
  custom_categories text[],
  notes text,
  is_favorite boolean default false,
  is_archived boolean default false,
  -- metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_visited_at timestamptz,
  -- For dead link detection
  last_checked_at timestamptz,
  is_dead boolean default false,
  -- Full-text search
  search_vector TSVECTOR,

  UNIQUE(user_id, url)
);

-- Vector embeddings for semantic search
create table public.bookmark_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  embedding VECTOR(1536), -- OpenAI embedding dimension
  created_at timestamptz default NOW(),
  updated_at timestamptz default now(),
);

-- Index for vector similarity search (cosine distance)
create index bookmarks_embedd_idx on public.bookmarks
  using hnsw (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for user lookups
create index bookmarks_user_id_idx on public.bookmarks(user_id);

-- Index for URL uniqueness per user
create unique index bookmarks_user_url_idx on public.bookmarks(user_id, url);

-- Categories (predefined + user-created)
create table public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false, -- True for predefined
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Archived page content
create table public.archived_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  html_content TEXT,
  text_content TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
alter table public.bookmarks enable row level security;

-- RLS policies: users can only access their own bookmarks
create policy "Users can view own bookmarks"
  on public.bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bookmarks"
  on public.bookmarks for update
  using (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on public.bookmarks for delete
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger bookmarks_updated_at
  before update on public.bookmarks
  for each row
  execute function public.handle_updated_at();

-- Function for semantic search
create or replace function public.search_bookmarks(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  p_user_id uuid default auth.uid()
)
returns table (
  id uuid,
  url text,
  title text,
  description text,
  tags text[],
  similarity float
)
language sql stable
as $$
  select
    bookmarks.id,
    bookmarks.url,
    bookmarks.title,
    bookmarks.description,
    bookmarks.tags,
    1 - (bookmarks.embedding <=> query_embedding) as similarity
  from public.bookmarks
  where bookmarks.user_id = p_user_id
    and bookmarks.embedding is not null
    and 1 - (bookmarks.embedding <=> query_embedding) > match_threshold
  order by bookmarks.embedding <=> query_embedding
  limit match_count;
$$;
