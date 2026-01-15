-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Drop all existing tables (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS public.archived_content CASCADE;
DROP TABLE IF EXISTS public.bookmark_categories CASCADE;
DROP TABLE IF EXISTS public.bookmark_embeddings CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.bookmarks CASCADE;

-- Bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  content TEXT,
  favicon_url TEXT,
  -- AI-generated fields
  summary TEXT,
  key_points JSONB,  -- Array of key points
  -- User fields
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  -- metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_visited_at TIMESTAMPTZ,
  -- For dead link detection
  last_checked_at TIMESTAMPTZ,
  is_dead BOOLEAN DEFAULT FALSE,
  -- Full-text search
  search_vector TSVECTOR,

  UNIQUE(user_id, url)
);

-- Vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS public.bookmark_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  embedding VECTOR(1536), -- OpenAI embedding dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS bookmark_embeddings_idx ON public.bookmark_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON public.bookmarks(user_id);

-- Index for URL uniqueness per user
CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_user_url_idx ON public.bookmarks(user_id, url);

-- Categories table: system (global, pre-defined), ai (AI-generated per user), user (user-created)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'ai', 'user')),
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- system categories have no user_id, ai/user categories require user_id
  CONSTRAINT categories_user_id_check CHECK (
    (type = 'system' AND user_id IS NULL) OR
    (type IN ('ai', 'user') AND user_id IS NOT NULL)
  )
);

-- Junction table linking bookmarks to categories
CREATE TABLE IF NOT EXISTS public.bookmark_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  assigned_by TEXT NOT NULL CHECK (assigned_by IN ('ai', 'user')), -- only AI or user
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1), -- AI confidence score (null for user-assigned)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bookmark_id, category_id)
);

-- Indexes for efficient category lookups
CREATE INDEX IF NOT EXISTS bookmark_categories_bookmark_idx ON public.bookmark_categories(bookmark_id);
CREATE INDEX IF NOT EXISTS bookmark_categories_category_idx ON public.bookmark_categories(category_id);

-- Archived page content
CREATE TABLE IF NOT EXISTS public.archived_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  html_content TEXT,
  text_content TEXT,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own bookmarks
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can update own bookmarks"
  ON public.bookmarks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on bookmark_embeddings
ALTER TABLE public.bookmark_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies for bookmark_embeddings (access via parent bookmark ownership)
-- CREATE POLICY "Users can view embeddings for own bookmarks"
--   ON public.bookmark_embeddings FOR SELECT
--   USING (EXISTS (
--     SELECT 1 FROM public.bookmarks
--     WHERE bookmarks.id = bookmark_embeddings.bookmark_id
--       AND bookmarks.user_id = auth.uid()
--   ));
--
-- CREATE POLICY "Users can insert embeddings for own bookmarks"
--   ON public.bookmark_embeddings FOR INSERT
--   WITH CHECK (EXISTS (
--     SELECT 1 FROM public.bookmarks
--     WHERE bookmarks.id = bookmark_embeddings.bookmark_id
--       AND bookmarks.user_id = auth.uid()
--   ));
--
-- CREATE POLICY "Users can update embeddings for own bookmarks"
--   ON public.bookmark_embeddings FOR UPDATE
--   USING (EXISTS (
--     SELECT 1 FROM public.bookmarks
--     WHERE bookmarks.id = bookmark_embeddings.bookmark_id
--       AND bookmarks.user_id = auth.uid()
--   ));
--
-- CREATE POLICY "Users can delete embeddings for own bookmarks"
--   ON public.bookmark_embeddings FOR DELETE
--   USING (EXISTS (
--     SELECT 1 FROM public.bookmarks
--     WHERE bookmarks.id = bookmark_embeddings.bookmark_id
--       AND bookmarks.user_id = auth.uid()
--   ));

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
DROP POLICY IF EXISTS "Users can view own and system categories" ON public.categories;
CREATE POLICY "Users can view own and system categories"
  ON public.categories FOR SELECT
  USING (user_id = auth.uid() OR type = 'system');

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories"
  ON public.categories FOR INSERT
  WITH CHECK (user_id = auth.uid() AND type IN ('ai', 'user'));

