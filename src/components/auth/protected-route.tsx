"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-950 text-white">
        <div className="flex flex-col items-center gap-6">
          {/* Glowing premium spinner node */}
          <div className="relative flex items-center justify-center">
            <motion.div
              className="absolute h-10 w-10 rounded-full border border-white/10"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.4, 0.1],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="h-8 w-8 rounded-full border border-transparent border-t-white border-r-white/40"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            />
          </div>
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.5, y: 0 }}
            className="text-[10px] tracking-[0.25em] uppercase font-mono text-neutral-400"
          >
            Accessing Memory AI
          </motion.p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Prevent flash of protected UI while redirecting
  }

  return <>{children}</>;
}
