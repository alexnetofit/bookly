"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, Button, Input, Textarea, Modal } from "@/components/ui";
import { Plus, Trash2, Loader2, Bell, Send, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PushNotification {
  id: string;
  title: string;
  message: string;
  url: string | null;
  status: "draft" | "sent";
  sent_at: string | null;
  created_at: string;
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Send modal
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [notificationToSend, setNotificationToSend] = useState<PushNotification | null>(null);
  const [sending, setSending] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("push_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setUrl("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (notification: PushNotification) => {
    setTitle(notification.title);
    setMessage(notification.message);
    setUrl(notification.url || "");
    setEditingId(notification.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) return;

    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from("push_notifications")
          .update({
            title: title.trim(),
            message: message.trim(),
            url: url.trim() || null,
          })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("push_notifications")
          .insert({
            title: title.trim(),
            message: message.trim(),
            url: url.trim() || null,
            status: "draft",
          });

        if (error) throw error;
      }

      resetForm();
      fetchNotifications();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar notificação");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta notificação?")) return;

    setDeletingId(id);
    try {
      await supabase.from("push_notifications").delete().eq("id", id);
      fetchNotifications();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const openSendModal = (notification: PushNotification) => {
    setNotificationToSend(notification);
    setSendModalOpen(true);
  };

  const handleSend = async () => {
    if (!notificationToSend) return;

    setSending(true);
    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notificationToSend.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar");
      }

      alert("Notificação enviada com sucesso!");
      setSendModalOpen(false);
      setNotificationToSend(null);
      fetchNotifications();
    } catch (error: any) {
      console.error("Erro ao enviar:", error);
      alert(error.message || "Erro ao enviar notificação");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações Push
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e envie notificações para todos os usuários
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Notificação
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">
              {editingId ? "Editar Notificação" : "Nova Notificação"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Título *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Hora de ler! 📚"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mensagem *</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: Não esqueça de ler hoje para atingir sua meta!"
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL (opcional)</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Ex: /metas"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Página para abrir ao clicar na notificação
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !title.trim() || !message.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
              <Button variant="ghost" onClick={resetForm}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Notificações Salvas</h3>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : notifications.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma notificação criada.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    notification.status === "sent"
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-muted/50"
                  )}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        {notification.status === "sent" && (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                            Enviada
                          </span>
                        )}
                        {notification.status === "draft" && (
                          <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded-full">
                            Rascunho
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      {notification.url && (
                        <p className="text-xs text-muted-foreground mt-1">
                          URL: {notification.url}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Criada em: {new Date(notification.created_at).toLocaleDateString("pt-BR")}
                        {notification.sent_at && (
                          <> • Enviada em: {new Date(notification.sent_at).toLocaleDateString("pt-BR")}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {notification.status === "draft" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(notification)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSendModal(notification)}
                            className="text-green-600 hover:bg-green-50"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notification.id)}
                        disabled={deletingId === notification.id}
                        className="text-red-500 hover:text-red-600"
                      >
                        {deletingId === notification.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Confirmation Modal */}
      <Modal
        isOpen={sendModalOpen}
        onClose={() => {
          setSendModalOpen(false);
          setNotificationToSend(null);
        }}
        title="Confirmar Envio"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Você está prestes a enviar esta notificação para <strong>todos os usuários</strong> que aceitaram receber push.
          </p>
          
          {notificationToSend && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="font-medium">{notificationToSend.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{notificationToSend.message}</p>
            </div>
          )}

          <p className="text-sm text-amber-600 dark:text-amber-400">
            ⚠️ Esta ação não pode ser desfeita.
          </p>

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setSendModalOpen(false);
                setNotificationToSend(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending}
              className="bg-green-600 hover:bg-green-700"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Confirmar Envio
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

