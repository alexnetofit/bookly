"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, Badge, Progress, StarRating, Button, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Book, ReadingStatus } from "@/types/database";
import { Edit, Trash2, BookOpen } from "lucide-react";

interface BookCardProps {
  book: Book;
  onDelete?: () => void;
}

const statusConfig: Record<ReadingStatus, { label: string; variant: "reading" | "read" | "not-started" | "abandoned" }> = {
  lendo: { label: "Lendo", variant: "reading" },
  lido: { label: "Lido", variant: "read" },
  nao_comecou: { label: "Não comecei", variant: "not-started" },
  desistido: { label: "Desisti", variant: "abandoned" },
};

export function BookCard({ book, onDelete }: BookCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();
  const { showToast } = useToast();

  const progress = (book.paginas_lidas / book.numero_de_paginas) * 100;
  const status = statusConfig[book.status_leitura];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("books").delete().eq("id", book.id);

      if (error) throw error;

      showToast("Livro removido com sucesso", "success");
      setShowDeleteModal(false);
      onDelete?.();
    } catch (error) {
      console.error("Error deleting book:", error);
      showToast("Erro ao remover livro", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex gap-4 mb-3">
            {/* Book Cover */}
            {book.cover_url && (
              <div className="flex-shrink-0">
                <img
                  src={book.cover_url}
                  alt={book.nome_do_livro}
                  className="w-[60px] h-[90px] rounded shadow-sm object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Book Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-base leading-tight line-clamp-2" title={book.nome_do_livro}>
                  {book.nome_do_livro}
                </h3>
                <Badge variant={status.variant} className="flex-shrink-0 ml-1">{status.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate" title={book.autor}>
                {book.autor}
              </p>
              {/* Rating inline when has cover */}
              {book.rating && book.cover_url && (
                <div className="mt-2">
                  <StarRating value={book.rating} readonly size="sm" />
                </div>
              )}
            </div>
          </div>

          {/* Rating - only show here if no cover */}
          {book.rating && !book.cover_url && (
            <div className="mb-3">
              <StarRating value={book.rating} readonly size="sm" />
            </div>
          )}

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {book.paginas_lidas} / {book.numero_de_paginas} páginas
              </span>
            </div>
            <Progress value={progress} max={100} />
          </div>

          {/* Description preview */}
          {book.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {book.descricao}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Link href={`/estante/${book.id}`} className="flex-1">
              <Button variant="ghost" size="sm" className="w-full">
                <BookOpen className="w-4 h-4 mr-2" />
                Ver detalhes
              </Button>
            </Link>
            <Link href={`/estante/${book.id}/editar`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remover livro"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Tem certeza que deseja remover <strong>{book.nome_do_livro}</strong> da sua
            estante? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Remover
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}


