"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import { Modal, Button, Skeleton, EmptyState } from "@/components/ui";
import type { PostComment, UserProfile } from "@/types/database";
import { Send, MessageCircle, Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

interface CommentWithProfile extends PostComment {
  user_profile?: UserProfile;
  updated_at?: string | null;
}

// Format relative time
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

// Get initials
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function CommentsModal({ isOpen, onClose, postId }: CommentsModalProps) {
  const { user, profile } = useUser();
  const supabase = createClient();
  const { showToast } = useToast();

  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
          user_profile:users_profile(id, full_name, username, avatar_url, email)
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

  const startEditing = (comment: CommentWithProfile) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !editingId) return;

    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from("post_comments")
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) throw error;

      showToast("Comentário editado", "success");
      setEditingId(null);
      setEditContent("");
      fetchComments();
    } catch (error) {
      console.error("Error updating comment:", error);
      showToast("Erro ao editar comentário", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Comentários" className="max-w-lg">
      <div className="space-y-0">
        {/* Comments list */}
        <div className="max-h-[400px] overflow-y-auto -mx-5 px-5">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={<MessageCircle className="w-10 h-10" />}
                title="Nenhum comentário"
                description="Seja o primeiro a comentar!"
              />
            </div>
          ) : (
            <div className="divide-y">
              {comments.map((comment) => (
                <div key={comment.id} className="py-3 group">
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center overflow-hidden">
                        {comment.user_profile?.avatar_url ? (
                          <img
                            src={comment.user_profile.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-primary">
                            {getInitials(comment.user_profile?.full_name)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">
                          {comment.user_profile?.full_name || "Usuário"}
                        </span>
                        <span className="text-muted-foreground text-sm">·</span>
                        <span className="text-muted-foreground text-sm">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                        {comment.updated_at && (
                          <span className="text-muted-foreground text-xs italic">
                            (editado)
                          </span>
                        )}
                        
                        {user?.id === comment.user_id && editingId !== comment.id && (
                          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => startEditing(comment)}
                              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(comment.id)}
                              className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {editingId === comment.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-2 text-sm border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              isLoading={isSavingEdit}
                              disabled={!editContent.trim()}
                              className="rounded-full"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              className="rounded-full"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[15px] mt-0.5">{comment.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New comment input */}
        <div className="flex items-start gap-3 pt-4 border-t mt-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-primary">
                  {getInitials(profile?.full_name)}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              className="flex-1 bg-transparent border-0 outline-none text-[15px] placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button 
              onClick={handleSubmit} 
              isLoading={isSending} 
              disabled={!newComment.trim()}
              size="sm"
              className="rounded-full px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
