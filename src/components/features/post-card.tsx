"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import { Button, Badge, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { cn, formatDate } from "@/lib/utils";
import type { CommunityPost, UserProfile } from "@/types/database";
import {
  Heart,
  MessageCircle,
  AlertTriangle,
  Eye,
  BookOpen,
  Trash2,
  Pencil,
  Save,
  X,
  MoreHorizontal,
} from "lucide-react";

interface PostCardProps {
  post: CommunityPost & {
    user_profile?: UserProfile;
  };
  onDelete?: () => void;
  onOpenComments?: () => void;
  onUpdate?: () => void;
}

// Format relative time like Twitter
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function PostCard({ post, onDelete, onOpenComments, onUpdate }: PostCardProps) {
  const { user } = useUser();
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editHasSpoiler, setEditHasSpoiler] = useState(post.has_spoiler);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = user?.id === post.user_id;

  // Get user initials for avatar fallback
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  // Get handle from email
  const getHandle = (email: string | undefined) => {
    if (!email) return "";
    return "@" + email.split("@")[0];
  };

  // Check if user has liked this post
  useState(() => {
    if (user) {
      supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .single()
        .then(({ data }: { data: unknown }) => {
          if (data) setIsLiked(true);
        });
    }
  });

  const handleLike = async () => {
    if (!user) {
      showToast("Faça login para curtir posts", "error");
      return;
    }

    setIsLikeLoading(true);

    try {
      if (isLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);

        setLikesCount((prev) => prev - 1);
        setIsLiked(false);
      } else {
        await supabase.from("post_likes").insert({
          post_id: post.id,
          user_id: user.id,
        });

        setLikesCount((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      showToast("Erro ao processar curtida", "error");
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("community_posts").delete().eq("id", post.id);

      if (error) throw error;

      showToast("Post excluído", "success");
      onDelete?.();
    } catch (error) {
      console.error("Error deleting post:", error);
      showToast("Erro ao excluir post", "error");
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  const handleEdit = () => {
    setEditContent(post.content);
    setEditHasSpoiler(post.has_spoiler);
    setIsEditModalOpen(true);
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      showToast("O conteúdo não pode estar vazio", "error");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("community_posts")
        .update({
          content: editContent.trim(),
          has_spoiler: editHasSpoiler,
        })
        .eq("id", post.id);

      if (error) throw error;

      showToast("Post atualizado", "success");
      setIsEditModalOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error updating post:", error);
      showToast("Erro ao atualizar post", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <article className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center overflow-hidden">
              {post.user_profile?.avatar_url ? (
                <img
                  src={post.user_profile.avatar_url}
                  alt={post.user_profile.full_name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-primary">
                  {getInitials(post.user_profile?.full_name)}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1 flex-wrap min-w-0">
                <span className="font-semibold truncate">
                  {post.user_profile?.full_name || "Usuário"}
                </span>
                <span className="text-muted-foreground text-sm truncate">
                  {getHandle(post.user_profile?.email)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground text-sm">
                  {formatRelativeTime(post.created_at)}
                </span>
                {post.has_spoiler && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs py-0">
                      Spoiler
                    </Badge>
                  </>
                )}
              </div>

              {/* Menu */}
              {isOwner && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(!showMenu);
                    }}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  
                  {showMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowMenu(false)} 
                      />
                      <div className="absolute right-0 top-8 z-20 bg-card border rounded-xl shadow-lg py-1 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit();
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                          }}
                          disabled={isDeleting}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Book reference */}
            {post.book_title && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5" />
                <span>
                  {post.book_title}
                  {post.book_author && <span className="opacity-70"> · {post.book_author}</span>}
                </span>
              </div>
            )}

            {/* Post content */}
            <div className="mt-2">
              {post.has_spoiler && !spoilerRevealed ? (
                <div className="relative">
                  <p className="text-[15px] leading-relaxed spoiler-blur select-none">
                    {post.content}
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSpoilerRevealed(true);
                      }}
                      className="rounded-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Revelar spoiler
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 mt-3 -ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                disabled={isLikeLoading}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors",
                  isLiked
                    ? "text-rose-500 hover:bg-rose-500/10"
                    : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                )}
              >
                <Heart className={cn("w-[18px] h-[18px]", isLiked && "fill-current")} />
                <span>{likesCount > 0 ? likesCount : ""}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComments?.();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <MessageCircle className="w-[18px] h-[18px]" />
                <span>{post.comments_count > 0 ? post.comments_count : ""}</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Post"
      >
        <div className="space-y-4">
          {/* Book reference (read-only) */}
          {post.book_title && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span>
                <span className="font-medium">{post.book_title}</span>
                {post.book_author && (
                  <span className="text-muted-foreground"> · {post.book_author}</span>
                )}
              </span>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="O que você quer compartilhar?"
              className="min-h-[150px] text-[15px] resize-none border-0 focus:ring-0 p-0"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {editContent.length}/2000
            </p>
          </div>

          {/* Spoiler toggle */}
          <div className="flex items-center justify-between py-3 border-t">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm">Contém spoiler?</span>
            </div>
            <button
              type="button"
              onClick={() => setEditHasSpoiler(!editHasSpoiler)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                editHasSpoiler ? "bg-amber-500" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                  editHasSpoiler && "translate-x-5"
                )}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-full">
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} isLoading={isSaving} className="rounded-full">
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
