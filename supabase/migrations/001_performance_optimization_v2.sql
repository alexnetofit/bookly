-- =============================================
-- MIGRAÇÃO: Otimização de Performance v2
-- Arquitetura definitiva com triggers incrementais
-- =============================================
-- Execute este arquivo no Supabase SQL Editor

-- =============================================
-- PARTE 1: ALTERAÇÃO NA TABELA BOOKS
-- Adiciona campo finished_at para métricas anuais
-- =============================================

-- Adicionar campo finished_at
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ DEFAULT NULL;

-- Índice para queries de métricas anuais
CREATE INDEX IF NOT EXISTS idx_books_finished_at 
  ON public.books(user_id, finished_at DESC) 
  WHERE finished_at IS NOT NULL;

-- Índice composto para user + status
CREATE INDEX IF NOT EXISTS idx_books_user_status 
  ON public.books(user_id, status_leitura);

-- Trigger para setar finished_at automaticamente
CREATE OR REPLACE FUNCTION public.set_finished_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é INSERT e status é 'lido', seta finished_at
  IF TG_OP = 'INSERT' AND NEW.status_leitura = 'lido' THEN
    NEW.finished_at := COALESCE(NEW.finished_at, NOW());
  
  -- Se é UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    -- Se mudou para 'lido' e não tinha finished_at, seta agora
    IF NEW.status_leitura = 'lido' AND OLD.status_leitura != 'lido' THEN
      NEW.finished_at := COALESCE(NEW.finished_at, NOW());
    
    -- Se saiu de 'lido' para outro status, limpa finished_at
    ELSIF NEW.status_leitura != 'lido' AND OLD.status_leitura = 'lido' THEN
      NEW.finished_at := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_finished_at ON public.books;
CREATE TRIGGER trg_set_finished_at
  BEFORE INSERT OR UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_finished_at();

-- =============================================
-- PARTE 2: TABELA USER_STATS
-- Estatísticas globais pré-calculadas do usuário
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.users_profile(id) ON DELETE CASCADE,
  
  -- Contadores de livros (incrementais)
  total_books INTEGER DEFAULT 0,
  books_lido INTEGER DEFAULT 0,
  books_lendo INTEGER DEFAULT 0,
  books_nao_comecou INTEGER DEFAULT 0,
  books_desistido INTEGER DEFAULT 0,
  
  -- Páginas (incremental - delta)
  total_pages_read INTEGER DEFAULT 0,
  
  -- Posts (incremental)
  total_posts INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON public.user_stats FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- PARTE 3: TABELA YEARLY_READING_STATS
-- Métricas de leitura por ano (baseado em finished_at)
-- =============================================

CREATE TABLE IF NOT EXISTS public.yearly_reading_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  
  books_read INTEGER DEFAULT 0,
  pages_read INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_yearly_stats_user_year 
  ON public.yearly_reading_stats(user_id, year DESC);

-- RLS
ALTER TABLE public.yearly_reading_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own yearly stats"
  ON public.yearly_reading_stats FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- PARTE 4: TABELA USER_AUTHORS
-- Contadores por autor (normalizado)
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  author_normalized TEXT NOT NULL,
  author_display TEXT NOT NULL,
  books_count INTEGER DEFAULT 0,
  books_read_count INTEGER DEFAULT 0,
  
  UNIQUE(user_id, author_normalized)
);

CREATE INDEX IF NOT EXISTS idx_user_authors_ranking 
  ON public.user_authors(user_id, books_read_count DESC);

-- RLS
ALTER TABLE public.user_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own authors"
  ON public.user_authors FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- PARTE 5: TABELA USER_GENRES
-- Contadores por gênero
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  genre TEXT NOT NULL,
  books_count INTEGER DEFAULT 0,
  books_read_count INTEGER DEFAULT 0,
  
  UNIQUE(user_id, genre)
);

CREATE INDEX IF NOT EXISTS idx_user_genres_ranking 
  ON public.user_genres(user_id, books_read_count DESC);

-- RLS
ALTER TABLE public.user_genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own genres"
  ON public.user_genres FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- PARTE 6: TRIGGER INCREMENTAL PARA USER_STATS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_user_stats_incremental()
