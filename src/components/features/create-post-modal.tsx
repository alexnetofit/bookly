"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Modal, Button, Textarea, Select } from "@/components/ui";
import { Send, AlertTriangle } from "lucide-react";

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

export function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const supabase = createClient();
  const { showToast } = useToast();

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

      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        content: content.trim(),
        has_spoiler: hasSpoiler,
        book_id: selectedBookId || null,
      });

      if (error) throw error;

      showToast("Post publicado com sucesso!", "success");
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

  const bookOptions = [
    { value: "", label: "Nenhum livro relacionado" },
    ...books.map((book) => ({
      value: book.id,
      label: `${book.nome_do_livro} - ${book.autor}`,
    })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Post" className="max-w-lg">
      <div className="space-y-4">
        {/* Book selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Livro relacionado (opcional)</label>
          <Select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            options={bookOptions}
            disabled={isFetchingBooks}
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <label className="text-sm font-medium">O que você quer compartilhar?</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Compartilhe suas impressões sobre um livro, recomendações, ou qualquer pensamento..."
            className="min-h-[150px]"
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {content.length}/2000
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
            onClick={() => setHasSpoiler(!hasSpoiler)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              hasSpoiler ? "bg-yellow-500" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                hasSpoiler ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {hasSpoiler && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-3 rounded-lg">
            O conteúdo será ocultado por padrão e os leitores precisarão clicar para revelar.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            <Send className="w-4 h-4 mr-2" />
            Publicar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

