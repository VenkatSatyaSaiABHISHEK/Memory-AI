"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { useAuth } from "@/context/auth-context";
import { memoryService, MediaAsset } from "@/lib/memory-service";
import { MediaUploader } from "@/components/ui/media-uploader";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bold, Italic, Heading, List, Check, Save, X, Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DRAFT_KEY = "memory_ai_draft_new";

// Simple Markdown parser to generate preview HTML safely
const parseMarkdown = (markdown: string) => {
  if (!markdown) return "";
  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*?)$/gm, "<h3 class='text-sm font-bold mt-3 mb-1'>$1</h3>")
    .replace(/^## (.*?)$/gm, "<h2 class='text-base font-bold mt-4 mb-2'>$1</h2>")
    .replace(/^# (.*?)$/gm, "<h1 class='text-lg font-bold mt-5 mb-2.5'>$1</h1>")
    .replace(/^\- (.*?)$/gm, "<li class='list-disc list-inside ml-2 text-xs'>$1</li>")
    .replace(/\n/g, "<br />");
  return html;
};

export default function NewMemoryPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("Note");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  // Phase 3 media array states
  const [images, setImages] = useState<MediaAsset[]>([]);
  const [audios, setAudios] = useState<MediaAsset[]>([]);
  const [documents, setDocuments] = useState<MediaAsset[]>([]);

  // Phase 4 summary and AI helper state
  const [summary, setSummary] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Editor states
  const [isPreview, setIsPreview] = useState(false);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);
  const [hasRestorableDraft, setHasRestorableDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      
      setDraftSavedTime("AI Generated");
    } catch (e) {
      console.error(e);
      alert("Failed to analyze content with AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check for existing drafts on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title || parsed.content || (parsed.images && parsed.images.length > 0)) {
          setHasRestorableDraft(true);
        }
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
  }, []);

  // Periodic draft auto-saver (every 3 seconds if content is changing)
  useEffect(() => {
    if (!title && !content && images.length === 0 && audios.length === 0 && documents.length === 0 && !summary) return;
    
    const saver = setTimeout(() => {
      const draftObj = { title, content, category, tags, date, time, images, audios, documents, summary };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftObj));
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setDraftSavedTime(now);
    }, 3000);

    return () => clearTimeout(saver);
  }, [title, content, category, tags, date, time, images, audios, documents, summary]);

  const handleRestoreDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setTitle(parsed.title || "");
        setContent(parsed.content || "");
        setCategory(parsed.category || "Note");
        setTags(parsed.tags || []);
        setDate(parsed.date || new Date().toISOString().split("T")[0]);
        setTime(parsed.time || "12:00");
        setImages(parsed.images || []);
        setAudios(parsed.audios || []);
        setDocuments(parsed.documents || []);
        setSummary(parsed.summary || "");
        setDraftSavedTime("Restored");
      } catch (e) {
        console.error(e);
      }
    }
    setHasRestorableDraft(false);
  };

  const handleDismissDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasRestorableDraft(false);
  };

  // Helper to insert markdown tags at cursor selection
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
    
    // Maintain cursor position focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  // Add tags chip handlers
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

  // Save document
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !user) return;

    setIsSaving(true);
    try {
      await memoryService.createMemory({
        title: title.trim(),
        content: content.trim(),
        date,
        time,
        tags,
        category,
        userId: user.uid,
        images,
        audios,
        documents,
        summary: summary.trim(),
      });

      // Clear draft on successful save
      localStorage.removeItem(DRAFT_KEY);
      setSaveSuccess(true);
      
      // Delay transition to show success checkmark
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);

    } catch (e) {
      console.error(e);
      alert("Failed to save memory. Try again.");
    } finally {
      setIsSaving(false);
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
                New Memory
              </span>
            </div>

            {/* Auto-saved draft indicator */}
            {draftSavedTime && (
              <span className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" />
                Draft {draftSavedTime}
              </span>
            )}
          </div>

          {/* Form Content container scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            
            {/* Restorable Draft Alert Banner */}
            <AnimatePresence>
              {hasRestorableDraft && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-3 rounded-2xl flex items-center justify-between text-xs"
                >
                  <span className="text-neutral-600 dark:text-neutral-400 font-medium">Restorable draft found</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRestoreDraft}
                      className="text-neutral-900 dark:text-white font-bold hover:underline cursor-pointer outline-none"
                    >
                      Restore
                    </button>
                    <button
                      onClick={handleDismissDraft}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 font-medium cursor-pointer outline-none"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5 text-left pb-12">
              
              {/* Title input */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Memory Title</span>
                <Input
                  type="text"
                  required
                  placeholder="Name your memory..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs placeholder:text-neutral-450 focus-visible:ring-0 focus-visible:border-neutral-200 dark:focus-visible:border-neutral-800 shadow-none text-neutral-800 dark:text-neutral-200 font-semibold"
                />
              </div>

              {/* Category selection */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Category</span>
                <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto pb-0.5">
                  {(() => {
                    const defaults = ["Note", "Activity", "Insight", "Reminder"];
                    const list = defaults.includes(category) ? defaults : [...defaults, category];
                    return list.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-full font-semibold border transition-all cursor-pointer outline-none ${
                          category === cat
                            ? "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-950 dark:border-white"
                            : "bg-transparent text-neutral-450 dark:text-neutral-555 border-neutral-100 dark:border-neutral-900 hover:text-neutral-600 dark:hover:text-neutral-355"
                        }`}
                      >
                        {cat}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Date & Time override controls */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Date Logged</span>
                  <Input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs focus-visible:ring-0 focus-visible:border-neutral-250 dark:focus-visible:border-neutral-850 shadow-none text-neutral-800 dark:text-neutral-200 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Time Logged</span>
                  <Input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs focus-visible:ring-0 focus-visible:border-neutral-250 dark:focus-visible:border-neutral-850 shadow-none text-neutral-800 dark:text-neutral-200 font-mono"
                  />
                </div>
              </div>

              {/* Markdown Editor / Preview Container */}
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Rich Text Content</span>
                  
                  <div className="flex items-center gap-2">
                    {/* AI Auto-fill trigger button */}
                    <button
                      type="button"
                      onClick={handleAIAutoFill}
                      disabled={isAnalyzing || !content.trim()}
                      className="flex items-center gap-1.5 text-[9px] uppercase font-mono font-bold tracking-wider px-2.5 py-1 rounded-lg transition-all cursor-pointer outline-none bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-900 dark:hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {isAnalyzing ? (
                        <div className="h-2.5 w-2.5 rounded-full border border-transparent border-t-current animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>AI Auto-fill</span>
                    </button>

                    {/* Mode switcher tabs */}
                    <div className="flex bg-neutral-50 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() => setIsPreview(false)}
                        className={`text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-1 rounded-md transition-all cursor-pointer outline-none ${
                          !isPreview ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-950 dark:text-white" : "text-neutral-400 hover:text-neutral-600"
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPreview(true)}
                        className={`text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-1 rounded-md transition-all cursor-pointer outline-none ${
                          isPreview ? "bg-white dark:bg-neutral-850 shadow-sm text-neutral-950 dark:text-white" : "text-neutral-400 hover:text-neutral-600"
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                </div>

                {!isPreview ? (
                  <div className="border border-neutral-100 dark:border-neutral-900 rounded-2xl overflow-hidden bg-neutral-50/20 dark:bg-neutral-950/20 flex flex-col">
                    {/* Rich Formatting Toolbar */}
                    <div className="h-9 px-3 border-b border-neutral-150 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center gap-1 gap-x-2">
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("bold")}
                        title="Bold Text"
                        className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer outline-none"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("italic")}
                        title="Italic Text"
                        className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer outline-none"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("heading")}
                        title="Add Heading"
                        className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer outline-none"
                      >
                        <Heading className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("list")}
                        title="Add Bullet List"
                        className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer outline-none"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Content area */}
                    <textarea
                      ref={textareaRef}
                      required
                      placeholder="Start writing in markdown (e.g. # Header, **bold**, *italic*)..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[160px] p-4 text-xs bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400"
                    />
                  </div>
                ) : (
                  /* Preview HTML Render card */
                  <div 
                    className="min-h-[195px] p-4 border border-neutral-100 dark:border-neutral-900 bg-neutral-50/20 dark:bg-neutral-950/20 rounded-2xl text-xs text-neutral-800 dark:text-neutral-200 overflow-y-auto leading-relaxed text-left"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(content) || "<span class='text-neutral-400 italic'>Write something to see a preview...</span>" }}
                  />
                )}
              </div>

              {/* AI Short Summary field */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">AI Short Summary</span>
                <textarea
                  placeholder="Click 'AI Auto-fill' to automatically generate a summary, or write your own..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full min-h-[90px] py-2.5 px-3 text-xs bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-900 rounded-xl focus:outline-none text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 resize-none leading-relaxed"
                />
              </div>

              {/* Tags Input chip manager */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Semantic Tags</span>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Add tag and press space/enter..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="h-10 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs placeholder:text-neutral-450 focus-visible:ring-0 focus-visible:border-neutral-200 dark:focus-visible:border-neutral-850 shadow-none text-neutral-800 dark:text-neutral-200"
                    />
                    <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-neutral-400">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Displaying tag pills */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 text-[9px] font-semibold tracking-wider font-mono bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-800/80 pl-2.5 pr-1.5 py-0.5 rounded-full"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-500 text-neutral-400 p-0.5 rounded-full outline-none transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Phase 3 Media Uploader component */}
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

              {/* Action buttons */}
              <div className="pt-4 flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={isSaving || !title.trim() || !content.trim()}
                  className="w-full h-12 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-900 dark:hover:bg-neutral-100 rounded-2xl text-xs font-semibold uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none transition-all duration-300 shadow-lg dark:shadow-none flex items-center justify-center gap-2 cursor-pointer outline-none relative overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {saveSuccess ? (
                      <motion.span
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Saved Mind!</span>
                      </motion.span>
                    ) : isSaving ? (
                      <motion.span
                        key="saving"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <div className="h-4 w-4 rounded-full border border-transparent border-t-current animate-spin" />
                        <span>Saving...</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="default"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Memory</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>

            </form>
          </div>

        </div>
      </MobileFrame>
    </ProtectedRoute>
  );
}
