"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Library,
  Users,
  Target,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Estante",
    href: "/estante",
    icon: Library,
  },
  {
    label: "Metas",
    href: "/metas",
    icon: Target,
  },
  {
    label: "Comunidade",
    href: "/comunidade",
    icon: Users,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r flex flex-col",
        "transition-[width] duration-200 ease-out",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          prefetch={true}
        >
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <span className={cn(
            "font-bold text-lg transition-opacity duration-200",
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          )}>
            Bookly
          </span>
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            "p-1.5 rounded-lg hover:bg-accent click-scale",
            isCollapsed && "hidden md:flex absolute -right-3 top-6 bg-card border shadow-sm"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg click-scale",
                "transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                isCollapsed && "justify-center px-2",
                `stagger-${index + 1}`
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={cn(
                "font-medium transition-opacity duration-200",
                isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="p-3 border-t">
        <Link
          href="/configuracoes"
          prefetch={true}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg click-scale",
            "text-muted-foreground hover:bg-accent hover:text-foreground",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Configurações" : undefined}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className={cn(
            "font-medium transition-opacity duration-200",
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            Configurações
          </span>
        </Link>
      </div>
    </aside>
  );
}