DROP POLICY IF EXISTS "Users can update own user categories" ON public.categories;
CREATE POLICY "Users can update own user categories"
  ON public.categories FOR UPDATE
  USING (user_id = auth.uid() AND type = 'user');

DROP POLICY IF EXISTS "Users can delete own user categories" ON public.categories;
CREATE POLICY "Users can delete own user categories"
  ON public.categories FOR DELETE
  USING (user_id = auth.uid() AND type = 'user');

-- Enable RLS on bookmark_categories
ALTER TABLE public.bookmark_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for bookmark_categories (access via parent bookmark ownership)
DROP POLICY IF EXISTS "Users can view own bookmark categories" ON public.bookmark_categories;
CREATE POLICY "Users can view own bookmark categories"
  ON public.bookmark_categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bookmarks
    WHERE bookmarks.id = bookmark_categories.bookmark_id
      AND bookmarks.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own bookmark categories" ON public.bookmark_categories;
CREATE POLICY "Users can insert own bookmark categories"
  ON public.bookmark_categories FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bookmarks
    WHERE bookmarks.id = bookmark_categories.bookmark_id
      AND bookmarks.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete own bookmark categories" ON public.bookmark_categories;
CREATE POLICY "Users can delete own bookmark categories"
  ON public.bookmark_categories FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.bookmarks
    WHERE bookmarks.id = bookmark_categories.bookmark_id
      AND bookmarks.user_id = auth.uid()
  ));

-- Enable RLS on archived_content
ALTER TABLE public.archived_content ENABLE ROW LEVEL SECURITY;

-- RLS policies for archived_content (access via parent bookmark ownership)
DROP POLICY IF EXISTS "Users can view archived content for own bookmarks" ON public.archived_content;
CREATE POLICY "Users can view archived content for own bookmarks"
  ON public.archived_content FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bookmarks
    WHERE bookmarks.id = archived_content.bookmark_id
      AND bookmarks.user_id = auth.uid()
  ));

-- CREATE POLICY "Users can insert archived content for own bookmarks"
--   ON public.archived_content FOR INSERT
--   WITH CHECK (EXISTS (
--     SELECT 1 FROM public.bookmarks
--     WHERE bookmarks.id = archived_content.bookmark_id
--       AND bookmarks.user_id = auth.uid()
--   ));
--
-- CREATE POLICY "Users can update archived content for own bookmarks"
--   ON public.archived_content FOR UPDATE
--   USING (EXISTS (
--     SELECT 1 FROM public.bookmarks
--     WHERE bookmarks.id = archived_content.bookmark_id
--       AND bookmarks.user_id = auth.uid()
--   ));
--
-- CREATE POLICY "Users can delete archived content for own bookmarks"
--   ON public.archived_content FOR DELETE
--   USING (EXISTS (
--     SELECT 1 FROM public.bookmarks
--     WHERE bookmarks.id = archived_content.bookmark_id
--       AND bookmarks.user_id = auth.uid()
--   ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS bookmarks_updated_at ON public.bookmarks;
CREATE TRIGGER bookmarks_updated_at
  BEFORE UPDATE ON public.bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function for semantic search
DROP FUNCTION IF EXISTS public.search_bookmarks;
CREATE OR REPLACE FUNCTION public.search_bookmarks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  url TEXT,
  title TEXT,
  description TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    b.id,
    b.url,
    b.title,
    b.description,
    1 - (be.embedding <=> query_embedding) AS similarity
  FROM public.bookmarks b
  INNER JOIN public.bookmark_embeddings be ON be.bookmark_id = b.id
  WHERE b.user_id = p_user_id
    AND 1 - (be.embedding <=> query_embedding) > match_threshold
  ORDER BY be.embedding <=> query_embedding
  LIMIT match_count;
$$;
