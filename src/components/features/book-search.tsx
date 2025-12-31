"use client";

import { useState, useEffect, useCallback } from "react";
import { Input, Skeleton } from "@/components/ui";
import { Search, BookOpen } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import type { BookSearchResult } from "@/types/database";
import Image from "next/image";

interface BookSearchProps {
  onSelect: (book: BookSearchResult) => void;
}

export function BookSearch({ onSelect }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 400);

  const searchBooks = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/books/search?q=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        throw new Error("Erro na busca");
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Erro ao buscar livros:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    searchBooks(debouncedQuery);
  }, [debouncedQuery, searchBooks]);

  const handleSelect = (book: BookSearchResult) => {
    onSelect(book);
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, autor ou ISBN..."
          className="pl-10"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Skeleton className="w-12 h-16 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && hasSearched && results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum livro encontrado</p>
          <p className="text-sm">Tente outro termo de busca</p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {results.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => handleSelect(book)}
              className="w-full flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <div className="w-12 h-16 rounded bg-muted flex-shrink-0 overflow-hidden">
                {book.cover_url ? (
                  <Image
                    src={book.cover_url}
                    alt={book.title}
                    width={48}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{book.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {book.authors.length > 0
                    ? book.authors.join(", ")
                    : "Autor desconhecido"}
                </p>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  {book.published_year && <span>{book.published_year}</span>}
                  {book.page_count && <span>{book.page_count} páginas</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!isLoading && !hasSearched && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <p>Digite o nome do livro, autor ou ISBN para buscar</p>
        </div>
      )}
    </div>
  );
}



