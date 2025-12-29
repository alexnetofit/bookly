-- =============================================
-- BOOKLY DATABASE SCHEMA
-- =============================================
-- Execute este arquivo no Supabase SQL Editor
-- para criar todas as tabelas e políticas RLS

-- =============================================
-- TIPOS ENUM
-- =============================================

CREATE TYPE reading_status AS ENUM ('nao_comecou', 'lendo', 'lido', 'desistido');
CREATE TYPE plan_type AS ENUM ('explorer', 'traveler', 'devourer');

-- =============================================
-- TABELA: users_profile
-- Extensão do auth.users com dados do perfil
-- =============================================

CREATE TABLE IF NOT EXISTS public.users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan plan_type,
  subscription_expires_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por email (usado no webhook)
CREATE INDEX idx_users_profile_email ON public.users_profile(email);

-- =============================================
-- TRIGGER: Criar perfil automaticamente
-- quando um usuário se cadastra
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TABELA: books
-- Livros do usuário
-- =============================================

CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  nome_do_livro TEXT NOT NULL,
  autor TEXT NOT NULL,
  numero_de_paginas INTEGER NOT NULL CHECK (numero_de_paginas > 0),
  descricao TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status_leitura reading_status NOT NULL DEFAULT 'nao_comecou',
  paginas_lidas INTEGER DEFAULT 0 CHECK (paginas_lidas >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: páginas lidas não pode ser maior que total de páginas
  CONSTRAINT paginas_lidas_valido CHECK (paginas_lidas <= numero_de_paginas)
);

-- Indexes para performance
CREATE INDEX idx_books_user_id ON public.books(user_id);
CREATE INDEX idx_books_status ON public.books(status_leitura);
CREATE INDEX idx_books_autor ON public.books(autor);
CREATE INDEX idx_books_created_at ON public.books(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_books_updated_at ON public.books;
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- TABELA: annual_goals
-- Metas anuais de leitura
-- =============================================

CREATE TABLE IF NOT EXISTS public.annual_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  goal_amount INTEGER NOT NULL CHECK (goal_amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Um usuário só pode ter uma meta por ano
  UNIQUE(user_id, year)
);

CREATE INDEX idx_annual_goals_user_year ON public.annual_goals(user_id, year);

-- =============================================
-- TABELA: community_posts
-- Posts da comunidade
-- =============================================

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  has_spoiler BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at DESC);

-- =============================================
-- TABELA: post_likes
-- Curtidas nos posts
-- =============================================

CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Um usuário só pode curtir um post uma vez
  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_post_likes_post_id ON public.post_likes(post_id);

-- Triggers para atualizar contagem de likes
CREATE OR REPLACE FUNCTION public.increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_posts
  SET likes_count = likes_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_posts
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_created ON public.post_likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.increment_likes_count();

DROP TRIGGER IF EXISTS on_like_deleted ON public.post_likes;
CREATE TRIGGER on_like_deleted
  AFTER DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.decrement_likes_count();

-- =============================================
-- TABELA: post_comments
-- Comentários nos posts
-- =============================================

CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_created_at ON public.post_comments(created_at DESC);

-- Triggers para atualizar contagem de comentários
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
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS: users_profile
-- =============================================

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.users_profile FOR SELECT
  USING (auth.uid() = id);

-- Usuários podem atualizar seu próprio perfil (exceto is_admin e assinatura)
CREATE POLICY "Users can update own profile"
  ON public.users_profile FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Usuários podem ver perfis públicos (para comunidade)
CREATE POLICY "Users can view public profiles"
  ON public.users_profile FOR SELECT
  USING (true);

-- =============================================
-- POLÍTICAS: books
-- =============================================

-- Usuários só podem ver seus próprios livros
CREATE POLICY "Users can view own books"
  ON public.books FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários só podem criar livros para si mesmos
CREATE POLICY "Users can create own books"
  ON public.books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários só podem atualizar seus próprios livros
CREATE POLICY "Users can update own books"
  ON public.books FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuários só podem deletar seus próprios livros
CREATE POLICY "Users can delete own books"
  ON public.books FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS: annual_goals
-- =============================================

CREATE POLICY "Users can view own goals"
  ON public.annual_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
  ON public.annual_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.annual_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.annual_goals FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS: community_posts
-- =============================================

-- Todos podem ver posts
CREATE POLICY "Anyone can view posts"
  ON public.community_posts FOR SELECT
  USING (true);

-- Usuários autenticados podem criar posts
CREATE POLICY "Users can create posts"
  ON public.community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Apenas o autor pode atualizar seu post
CREATE POLICY "Users can update own posts"
  ON public.community_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Apenas o autor pode deletar seu post
CREATE POLICY "Users can delete own posts"
  ON public.community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS: post_likes
-- =============================================

CREATE POLICY "Anyone can view likes"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS: post_comments
-- =============================================

CREATE POLICY "Anyone can view comments"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.post_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- PERMISSÕES PARA SERVICE ROLE (webhooks)
-- O service role tem acesso total às tabelas
-- Isso é usado pelo endpoint de webhook
-- =============================================

-- Nota: O Supabase service_role key já tem bypass RLS por padrão

-- =============================================
-- TABELA: book_search_cache
-- Cache de buscas de livros externos
-- =============================================

CREATE TABLE IF NOT EXISTS public.book_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL UNIQUE,
  results_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_book_search_cache_query ON public.book_search_cache(query);
CREATE INDEX idx_book_search_cache_expires ON public.book_search_cache(expires_at);

-- Não precisa de RLS pois será acessado apenas pelo service role
ALTER TABLE public.book_search_cache ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública do cache (para performance)
CREATE POLICY "Anyone can read cache"
  ON public.book_search_cache FOR SELECT
  USING (true);

-- =============================================
-- FIM DO SCHEMA
-- =============================================

