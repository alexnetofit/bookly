"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Button, Textarea, Modal, Skeleton } from "@/components/ui";
import { Clock, Flame, CheckCircle2, Plus, ThumbsUp, Send, Loader2 } from "lucide-react";
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
    subtitle: "Em planejamento",
    icon: Clock,
    accentColor: "from-[#8B7355] to-[#A08468]",
    pillBg: "bg-[#8B7355]/10",
    pillText: "text-[#8B7355]",
  },
  {
    id: "in_progress",
    title: "Escrevendo",
    subtitle: "Em desenvolvimento",
    icon: Flame,
    accentColor: "from-[#C4956A] to-[#D4A574]",
    pillBg: "bg-[#C4956A]/10",
    pillText: "text-[#C4956A]",
  },
  {
    id: "completed",
    title: "Publicado",
    subtitle: "Disponível para todos",
    icon: CheckCircle2,
    accentColor: "from-[#6B8E6B] to-[#7FA37F]",
    pillBg: "bg-[#6B8E6B]/10",
    pillText: "text-[#6B8E6B]",
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

      // Reset votes when fetching
      setUserVotes([]);

      // Fetch user's votes only if user is authenticated
      if (user?.id) {
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

  // Fetch items on mount
  useEffect(() => {
    fetchItems();
  }, []);

  // Refetch user votes when user changes
  useEffect(() => {
    const fetchUserVotes = async () => {
      if (user?.id) {
        const { data: votesData } = await supabase
          .from("roadmap_votes")
          .select("item_id")
          .eq("user_id", user.id);

        if (votesData) {
          setUserVotes(votesData.map((v: UserVote) => v.item_id));
        }
      } else {
        setUserVotes([]);
      }
    };
    fetchUserVotes();
  }, [user?.id]);

  const handleVote = async (itemId: string) => {
    if (!user?.id) return;

    setVotingItemId(itemId);
    const hasVoted = userVotes.includes(itemId);

    try {
      if (hasVoted) {
        // Remove vote
        const { error: deleteError } = await supabase
          .from("roadmap_votes")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", itemId);

        if (deleteError) throw deleteError;

        // Update votes_count directly in the table
        const currentItem = items.find((i) => i.id === itemId);
        if (currentItem) {
          await supabase
            .from("roadmap_items")
            .update({ votes_count: Math.max(0, currentItem.votes_count - 1) })
            .eq("id", itemId);
        }

        // Update local state
        setUserVotes((prev) => prev.filter((id) => id !== itemId));
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, votes_count: Math.max(0, item.votes_count - 1) }
              : item
          )
        );
      } else {
        // Check if vote already exists (prevent duplicates)
        const { data: existingVote } = await supabase
          .from("roadmap_votes")
          .select("id")
          .eq("user_id", user.id)
          .eq("item_id", itemId)
          .single();

        if (existingVote) {
          // Vote already exists, just update UI
          setUserVotes((prev) => [...prev, itemId]);
          setVotingItemId(null);
          return;
        }

        // Add vote
        const { error: insertError } = await supabase
          .from("roadmap_votes")
          .insert({ user_id: user.id, item_id: itemId });

        if (insertError) throw insertError;

        // Update votes_count directly in the table
        const currentItem = items.find((i) => i.id === itemId);
        if (currentItem) {
          await supabase
            .from("roadmap_items")
            .update({ votes_count: currentItem.votes_count + 1 })
            .eq("id", itemId);
        }

        // Update local state
        setUserVotes((prev) => [...prev, itemId]);
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, votes_count: item.votes_count + 1 }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Erro ao votar:", error);
      // Refetch to sync state on error
      fetchItems();
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Nos ajude a construir essa linda história
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o que estamos construindo e vote nas funcionalidades que você mais deseja
          </p>
        </div>
        <Button 
          onClick={() => setShowSuggestionModal(true)}
          variant="outline"
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Sugestão
        </Button>
      </div>

      {/* Columns - Elegant style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {columns.map((column) => {
          const Icon = column.icon;
          const columnItems = getItemsByStatus(column.id);

          return (
            <div key={column.id} className="space-y-4">
              {/* Column Header */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm",
                  column.accentColor
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground">
                    {column.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">{column.subtitle}</p>
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold",
                  column.pillBg,
                  column.pillText
                )}>
                  {columnItems.length}
                </span>
              </div>

              {/* Items Container */}
              <div className="space-y-3">
                {columnItems.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
                    <p className="text-muted-foreground text-sm">
                      Nenhum item ainda
                    </p>
                  </div>
                ) : (
                  columnItems.map((item) => {
                    const hasVoted = userVotes.includes(item.id);
                    const isVoting = votingItemId === item.id;

                    return (
                      <div 
                        key={item.id} 
                        className={cn(
                          "group relative rounded-2xl border bg-card p-5 transition-all duration-200",
                          "hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5",
                          hasVoted && "ring-2 ring-primary/20"
                        )}
                      >
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-2">
                            <h3 className="font-semibold text-foreground leading-tight">
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleVote(item.id)}
                            disabled={isVoting}
                            className={cn(
                              "flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-lg border-2 transition-all duration-200",
                              hasVoted
                                ? "border-[#7CB342] bg-[#7CB342]/10 text-[#7CB342]"
                                : "border-muted-foreground/20 bg-muted/40 text-muted-foreground hover:border-muted-foreground/30"
                            )}
                          >
                            {isVoting ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <ThumbsUp className={cn(
                                "w-5 h-5",
                                hasVoted && "fill-[#7CB342]"
                              )} />
                            )}
                            <span className="text-sm font-bold">{item.votes_count}</span>
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
        title="💡 Envie sua ideia"
      >
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-sm text-muted-foreground">
              Adoramos ouvir nossos leitores! Sua sugestão será analisada pela nossa equipe e, 
              se aprovada, entrará no nosso roadmap.
            </p>
          </div>
          <Textarea
            placeholder="Qual funcionalidade você gostaria de ver no Babel?"
            value={suggestionContent}
            onChange={(e) => setSuggestionContent(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
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
                  Enviar Sugestão
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

