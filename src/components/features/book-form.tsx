"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { useUser } from "@/hooks/useUser";
import { Button, Input, Textarea, Select, StarRating, Card, CardContent } from "@/components/ui";
import { BookSearch } from "./book-search";
import type { Book, ReadingStatus, BookSearchResult, BookFormat } from "@/types/database";
import { Save, ArrowLeft, Search, PenLine, Users, AlertTriangle, Upload, X, ImageIcon, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { invalidateBookRelatedCaches } from "@/lib/cache";

const FREE_BOOK_LIMIT = 3;

interface BookFormProps {
  book?: Book;
  mode: "create" | "edit";
}

const statusOptions = [
  { value: "nao_comecou", label: "Quero ler" },
  { value: "lendo", label: "Lendo" },
  { value: "lido", label: "Lido" },
  { value: "desistido", label: "Abandonei" },
];

const formatOptions = [
  { value: "fisico", label: "Livro Físico" },
  { value: "ebook", label: "Ebook" },
  { value: "audiobook", label: "Audiobook" },
];

// Gêneros são carregados dinamicamente da tabela `genres`

type InputMode = "search" | "manual";

export function BookForm({ book, mode }: BookFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const { user, profile, isLoading: isProfileLoading } = useUser();

  // === TODOS OS HOOKS DEVEM VIR PRIMEIRO (antes de qualquer early return) ===
  
  const [isLoading, setIsLoading] = useState(false);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [checkingLimit, setCheckingLimit] = useState(mode === "create");
  const [inputMode, setInputMode] = useState<InputMode>(
    mode === "edit" ? "manual" : "search"
  );
  const [genreOptions, setGenreOptions] = useState<{ value: string; label: string }[]>([
    { value: "", label: "Selecione um gênero" },
  ]);
  
  // Form data state
  const [formData, setFormData] = useState({
    nome_do_livro: book?.nome_do_livro || "",
    autor: book?.autor || "",
    numero_de_paginas: book?.numero_de_paginas?.toString() || "",
    descricao: book?.descricao || "",
    rating: book?.rating || 0,
    status_leitura: book?.status_leitura || "nao_comecou",
    paginas_lidas: book?.paginas_lidas?.toString() || "0",
    formato: book?.formato || "fisico",
    genero: book?.genero || "",
    data_inicio: book?.data_inicio || "",
    data_termino: book?.data_termino || "",
  });

  // Estado para capa do livro
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string | null>(
    book?.cover_url || null
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(book?.cover_url || null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Estados para postagem na comunidade
  const [postToCommunity, setPostToCommunity] = useState(false);
  const [hasSpoiler, setHasSpoiler] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // === EFFECTS ===
  
  // Buscar gêneros do banco
  useEffect(() => {
    const fetchGenres = async () => {
      const { data } = await supabase
        .from("genres")
        .select("name")
        .order("name");

      if (data) {
        setGenreOptions([
          { value: "", label: "Selecione um gênero" },
          ...data.map((g) => ({ value: g.name, label: g.name })),
        ]);
      }
    };
    fetchGenres();
  }, [supabase]);

  // Verificar se usuário atingiu limite de livros (apenas para criação)
  useEffect(() => {
    const checkBookLimit = async () => {
      if (mode !== "create" || !user) {
        setCheckingLimit(false);
        return;
      }
      
      const { count } = await supabase
        .from("books")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      setBookCount(count || 0);
      setCheckingLimit(false);
    };

    // Só verifica o limite após o profile carregar
    if (!isProfileLoading) {
      checkBookLimit();
    }
  }, [user, mode, supabase, isProfileLoading]);

  // === COMPUTED VALUES ===
  
  // Verificar se usuário tem plano premium ativo
  const isPremium = profile?.plan && 
    profile.plan !== "free" && 
    profile.subscription_expires_at && 
    new Date(profile.subscription_expires_at) > new Date();

  const hasReachedLimit = !isPremium && bookCount !== null && bookCount >= FREE_BOOK_LIMIT;

  // Aguardar profile e contagem de livros carregarem antes de verificar limite
  const isCheckingAccess = mode === "create" && (isProfileLoading || checkingLimit);

  // === EARLY RETURNS (depois de todos os hooks) ===
  
  // Mostrar loading enquanto verifica acesso
  if (isCheckingAccess) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  // Mostrar tela de limite atingido (só após tudo carregar)
  if (mode === "create" && hasReachedLimit) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Limite de Livros Atingido</h2>
              <p className="text-muted-foreground">
                Você já tem {bookCount} livros na sua estante. 
                O plano gratuito permite até {FREE_BOOK_LIMIT} livros.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Faça upgrade para um plano premium e adicione livros ilimitados!
              </p>
              <Link href="/planos">
                <Button size="lg" className="w-full sm:w-auto">
                  Ver Planos Premium
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === FUNCTIONS ===

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

    // Se vai postar na comunidade, comentário é obrigatório
    if (postToCommunity && !formData.descricao.trim()) {
      newErrors.descricao = "Comentário é obrigatório para postar na comunidade";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        showToast("Você precisa estar logado", "error");
        return;
      }

      // Fazer upload da capa se houver arquivo
      const coverUrl = await uploadCover(user.id);

      const numeroDePaginas = parseInt(formData.numero_de_paginas);
      const paginasLidas = parseInt(formData.paginas_lidas) || 0;

      // Auto-update status to "lido" if all pages are read
      let statusLeitura = formData.status_leitura as ReadingStatus;
      if (paginasLidas === numeroDePaginas && statusLeitura !== "lido") {
        statusLeitura = "lido";
      }

      // Calcular finished_at com fuso horário local do usuário
      let finished_at: string | null = null;
      if (statusLeitura === "lido") {
        if (formData.data_termino) {
          // Usar data de término com hora 23:59 no fuso local
          finished_at = new Date(formData.data_termino + 'T23:59:59').toISOString();
        } else {
          // Usar data/hora atual (fuso local do dispositivo)
          finished_at = new Date().toISOString();
        }
      }

      const bookData = {
        nome_do_livro: formData.nome_do_livro.trim(),
        autor: formData.autor.trim(),
        numero_de_paginas: numeroDePaginas,
        descricao: formData.descricao.trim() || null,
        cover_url: coverUrl,
        rating: formData.rating || null,
        status_leitura: statusLeitura,
        paginas_lidas: paginasLidas,
        formato: formData.formato as BookFormat,
        genero: formData.genero.trim() || null,
        data_inicio: formData.data_inicio || null,
        data_termino: statusLeitura === "lido" && formData.data_termino ? formData.data_termino : null,
        finished_at: finished_at,
      };

      if (mode === "create") {
        // Inserir livro e pegar o ID retornado
        const { data: insertedBook, error } = await supabase
          .from("books")
          .insert({
            ...bookData,
            user_id: user.id,
          })
          .select("id")
          .single();

        if (error) throw error;

        // Se marcou para postar na comunidade, criar o post
        if (postToCommunity && insertedBook) {
          const { error: postError } = await supabase
            .from("community_posts")
            .insert({
              user_id: user.id,
              book_id: insertedBook.id,
              book_title: formData.nome_do_livro.trim(),
              book_author: formData.autor.trim(),
              book_cover_url: selectedCoverUrl,
              content: formData.descricao.trim(),
              has_spoiler: hasSpoiler,
            });

          if (postError) {
            console.error("Erro ao criar post:", postError);
            showToast("Livro adicionado, mas erro ao postar na comunidade", "error");
          } else {
            showToast("Livro adicionado e postado na comunidade!", "success");
          }
        } else {
          showToast("Livro adicionado com sucesso!", "success");
        }
      } else {
        const { error } = await supabase
          .from("books")
          .update(bookData)
          .eq("id", book!.id);

        if (error) throw error;

        showToast("Livro atualizado com sucesso!", "success");
      }

      // Invalida cache do dashboard e metas para refletir mudanças
      invalidateBookRelatedCaches();
      
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

  const handleBookSelect = (selectedBook: BookSearchResult) => {
    setFormData((prev) => ({
      ...prev,
      nome_do_livro: selectedBook.title,
      autor: selectedBook.authors.join(", ") || "",
      numero_de_paginas: selectedBook.page_count?.toString() || prev.numero_de_paginas,
      // NÃO preencher gênero automaticamente (usuário seleciona do dropdown)
      // NÃO preencher descrição/comentários automaticamente
    }));
    // Salvar capa do livro da busca
    setSelectedCoverUrl(selectedBook.cover_url);
    setCoverPreview(selectedBook.cover_url);
    setCoverFile(null); // Limpa arquivo se havia upload manual
    // Limpa erros após preencher
    setErrors({});
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      showToast("Por favor, selecione uma imagem", "error");
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast("A imagem deve ter no máximo 2MB", "error");
      return;
    }

    setCoverFile(file);
    // Criar preview local
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadCover = async (userId: string): Promise<string | null> => {
    if (!coverFile) return selectedCoverUrl;

    setIsUploadingCover(true);
    try {
      const fileExt = coverFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("book-covers")
        .upload(fileName, coverFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("book-covers")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload da capa:", error);
      showToast("Erro ao fazer upload da capa", "error");
      return selectedCoverUrl;
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = () => {
    setSelectedCoverUrl(null);
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
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

      {/* Tabs para modo de entrada */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => setInputMode("search")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            inputMode === "search"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Search className="w-4 h-4" />
          Buscar livro
        </button>
        <button
          type="button"
          onClick={() => setInputMode("manual")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            inputMode === "manual"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PenLine className="w-4 h-4" />
          Preencher manualmente
        </button>
      </div>

      {/* Componente de busca */}
      {inputMode === "search" && (
        <div className="bg-card border rounded-lg p-4">
          <BookSearch onSelect={handleBookSelect} />
        </div>
      )}

      {/* Formulário */}
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

        <div className="space-y-2">
          <label htmlFor="genero" className="text-sm font-medium">
            Gênero
          </label>
          <Select
            id="genero"
            value={formData.genero}
            onChange={(e) => handleChange("genero", e.target.value)}
            options={genreOptions}
          />
        </div>

        {/* Upload de capa */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Capa do livro</label>
          <div className="flex items-start gap-4">
            {/* Preview da capa */}
            <div className="relative w-24 h-36 bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {coverPreview ? (
                <>
                  <img
                    src={coverPreview}
                    alt="Capa do livro"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/80 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            
            {/* Botão de upload */}
            <div className="flex-1 space-y-2">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {coverPreview ? "Trocar capa" : "Enviar capa"}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WebP. Máx 2MB.
              </p>
            </div>
          </div>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="formato" className="text-sm font-medium">
              Formato
            </label>
            <Select
              id="formato"
              value={formData.formato}
              onChange={(e) => handleChange("formato", e.target.value)}
              options={formatOptions}
            />
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="data_inicio" className="text-sm font-medium">
              Data de início
            </label>
            <Input
              id="data_inicio"
              type="date"
              value={formData.data_inicio}
              onChange={(e) => handleChange("data_inicio", e.target.value)}
            />
          </div>

          {formData.status_leitura === "lido" && (
            <div className="space-y-2">
              <label htmlFor="data_termino" className="text-sm font-medium">
                Data de término
              </label>
              <Input
                id="data_termino"
                type="date"
                value={formData.data_termino}
                onChange={(e) => handleChange("data_termino", e.target.value)}
                min={formData.data_inicio || undefined}
              />
              {formData.data_inicio && (
                <p className="text-xs text-muted-foreground">
                  Deve ser igual ou posterior a {new Date(formData.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Avaliação</label>
          <div className="pt-1">
            <StarRating
              value={formData.rating}
              onChange={(value) => handleChange("rating", value)}
              size="xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="descricao" className="text-sm font-medium">
            Comentários
          </label>
          <Textarea
            id="descricao"
            value={formData.descricao}
            onChange={(e) => handleChange("descricao", e.target.value)}
            placeholder="Suas impressões sobre o livro..."
            className="min-h-[120px]"
          />
          {errors.descricao && (
            <p className="text-sm text-destructive">{errors.descricao}</p>
          )}
        </div>

        {/* Toggle Postar na Comunidade - apenas no modo criar e para usuários premium */}
        {mode === "create" && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
            {isPremium ? (
              <>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Postar na Comunidade</p>
                      <p className="text-sm text-muted-foreground">
                        Compartilhe este livro com outros leitores
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={postToCommunity}
                    onClick={() => {
                      setPostToCommunity(!postToCommunity);
                      if (postToCommunity) setHasSpoiler(false);
                    }}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      postToCommunity ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        postToCommunity ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </label>

                {/* Toggle Spoiler - só aparece se Postar na Comunidade estiver ativo */}
                {postToCommunity && (
                  <label className="flex items-center justify-between cursor-pointer pt-3 border-t">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="font-medium">Contém spoiler?</p>
                        <p className="text-sm text-muted-foreground">
                          O conteúdo ficará ofuscado até o leitor revelar
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hasSpoiler}
                      onClick={() => setHasSpoiler(!hasSpoiler)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        hasSpoiler ? "bg-amber-500" : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          hasSpoiler ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </label>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-muted-foreground">Postar na Comunidade</p>
                    <p className="text-sm text-muted-foreground">
                      Recurso exclusivo para assinantes
                    </p>
                  </div>
                </div>
                <Link href="/planos">
                  <Button variant="outline" size="sm">
                    <Lock className="w-3 h-3 mr-1" />
                    Upgrade
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
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
