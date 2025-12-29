"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import {
  AdminTabs,
  AdminDashboard,
  AdminUsers,
  AdminSubscriptions,
  AdminModeration,
  type AdminTab,
} from "@/components/admin";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Painel Admin</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Gerencie usuários, assinaturas e modere a comunidade
        </p>
      </div>

      {/* Tabs */}
      <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <div className="pt-2">
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "subscriptions" && <AdminSubscriptions />}
        {activeTab === "moderation" && <AdminModeration />}
      </div>
    </div>
  );
}
