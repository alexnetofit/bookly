"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import { Modal, Button, Input, Skeleton, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { PostComment, UserProfile } from "@/types/database";
import { Send, User, MessageCircle, Trash2 } from "lucide-react";

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

interface CommentWithProfile extends PostComment {
  user_profile?: UserProfile;
}

export function CommentsModal({ isOpen, onClose, postId }: CommentsModalProps) {
  const { user } = useUser();
  const supabase = createClient();
  const { showToast } = useToast();

  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, postId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("post_comments")
        .select(`
          *,
          user_profile:users_profile(id, full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    if (!user) {
      showToast("Faça login para comentar", "error");
      return;
    }

    setIsSending(true);

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      showToast("Erro ao adicionar comentário", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      showToast("Comentário excluído", "success");
      fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      showToast("Erro ao excluir comentário", "error");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Comentários" className="max-w-lg">
      <div className="space-y-4">
        {/* Comments list */}
        <div className="max-h-[400px] overflow-y-auto space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : comments.length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="w-12 h-12" />}
              title="Nenhum comentário"
              description="Seja o primeiro a comentar!"
            />
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="p-3 rounded-lg bg-muted/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      {comment.user_profile?.avatar_url ? (
                        <img
                          src={comment.user_profile.avatar_url}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {comment.user_profile?.full_name || "Usuário"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                  </div>

                  {user?.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <p className="text-sm">{comment.content}</p>
              </div>
            ))
          )}
        </div>

        {/* New comment input */}
        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva um comentário..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button onClick={handleSubmit} isLoading={isSending} disabled={!newComment.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}


