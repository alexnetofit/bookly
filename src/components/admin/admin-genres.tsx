"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, Button, Input } from "@/components/ui";
import { Plus, Trash2, Loader2, BookOpen } from "lucide-react";

interface Genre {
  id: string;
  name: string;
  created_at: string;
}

export function AdminGenres() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGenre, setNewGenre] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchGenres = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("genres")
        .select("*")
        .order("name");

      if (error) throw error;
      setGenres(data || []);
    } catch (error) {
      console.error("Erro ao buscar gêneros:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  const handleAddGenre = async () => {
    if (!newGenre.trim()) return;

    setAdding(true);
    try {
      const { error } = await supabase
        .from("genres")
        .insert({ name: newGenre.trim() });

      if (error) throw error;

      setNewGenre("");
      fetchGenres();
    } catch (error) {
      console.error("Erro ao adicionar gênero:", error);
      alert("Erro ao adicionar gênero. Verifique se já não existe.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteGenre = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este gênero?")) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("genres")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchGenres();
    } catch (error) {
      console.error("Erro ao excluir gênero:", error);
      alert("Erro ao excluir gênero");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add new genre */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Novo Gênero
          </h3>
          <div className="flex gap-3">
            <Input
              placeholder="Nome do gênero"
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGenre()}
              className="flex-1"
            />
            <Button onClick={handleAddGenre} disabled={adding || !newGenre.trim()}>
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Genres list */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Gêneros Cadastrados ({genres.length})
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : genres.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum gênero cadastrado ainda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {genres.map((genre) => (
                <div
                  key={genre.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <span className="font-medium text-sm">{genre.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGenre(genre.id)}
                    disabled={deletingId === genre.id}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    {deletingId === genre.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-blue-300 bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Nota:</strong> Após adicionar novos gêneros aqui, eles aparecerão automaticamente 
            no dropdown de seleção de gênero ao adicionar/editar livros.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

