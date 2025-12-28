"use client";

import { useEffect, useState, useCallback } from "react";

export const dynamic = "force-dynamic";
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
  Select,
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
  Shield,
  Calendar,
  Mail,
  UserCheck,
  UserX,
  Edit,
  RefreshCw,
} from "lucide-react";

const planOptions = [
  { value: "", label: "Sem plano" },
  { value: "explorer", label: "Explorador de Páginas (3 meses)" },
  { value: "traveler", label: "Viajante de Histórias (6 meses)" },
  { value: "devourer", label: "Devorador de Mundos (12 meses)" },
];

const planDurations: Record<string, number> = {
  explorer: 3,
  traveler: 6,
  devourer: 12,
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const supabase = createClient();
  const { showToast } = useToast();

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

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const isSubscriptionActive = (user: UserProfile) => {
    if (user.is_admin) return true;
    if (!user.subscription_expires_at) return false;
    return new Date(user.subscription_expires_at) > new Date();
  };

  const activeCount = users.filter(isSubscriptionActive).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Painel Admin</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários e assinaturas
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchUsers()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total de usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Assinaturas ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <UserX className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-sm text-muted-foreground">Assinaturas inativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por email ou nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
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
                        {user.subscription_expires_at && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                            <Calendar className="w-3 h-3" />
                            {active ? "Expira:" : "Expirou:"}{" "}
                            {formatDate(user.subscription_expires_at)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit modal */}
      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            fetchUsers();
            setShowEditModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  isOpen,
  onClose,
  onSuccess,
}: {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [plan, setPlan] = useState(user.plan || "");
  const [expiresAt, setExpiresAt] = useState(
    user.subscription_expires_at
      ? new Date(user.subscription_expires_at).toISOString().split("T")[0]
      : ""
  );
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();
  const { showToast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("users_profile")
        .update({
          plan: plan || null,
          subscription_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          is_admin: isAdmin,
        })
        .eq("id", user.id);

      if (error) throw error;

      showToast("Usuário atualizado com sucesso!", "success");
      onSuccess();
    } catch (error) {
      console.error("Error updating user:", error);
      showToast("Erro ao atualizar usuário", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivatePlan = () => {
    if (!plan) return;

    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + planDurations[plan]);
    setExpiresAt(expires.toISOString().split("T")[0]);
  };

  const handleRevoke = () => {
    setPlan("");
    setExpiresAt("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Usuário">
      <div className="space-y-6">
        {/* User info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="font-medium">{user.full_name || "Sem nome"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        {/* Plan selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Plano</label>
          <Select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            options={planOptions}
          />
        </div>

        {/* Expiration date */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Data de expiração</label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleActivatePlan}
            disabled={!plan}
          >
            Ativar plano agora
          </Button>
          <Button variant="outline" size="sm" onClick={handleRevoke}>
            Revogar acesso
          </Button>
        </div>

        {/* Admin toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm">Administrador</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAdmin(!isAdmin)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              isAdmin ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                isAdmin ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

