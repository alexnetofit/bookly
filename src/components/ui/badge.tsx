import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "reading" | "read" | "not-started" | "abandoned";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary/10 text-primary border border-primary/20",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-border bg-transparent",
    reading: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    read: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
    "not-started": "bg-muted text-muted-foreground border border-border",
    abandoned: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };


