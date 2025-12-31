"use client";

import { useState, useRef, useEffect } from "react";

export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/supabase/storage";
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
import { User, Sun, Moon, LogOut, Save, Camera, AtSign } from "lucide-react";
import { clearAllCaches } from "@/lib/cache";

export default function ConfiguracoesPage() {
  const { profile, refetch } = useUser();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Atualiza os campos quando o profile carregar
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUsername(profile.username || "");
    }
  }, [profile]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Selecione uma imagem válida", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("A imagem deve ter no máximo 2MB", "error");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      let newAvatarUrl = profile?.avatar_url;

      // Upload avatar if changed
      if (avatarFile && profile) {
        setIsUploadingAvatar(true);
        const { url, error } = await uploadAvatar(profile.id, avatarFile);
        if (error) {
          showToast(error, "error");
          setIsSaving(false);
          setIsUploadingAvatar(false);
          return;
        }
        newAvatarUrl = url;
        setIsUploadingAvatar(false);
      }

      // Update profile
      const { error } = await supabase
        .from("users_profile")
        .update({
          full_name: fullName.trim() || null,
          username: username.trim() || null,
          avatar_url: newAvatarUrl,
        })
        .eq("id", profile!.id);

      if (error) throw error;

      showToast("Perfil atualizado com sucesso!", "success");
      setAvatarFile(null);
      setAvatarPreview(null);
      refetch();
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Erro ao atualizar perfil", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    clearAllCaches();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Get initials for avatar fallback
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const displayAvatar = avatarPreview || profile?.avatar_url;

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
        <CardContent className="space-y-6">
          {/* Avatar upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-primary">
                    {getInitials(profile?.full_name)}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="font-medium">Foto de perfil</p>
              <p className="text-sm text-muted-foreground">
                JPG, PNG ou GIF. Máximo 2MB.
              </p>
              {avatarPreview && (
                <p className="text-sm text-primary mt-1">
                  Nova foto selecionada. Clique em salvar para aplicar.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nome completo</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <AtSign className="w-4 h-4" />
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="seu_username"
            />
            <p className="text-xs text-muted-foreground">
              Será exibido na comunidade. Use apenas letras minúsculas, números e underline.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={profile?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <Button onClick={handleSaveProfile} isLoading={isSaving || isUploadingAvatar}>
            <Save className="w-4 h-4 mr-2" />
            {isUploadingAvatar ? "Enviando foto..." : "Salvar alterações"}
          </Button>
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
