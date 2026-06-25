"use client";

import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/auth-context";
import { Menu, LogOut, Settings, Shield, Moon, Sun, HelpCircle, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function SidebarMenu() {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check local storage or document class list
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== "undefined") {
      const current = document.documentElement.classList.toggle("dark");
      setIsDarkMode(current);
      localStorage.setItem("theme", current ? "dark" : "light");
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await logout();
    }
  };

  const initial = user?.displayName ? user.displayName.charAt(0) : "M";

  return (
    <Sheet>
      <SheetTrigger render={
        <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 text-neutral-600 dark:text-neutral-300">
          <Menu className="w-5 h-5" />
        </Button>
      } />
      <SheetContent side="left" className="w-[300px] bg-background border-r border-neutral-100 dark:border-neutral-900 flex flex-col p-6 text-foreground outline-none">
        
        {/* Sidebar Header */}
        <SheetHeader className="text-left pb-6 border-b border-neutral-100 dark:border-neutral-900">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-neutral-100 dark:border-neutral-800">
              <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
              <AvatarFallback className="bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-sm truncate">{user?.displayName || "User"}</span>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">{user?.email || "demo.user@memoryai.com"}</span>
            </div>
          </div>
        </SheetHeader>

        {/* Sidebar Navigation */}
        <div className="flex-1 flex flex-col gap-5 py-6 font-medium text-sm">
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-mono">System</div>
          
          <button 
            onClick={toggleTheme}
            className="flex items-center justify-between w-full text-left py-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer outline-none"
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <span className="text-[11px] bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded-full font-mono uppercase">
              {isDarkMode ? "Dark" : "Light"}
            </span>
          </button>

          <a 
            href="/dashboard" 
            className="flex items-center gap-3 py-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>AI Settings</span>
          </a>

          <a 
            href="/profile" 
            className="flex items-center gap-3 py-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>Privacy & Security</span>
          </a>

          <div className="h-px bg-neutral-100 dark:bg-neutral-900 my-2" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-mono">Support</div>

          <button 
            onClick={() => alert("Memory AI user guide coming soon!")}
            className="flex items-center gap-3 py-2 text-left text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer outline-none"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help Center</span>
          </button>

          <button 
            onClick={() => alert("Terms & Privacy Policy")}
            className="flex items-center gap-3 py-2 text-left text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer outline-none"
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-neutral-100 dark:border-neutral-900">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 gap-3 px-2 rounded-xl transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-semibold text-sm">Sign Out</span>
          </Button>
          <div className="text-[10px] text-center text-neutral-400 dark:text-neutral-600 mt-4 font-mono">
            Memory AI v1.0.0
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
}
