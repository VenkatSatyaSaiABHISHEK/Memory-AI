"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { SidebarMenu } from "@/components/layout/sidebar-menu";
import { useAuth } from "@/context/auth-context";
import { memoryService, Memory } from "@/lib/memory-service";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Calendar, Clock, Sparkles, Brain, Check, Grid, List as ListIcon, ChevronDown, ChevronUp, Eye, Edit3, Heart, BarChart2, Star, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CalendarView } from "@/components/ui/calendar-view";
import { OnboardingTour } from "@/components/ui/onboarding-tour";


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
  const { user } = useAuth();
  
  // App States
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"feed" | "timeline">("feed");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Phase 5 SaaS states
  const [activeDashboardTab, setActiveDashboardTab] = useState<"feed" | "analytics">("feed");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);



  useEffect(() => {
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem("memory_ai_onboarding_completed");
      if (!completed) {
        setShowOnboarding(true);
      }
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("memory_ai_onboarding_completed", "true");
    setShowOnboarding(false);
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

  const initial = user?.displayName ? user.displayName.charAt(0) : "M";

  return (
    <ProtectedRoute>
      <MobileFrame>
        <div className="flex-1 flex flex-col bg-background pb-6 select-none overflow-hidden relative">
          
          {/* Dashboard Header */}
          <div className="h-16 px-6 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between bg-background/95 dark:bg-neutral-950/95 backdrop-blur-md z-30 shrink-0">
            <div className="flex items-center gap-1">
              <SidebarMenu />
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
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400">Database Index</span>
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{filteredMemories.length} / {memories.length} Memories</span>
                  </div>

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
                    <div className="space-y-3">
                      <AnimatePresence initial={false}>
                        {filteredMemories.map((m) => {
                          const isExpanded = expandedCardId === m.id;
                          return (
                            <motion.div
                              key={m.id}
                              layout
                              onClick={(e) => toggleExpandCard(m.id, e)}
                              className="cursor-pointer"
                            >
                              <Card className="p-4 border-neutral-105 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl premium-shadow-sm flex flex-col justify-between gap-3 shadow-none transition-all duration-300 relative overflow-hidden select-none">
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
                                  <p className={`text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed text-left transition-all ${
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
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3" />
                                    <span>{m.date}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{m.time}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
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
                      setSelectedDate(selectedDate === dateStr ? null : dateStr);
                      setActiveDashboardTab("feed");
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
          
          {showOnboarding && (
            <OnboardingTour onComplete={handleOnboardingComplete} />
          )}

        </div>
      </MobileFrame>
    </ProtectedRoute>
  );
}
