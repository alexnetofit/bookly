"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { Sun, Moon, User, Settings, LogOut, CreditCard } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { profile } = useUser();
  const supabase = createClient();

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("babel-sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem("babel-sidebar-collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Page transition effect
  useEffect(() => {
    setIsPageTransitioning(true);
    const timeout = setTimeout(() => setIsPageTransitioning(false), 100);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - desktop only */}
      <div className="hidden md:block">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      {/* Header - desktop only */}
      <div className="hidden md:block">
        <Header
          onMenuClick={() => {}}
          isSidebarCollapsed={isCollapsed}
        />
      </div>

      {/* Mobile header - with logo and profile */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-background/80 backdrop-blur-md border-b flex items-center justify-between px-4">
        <div className="w-10" /> {/* Spacer for centering */}
        <Image
          src="/logo_cinza.png"
          alt="Babel"
          width={100}
          height={32}
          className="logo-themed"
          priority
          style={{ height: 32, width: 'auto' }}
        />
        
        {/* Subscription & Profile */}
        <div className="flex items-center gap-2">
          {/* Subscription Icon */}
          <Link
            href="/planos"
            className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center"
          >
            <CreditCard className="w-4 h-4 text-amber-600" />
          </Link>

          {/* Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden"
            >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-primary">
                {getInitials(profile?.full_name)}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-48 bg-background border rounded-lg shadow-lg py-1 z-50">
              {/* Theme Toggle */}
              <button
                onClick={() => {
                  toggleTheme();
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
              </button>

              {/* Configurações */}
              <Link
                href="/configuracoes"
                onClick={() => setShowProfileMenu(false)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configurações
              </Link>

              <div className="border-t my-1" />

              {/* Sair */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className={cn(
          "min-h-screen transition-[padding] duration-200 ease-out",
          "pt-14 pb-20 md:pt-16 md:pb-0",
          isCollapsed ? "md:pl-16" : "md:pl-64"
        )}
      >
        <div 
          className={cn(
            "p-4 md:p-6 lg:p-8 transition-all duration-150 ease-out",
            isPageTransitioning ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
          )}
        >
          {children}
        </div>
      </main>

      {/* Bottom navigation - mobile only */}
      <BottomNav />
    </div>
  );
}