RETURNS TRIGGER AS $$
DECLARE
  delta_total INTEGER := 0;
  delta_lido INTEGER := 0;
  delta_lendo INTEGER := 0;
  delta_nao_comecou INTEGER := 0;
  delta_desistido INTEGER := 0;
  delta_pages INTEGER := 0;
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);

  -- === INSERT ===
  IF TG_OP = 'INSERT' THEN
    delta_total := 1;
    delta_pages := COALESCE(NEW.paginas_lidas, 0);
    
    CASE NEW.status_leitura
      WHEN 'lido' THEN delta_lido := 1;
      WHEN 'lendo' THEN delta_lendo := 1;
      WHEN 'nao_comecou' THEN delta_nao_comecou := 1;
      WHEN 'desistido' THEN delta_desistido := 1;
    END CASE;

  -- === DELETE ===
  ELSIF TG_OP = 'DELETE' THEN
    delta_total := -1;
    delta_pages := -COALESCE(OLD.paginas_lidas, 0);
    
    CASE OLD.status_leitura
      WHEN 'lido' THEN delta_lido := -1;
      WHEN 'lendo' THEN delta_lendo := -1;
      WHEN 'nao_comecou' THEN delta_nao_comecou := -1;
      WHEN 'desistido' THEN delta_desistido := -1;
    END CASE;

  -- === UPDATE ===
  ELSIF TG_OP = 'UPDATE' THEN
    delta_pages := COALESCE(NEW.paginas_lidas, 0) - COALESCE(OLD.paginas_lidas, 0);
    
    IF OLD.status_leitura IS DISTINCT FROM NEW.status_leitura THEN
      CASE OLD.status_leitura
        WHEN 'lido' THEN delta_lido := -1;
        WHEN 'lendo' THEN delta_lendo := -1;
        WHEN 'nao_comecou' THEN delta_nao_comecou := -1;
        WHEN 'desistido' THEN delta_desistido := -1;
        ELSE NULL;
      END CASE;
      
      CASE NEW.status_leitura
        WHEN 'lido' THEN delta_lido := delta_lido + 1;
        WHEN 'lendo' THEN delta_lendo := delta_lendo + 1;
        WHEN 'nao_comecou' THEN delta_nao_comecou := delta_nao_comecou + 1;
        WHEN 'desistido' THEN delta_desistido := delta_desistido + 1;
        ELSE NULL;
      END CASE;
    END IF;
  END IF;

  -- Aplica deltas (UPSERT atômico)
  INSERT INTO public.user_stats (user_id, total_books, books_lido, books_lendo, 
    books_nao_comecou, books_desistido, total_pages_read, updated_at)
  VALUES (target_user_id, delta_total, delta_lido, delta_lendo,
    delta_nao_comecou, delta_desistido, delta_pages, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_books = public.user_stats.total_books + EXCLUDED.total_books,
    books_lido = public.user_stats.books_lido + EXCLUDED.books_lido,
    books_lendo = public.user_stats.books_lendo + EXCLUDED.books_lendo,
    books_nao_comecou = public.user_stats.books_nao_comecou + EXCLUDED.books_nao_comecou,
    books_desistido = public.user_stats.books_desistido + EXCLUDED.books_desistido,
    total_pages_read = public.user_stats.total_pages_read + EXCLUDED.total_pages_read,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_user_stats ON public.books;
CREATE TRIGGER trg_update_user_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_user_stats_incremental();

-- =============================================
-- PARTE 7: TRIGGER INCREMENTAL PARA YEARLY_READING_STATS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_yearly_stats_incremental()
RETURNS TRIGGER AS $$
DECLARE
  old_year INTEGER;
  new_year INTEGER;
  old_pages INTEGER;
  new_pages INTEGER;
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);

  -- === INSERT com finished_at ===
  IF TG_OP = 'INSERT' AND NEW.finished_at IS NOT NULL THEN
    new_year := EXTRACT(YEAR FROM NEW.finished_at)::INTEGER;
    new_pages := COALESCE(NEW.numero_de_paginas, 0);
    
    INSERT INTO public.yearly_reading_stats (user_id, year, books_read, pages_read)
    VALUES (target_user_id, new_year, 1, new_pages)
    ON CONFLICT (user_id, year) DO UPDATE SET
      books_read = public.yearly_reading_stats.books_read + 1,
      pages_read = public.yearly_reading_stats.pages_read + new_pages,
      updated_at = NOW();

  -- === DELETE com finished_at ===
  ELSIF TG_OP = 'DELETE' AND OLD.finished_at IS NOT NULL THEN
    old_year := EXTRACT(YEAR FROM OLD.finished_at)::INTEGER;
    old_pages := COALESCE(OLD.numero_de_paginas, 0);
    
    UPDATE public.yearly_reading_stats SET
      books_read = GREATEST(books_read - 1, 0),
      pages_read = GREATEST(pages_read - old_pages, 0),
      updated_at = NOW()
    WHERE user_id = target_user_id AND year = old_year;

  -- === UPDATE ===
  ELSIF TG_OP = 'UPDATE' THEN
    old_year := CASE WHEN OLD.finished_at IS NOT NULL 
                THEN EXTRACT(YEAR FROM OLD.finished_at)::INTEGER ELSE NULL END;
    new_year := CASE WHEN NEW.finished_at IS NOT NULL 
                THEN EXTRACT(YEAR FROM NEW.finished_at)::INTEGER ELSE NULL END;
    old_pages := COALESCE(OLD.numero_de_paginas, 0);
    new_pages := COALESCE(NEW.numero_de_paginas, 0);

    -- Caso 1: Livro era lido e deixou de ser
    IF old_year IS NOT NULL AND new_year IS NULL THEN
      UPDATE public.yearly_reading_stats SET
        books_read = GREATEST(books_read - 1, 0),
        pages_read = GREATEST(pages_read - old_pages, 0),
        updated_at = NOW()
      WHERE user_id = target_user_id AND year = old_year;

    -- Caso 2: Livro não era lido e virou lido
    ELSIF old_year IS NULL AND new_year IS NOT NULL THEN
      INSERT INTO public.yearly_reading_stats (user_id, year, books_read, pages_read)
      VALUES (target_user_id, new_year, 1, new_pages)
      ON CONFLICT (user_id, year) DO UPDATE SET
        books_read = public.yearly_reading_stats.books_read + 1,
        pages_read = public.yearly_reading_stats.pages_read + new_pages,
        updated_at = NOW();

    -- Caso 3: Mudou de ano
    ELSIF old_year IS NOT NULL AND new_year IS NOT NULL AND old_year != new_year THEN
      UPDATE public.yearly_reading_stats SET
        books_read = GREATEST(books_read - 1, 0),
        pages_read = GREATEST(pages_read - old_pages, 0),
        updated_at = NOW()
      WHERE user_id = target_user_id AND year = old_year;
      
      INSERT INTO public.yearly_reading_stats (user_id, year, books_read, pages_read)
      VALUES (target_user_id, new_year, 1, new_pages)
      ON CONFLICT (user_id, year) DO UPDATE SET
        books_read = public.yearly_reading_stats.books_read + 1,
        pages_read = public.yearly_reading_stats.pages_read + new_pages,
        updated_at = NOW();

    -- Caso 4: Mesmo ano, mas número de páginas mudou
    ELSIF old_year IS NOT NULL AND new_year IS NOT NULL AND old_year = new_year AND old_pages != new_pages THEN
      UPDATE public.yearly_reading_stats SET
        pages_read = pages_read + (new_pages - old_pages),
        updated_at = NOW()
      WHERE user_id = target_user_id AND year = new_year;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_yearly_stats ON public.books;
