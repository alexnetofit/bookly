"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, Skeleton } from "@/components/ui";
import {
  Users,
  BookOpen,
  MessageSquare,
  UserCheck,
  UserX,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalBooks: number;
  totalPosts: number;
  newUsersWeek: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);

      try {
        // Buscar todos os usuários
        const { data: users } = await supabase
          .from("users_profile")
          .select("id, subscription_expires_at, is_admin, created_at");

        // Buscar total de livros
        const { count: booksCount } = await supabase
          .from("books")
          .select("*", { count: "exact", head: true });

        // Buscar total de posts
        const { count: postsCount } = await supabase
          .from("community_posts")
          .select("*", { count: "exact", head: true });

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const totalUsers = users?.length || 0;
        const activeUsers =
          users?.filter((u) => {
            if (u.is_admin) return true;
            if (!u.subscription_expires_at) return false;
            return new Date(u.subscription_expires_at) > now;
          }).length || 0;

        const newUsersWeek =
          users?.filter((u) => new Date(u.created_at) > weekAgo).length || 0;

        setStats({
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          totalBooks: booksCount || 0,
          totalPosts: postsCount || 0,
          newUsersWeek,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: "Total de Usuários",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Assinaturas Ativas",
      value: stats.activeUsers,
      icon: UserCheck,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Assinaturas Inativas",
      value: stats.inactiveUsers,
      icon: UserX,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: "Total de Livros",
      value: stats.totalBooks,
      icon: BookOpen,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Posts na Comunidade",
      value: stats.totalPosts,
      icon: MessageSquare,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      title: "Novos (7 dias)",
      value: stats.newUsersWeek,
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  const activePercentage =
    stats.totalUsers > 0
      ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 ${card.bg} rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Barra de progresso de assinaturas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Taxa de Assinaturas Ativas</h3>
              <p className="text-sm text-muted-foreground">
                {stats.activeUsers} de {stats.totalUsers} usuários
              </p>
            </div>
            <span className="text-2xl font-bold text-primary">
              {activePercentage}%
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${activePercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Calendar className="w-5 h-5" />
            <p className="text-sm">
              Dados atualizados em tempo real. Use as abas acima para gerenciar
              usuários, assinaturas e moderar posts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

