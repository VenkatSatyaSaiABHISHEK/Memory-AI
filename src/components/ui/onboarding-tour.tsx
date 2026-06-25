"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X } from "lucide-react";

interface OnboardingTourProps {
  onComplete: () => void;
}

interface TourStep {
  title: string;
  content: string;
  selector?: string;
  fallbackX: string;
  fallbackY: string;
  fallbackRadius: string;
  tooltipPos: "top" | "bottom" | "center";
}

const steps: TourStep[] = [
  {
    title: "Welcome to Mind Space",
    content: "This is your personal cognitive database. Let's show you around in a few quick steps!",
    fallbackX: "50%",
    fallbackY: "50%",
    fallbackRadius: "0px",
    tooltipPos: "center"
  },
  {
    title: "AI Intelligence Hub",
    content: "Tap the brain icon at the top right to open the AI Hub. Generate daily digests, look up memories conceptually via Semantic Search, or extract mood observations and personalized coaching recommendations.",
    selector: '[title="AI Hub"]',
    fallbackX: "82%",
    fallbackY: "32px",
    fallbackRadius: "24px",
    tooltipPos: "bottom"
  },
  {
    title: "Navigation Tabs",
    content: "Switch between the 'Logs Feed' tab to browse chronological memory cards, and the 'Analytics' tab to view calendar highlights and widget summaries.",
    selector: '[data-tour="tabs"]',
    fallbackX: "50%",
    fallbackY: "74px",
    fallbackRadius: "70px",
    tooltipPos: "bottom"
  },
  {
    title: "Recall Search & Filters",
    content: "Use search to recall memories instantly, scroll the horizontal slider to filter by tags, or tap the favorites heart filter to view starred notes.",
    selector: '[data-tour="search"]',
    fallbackX: "50%",
    fallbackY: "210px",
    fallbackRadius: "140px",
    tooltipPos: "bottom"
  },
  {
    title: "Capture Memories",
    content: "Tap the floating plus button to log new events. You can write rich text, upload multiple images/documents, record voice logs, and use Groq AI to auto-fill metadata.",
    selector: '[data-tour="add-button"]',
    fallbackX: "86%",
    fallbackY: "91.5%",
    fallbackRadius: "32px",
    tooltipPos: "top"
  }
];

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState({ x: "50%", y: "50%", radius: "0px" });

  const step = steps[currentStep];

  useEffect(() => {
    let active = true;

    const updateCoords = () => {
      if (!active) return;

      if (!step.selector) {
        setSpotlight({ x: "50%", y: "50%", radius: "0px" });
        return;
      }

      const element = document.querySelector(step.selector);
      const container = document.getElementById("tour-container");

      if (element && container) {
        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Skip calculations if element is hidden or has 0 size
        if (rect.width === 0 || rect.height === 0) {
          return;
        }

        const centerX = rect.left - containerRect.left + rect.width / 2;
        const centerY = rect.top - containerRect.top + rect.height / 2;

        const maxDim = Math.max(rect.width, rect.height);
        // Add specific highlights padding depending on targets
        const padding = step.selector === '[data-tour="tabs"]' ? 10 : 8;
        const radius = maxDim / 2 + padding;

        setSpotlight({
          x: `${centerX}px`,
          y: `${centerY}px`,
          radius: `${radius}px`
        });
      } else {
        // Fallback coordinates if element is missing or not yet in DOM
        setSpotlight({
          x: step.fallbackX,
          y: step.fallbackY,
          radius: step.fallbackRadius
        });
      }
    };

    // Run layout calculator immediately
    updateCoords();

    // Poll coords every 100ms to adjust on dynamic loads/hydration
    const interval = setInterval(updateCoords, 100);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  // See-through backdrop styling
  const maskBackground = spotlight.radius === "0px"
    ? "rgba(0, 0, 0, 0.75)"
    : `radial-gradient(circle at ${spotlight.x} ${spotlight.y}, transparent ${spotlight.radius}, rgba(0, 0, 0, 0.75) ${spotlight.radius})`;

  return (
    <div 
      id="tour-container" 
      className="absolute inset-0 z-50 flex flex-col justify-between select-none overflow-hidden transition-all duration-300"
    >
      
      {/* See-through Backdrop mask */}
      <motion.div
        className="absolute inset-0 transition-all duration-300 pointer-events-none"
        style={{ background: maskBackground }}
        layoutId="spotlightBackdrop"
      />

      {/* Intercept pointer events to prevent clicking background actions */}
      <div className="absolute inset-0 bg-transparent z-10" />

      {/* Floating Tooltip Container */}
      <div className="absolute inset-x-6 z-20 flex flex-col items-center justify-center h-full pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className={`w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 text-left shadow-2xl pointer-events-auto flex flex-col gap-4 absolute ${
              step.tooltipPos === "center" ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" :
              step.tooltipPos === "top" ? "bottom-24" :
              "top-28"
            }`}
            style={step.tooltipPos === "center" ? { transform: "translate(-50%, -50%)" } : undefined}
          >
            {/* Header / Step indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-neutral-850 dark:text-white">
                <Sparkles className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                <span className="font-mono text-[9px] uppercase tracking-widest font-bold">
                  Guide Tour • Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <button
                onClick={onComplete}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors cursor-pointer outline-none"
                title="Skip Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                {step.title}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-normal">
                {step.content}
              </p>
            </div>

            {/* Actions button */}
            <div className="flex items-center justify-between border-t border-neutral-50 dark:border-neutral-800/60 pt-3 mt-1">
              <button
                onClick={onComplete}
                className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:underline cursor-pointer outline-none"
              >
                Skip
              </button>
              
              <button
                onClick={handleNext}
                className="flex items-center gap-1 text-[10px] uppercase font-mono tracking-wider font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-3.5 py-2 rounded-xl hover:scale-95 transition-all outline-none cursor-pointer"
              >
                <span>{currentStep === steps.length - 1 ? "Finish" : "Next"}</span>
                {currentStep < steps.length - 1 && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
