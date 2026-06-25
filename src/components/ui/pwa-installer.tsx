"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share } from "lucide-react";

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detect if running standalone (already installed)
    const checkStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    
    setIsStandalone(checkStandalone);

    if (checkStandalone) return;

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const detectIOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(detectIOS);

    // 3. Listen for Chromium installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user dismissed it recently (within 7 days)
      const dismissedTime = localStorage.getItem("memory_ai_pwa_dismissed");
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (dismissedTime && Date.now() - Number(dismissedTime) < oneWeek) {
        return;
      }

      // Show popup after a delay
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. iOS Safari Prompt trigger
    if (detectIOS) {
      const dismissedTime = localStorage.getItem("memory_ai_pwa_dismissed");
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (!dismissedTime || Date.now() - Number(dismissedTime) > oneWeek) {
        const timer = setTimeout(() => {
          setShowPopup(true);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    setShowPopup(false);
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installer action choice: ${outcome}`);
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPopup(false);
    localStorage.setItem("memory_ai_pwa_dismissed", String(Date.now()));
  };

  if (isStandalone || !showPopup) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 select-none">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border border-neutral-900 dark:border-neutral-200 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 relative overflow-hidden"
        >
          {/* Close trigger */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-white/10 dark:hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-white dark:text-neutral-500 dark:hover:text-neutral-950 transition-colors cursor-pointer outline-none"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-800 dark:border-neutral-200">
              <span className="font-mono text-xs font-bold tracking-tight">🧠</span>
            </div>
            <div className="space-y-0.5 pr-4">
              <h3 className="text-xs font-bold tracking-tight">Install Memory AI</h3>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
                Add to your home screen for quick offline access to your mind logs.
              </p>
            </div>
          </div>

          <div className="h-px bg-neutral-900 dark:bg-neutral-100" />

          {isIOS ? (
            <div className="flex items-center gap-2 text-[10px] text-neutral-400 dark:text-neutral-550 leading-relaxed text-left font-mono">
              <Share className="w-3.5 h-3.5 text-blue-500 shrink-0 animate-bounce" />
              <span>
                Tap <strong className="text-white dark:text-black">Share</strong> then select <strong className="text-white dark:text-black">"Add to Home Screen"</strong>.
              </span>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full h-9 bg-white dark:bg-neutral-950 text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer outline-none border border-transparent dark:border-neutral-850"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Web App</span>
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
