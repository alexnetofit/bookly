"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

export const dynamicConfig = "force-dynamic";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { PostCard } from "@/components/features/post-card";
import { Button, Skeleton, EmptyState, Card, CardContent } from "@/components/ui";
import type { CommunityPost, UserProfile } from "@/types/database";
import { Plus, Users, RefreshCw, Feather, Lock, Crown } from "lucide-react";

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

export default function ComunidadePage() {
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const supabase = createClient();
  const { profile } = useUser();

  // Verificar se usuário tem plano premium
  const paidPlans = ["explorer", "traveler", "devourer"];
  const isPremium = profile?.plan && 
    paidPlans.includes(profile.plan) && 
    profile.subscription_expires_at && 
    new Date(profile.subscription_expires_at) > new Date();

  const fetchPosts = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const { data } = await supabase
        .from("community_posts")
        .select(`
          *,
          user_profile:users_profile(id, full_name, username, avatar_url, email)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
            onClick={() => fetchPosts(true)}
            disabled={isRefreshing}
            className="rounded-full"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
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
      ) : posts.length === 0 ? (
        <div className="py-16">
          <EmptyState
            icon={<Users className="w-16 h-16" />}
            title="Nenhum post ainda"
            description="Seja o primeiro a compartilhar algo com a comunidade!"
            action={
              <Button onClick={() => setShowCreateModal(true)} className="rounded-full">
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro post
              </Button>
            }
          />
        </div>
      ) : (
        <div className="divide-y">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={() => fetchPosts()}
              onUpdate={() => fetchPosts()}
              onOpenComments={() => setSelectedPostId(post.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchPosts()}
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
