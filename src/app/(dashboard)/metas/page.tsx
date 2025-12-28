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

export default function MetasPage() {
  const { user } = useUser();
  const [goal, setGoal] = useState<AnnualGoal | null>(null);
  const [booksReadThisYear, setBooksReadThisYear] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newGoalAmount, setNewGoalAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch current year goal
      const { data: goalData } = await supabase
        .from("annual_goals")
        .select("*")
        .eq("year", currentYear)
        .single();

      if (goalData) {
        setGoal(goalData);
        setNewGoalAmount(goalData.goal_amount.toString());
      }

      // Fetch user's books read this year
      const startOfYear = new Date(currentYear, 0, 1).toISOString();
      const { data: books, count } = await supabase
        .from("books")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("status_leitura", "lido")
        .gte("updated_at", startOfYear);

      setBooksReadThisYear(count || 0);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    const amount = parseInt(newGoalAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Digite um número válido maior que zero", "error");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (goal) {
        // Update existing goal
        const { error } = await supabase
          .from("annual_goals")
          .update({ goal_amount: amount })
          .eq("id", goal.id);

        if (error) throw error;
      } else {
        // Create new goal
        const { error } = await supabase.from("annual_goals").insert({
          user_id: user.id,
          year: currentYear,
          goal_amount: amount,
        });

        if (error) throw error;
      }

      showToast("Meta atualizada com sucesso!", "success");
      setIsEditing(false);
      fetchData();
    } catch (error) {
      console.error("Error saving goal:", error);
      showToast("Erro ao salvar meta", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const progress = goal ? Math.min((booksReadThisYear / goal.goal_amount) * 100, 100) : 0;
  const remaining = goal ? Math.max(goal.goal_amount - booksReadThisYear, 0) : 0;

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

      {/* Main Goal Card */}
      <Card className="max-w-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Meta {currentYear}
          </CardTitle>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {goal ? "Editar" : "Definir meta"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quantos livros você quer ler em {currentYear}?
                </label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    min="1"
                    value={newGoalAmount}
                    onChange={(e) => setNewGoalAmount(e.target.value)}
                    placeholder="Ex: 24"
                    className="max-w-[120px]"
                  />
                  <span className="flex items-center text-muted-foreground">livros</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveGoal} isLoading={isSaving} size="sm">
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setNewGoalAmount(goal?.goal_amount.toString() || "");
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : goal ? (
            <>
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-primary">{booksReadThisYear}</p>
                <p className="text-muted-foreground mt-1">
                  de {goal.goal_amount} livros
                </p>
              </div>

              <Progress value={progress} max={100} showLabel />

              {progress >= 100 ? (
                <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                  <Trophy className="w-5 h-5" />
                  <span className="font-medium">Parabéns! Você atingiu sua meta! 🎉</span>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  Faltam <span className="font-semibold text-foreground">{remaining}</span> livros
                  para atingir sua meta
                </p>
              )}
            </>
          ) : (
            <EmptyState
              icon={<Target className="w-12 h-12" />}
              title="Nenhuma meta definida"
              description="Defina uma meta anual para acompanhar seu progresso de leitura."
              action={
                <Button onClick={() => setIsEditing(true)}>Definir meta</Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {goal && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<BookOpen className="w-5 h-5" />}
            label="Livros lidos"
            value={booksReadThisYear}
            color="text-green-500"
            bgColor="bg-green-500/10"
          />
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="Meta"
            value={goal.goal_amount}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Progresso"
            value={`${Math.round(progress)}%`}
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

