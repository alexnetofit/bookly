"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import { Modal, Button, Select } from "@/components/ui";
import { Feather, AlertTriangle, BookOpen, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookOption {
  id: string;
  nome_do_livro: string;
  autor: string;
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Get initials
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const supabase = createClient();
  const { showToast } = useToast();
  const { profile } = useUser();

  const [content, setContent] = useState("");
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [books, setBooks] = useState<BookOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBooks, setIsFetchingBooks] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBooks();
    }
  }, [isOpen]);

  const fetchBooks = async () => {
    setIsFetchingBooks(true);
    try {
      const { data } = await supabase
        .from("books")
        .select("id, nome_do_livro, autor")
        .order("nome_do_livro");

      setBooks((data as BookOption[]) || []);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setIsFetchingBooks(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      showToast("Digite o conteúdo do post", "error");
      return;
    }

    if (content.length > 2000) {
      showToast("O post deve ter no máximo 2000 caracteres", "error");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find selected book to get title and author
      const selectedBook = books.find(b => b.id === selectedBookId);

      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        content: content.trim(),
        has_spoiler: hasSpoiler,
        book_id: selectedBookId || null,
        book_title: selectedBook?.nome_do_livro || null,
        book_author: selectedBook?.autor || null,
        book_cover_url: selectedBook?.cover_url || null,
      });

      if (error) throw error;

      showToast("Post publicado!", "success");
      setContent("");
      setHasSpoiler(false);
      setSelectedBookId("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating post:", error);
      showToast("Erro ao publicar post", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBook = books.find(b => b.id === selectedBookId);
  const remainingChars = 2000 - content.length;
  const isNearLimit = remainingChars < 100;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="space-y-0">
        {/* Composer */}
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-primary">
                  {getInitials(profile?.full_name)}
                </span>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que você está lendo?"
              className="w-full bg-transparent border-0 outline-none resize-none text-xl placeholder:text-muted-foreground min-h-[120px]"
              maxLength={2000}
              autoFocus
            />

            {/* Selected book tag */}
            {selectedBook && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full text-sm text-primary mb-3">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{selectedBook.nome_do_livro}</span>
                <button 
                  onClick={() => setSelectedBookId("")}
                  className="ml-1 hover:text-primary/70"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t my-3" />

        {/* Options row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Book selector */}
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            disabled={isFetchingBooks}
            className="appearance-none bg-transparent border border-border rounded-full px-3 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors max-w-[160px]"
          >
            <option value="">📚 Livro</option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.nome_do_livro}
              </option>
            ))}
          </select>

          {/* Spoiler toggle */}
          <button
            type="button"
            onClick={() => setHasSpoiler(!hasSpoiler)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors",
              hasSpoiler 
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" 
                : "border border-border hover:bg-muted"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Spoiler
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Character count */}
          <span className={cn(
            "text-sm",
            isNearLimit ? "text-amber-500" : "text-muted-foreground"
          )}>
            {remainingChars}
          </span>

          {/* Post button */}
          <Button 
            onClick={handleSubmit} 
            isLoading={isLoading}
            disabled={!content.trim()}
            className="rounded-full px-4"
          >
            Postar
          </Button>
        </div>

        {/* Spoiler notice */}
        {hasSpoiler && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            O conteúdo será ocultado até o leitor revelar
          </p>
        )}

        {/* Public notice */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
          <Globe className="w-3.5 h-3.5" />
          Todos na comunidade poderão ver este post
        </div>
      </div>
    </Modal>
  );
}
