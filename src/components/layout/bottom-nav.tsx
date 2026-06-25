"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { User, Sparkles, Brain } from "lucide-react";

interface BottomNavigationProps {
  activeTab?: "mind" | "ai" | "profile";
  onTabChange?: (tab: "mind" | "ai") => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const pathname = usePathname();

  // Determine active state based on prop or pathname fallback
  const currentActive = activeTab || (pathname === "/profile" ? "profile" : "mind");

  const handleTabClick = (item: { id: "mind" | "ai" | "profile"; path: string }, e: React.MouseEvent) => {
    if (item.id === "profile") {
      return; // Standard navigation to profile page
    }

    if (pathname === "/dashboard") {
      e.preventDefault();
      if (onTabChange) {
        onTabChange(item.id);
      }
    }
  };

  const navItems = [
    {
      id: "mind" as const,
      label: "Mind",
      path: "/dashboard",
      icon: Brain,
    },
    {
      id: "profile" as const,
      label: "Profile",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 h-20 bg-background/80 dark:bg-neutral-950/80 backdrop-blur-md border-t border-neutral-100 dark:border-neutral-900/60 px-6 flex items-center justify-around z-40 select-none pb-safe">
      {navItems.map((item) => {
        const isActive = currentActive === item.id;
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={item.path}
            onClick={(e) => handleTabClick(item, e)}
            className="relative flex flex-col items-center justify-center py-2 px-4 rounded-xl cursor-pointer outline-none tap-highlight-none"
          >
            {/* Active background indicator */}
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 rounded-2xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}

            <motion.div
              animate={{
                scale: isActive ? 1.1 : 1,
                color: isActive ? "rgb(23, 23, 23)" : "rgb(115, 115, 115)",
              }}
              className="text-neutral-500 dark:text-neutral-400 dark:active:text-white"
            >
              <Icon className="w-5 h-5" />
            </motion.div>

            <span className={`text-[10px] mt-1 font-medium tracking-tight ${
              isActive 
                ? "text-neutral-900 dark:text-neutral-100" 
                : "text-neutral-400 dark:text-neutral-500"
            }`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
