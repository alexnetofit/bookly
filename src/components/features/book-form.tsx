"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Button, Input, Textarea, Select, StarRating } from "@/components/ui";
import type { Book, ReadingStatus } from "@/types/database";
import { Save, ArrowLeft } from "lucide-react";

interface BookFormProps {
  book?: Book;
  mode: "create" | "edit";
}

const statusOptions = [
  { value: "nao_comecou", label: "Não comecei" },
  { value: "lendo", label: "Lendo" },
  { value: "lido", label: "Lido" },
  { value: "desistido", label: "Desisti" },
];

export function BookForm({ book, mode }: BookFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_do_livro: book?.nome_do_livro || "",
    autor: book?.autor || "",
    numero_de_paginas: book?.numero_de_paginas?.toString() || "",
    descricao: book?.descricao || "",
    rating: book?.rating || 0,
    status_leitura: book?.status_leitura || "nao_comecou",
    paginas_lidas: book?.paginas_lidas?.toString() || "0",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome_do_livro.trim()) {
      newErrors.nome_do_livro = "Nome do livro é obrigatório";
    }

    if (!formData.autor.trim()) {
      newErrors.autor = "Autor é obrigatório";
    }

    const numPaginas = parseInt(formData.numero_de_paginas);
    if (!formData.numero_de_paginas || numPaginas <= 0) {
      newErrors.numero_de_paginas = "Número de páginas deve ser maior que 0";
    }

    const paginasLidas = parseInt(formData.paginas_lidas) || 0;
    if (paginasLidas > numPaginas) {
      newErrors.paginas_lidas = "Páginas lidas não pode ser maior que o total";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const numeroDePaginas = parseInt(formData.numero_de_paginas);
      const paginasLidas = parseInt(formData.paginas_lidas) || 0;

      // Auto-update status to "lido" if all pages are read
      let statusLeitura = formData.status_leitura as ReadingStatus;
      if (paginasLidas === numeroDePaginas && statusLeitura !== "lido") {
        statusLeitura = "lido";
      }

      const bookData = {
        nome_do_livro: formData.nome_do_livro.trim(),
        autor: formData.autor.trim(),
        numero_de_paginas: numeroDePaginas,
        descricao: formData.descricao.trim() || null,
        rating: formData.rating || null,
        status_leitura: statusLeitura,
        paginas_lidas: paginasLidas,
      };

      if (mode === "create") {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          showToast("Você precisa estar logado", "error");
          return;
        }

        const { error } = await supabase.from("books").insert({
          ...bookData,
          user_id: user.id,
        });

        if (error) throw error;

        showToast("Livro adicionado com sucesso!", "success");
      } else {
        const { error } = await supabase
          .from("books")
          .update(bookData)
          .eq("id", book!.id);

        if (error) throw error;

        showToast("Livro atualizado com sucesso!", "success");
      }

      router.push("/estante");
      router.refresh();
    } catch (error) {
      console.error("Error saving book:", error);
      showToast("Erro ao salvar livro", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Adicionar Livro" : "Editar Livro"}
        </h1>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <label htmlFor="nome_do_livro" className="text-sm font-medium">
            Nome do livro *
          </label>
          <Input
            id="nome_do_livro"
            value={formData.nome_do_livro}
            onChange={(e) => handleChange("nome_do_livro", e.target.value)}
            placeholder="Ex: O Senhor dos Anéis"
            error={errors.nome_do_livro}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="autor" className="text-sm font-medium">
            Autor *
          </label>
          <Input
            id="autor"
            value={formData.autor}
            onChange={(e) => handleChange("autor", e.target.value)}
            placeholder="Ex: J.R.R. Tolkien"
            error={errors.autor}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="numero_de_paginas" className="text-sm font-medium">
              Total de páginas *
            </label>
            <Input
              id="numero_de_paginas"
              type="number"
              min="1"
              value={formData.numero_de_paginas}
              onChange={(e) => handleChange("numero_de_paginas", e.target.value)}
              placeholder="Ex: 350"
              error={errors.numero_de_paginas}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="paginas_lidas" className="text-sm font-medium">
              Páginas lidas
            </label>
            <Input
              id="paginas_lidas"
              type="number"
              min="0"
              max={formData.numero_de_paginas || undefined}
              value={formData.paginas_lidas}
              onChange={(e) => handleChange("paginas_lidas", e.target.value)}
              placeholder="0"
              error={errors.paginas_lidas}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="status_leitura" className="text-sm font-medium">
            Status de leitura
          </label>
          <Select
            id="status_leitura"
            value={formData.status_leitura}
            onChange={(e) => handleChange("status_leitura", e.target.value)}
            options={statusOptions}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Avaliação</label>
          <div className="pt-1">
            <StarRating
              value={formData.rating}
              onChange={(value) => handleChange("rating", value)}
              size="lg"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="descricao" className="text-sm font-medium">
            Descrição / Anotações
          </label>
          <Textarea
            id="descricao"
            value={formData.descricao}
            onChange={(e) => handleChange("descricao", e.target.value)}
            placeholder="Suas impressões sobre o livro..."
            className="min-h-[120px]"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" isLoading={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {mode === "create" ? "Adicionar livro" : "Salvar alterações"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

