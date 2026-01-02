-- =============================================
-- MIGRAÇÃO: Filtro por Ano no Dashboard
-- Atualiza RPC get_dashboard para retornar dados filtrados por ano
-- =============================================

-- Atualiza a função get_dashboard para incluir dados filtrados por ano
CREATE OR REPLACE FUNCTION public.get_dashboard(p_user_id UUID, p_year INTEGER DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  target_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
BEGIN
  SELECT json_build_object(
    -- Stats globais (não mudam por ano)
    'stats', (
      SELECT row_to_json(s.*)
      FROM public.user_stats s
      WHERE s.user_id = p_user_id
    ),
    -- Estatísticas do ano (da tabela yearly_reading_stats)
    'yearly', (
      SELECT row_to_json(y.*)
      FROM public.yearly_reading_stats y
      WHERE y.user_id = p_user_id AND y.year = target_year
    ),
    -- Meta do ano
    'goal', (
      SELECT row_to_json(g.*)
      FROM public.annual_goals g
      WHERE g.user_id = p_user_id AND g.year = target_year
    ),
    -- Top autores do ano (baseado em finished_at)
    'top_authors', (
      SELECT COALESCE(json_agg(row_to_json(a.*)), '[]'::json)
      FROM (
        SELECT autor as author, COUNT(*) as count
        FROM public.books
        WHERE user_id = p_user_id 
          AND finished_at IS NOT NULL 
          AND EXTRACT(YEAR FROM finished_at) = target_year
        GROUP BY autor
        ORDER BY count DESC
        LIMIT 5
      ) a
    ),
    -- Top gêneros do ano (baseado em finished_at)
    'top_genres', (
      SELECT COALESCE(json_agg(row_to_json(g.*)), '[]'::json)
      FROM (
        SELECT genero as genre, COUNT(*) as count
        FROM public.books
        WHERE user_id = p_user_id 
          AND finished_at IS NOT NULL 
          AND genero IS NOT NULL
          AND EXTRACT(YEAR FROM finished_at) = target_year
        GROUP BY genero
        ORDER BY count DESC
        LIMIT 5
      ) g
    ),
    -- Contadores únicos do ano
    'unique_authors', (
      SELECT COUNT(DISTINCT autor)::INTEGER 
      FROM public.books 
      WHERE user_id = p_user_id 
        AND finished_at IS NOT NULL 
        AND EXTRACT(YEAR FROM finished_at) = target_year
    ),
    'unique_genres', (
      SELECT COUNT(DISTINCT genero)::INTEGER 
      FROM public.books 
      WHERE user_id = p_user_id 
        AND finished_at IS NOT NULL 
        AND genero IS NOT NULL
        AND EXTRACT(YEAR FROM finished_at) = target_year
    ),
    -- Posts do ano
    'posts_year', (
      SELECT COUNT(*)::INTEGER 
      FROM public.community_posts 
      WHERE user_id = p_user_id 
        AND EXTRACT(YEAR FROM created_at) = target_year
    ),
    -- Anos disponíveis para o filtro (anos com livros lidos ou metas)
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

