import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg bg-muted relative overflow-hidden",
        "after:absolute after:inset-0 after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

