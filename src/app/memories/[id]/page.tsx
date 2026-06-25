"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { useAuth } from "@/context/auth-context";
import { memoryService, Memory } from "@/lib/memory-service";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Edit2, Trash2, Calendar, Clock, Sparkles, AlertTriangle, Mic, FileText, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Simple Markdown parser to generate preview HTML safely
const parseMarkdown = (markdown: string) => {
  if (!markdown) return "";
  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
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

  return (
    <ProtectedRoute>
      <MobileFrame>
        <div className="flex-1 flex flex-col bg-background pb-6 select-none overflow-hidden relative">
          
          {/* Header */}
          <div className="h-16 px-6 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between bg-background/95 dark:bg-neutral-950/95 backdrop-blur-md z-30 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push("/dashboard")}
                className="w-8 h-8 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer outline-none"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs uppercase tracking-wider font-semibold text-neutral-800 dark:text-neutral-200">
                Memory Details
              </span>
            </div>

            {memory && (
              <Link 
                href={`/memories/${memory.id}/edit`}
                className="w-8 h-8 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Body content (scrollable) */}
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
                {/* Meta details Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-[8.5px] uppercase tracking-wider px-3 py-1 rounded-full font-bold ${
                    memory.category === "Activity" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-500 border border-blue-100/50" :
                    memory.category === "Insight" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-500 border border-amber-100/50" :
                    memory.category === "Reminder" ? "bg-red-50 dark:bg-red-950/30 text-red-500 border border-red-100/50" :
                    "bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border border-neutral-100/50"
                  }`}>
                    {memory.category}
                  </span>

                  <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>{memory.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{memory.time}</span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-neutral-950 dark:text-white tracking-tight leading-tight">
                  {memory.title}
                </h1>

                {/* Stored Tags List */}
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

                {/* AI generated summary if available */}
                {memory.summary && (
                  <div className="bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-900 p-4 rounded-2xl space-y-1.5 text-left relative overflow-hidden select-none animate-in fade-in duration-300">
                    <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[9px] uppercase font-mono tracking-wider font-semibold">AI Brief Digest</span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-350 leading-relaxed italic">
                      "{memory.summary}"
                    </p>
                  </div>
                )}

                {/* Separator line */}
                <div className="h-px bg-neutral-100 dark:bg-neutral-900" />

                {/* Content body parsed from Markdown */}
                <div 
                  className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed text-left space-y-3 prose dark:prose-invert font-normal max-w-full"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(memory.content) }}
                />

                {/* Phase 3 Media Gallery & Attachments Previews */}
                {((allImages && allImages.length > 0) ||
                  (memory.audios && memory.audios.length > 0) ||
                  (remainingDocuments && remainingDocuments.length > 0)) && (
                  <div className="space-y-6 pt-4 border-t border-neutral-100 dark:border-neutral-900">
                    
                    {/* Images Gallery */}
                    {allImages && allImages.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block">
                          Images ({allImages.length})
                        </span>
                        <div className="grid grid-cols-2 gap-2.5">
                          {allImages.map((img) => (
                            <motion.div
                              key={img.publicId}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setActiveImage(img.url)}
                              className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-850 cursor-pointer shadow-sm"
                            >
                              <img
                                src={img.url}
                                alt={img.name}
                                className="w-full h-full object-cover select-none pointer-events-none"
                              />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Files Player List */}
                    {memory.audios && memory.audios.length > 0 && (
                      <div className="space-y-2.5">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block">
                          Voice & Audio Notes ({memory.audios.length})
                        </span>
                        <div className="space-y-2">
                          {memory.audios.map((aud) => (
                            <div
                              key={aud.publicId}
                              className="bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-850/80 p-3.5 rounded-2xl flex flex-col gap-2 shadow-sm"
                            >
                              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-750 dark:text-neutral-250">
                                <Mic className="w-4 h-4 text-red-500 shrink-0" />
                                <span className="truncate">{aud.name}</span>
                                {aud.size && (
                                  <span className="text-[9.5px] font-mono text-neutral-450 font-normal shrink-0">
                                    ({formatFileSize(aud.size)})
                                  </span>
                                )}
                              </div>
                              <audio
                                src={aud.url}
                                controls
                                className="w-full h-8 text-xs focus:outline-none dark:filter dark:invert dark:hue-rotate-180"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Documents List */}
                    {remainingDocuments && remainingDocuments.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block">
                          Documents & Files ({remainingDocuments.length})
                        </span>
                        <div className="grid gap-2">
                          {remainingDocuments.map((doc) => (
                            <a
                              key={doc.publicId}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3.5 bg-neutral-50/60 dark:bg-neutral-900/30 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-850 rounded-2xl text-xs transition-all duration-200 group shadow-sm"
                            >
                              <div className="flex items-center gap-3 truncate">
                                <FileText className="w-4.5 h-4.5 text-neutral-450 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors shrink-0" />
                                <div className="flex flex-col truncate">
                                  <span className="truncate font-semibold text-neutral-850 dark:text-neutral-200">
                                    {doc.name}
                                  </span>
                                  {doc.size && (
                                    <span className="text-[9.5px] text-neutral-450 font-mono">
                                      {formatFileSize(doc.size)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="p-1 rounded-full bg-neutral-100/50 dark:bg-neutral-800/40 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                                <Download className="w-3.5 h-3.5" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Separator line */}
                <div className="h-px bg-neutral-100 dark:bg-neutral-900 pt-4" />

                {/* Delete button action */}
                <div className="pt-2">
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    variant="outline"
                    className="w-full h-11 border border-red-200/50 hover:bg-red-50 text-red-600 dark:border-red-950/30 dark:hover:bg-red-950/20 dark:text-red-400 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:border-transparent transition-all duration-300 shadow-none outline-none cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Log Record</span>
                  </Button>
                </div>

              </motion.div>
            )}
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
                  alt="Fullscreen memory asset"
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl select-none"
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </MobileFrame>
    </ProtectedRoute>
  );
}
