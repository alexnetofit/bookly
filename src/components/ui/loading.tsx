"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-3",
  };

  return (
    <div
      className={cn(
        "rounded-full border-primary/30 border-t-primary animate-spin",
        sizes[size],
        className
      )}
    />
  );
}

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = "Carregando..." }: LoadingPageProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-fade-in">
      <LoadingSpinner size="lg" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">Processando...</p>
      </div>
    </div>
  );
}

