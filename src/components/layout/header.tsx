"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/providers/theme-provider";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Sun,
  Moon,
  LogOut,
  User,
  Menu,
  Bell,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
  onMenuClick: () => void;
  isSidebarCollapsed: boolean;
}

export function Header({ onMenuClick, isSidebarCollapsed }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { profile } = useUser();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
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

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b flex items-center justify-between px-4 md:px-6 transition-all duration-300",
        isSidebarCollapsed ? "left-16" : "left-64"
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-accent transition-colors md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-lg"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        {/* Notifications placeholder */}
        <Button variant="ghost" size="icon" className="rounded-lg relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </Button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Avatar"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium line-clamp-1">
                {profile?.full_name || "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {profile?.email}
              </p>
            </div>
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border rounded-xl shadow-lg overflow-hidden animate-fade-in">
              <div className="p-3 border-b">
                <p className="font-medium truncate">
                  {profile?.full_name || "Usuário"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {profile?.email}
                </p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push("/configuracoes");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm"
                >
                  <User className="w-4 h-4" />
                  Meu perfil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

