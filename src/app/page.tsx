"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { useAuth } from "@/context/auth-context";
import { ArrowRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleStart = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col justify-between p-8 bg-background relative overflow-hidden select-none">
        
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none -z-10" />

        {/* Header Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex items-center justify-between pt-4"
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-neutral-950 dark:bg-white flex items-center justify-center">
              <Brain className="w-4 h-4 text-white dark:text-neutral-950" />
            </div>
            <span className="font-mono text-xs tracking-wider uppercase font-semibold text-neutral-800 dark:text-neutral-200">
              Memory AI
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">v1.0</span>
        </motion.div>

        {/* Center Sphere/Neural Node Visual */}
        <div className="flex-1 flex items-center justify-center my-6 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Ambient blur */}
            <motion.div
              animate={{
                scale: [0.9, 1.1, 0.9],
                opacity: [0.15, 0.25, 0.15]
              }}
              transition={{
                repeat: Infinity,
                duration: 6,
                ease: "easeInOut"
              }}
              className="w-56 h-56 rounded-full bg-neutral-400 dark:bg-neutral-600 blur-3xl"
            />
          </div>

          {/* Interactive animated orb */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 1.2, type: "spring" }}
            className="relative flex items-center justify-center w-40 h-40 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/20 dark:bg-black/20 backdrop-blur-sm premium-glow-animation"
          >
            {/* Nested concentric circles */}
            <div className="w-32 h-32 rounded-full border border-neutral-100 dark:border-neutral-900 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-center bg-background/50">
                <Brain className="w-8 h-8 text-neutral-800 dark:text-neutral-200 stroke-[1.25]" />
              </div>
            </div>

            {/* Orbiting particles (decorations) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              className="absolute inset-0 border border-transparent border-t-neutral-300 dark:border-t-neutral-700 rounded-full pointer-events-none"
            />
          </motion.div>
        </div>

        {/* Copywriting and CTA Action */}
        <div className="flex flex-col gap-6 pb-6 animate-fade-in">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="space-y-3"
          >
            <h1 className="text-3xl font-bold tracking-tight text-neutral-950 dark:text-white leading-tight">
              Your premium <br />
              digital mind.
            </h1>
            <p className="text-xs text-neutral-550 dark:text-neutral-400 leading-relaxed font-normal">
              A clean and minimalist space to capture your notes, daily logs, and activities.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="pt-2"
          >
            <Button
              onClick={handleStart}
              className="w-full h-12 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-900 dark:hover:bg-neutral-100 rounded-2xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 shadow-lg dark:shadow-none flex items-center justify-center gap-2 group cursor-pointer outline-none"
            >
              <span>Enter App</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            
            <p className="text-[10px] text-center text-neutral-400 dark:text-neutral-600 mt-4 font-mono">
              Designed for speed and simplicity. Privacy guaranteed.
            </p>
          </motion.div>
        </div>

      </div>
    </MobileFrame>
  );
}
