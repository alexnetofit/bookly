"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const pathname = usePathname();

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bookly-sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem("bookly-sidebar-collapsed", JSON.stringify(isCollapsed));
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

      {/* Mobile header - simplified */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-background/80 backdrop-blur-md border-b flex items-center justify-between px-4">
        <span className="font-bold text-lg">Bookly</span>
        <div className="flex items-center gap-2">
          {/* Can add notifications, theme toggle here if needed */}
        </div>
      </header>

      {/* Main content */}
      <main
        className={cn(
          "min-h-screen transition-[padding] duration-200 ease-out",
          "pt-14 pb-20 md:pt-16 md:pb-0", // Mobile: top header + bottom nav padding
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
