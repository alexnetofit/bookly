"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Card, CardContent, Button, Textarea, Modal, Skeleton } from "@/components/ui";
import { Map, BookOpen, Pencil, BookCheck, Plus, ThumbsUp, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: "planned" | "in_progress" | "completed";
  votes_count: number;
  created_at: string;
}

interface UserVote {
  item_id: string;
}

const columns = [
  {
    id: "planned",
    title: "Próximos Capítulos",
    icon: BookOpen,
    color: "text-blue-700 dark:text-blue-400",
    headerBg: "bg-blue-100 dark:bg-blue-900/40",
    borderColor: "border-blue-300 dark:border-blue-700",
  },
  {
    id: "in_progress",
    title: "Escrevendo História",
    icon: Pencil,
    color: "text-amber-700 dark:text-amber-400",
    headerBg: "bg-amber-100 dark:bg-amber-900/40",
    borderColor: "border-amber-300 dark:border-amber-700",
  },
  {
    id: "completed",
    title: "Livro Publicado",
    icon: BookCheck,
    color: "text-green-700 dark:text-green-400",
    headerBg: "bg-green-100 dark:bg-green-900/40",
    borderColor: "border-green-300 dark:border-green-700",
  },
];

export default function RoadmapPage() {
  const { user } = useUser();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionContent, setSuggestionContent] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [votingItemId, setVotingItemId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchItems = async () => {
    setLoading(true);
    try {
      // Fetch roadmap items
      const { data: itemsData } = await supabase
        .from("roadmap_items")
        .select("*")
        .order("votes_count", { ascending: false });

      if (itemsData) {
        setItems(itemsData);
      }

      // Fetch user's votes
      if (user) {
        const { data: votesData } = await supabase
          .from("roadmap_votes")
          .select("item_id")
          .eq("user_id", user.id);

        if (votesData) {
          setUserVotes(votesData.map((v: UserVote) => v.item_id));
        }
      }
    } catch (error) {
      console.error("Erro ao buscar roadmap:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  const handleVote = async (itemId: string) => {
    if (!user) return;

    setVotingItemId(itemId);
    const hasVoted = userVotes.includes(itemId);

    try {
      if (hasVoted) {
        // Remove vote
        await supabase
          .from("roadmap_votes")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", itemId);

        // Decrement votes_count
        await supabase.rpc("decrement_roadmap_votes", { item_id: itemId });

        setUserVotes(userVotes.filter((id) => id !== itemId));
        setItems(items.map((item) =>
          item.id === itemId ? { ...item, votes_count: item.votes_count - 1 } : item
        ));
      } else {
        // Add vote
        await supabase
          .from("roadmap_votes")
          .insert({ user_id: user.id, item_id: itemId });

        // Increment votes_count
        await supabase.rpc("increment_roadmap_votes", { item_id: itemId });

        setUserVotes([...userVotes, itemId]);
        setItems(items.map((item) =>
          item.id === itemId ? { ...item, votes_count: item.votes_count + 1 } : item
        ));
      }
    } catch (error) {
      console.error("Erro ao votar:", error);
    } finally {
      setVotingItemId(null);
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!user || !suggestionContent.trim()) return;

    setSubmittingSuggestion(true);
    try {
      await supabase.from("roadmap_suggestions").insert({
        user_id: user.id,
        content: suggestionContent.trim(),
      });

      setSuggestionContent("");
      setShowSuggestionModal(false);
      alert("Sugestão enviada com sucesso! Nossa equipe irá analisar.");
    } catch (error) {
      console.error("Erro ao enviar sugestão:", error);
      alert("Erro ao enviar sugestão. Tente novamente.");
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const getItemsByStatus = (status: string) =>
    items.filter((item) => item.status === status);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Roadmap do Babel
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o que estamos desenvolvendo e vote nas próximas funcionalidades
          </p>
        </div>
        <Button 
          onClick={() => setShowSuggestionModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Sugestão
        </Button>
      </div>

      {/* Columns - AbacatePay style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => {
          const Icon = column.icon;
          const columnItems = getItemsByStatus(column.id);

          return (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={cn(
                "flex items-center gap-2 p-4 rounded-t-xl border-2 border-b-0",
                column.headerBg,
                column.borderColor
              )}>
                <Icon className={cn("w-5 h-5", column.color)} />
                <h2 className={cn("font-bold text-sm", column.color)}>
                  {column.title}
                </h2>
                <span className={cn(
                  "ml-auto w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center",
                  column.headerBg,
                  column.color
                )}>
                  {columnItems.length}
                </span>
              </div>

              {/* Items Container */}
              <div className={cn(
                "flex-1 rounded-b-xl border-2 border-t-0 bg-card p-3 space-y-3 min-h-[200px]",
                column.borderColor
              )}>
                {columnItems.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Nenhum item ainda
                  </p>
                ) : (
                  columnItems.map((item) => {
                    const hasVoted = userVotes.includes(item.id);
                    const isVoting = votingItemId === item.id;

                    return (
                      <div 
                        key={item.id} 
                        className="bg-background rounded-xl border p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                            {item.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleVote(item.id)}
                            disabled={isVoting}
                            className={cn(
                              "flex flex-col items-center justify-center min-w-[60px] px-3 py-2 rounded-lg border-2 transition-all",
                              hasVoted
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600"
                                : "border-muted-foreground/20 hover:border-muted-foreground/40 text-muted-foreground"
                            )}
                          >
                            {isVoting ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <ThumbsUp className={cn("w-5 h-5", hasVoted && "fill-green-500")} />
                            )}
                            <span className="text-xs font-bold mt-1">{item.votes_count}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggestion Modal */}
      <Modal
        isOpen={showSuggestionModal}
        onClose={() => setShowSuggestionModal(false)}
        title="Enviar Sugestão"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sua sugestão será analisada pela nossa equipe. Se aprovada, ela aparecerá no roadmap.
          </p>
          <Textarea
            placeholder="Descreva sua sugestão de funcionalidade..."
            value={suggestionContent}
            onChange={(e) => setSuggestionContent(e.target.value)}
            rows={4}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowSuggestionModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitSuggestion}
              disabled={submittingSuggestion || !suggestionContent.trim()}
            >
              {submittingSuggestion ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

