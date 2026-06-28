"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { useAuth } from "@/context/auth-context";
import { memoryService, Memory } from "@/lib/memory-service";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Edit2, Trash2, Calendar, Clock, Sparkles, AlertTriangle, Mic, FileText, Download, X, Share2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

// URL count helper
function countUrls(text: string): number {
  if (!text) return 0;
  const matches = text.match(/https?:\/\/[^\s/$.?#].[^\s]*/gi);
  return matches ? matches.length : 0;
}

// Simple Markdown parser with URL Linkification support
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

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MemoryDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { user } = useAuth();
  const router = useRouter();

  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Fetch memory details
  useEffect(() => {
    async function loadMemory() {
      if (!user) return;
      try {
        const docSnap = await memoryService.fetchMemoryById(id, user.uid);
        setMemory(docSnap);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadMemory();
  }, [id, user]);

  const isImageFile = (filename: string, fileType?: string) => {
    const name = filename.toLowerCase();
    const type = fileType?.toLowerCase();
    return (
      name.endsWith(".png") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".webp") ||
      name.endsWith(".gif") ||
      name.endsWith(".svg") ||
      name.endsWith(".bmp") ||
      (type && type.startsWith("image/"))
    );
  };

  const allImages = memory 
    ? [
        ...(memory.images || []),
        ...(memory.documents || []).filter(doc => isImageFile(doc.name, doc.type))
      ]
    : [];

  const remainingDocuments = memory
    ? (memory.documents || []).filter(doc => !isImageFile(doc.name, doc.type))
    : [];

  const handleDelete = async () => {
    if (!memory || !user) return;
    if (confirm("Are you sure you want to permanently delete this memory?")) {
      setIsDeleting(true);
      try {
        const success = await memoryService.deleteMemory(memory.id, user.uid);
        if (success) {
          router.push("/dashboard");
        } else {
          alert("Failed to delete memory.");
        }
      } catch (e) {
        console.error(e);
        alert("An error occurred.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Clipboard share individual activity
  const handleShareMemory = () => {
    if (!memory) return;
    const timeStr = memory.fromTime && memory.toTime
      ? `${format24hToAMPM(memory.fromTime)} - ${format24hToAMPM(memory.toTime)} (${memory.duration})`
      : format24hToAMPM(memory.time);
    let text = `🧠 Memory Log: ${memory.title}\n`;
    text += `Date: ${memory.date}\n`;
    text += `Time: ${timeStr}\n`;
    text += `Category: ${memory.category}\n`;
    if (memory.tags && memory.tags.length > 0) {
      text += `Tags: ${memory.tags.map((t) => `#${t}`).join(" ")}\n`;
    }
    text += `\nDescription:\n${memory.content}\n\n`;
    text += `Shared via Memory AI`;

    navigator.clipboard.writeText(text);
    alert(`Copied individual memory summary to clipboard!`);
  };

  const linkCount = memory ? countUrls(memory.content) : 0;

  return (
    <ProtectedRoute>
      {/* MOBILE DISPLAY VIEWPORT */}
      <div className="block lg:hidden w-full">
        <MobileFrame>
          <div className="flex-1 flex flex-col bg-background pb-6 select-none overflow-hidden relative">
            
            {/* Header */}
            <div className="h-16 px-6 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between bg-background/95 dark:bg-neutral-950/95 backdrop-blur-md z-30 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.back()}
                  className="w-8 h-8 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-955 dark:hover:text-white transition-colors cursor-pointer outline-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs uppercase tracking-wider font-semibold text-neutral-800 dark:text-neutral-200">
                  Memory Details
                </span>
              </div>

              {memory && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleShareMemory}
                    className="w-8 h-8 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <Link 
                    href={`/memories/${memory.id}/edit`}
                    className="w-8 h-8 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Body content scroll */}
            <div className="flex-1 overflow-y-auto px-6 py-6 text-left space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-8 w-8 rounded-full border border-transparent border-t-neutral-850 animate-spin" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450">Loading Memory...</span>
                </div>
              ) : !memory ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <AlertTriangle className="w-8 h-8 text-neutral-400" />
                  <span className="text-xs text-neutral-500">Memory log not found.</span>
                  <Link href="/dashboard" className="text-xs font-bold underline">Back to Dashboard</Link>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6 pb-12"
                >
                  {/* Meta Details Header */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[8.5px] uppercase tracking-wider px-3 py-1 rounded-full font-bold ${
                      memory.category === "Activity" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-500 border border-blue-100/50" :
                      memory.category === "Insight" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-500 border border-amber-100/50" :
                      memory.category === "Reminder" ? "bg-red-50 dark:bg-red-950/30 text-red-500 border border-red-100/50" :
                      "bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border border-neutral-100/50"
                    }`}>
                      {memory.category}
                    </span>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-450 dark:text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{memory.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {memory.fromTime && memory.toTime
                            ? `${format24hToAMPM(memory.fromTime)} - ${format24hToAMPM(memory.toTime)}`
                            : format24hToAMPM(memory.time)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl font-bold text-neutral-950 dark:text-white tracking-tight leading-tight">
                    {memory.title}
                  </h1>

                  {/* Timing stats overlay if present */}
                  {memory.duration && (
                    <div className="bg-neutral-50/50 dark:bg-neutral-900/25 border border-neutral-100 dark:border-neutral-900 p-3 rounded-xl flex justify-between items-center text-xs">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-450 font-bold">Activity Duration</span>
                      <span className="font-bold font-mono text-[10px] text-neutral-800 dark:text-neutral-200">{memory.duration}</span>
                    </div>
                  )}

                  {/* Link Count badge */}
                  {linkCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-2.5 py-1 rounded-xl self-start w-fit">
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{linkCount} Link{linkCount > 1 ? "s" : ""} Detected</span>
                    </div>
                  )}

                  {/* Tags */}
                  {memory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {memory.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] font-semibold tracking-wider font-mono bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-800/80 px-2 py-0.5 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* AI brief digest */}
                  {memory.summary && (
                    <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-900 p-4 rounded-2xl space-y-1.5 text-left relative overflow-hidden animate-in fade-in">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[9px] uppercase font-mono tracking-wider font-semibold">AI Brief Digest</span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-350 leading-relaxed italic">
                        "{memory.summary}"
                      </p>
                    </div>
                  )}

                  <div className="h-px bg-neutral-100 dark:bg-neutral-900" />

                  {/* Description Render */}
                  <div 
                    className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed text-left space-y-3 prose dark:prose-invert font-normal max-w-full"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(memory.content) }}
                  />

                  {/* Media gallery */}
                  {((allImages && allImages.length > 0) ||
                    (memory.audios && memory.audios.length > 0) ||
                    (remainingDocuments && remainingDocuments.length > 0)) && (
                    <div className="space-y-6 pt-4 border-t border-neutral-100 dark:border-neutral-900">
                      
                      {allImages && allImages.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block">Images ({allImages.length})</span>
                          <div className="grid grid-cols-2 gap-2.5">
                            {allImages.map((img) => (
                              <motion.div
                                key={img.publicId}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setActiveImage(img.url)}
                                className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-850 cursor-pointer shadow-sm animate-in fade-in"
                              >
                                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {memory.audios && memory.audios.length > 0 && (
                        <div className="space-y-2.5">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block">Audio Records ({memory.audios.length})</span>
                          <div className="space-y-2">
                            {memory.audios.map((aud) => (
                              <div key={aud.publicId} className="bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-850 p-3.5 rounded-2xl flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-750">
                                  <Mic className="w-4 h-4 text-red-500 shrink-0" />
                                  <span className="truncate">{aud.name}</span>
                                  {aud.size && <span className="text-[9.5px] font-mono text-neutral-450 font-normal shrink-0">({formatFileSize(aud.size)})</span>}
                                </div>
                                <audio src={aud.url} controls className="w-full h-8 dark:filter dark:invert dark:hue-rotate-180" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {remainingDocuments && remainingDocuments.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block">Documents ({remainingDocuments.length})</span>
                          <div className="grid gap-2">
                            {remainingDocuments.map((doc) => (
                              <a
                                key={doc.publicId}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3.5 bg-neutral-50/60 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-850 rounded-2xl text-xs transition-all group"
                              >
                                <div className="flex items-center gap-3 truncate">
                                  <FileText className="w-4.5 h-4.5 text-neutral-450 shrink-0" />
                                  <div className="flex flex-col truncate">
                                    <span className="truncate font-semibold text-neutral-850 dark:text-neutral-250">{doc.name}</span>
                                    {doc.size && <span className="text-[9.5px] text-neutral-450 font-mono">{formatFileSize(doc.size)}</span>}
                                  </div>
                                </div>
                                <div className="p-1 rounded-full bg-neutral-100/50 dark:bg-neutral-800/40 text-neutral-500">
                                  <Download className="w-3.5 h-3.5" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="h-px bg-neutral-100 dark:bg-neutral-900 pt-4" />

                  {/* Actions */}
                  <div className="pt-2">
                    <Button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      variant="outline"
                      className="w-full h-11 border border-red-205/50 hover:bg-red-50 text-red-600 dark:text-red-400 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Log Record</span>
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

          </div>
        </MobileFrame>
      </div>

      {/* DEDICATED DESKTOP DUAL-COLUMN VIEWPORT */}
      <div className="hidden lg:flex w-full min-h-screen bg-neutral-50 dark:bg-neutral-950 justify-center p-8 select-none">
        <div className="w-full max-w-5xl bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-900 rounded-[32px] premium-shadow-md flex flex-col overflow-hidden animate-in fade-in duration-300">
          
          {/* Header */}
          <div className="h-20 px-8 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 text-left">
              <button 
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-955 dark:hover:text-white transition-colors cursor-pointer outline-none"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Workspace Reader</span>
                <h1 className="text-sm font-bold text-neutral-900 dark:text-white">Logged Activity details</h1>
              </div>
            </div>

            {memory && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleShareMemory}
                  className="h-10 px-4 border border-neutral-200 dark:border-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-xl text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-700 dark:text-neutral-300 transition-all flex items-center gap-1.5 cursor-pointer outline-none"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Log</span>
                </button>
                <Link href={`/memories/${memory.id}/edit`}>
                  <button className="h-10 px-4 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 rounded-xl text-[10px] uppercase font-mono tracking-wider font-bold hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer outline-none shadow-md">
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Log</span>
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Body content dual column */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="h-8 w-8 rounded-full border border-transparent border-t-neutral-850 animate-spin" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450">Loading Memory Details...</span>
              </div>
            ) : !memory ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <AlertTriangle className="w-8 h-8 text-neutral-400" />
                <span className="text-xs text-neutral-500">Memory log not found.</span>
                <Link href="/dashboard" className="text-xs font-bold underline">Back to Dashboard</Link>
              </div>
            ) : (
              <>
                {/* LEFT COLUMN: Metadata details, summaries, attachments */}
                <div className="w-[350px] border-r border-neutral-100 dark:border-neutral-900 overflow-y-auto p-8 space-y-6 text-left shrink-0">
                  
                  {/* Category label */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Category</span>
                    <span className={`text-[9px] uppercase tracking-wider px-3 py-1 rounded-full font-bold border inline-block ${
                      memory.category === "Activity" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-500 border-blue-100/30" :
                      memory.category === "Insight" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-500 border-amber-100/30" :
                      memory.category === "Reminder" ? "bg-red-50 dark:bg-red-950/30 text-red-500 border-red-100/30" :
                      "bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200/50"
                    }`}>
                      {memory.category}
                    </span>
                  </div>

                  {/* Timing Details */}
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Logged Timing</span>
                    <Card className="p-3.5 border border-neutral-100 dark:border-neutral-900 bg-neutral-50/20 dark:bg-neutral-950/20 shadow-none space-y-2 font-mono text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Date:</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200">{memory.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Time:</span>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200">
                          {memory.fromTime && memory.toTime
                            ? `${format24hToAMPM(memory.fromTime)} - ${format24hToAMPM(memory.toTime)}`
                            : format24hToAMPM(memory.time)}
                        </span>
                      </div>
                      {memory.duration && (
                        <div className="flex justify-between pt-1 border-t border-neutral-200/50 dark:border-neutral-850">
                          <span className="text-neutral-400">Duration:</span>
                          <span className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[9px]">{memory.duration}</span>
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Link Count badge inside left column */}
                  {linkCount > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Web Hyperlinks</span>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-3 py-1.5 rounded-xl w-full justify-center">
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>{linkCount} Link{linkCount > 1 ? "s" : ""} Detected In Body</span>
                      </div>
                    </div>
                  )}

                  {/* AI Generated brief digest */}
                  {memory.summary && (
                    <div className="bg-neutral-50/50 dark:bg-neutral-900/35 border border-neutral-100 dark:border-neutral-900 p-4.5 rounded-3xl space-y-2.5 relative overflow-hidden select-none">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[9px] uppercase font-mono tracking-wider font-semibold">AI Brief Digest</span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-350 leading-relaxed italic">
                        "{memory.summary}"
                      </p>
                    </div>
                  )}

                  {/* Semantic Tags */}
                  {memory.tags && memory.tags.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Semantic Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {memory.tags.map((tag) => (
                          <span key={tag} className="text-[9px] font-semibold font-mono bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-800/80 px-2.5 py-1 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments List */}
                  {((allImages && allImages.length > 0) ||
                    (memory.audios && memory.audios.length > 0) ||
                    (remainingDocuments && remainingDocuments.length > 0)) && (
                    <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-900">
                      <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Media Assets</span>
                      
                      {/* Audio assets */}
                      {memory.audios && memory.audios.length > 0 && (
                        <div className="space-y-2">
                          {memory.audios.map((aud) => (
                            <div key={aud.publicId} className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-850 p-3 rounded-2xl flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold truncate text-left">{aud.name}</span>
                              <audio src={aud.url} controls className="w-full h-8 scale-90 -mx-3.5 dark:filter dark:invert dark:hue-rotate-180" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Documents */}
                      {remainingDocuments && remainingDocuments.length > 0 && (
                        <div className="grid gap-2">
                          {remainingDocuments.map((doc) => (
                            <a
                              key={doc.publicId}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3 bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-850 rounded-2xl text-[10px] transition-all group"
                            >
                              <span className="truncate font-bold text-neutral-850 dark:text-neutral-250 pr-2">{doc.name}</span>
                              <Download className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-neutral-100 dark:border-neutral-900/60">
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full h-10 border border-red-200/50 hover:bg-red-500/10 text-red-600 hover:border-red-500 rounded-xl text-[9px] uppercase font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Log Record</span>
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: Large title and parsed Markdown content view */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 text-left bg-neutral-50/30 dark:bg-neutral-950/20">
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">{memory.title}</h2>
                    <div className="h-px bg-neutral-100 dark:bg-neutral-900" />
                  </div>

                  {/* Large Content area */}
                  <div 
                    className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed space-y-3 prose dark:prose-invert font-normal max-w-full"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(memory.content) }}
                  />

                  {/* Large screen images display */}
                  {allImages && allImages.length > 0 && (
                    <div className="space-y-3 pt-6 border-t border-neutral-100 dark:border-neutral-900">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block font-bold">Image Attachments ({allImages.length})</span>
                      <div className="grid grid-cols-3 gap-3.5">
                        {allImages.map((img) => (
                          <motion.div
                            key={img.publicId}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveImage(img.url)}
                            className="relative aspect-video rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-850 cursor-pointer shadow-sm"
                          >
                            <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Fullscreen Image Lightbox overlay */}
      <AnimatePresence>
        {activeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveImage(null)}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-55 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer outline-none"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              src={activeImage}
              alt="Fullscreen asset preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl select-none"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </ProtectedRoute>
  );
}
