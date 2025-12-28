"use client";

import { useEffect, useState, useCallback } from "react";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDebounce } from "@/hooks";
import { useUser } from "@/hooks/useUser";
import { BookCard } from "@/components/features/book-card";
import { Button, Input, Select, Skeleton, EmptyState } from "@/components/ui";
import type { Book, ReadingStatus } from "@/types/database";
import { Plus, Search, Library, Filter } from "lucide-react";

const statusOptions = [
  { value: "", label: "Todos os status" },
  { value: "nao_comecou", label: "Não comecei" },
  { value: "lendo", label: "Lendo" },
  { value: "lido", label: "Lido" },
  { value: "desistido", label: "Desisti" },
];

const ratingOptions = [
  { value: "", label: "Todas as avaliações" },
  { value: "5", label: "5 estrelas" },
  { value: "4", label: "4+ estrelas" },
  { value: "3", label: "3+ estrelas" },
  { value: "2", label: "2+ estrelas" },
  { value: "1", label: "1+ estrela" },
];

const sortOptions = [
  { value: "created_at_desc", label: "Mais recentes" },
  { value: "created_at_asc", label: "Mais antigos" },
  { value: "nome_do_livro_asc", label: "Nome (A-Z)" },
  { value: "nome_do_livro_desc", label: "Nome (Z-A)" },
  { value: "autor_asc", label: "Autor (A-Z)" },
  { value: "rating_desc", label: "Melhor avaliados" },
];

export default function EstantePage() {
  const { user } = useUser();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at_desc");

  const debouncedSearch = useDebounce(searchQuery, 300);
  const supabase = createClient();

  const fetchBooks = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Filtrar explicitamente pelo usuário logado
      let query = supabase.from("books").select("*").eq("user_id", user.id);

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(
          `nome_do_livro.ilike.%${debouncedSearch}%,autor.ilike.%${debouncedSearch}%`
        );
      }

      // Apply status filter
      if (statusFilter) {
        query = query.eq("status_leitura", statusFilter);
      }

      // Apply rating filter
      if (ratingFilter) {
        query = query.gte("rating", parseInt(ratingFilter));
      }

      // Apply sorting
      const [field, order] = sortBy.split("_");
      const sortField = field === "created" ? "created_at" : field === "nome" ? "nome_do_livro" : field;
      query = query.order(sortField, { ascending: order === "asc" || sortBy.endsWith("asc") });

      const { data, error } = await query;

      if (error) throw error;

      setBooks(data || []);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, debouncedSearch, statusFilter, ratingFilter, sortBy]);

  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [fetchBooks, user]);

  const activeFiltersCount = [statusFilter, ratingFilter].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Minha Estante</h1>
          <p className="text-muted-foreground mt-1">
            {books.length} {books.length === 1 ? "livro" : "livros"} na sua biblioteca
          </p>
        </div>
        <Link href="/estante/novo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar livro
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort */}
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={sortOptions}
            className="w-full md:w-48"
          />

          {/* Filter toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg animate-fade-in">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusOptions}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1.5 block">Avaliação</label>
              <Select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                options={ratingOptions}
              />
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("");
                    setRatingFilter("");
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Books Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          icon={<Library className="w-16 h-16" />}
          title={searchQuery || statusFilter || ratingFilter ? "Nenhum livro encontrado" : "Sua estante está vazia"}
          description={
            searchQuery || statusFilter || ratingFilter
              ? "Tente ajustar os filtros para encontrar o que procura."
              : "Comece adicionando seu primeiro livro à sua biblioteca pessoal."
          }
          action={
            !searchQuery && !statusFilter && !ratingFilter && (
              <Link href="/estante/novo">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar primeiro livro
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onDelete={fetchBooks} />
          ))}
        </div>
      )}
    </div>
  );
}

