"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks";
import {
  LayoutDashboard,
  Library,
  Target,
  Users,
  Shield,
  Map,
} from "lucide-react";

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();
  const { profile } = useUser();

  const navItems = [
    {
      label: "Home",
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
      label: "Social",
      href: "/comunidade",
      icon: Users,
    },
    {
      label: "Roadmap",
      href: "/roadmap",
      icon: Map,
    },
    // Show Admin for admins
    ...(profile?.is_admin
      ? [
          {
            label: "Admin",
            href: "/admin",
            icon: Shield,
          },
        ]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg min-w-[60px]",
                "transition-colors duration-150",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