CREATE TRIGGER trg_update_yearly_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_yearly_stats_incremental();

-- =============================================
-- PARTE 8: TRIGGER INCREMENTAL PARA USER_AUTHORS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_user_authors_incremental()
RETURNS TRIGGER AS $$
DECLARE
  old_author_norm TEXT;
  new_author_norm TEXT;
  old_was_read BOOLEAN;
  new_is_read BOOLEAN;
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  old_author_norm := LOWER(TRIM(COALESCE(OLD.autor, '')));
  new_author_norm := LOWER(TRIM(COALESCE(NEW.autor, '')));
  old_was_read := COALESCE(OLD.status_leitura = 'lido', FALSE);
  new_is_read := COALESCE(NEW.status_leitura = 'lido', FALSE);

  -- === INSERT ===
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_authors (user_id, author_normalized, author_display, books_count, books_read_count)
    VALUES (target_user_id, new_author_norm, NEW.autor, 1, CASE WHEN new_is_read THEN 1 ELSE 0 END)
    ON CONFLICT (user_id, author_normalized) DO UPDATE SET
      books_count = public.user_authors.books_count + 1,
      books_read_count = public.user_authors.books_read_count + CASE WHEN new_is_read THEN 1 ELSE 0 END,
      author_display = EXCLUDED.author_display;

  -- === DELETE ===
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_authors SET
      books_count = GREATEST(books_count - 1, 0),
      books_read_count = GREATEST(books_read_count - CASE WHEN old_was_read THEN 1 ELSE 0 END, 0)
    WHERE user_id = target_user_id AND author_normalized = old_author_norm;
    
    DELETE FROM public.user_authors 
    WHERE user_id = target_user_id AND author_normalized = old_author_norm AND books_count <= 0;

  -- === UPDATE ===
  ELSIF TG_OP = 'UPDATE' THEN
    -- Autor mudou
    IF old_author_norm != new_author_norm THEN
      -- Decrementa autor antigo
      UPDATE public.user_authors SET
        books_count = GREATEST(books_count - 1, 0),
        books_read_count = GREATEST(books_read_count - CASE WHEN old_was_read THEN 1 ELSE 0 END, 0)
      WHERE user_id = target_user_id AND author_normalized = old_author_norm;
      
      DELETE FROM public.user_authors 
      WHERE user_id = target_user_id AND author_normalized = old_author_norm AND books_count <= 0;
      
      -- Incrementa autor novo
      INSERT INTO public.user_authors (user_id, author_normalized, author_display, books_count, books_read_count)
      VALUES (target_user_id, new_author_norm, NEW.autor, 1, CASE WHEN new_is_read THEN 1 ELSE 0 END)
      ON CONFLICT (user_id, author_normalized) DO UPDATE SET
        books_count = public.user_authors.books_count + 1,
        books_read_count = public.user_authors.books_read_count + CASE WHEN new_is_read THEN 1 ELSE 0 END,
        author_display = EXCLUDED.author_display;
    
    -- Mesmo autor, mas status mudou
    ELSIF old_was_read != new_is_read THEN
      UPDATE public.user_authors SET
        books_read_count = books_read_count + CASE WHEN new_is_read THEN 1 ELSE -1 END
      WHERE user_id = target_user_id AND author_normalized = new_author_norm;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_user_authors ON public.books;
