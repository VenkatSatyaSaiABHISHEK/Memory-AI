"use client";
 
import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { memoryService, Memory } from "@/lib/memory-service";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Calendar, AlertTriangle, Shield, Brain, Sparkles, 
  ExternalLink, Moon, Sun, Lock, Link as LinkIcon 
} from "lucide-react";
import { Card } from "@/components/ui/card";
 
interface PageProps {
  params: Promise<{ id: string }>;
}
 
// AM/PM time formatting helper
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
 
// Markdown parser with URL Linkification support
const parseMarkdown = (markdown: string) => {
  if (!markdown) return "";
  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
 
  // Convert unformatted URLs to clickable links
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-neutral-900 dark:text-white underline font-semibold hover:opacity-80">$1</a>'
  );
 
  html = html
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*?)$/gm, "<h3 class='text-sm font-bold mt-4 mb-1.5 text-neutral-900 dark:text-white'>$1</h3>")
    .replace(/^## (.*?)$/gm, "<h2 class='text-base font-bold mt-5 mb-2 text-neutral-900 dark:text-white'>$1</h2>")
    .replace(/^# (.*?)$/gm, "<h1 class='text-lg font-bold mt-6 mb-2.5 text-neutral-900 dark:text-white'>$1</h1>")
    .replace(/^\- (.*?)$/gm, "<li class='list-disc list-inside ml-2 text-xs text-neutral-750 dark:text-neutral-300'>$1</li>")
    .replace(/\n/g, "<br />");
  return html;
};
 
export default function SharedLogPage({ params }: PageProps) {
  const { id } = use(params);
  
  const [sharedData, setSharedData] = useState<{
    date: string;
    memories: Memory[];
    expiresAt: number;
    durationHours: number;
    aiSummary?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
 
  // Theme Toggle
  const toggleTheme = () => {
    if (typeof window !== "undefined") {
      const current = document.documentElement.classList.toggle("dark");
      setIsDarkMode(current);
      localStorage.setItem("theme", current ? "dark" : "light");
    }
  };
 
  // Load Shared Logs
  useEffect(() => {
    async function loadShared() {
      try {
        const data = await memoryService.fetchSharedLink(id);
        if (data) {
          setSharedData(data);
          // Check expiration
          if (Date.now() > data.expiresAt) {
            setIsExpired(true);
          }
        }
      } catch (err: any) {
        console.error("Failed to load shared logs:", err);
        if (err.code === "permission-denied" || err.message?.toLowerCase().includes("permission") || err.message?.toLowerCase().includes("insufficient")) {
          setPermissionError(true);
        }
      } finally {
        setLoading(false);
      }
    }
    loadShared();
 
    if (typeof window !== "undefined") {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    }
  }, [id]);
 
  // Live Timer Countdown Interval
  useEffect(() => {
    if (!sharedData || isExpired) return;
 
    const timer = setInterval(() => {
      const remainingMs = sharedData.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setIsExpired(true);
        setTimeLeftStr("Expired");
        clearInterval(timer);
      } else {
        const totalSecs = Math.floor(remainingMs / 1000);
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
 
        let str = "";
        if (hours > 0) str += `${hours}h `;
        if (mins > 0 || hours > 0) str += `${mins}m `;
        str += `${secs}s`;
        setTimeLeftStr(str);
      }
    }, 1000);
 
    return () => clearInterval(timer);
  }, [sharedData, isExpired]);
 
  // Render Categories count
  const getCategoriesCount = (memoriesList: Memory[]) => {
    return memoriesList.reduce((acc: Record<string, number>, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    }, {});
  };
 
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 gap-4 text-neutral-800 dark:text-neutral-200">
        <div className="h-8 w-8 rounded-full border-2 border-transparent border-t-neutral-950 dark:border-t-white animate-spin" />
        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450">Loading Shared Activities...</span>
      </div>
    );
  }
 
  if (permissionError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-850 p-8 rounded-[32px] text-left shadow-xl space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400">Firebase Security Rules</h2>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-tight font-sans">Firestore Permission Required</h3>
            </div>
          </div>
          
          <div className="space-y-4 text-xs leading-relaxed font-normal text-neutral-600 dark:text-neutral-350">
            <p>
              The application is encountering a <strong>FirebaseError: Missing or insufficient permissions</strong> when trying to read the shared log entry.
            </p>
            <p>
              To allow users who are <strong>not logged in</strong> to view shared daily activities, your Firestore Security Rules must be updated in your Firebase Console to allow public reads for the <code>shared_logs</code> collection.
            </p>
            
            <div className="space-y-2 mt-4">
              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-400 block">Recommended Firestore Rules Setup:</span>
              <pre className="p-4 bg-neutral-55 dark:bg-neutral-950 rounded-2xl border border-neutral-100 dark:border-neutral-850 text-[10.5px] font-mono leading-relaxed overflow-x-auto text-neutral-800 dark:text-neutral-200">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Shared logs can be read publicly, but only written by auth owners
    match /shared_logs/{shareId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Existing memories collection rule
    match /memories/{memoryId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}`}
              </pre>
            </div>
            
            <p className="text-[10px] text-neutral-400 font-mono italic">
              After updating these rules in the Firebase Console Rules Tab and clicking "Publish", reload this page to view your shared logs.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }
 
  if (isExpired || !sharedData) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-850 p-8 rounded-[32px] text-center shadow-xl space-y-6"
        >
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-white">Shared Link Expired</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
              This daily activity share link is no longer active for security and privacy reasons.
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-850/60 mt-4 text-[11px] text-neutral-600 dark:text-neutral-350 italic font-mono">
              "Please ask the owner to compile and generate a new share link."
            </div>
          </div>
          
          <div className="pt-2">
            <div className="text-[9px] font-mono text-neutral-400">
              Security Expiration Protection • Memory AI
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
 
  const totalDuration = sharedData.memories.reduce((acc, m) => {
    if (!m.duration) return acc;
    const match = m.duration.match(/(\d+)\s*Min/i);
    return acc + (match ? Number(match[1]) : 0);
  }, 0);
 
  const categoriesCount = getCategoriesCount(sharedData.memories);
 
  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-neutral-950 text-foreground transition-colors duration-300 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl w-full mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-900 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-md">
              <Brain className="w-5.5 h-5.5" />
            </div>
            <div className="text-left">
              <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 font-bold block">Public Workspace Reader</span>
              <h1 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">Shared Daily Activity Digest</h1>
            </div>
          </div>
          
          <button 
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-500 transition-colors cursor-pointer outline-none"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>
 
        {/* Expiration warning banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            <span className="text-xs font-semibold">Active Secure Share Link</span>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-900 dark:bg-neutral-100 px-3.5 py-1.5 rounded-xl font-mono text-[10.5px] font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Expires in: {timeLeftStr || "Calculating..."}</span>
          </div>
        </div>
 
        {/* Day Stats Overview */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="p-5 border border-neutral-200/60 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-3xl shadow-none space-y-1 text-left">
            <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Digest Date</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-white font-mono">{sharedData.date}</span>
          </Card>
          <Card className="p-5 border border-neutral-200/60 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-3xl shadow-none space-y-1 text-left">
            <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Total Logs</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-white font-mono">{sharedData.memories.length} Entries</span>
          </Card>
          <Card className="p-5 border border-neutral-200/60 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-3xl shadow-none space-y-1 text-left col-span-2 sm:col-span-1">
            <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Total Time Tracked</span>
            <span className="text-sm font-bold text-neutral-800 dark:text-white font-mono">{totalDuration > 0 ? `${totalDuration} Minutes` : "Not specified"}</span>
          </Card>
        </section>
 
        {/* Category Breakdown Badges */}
        <div className="flex flex-wrap gap-2 text-[9px] uppercase font-mono font-bold tracking-wider">
          <span className="text-neutral-450 py-1">Categories Breakdown:</span>
          {Object.entries(categoriesCount).map(([cat, val]) => (
            <span key={cat} className="px-2.5 py-1 rounded bg-neutral-200/50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-850">
              {cat}: {val}
            </span>
          ))}
        </div>
 
        {/* AI Compiled Summary Card if present */}
        {sharedData.aiSummary && (
          <section className="space-y-3 text-left">
            <span className="text-xs uppercase font-mono tracking-widest text-neutral-450 font-bold block">✨ AI Compiled Executive Summary</span>
            <Card className="p-6 border border-neutral-200/60 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-[28px] shadow-none flex flex-col gap-4 text-left animate-in fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-mono text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                <span>AI Synthesis</span>
              </div>
              <div 
                className="text-xs text-neutral-705 dark:text-neutral-305 leading-relaxed font-normal pt-2 prose dark:prose-invert font-sans"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(sharedData.aiSummary) }}
              />
            </Card>
          </section>
        )}
 
        {/* Shared activities list */}
        <main className="space-y-4">
          <h2 className="text-xs uppercase font-mono tracking-widest text-neutral-455 font-bold text-left block">Logs Feed Content</h2>
          {sharedData.memories.map((m) => {
            return (
              <Card key={m.id} className="p-6 border border-neutral-200/60 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-[28px] shadow-none flex flex-col gap-4 text-left animate-in fade-in">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-bold text-neutral-855 dark:text-white leading-tight">
                      {m.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {m.fromTime && m.toTime
                          ? `${format24hToAMPM(m.fromTime)} - ${format24hToAMPM(m.toTime)} (${m.duration})`
                          : format24hToAMPM(m.time)}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[8px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                    m.category === "Activity" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-500 border border-blue-100/30" :
                    m.category === "Insight" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-500 border border-amber-100/30" :
                    m.category === "Reminder" ? "bg-red-50 dark:bg-red-950/30 text-red-500 border border-red-100/30" :
                    "bg-neutral-50 dark:bg-neutral-900 text-neutral-500"
                  }`}>
                    {m.category}
                  </span>
                </div>
 
                <p 
                  className="text-xs text-neutral-600 dark:text-neutral-350 leading-relaxed font-normal border-t border-neutral-50 dark:border-neutral-900/50 pt-3"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(m.content) }}
                />
 
                {m.tags && m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-mono text-neutral-450">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
 
                {/* Media thumbnail lists */}
                {((m.images && m.images.length > 0) || (m.audios && m.audios.length > 0)) && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-neutral-50 dark:border-neutral-900/40 mt-1">
                    {m.images && m.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-3.5">
                        {m.images.map((img, idx) => (
                          <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border border-neutral-100 dark:border-neutral-850 bg-neutral-100 dark:bg-neutral-900">
                            <img src={img.url} alt={img.name} className="object-cover w-full h-full" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </main>
      </div>
 
      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto border-t border-neutral-200/50 dark:border-neutral-900/60 pt-6 text-center text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-16">
        Shared securely via Memory AI • No login required reader portal
      </footer>
    </div>
  );
}
