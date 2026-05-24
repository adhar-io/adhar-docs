import React, { useEffect, useRef } from "react";

interface FuturisticBackgroundProps {
  mousePosition: { x: number; y: number };
}

/**
 * Futuristic animated background:
 *  - Perspective grid floor
 *  - Animated scanlines
 *  - Drifting particles on canvas
 *  - Subtle parallax driven by mouse position
 */
const FuturisticBackground: React.FC<FuturisticBackgroundProps> = ({ mousePosition }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Parallax — translate layers based on mouse position
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const nx = (mousePosition.x / w - 0.5) * 2; // -1..1
    const ny = (mousePosition.y / h - 0.5) * 2;

    if (gridRef.current) {
      gridRef.current.style.transform = `perspective(900px) rotateX(60deg) translate3d(${nx * -14}px, ${ny * -10}px, 0)`;
    }
    if (scanRef.current) {
      scanRef.current.style.transform = `translate3d(${nx * 6}px, ${ny * 6}px, 0)`;
    }
    if (glowRef.current) {
      glowRef.current.style.transform = `translate3d(${nx * 24}px, ${ny * 24}px, 0)`;
    }
  }, [mousePosition]);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 0.4,
      a: Math.random() * 0.5 + 0.2,
      hue: Math.random() > 0.5 ? 217 : 262, // primary / accent
    }));

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // connect lines
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14000) {
            const alpha = (1 - d2 / 14000) * 0.18;
            ctx.strokeStyle = `hsla(${p.hue}, 91%, 60%, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = `hsla(${p.hue}, 91%, 65%, ${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Ambient glow */}
      <div
        ref={glowRef}
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] rounded-full blur-3xl opacity-40 transition-transform duration-300 ease-out"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.25), hsl(var(--accent) / 0.15) 40%, transparent 70%)",
        }}
      />

      {/* Perspective grid */}
      <div
        className="absolute inset-x-0 bottom-0 h-[70%] origin-bottom transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{
          maskImage: "linear-gradient(to top, black 30%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to top, black 30%, transparent 95%)",
        }}
      >
        <div
          ref={gridRef}
          className="absolute inset-0 will-change-transform"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary) / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.25) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            animation: "grid-pan 14s linear infinite",
            transform: "perspective(900px) rotateX(60deg)",
          }}
        />
      </div>

      {/* Scanlines */}
      <div
        ref={scanRef}
        className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12] mix-blend-overlay transition-transform duration-500 ease-out"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, hsl(var(--foreground)) 0 1px, transparent 1px 4px)",
        }}
      />

      {/* Moving scan beam */}
      <div
        className="absolute inset-x-0 h-40 opacity-30"
        style={{
          background:
            "linear-gradient(180deg, transparent, hsl(var(--primary) / 0.25), transparent)",
          animation: "scan-beam 7s ease-in-out infinite",
        }}
      />

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <style>{`
        @keyframes grid-pan {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 0 60px, 60px 0; }
        }
        @keyframes scan-beam {
          0% { transform: translateY(-20%); opacity: 0; }
          10% { opacity: 0.6; }
          50% { opacity: 0.4; }
          100% { transform: translateY(120vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default FuturisticBackground;
