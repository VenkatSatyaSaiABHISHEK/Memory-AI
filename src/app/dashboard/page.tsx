"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { SidebarMenu } from "@/components/layout/sidebar-menu";
import { useAuth } from "@/context/auth-context";
import { memoryService, Memory } from "@/lib/memory-service";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Calendar, Clock, Sparkles, Brain, Check, Grid, List as ListIcon, ChevronDown, ChevronUp, Eye, Edit3, Heart, BarChart2, Star, Tag, Share2, X, Shield, Lock, Link as LinkIcon, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CalendarView } from "@/components/ui/calendar-view";
import { OnboardingTour } from "@/components/ui/onboarding-tour";
import { MultiAddTable } from "@/components/ui/multi-add-table";
import { Button } from "@/components/ui/button";


const parseMarkdown = (markdown: string) => {
  if (!markdown) return "";
  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*?)$/gm, "<h3 class='text-xs font-bold mt-3 mb-1'>$1</h3>")
    .replace(/^## (.*?)$/gm, "<h2 class='text-sm font-bold mt-4 mb-2'>$1</h2>")
    .replace(/^# (.*?)$/gm, "<h1 class='text-base font-bold mt-5 mb-2.5'>$1</h1>")
    .replace(/^\- (.*?)$/gm, "<li class='list-disc list-inside ml-2 text-xs'>$1</li>")
    .replace(/\n/g, "<br />");
  return html;
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  
  // App States
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"feed" | "timeline">("feed");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Phase 5 SaaS states
  const [activeDashboardTab, setActiveDashboardTab] = useState<"feed" | "analytics" | "multiadd">("feed");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [shareDate, setShareDate] = useState(new Date().toISOString().split("T")[0]);
  const [shareCopied, setShareCopied] = useState(false);
  const [aiShareText, setAiShareText] = useState("");
  const [aiShareLoading, setAiShareLoading] = useState(false);
  const [shareDuration, setShareDuration] = useState(1);
  const [generatedShareLink, setGeneratedShareLink] = useState("");
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [isShareSidebarOpen, setIsShareSidebarOpen] = useState(false);
  const [isAiHubSidebarOpen, setIsAiHubSidebarOpen] = useState(false);
  const [selectedDaySummaryDate, setSelectedDaySummaryDate] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setIsDesktop(window.innerWidth >= 1024);
      };
      handleResize();
      window.addEventListener("resize", handleResize);

      const completed = localStorage.getItem("memory_ai_onboarding_completed");
      if (!completed) {
        setShowOnboarding(true);
      }
      
      const params = new URLSearchParams(window.location.search);
      if (params.get("openShare") === "true") {
        setIsShareSidebarOpen(true);
      }
      setIsDarkMode(document.documentElement.classList.contains("dark"));

      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("memory_ai_onboarding_completed", "true");
    setShowOnboarding(false);
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setIsDarkMode(isDark);
  };


  const handleToggleFavorite = async (memoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const memory = memories.find((m) => m.id === memoryId);
    if (!memory) return;
    
    const nextState = !memory.favorite;
    
    setMemories((prev) =>
      prev.map((m) => (m.id === memoryId ? { ...m, favorite: nextState } : m))
    );
    
    try {
      await memoryService.updateMemory(memoryId, user.uid, { favorite: nextState });
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      setMemories((prev) =>
        prev.map((m) => (m.id === memoryId ? { ...m, favorite: !nextState } : m))
      );
    }
  };

  // AI Hub States
  const [aiHubOpen, setAiHubOpen] = useState(false);
  const [aiHubTab, setAiHubTab] = useState<"digest" | "insights" | "search">("digest");
  const [digestType, setDigestType] = useState<"daily" | "weekly">("daily");
  
  const [digestContent, setDigestContent] = useState<string | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  
  const [insightsData, setInsightsData] = useState<{ insights: string[]; mood: string; recommendations: string[] } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  
  const [smartSearchQuery, setSmartSearchQuery] = useState("");
  const [smartSearchResults, setSmartSearchResults] = useState<{ memory: Memory; relevance: number; explanation: string }[]>([]);
  const [smartSearchLoading, setSmartSearchLoading] = useState(false);

  // AI fetch handlers
  const fetchAIDigest = async () => {
    setDigestLoading(true);
    try {
      let filtered = [];
      const now = new Date();
      if (digestType === "daily") {
        const todayStr = now.toISOString().split("T")[0];
        filtered = memories.filter((m) => m.date === todayStr);
      } else {
        filtered = memories.filter((m) => {
          const mDate = new Date(m.date);
          const diffTime = Math.abs(now.getTime() - mDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        });
      }

      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories: filtered, type: digestType }),
      });
      if (!res.ok) throw new Error("AI Summary failed");
      const data = await res.json();
      setDigestContent(data.summary);
    } catch (e) {
      console.error(e);
      alert("Failed to generate AI Digest.");
    } finally {
      setDigestLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories }),
      });
      if (!res.ok) throw new Error("AI Insights failed");
      const data = await res.json();
      setInsightsData(data);
    } catch (e) {
      console.error(e);
      alert("Failed to retrieve insights.");
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSmartSearch = async () => {
    if (!smartSearchQuery.trim()) return;
    setSmartSearchLoading(true);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: smartSearchQuery.trim(), memories }),
      });
      if (!res.ok) throw new Error("AI Smart Search failed");
      const data = await res.json();
      
      const results = (data.matches || []).map((m: any) => {
        const mem = memories.find((x) => x.id === m.id);
        return mem ? { memory: mem, relevance: m.relevance, explanation: m.explanation } : null;
      }).filter(Boolean);

      setSmartSearchResults(results as any);
    } catch (e) {
      console.error(e);
      alert("Smart search query failed.");
    } finally {
      setSmartSearchLoading(false);
    }
  };

  // Fetch memories on mount / user change
  useEffect(() => {
    async function loadMemories() {
      if (!user) return;
      try {
        setLoading(true);
        const data = await memoryService.fetchMemories(user.uid);
        setMemories(data);
      } catch (e) {
        console.error("Failed to load memories", e);
      } finally {
        setLoading(false);
      }
    }
    loadMemories();
  }, [user]);

  const filteredMemories = memories.filter((m) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      m.title.toLowerCase().includes(query) ||
      m.content.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query) ||
      (m.tags && m.tags.some(t => t.toLowerCase().includes(query)));

    const matchesTag = !selectedTag || (m.tags && m.tags.includes(selectedTag));
    const matchesDate = !selectedDate || m.date === selectedDate;
    const matchesFavorites = !showFavoritesOnly || m.favorite === true;

    return matchesSearch && matchesTag && matchesDate && matchesFavorites;
  });

  const allTags = Array.from(
    new Set(memories.flatMap((m) => m.tags || []))
  ).filter(Boolean);


  const toggleExpandCard = (id: string, e: React.MouseEvent) => {
    // Prevent expanding if clicking an inner interactive button
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  const format24hToAMPM = (time24?: string): string => {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (isNaN(h) || isNaN(m)) return time24;
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const minStr = String(m).padStart(2, "0");
    return `${hour12}:${minStr} ${ampm}`;
  };

  // Fetch AI compiled share summary
  const fetchAIShareSummary = async (dateStr: string) => {
    const dayLogs = memories.filter((m) => m.date === dateStr);
    if (dayLogs.length === 0) return;
    
    setAiShareLoading(true);
    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories: dayLogs, type: "daily" })
      });
      const data = await response.json();
      if (data.summary) {
        setAiShareText(data.summary);
      } else {
        alert("Failed to compile AI summary report.");
      }
    } catch (err) {
      console.error(err);
      alert("Error compiling AI summary report.");
    } finally {
      setAiShareLoading(false);
    }
  };

  // Generate public secure share link
  const handleGeneratePublicShareLink = async (dateStr: string) => {
    const dayLogs = memories.filter((m) => m.date === dateStr);
    if (dayLogs.length === 0) return;

    setShareLinkLoading(true);
    try {
      const shareId = await memoryService.createSharedLink(user?.uid || "anonymous", dateStr, dayLogs, shareDuration, aiShareText || undefined);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const publicLink = `${origin}/shared/${shareId}`;
      setGeneratedShareLink(publicLink);
    } catch (err) {
      console.error(err);
      alert("Failed to generate public share link.");
    } finally {
      setShareLinkLoading(false);
    }
  };

  const initial = user?.displayName ? user.displayName.charAt(0) : "M";

  if (isDesktop) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen w-full flex bg-neutral-50 dark:bg-neutral-950 text-foreground transition-colors duration-300">
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className="w-64 border-r border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 flex flex-col justify-between p-6 select-none shrink-0 text-left">
            <div className="space-y-8">
              {/* App Logo */}
              <div className="flex items-center gap-2.5 px-2">
                <div className="w-9 h-9 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-md">
                  <Brain className="w-5.5 h-5.5" />
                </div>
                <span className="font-extrabold text-neutral-955 dark:text-white tracking-tight text-sm uppercase">Mind Space</span>
              </div>

              {/* Navigation Menu */}
              <nav className="flex flex-col gap-1.5 text-xs font-mono uppercase tracking-wider font-bold text-neutral-450 dark:text-neutral-500">
                <button
                  onClick={() => {
                    setActiveDashboardTab("feed");
                    setIsShareSidebarOpen(false);
                    setIsAiHubSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer text-left outline-none ${
                    activeDashboardTab === "feed" && !isShareSidebarOpen && !isAiHubSidebarOpen
                      ? "bg-neutral-50 dark:bg-neutral-900 text-neutral-950 dark:text-white"
                      : "hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  <ListIcon className="w-4 h-4" />
                  <span>Mind Logs Feed</span>
                </button>
                
                <button
                  onClick={() => {
                    setActiveDashboardTab("analytics");
                    setIsShareSidebarOpen(false);
                    setIsAiHubSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer text-left outline-none ${
                    activeDashboardTab === "analytics" && !isShareSidebarOpen && !isAiHubSidebarOpen
                      ? "bg-neutral-50 dark:bg-neutral-900 text-neutral-955 dark:text-white"
                      : "hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Analytics</span>
                </button>

                <button
                  onClick={() => {
                    setActiveDashboardTab("multiadd");
                    setIsShareSidebarOpen(false);
                    setIsAiHubSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer text-left outline-none ${
                    activeDashboardTab === "multiadd" && !isShareSidebarOpen && !isAiHubSidebarOpen
                      ? "bg-neutral-50 dark:bg-neutral-900 text-neutral-955 dark:text-white"
                      : "hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  <Grid className="w-4 h-4 text-emerald-500" />
                  <span>Multi-Add (Excel)</span>
                </button>

                <button
                  onClick={() => {
                    setIsShareSidebarOpen(true);
                    setIsAiHubSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer text-left outline-none ${
                    isShareSidebarOpen
                      ? "bg-neutral-50 dark:bg-neutral-900 text-neutral-955 dark:text-white"
                      : "hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  <Share2 className="w-4 h-4 text-indigo-500" />
                  <span>Share Compiler</span>
                </button>

                <button
                  onClick={() => {
                    setIsAiHubSidebarOpen(true);
                    setIsShareSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer text-left outline-none ${
                    isAiHubSidebarOpen
                      ? "bg-neutral-50 dark:bg-neutral-900 text-neutral-955 dark:text-white"
                      : "hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>AI Intel Hub</span>
                </button>
              </nav>
            </div>

            {/* Profile / Logout at bottom */}
            <div className="border-t border-neutral-100 dark:border-neutral-900 pt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 px-1.5">
                <Avatar className="h-8 w-8 border border-neutral-100 dark:border-neutral-850">
                  <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                  <AvatarFallback className="bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-250 font-bold text-xs">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left truncate">
                  <span className="text-xs font-bold text-neutral-955 dark:text-white block truncate leading-tight">{user?.displayName || "Member"}</span>
                  <span className="text-[9.5px] font-mono text-neutral-400 block truncate">{user?.email}</span>
                </div>
              </div>
              
              <button
                onClick={() => logout()}
                className="w-full text-center py-2.5 bg-red-500/10 hover:bg-red-500/15 text-red-500 border border-red-500/20 hover:border-red-500/30 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer outline-none"
              >
                Sign Out
              </button>
            </div>
          </aside>

          {/* MAIN DESKTOP BODY */}
          <main className="flex-1 flex flex-col min-w-0 bg-neutral-50 dark:bg-neutral-955 overflow-y-auto px-10 py-8 relative">
            
            {/* Header toolbar */}
            <header className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-5 mb-8 shrink-0">
              <div className="text-left">
                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 font-bold block">Secure Digital Mind Portal</span>
                <h1 className="text-lg font-black text-neutral-955 dark:text-white tracking-tight leading-tight">
                  {activeDashboardTab === "multiadd" ? "Multi-Add Spreadsheet Mode" :
                   activeDashboardTab === "analytics" ? "Core Metrics & Calendar Insights" : "My Personal Activity Log Feed"}
                </h1>
              </div>

              {/* Right Side Tools */}
              <div className="flex items-center gap-4">
                {activeDashboardTab === "feed" && !isShareSidebarOpen && !isAiHubSidebarOpen && (
                  <div className="relative w-72">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Search title, tags, or content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 rounded-xl text-xs placeholder:text-neutral-400 shadow-none focus-visible:ring-0 text-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                )}
                
                {/* Theme Toggle */}
                <button 
                  onClick={toggleTheme}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-500 cursor-pointer outline-none transition-colors"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Add memory float link */}
                <Link href="/memories/new">
                  <Button className="h-10 px-4 rounded-xl text-[10px] font-mono uppercase tracking-wider bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 flex items-center gap-1.5 shadow-md">
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Log</span>
                  </Button>
                </Link>
              </div>
            </header>

            {/* Desktop Inner Tab rendering */}
            <div className="flex-1 min-h-0 flex flex-col">
              
              {/* Multiadd spreadsheets tab */}
              {activeDashboardTab === "multiadd" && (
                <div className="w-full bg-white dark:bg-neutral-950 p-6 rounded-[28px] border border-neutral-100 dark:border-neutral-900 shadow-sm flex-1">
                  <MultiAddTable 
                    userId={user?.uid || "anonymous"}
                    onSuccess={() => setActiveDashboardTab("feed")}
                    onCancel={() => setActiveDashboardTab("feed")}
                  />
                </div>
              )}

              {/* Feed Tab */}
              {activeDashboardTab === "feed" && !isShareSidebarOpen && !isAiHubSidebarOpen && (
                <div className="grid grid-cols-3 gap-8 items-start">
                  
                  {/* Left columns (Logs list) */}
                  <div className="col-span-2 space-y-6">
                    {/* View mode switcher */}
                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        {/* Selected tags or filter info */}
                        {selectedDate && (
                          <div className="h-8 px-3 rounded-full flex items-center gap-1.5 text-[9px] font-mono bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 transition-all shrink-0">
                            <Calendar className="w-3 h-3" />
                            <span>{selectedDate}</span>
                            <button onClick={() => setSelectedDate(null)} className="w-3.5 h-3.5 rounded-full font-bold hover:opacity-80">×</button>
                          </div>
                        )}
                        {selectedTag && (
                          <div className="h-8 px-3 rounded-full flex items-center gap-1.5 text-[9px] font-mono bg-neutral-950 text-white dark:bg-white dark:text-neutral-955 transition-all shrink-0">
                            <span>#{selectedTag}</span>
                            <button onClick={() => setSelectedTag(null)} className="w-3.5 h-3.5 rounded-full font-bold hover:opacity-80">×</button>
                          </div>
                        )}
                        {showFavoritesOnly && (
                          <div className="h-8 px-3 rounded-full flex items-center gap-1.5 text-[9px] font-mono bg-red-500 text-white transition-all shrink-0">
                            <Heart className="w-3 h-3 fill-white" />
                            <span>Favorites</span>
                            <button onClick={() => setShowFavoritesOnly(false)} className="w-3.5 h-3.5 rounded-full font-bold hover:opacity-80">×</button>
                          </div>
                        )}
                      </div>

                      <div className="flex bg-neutral-50 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                        <button
                          onClick={() => setViewMode("feed")}
                          className={`p-1.5 rounded-md transition-all cursor-pointer outline-none ${
                            viewMode === "feed" ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-950 dark:text-white" : "text-neutral-400 hover:text-neutral-600"
                          }`}
                        >
                          <ListIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setViewMode("timeline")}
                          className={`p-1.5 rounded-md transition-all cursor-pointer outline-none ${
                            viewMode === "timeline" ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-955 dark:text-white" : "text-neutral-400 hover:text-neutral-600"
                          }`}
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Standard lists */}
                    {loading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="h-28 bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 rounded-[24px] animate-pulse" />
                        ))}
                      </div>
                    ) : filteredMemories.length === 0 ? (
                      <div className="text-center py-20 text-xs text-neutral-450 dark:text-neutral-600 bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 rounded-[28px]">
                        No memories matched your search query or active filters.
                      </div>
                    ) : viewMode === "feed" ? (
                      /* Daily feed view inside desktop layout */
                      (() => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const memoriesByDate = filteredMemories.reduce((groups: Record<string, Memory[]>, memory) => {
                          const date = memory.date;
                          if (!groups[date]) groups[date] = [];
                          groups[date].push(memory);
                          return groups;
                        }, {});

                        const sortedDates = Object.keys(memoriesByDate).sort((a, b) => b.localeCompare(a));
                        const hasToday = sortedDates.includes(todayStr);

                        const getFormatDateHeading = (dateStr: string) => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          const yesterdayStr = yesterday.toISOString().split("T")[0];
                          if (dateStr === todayStr) return "Today";
                          if (dateStr === yesterdayStr) return "Yesterday";
                          const [y, m, d] = dateStr.split("-");
                          const date = new Date(Number(y), Number(m) - 1, Number(d));
                          return date.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        };

                        return (
                          <div className="space-y-8">
                            {!hasToday && !searchQuery && !selectedTag && !selectedDate && !showFavoritesOnly && (
                              <div className="p-5 border border-dashed border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-955 rounded-[24px] text-left text-xs text-neutral-450 space-y-1">
                                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 font-bold block">Today</span>
                                <div className="text-neutral-500 italic">No activities logged today. Click "New Log" above to track your daily work.</div>
                              </div>
                            )}

                            {sortedDates.map((dateStr) => (
                              <div key={dateStr} className="space-y-4">
                                <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-bold text-left border-b border-neutral-100 dark:border-neutral-900 pb-1.5">
                                  {getFormatDateHeading(dateStr)}
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                  {memoriesByDate[dateStr].map((m) => (
                                    <Card key={m.id} className="p-5 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-[24px] shadow-none space-y-3.5 text-left hover:border-neutral-250 transition-all select-none">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                          <h4 className="text-xs font-bold text-neutral-955 dark:text-white leading-tight">{m.title}</h4>
                                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-400 dark:text-neutral-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{m.fromTime && m.toTime ? `${format24hToAMPM(m.fromTime)} - ${format24hToAMPM(m.toTime)} (${m.duration})` : format24hToAMPM(m.time)}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[7.5px] uppercase tracking-wider px-2 py-0.5 rounded-full font-mono font-bold bg-neutral-50 dark:bg-neutral-900 text-neutral-555 border border-neutral-100 dark:border-neutral-850">
                                            {m.category}
                                          </span>
                                          <button onClick={(e) => handleToggleFavorite(m.id, e)} className="text-neutral-450 hover:text-red-505 transition-colors">
                                            <Heart className={`w-3.5 h-3.5 ${m.favorite ? "fill-red-500 text-red-500" : ""}`} />
                                          </button>
                                        </div>
                                      </div>
                                      <p className="text-xs text-neutral-600 dark:text-neutral-350 leading-relaxed font-sans font-normal border-t border-neutral-50 dark:border-neutral-900/50 pt-3">{m.content}</p>
                                      {m.tags && m.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                          {m.tags.map(tag => (
                                            <span key={tag} className="text-[9px] font-mono text-neutral-400">#{tag}</span>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Pictures display in card if present */}
                                      {m.images && m.images.length > 0 && (
                                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-neutral-50 dark:border-neutral-900/40">
                                          {m.images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-neutral-100 dark:border-neutral-850 bg-neutral-50">
                                              <img src={img.url} alt={img.name} className="object-cover w-full h-full" />
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      <div className="flex items-center gap-2 pt-1.5">
                                        <Link href={`/memories/${m.id}`} className="text-[9px] uppercase font-mono font-bold tracking-wider bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-3 py-1.5 rounded-lg hover:opacity-85">Read</Link>
                                        <Link href={`/memories/${m.id}/edit`} className="text-[9px] uppercase font-mono font-bold tracking-wider bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-lg hover:opacity-85">Edit</Link>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    ) : (
                      /* Chronological Timeline */
                      <div className="relative pl-6 space-y-6 text-left text-xs select-none">
                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-neutral-100 dark:bg-neutral-900 border-l border-dashed border-neutral-200 dark:border-neutral-800" />
                        {filteredMemories.map((m) => (
                          <div key={m.id} className="relative space-y-2">
                            <div className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-neutral-950 border-2 border-neutral-950 dark:border-white" />
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-[10px] font-bold text-neutral-955 dark:text-white bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded">{m.date}</span>
                              <span className="text-[9px] text-neutral-450 font-mono">{m.fromTime || m.time}</span>
                            </div>
                            <Card className="p-4 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl shadow-none">
                              <h4 className="text-xs font-bold text-neutral-955 dark:text-white leading-tight">{m.title}</h4>
                              <p className="text-xs text-neutral-500 dark:text-neutral-455 line-clamp-2 leading-relaxed mt-1">{m.content}</p>
                              <div className="flex gap-2 pt-2">
                                <Link href={`/memories/${m.id}`} className="text-[9px] uppercase font-mono font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-2.5 py-1 rounded-lg">Read</Link>
                              </div>
                            </Card>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right column (Calendar, Stats & AI Digest preview) */}
                  <div className="col-span-1 space-y-6">
                    {/* Stats Widget */}
                    <Card className="p-6 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-[28px] shadow-none space-y-4">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 font-bold block text-left border-b pb-2">Workspace Overview</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-left">
                          <span className="text-[8.5px] uppercase font-mono text-neutral-400">Total Entries</span>
                          <h3 className="text-lg font-black text-neutral-955 dark:text-white font-mono">{memories.length}</h3>
                        </div>
                        <div className="text-left">
                          <span className="text-[8.5px] uppercase font-mono text-neutral-400">Active Days</span>
                          <h3 className="text-lg font-black text-neutral-955 dark:text-white font-mono">{new Set(memories.map(m => m.date)).size}</h3>
                        </div>
                      </div>
                    </Card>

                    {/* Interactive Calendar widget */}
                    <div className="space-y-2 text-left">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono font-bold block">Logs Calendar</span>
                      <CalendarView
                        activeDates={Array.from(new Set(memories.map(m => m.date)))}
                        selectedDate={selectedDate}
                        onDateSelect={(dateStr) => {
                          setSelectedDaySummaryDate(dateStr);
                        }}
                      />
                    </div>

                    {/* Category Dist card */}
                    <Card className="p-5 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-955 rounded-[28px] shadow-none text-left space-y-3.5">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-bold block">Category progress</span>
                      <div className="space-y-3.5">
                        {["Note", "Activity", "Insight", "Reminder"].map((cat) => {
                          const count = memories.filter((m) => m.category === cat).length;
                          const percentage = memories.length > 0 ? (count / memories.length) * 100 : 0;
                          return (
                            <div key={cat} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-neutral-800 dark:text-neutral-250">{cat}</span>
                                <span className="font-mono text-neutral-450">{count} ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-neutral-50 dark:bg-neutral-900 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${cat === "Activity" ? "bg-blue-500" : cat === "Insight" ? "bg-amber-500" : cat === "Reminder" ? "bg-red-500" : "bg-neutral-500"}`} style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>

                </div>
              )}

              {/* Analytics tab inside desktop view */}
              {activeDashboardTab === "analytics" && !isShareSidebarOpen && !isAiHubSidebarOpen && (
                <div className="space-y-6 max-w-4xl text-left bg-white dark:bg-neutral-950 p-8 rounded-[28px] border border-neutral-100 dark:border-neutral-900 flex-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 font-bold block">Workspace Intelligence Analytics</span>
                  <div className="grid grid-cols-4 gap-4">
                    <Card className="p-4 border bg-neutral-50/10 rounded-2xl text-left space-y-1 shadow-none">
                      <span className="text-[9px] uppercase font-mono text-neutral-450">Memories</span>
                      <h3 className="text-xl font-bold">{memories.length}</h3>
                    </Card>
                    <Card className="p-4 border bg-neutral-50/10 rounded-2xl text-left space-y-1 shadow-none">
                      <span className="text-[9px] uppercase font-mono text-neutral-450">Active Days</span>
                      <h3 className="text-xl font-bold">{new Set(memories.map(m => m.date)).size}</h3>
                    </Card>
                    <Card className="p-4 border bg-neutral-50/10 rounded-2xl text-left space-y-1 shadow-none">
                      <span className="text-[9px] uppercase font-mono text-neutral-450">Images</span>
                      <h3 className="text-xl font-bold">{memories.reduce((acc, m) => acc + (m.images?.length || 0), 0)}</h3>
                    </Card>
                    <Card className="p-4 border bg-neutral-50/10 rounded-2xl text-left space-y-1 shadow-none">
                      <span className="text-[9px] uppercase font-mono text-neutral-450">Voice Notes</span>
                      <h3 className="text-xl font-bold">{memories.reduce((acc, m) => acc + (m.audios?.length || 0), 0)}</h3>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Select Day Summary</span>
                      <CalendarView
                        activeDates={Array.from(new Set(memories.map(m => m.date)))}
                        selectedDate={selectedDate}
                        onDateSelect={(dateStr) => setSelectedDaySummaryDate(dateStr)}
                      />
                    </div>
                    
                    <Card className="p-6 border rounded-[24px] space-y-4 shadow-none">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Category Distribution</span>
                      <div className="space-y-4">
                        {["Note", "Activity", "Insight", "Reminder"].map((cat) => {
                          const count = memories.filter((m) => m.category === cat).length;
                          const percentage = memories.length > 0 ? (count / memories.length) * 100 : 0;
                          return (
                            <div key={cat} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold">{cat}</span>
                                <span className="font-mono text-neutral-405">{count} ({Math.round(percentage)}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-neutral-50 dark:bg-neutral-900 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${cat === "Activity" ? "bg-blue-500" : cat === "Insight" ? "bg-amber-500" : cat === "Reminder" ? "bg-red-500" : "bg-neutral-500"}`} style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* Share Sidebar active */}
              {isShareSidebarOpen && (
                <div className="max-w-3xl bg-white dark:bg-neutral-950 p-8 rounded-[28px] border border-neutral-100 dark:border-neutral-900 shadow-sm text-left flex-1 flex flex-col min-h-0">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-450 font-bold block mb-1">Compiler Workspace</span>
                  <h2 className="text-base font-black text-neutral-955 dark:text-white pb-3 border-b mb-6">Daily Activity Share Compiler</h2>
                  
                  {(() => {
                    const dayLogs = memories.filter((m) => m.date === shareDate);
                    const totalLogs = dayLogs.length;
                    
                    const uniqueDatesWithCounts = Array.from(
                      memories.reduce((acc, m) => {
                        acc.set(m.date, (acc.get(m.date) || 0) + 1);
                        return acc;
                      }, new Map<string, number>())
                    ).map(([date, count]) => ({ date, count }))
                    .sort((a, b) => b.date.localeCompare(a.date));

                    const getShareText = () => {
                      if (dayLogs.length === 0) return "";
                      let text = `🧠 Daily Activities Digest - ${shareDate}\n\n`;
                      dayLogs.forEach((m, idx) => {
                        const timeStr = m.fromTime && m.toTime
                          ? `${format24hToAMPM(m.fromTime)} - ${format24hToAMPM(m.toTime)} (${m.duration})`
                          : format24hToAMPM(m.time);
                        text += `${idx + 1}. ${m.title} (${timeStr})\n`;
                        text += `   Category: ${m.category}\n`;
                        if (m.tags && m.tags.length > 0) text += `   Tags: ${m.tags.map((t) => `#${t}`).join(" ")}\n`;
                        text += `   Content: ${m.content.slice(0, 150)}...\n\n`;
                      });
                      text += `Shared via Memory AI`;
                      return text;
                    };

                    const shareText = getShareText();

                    return (
                      <div className="flex-1 flex gap-8 min-h-0">
                        {/* Selector inputs */}
                        <div className="w-1/3 flex flex-col gap-5 shrink-0">
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Select Date via Calendar</span>
                            <CalendarView
                              activeDates={Array.from(new Set(memories.map(m => m.date)))}
                              selectedDate={shareDate}
                              onDateSelect={(d) => {
                                setShareDate(d);
                                setShareCopied(false);
                                setAiShareText("");
                                setGeneratedShareLink("");
                                setShareLinkCopied(false);
                              }}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block font-bold font-mono">Or dropdown list:</span>
                            <select
                              value={shareDate}
                              onChange={(e) => {
                                setShareDate(e.target.value);
                                setShareCopied(false);
                                setAiShareText("");
                                setGeneratedShareLink("");
                                setShareLinkCopied(false);
                              }}
                              className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-850 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
                            >
                              {uniqueDatesWithCounts.map(({ date, count }) => (
                                <option key={date} value={date}>{date} ({count} logs)</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Compiler actions / text outputs */}
                        <div className="flex-1 flex flex-col min-h-0 text-left">
                          <div className="flex items-center justify-between pb-2">
                            <span className="text-[10.5px] uppercase font-mono tracking-widest text-neutral-450 block font-bold">{aiShareText ? "✨ AI Compiled Digest" : "Raw Logs Compiler output"} ({totalLogs} logs)</span>
                            {!aiShareText && totalLogs > 0 && (
                              <button
                                onClick={() => fetchAIShareSummary(shareDate)}
                                disabled={aiShareLoading}
                                className="h-7 px-3 bg-neutral-950 text-white dark:bg-white dark:text-neutral-955 rounded-lg text-[9px] uppercase font-mono font-bold hover:opacity-90 flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                              >
                                {aiShareLoading ? <div className="w-3 h-3 rounded-full border border-transparent border-t-current animate-spin" /> : <><Sparkles className="w-3 h-3 text-amber-500" /><span>AI Compile</span></>}
                              </button>
                            )}
                          </div>
                          
                          {totalLogs === 0 ? (
                            <div className="flex-1 border border-dashed border-neutral-200 rounded-2xl flex items-center justify-center text-xs text-neutral-400 italic">No logs compiled for {shareDate}. Select another date.</div>
                          ) : aiShareLoading ? (
                            <div className="flex-1 border rounded-2xl flex flex-col items-center justify-center gap-3 bg-neutral-50/10">
                              <div className="w-5 h-5 rounded-full border border-transparent border-t-neutral-800 animate-spin" />
                              <span className="text-[9px] uppercase font-mono text-neutral-400">Synthesizing logs...</span>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col gap-4 min-h-0 text-left">
                              <textarea
                                readOnly
                                value={aiShareText || shareText}
                                className="flex-1 p-4 bg-neutral-50/20 border border-neutral-100 dark:border-neutral-900 rounded-2xl text-[10.5px] font-mono leading-relaxed focus:outline-none resize-none font-normal"
                              />
                              
                              <div className="flex gap-3">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(aiShareText || shareText);
                                    setShareCopied(true);
                                    setTimeout(() => setShareCopied(false), 2000);
                                  }}
                                  className="h-10 bg-neutral-950 text-white dark:bg-white dark:text-neutral-955 px-4 rounded-xl text-[10px] font-mono font-bold tracking-wider hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  {shareCopied ? <span className="flex items-center gap-1 text-green-500"><Check className="w-3 h-3" /> Copied!</span> : <span className="flex items-center gap-1"><Share2 className="w-3 h-3" /> Copy Share Digest</span>}
                                </button>
                              </div>

                              <div className="pt-4 border-t flex flex-col gap-3">
                                <span className="text-[9.5px] uppercase font-mono tracking-widest text-neutral-400 font-bold">Secure Public Share Link Creator</span>
                                {generatedShareLink ? (
                                  <div className="flex items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 border rounded-2xl">
                                    <span className="text-[10px] font-mono text-neutral-500 truncate flex-1">{generatedShareLink}</span>
                                    <button onClick={() => {
                                      navigator.clipboard.writeText(generatedShareLink);
                                      setShareLinkCopied(true);
                                      setTimeout(() => setShareLinkCopied(false), 2000);
                                    }} className="h-8 px-4 bg-neutral-950 text-white dark:bg-white dark:text-neutral-955 rounded-xl text-[9px] uppercase font-mono font-bold shrink-0">{shareLinkCopied ? "Copied" : "Copy Link"}</button>
                                  </div>
                                ) : (
                                  <div className="flex gap-4 items-end">
                                    <div className="flex flex-col gap-1 w-48">
                                      <span className="text-[8.5px] text-neutral-400 font-mono uppercase font-bold">Expiration time</span>
                                      <select value={shareDuration} onChange={(e) => setShareDuration(Number(e.target.value))} className="h-9 px-2 bg-neutral-50 border rounded-lg text-xs font-mono cursor-pointer">
                                        <option value={1}>1 Hour</option>
                                        <option value={2}>2 Hours</option>
                                        <option value={3}>3 Hours</option>
                                        <option value={6}>6 Hours</option>
                                        <option value={12}>12 Hours</option>
                                        <option value={24}>24 Hours</option>
                                      </select>
                                    </div>
                                    <button onClick={() => handleGeneratePublicShareLink(shareDate)} disabled={shareLinkLoading} className="h-9 px-4 bg-neutral-950 text-white dark:bg-white dark:text-neutral-955 rounded-xl text-[9.5px] font-mono uppercase font-bold tracking-wider hover:opacity-90 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
                                      {shareLinkLoading ? <div className="w-3.5 h-3.5 border border-transparent border-t-current animate-spin rounded-full" /> : <><LinkIcon className="w-3.5 h-3.5" /><span>Create Shared Card Link</span></>}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* AI Intel Hub tab */}
              {isAiHubSidebarOpen && (
                <div className="max-w-4xl bg-white dark:bg-neutral-950 p-8 rounded-[28px] border border-neutral-100 dark:border-neutral-900 shadow-sm text-left flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between pb-3 border-b mb-6 shrink-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <div>
                        <h2 className="text-base font-black text-neutral-955 dark:text-white">AI Intelligence Hub</h2>
                        <span className="text-[9px] text-neutral-450 font-mono">Neural Insights & Digest synthesizer</span>
                      </div>
                    </div>
                    {/* Switcher */}
                    <div className="flex bg-neutral-50 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                      {(["digest", "insights", "search"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setAiHubTab(tab)}
                          className={`text-[8.5px] uppercase font-mono font-bold tracking-wider px-3 py-1 rounded-md transition-all cursor-pointer outline-none ${
                            aiHubTab === tab ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-950 dark:text-white" : "text-neutral-400"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0">
                    {/* Digest content */}
                    {aiHubTab === "digest" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2">
                          <span className="text-[9.5px] uppercase font-mono tracking-widest text-neutral-400 font-bold">Select range</span>
                          <select value={digestType} onChange={(e: any) => { setDigestType(e.target.value); setDigestContent(null); }} className="h-9 px-2 bg-neutral-50 border rounded-lg text-xs font-mono cursor-pointer">
                            <option value="daily">Daily Summary</option>
                            <option value="weekly">Weekly Summary</option>
                          </select>
                        </div>
                        {digestContent === null && !digestLoading ? (
                          <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Brain className="w-8 h-8 text-neutral-355 animate-pulse" />
                            <p className="text-xs text-neutral-400">Generate a comprehensive summary of active logs.</p>
                            <button onClick={fetchAIDigest} className="h-9 px-4 bg-neutral-955 text-white dark:bg-white dark:text-neutral-955 rounded-xl text-[9.5px] font-mono uppercase font-bold hover:opacity-90 cursor-pointer">Generate Summary</button>
                          </div>
                        ) : digestLoading ? (
                          <div className="py-20 flex flex-col items-center justify-center gap-3"><div className="w-5 h-5 rounded-full border border-transparent border-t-neutral-800 animate-spin" /><span className="text-[9px] uppercase font-mono text-neutral-400">Compiling summary...</span></div>
                        ) : (
                          <div className="space-y-4">
                            <div className="p-5 bg-neutral-50/20 border border-neutral-100 rounded-2xl text-xs leading-relaxed font-normal prose prose-neutral dark:prose-invert" dangerouslySetInnerHTML={{ __html: parseMarkdown(digestContent || "") }} />
                            <button onClick={fetchAIDigest} className="text-xs font-mono text-neutral-450 hover:underline">Regenerate</button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Insights content */}
                    {aiHubTab === "insights" && (
                      <div className="space-y-5">
                        {insightsData === null && !insightsLoading ? (
                          <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Sparkles className="w-8 h-8 text-neutral-350" />
                            <p className="text-xs text-neutral-400">Analyze patterns and recommendations across logs.</p>
                            <button onClick={fetchAIInsights} className="h-9 px-4 bg-neutral-955 text-white dark:bg-white dark:text-neutral-955 rounded-xl text-[9.5px] font-mono uppercase font-bold hover:opacity-90 cursor-pointer">Extract Insights</button>
                          </div>
                        ) : insightsLoading ? (
                          <div className="py-20 flex flex-col items-center justify-center gap-3"><div className="w-5 h-5 rounded-full border border-transparent border-t-neutral-800 animate-spin" /><span className="text-[9px] uppercase font-mono text-neutral-400">Extracting insights...</span></div>
                        ) : (
                          <div className="space-y-5">
                            <div className="p-4 bg-neutral-50/40 rounded-xl space-y-1 border">
                              <span className="text-[9px] uppercase font-mono text-neutral-400">Mood context</span>
                              <h3 className="text-sm font-bold">{insightsData?.mood}</h3>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[9.5px] uppercase font-mono tracking-widest text-neutral-400 font-bold block">Observations</span>
                              <div className="space-y-2">
                                {insightsData?.insights.map((ins, i) => <div key={i} className="p-3 bg-neutral-50/20 rounded-xl border font-normal">• {ins}</div>)}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[9.5px] uppercase font-mono tracking-widest text-neutral-400 font-bold block">AI Recommendations</span>
                              <div className="space-y-2">
                                {insightsData?.recommendations.map((rec, i) => <div key={i} className="p-3 bg-neutral-50/20 rounded-xl border flex items-start gap-2 font-normal"><span>💡</span><span>{rec}</span></div>)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Smart search */}
                    {aiHubTab === "search" && (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input type="text" placeholder="Conceptually search logs..." value={smartSearchQuery} onChange={e => setSmartSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSmartSearch()} className="h-10 bg-white border rounded-xl" />
                          <button onClick={handleSmartSearch} disabled={smartSearchLoading || !smartSearchQuery.trim()} className="h-10 px-4 bg-neutral-955 text-white dark:bg-white dark:text-neutral-955 rounded-xl text-xs font-bold hover:opacity-90">Search</button>
                        </div>
                        {smartSearchLoading ? (
                          <div className="py-16 flex flex-col items-center justify-center gap-2"><div className="w-4.5 h-4.5 rounded-full border border-transparent border-t-neutral-805 animate-spin" /><span className="text-[9px] uppercase font-mono text-neutral-400">Searching...</span></div>
                        ) : (
                          <div className="space-y-3">
                            {smartSearchResults.map(({ memory, relevance, explanation }) => (
                              <Card key={memory.id} className="p-4 border text-left rounded-xl shadow-none space-y-1.5 animate-in fade-in">
                                <div className="flex justify-between items-start gap-3"><h4 className="font-bold">{memory.title}</h4><span className="text-[9px] text-green-500 font-mono font-bold">{Math.round(relevance*100)}% Match</span></div>
                                <p className="text-xs text-neutral-505 line-clamp-2 leading-relaxed font-sans">{memory.content}</p>
                                <div className="bg-neutral-50/50 p-2.5 rounded-lg border text-[9.5px] italic font-normal">{explanation}</div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

          </main>

          {/* Desktop Summary Details Sheet (matching mobile dialog but styled for desktop side-sheet) */}
          <Sheet open={!!selectedDaySummaryDate} onOpenChange={(open) => !open && setSelectedDaySummaryDate(null)}>
            <SheetContent side="right" className="w-[450px] bg-background border-l border-neutral-100 dark:border-neutral-900 flex flex-col p-6 text-foreground outline-none overflow-hidden">
              {(() => {
                if (!selectedDaySummaryDate) return null;
                const dayLogs = memories.filter((m) => m.date === selectedDaySummaryDate);
                const totalLogs = dayLogs.length;
                const imagesCount = dayLogs.reduce((acc, m) => acc + (m.images?.length || 0), 0);
                const voiceCount = dayLogs.reduce((acc, m) => acc + (m.audios?.length || 0), 0);
                const getCategoriesCount = (list: Memory[]) => list.reduce((acc: Record<string, number>, m) => { acc[m.category] = (acc[m.category] || 0) + 1; return acc; }, {});
                const categoriesCount = getCategoriesCount(dayLogs);

                return (
                  <div className="flex-1 flex flex-col min-h-0 text-left">
                    <SheetHeader className="text-left pb-4 border-b flex flex-row items-center justify-between shrink-0">
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-450 font-bold block">Daily Summary Log</span>
                        <SheetTitle className="text-sm font-bold text-neutral-855 dark:text-white font-mono">{selectedDaySummaryDate}</SheetTitle>
                      </div>
                      <button onClick={() => setSelectedDaySummaryDate(null)} className="w-8 h-8 rounded-full hover:bg-neutral-50 flex items-center justify-center outline-none"><X className="w-4 h-4" /></button>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto py-5 space-y-5 text-xs min-h-0">
                      <div className="grid grid-cols-3 gap-2.5">
                        <Card className="p-3 border rounded-xl text-left shadow-none"><span className="text-[8px] uppercase font-mono tracking-wider text-neutral-400 block font-bold">Total Logs</span><span className="text-xs font-bold font-mono">{totalLogs}</span></Card>
                        <Card className="p-3 border rounded-xl text-left shadow-none"><span className="text-[8px] uppercase font-mono tracking-wider text-neutral-400 block font-bold">Images</span><span className="text-xs font-bold font-mono">{imagesCount}</span></Card>
                        <Card className="p-3 border rounded-xl text-left shadow-none"><span className="text-[8px] uppercase font-mono tracking-wider text-neutral-400 block font-bold">Voice Notes</span><span className="text-xs font-bold font-mono">{voiceCount}</span></Card>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[8.5px] uppercase font-mono tracking-wider font-bold">
                        <span className="text-neutral-405 py-0.5">Categories:</span>
                        {Object.entries(categoriesCount).map(([cat, val]) => (
                          <span key={cat} className="px-2 py-0.5 rounded bg-neutral-50 text-neutral-555 border">{cat}: {val}</span>
                        ))}
                      </div>

                      <div className="space-y-3.5 pt-2">
                        <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-455 block font-bold">Recorded Logs</span>
                        <div className="space-y-3">
                          {dayLogs.map((m) => (
                            <Card key={m.id} className="p-4 border rounded-xl text-left shadow-none space-y-2">
                              <div className="flex justify-between items-start gap-3"><span className="text-xs font-bold truncate">{m.title}</span><span className="text-[7.5px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-mono bg-neutral-50 text-neutral-500 border">{m.category}</span></div>
                              <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed font-sans">{m.content}</p>
                              <div className="flex gap-2"><Link href={`/memories/${m.id}`} onClick={() => setSelectedDaySummaryDate(null)} className="text-[9px] uppercase font-mono font-bold tracking-wider bg-neutral-950 text-white px-3 py-1.5 rounded-lg">Read</Link><Link href={`/memories/${m.id}/edit`} onClick={() => setSelectedDaySummaryDate(null)} className="text-[9px] uppercase font-mono font-bold tracking-wider bg-neutral-50 border text-neutral-700 px-3 py-1.5 rounded-lg">Edit</Link></div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </SheetContent>
          </Sheet>

        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MobileFrame>
        <div className="flex-1 flex flex-col bg-background pb-6 select-none overflow-hidden relative">
          
          {/* Dashboard Header */}
          <div className="h-16 px-6 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between bg-background/95 dark:bg-neutral-950/95 backdrop-blur-md z-30 shrink-0">
            <div className="flex items-center gap-1">
              <SidebarMenu onOpenShareCompiler={() => setIsShareSidebarOpen(true)} />
              <span className="font-mono text-xs uppercase tracking-wider font-semibold text-neutral-800 dark:text-neutral-200">
                Mind Space
              </span>
            </div>
            
            <div className="flex items-center gap-2.5">
              {/* AI Hub Brain Button */}
              <button
                onClick={() => setAiHubOpen(true)}
                className="w-8 h-8 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-550 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer outline-none relative"
                title="AI Hub"
              >
                <Brain className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-neutral-950 dark:bg-white animate-pulse" />
              </button>

              <Link href="/profile">
                <Avatar className="h-7 w-7 border border-neutral-100 dark:border-neutral-800 hover:opacity-80 transition-opacity cursor-pointer">
                  <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                  <AvatarFallback className="bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-semibold text-xs">
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>

          {/* SaaS Tab Selector */}
          <div data-tour="tabs" className="h-12 border-b border-neutral-100 dark:border-neutral-900 flex shrink-0 bg-background/95 dark:bg-neutral-950/95 backdrop-blur-md z-20">
            <button
              onClick={() => setActiveDashboardTab("feed")}
              className="flex-1 flex items-center justify-center text-xs font-mono uppercase tracking-wider font-bold transition-all relative outline-none cursor-pointer"
            >
              Logs Feed
              {activeDashboardTab === "feed" && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950 dark:bg-white"
                />
              )}
            </button>
            <button
              onClick={() => setActiveDashboardTab("analytics")}
              className="flex-1 flex items-center justify-center text-xs font-mono uppercase tracking-wider font-bold transition-all relative outline-none cursor-pointer"
            >
              Analytics
              {activeDashboardTab === "analytics" && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950 dark:bg-white"
                />
              )}
            </button>
          </div>

          {/* MAIN MIND LOGS VIEW */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 relative">
            
            {activeDashboardTab === "feed" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* View switcher & stats summary */}
                {/* View switcher */}
                <div className="flex items-center justify-end shrink-0">

                  {/* Toggle switch */}
                  <div className="flex bg-neutral-50 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                    <button
                      onClick={() => setViewMode("feed")}
                      className={`p-1.5 rounded-md transition-all cursor-pointer outline-none ${
                        viewMode === "feed" ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-950 dark:text-white" : "text-neutral-400 hover:text-neutral-600"
                      }`}
                    >
                      <ListIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode("timeline")}
                      className={`p-1.5 rounded-md transition-all cursor-pointer outline-none ${
                        viewMode === "timeline" ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-950 dark:text-white" : "text-neutral-400 hover:text-neutral-600"
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Search Filter */}
                <div data-tour="search" className="space-y-2 shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono text-left">
                    Recall Search
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                    <Input
                      type="text"
                      placeholder="Query by title, tags, or contents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs placeholder:text-neutral-450 shadow-none focus-visible:ring-0 focus-visible:border-neutral-200 dark:focus-visible:border-neutral-800 text-neutral-800 dark:text-neutral-200"
                    />
                  </div>
                </div>

                {/* Filter Controls Row */}
                <div className="flex items-center gap-2 shrink-0 overflow-hidden">
                  {/* Favorites Toggle */}
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`h-8 px-3 rounded-full flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider transition-all border outline-none cursor-pointer shrink-0 ${
                      showFavoritesOnly
                        ? "bg-red-500/10 border-red-500/25 text-red-500"
                        : "bg-neutral-50 dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${showFavoritesOnly ? "fill-red-500 text-red-500" : ""}`} />
                    <span>Favorites</span>
                  </button>

                  {/* Date Filter Status Indicator */}
                  {selectedDate && (
                    <div className="h-8 px-3 rounded-full flex items-center gap-1.5 text-[10px] font-mono bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 transition-all shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span>{selectedDate}</span>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="w-3.5 h-3.5 rounded-full hover:bg-neutral-850 dark:hover:bg-neutral-150 flex items-center justify-center font-bold text-xs cursor-pointer"
                        title="Clear date filter"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Tag Slider (Horizontal Scroll) */}
                  <div 
                    className="flex-1 flex gap-1.5 overflow-x-auto py-0.5"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    <button
                      onClick={() => setSelectedTag(null)}
                      className={`h-8 px-3 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all border shrink-0 outline-none cursor-pointer ${
                        selectedTag === null
                          ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-950 dark:border-white"
                          : "bg-neutral-50 dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                      }`}
                    >
                      #All
                    </button>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className={`h-8 px-3 rounded-full text-[10px] font-mono tracking-wider transition-all border shrink-0 outline-none cursor-pointer ${
                          selectedTag === tag
                            ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-950 dark:border-white"
                            : "bg-neutral-50 dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List / Feed Area */}
                <div className="space-y-4">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono text-left">
                    {viewMode === "feed" ? "Daily Memory Feed" : "Chronological Timeline"}
                  </div>

                  {loading ? (
                    /* Loading skeleton */
                    <div className="space-y-3">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="h-28 bg-neutral-50 dark:bg-neutral-900/30 rounded-2xl border border-neutral-100 dark:border-neutral-900 animate-pulse flex flex-col justify-between p-4">
                          <div className="space-y-2">
                            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3" />
                            <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-5/6" />
                          </div>
                          <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-1/4" />
                        </div>
                      ))}
                    </div>
                  ) : filteredMemories.length === 0 ? (
                    <div className="text-center py-20 text-xs text-neutral-450 dark:text-neutral-600">
                      {searchQuery || selectedTag || selectedDate || showFavoritesOnly 
                        ? "No memories matched your query or filters." 
                        : "Your digital mind is fresh and empty. Log your first memory using the '+' button below."}
                    </div>
                  ) : viewMode === "feed" ? (
                    /* STANDARD DAILY FEED */
                    (() => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      
                      // Group memories by date
                      const memoriesByDate = filteredMemories.reduce((groups: Record<string, Memory[]>, memory) => {
                        const date = memory.date;
                        if (!groups[date]) {
                          groups[date] = [];
                        }
                        groups[date].push(memory);
                        return groups;
                      }, {});

                      // Sort dates newest first
                      const sortedDates = Object.keys(memoriesByDate).sort((a, b) => b.localeCompare(a));
                      const hasToday = sortedDates.includes(todayStr);

                      const getFormatDateHeading = (dateStr: string) => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = yesterday.toISOString().split("T")[0];

                        if (dateStr === todayStr) return "Today";
                        if (dateStr === yesterdayStr) return "Yesterday";
                        
                        const [y, m, d] = dateStr.split("-");
                        const date = new Date(Number(y), Number(m) - 1, Number(d));
                        return date.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                      };

                      return (
                        <div className="space-y-6">
                          <AnimatePresence initial={false}>
                            {/* Today Empty State Card: shown only if there is no filter query active and no logs recorded today */}
                            {!hasToday && !searchQuery && !selectedTag && !selectedDate && !showFavoritesOnly && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 border border-dashed border-neutral-150 dark:border-neutral-900 bg-neutral-50/10 dark:bg-neutral-950/10 rounded-3xl text-left text-xs text-neutral-455 space-y-1.5"
                              >
                                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 font-bold block">Today</span>
                                <div className="text-neutral-500 italic font-sans leading-relaxed">
                                  No activities logged today. Click the "+" button below to log your daily work.
                                </div>
                              </motion.div>
                            )}

                            {sortedDates.map((dateStr) => (
                              <div key={dateStr} className="space-y-3.5">
                                <h3 className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 font-bold text-left border-b border-neutral-50 dark:border-neutral-900/40 pb-1.5 mt-2.5">
                                  {getFormatDateHeading(dateStr)}
                                </h3>
                                
                                <div className="space-y-3">
                                  {memoriesByDate[dateStr].map((m) => {
                                    const isExpanded = expandedCardId === m.id;
                                    return (
                                      <motion.div
                                        key={m.id}
                                        layout
                                        onClick={(e) => toggleExpandCard(m.id, e)}
                                        className="cursor-pointer"
                                      >
                                        <Card className="p-4 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl premium-shadow-sm flex flex-col justify-between gap-3 shadow-none transition-all duration-300 relative overflow-hidden select-none">
                                          <div className="flex flex-col gap-1.5">
                                            {/* Title block */}
                                            <div className="flex items-start justify-between gap-4">
                                              <h3 className="text-xs font-bold text-neutral-900 dark:text-white leading-tight text-left">
                                                {m.title}
                                              </h3>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <span className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full font-mono ${
                                                  m.category === "Activity" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-500" :
                                                  m.category === "Insight" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-500" :
                                                  m.category === "Reminder" ? "bg-red-50 dark:bg-red-950/30 text-red-500" :
                                                  "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
                                                }`}>
                                                  {m.category}
                                                </span>
                                                <button
                                                  onClick={(e) => handleToggleFavorite(m.id, e)}
                                                  className="p-1 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-full transition-colors cursor-pointer outline-none"
                                                  title="Toggle Favorite"
                                                >
                                                  <Heart
                                                    className={`w-3.5 h-3.5 transition-transform duration-200 active:scale-125 ${
                                                      m.favorite ? "fill-red-500 text-red-500" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                                    }`}
                                                  />
                                                </button>
                                              </div>
                                            </div>

                                            {/* Content description (truncated or full) */}
                                            <p className={`text-xs text-neutral-505 dark:text-neutral-405 leading-relaxed text-left transition-all ${
                                              isExpanded ? "" : "line-clamp-2"
                                            }`}>
                                              {m.content}
                                            </p>
                                            
                                            {/* Extra details if expanded */}
                                            {isExpanded && (
                                              <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="pt-2 flex flex-col gap-3 border-t border-neutral-50 dark:border-neutral-900/60"
                                              >
                                                {/* Tags chip details */}
                                                {m.tags && m.tags.length > 0 && (
                                                  <div className="flex flex-wrap gap-1">
                                                    {m.tags.map(tag => (
                                                      <span key={tag} className="text-[9px] font-mono text-neutral-400">
                                                        #{tag}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}

                                                {/* Quick Action buttons */}
                                                <div className="flex items-center gap-2">
                                                  <Link 
                                                    href={`/memories/${m.id}`}
                                                    className="flex items-center gap-1 text-[10px] uppercase font-mono tracking-wider font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-3 py-1.5 rounded-xl hover:scale-95 transition-all outline-none"
                                                  >
                                                    <Eye className="w-3 h-3" />
                                                    <span>Read</span>
                                                  </Link>
                                                  <Link 
                                                    href={`/memories/${m.id}/edit`}
                                                    className="flex items-center gap-1 text-[10px] uppercase font-mono tracking-wider font-bold bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-xl hover:scale-95 transition-all outline-none"
                                                  >
                                                    <Edit3 className="w-3 h-3" />
                                                    <span>Edit</span>
                                                  </Link>
                                                </div>
                                              </motion.div>
                                            )}
                                          </div>

                                          {/* Footer time detail */}
                                          <div className="flex items-center justify-between border-t border-neutral-50 dark:border-neutral-900/60 pt-2 text-[9px] font-mono text-neutral-400 dark:text-neutral-500 mt-2 shrink-0">
                                            <div className="flex items-center gap-1.5 font-sans">
                                              <Clock className="w-3.5 h-3.5" />
                                              <span>
                                                {m.fromTime && m.toTime
                                                  ? `${format24hToAMPM(m.fromTime)} - ${format24hToAMPM(m.toTime)}`
                                                  : format24hToAMPM(m.time)}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <div className="flex items-center gap-0.5">
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                              </div>
                                            </div>
                                          </div>
                                        </Card>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </AnimatePresence>
                        </div>
                      );
                    })()
                  ) : (
                    /* CHRONOLOGICAL TIMELINE VIEW */
                    <div className="relative pl-6 space-y-6 text-left text-xs select-none">
                      {/* Vertical line indicator */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-neutral-100 dark:bg-neutral-900 border-l border-dashed border-neutral-200 dark:border-neutral-800" />
                      
                      {filteredMemories.map((m) => {
                        const isExpanded = expandedCardId === m.id;
                        return (
                          <div key={m.id} className="relative space-y-1">
                            
                            {/* Timeline Node dot */}
                            <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-neutral-950 border-2 border-neutral-950 dark:border-white z-10" />

                            {/* Node time label */}
                            <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1 pl-1">
                              <span>{m.date}</span>
                              <span>•</span>
                              <span>{m.time}</span>
                            </div>

                            {/* Node Card block */}
                            <Card 
                              onClick={(e) => toggleExpandCard(m.id, e)}
                              className="p-3 border-neutral-105 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl premium-shadow-sm flex flex-col justify-between gap-3 shadow-none transition-all duration-300 relative overflow-hidden select-none cursor-pointer"
                            >
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-start justify-between gap-4">
                                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                                    {m.title}
                                  </h3>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-mono ${
                                      m.category === "Activity" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-500" :
                                      m.category === "Insight" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-500" :
                                      m.category === "Reminder" ? "bg-red-50 dark:bg-red-950/30 text-red-500" :
                                      "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
                                    }`}>
                                      {m.category}
                                    </span>
                                    <button
                                      onClick={(e) => handleToggleFavorite(m.id, e)}
                                      className="p-1 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-full transition-colors cursor-pointer outline-none"
                                      title="Toggle Favorite"
                                    >
                                      <Heart
                                        className={`w-3 h-3 transition-transform duration-200 active:scale-125 ${
                                          m.favorite ? "fill-red-500 text-red-500" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </div>

                                <p className={`text-xs text-neutral-500 dark:text-neutral-455 leading-relaxed transition-all ${
                                  isExpanded ? "" : "line-clamp-2"
                                }`}>
                                  {m.content}
                                </p>

                                {isExpanded && (
                                  <div className="pt-2 flex flex-col gap-3 border-t border-neutral-50 dark:border-neutral-900/60">
                                    {m.tags && m.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {m.tags.map(tag => (
                                          <span key={tag} className="text-[9px] font-mono text-neutral-400">
                                            #{tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Link 
                                        href={`/memories/${m.id}`}
                                        className="flex items-center gap-1 text-[10px] uppercase font-mono tracking-wider font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-3 py-1.5 rounded-xl hover:scale-95 transition-all outline-none cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Read</span>
                                      </Link>
                                      <Link 
                                        href={`/memories/${m.id}/edit`}
                                        className="flex items-center gap-1 text-[10px] uppercase font-mono tracking-wider font-bold bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-750 dark:text-neutral-300 px-3 py-1.5 rounded-xl hover:scale-95 transition-all outline-none cursor-pointer"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        <span>Edit</span>
                                      </Link>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeDashboardTab === "analytics" && (
              <div className="space-y-6 animate-in fade-in duration-305">
                {/* Stats Widgets Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <Card className="p-4 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl shadow-none space-y-1 text-left">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-400">Total Memories</span>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{memories.length}</h3>
                  </Card>
                  <Card className="p-4 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl shadow-none space-y-1 text-left">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-400">Active Days</span>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{new Set(memories.map(m => m.date)).size}</h3>
                  </Card>
                  <Card className="p-4 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl shadow-none space-y-1 text-left">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-400">Uploaded Images</span>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white text-left">
                      {memories.reduce((acc, m) => acc + (m.images?.length || 0), 0)}
                    </h3>
                  </Card>
                  <Card className="p-4 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl shadow-none space-y-1 text-left">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-400">Voice Notes</span>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white text-left">
                      {memories.reduce((acc, m) => acc + (m.audios?.length || 0), 0)}
                    </h3>
                  </Card>
                </div>

                {/* Calendar View */}
                <div className="space-y-2 text-left">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono">Memory Calendar</span>
                  <CalendarView
                    activeDates={Array.from(new Set(memories.map(m => m.date)))}
                    selectedDate={selectedDate}
                    onDateSelect={(dateStr) => {
                      setSelectedDaySummaryDate(dateStr);
                    }}
                  />
                </div>

                {/* Category Progress Breakdown */}
                <div className="bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 rounded-3xl p-4.5 space-y-3.5 text-left">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono block">Category Distribution</span>
                  <div className="space-y-3">
                    {["Note", "Activity", "Insight", "Reminder"].map((cat) => {
                      const count = memories.filter((m) => m.category === cat).length;
                      const percentage = memories.length > 0 ? (count / memories.length) * 100 : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{cat}</span>
                            <span className="font-mono text-neutral-450">{count} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-neutral-50 dark:bg-neutral-900 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                cat === "Activity" ? "bg-blue-500" :
                                cat === "Insight" ? "bg-amber-500" :
                                cat === "Reminder" ? "bg-red-500" :
                                "bg-neutral-500"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Memories Widget */}
                <div className="bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-900 rounded-3xl p-4.5 space-y-3.5 text-left">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono block">Recent Entries</span>
                  <div className="space-y-2.5">
                    {memories.slice(0, 3).map((m) => (
                      <Link
                        key={m.id}
                        href={`/memories/${m.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors border border-transparent hover:border-neutral-100 dark:hover:border-neutral-800"
                      >
                        <div className="flex flex-col gap-0.5 truncate pr-4">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{m.title}</span>
                          <span className="text-[9px] font-mono text-neutral-450">{m.date} • {m.time}</span>
                        </div>
                        <span className={`text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-mono shrink-0 ${
                          m.category === "Activity" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-500" :
                          m.category === "Insight" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-500" :
                          m.category === "Reminder" ? "bg-red-50 dark:bg-red-950/30 text-red-500" :
                          "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
                        }`}>
                          {m.category}
                        </span>
                      </Link>
                    ))}
                    {memories.length === 0 && (
                      <span className="text-xs text-neutral-400">No logs stored yet.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Floating Add Memory Button redirects to New Memory Route */}
          <Link href="/memories/new">
            <button
              data-tour="add-button"
              className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all outline-none z-30 cursor-pointer"
            >
              <Plus className="w-6 h-6" />
            </button>
          </Link>

          {/* AI Intelligence Hub bottom sheet panel */}
          <Sheet open={aiHubOpen} onOpenChange={setAiHubOpen}>
            <SheetContent side="bottom" className="h-[90vh] bg-background border-t border-neutral-100 dark:border-neutral-900 flex flex-col p-6 text-foreground outline-none rounded-t-[32px] overflow-hidden">
              <SheetHeader className="text-left pb-4 border-b border-neutral-100 dark:border-neutral-900 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-neutral-850 dark:text-white" />
                  <div>
                    <SheetTitle className="text-xs font-bold tracking-tight">AI Intelligence Hub</SheetTitle>
                    <SheetDescription className="text-[9px] text-neutral-400">Groq AI Brain Integrations</SheetDescription>
                  </div>
                </div>
                {/* Tab switchers */}
                <div className="flex bg-neutral-50 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                  {(["digest", "insights", "search"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAiHubTab(tab)}
                      className={`text-[8.5px] uppercase font-mono font-bold tracking-wider px-2.5 py-1 rounded-md transition-all cursor-pointer outline-none ${
                        aiHubTab === tab 
                          ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-950 dark:text-white" 
                          : "text-neutral-400 hover:text-neutral-600"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </SheetHeader>

              {/* AI Hub Body Content */}
              <div className="flex-1 overflow-y-auto py-4 space-y-5 text-left text-xs">
                
                {/* 1. Summary Digest Tab */}
                {aiHubTab === "digest" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400">Select Digest Range</span>
                      <div className="flex bg-neutral-50 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                        {(["daily", "weekly"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              setDigestType(t);
                              setDigestContent(null);
                            }}
                            className={`text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-md transition-all cursor-pointer outline-none ${
                              digestType === t 
                                ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-950 dark:text-white" 
                                : "text-neutral-400 hover:text-neutral-600"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {digestContent === null && !digestLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3.5">
                        <Brain className="w-8 h-8 text-neutral-300 dark:text-neutral-700 animate-pulse" />
                        <p className="text-[10px] text-neutral-400">Ready to synthesize logs into a summary digest.</p>
                        <button
                          onClick={fetchAIDigest}
                          className="text-[9px] uppercase font-mono tracking-wider font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-4 py-2.5 rounded-xl transition-all cursor-pointer outline-none hover:scale-95"
                        >
                          Generate AI Summary
                        </button>
                      </div>
                    ) : digestLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="h-6 w-6 rounded-full border border-transparent border-t-neutral-850 animate-spin" />
                        <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400">Synthesizing logs...</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div 
                          className="p-4 bg-neutral-50/40 dark:bg-neutral-900/20 border border-neutral-100 dark:border-neutral-900 rounded-2xl text-neutral-750 dark:text-neutral-300 leading-relaxed text-xs overflow-y-auto font-normal prose dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(digestContent || "") }}
                        />
                        <button
                          onClick={fetchAIDigest}
                          className="w-full text-center text-[9px] font-mono hover:underline cursor-pointer text-neutral-405 hover:text-neutral-605 outline-none"
                        >
                          Regenerate Summary
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Personal Insights Tab */}
                {aiHubTab === "insights" && (
                  <div className="space-y-4">
                    {insightsData === null && !insightsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3.5">
                        <Sparkles className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
                        <p className="text-[10px] text-neutral-400">Analyze logged topics to find personal patterns.</p>
                        <button
                          onClick={fetchAIInsights}
                          className="text-[9px] uppercase font-mono tracking-wider font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-4 py-2.5 rounded-xl transition-all cursor-pointer outline-none hover:scale-95"
                        >
                          Extract AI Insights
                        </button>
                      </div>
                    ) : insightsLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="h-6 w-6 rounded-full border border-transparent border-t-neutral-850 animate-spin" />
                        <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400">Analyzing patterns...</span>
                      </div>
                    ) : (
                      <div className="space-y-5 animate-in fade-in duration-300">
                        {/* Mood vibe */}
                        <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-900 p-4 rounded-2xl space-y-1">
                          <div className="text-[9px] uppercase font-mono text-neutral-400">Core Vibe & Mood Assessment</div>
                          <div className="text-xs font-bold text-neutral-850 dark:text-white">{insightsData?.mood}</div>
                        </div>

                        {/* Observations */}
                        <div className="space-y-2">
                          <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block">Personal Observations</span>
                          <div className="space-y-2">
                            {insightsData?.insights.map((insight, idx) => (
                              <div key={idx} className="p-3 bg-neutral-50/30 dark:bg-neutral-900/10 border border-neutral-100 dark:border-neutral-900 rounded-xl text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
                                • {insight}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recommendations */}
                        <div className="space-y-2">
                          <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block">AI Recommendations</span>
                          <div className="space-y-2">
                            {insightsData?.recommendations.map((rec, idx) => (
                              <div key={idx} className="p-3 bg-neutral-50/30 dark:bg-neutral-900/10 border border-neutral-100 dark:border-neutral-900 rounded-xl text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal flex items-start gap-2">
                                <span>💡</span>
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={fetchAIInsights}
                          className="w-full text-center text-[9px] font-mono hover:underline cursor-pointer text-neutral-405 hover:text-neutral-605 outline-none"
                        >
                          Re-run Analysis
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Smart Search Tab */}
                {aiHubTab === "search" && (
                  <div className="space-y-4">
                    {/* Search Bar Input */}
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block">AI Semantic Search</span>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Ask conceptually (e.g. 'student portal updates')..."
                          value={smartSearchQuery}
                          onChange={(e) => setSmartSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSmartSearch();
                          }}
                          className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs focus-visible:ring-0 focus-visible:border-neutral-200 dark:focus-visible:border-neutral-800 text-neutral-800 dark:text-neutral-200"
                        />
                        <button
                          onClick={handleSmartSearch}
                          disabled={smartSearchLoading || !smartSearchQuery.trim()}
                          className="h-10 px-4 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {smartSearchLoading ? (
                            <div className="h-3.5 w-3.5 rounded-full border border-transparent border-t-current animate-spin" />
                          ) : (
                            <span>Search</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {smartSearchLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="h-6 w-6 rounded-full border border-transparent border-t-neutral-850 animate-spin" />
                        <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400">Scanning neural space...</span>
                      </div>
                    ) : smartSearchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-neutral-400 text-center gap-2">
                        <Search className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
                        <p className="text-[10px]">No semantic matches found. Try queries like "student portal update" or "moodboard guidelines".</p>
                      </div>
                    ) : (
                      <div className="space-y-3.5 overflow-y-auto max-h-[55vh] pr-1">
                        <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block">AI Neural Matches ({smartSearchResults.length})</span>
                        {smartSearchResults.map(({ memory, relevance, explanation }) => (
                          <Card key={memory.id} className="p-4 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl shadow-none space-y-2 text-left">
                            <div className="flex items-start justify-between gap-4">
                              <h4 className="text-xs font-bold text-neutral-850 dark:text-white truncate">{memory.title}</h4>
                              <span className="text-[9px] font-semibold text-green-500 font-mono">
                                {Math.round(relevance * 100)}% Match
                              </span>
                            </div>
                            <p className="text-xs text-neutral-505 dark:text-neutral-405 line-clamp-2 leading-relaxed">{memory.content}</p>
                            <div className="bg-neutral-50/50 dark:bg-neutral-900/20 p-2.5 rounded-xl text-[10px] text-neutral-600 dark:text-neutral-350 italic border border-neutral-50 dark:border-neutral-900 font-normal">
                              {explanation}
                            </div>
                            <div className="flex justify-end pt-1">
                              <Link
                                href={`/memories/${memory.id}`}
                                onClick={() => setAiHubOpen(false)}
                                className="text-[9px] uppercase font-mono font-bold tracking-wider bg-neutral-50 dark:bg-neutral-905 px-3 py-1.5 rounded-lg border border-neutral-100 dark:border-neutral-850 hover:opacity-85"
                              >
                                Open Memory
                              </Link>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </SheetContent>
          </Sheet>

          {/* Mobile Daily Share Compiler Bottom Sheet */}
          <Sheet open={isShareSidebarOpen} onOpenChange={(open) => {
            setIsShareSidebarOpen(open);
            if (!open) {
              setGeneratedShareLink("");
              setShareLinkCopied(false);
            }
          }}>
            <SheetContent side="bottom" className="h-[85vh] bg-background border-t border-neutral-100 dark:border-neutral-900 flex flex-col p-6 text-foreground outline-none rounded-t-[32px] overflow-hidden">
              {(() => {
                const dayLogs = memories.filter((m) => m.date === shareDate);
                const totalLogs = dayLogs.length;
                
                const uniqueDatesWithCounts = Array.from(
                  memories.reduce((acc, m) => {
                    acc.set(m.date, (acc.get(m.date) || 0) + 1);
                    return acc;
                  }, new Map<string, number>())
                ).map(([date, count]) => ({ date, count }))
                .sort((a, b) => b.date.localeCompare(a.date));

                const getShareText = () => {
                  if (dayLogs.length === 0) return "";
                  let text = `🧠 Daily Activities Digest - ${shareDate}\n\n`;
                  dayLogs.forEach((m, idx) => {
                    const timeStr = m.fromTime && m.toTime
                      ? `${format24hToAMPM(m.fromTime)} - ${format24hToAMPM(m.toTime)} (${m.duration})`
                      : format24hToAMPM(m.time);
                    text += `${idx + 1}. ${m.title} (${timeStr})\n`;
                    text += `   Category: ${m.category}\n`;
                    if (m.tags && m.tags.length > 0) {
                      text += `   Tags: ${m.tags.map((t) => `#${t}`).join(" ")}\n`;
                    }
                    text += `   Content: ${m.content.slice(0, 150)}...\n\n`;
                  });
                  text += `Shared via Memory AI`;
                  return text;
                };

                const shareText = getShareText();

                return (
                  <div className="flex-1 flex flex-col min-h-0 text-left">
                    <SheetHeader className="text-left pb-4 border-b border-neutral-100 dark:border-neutral-900 flex flex-row items-center justify-between shrink-0">
                      <div>
                        <SheetTitle className="text-sm font-bold tracking-tight text-neutral-855 dark:text-white">Daily Share Compiler</SheetTitle>
                        <SheetDescription className="text-[10px] text-neutral-450 font-mono">Format, compile, and generate secure public links</SheetDescription>
                      </div>
                      <button
                        onClick={() => setIsShareSidebarOpen(false)}
                        className="w-8 h-8 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-455 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer outline-none"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto py-5 space-y-6 text-xs min-h-0">
                      {/* Calendar View representation */}
                      <div className="space-y-2 border border-neutral-100 dark:border-neutral-900 p-4.5 bg-neutral-50/30 dark:bg-neutral-950/20 rounded-3xl">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block font-bold">Select Date via Calendar Index</span>
                        <CalendarView
                          activeDates={Array.from(new Set(memories.map(m => m.date)))}
                          selectedDate={shareDate}
                          onDateSelect={(dateStr) => {
                            setShareDate(dateStr);
                            setShareCopied(false);
                            setAiShareText("");
                            setGeneratedShareLink("");
                            setShareLinkCopied(false);
                          }}
                        />
                      </div>

                      {/* Dropdown date selector */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Or Select Date with Logs</span>
                        {uniqueDatesWithCounts.length === 0 ? (
                          <div className="text-neutral-400 italic text-xs">No memories logged yet.</div>
                        ) : (
                          <select
                            value={shareDate}
                            onChange={(e) => {
                              setShareDate(e.target.value);
                              setShareCopied(false);
                              setAiShareText("");
                              setGeneratedShareLink("");
                              setShareLinkCopied(false);
                            }}
                            className="w-full h-11 px-3.5 bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-900 rounded-xl text-xs font-mono text-neutral-800 dark:text-neutral-200 outline-none focus:border-neutral-250 cursor-pointer"
                          >
                            <option value="" disabled>-- Select a date --</option>
                            {uniqueDatesWithCounts.map(({ date, count }) => (
                              <option key={date} value={date} className="bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200">
                                {date} ({count} {count === 1 ? "activity" : "activities"})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Preview and AI compiler */}
                      {totalLogs > 0 && (
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block font-bold animate-in fade-in">
                              {aiShareText ? "✨ AI Synthesized Report" : "Raw Logs Digest"} Preview ({totalLogs} Logs)
                            </span>
                            
                            {aiShareText ? (
                              <button
                                onClick={() => setAiShareText("")}
                                className="text-[9px] uppercase font-mono tracking-wider text-neutral-455 hover:text-neutral-855 dark:hover:text-white underline cursor-pointer outline-none animate-in fade-in"
                              >
                                Reset to Raw Logs
                              </button>
                            ) : (
                              <button
                                onClick={() => fetchAIShareSummary(shareDate)}
                                disabled={aiShareLoading}
                                className="h-7 px-2.5 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 rounded-lg text-[9px] uppercase font-mono font-bold tracking-wider hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer outline-none disabled:opacity-40"
                              >
                                {aiShareLoading ? (
                                  <div className="h-3 w-3 rounded-full border border-transparent border-t-current animate-spin" />
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    <span>AI Synthesize</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {aiShareLoading ? (
                            <div className="py-16 border border-neutral-100 dark:border-neutral-900 bg-neutral-50/10 dark:bg-neutral-950/10 rounded-2xl flex flex-col items-center justify-center gap-2">
                              <div className="h-5 w-5 rounded-full border border-transparent border-t-neutral-850 dark:border-t-white animate-spin" />
                              <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 animate-pulse">AI compiling daily logs...</span>
                            </div>
                          ) : (
                            <div className="space-y-4 animate-in fade-in">
                              <textarea
                                readOnly
                                value={aiShareText || shareText}
                                className="w-full min-h-[200px] p-4 text-[10.5px] font-mono leading-relaxed bg-neutral-50/50 dark:bg-neutral-900/20 border border-neutral-100 dark:border-neutral-900 rounded-2xl text-neutral-800 dark:text-neutral-200 focus:outline-none resize-none font-normal"
                              />
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(aiShareText || shareText);
                                    setShareCopied(true);
                                    setTimeout(() => setShareCopied(false), 2000);
                                  }}
                                  className="flex-1 h-11 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 rounded-xl text-[10px] uppercase font-mono font-bold tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none"
                                >
                                  {shareCopied ? (
                                    <span className="flex items-center gap-1 text-green-500"><Check className="w-3.5 h-3.5" /> Copied!</span>
                                  ) : (
                                    <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> Copy Share Digest</span>
                                  )}
                                </button>
                              </div>

                              {/* Public Secure Share Link Generator section */}
                              <div className="pt-5 border-t border-neutral-100 dark:border-neutral-900 flex flex-col gap-3">
                                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block font-bold">Secure Public Share Link</span>
                                
                                {generatedShareLink ? (
                                  <div className="space-y-2.5 animate-in fade-in">
                                    <div className="bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-850/60 flex items-center justify-between gap-3">
                                      <span className="text-[10.5px] font-mono text-neutral-500 dark:text-neutral-455 truncate flex-1">{generatedShareLink}</span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(generatedShareLink);
                                          setShareLinkCopied(true);
                                          setTimeout(() => setShareLinkCopied(false), 2000);
                                        }}
                                        className="h-8 px-3.5 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 rounded-xl text-[10px] uppercase font-mono font-bold hover:opacity-85 outline-none shrink-0 cursor-pointer"
                                      >
                                        {shareLinkCopied ? "Copied" : "Copy Link"}
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] text-neutral-455 font-mono">
                                      <Shield className="w-3.5 h-3.5 text-green-500" />
                                      <span>This secure link is active for {shareDuration} {shareDuration === 1 ? "hour" : "hours"}.</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[9px] text-neutral-400 font-mono uppercase tracking-wider">Link Expiration Duration</span>
                                      <select
                                        value={shareDuration}
                                        onChange={(e) => setShareDuration(Number(e.target.value))}
                                        className="h-10 px-3 bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-900 rounded-xl text-xs font-mono text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer"
                                      >
                                        <option value={1}>1 Hour (Default)</option>
                                        <option value={2}>2 Hours</option>
                                        <option value={3}>3 Hours</option>
                                        <option value={6}>6 Hours</option>
                                        <option value={12}>12 Hours</option>
                                        <option value={24}>24 Hours</option>
                                      </select>
                                    </div>

                                    <button
                                      onClick={() => handleGeneratePublicShareLink(shareDate)}
                                      disabled={shareLinkLoading}
                                      className="h-11 w-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 rounded-xl text-[10px] uppercase font-mono font-bold tracking-wider hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer outline-none disabled:opacity-45"
                                    >
                                      {shareLinkLoading ? (
                                        <div className="h-3.5 w-3.5 rounded-full border border-transparent border-t-current animate-spin" />
                                      ) : (
                                        <>
                                          <LinkIcon className="w-3.5 h-3.5" />
                                          <span>Create Shared Card Link</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>

                            </div>
                          )}

                          {totalLogs === 0 && (
                            <div className="py-12 border border-dashed border-neutral-150 dark:border-neutral-900 bg-neutral-50/10 dark:bg-neutral-950/10 rounded-2xl text-center text-xs text-neutral-455 italic">
                              No activities logged for {shareDate}. Choose another date.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </SheetContent>
          </Sheet>
          
          {/* Mobile Daily Summary Details Sheet */}
          <Sheet open={!!selectedDaySummaryDate} onOpenChange={(open) => !open && setSelectedDaySummaryDate(null)}>
            <SheetContent side="bottom" className="h-[75vh] bg-background border-t border-neutral-100 dark:border-neutral-900 flex flex-col p-6 text-foreground outline-none rounded-t-[32px] overflow-hidden">
              {(() => {
                if (!selectedDaySummaryDate) return null;
                const dayLogs = memories.filter((m) => m.date === selectedDaySummaryDate);
                const totalLogs = dayLogs.length;
                const imagesCount = dayLogs.reduce((acc, m) => acc + (m.images?.length || 0), 0);
                const voiceCount = dayLogs.reduce((acc, m) => acc + (m.audios?.length || 0), 0);

                const getCategoriesCount = (memoriesList: Memory[]) => {
                  return memoriesList.reduce((acc: Record<string, number>, m) => {
                    acc[m.category] = (acc[m.category] || 0) + 1;
                    return acc;
                  }, {});
                };
                const categoriesCount = getCategoriesCount(dayLogs);

                return (
                  <div className="flex-1 flex flex-col min-h-0 text-left">
                    <SheetHeader className="text-left pb-4 border-b border-neutral-100 dark:border-neutral-900 flex flex-row items-center justify-between shrink-0">
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 font-bold block">Daily Summary Log</span>
                        <SheetTitle className="text-sm font-bold tracking-tight text-neutral-855 dark:text-white font-mono">{selectedDaySummaryDate}</SheetTitle>
                      </div>
                      <button
                        onClick={() => setSelectedDaySummaryDate(null)}
                        className="w-8 h-8 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-455 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer outline-none"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto py-5 space-y-5 text-xs min-h-0">
                      {/* Stats widgets inside modal */}
                      <div className="grid grid-cols-3 gap-2.5">
                        <Card className="p-3 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl shadow-none text-left">
                          <span className="text-[8px] uppercase font-mono tracking-wider text-neutral-400 block font-bold">Total Logs</span>
                          <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">{totalLogs}</span>
                        </Card>
                        <Card className="p-3 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl shadow-none text-left">
                          <span className="text-[8px] uppercase font-mono tracking-wider text-neutral-400 block font-bold">Images</span>
                          <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">{imagesCount}</span>
                        </Card>
                        <Card className="p-3 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-955 rounded-2xl shadow-none text-left">
                          <span className="text-[8px] uppercase font-mono tracking-wider text-neutral-400 block font-bold">Voice Notes</span>
                          <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">{voiceCount}</span>
                        </Card>
                      </div>

                      {/* Categories breakdown badges */}
                      <div className="flex flex-wrap gap-1.5 text-[8.5px] uppercase font-mono tracking-wider font-bold">
                        <span className="text-neutral-405 py-0.5">Categories:</span>
                        {Object.entries(categoriesCount).map(([cat, val]) => (
                          <span key={cat} className="px-2 py-0.5 rounded bg-neutral-50 dark:bg-neutral-900 text-neutral-500 border border-neutral-100 dark:border-neutral-800">
                            {cat}: {val}
                          </span>
                        ))}
                      </div>

                      {/* Logs feed of the day */}
                      <div className="space-y-3.5 pt-2">
                        <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-450 block font-bold">Recorded Logs</span>
                        {dayLogs.length === 0 ? (
                          <div className="text-neutral-400 italic text-center py-6">No logs for this date.</div>
                        ) : (
                          <div className="space-y-3">
                            {dayLogs.map((m) => (
                              <Card key={m.id} className="p-4 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl shadow-none space-y-2 text-left">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex flex-col gap-0.5 truncate">
                                    <span className="text-xs font-bold text-neutral-850 dark:text-white truncate">{m.title}</span>
                                    <span className="text-[9px] font-mono text-neutral-400">
                                      {m.fromTime && m.toTime ? `${format24hToAMPM(m.fromTime)} - ${format24hToAMPM(m.toTime)}` : format24hToAMPM(m.time)}
                                    </span>
                                  </div>
                                  <span className={`text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-mono shrink-0 ${
                                    m.category === "Activity" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-500" :
                                    m.category === "Insight" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-500" :
                                    m.category === "Reminder" ? "bg-red-50 dark:bg-red-950/30 text-red-500" :
                                    "bg-neutral-150 dark:bg-neutral-900 text-neutral-500"
                                  }`}>
                                    {m.category}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-455 line-clamp-2 leading-relaxed font-sans">{m.content}</p>
                                <div className="flex gap-2 pt-1">
                                  <Link
                                    href={`/memories/${m.id}`}
                                    onClick={() => setSelectedDaySummaryDate(null)}
                                    className="text-[9px] uppercase font-mono font-bold tracking-wider bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-3 py-1.5 rounded-lg hover:opacity-85"
                                  >
                                    Read
                                  </Link>
                                  <Link
                                    href={`/memories/${m.id}/edit`}
                                    onClick={() => setSelectedDaySummaryDate(null)}
                                    className="text-[9px] uppercase font-mono font-bold tracking-wider bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-lg hover:opacity-85"
                                  >
                                    Edit
                                  </Link>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </SheetContent>
          </Sheet>

          {showOnboarding && (
            <OnboardingTour onComplete={handleOnboardingComplete} />
          )}

        </div>
      </MobileFrame>
    </ProtectedRoute>
  );
}
