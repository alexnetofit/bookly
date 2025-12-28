"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden animate-fade-in-fast"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn("hidden md:block")}>
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      {/* Mobile sidebar */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar isCollapsed={false} onToggle={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Header */}
      <Header
        onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isSidebarCollapsed={isCollapsed}
      />

      {/* Main content */}
      <main
        className={cn(
          "pt-16 min-h-screen transition-[padding] duration-200 ease-out",
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
    </div>
  );
}

