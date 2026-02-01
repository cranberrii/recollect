-- Hybrid Search RPC Functions
-- Combines semantic search (vector similarity) with category keyword matching
-- Uses Reciprocal Rank Fusion (RRF) to combine results

-- Function for category-only search (no embedding required)
CREATE OR REPLACE FUNCTION public.search_by_categories(
  query_terms TEXT[],
  p_user_id UUID,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  url TEXT,
  title TEXT,
  description TEXT,
  summary TEXT,
  favicon_url TEXT,
  created_at TIMESTAMPTZ,
  category_score FLOAT,
  matched_categories TEXT[]
)
LANGUAGE SQL STABLE
AS $$
  WITH category_matches AS (
    -- Find categories that match any of the query terms (case-insensitive)
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      -- Count how many query terms this category matches
      (SELECT COUNT(*) FROM unnest(query_terms) qt WHERE c.name ILIKE '%' || qt || '%')::FLOAT AS match_count
    FROM public.categories c
    WHERE c.user_id = p_user_id
      AND EXISTS (
        SELECT 1 FROM unnest(query_terms) qt WHERE c.name ILIKE '%' || qt || '%'
      )
  ),
  bookmark_category_scores AS (
    -- Aggregate category matches per bookmark
    SELECT
      bc.bookmark_id,
      SUM(cm.match_count) AS category_score,
      ARRAY_AGG(DISTINCT cm.category_name) AS matched_categories
    FROM public.bookmark_categories bc
    INNER JOIN category_matches cm ON cm.category_id = bc.category_id
    GROUP BY bc.bookmark_id
  )
  SELECT
    b.id,
    b.url,
    b.title,
    b.description,
    b.summary,
    b.favicon_url,
    b.created_at,
    bcs.category_score,
    bcs.matched_categories
  FROM public.bookmarks b
  INNER JOIN bookmark_category_scores bcs ON bcs.bookmark_id = b.id
  WHERE b.user_id = p_user_id
  ORDER BY bcs.category_score DESC
  LIMIT match_count;
$$;

-- Function for hybrid search combining semantic and category search
CREATE OR REPLACE FUNCTION public.hybrid_search_bookmarks(
  query_embedding VECTOR(1536),
  query_terms TEXT[],
  p_user_id UUID,
  semantic_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20,
  rrf_k INT DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  url TEXT,
  title TEXT,
  description TEXT,
  summary TEXT,
  favicon_url TEXT,
  created_at TIMESTAMPTZ,
  semantic_score FLOAT,
  category_score FLOAT,
  rrf_score FLOAT,
  matched_categories TEXT[]
)
LANGUAGE SQL STABLE
AS $$
  WITH semantic_results AS (
    -- Semantic search with ranking
    SELECT
      b.id AS bookmark_id,
      1 - (be.embedding <=> query_embedding) AS similarity,
      ROW_NUMBER() OVER (ORDER BY be.embedding <=> query_embedding) AS semantic_rank
    FROM public.bookmarks b
    INNER JOIN public.bookmark_embeddings be ON be.bookmark_id = b.id
    WHERE b.user_id = p_user_id
      AND 1 - (be.embedding <=> query_embedding) > semantic_threshold
    ORDER BY be.embedding <=> query_embedding
    LIMIT match_count * 2  -- Get more candidates for fusion
  ),
  category_matches AS (
    -- Find categories that match any of the query terms
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      (SELECT COUNT(*) FROM unnest(query_terms) qt WHERE c.name ILIKE '%' || qt || '%')::FLOAT AS match_count
    FROM public.categories c
    WHERE c.user_id = p_user_id
      AND EXISTS (
        SELECT 1 FROM unnest(query_terms) qt WHERE c.name ILIKE '%' || qt || '%'
      )
  ),
  category_results AS (
    -- Category search with ranking
    SELECT
      bc.bookmark_id,
      SUM(cm.match_count) AS cat_score,
      ARRAY_AGG(DISTINCT cm.category_name) AS matched_cats,
      ROW_NUMBER() OVER (ORDER BY SUM(cm.match_count) DESC) AS category_rank
    FROM public.bookmark_categories bc
    INNER JOIN category_matches cm ON cm.category_id = bc.category_id
    INNER JOIN public.bookmarks b ON b.id = bc.bookmark_id
    WHERE b.user_id = p_user_id
    GROUP BY bc.bookmark_id
  ),
  combined_results AS (
    -- Combine results using RRF
    SELECT
      COALESCE(sr.bookmark_id, cr.bookmark_id) AS bookmark_id,
      COALESCE(sr.similarity, 0) AS semantic_score,
      COALESCE(cr.cat_score, 0) AS category_score,
      COALESCE(cr.matched_cats, ARRAY[]::TEXT[]) AS matched_categories,
      -- RRF formula: 1/(k + rank) for each method
      COALESCE(1.0 / (rrf_k + sr.semantic_rank), 0) +
      COALESCE(1.0 / (rrf_k + cr.category_rank), 0) AS rrf_score
    FROM semantic_results sr
    FULL OUTER JOIN category_results cr ON sr.bookmark_id = cr.bookmark_id
  )
  SELECT
    b.id,
    b.url,
    b.title,
    b.description,
    b.summary,
    b.favicon_url,
    b.created_at,
    cr.semantic_score,
    cr.category_score,
    cr.rrf_score,
    cr.matched_categories
  FROM combined_results cr
  INNER JOIN public.bookmarks b ON b.id = cr.bookmark_id
  ORDER BY cr.rrf_score DESC
  LIMIT match_count;
$$;
