"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

export const dynamicConfig = "force-dynamic";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { PostCard } from "@/components/features/post-card";
import { Button, Skeleton, EmptyState, Card, CardContent } from "@/components/ui";
import type { CommunityPost, UserProfile } from "@/types/database";
import { Plus, Users, RefreshCw, Feather, Lock, Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterType = "todos" | "seguindo" | "nao_seguindo";

// Lazy load modals for better performance
const CreatePostModal = dynamic(
  () => import("@/components/features/create-post-modal").then(mod => ({ default: mod.CreatePostModal })),
  { ssr: false }
);

const CommentsModal = dynamic(
  () => import("@/components/features/comments-modal").then(mod => ({ default: mod.CommentsModal })),
  { ssr: false }
);

interface PostWithRelations extends CommunityPost {
  user_profile?: UserProfile;
}

const POSTS_PER_PAGE = 20;

export default function ComunidadePage() {
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  
  // Filtros
  const [filter, setFilter] = useState<FilterType>("todos");
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  
  // Scroll infinito
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();
  const { profile, user, isLoading: profileLoading } = useUser();

  // Verificar se usuário tem plano premium
  const paidPlans = ["explorer", "traveler", "devourer"];
  const isPremium = profile?.plan && 
    paidPlans.includes(profile.plan) && 
    profile.subscription_expires_at && 
    new Date(profile.subscription_expires_at) > new Date();

  // Buscar lista de usuários seguidos
  const fetchFollowing = useCallback(async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id);
    
    if (data) {
      setFollowingIds(data.map(f => f.following_id));
    }
  }, [user?.id]);

  const fetchPosts = useCallback(async (showRefreshIndicator = false, reset = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else if (reset) {
      setIsLoading(true);
    }

    const currentPage = reset ? 0 : page;
    const from = currentPage * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          user_profile:users_profile(id, full_name, username, avatar_url, email)
        `)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newPosts = data || [];
      
      if (reset) {
        setPosts(newPosts);
        setPage(0);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      setHasMore(newPosts.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [page]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    
    const from = nextPage * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    try {
      const { data } = await supabase
        .from("community_posts")
        .select(`
          *,
          user_profile:users_profile(id, full_name, username, avatar_url, email)
        `)
        .order("created_at", { ascending: false })
        .range(from, to);

      const newPosts = data || [];
      setPosts(prev => [...prev, ...newPosts]);
      setHasMore(newPosts.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, isLoadingMore, hasMore]);

  // Intersection Observer para scroll infinito
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, loadMore]);

  useEffect(() => {
    fetchPosts(false, true);
    fetchFollowing();
  }, []);

  useEffect(() => {
    fetchFollowing();
  }, [user?.id]);

  // Filtrar posts baseado no filtro selecionado
  const filteredPosts = posts.filter(post => {
    if (filter === "todos") return true;
    if (filter === "seguindo") return followingIds.includes(post.user_id);
    if (filter === "nao_seguindo") return !followingIds.includes(post.user_id) && post.user_id !== user?.id;
    return true;
  });

  const handleRefresh = () => {
    setPage(0);
    setHasMore(true);
    fetchPosts(true, true);
    fetchFollowing();
  };

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      setFollowingIds(prev => [...prev, userId]);
    } else {
      setFollowingIds(prev => prev.filter(id => id !== userId));
    }
  };

  // Mostrar loading enquanto profile carrega (profileLoading ou profile ainda não existe)
  if (profileLoading || !profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Mostrar tela de bloqueio para usuários grátis (depois de todos os hooks)
  if (profile && !isPremium) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Comunidade Premium</h2>
              <p className="text-muted-foreground">
                A comunidade é exclusiva para assinantes. Faça upgrade para interagir com outros leitores!
              </p>
            </div>

            <div className="space-y-3">
              <Link href="/planos">
                <Button size="lg" className="w-full">
                  <Crown className="w-4 h-4 mr-2" />
                  Ver Planos Premium
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Comunidade</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        
        {/* Filtros */}
        <div className="flex gap-2 mt-3">
          {(["todos", "seguindo", "nao_seguindo"] as FilterType[]).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                filter === filterOption
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {filterOption === "todos" && "Todos"}
              {filterOption === "seguindo" && "Seguindo"}
              {filterOption === "nao_seguindo" && "Descobrir"}
            </button>
          ))}
        </div>
      </div>

      {/* Composer prompt */}
      <div 
        className="flex items-center gap-4 p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setShowCreateModal(true)}
      >
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Seu avatar"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-lg font-semibold text-primary">
              {profile?.full_name?.charAt(0) || "?"}
            </span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground">O que você está lendo?</p>
        </div>
        <Button size="sm" className="rounded-full px-4">
          <Feather className="w-4 h-4 mr-2" />
          Postar
        </Button>
      </div>

      {/* Posts feed */}
      {isLoading ? (
        <div className="divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="flex gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-8">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-16">
          <EmptyState
            icon={<Users className="w-16 h-16" />}
            title={filter === "seguindo" ? "Nenhum post de quem você segue" : "Nenhum post ainda"}
            description={filter === "seguindo" 
              ? "Comece a seguir outros leitores para ver seus posts aqui!" 
              : "Seja o primeiro a compartilhar algo com a comunidade!"}
            action={
              filter === "seguindo" ? (
                <Button onClick={() => setFilter("todos")} className="rounded-full">
                  Ver todos os posts
                </Button>
              ) : (
                <Button onClick={() => setShowCreateModal(true)} className="rounded-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeiro post
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="divide-y">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={handleRefresh}
              onUpdate={handleRefresh}
              onOpenComments={() => setSelectedPostId(post.id)}
              onFollowChange={handleFollowChange}
            />
          ))}
          
          {/* Sentinel para scroll infinito */}
          <div ref={sentinelRef} className="py-4">
            {isLoadingMore && (
              <div className="flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasMore && filteredPosts.length > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Você chegou ao fim 📚
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleRefresh}
      />

      {selectedPostId && (
        <CommentsModal
          isOpen={!!selectedPostId}
          onClose={() => setSelectedPostId(null)}
          postId={selectedPostId}
        />
      )}
    </div>
  );
}
