"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import type { CommunityPost, UserProfile, Book } from "@/types/database";
import { Heart, MessageCircle, AlertTriangle, Eye, User, BookOpen, Trash2 } from "lucide-react";

interface PostCardProps {
  post: CommunityPost & {
    user_profile?: UserProfile;
    book?: Book;
  };
  onDelete?: () => void;
  onOpenComments?: () => void;
}

export function PostCard({ post, onDelete, onOpenComments }: PostCardProps) {
  const { user } = useUser();
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        // Unlike
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);

        setLikesCount((prev) => prev - 1);
        setIsLiked(false);
      } else {
        // Like
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

  return (
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Book reference */}
        {post.book && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium">{post.book.nome_do_livro}</span>
              <span className="text-muted-foreground"> por {post.book.autor}</span>
            </span>
          </div>
        )}

        {/* Content */}
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
  );
}

