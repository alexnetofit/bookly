-- =============================================
-- MIGRAÇÃO: Suporte a "Todos os anos" no Dashboard
-- Quando p_year = 0, retorna dados globais sem filtro de ano
-- =============================================

CREATE OR REPLACE FUNCTION public.get_dashboard(p_user_id UUID, p_year INTEGER DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  target_year INTEGER := p_year;
  filter_by_year BOOLEAN := (p_year IS NOT NULL AND p_year > 0);
BEGIN
  SELECT json_build_object(
    -- Stats globais (não mudam por ano)
    'stats', (
      SELECT row_to_json(s.*)
      FROM public.user_stats s
      WHERE s.user_id = p_user_id
    ),
    -- Estatísticas do ano (da tabela yearly_reading_stats)
    -- Se filter_by_year = false, retorna null (usa stats globais no frontend)
    'yearly', (
      CASE WHEN filter_by_year THEN
        (SELECT row_to_json(y.*)
         FROM public.yearly_reading_stats y
         WHERE y.user_id = p_user_id AND y.year = target_year)
      ELSE NULL END
    ),
    -- Meta do ano (só faz sentido filtrar por ano)
    'goal', (
      CASE WHEN filter_by_year THEN
        (SELECT row_to_json(g.*)
         FROM public.annual_goals g
         WHERE g.user_id = p_user_id AND g.year = target_year)
      ELSE NULL END
    ),
    -- Top autores (filtrado por ano = só lidos, global = todos os livros)
    'top_authors', (
      SELECT COALESCE(json_agg(row_to_json(a.*)), '[]'::json)
      FROM (
        SELECT autor as author, COUNT(*) as count
        FROM public.books
        WHERE user_id = p_user_id 
          AND (NOT filter_by_year OR (finished_at IS NOT NULL AND EXTRACT(YEAR FROM finished_at) = target_year))
        GROUP BY autor
        ORDER BY count DESC
        LIMIT 5
      ) a
    ),
    -- Top gêneros (filtrado por ano = só lidos, global = todos os livros)
    'top_genres', (
      SELECT COALESCE(json_agg(row_to_json(g.*)), '[]'::json)
      FROM (
        SELECT genero as genre, COUNT(*) as count
        FROM public.books
        WHERE user_id = p_user_id 
          AND genero IS NOT NULL
          AND (NOT filter_by_year OR (finished_at IS NOT NULL AND EXTRACT(YEAR FROM finished_at) = target_year))
        GROUP BY genero
        ORDER BY count DESC
        LIMIT 5
      ) g
    ),
    -- Contadores únicos (filtrado por ano = só lidos, global = todos os livros)
    'unique_authors', (
      SELECT COUNT(DISTINCT autor)::INTEGER 
      FROM public.books 
      WHERE user_id = p_user_id 
        AND (NOT filter_by_year OR (finished_at IS NOT NULL AND EXTRACT(YEAR FROM finished_at) = target_year))
    ),
    'unique_genres', (
      SELECT COUNT(DISTINCT genero)::INTEGER 
      FROM public.books 
      WHERE user_id = p_user_id 
        AND genero IS NOT NULL
        AND (NOT filter_by_year OR (finished_at IS NOT NULL AND EXTRACT(YEAR FROM finished_at) = target_year))
    ),
    -- Posts (filtrado ou global)
    'posts_year', (
      SELECT COUNT(*)::INTEGER 
      FROM public.community_posts 
      WHERE user_id = p_user_id 
        AND (NOT filter_by_year OR EXTRACT(YEAR FROM created_at) = target_year)
    ),
    -- Livros abandonados (filtrado ou global)
    'abandoned_year', (
      SELECT COUNT(*)::INTEGER 
      FROM public.books 
      WHERE user_id = p_user_id 
        AND status_leitura = 'desistido'
        AND (NOT filter_by_year OR EXTRACT(YEAR FROM updated_at) = target_year)
    ),
    -- Anos disponíveis para o filtro
    'available_years', (
      SELECT COALESCE(json_agg(DISTINCT year ORDER BY year DESC), '[]'::json)
      FROM (
        SELECT EXTRACT(YEAR FROM finished_at)::INTEGER as year
        FROM public.books
        WHERE user_id = p_user_id AND finished_at IS NOT NULL
        UNION
        SELECT year FROM public.annual_goals WHERE user_id = p_user_id
      ) years
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

