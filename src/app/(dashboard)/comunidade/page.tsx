"use client";

import { useEffect, useState, useCallback } from "react";

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "@/components/features/post-card";
import { CreatePostModal } from "@/components/features/create-post-modal";
import { CommentsModal } from "@/components/features/comments-modal";
import { Button, Skeleton, EmptyState } from "@/components/ui";
import type { CommunityPost, UserProfile } from "@/types/database";
import { Plus, Users, RefreshCw } from "lucide-react";

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
          user_profile:users_profile(id, full_name, avatar_url, email)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Comunidade</h1>
          <p className="text-muted-foreground mt-1">
            Compartilhe suas leituras e descubra recomendações
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => fetchPosts(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo post
          </Button>
        </div>
      </div>

      {/* Posts grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Users className="w-16 h-16" />}
          title="Nenhum post ainda"
          description="Seja o primeiro a compartilhar algo com a comunidade!"
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro post
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

