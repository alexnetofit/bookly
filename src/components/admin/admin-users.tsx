"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDebounce } from "@/hooks";
import { useToast } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Modal,
  Badge,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { UserProfile } from "@/types/database";
import {
  Users,
  Search,
  Mail,
  Calendar,
  BookOpen,
  MessageSquare,
  Eye,
  RefreshCw,
} from "lucide-react";

interface UserWithStats extends UserProfile {
  books_count?: number;
  posts_count?: number;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("users_profile")
        .select("*")
        .order("created_at", { ascending: false });

      if (debouncedSearch) {
        query = query.or(
          `email.ilike.%${debouncedSearch}%,full_name.ilike.%${debouncedSearch}%`
        );
      }

      const { data } = await query.limit(100);
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleViewDetails = async (user: UserWithStats) => {
    // Buscar contagem de livros e posts
    const [booksResult, postsResult] = await Promise.all([
      supabase
        .from("books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("community_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    setSelectedUser({
      ...user,
      books_count: booksResult.count || 0,
      posts_count: postsResult.count || 0,
    });
    setShowDetailsModal(true);
  };

  const isSubscriptionActive = (user: UserProfile) => {
    if (user.is_admin) return true;
    if (!user.subscription_expires_at) return false;
    return new Date(user.subscription_expires_at) > new Date();
  };

  return (
    <div className="space-y-6">
      {/* Search and refresh */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => fetchUsers()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuários ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="Nenhum usuário encontrado"
              description="Não há usuários correspondentes à sua busca."
            />
          ) : (
            <div className="divide-y">
              {users.map((user) => {
                const active = isSubscriptionActive(user);

                return (
                  <div
                    key={user.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {user.full_name || "Sem nome"}
                          </p>
                          {user.is_admin && (
                            <Badge variant="default">Admin</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant={active ? "read" : "abandoned"}>
                          {active ? "Ativo" : "Inativo"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                          <Calendar className="w-3 h-3" />
                          Desde {formatDate(user.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(user)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Detalhes
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

function UserDetailsModal({
  user,
  isOpen,
  onClose,
}: {
  user: UserWithStats;
  isOpen: boolean;
  onClose: () => void;
}) {
  const isActive = user.is_admin || 
    (user.subscription_expires_at && new Date(user.subscription_expires_at) > new Date());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Usuário">
      <div className="space-y-6">
        {/* User info */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-lg">
                {user.full_name || "Sem nome"}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <BookOpen className="w-6 h-6 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{user.books_count || 0}</p>
            <p className="text-sm text-muted-foreground">Livros</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <MessageSquare className="w-6 h-6 mx-auto text-cyan-500 mb-2" />
            <p className="text-2xl font-bold">{user.posts_count || 0}</p>
            <p className="text-sm text-muted-foreground">Posts</p>
          </div>
        </div>

        {/* Subscription info */}
        <div className="space-y-3">
          <h4 className="font-medium">Assinatura</h4>
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={isActive ? "read" : "abandoned"}>
                {isActive ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plano:</span>
              <span className="font-medium">
                {user.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : "Nenhum"}
              </span>
            </div>
            {user.subscription_expires_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expira em:</span>
                <span className="font-medium">
                  {formatDate(user.subscription_expires_at)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cadastrado em:</span>
              <span className="font-medium">{formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  );
}


