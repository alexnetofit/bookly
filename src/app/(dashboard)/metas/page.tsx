"use client";

import { useEffect, useState } from "react";

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
  EmptyState,
} from "@/components/ui";
import type { AnnualGoal } from "@/types/database";
import { Target, Trophy, TrendingUp, Edit2, Check, X, BookOpen } from "lucide-react";

interface YearData {
  goal: AnnualGoal | null;
  booksRead: number;
  isEditing: boolean;
  newGoalAmount: string;
  isSaving: boolean;
}

export default function MetasPage() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const [yearData, setYearData] = useState<Record<number, YearData>>({
    [currentYear]: { goal: null, booksRead: 0, isEditing: false, newGoalAmount: "", isSaving: false },
    [nextYear]: { goal: null, booksRead: 0, isEditing: false, newGoalAmount: "", isSaving: false },
  });

  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch goals for both years
      const { data: goalsData } = await supabase
        .from("annual_goals")
        .select("*")
        .in("year", [currentYear, nextYear]);

      // Fetch books read for current year
      const startOfCurrentYear = new Date(currentYear, 0, 1).toISOString();
      const endOfCurrentYear = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();
      const { count: currentYearCount } = await supabase
        .from("books")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("status_leitura", "lido")
        .gte("updated_at", startOfCurrentYear)
        .lte("updated_at", endOfCurrentYear);

      // Fetch books read for next year (will be 0 until next year starts)
      const startOfNextYear = new Date(nextYear, 0, 1).toISOString();
      const endOfNextYear = new Date(nextYear, 11, 31, 23, 59, 59).toISOString();
      const { count: nextYearCount } = await supabase
        .from("books")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("status_leitura", "lido")
        .gte("updated_at", startOfNextYear)
        .lte("updated_at", endOfNextYear);

      const currentYearGoal = goalsData?.find(g => g.year === currentYear) || null;
      const nextYearGoal = goalsData?.find(g => g.year === nextYear) || null;

      setYearData({
        [currentYear]: {
          goal: currentYearGoal,
          booksRead: currentYearCount || 0,
          isEditing: false,
          newGoalAmount: currentYearGoal?.goal_amount.toString() || "",
          isSaving: false,
        },
        [nextYear]: {
          goal: nextYearGoal,
          booksRead: nextYearCount || 0,
          isEditing: false,
          newGoalAmount: nextYearGoal?.goal_amount.toString() || "",
          isSaving: false,
        },
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
        // Update existing goal
        const { error } = await supabase
          .from("annual_goals")
          .update({ goal_amount: amount })
          .eq("id", data.goal.id);

        if (error) throw error;
      } else {
        // Create new goal
        const { error } = await supabase.from("annual_goals").insert({
          user_id: user.id,
          year: year,
          goal_amount: amount,
        });

        if (error) throw error;
      }

      showToast("Meta atualizada com sucesso!", "success");
      updateYearData(year, { isEditing: false });
      fetchData();
    } catch (error) {
      console.error("Error saving goal:", error);
      showToast("Erro ao salvar meta", "error");
    } finally {
      updateYearData(year, { isSaving: false });
    }
  };

  const getProgress = (year: number) => {
    const data = yearData[year];
    return data.goal ? Math.min((data.booksRead / data.goal.goal_amount) * 100, 100) : 0;
  };

  const getRemaining = (year: number) => {
    const data = yearData[year];
    return data.goal ? Math.max(data.goal.goal_amount - data.booksRead, 0) : 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full max-w-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
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

      {/* Goal Cards - 2 columns on mobile */}
      <div className="grid grid-cols-2 gap-4">
        {[currentYear, nextYear].map((year) => {
          const data = yearData[year];
          const progress = getProgress(year);
          const remaining = getRemaining(year);
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
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm md:text-base">
                  <Target className={`w-4 h-4 ${isCurrentYear ? "text-primary" : "text-blue-500"}`} />
                  <span className="hidden sm:inline">Meta</span> {year}
                </CardTitle>
                {!data.isEditing && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => updateYearData(year, { isEditing: true })}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">{data.goal ? "Editar" : "Definir"}</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-2">
                {data.isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        Livros em {year}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={data.newGoalAmount}
                          onChange={(e) => updateYearData(year, { newGoalAmount: e.target.value })}
                          placeholder="24"
                          className="h-8 text-sm"
                        />
                      </div>
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
                    <div className="text-center py-2">
                      <p className={`text-3xl md:text-4xl font-bold ${isCurrentYear ? "text-primary" : "text-blue-500"}`}>
                        {data.booksRead}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                        de {data.goal.goal_amount} livros
                      </p>
                    </div>

                    <Progress value={progress} max={100} showLabel />

                    {progress >= 100 ? (
                      <div className="flex items-center justify-center gap-1.5 p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                        <Trophy className="w-4 h-4" />
                        <span className="text-xs font-medium">Meta atingida! 🎉</span>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-muted-foreground">
                        Faltam <span className="font-semibold text-foreground">{remaining}</span> livros
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Target className={`w-8 h-8 mx-auto mb-2 ${isCurrentYear ? "text-primary/40" : "text-blue-500/40"}`} />
                    <p className="text-xs text-muted-foreground mb-2">Sem meta definida</p>
                    <Button 
                      size="sm" 
                      className="h-7 text-xs"
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

      {/* Stats - Only show if current year has goal */}
      {yearData[currentYear].goal && (
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <StatCard
            icon={<BookOpen className="w-4 h-4 md:w-5 md:h-5" />}
            label="Lidos"
            value={yearData[currentYear].booksRead}
            color="text-green-500"
            bgColor="bg-green-500/10"
          />
          <StatCard
            icon={<Target className="w-4 h-4 md:w-5 md:h-5" />}
            label="Meta"
            value={yearData[currentYear].goal!.goal_amount}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 md:w-5 md:h-5" />}
            label="Progresso"
            value={`${Math.round(getProgress(currentYear))}%`}
            color="text-purple-500"
            bgColor="bg-purple-500/10"
          />
        </div>
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

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center ${color} mb-3`}>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

