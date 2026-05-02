import React, { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * BackgroundDots — canvas-based dot grid.
 * Single RAF loop, zero DOM nodes per dot, true 60fps.
 * Scroll parallax via a single GSAP proxy value.
 */
const COLS = 16;
const ROWS = 9;

const BackgroundDots = () => {
  const canvasRef = useRef(null);
  const scrollY   = useRef(0);

  // Scroll parallax — GSAP drives a single number, canvas reads it
  useGSAP(() => {
    const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (REDUCED) return;

    const proxy = { y: 0 };
    gsap.to(proxy, {
      y: -120,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 2,
        onUpdate: () => { scrollY.current = proxy.y; },
      },
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf;
    let dots = [];

    const resize = () => {
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = window.innerWidth  + "px";
      canvas.style.height = window.innerHeight + "px";
      buildDots();
    };

    const buildDots = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      dots = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          dots.push({
            bx: (c / (COLS - 1)) * w,          // base x
            by: (r / (ROWS - 1)) * h,          // base y
            phase: Math.random() * Math.PI * 2, // float phase offset
            speed: 0.3 + Math.random() * 0.4,  // float speed
            amp:   REDUCED ? 0 : 4 + Math.random() * 8, // float amplitude
            r:     1.5,
            baseOpacity: 0.08 + Math.random() * 0.07,
          });
        }
      }
    };

    const draw = (t) => {
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const sy = scrollY.current * dpr;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#141413"; // ink black — canvas 2D doesn't support oklch()

      const ts = t * 0.001;
      for (const d of dots) {
        const x = d.bx * dpr + Math.sin(ts * d.speed + d.phase) * d.amp * dpr;
        const y = d.by * dpr + sy + Math.cos(ts * d.speed * 0.7 + d.phase) * d.amp * dpr;

        // pulse opacity
        const op = d.baseOpacity + Math.sin(ts * d.speed + d.phase) * 0.04;
        ctx.globalAlpha = Math.max(0, Math.min(1, op));

        ctx.beginPath();
        ctx.arc(x, y, d.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
};

export default BackgroundDots;
