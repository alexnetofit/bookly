-- =============================================
-- MIGRAÇÃO: Comentários Editáveis
-- Adiciona suporte a edição de comentários
-- =============================================

-- Adicionar coluna updated_at na tabela post_comments
ALTER TABLE public.post_comments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NULL;

-- Criar índice para updated_at
CREATE INDEX IF NOT EXISTS idx_post_comments_updated_at 
ON public.post_comments(updated_at) 
WHERE updated_at IS NOT NULL;

-- Comentário
COMMENT ON COLUMN public.post_comments.updated_at IS 'Data/hora da última edição do comentário';

-- =============================================
-- CORREÇÃO: Recalcular contagem de comentários
-- Garante que todos os posts tenham a contagem correta
-- =============================================

UPDATE public.community_posts 
SET comments_count = (
  SELECT COUNT(*) 
  FROM public.post_comments 
  WHERE post_id = community_posts.id
);

-- Verificar/Criar triggers de contagem de comentários
-- (caso não existam no banco de produção)

CREATE OR REPLACE FUNCTION public.increment_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_posts
  SET comments_count = comments_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_posts
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_created ON public.post_comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.increment_comments_count();

DROP TRIGGER IF EXISTS on_comment_deleted ON public.post_comments;
CREATE TRIGGER on_comment_deleted
  AFTER DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.decrement_comments_count();

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================

