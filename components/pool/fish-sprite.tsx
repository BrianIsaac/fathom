'use client';

import { useState, useLayoutEffect, useRef, useCallback } from 'react';
import type { Agent } from '@/lib/agents/types';
import { FishTooltip } from './fish-tooltip';

function seedRandom(id: string) {
  const hash = Array.from(id).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  return Math.abs(hash);
}

export function FishSpriteComponent({ agent, bowlWidth, bowlHeight }: {
  agent: Agent;
  bowlWidth: number;
  bowlHeight: number;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const hoveredRef = useRef(false);
  const disabled = !agent.enabled;

  const PADDING = 60;
  const FISH_W = 80;
  const FISH_H = 48;

  // Store mutable animation state entirely in a ref — no React state updates in the loop
  const state = useRef({
    x: 0, y: 0, vx: 0, vy: 0,
    targetVx: 0, targetVy: 0, changeTimer: 0,
    flipped: false, angle: 0, displayAngle: 0,
  });

  // Keep bowl dimensions in a ref so the rAF loop reads current values
  // without needing to restart
  const boundsRef = useRef({ w: bowlWidth, h: bowlHeight });
  boundsRef.current = { w: bowlWidth, h: bowlHeight };

  const onEnter = useCallback(() => { hoveredRef.current = true; setShowTooltip(true); }, []);
  const onLeave = useCallback(() => { hoveredRef.current = false; setShowTooltip(false); }, []);

  useLayoutEffect(() => {
    const seed = seedRandom(agent.id);
    const maxX = Math.max(bowlWidth - FISH_W - PADDING, 100);
    const maxY = Math.max(bowlHeight - FISH_H - PADDING, 100);

    const s = state.current;
    s.x = PADDING + (seed % maxX);
    s.y = PADDING + ((seed * 7) % maxY);
    s.vx = (seed % 2 === 0 ? 1 : -1) * (0.1 + (seed % 10) / 40);
    s.vy = (seed % 3 === 0 ? 1 : -1) * (0.05 + (seed % 8) / 60);
    s.targetVx = 0;
    s.targetVy = 0;
    s.changeTimer = 0;

    // Apply initial position via DOM
    if (containerRef.current) {
      containerRef.current.style.transform = `translate(${s.x}px, ${s.y}px)`;
    }

    const speed = disabled ? 0.08 : 0.2 + (seed % 5) / 20;
    const smoothing = disabled ? 0.01 : 0.02;

    const tick = () => {
      const p = state.current;
      const bw = boundsRef.current.w;
      const bh = boundsRef.current.h;

      if (!hoveredRef.current) {
        p.changeTimer--;
        if (p.changeTimer <= 0) {
          const centreX = bw / 2;
          const centreY = bh / 2;
          const dx = centreX - p.x;
          const dy = centreY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const centreBias = Math.min(dist / 400, 0.3);

          const a = Math.random() * Math.PI * 2;
          const rawVx = Math.cos(a) * speed;
          const rawVy = Math.sin(a) * speed * 0.6;

          p.targetVx = rawVx * (1 - centreBias) + (dx / dist) * speed * centreBias;
          p.targetVy = rawVy * (1 - centreBias) + (dy / dist) * speed * 0.6 * centreBias;

          p.changeTimer = 200 + Math.floor(Math.random() * 250);
        }

        p.vx += (p.targetVx - p.vx) * smoothing;
        p.vy += (p.targetVy - p.vy) * smoothing;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < PADDING) { p.x = PADDING; p.targetVx = Math.abs(p.targetVx) * 0.8 + 0.05; p.vx *= -0.3; }
        if (p.x > bw - FISH_W - PADDING) { p.x = bw - FISH_W - PADDING; p.targetVx = -Math.abs(p.targetVx) * 0.8 - 0.05; p.vx *= -0.3; }
        if (p.y < PADDING) { p.y = PADDING; p.targetVy = Math.abs(p.targetVy) * 0.8 + 0.03; p.vy *= -0.3; }
        if (p.y > bh - FISH_H - PADDING) { p.y = bh - FISH_H - PADDING; p.targetVy = -Math.abs(p.targetVy) * 0.8 - 0.03; p.vy *= -0.3; }

        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > 0.03) {
          p.flipped = p.vx < 0;
          p.angle = p.flipped
            ? -Math.atan2(p.vy, -p.vx) * (180 / Math.PI)
            : Math.atan2(p.vy, p.vx) * (180 / Math.PI);
        }

        // Smooth the display angle toward the target angle in JS
        // (replaces the CSS transition which fought 60fps DOM writes)
        p.displayAngle += (p.angle - p.displayAngle) * 0.08;

        if (containerRef.current) {
          containerRef.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
        }
        if (innerRef.current) {
          innerRef.current.style.transform = `${p.flipped ? 'scaleX(-1) ' : ''}rotate(${p.displayAngle}deg)`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [agent.id, disabled]); // bowlWidth/bowlHeight removed — read from boundsRef

  // Tooltip position read from the mutable ref, only recalculated when tooltip is shown
  const tooltipPos = state.current;

  return (
    <>
      <div
        ref={containerRef}
        className="absolute cursor-pointer"
        style={{
          opacity: disabled ? 0.35 : 1,
          filter: disabled ? 'grayscale(1)' : 'none',
          transition: 'opacity 0.3s, filter 0.3s',
          zIndex: showTooltip ? 50 : 10,
        }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <div ref={innerRef}>
          <div dangerouslySetInnerHTML={{ __html: agent.fish_sprite }} />
        </div>
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/90 dark:text-white/70 whitespace-nowrap pointer-events-none" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          {agent.name}
        </span>
      </div>
      {showTooltip && (() => {
        const TOOLTIP_W = 264;
        const TOOLTIP_H = 170;
        const flipBelow = tooltipPos.y < TOOLTIP_H + 20;
        const clampedX = Math.max(8, Math.min(tooltipPos.x, bowlWidth - TOOLTIP_W - 8));
        return (
          <div
            className="absolute pointer-events-none"
            style={{ left: clampedX, top: tooltipPos.y - 8, zIndex: 100 }}
          >
            <FishTooltip agent={agent} flipBelow={flipBelow} />
          </div>
        );
      })()}
    </>
  );
}
