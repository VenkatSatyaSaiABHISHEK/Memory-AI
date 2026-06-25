"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Mic, Image as ImageIcon, FileText, X, UploadCloud, Film } from "lucide-react";
import { MediaAsset } from "@/lib/memory-service";

interface MediaUploaderProps {
  images: MediaAsset[];
  onImagesChange: (assets: MediaAsset[]) => void;
  audios: MediaAsset[];
  onAudiosChange: (assets: MediaAsset[]) => void;
  documents: MediaAsset[];
  onDocumentsChange: (assets: MediaAsset[]) => void;
}

interface UploadQueueItem {
  id: string;
  name: string;
  progress: number;
}

export function MediaUploader({
  images,
  onImagesChange,
  audios,
  onAudiosChange,
  documents,
  onDocumentsChange,
}: MediaUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(Array.from(e.target.files));
    }
  };

  // Upload runner
  const uploadFiles = async (files: File[]) => {
    const activeUploads = files.map((file) => {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      return {
        id: uploadId,
        file,
        name: file.name,
      };
    });

    // Add to queue
    setUploadQueue((prev) => [
      ...prev,
      ...activeUploads.map((item) => ({ id: item.id, name: item.name, progress: 10 })),
    ]);

    for (const item of activeUploads) {
      try {
        // Simulate progress bar increments for visual polish
        let currentProgress = 10;
        const progressInterval = setInterval(() => {
          currentProgress = Math.min(currentProgress + 15, 90);
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress: currentProgress } : q))
          );
        }, 150);

        // Actual fetch upload to API endpoint
        const formData = new FormData();
        formData.append("file", item.file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          throw new Error("Upload request failed.");
        }

        const result = await response.json();

        // 100% progress indicator
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: 100 } : q))
        );

        // Remove from queue after delay
        setTimeout(() => {
          setUploadQueue((prev) => prev.filter((q) => q.id !== item.id));
        }, 500);

        const newAsset: MediaAsset = {
          url: result.url,
          publicId: result.publicId,
          name: result.name,
          type: result.type,
          size: result.size,
        };

        // Classify asset
        if (result.category === "image") {
          onImagesChange([...images, newAsset]);
        } else if (result.category === "audio") {
          onAudiosChange([...audios, newAsset]);
        } else {
          onDocumentsChange([...documents, newAsset]);
        }

      } catch (error) {
        console.error("Upload error for file:", item.name, error);
        alert(`Failed to upload ${item.name}.`);
        
        // Remove failed items from queue
        setUploadQueue((prev) => prev.filter((q) => q.id !== item.id));
      }
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const removeAudio = (index: number) => {
    onAudiosChange(audios.filter((_, i) => i !== index));
  };

  const removeDocument = (index: number) => {
    onDocumentsChange(documents.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "unknown size";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 text-left">
      <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Media Files</span>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
          isDragOver
            ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900/50 scale-[0.99]"
            : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-700 bg-neutral-50/20 dark:bg-neutral-950/20"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={handleFileChange}
          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          className="hidden"
        />
        <UploadCloud className="w-6 h-6 text-neutral-400 dark:text-neutral-600" />
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Drag & Drop assets here
          </p>
          <p className="text-[10px] text-neutral-400">
            Supports Images, Audio memos, Documents (max 10MB)
          </p>
        </div>
      </div>

      {/* Uploading Queue Progress Indicators */}
      <AnimatePresence>
        {uploadQueue.length > 0 && (
          <div className="space-y-2">
            {uploadQueue.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 rounded-xl text-xs space-y-2"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span className="truncate max-w-[70%]">{item.name}</span>
                  <span>{item.progress}%</span>
                </div>
                {/* Progress bar line */}
                <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-neutral-900 dark:bg-white"
                    animate={{ width: `${item.progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Uploaded File Previews */}
      <div className="space-y-3.5">
        
        {/* Images Grid */}
        {images.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase font-mono tracking-wider text-neutral-400">Images ({images.length})</div>
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <div
                  key={img.publicId}
                  className="relative aspect-square bg-neutral-50 dark:bg-neutral-900 rounded-xl overflow-hidden border border-neutral-100 dark:border-neutral-800 group"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer outline-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audios List */}
        {audios.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase font-mono tracking-wider text-neutral-400">Audio Files ({audios.length})</div>
            <div className="space-y-2">
              {audios.map((aud, i) => (
                <div
                  key={aud.publicId}
                  className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-900 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2 truncate max-w-[80%]">
                    <Mic className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="truncate font-medium">{aud.name}</span>
                    <span className="text-[9.5px] font-mono text-neutral-400 shrink-0">({formatFileSize(aud.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAudio(i)}
                    className="text-neutral-400 hover:text-red-500 p-0.5 rounded-full cursor-pointer outline-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase font-mono tracking-wider text-neutral-400">Documents ({documents.length})</div>
            <div className="space-y-2">
              {documents.map((doc, i) => (
                <div
                  key={doc.publicId}
                  className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-900 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2 truncate max-w-[80%]">
                    <FileText className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span className="truncate font-medium">{doc.name}</span>
                    <span className="text-[9.5px] font-mono text-neutral-400 shrink-0">({formatFileSize(doc.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDocument(i)}
                    className="text-neutral-400 hover:text-red-500 p-0.5 rounded-full cursor-pointer outline-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
