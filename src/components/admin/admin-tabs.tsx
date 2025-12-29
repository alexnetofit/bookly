"use client";

import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, CreditCard, MessageSquare } from "lucide-react";

export type AdminTab = "dashboard" | "users" | "subscriptions" | "moderation";

interface AdminTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const tabs = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "users" as const, label: "Usuários", icon: Users },
  { id: "subscriptions" as const, label: "Assinaturas", icon: CreditCard },
  { id: "moderation" as const, label: "Moderação", icon: MessageSquare },
];

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  return (
    <div className="border-b">
      <nav className="flex gap-1 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

