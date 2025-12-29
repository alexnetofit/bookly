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
  Select,
  Modal,
  Badge,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { UserProfile } from "@/types/database";
import {
  CreditCard,
  Search,
  Mail,
  Calendar,
  Edit,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

const planOptions = [
  { value: "", label: "Sem plano" },
  { value: "explorer", label: "Explorador (3 meses)" },
  { value: "traveler", label: "Viajante (6 meses)" },
  { value: "devourer", label: "Devorador (12 meses)" },
];

const planDurations: Record<string, number> = {
  explorer: 3,
  traveler: 6,
  devourer: 12,
};

const filterOptions = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "expired", label: "Expirados" },
  { value: "none", label: "Sem assinatura" },
];

export function AdminSubscriptions() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
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
        .order("subscription_expires_at", { ascending: false, nullsFirst: false });

      if (debouncedSearch) {
        query = query.or(
          `email.ilike.%${debouncedSearch}%,full_name.ilike.%${debouncedSearch}%`
        );
      }

      const { data } = await query.limit(200);
      
      let filtered = data || [];
      const now = new Date();

      if (filter === "active") {
        filtered = filtered.filter(
          (u) =>
            u.is_admin ||
            (u.subscription_expires_at &&
              new Date(u.subscription_expires_at) > now)
        );
      } else if (filter === "expired") {
        filtered = filtered.filter(
          (u) =>
            !u.is_admin &&
            u.subscription_expires_at &&
            new Date(u.subscription_expires_at) <= now
        );
      } else if (filter === "none") {
        filtered = filtered.filter(
          (u) => !u.is_admin && !u.subscription_expires_at
        );
      }

      setUsers(filtered);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const getSubscriptionStatus = (user: UserProfile) => {
    if (user.is_admin) return { status: "admin", label: "Admin", color: "default" };
    if (!user.subscription_expires_at) return { status: "none", label: "Sem assinatura", color: "secondary" };
    
    const expires = new Date(user.subscription_expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (expires > now) {
      if (daysLeft <= 7) {
        return { status: "expiring", label: `Expira em ${daysLeft}d`, color: "reading" };
      }
      return { status: "active", label: "Ativo", color: "read" };
    }
    return { status: "expired", label: "Expirado", color: "abandoned" };
  };

  return (
    <div className="space-y-6">
      {/* Search and filters */}
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
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={filterOptions}
          className="w-full sm:w-48"
        />
        <Button variant="outline" onClick={() => fetchUsers()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold">
                  {users.filter((u) => getSubscriptionStatus(u).status === "active" || getSubscriptionStatus(u).status === "expiring").length}
                </p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">
                  {users.filter((u) => getSubscriptionStatus(u).status === "expiring").length}
                </p>
                <p className="text-sm text-muted-foreground">Expirando (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xl font-bold">
                  {users.filter((u) => getSubscriptionStatus(u).status === "expired").length}
                </p>
                <p className="text-sm text-muted-foreground">Expirados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Assinaturas ({users.length})
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
              icon={<CreditCard className="w-12 h-12" />}
              title="Nenhuma assinatura encontrada"
              description="Não há assinaturas correspondentes aos filtros."
            />
          ) : (
            <div className="divide-y">
              {users.map((user) => {
                const subStatus = getSubscriptionStatus(user);

                return (
                  <div
                    key={user.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.full_name || "Sem nome"}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant={subStatus.color as any}>
                          {subStatus.label}
                        </Badge>
                        {user.plan && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {planOptions.find((p) => p.value === user.plan)?.label}
                          </p>
                        )}
                        {user.subscription_expires_at && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                            <Calendar className="w-3 h-3" />
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
                        Gerenciar
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
        <EditSubscriptionModal
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

function EditSubscriptionModal({
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
          subscription_expires_at: expiresAt
            ? new Date(expiresAt).toISOString()
            : null,
        })
        .eq("id", user.id);

      if (error) throw error;

      showToast("Assinatura atualizada com sucesso!", "success");
      onSuccess();
    } catch (error) {
      console.error("Error updating subscription:", error);
      showToast("Erro ao atualizar assinatura", "error");
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

  const handleRenewPlan = () => {
    if (!plan) return;

    const base = expiresAt ? new Date(expiresAt) : new Date();
    if (base < new Date()) {
      base.setTime(new Date().getTime());
    }
    base.setMonth(base.getMonth() + planDurations[plan]);
    setExpiresAt(base.toISOString().split("T")[0]);
  };

  const handleRevoke = () => {
    setPlan("");
    setExpiresAt("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Assinatura">
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
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleActivatePlan}
            disabled={!plan}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Ativar agora
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRenewPlan}
            disabled={!plan}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Renovar
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRevoke}
          className="w-full text-destructive hover:text-destructive"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Revogar acesso
        </Button>

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

