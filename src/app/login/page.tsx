"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/auth-context";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function LoginPage() {
  const { user, loginWithGoogle, isDemoMode } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed", error);
      alert("Sign in failed. Make sure your browser allows popups and Firebase is correctly configured.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col justify-between p-8 bg-background relative overflow-hidden select-none">
        
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none -z-10" />

        {/* Top Back/Branding */}
        <div className="pt-4 flex justify-between items-center">
          <button 
            onClick={() => router.push("/")}
            className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors outline-none"
          >
            ← Back
          </button>
          {isDemoMode && (
            <span className="flex items-center gap-1 text-[9px] font-semibold tracking-wider uppercase font-mono bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded-full">
              <Sparkles className="w-2.5 h-2.5" /> Demo Mode
            </span>
          )}
        </div>

        {/* Circular Avatar / Neural Node in Center */}
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 1.2 }}
            className="relative w-36 h-36 rounded-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-900"
          >
            {/* Pulsing ring */}
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full border border-neutral-200 dark:border-neutral-800"
            />
            
            {/* Core Circular Avatar Node */}
            <motion.div 
              animate={{
                rotate: 360
              }}
              transition={{
                repeat: Infinity,
                duration: 25,
                ease: "linear"
              }}
              className="absolute inset-2 rounded-full border border-dashed border-neutral-300 dark:border-neutral-700"
            />
            
            {/* Center Profile Icon / Node Graphic */}
            <div className="z-10 w-20 h-20 rounded-full bg-neutral-950 dark:bg-white flex items-center justify-center shadow-lg">
              <span className="font-mono text-xl font-bold text-white dark:text-neutral-950">M</span>
            </div>

            {/* Micro AI Sparkle Nodes */}
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute -top-1 right-4 w-3.5 h-3.5 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center border border-neutral-300 dark:border-neutral-700"
            >
              <Sparkles className="w-2 h-2 text-neutral-500" />
            </motion.div>
          </motion.div>

          <div className="mt-8 text-center max-w-xs space-y-2">
            <h2 className="text-xl font-semibold text-neutral-950 dark:text-white tracking-tight">
              Initialize Your Memory Space
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Sign in to sync your AI mind, store transcripts, and enable neural semantic memory retrieval.
            </p>
          </div>
        </div>

        {/* Login Action / Google Button at bottom */}
        <div className="pb-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-neutral-950 hover:bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-3 border border-neutral-800/10 dark:border-neutral-200 transition-all duration-300 relative overflow-hidden"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border border-transparent border-t-current animate-spin" />
              ) : (
                <>
                  <GoogleIcon />
                  <span>Login with Google</span>
                </>
              )}
            </Button>
          </motion.div>

          {isDemoMode && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 font-mono text-center"
            >
              <AlertCircle className="w-3.5 h-3.5 text-neutral-400" />
              <span>Clicking uses temporary credentials</span>
            </motion.div>
          )}

          <p className="text-[9px] text-center text-neutral-400 dark:text-neutral-600 font-mono">
            By signing in, you agree to our end-to-end security compliance guidelines.
          </p>
        </div>

      </div>
    </MobileFrame>
  );
}
