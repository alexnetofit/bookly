"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Card, CardContent, CardHeader, CardTitle, Progress, Skeleton, EmptyState, Button } from "@/components/ui";
import { Book, BookOpen, BookX, Clock, FileText, Users, Target, Plus, TrendingUp, MessageCircle, Tag } from "lucide-react";
import Link from "next/link";
import type { Book as BookType, AnnualGoal } from "@/types/database";

interface BookStats {
  total: number;
  lido: number;
  lendo: number;
  nao_comecou: number;
  desistido: number;
  total_paginas_lidas: number;
  autores_unicos: number;
  generos_unicos: number;
  total_posts: number;
}

interface AuthorRanking {
  autor: string;
  count: number;
}

export default function DashboardPage() {
  const { user, profile } = useUser();
  const [stats, setStats] = useState<BookStats | null>(null);
  const [goal, setGoal] = useState<AnnualGoal | null>(null);
  const [topAuthors, setTopAuthors] = useState<AuthorRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch user's books only
      const { data: booksData } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", user.id);

      const books = (booksData || []) as BookType[];

      // Fetch user's posts count
      const { count: postsCount } = await supabase
        .from("community_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (books.length > 0) {
        // Calculate unique genres
        const generosUnicos = new Set(
          books
            .filter((b: BookType) => b.genero)
            .map((b: BookType) => b.genero)
        ).size;

        // Calculate stats
        const statsData: BookStats = {
          total: books.length,
          lido: books.filter((b: BookType) => b.status_leitura === "lido").length,
          lendo: books.filter((b: BookType) => b.status_leitura === "lendo").length,
          nao_comecou: books.filter((b: BookType) => b.status_leitura === "nao_comecou").length,
          desistido: books.filter((b: BookType) => b.status_leitura === "desistido").length,
          total_paginas_lidas: books.reduce((acc: number, b: BookType) => acc + (b.paginas_lidas || 0), 0),
          autores_unicos: new Set(books.map((b: BookType) => b.autor.toLowerCase())).size,
          generos_unicos: generosUnicos,
          total_posts: postsCount || 0,
        };
        setStats(statsData);

        // Calculate author ranking
        const authorCount: Record<string, number> = {};
        books
          .filter((b: BookType) => b.status_leitura === "lido")
          .forEach((b: BookType) => {
            const autor = b.autor;
            authorCount[autor] = (authorCount[autor] || 0) + 1;
          });

        const ranking = Object.entries(authorCount)
          .map(([autor, count]) => ({ autor, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTopAuthors(ranking);
      }

      // Fetch annual goal
      const { data: goalData } = await supabase
        .from("annual_goals")
        .select("*")
        .eq("year", currentYear)
        .single();

      if (goalData) {
        setGoal(goalData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const booksReadThisYear = stats?.lido || 0;
  const goalProgress = goal ? (booksReadThisYear / goal.goal_amount) * 100 : 0;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Olá, {profile?.full_name?.split(" ")[0] || "Leitor"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está o resumo da sua jornada de leitura
          </p>
        </div>
        <Link href="/estante/novo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar livro
          </Button>
        </Link>
      </div>

      {/* Annual Goal Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Meta {currentYear}
            </CardTitle>
            {goal && (
              <p className="text-sm text-muted-foreground mt-1">
                {booksReadThisYear} de {goal.goal_amount} livros
              </p>
            )}
          </div>
          <Link href="/metas">
            <Button variant="outline" size="sm">
              {goal ? "Editar meta" : "Definir meta"}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {goal ? (
            <div className="space-y-3">
              <Progress value={goalProgress} max={100} showLabel />
              {goalProgress >= 100 && (
                <p className="text-sm text-primary font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Parabéns! Você atingiu sua meta! 🎉
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Defina uma meta anual para acompanhar seu progresso de leitura.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Lidos"
          value={stats?.lido || 0}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <StatCard
          icon={<Book className="w-5 h-5" />}
          label="Lendo"
          value={stats?.lendo || 0}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Quero ler"
          value={stats?.nao_comecou || 0}
          color="text-gray-500"
          bgColor="bg-gray-500/10"
        />
        <StatCard
          icon={<BookX className="w-5 h-5" />}
          label="Abandonados"
          value={stats?.desistido || 0}
          color="text-red-500"
          bgColor="bg-red-500/10"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Páginas lidas"
          value={stats?.total_paginas_lidas.toLocaleString("pt-BR") || 0}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Autores"
          value={stats?.autores_unicos || 0}
          color="text-orange-500"
          bgColor="bg-orange-500/10"
        />
        <StatCard
          icon={<Tag className="w-5 h-5" />}
          label="Gêneros"
          value={stats?.generos_unicos || 0}
          color="text-pink-500"
          bgColor="bg-pink-500/10"
        />
        <StatCard
          icon={<MessageCircle className="w-5 h-5" />}
          label="Posts"
          value={stats?.total_posts || 0}
          color="text-cyan-500"
          bgColor="bg-cyan-500/10"
        />
      </div>

      {/* Author Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Top 5 Autores Mais Lidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topAuthors.length > 0 ? (
            <div className="space-y-3">
              {topAuthors.map((author, index) => (
                <div
                  key={author.autor}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? "bg-yellow-500/20 text-yellow-600"
                        : index === 1
                        ? "bg-gray-400/20 text-gray-600"
                        : index === 2
                        ? "bg-amber-600/20 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{author.autor}</p>
                    <p className="text-sm text-muted-foreground">
                      {author.count} {author.count === 1 ? "livro lido" : "livros lidos"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="Nenhum autor ainda"
              description="Comece a marcar livros como lidos para ver seu ranking de autores favoritos."
            />
          )}
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
    <Card className="hover:shadow-md transition-shadow">
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

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <Skeleton className="h-40 w-full" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <Skeleton className="h-80 w-full" />
    </div>
  );
}

