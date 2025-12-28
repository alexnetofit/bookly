"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useTheme } from "@/components/providers/theme-provider";
import { useToast } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
} from "@/components/ui";
import { User, Sun, Moon, LogOut, Save, Shield, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function ConfiguracoesPage() {
  const { profile, refetch } = useUser();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("users_profile")
        .update({ full_name: fullName.trim() || null })
        .eq("id", profile!.id);

      if (error) throw error;

      showToast("Perfil atualizado com sucesso!", "success");
      refetch();
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Erro ao atualizar perfil", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const planNames = {
    explorer: "Explorador de Páginas (3 meses)",
    traveler: "Viajante de Histórias (6 meses)",
    devourer: "Devorador de Mundos (12 meses)",
  };

  const isSubscriptionActive = profile?.subscription_expires_at
    ? new Date(profile.subscription_expires_at) > new Date()
    : false;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências e informações de conta
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Perfil
          </CardTitle>
          <CardDescription>Suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome completo</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={profile?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <Button onClick={handleSaveProfile} isLoading={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            Salvar alterações
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Assinatura
          </CardTitle>
          <CardDescription>Detalhes do seu plano</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span
                className={`text-sm font-medium ${
                  isSubscriptionActive ? "text-green-500" : "text-red-500"
                }`}
              >
                {isSubscriptionActive ? "Ativo" : "Inativo"}
              </span>
            </div>

            {profile?.plan && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plano</span>
                <span className="text-sm font-medium">
                  {planNames[profile.plan]}
                </span>
              </div>
            )}

            {profile?.subscription_expires_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {isSubscriptionActive ? "Expira em" : "Expirou em"}
                </span>
                <span className="text-sm font-medium">
                  {formatDate(profile.subscription_expires_at)}
                </span>
              </div>
            )}

            {profile?.is_admin && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tipo</span>
                <span className="text-sm font-medium text-primary">
                  Administrador
                </span>
              </div>
            )}
          </div>

          {!isSubscriptionActive && !profile?.is_admin && (
            <p className="text-sm text-muted-foreground">
              Entre em contato para renovar sua assinatura.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>Personalize a interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Tema</p>
              <p className="text-sm text-muted-foreground">
                Escolha entre modo claro ou escuro
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                <Sun className="w-4 h-4 mr-2" />
                Claro
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="w-4 h-4 mr-2" />
                Escuro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-destructive/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Sair da conta</p>
              <p className="text-sm text-muted-foreground">
                Encerrar sua sessão atual
              </p>
            </div>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

