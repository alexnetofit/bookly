"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, Button, Badge, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { cn, formatDate } from "@/lib/utils";
import type { CommunityPost, UserProfile, Book } from "@/types/database";
import { Heart, MessageCircle, AlertTriangle, Eye, User, BookOpen, Trash2, Pencil, Save, X } from "lucide-react";

interface PostCardProps {
  post: CommunityPost & {
    user_profile?: UserProfile;
    book?: Book;
  };
  onDelete?: () => void;
  onOpenComments?: () => void;
  onUpdate?: () => void;
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
  
  // Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editHasSpoiler, setEditHasSpoiler] = useState(post.has_spoiler);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = user?.id === post.user_id;

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
    }
  };

  const handleEdit = () => {
    setEditContent(post.content);
    setEditHasSpoiler(post.has_spoiler);
    setIsEditModalOpen(true);
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
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                {post.user_profile?.avatar_url ? (
                  <img
                    src={post.user_profile.avatar_url}
                    alt={post.user_profile.full_name || "Avatar"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
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

            <div className="flex items-center gap-2">
              {post.has_spoiler && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Spoiler
                </Badge>
              )}
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleEdit}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Book reference - ALWAYS visible, even with spoiler */}
          {post.book && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">{post.book.nome_do_livro}</span>
                <span className="text-muted-foreground"> por {post.book.autor}</span>
              </span>
            </div>
          )}

          {/* Content - Only this part gets blurred for spoilers */}
          <div className="relative">
            {post.has_spoiler && !spoilerRevealed ? (
              <div className="relative">
                <p className="spoiler-blur select-none">{post.content}</p>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSpoilerRevealed(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Revelar spoiler
                  </Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{post.content}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <button
              onClick={handleLike}
              disabled={isLikeLoading}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors",
                isLiked
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-red-500"
              )}
            >
              <Heart
                className={cn("w-5 h-5", isLiked && "fill-current")}
              />
              <span>{likesCount}</span>
            </button>

            <button
              onClick={onOpenComments}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{post.comments_count}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Post"
      >
        <div className="space-y-4">
          {/* Book reference (read-only) */}
          {post.book && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">{post.book.nome_do_livro}</span>
                <span className="text-muted-foreground"> por {post.book.autor}</span>
              </span>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Conteúdo</label>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="O que você quer compartilhar?"
              className="min-h-[150px]"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {editContent.length}/2000
            </p>
          </div>

          {/* Spoiler toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">Contém spoiler?</span>
            </div>
            <button
              type="button"
              onClick={() => setEditHasSpoiler(!editHasSpoiler)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                editHasSpoiler ? "bg-yellow-500" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  editHasSpoiler ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} isLoading={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
