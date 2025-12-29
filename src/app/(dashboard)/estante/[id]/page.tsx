"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Progress,
  StarRating,
  Button,
  Skeleton,
  Modal,
  Input,
} from "@/components/ui";
import type { Book, ReadingStatus } from "@/types/database";
import { ArrowLeft, Edit, Trash2, Calendar, BookOpen, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

const statusConfig: Record<ReadingStatus, { label: string; variant: "reading" | "read" | "not-started" | "abandoned" }> = {
  lendo: { label: "Lendo", variant: "reading" },
  lido: { label: "Lido", variant: "read" },
  nao_comecou: { label: "Não comecei", variant: "not-started" },
  desistido: { label: "Desisti", variant: "abandoned" },
};

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newPagesRead, setNewPagesRead] = useState("");

  useEffect(() => {
    fetchBook();
  }, [params.id]);

  const fetchBook = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setBook(data);
      setNewPagesRead(data.paginas_lidas.toString());
    } catch (error) {
      console.error("Error fetching book:", error);
      router.push("/estante");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!book) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from("books").delete().eq("id", book.id);
      if (error) throw error;

      showToast("Livro removido com sucesso", "success");
      router.push("/estante");
    } catch (error) {
      console.error("Error deleting book:", error);
      showToast("Erro ao remover livro", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!book) return;

    const pages = parseInt(newPagesRead);
    if (isNaN(pages) || pages < 0 || pages > book.numero_de_paginas) {
      showToast("Número de páginas inválido", "error");
      return;
    }

    try {
      const updates: Partial<Book> = { paginas_lidas: pages };
      
      // Auto-update status
      if (pages === book.numero_de_paginas && book.status_leitura !== "lido") {
        updates.status_leitura = "lido";
      } else if (pages > 0 && book.status_leitura === "nao_comecou") {
        updates.status_leitura = "lendo";
      }

      const { error } = await supabase
        .from("books")
        .update(updates)
        .eq("id", book.id);

      if (error) throw error;

      showToast("Progresso atualizado!", "success");
      setShowProgressModal(false);
      fetchBook();
    } catch (error) {
      console.error("Error updating progress:", error);
      showToast("Erro ao atualizar progresso", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!book) {
    return null;
  }

  const progress = (book.paginas_lidas / book.numero_de_paginas) * 100;
  const status = statusConfig[book.status_leitura];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {/* Book cover */}
        {book.cover_url && (
          <img
            src={book.cover_url}
            alt={book.nome_do_livro}
            className="w-24 h-36 rounded-lg shadow-lg object-cover flex-shrink-0"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{book.nome_do_livro}</h1>
              <p className="text-muted-foreground">{book.autor}</p>
            </div>
            <Badge variant={status.variant} className="text-sm flex-shrink-0">
              {status.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6">
        {/* Progress card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Progresso de Leitura
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowProgressModal(true)}>
              Atualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{Math.round(progress)}%</span>
              <span className="text-muted-foreground">
                {book.paginas_lidas} de {book.numero_de_paginas} páginas
              </span>
            </div>
            <Progress value={progress} max={100} />
          </CardContent>
        </Card>

        {/* Rating */}
        {book.rating && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sua avaliação</span>
                <StarRating value={book.rating} readonly size="lg" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {book.descricao && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-primary" />
                Anotações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{book.descricao}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Adicionado em:</span>
              </div>
              <span>{formatDate(book.created_at)}</span>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Última atualização:</span>
              </div>
              <span>{formatDate(book.updated_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Link href={`/estante/${book.id}/editar`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Edit className="w-4 h-4 mr-2" />
              Editar livro
            </Button>
          </Link>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remover
          </Button>
        </div>
      </div>

      {/* Update progress modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        title="Atualizar progresso"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Páginas lidas</label>
            <Input
              type="number"
              min="0"
              max={book.numero_de_paginas}
              value={newPagesRead}
              onChange={(e) => setNewPagesRead(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              de {book.numero_de_paginas} páginas
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowProgressModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateProgress}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
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
            <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
              Remover
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

