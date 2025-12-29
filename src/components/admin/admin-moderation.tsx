"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  Modal,
  Badge,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { CommunityPost, PostComment } from "@/types/database";
import {
  MessageSquare,
  AlertTriangle,
  Trash2,
  Eye,
  RefreshCw,
  BookOpen,
  User,
  Calendar,
  Heart,
  MessageCircle,
} from "lucide-react";

const filterOptions = [
  { value: "all", label: "Todos" },
  { value: "spoiler", label: "Com spoiler" },
  { value: "recent", label: "Últimas 24h" },
];

export function AdminModeration() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<CommunityPost | null>(null);

  const supabase = createClient();
  const { showToast } = useToast();

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("community_posts")
        .select(
          `
          *,
          user_profile:users_profile(id, full_name, email)
        `
        )
        .order("created_at", { ascending: false });

      if (filter === "spoiler") {
        query = query.eq("has_spoiler", true);
      } else if (filter === "recent") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        query = query.gte("created_at", yesterday.toISOString());
      }

      const { data } = await query.limit(100);
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleViewDetails = (post: CommunityPost) => {
    setSelectedPost(post);
    setShowDetailsModal(true);
  };

  const handleDeleteClick = (post: CommunityPost) => {
    setPostToDelete(post);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;

    try {
      const response = await fetch(`/api/admin/posts?id=${postToDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir");
      }

      showToast("Post excluído com sucesso!", "success");
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      showToast("Erro ao excluir post", "error");
    } finally {
      setShowDeleteModal(false);
      setPostToDelete(null);
    }
  };

  const spoilerCount = posts.filter((p) => p.has_spoiler).length;

  return (
    <div className="space-y-6">
      {/* Filter and refresh */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={filterOptions}
          className="w-full sm:w-48"
        />
        <Button variant="outline" onClick={() => fetchPosts()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{posts.length}</p>
                <p className="text-sm text-muted-foreground">Posts totais</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{spoilerCount}</p>
                <p className="text-sm text-muted-foreground">Com spoiler</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Posts da Comunidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-12 h-12" />}
              title="Nenhum post encontrado"
              description="Não há posts correspondentes aos filtros."
            />
          ) : (
            <div className="divide-y">
              {posts.map((post) => (
                <div key={post.id} className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {post.user_profile?.full_name || "Usuário"}
                        </span>
                        {post.has_spoiler && (
                          <Badge variant="reading">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Spoiler
                          </Badge>
                        )}
                      </div>
                      {post.book_title && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <BookOpen className="w-3 h-3" />
                          {post.book_title} - {post.book_author}
                        </p>
                      )}
                      <p className="text-sm mt-2 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {post.comments_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(post)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(post)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details modal */}
      {selectedPost && (
        <PostDetailsModal
          post={selectedPost}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPost(null);
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {postToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setPostToDelete(null);
          }}
          title="Excluir Post"
        >
          <div className="space-y-4">
            <p>Tem certeza que deseja excluir este post?</p>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm line-clamp-3">{postToDelete.content}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. Todos os comentários e curtidas
              também serão removidos.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setPostToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PostDetailsModal({
  post,
  isOpen,
  onClose,
}: {
  post: CommunityPost;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchComments() {
      setIsLoading(true);
      const { data } = await supabase
        .from("post_comments")
        .select(
          `
          *,
          user_profile:users_profile(id, full_name)
        `
        )
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      setComments(data || []);
      setIsLoading(false);
    }

    if (isOpen) {
      fetchComments();
    }
  }, [post.id, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Post">
      <div className="space-y-6">
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">
              {post.user_profile?.full_name || "Usuário"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(post.created_at)}
            </p>
          </div>
        </div>

        {/* Book info */}
        {post.book_title && (
          <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {post.book_title} - {post.book_author}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="space-y-2">
          {post.has_spoiler && (
            <Badge variant="reading">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Contém spoiler
            </Badge>
          )}
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {post.likes_count} curtidas
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            {post.comments_count} comentários
          </span>
        </div>

        {/* Comments */}
        <div className="space-y-3">
          <h4 className="font-medium">Comentários</h4>
          {isLoading ? (
            <Skeleton className="h-20" />
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum comentário.</p>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {comment.user_profile?.full_name || "Usuário"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  );
}

