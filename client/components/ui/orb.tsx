"use client";

import { useEffect, useRef } from "react";

interface OrbProps {
  /** Whether the AI assistant is currently speaking */
  isSpeaking?: boolean;
  /** Whether a call is actively running */
  isActive?: boolean;
}

const GREEN = "#1A5D3B";
const GREEN_LIGHT = "#2d8a5e";

export default function Orb({ isSpeaking = false, isActive = true }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ isSpeaking, isActive });
  stateRef.current = { isSpeaking, isActive };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let width = 0;
    let height = 0;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    let scale = 1;
    let targetScale = 1;
    let glowOpacity = 0.15;
    let targetGlow = 0.15;
    let time = 0;
    let rafId: number;

    function draw() {
      rafId = requestAnimationFrame(draw);
      if (!ctx) return;
      time += 0.016;

      const { isSpeaking: speaking, isActive: active } = stateRef.current;

      if (speaking) {
        const pulse = Math.sin(time * 5) * 0.08 + Math.sin(time * 7.3) * 0.04;
        targetScale = 1.0 + pulse + 0.06;
        targetGlow = 0.35 + Math.sin(time * 4) * 0.1;
      } else if (active) {
        targetScale = 1.0 + Math.sin(time * 1.8) * 0.03;
        targetGlow = 0.18 + Math.sin(time * 1.5) * 0.05;
      } else {
        targetScale = 1.0;
        targetGlow = 0.12;
      }

      scale += (targetScale - scale) * 0.1;
      glowOpacity += (targetGlow - glowOpacity) * 0.1;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.28;
      const r = baseRadius * scale;

      const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.6);
      glow.addColorStop(0, `rgba(26, 93, 59, ${glowOpacity})`);
      glow.addColorStop(0.5, `rgba(45, 138, 94, ${glowOpacity * 0.4})`);
      glow.addColorStop(1, "rgba(45, 138, 94, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const gradient = ctx.createRadialGradient(
        cx - r * 0.25,
        cy - r * 0.25,
        r * 0.1,
        cx,
        cy,
        r,
      );
      gradient.addColorStop(0, GREEN_LIGHT);
      gradient.addColorStop(0.7, GREEN);
      gradient.addColorStop(1, "#134a2e");

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      const highlight = ctx.createRadialGradient(
        cx - r * 0.2,
        cy - r * 0.3,
        r * 0.05,
        cx - r * 0.1,
        cy - r * 0.15,
        r * 0.6,
      );
      highlight.addColorStop(0, "rgba(255, 255, 255, 0.18)");
      highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = highlight;
      ctx.fill();
    }

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      aria-hidden
      style={{ display: "block" }}
    />
  );
}
