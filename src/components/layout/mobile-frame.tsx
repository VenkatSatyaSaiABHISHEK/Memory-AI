"use client";

import React from "react";

export function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 md:p-4 selection:bg-neutral-200 dark:selection:bg-neutral-800 transition-colors duration-300">
      {/* simulated mobile device frame on desktop, full screen on mobile */}
      <div className="relative w-full max-w-md h-[100dvh] md:h-[850px] md:max-h-[92vh] bg-background text-foreground md:rounded-[40px] md:border md:border-neutral-200 dark:md:border-neutral-800 md:shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
        {/* top notch / status bar simulator for desktop */}
        <div className="hidden md:flex absolute top-0 left-0 right-0 h-8 bg-background z-50 items-center justify-between px-8 text-[11px] font-medium tracking-tight text-neutral-400 select-none pointer-events-none">
          <span>9:41</span>
          <div className="w-24 h-4 bg-neutral-900 dark:bg-neutral-800 rounded-b-xl absolute left-1/2 transform -translate-x-1/2 top-0" />
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.17 19.58 10.53 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
            </svg>
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M17 5H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-1 16H4V9h12v12zm4-12v8h2v-8h-2z" />
            </svg>
          </div>
        </div>

        {/* content container */}
        <div className="flex-1 flex flex-col overflow-y-auto md:pt-8 relative select-none">
          {children}
        </div>
      </div>
    </div>
  );
}
