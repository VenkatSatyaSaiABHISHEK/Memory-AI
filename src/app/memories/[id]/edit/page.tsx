"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { useAuth } from "@/context/auth-context";
import { memoryService, Memory, MediaAsset } from "@/lib/memory-service";
import { MediaUploader } from "@/components/ui/media-uploader";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bold, Italic, Heading, List, Check, Save, X, Plus, Sparkles, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TitleAutocomplete } from "@/components/ui/title-autocomplete";

// Duration calculation helper
function calculateDuration(fromStr: string, toStr: string): string {
  if (!fromStr || !toStr) return "";
  const [fromH, fromM] = fromStr.split(":").map(Number);
  const [toH, toM] = toStr.split(":").map(Number);
  if (isNaN(fromH) || isNaN(fromM) || isNaN(toH) || isNaN(toM)) return "";

  let diffMin = (toH * 60 + toM) - (fromH * 60 + fromM);
  if (diffMin < 0) {
    diffMin += 24 * 60; // spans midnight
  }

  if (diffMin < 60) {
    return `${diffMin} Minutes`;
  } else {
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return mins > 0
      ? `${hours} Hour${hours > 1 ? "s" : ""} ${mins} Minute${mins > 1 ? "s" : ""}`
      : `${hours} Hour${hours > 1 ? "s" : ""}`;
  }
}