CREATE TRIGGER trg_update_user_authors
  AFTER INSERT OR UPDATE OR DELETE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_user_authors_incremental();

-- =============================================
-- PARTE 9: TRIGGER INCREMENTAL PARA USER_GENRES
-- =============================================

CREATE OR REPLACE FUNCTION public.update_user_genres_incremental()
RETURNS TRIGGER AS $$
DECLARE
  old_genre TEXT;
  new_genre TEXT;
  old_was_read BOOLEAN;
  new_is_read BOOLEAN;
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  old_genre := OLD.genero;
  new_genre := NEW.genero;
  old_was_read := COALESCE(OLD.status_leitura = 'lido', FALSE);
  new_is_read := COALESCE(NEW.status_leitura = 'lido', FALSE);

  -- === INSERT ===
  IF TG_OP = 'INSERT' AND new_genre IS NOT NULL THEN
    INSERT INTO public.user_genres (user_id, genre, books_count, books_read_count)
    VALUES (target_user_id, new_genre, 1, CASE WHEN new_is_read THEN 1 ELSE 0 END)
    ON CONFLICT (user_id, genre) DO UPDATE SET
      books_count = public.user_genres.books_count + 1,
      books_read_count = public.user_genres.books_read_count + CASE WHEN new_is_read THEN 1 ELSE 0 END;

  -- === DELETE ===
  ELSIF TG_OP = 'DELETE' AND old_genre IS NOT NULL THEN
    UPDATE public.user_genres SET
      books_count = GREATEST(books_count - 1, 0),
      books_read_count = GREATEST(books_read_count - CASE WHEN old_was_read THEN 1 ELSE 0 END, 0)
    WHERE user_id = target_user_id AND genre = old_genre;
    
    DELETE FROM public.user_genres 
    WHERE user_id = target_user_id AND genre = old_genre AND books_count <= 0;

  -- === UPDATE ===
  ELSIF TG_OP = 'UPDATE' THEN
    -- Gênero mudou
    IF old_genre IS DISTINCT FROM new_genre THEN
      -- Decrementa gênero antigo
      IF old_genre IS NOT NULL THEN
        UPDATE public.user_genres SET
          books_count = GREATEST(books_count - 1, 0),
          books_read_count = GREATEST(books_read_count - CASE WHEN old_was_read THEN 1 ELSE 0 END, 0)
        WHERE user_id = target_user_id AND genre = old_genre;
        
        DELETE FROM public.user_genres 
        WHERE user_id = target_user_id AND genre = old_genre AND books_count <= 0;
      END IF;
      
      -- Incrementa gênero novo
      IF new_genre IS NOT NULL THEN
        INSERT INTO public.user_genres (user_id, genre, books_count, books_read_count)
        VALUES (target_user_id, new_genre, 1, CASE WHEN new_is_read THEN 1 ELSE 0 END)
        ON CONFLICT (user_id, genre) DO UPDATE SET
          books_count = public.user_genres.books_count + 1,
          books_read_count = public.user_genres.books_read_count + CASE WHEN new_is_read THEN 1 ELSE 0 END;
      END IF;
    
    -- Mesmo gênero, mas status mudou
    ELSIF new_genre IS NOT NULL AND old_was_read != new_is_read THEN
      UPDATE public.user_genres SET
        books_read_count = books_read_count + CASE WHEN new_is_read THEN 1 ELSE -1 END
      WHERE user_id = target_user_id AND genre = new_genre;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_user_genres ON public.books;
