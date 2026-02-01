"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  PiggyBank,
  Calendar,
  Settings,
  CircleDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/paystubs", label: "Paystubs", icon: FileText },
  { href: "/rsu", label: "RSU Tracker", icon: TrendingUp },
  { href: "/401k", label: "401(k)", icon: PiggyBank },
  { href: "/quarterly", label: "Quarterly", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 flex items-center justify-center",
                  "rounded-[10px] bg-purple-500",
                  "shadow-[0_2px_8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)]",
                  "ring-1 ring-inset ring-white/20",
                  "dark:shadow-[0_2px_12px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.2)]",
                  "dark:ring-white/10"
                )}
              >
                <CircleDollarSign className="h-4 w-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
              </div>
              <span className="font-semibold text-lg hidden sm:block text-foreground">
                Tax Planner
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:block">{item.label}</span>
                </Link>
              );
            })}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