// URL detection helper
function countUrls(text: string): number {
  if (!text) return 0;
  const matches = text.match(/https?:\/\/[^\s/$.?#].[^\s]*/gi);
  return matches ? matches.length : 0;
}

// Simple Markdown parser
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
    .replace(/^### (.*?)$/gm, "<h3 class='text-sm font-bold mt-3 mb-1'>$1</h3>")
    .replace(/^## (.*?)$/gm, "<h2 class='text-base font-bold mt-4 mb-2'>$1</h2>")
    .replace(/^# (.*?)$/gm, "<h1 class='text-lg font-bold mt-5 mb-2.5'>$1</h1>")
    .replace(/^\- (.*?)$/gm, "<li class='list-disc list-inside ml-2 text-xs'>$1</li>")
    .replace(/\n/g, "<br />");
  return html;
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditMemoryPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { user } = useAuth();
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("Note");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [date, setDate] = useState("");
  
  // Timing states
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("09:40");
  const [duration, setDuration] = useState("40 Minutes");

  // Phase 3 media array states
  const [images, setImages] = useState<MediaAsset[]>([]);
  const [audios, setAudios] = useState<MediaAsset[]>([]);
  const [documents, setDocuments] = useState<MediaAsset[]>([]);

  // Phase 4 summary and AI helper state
  const [summary, setSummary] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-calculate duration
  useEffect(() => {
    setDuration(calculateDuration(fromTime, toTime));
  }, [fromTime, toTime]);

  const linkCount = countUrls(content);

  // AI Autofill Trigger
  const handleAIAutoFill = async () => {
    if (!content.trim()) {
      alert("Please write some content first so the AI can analyze it!");
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) throw new Error("AI analysis failed.");
      const data = await res.json();
      
      if (data.title) setTitle(data.title);
      if (data.summary) setSummary(data.summary);
      if (data.category) setCategory(data.category);
      if (Array.isArray(data.tags)) setTags(data.tags);
    } catch (e) {
      console.error(e);
      alert("Failed to analyze content with AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch memory details
  useEffect(() => {
    async function loadMemory() {
      if (!user) return;
      try {
        const memoryDoc = await memoryService.fetchMemoryById(id, user.uid);
        if (memoryDoc) {
          setTitle(memoryDoc.title);
          setContent(memoryDoc.content);
          const DEFAULT_CATEGORIES = [
            "Note", "Activity", "Insight", "Reminder", 
            "Class Work", "Parent Meeting", "Parent Calling", 
            "Student Interaction", "Meeting @person", "Project Work", 
            "Student Issue"
          ];
          const isDefault = DEFAULT_CATEGORIES.includes(memoryDoc.category);
          if (!isDefault) {
            setIsCustomCategory(true);
            setCustomCategory(memoryDoc.category);
          } else {
            setIsCustomCategory(false);
          }
          setCategory(memoryDoc.category);
          setTags(memoryDoc.tags || []);
          setDate(memoryDoc.date);
          setFromTime(memoryDoc.fromTime || memoryDoc.time || "09:00");
          setToTime(memoryDoc.toTime || "09:40");
          setDuration(memoryDoc.duration || calculateDuration(memoryDoc.fromTime || memoryDoc.time || "09:00", memoryDoc.toTime || "09:40"));
          
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

          const rawImages = memoryDoc.images || [];
          const rawDocs = memoryDoc.documents || [];

          const loadedImages = [
            ...rawImages,
            ...rawDocs.filter((doc) => isImageFile(doc.name, doc.type))
          ];

          const loadedDocs = rawDocs.filter((doc) => !isImageFile(doc.name, doc.type));

          setImages(loadedImages);
          setAudios(memoryDoc.audios || []);
          setDocuments(loadedDocs);
          setSummary(memoryDoc.summary || "");
        } else {
          alert("Memory not found.");
          router.push("/dashboard");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadMemory();
  }, [id, user, router]);

  // Insert markdown tags helper
  const handleInsertMarkdown = (syntax: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const selected = text.substring(start, end);

    let replacement = "";
    if (syntax === "bold") {
      replacement = `**${selected || "bold text"}**`;
    } else if (syntax === "italic") {
      replacement = `*${selected || "italic text"}*`;
    } else if (syntax === "heading") {
      replacement = `\n# ${selected || "Heading"}\n`;
    } else if (syntax === "list") {
      replacement = `\n- ${selected || "list item"}\n`;
    }

    setContent(before + replacement + after);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  // Add tags handlers
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !user) return;

    setIsSaving(true);
    try {
      const success = await memoryService.updateMemory(id, user.uid, {
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
        date,
        time: fromTime, // Compatibility mapping
        fromTime,
        toTime,
        duration,
        images,
        audios,
        documents,
        summary: summary.trim(),
      });

      if (success) {
        setSaveSuccess(true);
        setTimeout(() => {
          router.push(`/memories/${id}`);
        }, 600);
      } else {
        alert("Failed to update memory.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      {/* MOBILE EDIT VIEWPORT */}
      <div className="block lg:hidden w-full">
        <MobileFrame>
          <div className="flex-1 flex flex-col bg-background pb-6 select-none overflow-hidden relative">
            
            {/* Header */}
            <div className="h-16 px-6 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between bg-background/95 dark:bg-neutral-950/95 backdrop-blur-md z-30 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.push(`/memories/${id}`)}
                  className="w-8 h-8 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer outline-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs uppercase tracking-wider font-semibold text-neutral-800 dark:text-neutral-200">
                  Edit Memory
                </span>
              </div>
            </div>

            {/* Scroll Container */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-8 w-8 rounded-full border border-transparent border-t-neutral-850 animate-spin" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450">Loading editor...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 text-left pb-12">
                  {/* Title Autocomplete */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450">Memory Title</span>
                    <TitleAutocomplete
                      value={title}
                      onChange={setTitle}
                      required
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450">Category</span>
                    <select
                      value={isCustomCategory ? "Other" : category}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Other") {
                          setIsCustomCategory(true);
                          setCategory(customCategory || "Other");
                        } else {
                          setIsCustomCategory(false);
                          setCategory(val);
                        }
                      }}
                      className="w-full h-11 px-3.5 bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-900 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:border-neutral-250 cursor-pointer"
                    >
                      {[
                        "Note", "Activity", "Insight", "Reminder", 
                        "Class Work", "Parent Meeting", "Parent Calling", 
                        "Student Interaction", "Meeting @person", "Project Work", 
                        "Student Issue"
                      ].map((cat) => (
                        <option key={cat} value={cat} className="bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200">
                          {cat}
                        </option>
                      ))}
                      <option value="Other" className="bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200">
                        Other (Custom)
                      </option>
                    </select>

                    {isCustomCategory && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-1.5"
                      >
                        <Input
                          type="text"
                          placeholder="Enter custom category..."
                          required
                          value={customCategory}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomCategory(val);
                            setCategory(val || "Other");
                          }}
                          className="h-9 max-w-xs bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 font-mono shadow-none focus-visible:ring-0 focus-visible:border-neutral-250"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Date Logged */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Date Logged</span>
                    <Input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 font-mono shadow-none focus-visible:ring-0 focus-visible:border-neutral-250"
                    />
                  </div>

                  {/* From / To Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">From Time</span>
                      <Input
                        type="time"
                        required
                        value={fromTime}
                        onChange={(e) => setFromTime(e.target.value)}
                        className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 font-mono focus-visible:ring-0 focus-visible:border-neutral-250"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">To Time</span>
                      <Input
                        type="time"
                        required
                        value={toTime}
                        onChange={(e) => setToTime(e.target.value)}
                        className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 font-mono focus-visible:ring-0 focus-visible:border-neutral-250"
                      />
                    </div>
                  </div>

                  <div className="bg-neutral-50/50 dark:bg-neutral-900/25 border border-neutral-100 dark:border-neutral-900 p-3 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Auto Duration</span>
                    <span className="font-bold font-mono text-[10px] text-neutral-800 dark:text-neutral-200">{duration || "—"}</span>
                  </div>

                  {/* Markdown content edit */}
                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 flex items-center gap-1.5">
                        <span>Rich Text Content</span>
                        {linkCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[8px] bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-1.5 py-0.5 rounded font-bold font-mono">
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span>{linkCount} Link{linkCount > 1 ? "s" : ""}</span>
                          </span>
                        )}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAIAutoFill}
                          disabled={isAnalyzing || !content.trim()}
                          className="flex items-center gap-1.5 text-[9px] uppercase font-mono font-bold tracking-wider px-2.5 py-1 rounded-lg transition-all bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 disabled:opacity-40"
                        >
                          {isAnalyzing ? (
                            <div className="h-2.5 w-2.5 rounded-full border border-transparent border-t-current animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          <span>AI Auto-fill</span>
                        </button>

                        <div className="flex bg-neutral-50 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                          <button
                            type="button"
                            onClick={() => setIsPreview(false)}
                            className={`text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-1 rounded-md transition-all ${
                              !isPreview ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-950 dark:text-white" : "text-neutral-400"
                            }`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsPreview(true)}
                            className={`text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-1 rounded-md transition-all ${
                              isPreview ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-950 dark:text-white" : "text-neutral-400"
                            }`}
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                    </div>

                    {!isPreview ? (
                      <div className="border border-neutral-100 dark:border-neutral-900 rounded-2xl overflow-hidden bg-neutral-50/20 dark:bg-neutral-950/20 flex flex-col">
                        <div className="h-9 px-3 border-b border-neutral-150 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center gap-2">
                          <button type="button" onClick={() => handleInsertMarkdown("bold")} className="p-1 text-neutral-500 hover:text-neutral-900"><Bold className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleInsertMarkdown("italic")} className="p-1 text-neutral-500 hover:text-neutral-900"><Italic className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleInsertMarkdown("heading")} className="p-1 text-neutral-500 hover:text-neutral-900"><Heading className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleInsertMarkdown("list")} className="p-1 text-neutral-500 hover:text-neutral-900"><List className="w-3.5 h-3.5" /></button>
                        </div>
                        <textarea
                          ref={textareaRef}
                          required
                          placeholder="Content..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="min-h-[160px] p-4 text-xs bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400"
                        />
                      </div>
                    ) : (
                      <div 
                        className="min-h-[195px] p-4 border border-neutral-100 dark:border-neutral-900 bg-neutral-50/20 dark:bg-neutral-950/20 rounded-2xl text-xs text-neutral-800 dark:text-neutral-200 overflow-y-auto leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(content) || "<span class='text-neutral-400 italic'>Write something to preview...</span>" }}
                      />
                    )}
                  </div>

                  {/* AI Summary */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">AI Short Summary</span>
                    <textarea
                      placeholder="Write summary..."
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full min-h-[90px] py-2.5 px-3 text-xs bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-900 rounded-xl focus:outline-none text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Semantic Tags</span>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Add tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs text-neutral-800 dark:text-neutral-200"
                        />
                        <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-neutral-400">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tags.map((tag) => (
                          <span key={tag} className="flex items-center gap-1 text-[9px] font-semibold font-mono bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-800/80 pl-2.5 pr-1.5 py-0.5 rounded-full">
                            <span>#{tag}</span>
                            <button type="button" onClick={() => handleRemoveTag(tag)} className="text-neutral-450 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Media */}
                  <div className="border-t border-neutral-100 dark:border-neutral-900 pt-4">
                    <MediaUploader
                      images={images}
                      onImagesChange={setImages}
                      audios={audios}
                      onAudiosChange={setAudios}
                      documents={documents}
                      onDocumentsChange={setDocuments}
                    />
                  </div>

                  {/* Save button */}
                  <div className="pt-4 flex items-center gap-3">
                    <Button
                      type="submit"
                      disabled={isSaving || !title.trim() || !content.trim()}
                      className="flex-1 h-12 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-900 dark:hover:bg-neutral-100 rounded-2xl text-xs font-semibold uppercase tracking-wider disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg outline-none"
                    >
                      {saveSuccess ? (
                        <span className="flex items-center gap-2 text-green-500"><Check className="w-4 h-4" /> Saved Changes!</span>
                      ) : isSaving ? (
                        <span className="flex items-center gap-2"><div className="h-4 w-4 rounded-full border border-transparent border-t-current animate-spin" /> Updating...</span>
                      ) : (
                        <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Changes</span>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </MobileFrame>
      </div>

      {/* DEDICATED DESKTOP DUAL-PANE VIEWPORT */}
      <div className="hidden lg:flex w-full min-h-screen bg-neutral-50 dark:bg-neutral-950 justify-center p-8 select-none">
        <div className="w-full max-w-5xl bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-900 rounded-[32px] premium-shadow-md flex flex-col overflow-hidden animate-in fade-in duration-300">
          
          {/* Header */}
          <div className="h-20 px-8 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 text-left">
              <button 
                onClick={() => router.push(`/memories/${id}`)}
                className="w-10 h-10 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-955 dark:hover:text-white transition-colors cursor-pointer outline-none"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 font-bold">Workspace Editor</span>
                <h1 className="text-sm font-bold text-neutral-900 dark:text-white">Modify Logged Record Details</h1>
              </div>
            </div>
          </div>

          {/* Body Dual-Pane */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="h-8 w-8 rounded-full border border-transparent border-t-neutral-850 animate-spin" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450">Loading Memory Editor...</span>
              </div>
            ) : (
              <>
                {/* LEFT PANE: Form Input controls */}
                <div className="w-1/2 overflow-y-auto p-8 border-r border-neutral-100 dark:border-neutral-900 space-y-6 text-left">
                  <div className="space-y-5">
                    {/* Title */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 block font-bold">Activity Title</span>
                      <TitleAutocomplete value={title} onChange={setTitle} required />
                    </div>

                    {/* Category selectors */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-455 block font-bold">Category</span>
                      <div className="flex items-center gap-2 pt-0.5">
                        {["Note", "Activity", "Insight", "Reminder"].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className={`text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl font-bold border transition-all cursor-pointer outline-none ${
                              category === cat
                                ? "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-950 dark:border-white"
                                : "bg-transparent text-neutral-450 dark:text-neutral-500 border-neutral-200 dark:border-neutral-900 hover:text-neutral-600"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date logged */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Date Logged</span>
                      <Input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-150 dark:border-neutral-900 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 font-mono shadow-none focus-visible:ring-0 focus-visible:border-neutral-250"
                      />
                    </div>

                    {/* From / To Times */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">From Time</span>
                        <Input
                          type="time"
                          required
                          value={fromTime}
                          onChange={(e) => setFromTime(e.target.value)}
                          className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-150 dark:border-neutral-900 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 font-mono shadow-none focus-visible:ring-0 focus-visible:border-neutral-250"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">To Time</span>
                        <Input
                          type="time"
                          required
                          value={toTime}
                          onChange={(e) => setToTime(e.target.value)}
                          className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-150 dark:border-neutral-900 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 font-mono shadow-none focus-visible:ring-0 focus-visible:border-neutral-250"
                        />
                      </div>
                    </div>

                    {/* Duration readout */}
                    <div className="bg-neutral-50/50 dark:bg-neutral-900/25 border border-neutral-100 dark:border-neutral-900 p-3.5 rounded-xl flex justify-between items-center text-xs">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-450 font-bold">Calculated Duration</span>
                      <span className="font-bold font-mono text-[10px] text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/80 px-2 py-0.5 rounded">
                        {duration || "—"}
                      </span>
                    </div>

                    {/* AI Summary */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">AI Brief Digest Summary</span>
                        <button
                          type="button"
                          onClick={handleAIAutoFill}
                          disabled={isAnalyzing || !content.trim()}
                          className="flex items-center gap-1.5 text-[9px] uppercase font-mono font-bold tracking-wider px-2.5 py-1 rounded-lg transition-all bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 disabled:opacity-40"
                        >
                          {isAnalyzing ? (
                            <div className="h-2.5 w-2.5 rounded-full border border-transparent border-t-current animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          <span>AI Generate Summary</span>
                        </button>
                      </div>
                      <textarea
                        placeholder="Summary compiles here..."
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full min-h-[90px] p-3 text-xs bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-150 dark:border-neutral-900 rounded-xl focus:outline-none text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 resize-none font-normal"
                      />
                    </div>

                    {/* Semantic Tags */}
                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block font-bold">Tags</span>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Add tag and press space..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-150 dark:border-neutral-900 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-455"
                          />
                          <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-neutral-400">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <span key={tag} className="flex items-center gap-1.5 text-[9px] font-bold font-mono bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-405 border border-neutral-100 dark:border-neutral-850 px-2.5 py-1 rounded-full">
                              <span>#{tag}</span>
                              <button type="button" onClick={() => handleRemoveTag(tag)} className="text-neutral-400 hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Media attachment */}
                    <div className="border-t border-neutral-100 dark:border-neutral-900 pt-4">
                      <MediaUploader
                        images={images}
                        onImagesChange={setImages}
                        audios={audios}
                        onAudiosChange={setAudios}
                        documents={documents}
                        onDocumentsChange={setDocuments}
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT PANE: markdown edit and live preview side-by-side! */}
                <div className="w-1/2 flex flex-col min-h-0 bg-neutral-50/30 dark:bg-neutral-950/20">
                  
                  {/* Top toolbar */}
                  <div className="h-14 border-b border-neutral-100 dark:border-neutral-900 px-6 flex items-center justify-between shrink-0">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-450 flex items-center gap-2.5 font-bold">
                      <span>Markdown Content Editor</span>
                      {linkCount > 0 && (
                        <span className="flex items-center gap-1 text-[9px] bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-2 py-0.5 rounded-full font-bold font-mono">
                          <LinkIcon className="w-3 h-3" />
                          <span>{linkCount} Link{linkCount > 1 ? "s" : ""} detected</span>
                        </span>
                      )}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleInsertMarkdown("bold")} className="p-1.5 hover:bg-neutral-100 rounded text-neutral-500"><Bold className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleInsertMarkdown("italic")} className="p-1.5 hover:bg-neutral-100 rounded text-neutral-500"><Italic className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleInsertMarkdown("heading")} className="p-1.5 hover:bg-neutral-100 rounded text-neutral-500"><Heading className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleInsertMarkdown("list")} className="p-1.5 hover:bg-neutral-100 rounded text-neutral-500"><List className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* Text editor and Live Preview vertical split */}
                  <div className="flex-1 flex overflow-hidden min-h-0">
                    {/* Textarea pane */}
                    <div className="w-1/2 h-full border-r border-neutral-100 dark:border-neutral-900">
                      <textarea
                        ref={textareaRef}
                        required
                        placeholder="Write in markdown..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-full p-6 text-xs bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 font-mono"
                      />
                    </div>
                    
                    {/* Live Preview HTML pane */}
                    <div 
                      className="w-1/2 h-full p-6 text-xs text-neutral-800 dark:text-neutral-205 overflow-y-auto leading-relaxed text-left prose dark:prose-invert font-normal bg-white/40 dark:bg-neutral-950/20"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) || "<span class='text-neutral-400 font-mono italic'>Live HTML preview renders here as you type...</span>" }}
                    />
                  </div>

                  {/* Bottom save bar */}
                  <div className="h-20 px-8 border-t border-neutral-100 dark:border-neutral-900/80 bg-white dark:bg-neutral-950 flex items-center justify-end shrink-0">
                    <Button
                      onClick={handleSubmit}
                      disabled={isSaving || !title.trim() || !content.trim()}
                      className="h-11 px-8 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer rounded-xl font-mono text-[10px] uppercase tracking-wider font-bold shadow-lg"
                    >
                      {saveSuccess ? (
                        <span className="flex items-center gap-2 text-green-500"><Check className="w-4 h-4" /> Changes Saved Successfully</span>
                      ) : isSaving ? (
                        <span className="flex items-center gap-2"><div className="h-4 w-4 rounded-full border border-transparent border-t-current animate-spin" /> Saving Changes...</span>
                      ) : (
                        <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Memory Changes</span>
                      )}
                    </Button>
                  </div>

                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
