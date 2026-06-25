"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { SidebarMenu } from "@/components/layout/sidebar-menu";
import { useAuth } from "@/context/auth-context";
import { motion } from "framer-motion";
import { User, Shield, LogOut, CheckCircle, Bell, Database, Lock, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user, logout, isDemoMode, updateUserPhoto } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Toggles state
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [dailySummaries, setDailySummaries] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);

  const handleAvatarChange = async (url: string) => {
    try {
      await updateUserPhoto(url);
    } catch (e) {
      console.error(e);
      alert("Failed to update avatar photo.");
    }
  };

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      try {
        setLoading(true);
        await logout();
      } catch (error) {
        console.error("Sign out failed", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const initial = user?.displayName ? user.displayName.charAt(0) : "M";

  return (
    <ProtectedRoute>
      <MobileFrame>
        <div className="flex-1 flex flex-col bg-background pb-6 select-none">
          
          {/* Header */}
          <div className="h-16 px-6 border-b border-neutral-100 dark:border-neutral-900 flex items-center justify-between sticky top-0 bg-background/90 dark:bg-neutral-950/90 backdrop-blur-md z-30">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="w-8 h-8 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer outline-none">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="font-mono text-xs uppercase tracking-wider font-semibold text-neutral-800 dark:text-neutral-200">
                User Profile
              </span>
            </div>
            <div className="w-9 h-9 flex items-center justify-center text-neutral-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>

          {/* Body Container */}
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
            
            {/* User Profile Card Center */}
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="relative"
              >
                <Avatar className="h-20 w-20 border-2 border-neutral-100 dark:border-neutral-900 shadow-md">
                  <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                  <AvatarFallback className="bg-neutral-150 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-semibold text-2xl">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border border-white dark:border-black flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              </motion.div>

              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-neutral-950 dark:text-white tracking-tight">
                  {user?.displayName || "Demo User"}
                </h2>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                  {user?.email || "demo.user@memoryai.com"}
                </p>
              </div>

              {isDemoMode && (
                <span className="text-[9px] font-semibold tracking-wider uppercase font-mono bg-neutral-50 dark:bg-neutral-900/60 text-neutral-400 dark:text-neutral-500 border border-neutral-100 dark:border-neutral-900/80 px-2.5 py-0.5 rounded-full">
                  Mock Session
                </span>
              )}

              {/* Avatar Selector Panel */}
              <div className="flex flex-col items-center justify-center space-y-2 pt-2 animate-in fade-in duration-300">
                <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400">
                  Select Profile Avatar
                </span>
                <div className="flex items-center gap-2">
                  {[
                    "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-6.webp",
                    "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-4.webp",
                    "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-3.webp",
                    "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-25.webp",
                    "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/avatar/avatar-8.webp"
                  ].map((avUrl, index) => {
                    const isSelected = user?.photoURL === avUrl;
                    return (
                      <motion.button
                        key={avUrl}
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAvatarChange(avUrl)}
                        className={`relative w-9 h-9 rounded-full overflow-hidden border-2 cursor-pointer transition-all duration-200 outline-none ${
                          isSelected 
                            ? "border-neutral-950 dark:border-white scale-105 shadow-sm" 
                            : "border-transparent hover:border-neutral-200 dark:hover:border-neutral-800"
                        }`}
                      >
                        <img src={avUrl} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover select-none pointer-events-none" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Profile Preferences */}
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono">
                AI Preferences
              </div>
              
              <Card className="p-1 border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl premium-shadow-sm shadow-none divide-y divide-neutral-50 dark:divide-neutral-900/50">
                
                {/* Preference Item 1 */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center text-neutral-500">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Cloud Sync</span>
                      <span className="text-[10px] text-neutral-400">Sync memories with cloud backup</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSyncEnabled(!syncEnabled)}
                    className={`w-9 h-5 rounded-full transition-colors relative outline-none cursor-pointer ${
                      syncEnabled ? "bg-neutral-950 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
                    }`}
                  >
                    <motion.div 
                      layout
                      className="w-3.5 h-3.5 rounded-full bg-white dark:bg-black absolute top-0.75 left-0.75"
                      animate={{ x: syncEnabled ? 16 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                {/* Preference Item 2 */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center text-neutral-500">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Daily Summaries</span>
                      <span className="text-[10px] text-neutral-400">Daily AI memory recap prompt</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setDailySummaries(!dailySummaries)}
                    className={`w-9 h-5 rounded-full transition-colors relative outline-none cursor-pointer ${
                      dailySummaries ? "bg-neutral-950 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
                    }`}
                  >
                    <motion.div 
                      layout
                      className="w-3.5 h-3.5 rounded-full bg-white dark:bg-black absolute top-0.75 left-0.75"
                      animate={{ x: dailySummaries ? 16 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                {/* Preference Item 3 */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Local Encryption</span>
                      <span className="text-[10px] text-neutral-400">Secure AES encryption local logs</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                    className={`w-9 h-5 rounded-full transition-colors relative outline-none cursor-pointer ${
                      encryptionEnabled ? "bg-neutral-950 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
                    }`}
                  >
                    <motion.div 
                      layout
                      className="w-3.5 h-3.5 rounded-full bg-white dark:bg-black absolute top-0.75 left-0.75"
                      animate={{ x: encryptionEnabled ? 16 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

              </Card>
            </div>

            {/* App Onboarding Guide Reset */}
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono">
                App Tour & Guide
              </div>
              <Card className="p-4 border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-950 rounded-2xl shadow-none flex items-center justify-between text-left">
                <div className="flex flex-col space-y-0.5">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Onboarding Tutorial</span>
                  <span className="text-[10px] text-neutral-400">Replay the welcoming walkthrough tour</span>
                </div>
                <Button 
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("memory_ai_onboarding_completed");
                    alert("Walkthrough reset! Navigating back to dashboard will launch the tour.");
                  }}
                  variant="outline"
                  className="h-8 px-3 rounded-xl text-[10px] uppercase font-mono tracking-wider font-semibold border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors shadow-none cursor-pointer"
                >
                  Restart Tour
                </Button>
              </Card>
            </div>


            {/* Profile Action Sign Out */}
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={handleSignOut}
                disabled={loading}
                className="w-full h-12 rounded-2xl border border-red-200/50 hover:bg-red-50 text-red-600 dark:border-red-950/30 dark:hover:bg-red-950/20 dark:text-red-400 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:border-transparent transition-all duration-300 shadow-none outline-none cursor-pointer"
              >
                {loading ? (
                  <div className="h-4 w-4 rounded-full border border-transparent border-t-current animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out Account</span>
                  </>
                )}
              </Button>
            </div>

          </div>

        </div>
      </MobileFrame>
    </ProtectedRoute>
  );
}
