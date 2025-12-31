"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, Button, Input, Textarea, Select } from "@/components/ui";
import { Plus, Trash2, Loader2, BookOpen, Pencil, BookCheck, MessageSquare, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: "planned" | "in_progress" | "completed";
  votes_count: number;
  created_at: string;
}

interface RoadmapSuggestion {
  id: string;
  user_id: string;
  content: string;
  reviewed: boolean;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string;
  };
}

const statusOptions = [
  { value: "planned", label: "Próximos Capítulos" },
  { value: "in_progress", label: "Escrevendo História" },
  { value: "completed", label: "Livro Publicado" },
];

export function AdminRoadmap() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [suggestions, setSuggestions] = useState<RoadmapSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"items" | "suggestions">("items");

  // New item form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState("planned");
  const [adding, setAdding] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch roadmap items
      const { data: itemsData } = await supabase
        .from("roadmap_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (itemsData) setItems(itemsData);

      // Fetch suggestions
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from("roadmap_suggestions")
        .select("*")
        .order("created_at", { ascending: false });

      if (suggestionsError) {
        console.error("Erro ao buscar sugestões:", suggestionsError);
      }

      if (suggestionsData && suggestionsData.length > 0) {
        // Fetch user profiles separately
        const userIds = [...new Set(suggestionsData.map((s) => s.user_id))];
        const { data: profilesData } = await supabase
          .from("users_profile")
          .select("id, full_name, email")
          .in("id", userIds);

        const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

        const suggestionsWithProfiles = suggestionsData.map((s) => ({
          ...s,
          user_profile: profilesMap.get(s.user_id) || null,
        }));

        setSuggestions(suggestionsWithProfiles);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = async () => {
    if (!newTitle.trim()) return;

    setAdding(true);
    try {
      await supabase.from("roadmap_items").insert({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        status: newStatus,
        votes_count: 0,
      });

      setNewTitle("");
      setNewDescription("");
      setNewStatus("planned");
      fetchData();
    } catch (error) {
      console.error("Erro ao adicionar item:", error);
      alert("Erro ao adicionar item");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Excluir este item do roadmap?")) return;

    setDeletingId(id);
    try {
      await supabase.from("roadmap_items").delete().eq("id", id);
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await supabase.from("roadmap_items").update({ status: newStatus }).eq("id", id);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReviewSuggestion = async (id: string, approved: boolean) => {
    setUpdatingId(id);
    try {
      await supabase.from("roadmap_suggestions").update({ reviewed: true }).eq("id", id);
      fetchData();
      if (approved) {
        alert("Sugestão marcada como revisada. Adicione manualmente ao roadmap se desejar.");
      }
    } catch (error) {
      console.error("Erro ao revisar:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingSuggestions = suggestions.filter((s) => !s.reviewed);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("items")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-colors",
            activeTab === "items"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <BookOpen className="w-4 h-4 inline mr-2" />
          Itens do Roadmap ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("suggestions")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-colors relative",
            activeTab === "suggestions"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Sugestões
          {pendingSuggestions.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {pendingSuggestions.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "items" && (
        <>
          {/* Add new item */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Item ao Roadmap
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Título"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  options={statusOptions}
                />
              </div>
              <Textarea
                placeholder="Descrição (opcional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
              <Button onClick={handleAddItem} disabled={adding || !newTitle.trim()}>
                {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar
              </Button>
            </CardContent>
          </Card>

          {/* Items list */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Itens do Roadmap</h3>
              {loading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : items.length === 0 ? (
                <p className="text-muted-foreground">Nenhum item no roadmap.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          👍 {item.votes_count} votos
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={item.status}
                          onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                          options={statusOptions}
                          className="w-48"
                          disabled={updatingId === item.id}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deletingId === item.id}
                          className="text-red-500 hover:text-red-600"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "suggestions" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Sugestões dos Usuários</h3>
            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : suggestions.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma sugestão recebida.</p>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      suggestion.reviewed
                        ? "bg-muted/30 border-muted"
                        : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    )}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-sm">{suggestion.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Por: {suggestion.user_profile?.full_name || suggestion.user_profile?.email || "Usuário"} •{" "}
                          {new Date(suggestion.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      {!suggestion.reviewed && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReviewSuggestion(suggestion.id, true)}
                            disabled={updatingId === suggestion.id}
                            className="text-green-600 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReviewSuggestion(suggestion.id, false)}
                            disabled={updatingId === suggestion.id}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {suggestion.reviewed && (
                        <span className="text-xs text-muted-foreground">Revisado ✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