CREATE TRIGGER trg_update_user_genres
  AFTER INSERT OR UPDATE OR DELETE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_user_genres_incremental();

-- =============================================
-- PARTE 10: TRIGGER PARA POSTS EM USER_STATS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_user_stats_on_post_change()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  delta_posts INTEGER;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  IF TG_OP = 'INSERT' THEN
    delta_posts := 1;
  ELSIF TG_OP = 'DELETE' THEN
    delta_posts := -1;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  INSERT INTO public.user_stats (user_id, total_posts, updated_at)
  VALUES (target_user_id, delta_posts, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_posts = GREATEST(public.user_stats.total_posts + EXCLUDED.total_posts, 0),
    updated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_user_stats_on_post ON public.community_posts;
CREATE TRIGGER trg_update_user_stats_on_post
  AFTER INSERT OR DELETE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_user_stats_on_post_change();

-- =============================================
-- PARTE 11: RPC GET_DASHBOARD
-- =============================================

CREATE OR REPLACE FUNCTION public.get_dashboard(p_user_id UUID, p_year INTEGER DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  target_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
BEGIN
  SELECT json_build_object(
    'stats', (
      SELECT row_to_json(s.*)
      FROM public.user_stats s
      WHERE s.user_id = p_user_id
    ),
    'yearly', (
      SELECT row_to_json(y.*)
      FROM public.yearly_reading_stats y
      WHERE y.user_id = p_user_id AND y.year = target_year
    ),
    'goal', (
      SELECT row_to_json(g.*)
      FROM public.annual_goals g
      WHERE g.user_id = p_user_id AND g.year = target_year
    ),
    'top_authors', (
      SELECT COALESCE(json_agg(row_to_json(a.*)), '[]'::json)
      FROM (
        SELECT author_display as author, books_read_count as count
        FROM public.user_authors
        WHERE user_id = p_user_id AND books_read_count > 0
        ORDER BY books_read_count DESC
        LIMIT 5
      ) a
    ),
    'top_genres', (
      SELECT COALESCE(json_agg(row_to_json(g.*)), '[]'::json)
      FROM (
        SELECT genre, books_read_count as count
        FROM public.user_genres
        WHERE user_id = p_user_id AND books_read_count > 0
        ORDER BY books_read_count DESC
        LIMIT 5
      ) g
    ),
    'unique_authors', (
      SELECT COUNT(*)::INTEGER FROM public.user_authors WHERE user_id = p_user_id
    ),
    'unique_genres', (
      SELECT COUNT(*)::INTEGER FROM public.user_genres WHERE user_id = p_user_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTE 12: RPC RECALCULATE_USER_STATS (ADMIN)
-- =============================================

CREATE OR REPLACE FUNCTION public.recalculate_user_stats(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Recalcula user_stats
  INSERT INTO public.user_stats (user_id, total_books, books_lido, books_lendo, 
    books_nao_comecou, books_desistido, total_pages_read, total_posts, updated_at)
  SELECT 
    p_user_id,
    COUNT(*),
    COUNT(*) FILTER (WHERE status_leitura = 'lido'),
    COUNT(*) FILTER (WHERE status_leitura = 'lendo'),
    COUNT(*) FILTER (WHERE status_leitura = 'nao_comecou'),
    COUNT(*) FILTER (WHERE status_leitura = 'desistido'),
    COALESCE(SUM(paginas_lidas), 0),
    (SELECT COUNT(*) FROM public.community_posts WHERE user_id = p_user_id),
    NOW()
  FROM public.books WHERE user_id = p_user_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_books = EXCLUDED.total_books,
    books_lido = EXCLUDED.books_lido,
    books_lendo = EXCLUDED.books_lendo,
    books_nao_comecou = EXCLUDED.books_nao_comecou,
    books_desistido = EXCLUDED.books_desistido,
    total_pages_read = EXCLUDED.total_pages_read,
    total_posts = EXCLUDED.total_posts,
    updated_at = NOW();

  -- Recalcula yearly_reading_stats
  DELETE FROM public.yearly_reading_stats WHERE user_id = p_user_id;
  INSERT INTO public.yearly_reading_stats (user_id, year, books_read, pages_read)
  SELECT 
    p_user_id,
    EXTRACT(YEAR FROM finished_at)::INTEGER,
    COUNT(*),
    COALESCE(SUM(numero_de_paginas), 0)
  FROM public.books 
  WHERE user_id = p_user_id AND finished_at IS NOT NULL
  GROUP BY EXTRACT(YEAR FROM finished_at);

  -- Recalcula user_authors
  DELETE FROM public.user_authors WHERE user_id = p_user_id;
  INSERT INTO public.user_authors (user_id, author_normalized, author_display, books_count, books_read_count)
  SELECT 
    p_user_id,
    LOWER(TRIM(autor)),
    MAX(autor),
    COUNT(*),
    COUNT(*) FILTER (WHERE status_leitura = 'lido')
  FROM public.books WHERE user_id = p_user_id
  GROUP BY LOWER(TRIM(autor));

  -- Recalcula user_genres
  DELETE FROM public.user_genres WHERE user_id = p_user_id;
  INSERT INTO public.user_genres (user_id, genre, books_count, books_read_count)
  SELECT 
    p_user_id,
    genero,
    COUNT(*),
    COUNT(*) FILTER (WHERE status_leitura = 'lido')
  FROM public.books WHERE user_id = p_user_id AND genero IS NOT NULL
  GROUP BY genero;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTE 13: MIGRAÇÃO DE DADOS EXISTENTES
-- =============================================

-- 1. Seta finished_at para livros já lidos (usando updated_at como fallback)
UPDATE public.books 
SET finished_at = COALESCE(data_termino::TIMESTAMPTZ, updated_at)
WHERE status_leitura = 'lido' AND finished_at IS NULL;

-- 2. Popula todas as tabelas derivadas para usuários existentes
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM public.users_profile LOOP
    PERFORM public.recalculate_user_stats(user_record.id);
  END LOOP;
END $$;

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

