import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "reading" | "read" | "not-started" | "abandoned";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-input bg-transparent",
    reading: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    read: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
    "not-started": "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20",
    abandoned: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
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

