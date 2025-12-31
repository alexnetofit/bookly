"use client";

import { useEffect, useState, useCallback } from "react";

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Button,
  Input,
  Skeleton,
} from "@/components/ui";
import type { AnnualGoal, YearlyReadingStats } from "@/types/database";
import { Target, Trophy, Edit2, Check, X, BookOpen, TrendingUp, History, CheckCircle2, XCircle } from "lucide-react";
import { getMetasCache, setMetasCache, invalidateMetasCache, invalidateDashboardCache } from "@/lib/cache";

interface YearData {
  goal: AnnualGoal | null;
  yearly: YearlyReadingStats | null;
  isEditing: boolean;
  newGoalAmount: string;
  isSaving: boolean;
}

interface HistoryYear {
  year: number;
  goal: number;
  booksRead: number;
  achieved: boolean;
}

export default function MetasPage() {
  const { user } = useUser();
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // Inicializa com cache se disponível
  const cachedData = user ? getMetasCache(user.id) : null;
  
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [history, setHistory] = useState<HistoryYear[]>([]);
  
  const [yearData, setYearData] = useState<Record<number, YearData>>(() => {
    if (cachedData) {
      return {
        [currentYear]: { 
          goal: cachedData.yearData[currentYear]?.goal || null,
          yearly: cachedData.yearData[currentYear]?.yearly || null,
          isEditing: false, 
          newGoalAmount: cachedData.yearData[currentYear]?.goal?.goal_amount.toString() || "",
          isSaving: false 
        },
        [nextYear]: { 
          goal: cachedData.yearData[nextYear]?.goal || null,
          yearly: cachedData.yearData[nextYear]?.yearly || null,
          isEditing: false, 
          newGoalAmount: cachedData.yearData[nextYear]?.goal?.goal_amount.toString() || "",
          isSaving: false 
        },
      };
    }
    return {
      [currentYear]: { goal: null, yearly: null, isEditing: false, newGoalAmount: "", isSaving: false },
      [nextYear]: { goal: null, yearly: null, isEditing: false, newGoalAmount: "", isSaving: false },
    };
  });

  const supabase = createClient();
  const { showToast } = useToast();

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    // Se cache válido e não é refresh forçado, usa cache
    const existingCache = getMetasCache(user.id);
    if (!forceRefresh && existingCache) {
      // Reconstrói histórico do cache
      const historyData: HistoryYear[] = [];
      for (const stats of existingCache.allYearlyStats) {
        if (stats.year < currentYear) {
          const goal = existingCache.allGoals.find(g => g.year === stats.year);
          if (goal) {
            historyData.push({
              year: stats.year,
              goal: goal.goal_amount,
              booksRead: stats.books_read,
              achieved: stats.books_read >= goal.goal_amount,
            });
          }
        }
      }
      setHistory(historyData.sort((a, b) => b.year - a.year));
      return;
    }
    
    setIsLoading(true);
    try {
      // Busca todas as metas do usuário (1 query)
      const { data: allGoals } = await supabase
        .from("annual_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: false });

      // Busca todas as estatísticas anuais (1 query - sem N+1!)
      const { data: allYearlyStats } = await supabase
        .from("yearly_reading_stats")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: false });

      const goals = allGoals || [];
      const yearlyStats = allYearlyStats || [];

      // Monta yearData para ano atual e próximo
      const currentYearGoal = goals.find(g => g.year === currentYear) || null;
      const nextYearGoal = goals.find(g => g.year === nextYear) || null;
      const currentYearStats = yearlyStats.find(s => s.year === currentYear) || null;
      const nextYearStats = yearlyStats.find(s => s.year === nextYear) || null;

      const newYearData = {
        [currentYear]: {
          goal: currentYearGoal,
          yearly: currentYearStats,
          isEditing: false,
          newGoalAmount: currentYearGoal?.goal_amount.toString() || "",
          isSaving: false,
        },
        [nextYear]: {
          goal: nextYearGoal,
          yearly: nextYearStats,
          isEditing: false,
          newGoalAmount: nextYearGoal?.goal_amount.toString() || "",
          isSaving: false,
        },
      };

      setYearData(newYearData);

      // Monta histórico de anos anteriores
      const historyData: HistoryYear[] = [];
      for (const goal of goals.filter(g => g.year < currentYear)) {
        const stats = yearlyStats.find(s => s.year === goal.year);
        historyData.push({
          year: goal.year,
          goal: goal.goal_amount,
          booksRead: stats?.books_read || 0,
          achieved: (stats?.books_read || 0) >= goal.goal_amount,
        });
      }
      setHistory(historyData.sort((a, b) => b.year - a.year));

      // Salva no cache
      setMetasCache({
        userId: user.id,
        yearData: {
          [currentYear]: { goal: currentYearGoal, yearly: currentYearStats },
          [nextYear]: { goal: nextYearGoal, yearly: nextYearStats },
        },
        allYearlyStats: yearlyStats,
        allGoals: goals,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentYear, nextYear]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const updateYearData = (year: number, updates: Partial<YearData>) => {
    setYearData(prev => ({
      ...prev,
      [year]: { ...prev[year], ...updates },
    }));
  };

  const handleSaveGoal = async (year: number) => {
    const data = yearData[year];
    const amount = parseInt(data.newGoalAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Digite um número válido maior que zero", "error");
      return;
    }

    updateYearData(year, { isSaving: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (data.goal) {
        const { error } = await supabase
          .from("annual_goals")
          .update({ goal_amount: amount })
          .eq("id", data.goal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("annual_goals").insert({
          user_id: user.id,
          year: year,
          goal_amount: amount,
        });
        if (error) throw error;
      }

      showToast("Meta atualizada com sucesso!", "success");
      updateYearData(year, { isEditing: false });
      
      // Invalida caches e refetch
      invalidateMetasCache();
      invalidateDashboardCache();
      fetchData(true);
    } catch (error) {
      console.error("Error saving goal:", error);
      showToast("Erro ao salvar meta", "error");
    } finally {
      updateYearData(year, { isSaving: false });
    }
  };

  const getProgress = (year: number) => {
    const data = yearData[year];
    const booksRead = data.yearly?.books_read || 0;
    return data.goal ? Math.min((booksRead / data.goal.goal_amount) * 100, 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Metas de Leitura</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe seu progresso de leitura ao longo do ano
        </p>
      </div>

      {/* Goal Cards - 2 columns always */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {[currentYear, nextYear].map((year) => {
          const data = yearData[year];
          const progress = getProgress(year);
          const booksRead = data.yearly?.books_read || 0;
          const remaining = data.goal ? Math.max(data.goal.goal_amount - booksRead, 0) : 0;
          const isCurrentYear = year === currentYear;

          return (
            <Card 
              key={year}
              className={`bg-gradient-to-br ${
                isCurrentYear 
                  ? "from-primary/10 via-primary/5 to-transparent border-primary/20" 
                  : "from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20"
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6 pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm md:text-base">
                  <Target className={`w-4 h-4 md:w-5 md:h-5 ${isCurrentYear ? "text-primary" : "text-blue-500"}`} />
                  <span className="hidden sm:inline">Meta</span> {year}
                </CardTitle>
                {!data.isEditing && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 px-2 text-xs md:text-sm md:h-9 md:px-3"
                    onClick={() => updateYearData(year, { isEditing: true })}
                  >
                    <Edit2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    <span className="hidden sm:inline">{data.goal ? "Editar" : "Definir"}</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-5 p-3 md:p-6 pt-0 md:pt-0">
                {data.isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs md:text-sm font-medium">
                        Livros em {year}
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={data.newGoalAmount}
                        onChange={(e) => updateYearData(year, { newGoalAmount: e.target.value })}
                        placeholder="24"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <Button 
                        onClick={() => handleSaveGoal(year)} 
                        isLoading={data.isSaving} 
                        size="sm"
                        className="h-7 text-xs px-2"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Salvar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => updateYearData(year, { 
                          isEditing: false, 
                          newGoalAmount: data.goal?.goal_amount.toString() || "" 
                        })}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : data.goal ? (
                  <>
                    {/* Main number */}
                    <div className="text-center py-1 md:py-2">
                      <p className={`text-3xl md:text-5xl font-bold ${isCurrentYear ? "text-primary" : "text-blue-500"}`}>
                        {booksRead}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                        de {data.goal.goal_amount} livros
                      </p>
                    </div>

                    {/* Progress bar */}
                    <Progress value={progress} max={100} showLabel />

                    {/* Achievement status */}
                    {progress >= 100 ? (
                      <div className="flex items-center justify-center gap-1.5 p-2 md:p-3 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                        <Trophy className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="text-xs md:text-sm font-medium">Meta atingida! 🎉</span>
                      </div>
                    ) : (
                      <p className="text-center text-xs md:text-sm text-muted-foreground">
                        Faltam <span className="font-semibold text-foreground">{remaining}</span> livros
                      </p>
                    )}

                    {/* Stats inside card */}
                    <div className="grid grid-cols-3 gap-1 md:gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="w-6 h-6 md:w-8 md:h-8 mx-auto rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 mb-0.5 md:mb-1">
                          <BookOpen className="w-3 h-3 md:w-4 md:h-4" />
                        </div>
                        <p className="text-sm md:text-lg font-bold">{booksRead}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Lidos</p>
                      </div>
                      <div className="text-center">
                        <div className={`w-6 h-6 md:w-8 md:h-8 mx-auto rounded-lg ${isCurrentYear ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500"} flex items-center justify-center mb-0.5 md:mb-1`}>
                          <Target className="w-3 h-3 md:w-4 md:h-4" />
                        </div>
                        <p className="text-sm md:text-lg font-bold">{data.goal.goal_amount}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Meta</p>
                      </div>
                      <div className="text-center">
                        <div className="w-6 h-6 md:w-8 md:h-8 mx-auto rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 mb-0.5 md:mb-1">
                          <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                        </div>
                        <p className="text-sm md:text-lg font-bold">{Math.round(progress)}%</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Progresso</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 md:py-8">
                    <Target className={`w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 ${isCurrentYear ? "text-primary/30" : "text-blue-500/30"}`} />
                    <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">Sem meta definida</p>
                    <Button 
                      size="sm"
                      className="h-7 text-xs md:h-9 md:text-sm"
                      onClick={() => updateYearData(year, { isEditing: true })}
                    >
                      Definir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="w-5 h-5" />
              Histórico de Anos Anteriores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((item) => (
                <div 
                  key={item.year}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {item.achieved ? (
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{item.year}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.booksRead} de {item.goal} livros
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${item.achieved ? "text-green-500" : "text-muted-foreground"}`}>
                      {Math.round((item.booksRead / item.goal) * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.achieved ? "Meta atingida" : "Não atingida"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dicas para atingir sua meta</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Leia pelo menos 20 minutos por dia
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Mantenha um livro sempre por perto
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Alterne entre gêneros para não cansar
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Participe de clubes de leitura para se motivar
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
