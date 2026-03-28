'use client';

import type { ReactNode } from 'react';

/**
 * Fishbowl container with water gradient, wave animation, and bubble particles.
 */
export function FishBowl({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border" style={{ minHeight: 'min(420px, 60vh)' }}>
      {/* Water gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-cyan-200 to-blue-400 dark:from-sky-950 dark:via-cyan-900 dark:to-blue-950" />

      {/* Wave animation at top */}
      <div className="absolute top-0 left-0 right-0 h-8 overflow-hidden">
        <svg className="absolute w-[200%] h-8 animate-wave" viewBox="0 0 1440 32" preserveAspectRatio="none">
          <path
            d="M0,16 C120,4 240,28 360,16 C480,4 600,28 720,16 C840,4 960,28 1080,16 C1200,4 1320,28 1440,16 L1440,0 L0,0 Z"
            className="fill-background"
          />
        </svg>
      </div>

      {/* Bubble particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20 dark:bg-white/10 animate-bubble"
            style={{
              width: 4 + (i % 3) * 3,
              height: 4 + (i % 3) * 3,
              left: `${12 + i * 14}%`,
              bottom: -10,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${6 + i * 0.8}s`,
            }}
          />
        ))}
      </div>

      {/* Sand/floor */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-amber-200/40 to-transparent dark:from-amber-900/30" />

      {/* Fish swim area */}
      <div className="relative z-10 w-full" style={{ minHeight: 'min(420px, 60vh)' }}>
        {children}
      </div>
    </div>
  );
}
