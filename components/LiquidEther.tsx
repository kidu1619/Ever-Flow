"use client";

import React, { useEffect, useRef } from "react";

interface LiquidEtherProps {
  className?: string;
  colors?: string[];
  opacity?: number;
  interactive?: boolean;
}

export default function LiquidEther({
  className = "",
  colors = ["#E06B53", "#D97706", "#6366F1", "#3B82F6"],
  opacity = 0.45,
  interactive = true,
}: LiquidEtherProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Liquid Ether Particle / Blob system
    const blobs = [
      { x: width * 0.25, y: height * 0.3, radius: 240, vx: 0.35, vy: 0.25, color: colors[0] || "#E06B53" },
      { x: width * 0.75, y: height * 0.35, radius: 280, vx: -0.28, vy: 0.3, color: colors[1] || "#D97706" },
      { x: width * 0.5, y: height * 0.7, radius: 260, vx: 0.22, vy: -0.32, color: colors[2] || "#6366F1" },
      { x: width * 0.8, y: height * 0.75, radius: 220, vx: -0.3, vy: -0.22, color: colors[3] || "#3B82F6" },
    ];

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    let time = 0;

    const render = () => {
      time += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Render flowing liquid ether gradient blobs
      blobs.forEach((blob, idx) => {
        // Organic sinusoidal drift
        blob.x += blob.vx + Math.sin(time + idx) * 0.4;
        blob.y += blob.vy + Math.cos(time + idx * 1.5) * 0.4;

        // Bounce within boundaries with soft buffer
        if (blob.x < -blob.radius) blob.x = width + blob.radius;
        if (blob.x > width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = height + blob.radius;
        if (blob.y > height + blob.radius) blob.y = -blob.radius;

        // Subtle mouse attraction
        if (interactive) {
          const dx = mouseX - blob.x;
          const dy = mouseY - blob.y;
          blob.x += dx * 0.002;
          blob.y += dy * 0.002;
        }

        const rad = blob.radius * (1 + Math.sin(time * 1.5 + idx) * 0.08);

        const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, rad);
        gradient.addColorStop(0, hexToRgba(blob.color, opacity * 0.7));
        gradient.addColorStop(0.5, hexToRgba(blob.color, opacity * 0.3));
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, rad, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colors, opacity, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-multiply opacity-80 ${className}`}
      style={{ filter: "blur(48px)" }}
    />
  );
}

function hexToRgba(hex: string, alpha: number) {
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c.split("").map((ch) => ch + ch).join("");
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
