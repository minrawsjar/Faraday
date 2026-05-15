"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";

interface CubesProps {
  gridSize?: number;
  maxAngle?: number;
  radius?: number;
  borderStyle?: string;
  faceColor?: string;
  autoAnimate?: boolean;
  rippleOnClick?: boolean;
  rippleColor?: string;
  className?: string;
}

export function Cubes({
  gridSize = 8,
  maxAngle = 40,
  radius = 3,
  borderStyle = "1px solid rgba(6,182,212,0.3)",
  faceColor = "#040d14",
  autoAnimate = true,
  rippleOnClick = true,
  rippleColor = "rgba(6,182,212,0.8)",
  className = "",
}: CubesProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userActiveRef = useRef(false);
  const simPosRef = useRef({ x: 0, y: 0 });
  const simTargetRef = useRef({ x: 0, y: 0 });
  const simRAFRef = useRef<number | null>(null);

  const tiltAt = useCallback(
    (rowCenter: number, colCenter: number) => {
      if (!sceneRef.current) return;
      sceneRef.current.querySelectorAll<HTMLElement>(".cube").forEach((cube) => {
        const r = +cube.dataset.row!;
        const c = +cube.dataset.col!;
        const dist = Math.hypot(r - rowCenter, c - colCenter);
        if (dist <= radius) {
          const pct = 1 - dist / radius;
          const angle = pct * maxAngle;
          gsap.to(cube, { duration: 0.3, ease: "power3.out", overwrite: true, rotateX: -angle, rotateY: angle });
        } else {
          gsap.to(cube, { duration: 0.6, ease: "power3.out", overwrite: true, rotateX: 0, rotateY: 0 });
        }
      });
    },
    [radius, maxAngle]
  );

  const resetAll = useCallback(() => {
    if (!sceneRef.current) return;
    sceneRef.current.querySelectorAll<HTMLElement>(".cube").forEach((cube) =>
      gsap.to(cube, { duration: 0.6, rotateX: 0, rotateY: 0, ease: "power3.out" })
    );
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      userActiveRef.current = true;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      const rect = sceneRef.current!.getBoundingClientRect();
      const colCenter = (e.clientX - rect.left) / (rect.width / gridSize);
      const rowCenter = (e.clientY - rect.top) / (rect.height / gridSize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => tiltAt(rowCenter, colCenter));
      idleTimerRef.current = setTimeout(() => { userActiveRef.current = false; }, 3000);
    },
    [gridSize, tiltAt]
  );

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (!rippleOnClick || !sceneRef.current) return;
      const rect = sceneRef.current.getBoundingClientRect();
      const colHit = Math.floor((e.clientX - rect.left) / (rect.width / gridSize));
      const rowHit = Math.floor((e.clientY - rect.top) / (rect.height / gridSize));
      const rings: Record<number, HTMLElement[]> = {};
      sceneRef.current.querySelectorAll<HTMLElement>(".cube").forEach((cube) => {
        const dist = Math.hypot(+cube.dataset.row! - rowHit, +cube.dataset.col! - colHit);
        const ring = Math.round(dist);
        if (!rings[ring]) rings[ring] = [];
        rings[ring].push(cube);
      });
      Object.keys(rings).map(Number).sort((a, b) => a - b).forEach((ring) => {
        const delay = ring * 0.06;
        const faces = rings[ring].flatMap((c) => Array.from(c.querySelectorAll<HTMLElement>(".cube-face")));
        gsap.to(faces, { backgroundColor: rippleColor, duration: 0.2, delay, ease: "power3.out" });
        gsap.to(faces, { backgroundColor: faceColor, duration: 0.3, delay: delay + 0.5, ease: "power3.out" });
      });
    },
    [rippleOnClick, gridSize, faceColor, rippleColor]
  );

  useEffect(() => {
    if (!autoAnimate || !sceneRef.current) return;
    simPosRef.current = { x: Math.random() * gridSize, y: Math.random() * gridSize };
    simTargetRef.current = { x: Math.random() * gridSize, y: Math.random() * gridSize };
    const loop = () => {
      if (!userActiveRef.current) {
        const pos = simPosRef.current;
        const tgt = simTargetRef.current;
        pos.x += (tgt.x - pos.x) * 0.02;
        pos.y += (tgt.y - pos.y) * 0.02;
        tiltAt(pos.y, pos.x);
        if (Math.hypot(pos.x - tgt.x, pos.y - tgt.y) < 0.1) {
          simTargetRef.current = { x: Math.random() * gridSize, y: Math.random() * gridSize };
        }
      }
      simRAFRef.current = requestAnimationFrame(loop);
    };
    simRAFRef.current = requestAnimationFrame(loop);
    return () => { if (simRAFRef.current) cancelAnimationFrame(simRAFRef.current); };
  }, [autoAnimate, gridSize, tiltAt]);

  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", resetAll);
    el.addEventListener("click", onClick);
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", resetAll);
      el.removeEventListener("click", onClick);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [onPointerMove, resetAll, onClick]);

  const cells = Array.from({ length: gridSize });

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        ["--cube-face-border" as string]: borderStyle,
        ["--cube-face-bg" as string]: faceColor,
      }}
    >
      <div
        ref={sceneRef}
        style={{
          display: "grid",
          width: "100%",
          height: "100%",
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          columnGap: "4px",
          rowGap: "4px",
          perspective: "9999px",
        }}
      >
        {cells.map((_, r) =>
          cells.map((__, c) => (
            <div
              key={`${r}-${c}`}
              className="cube"
              data-row={r}
              data-col={c}
              style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d" }}
            >
              {["top","bottom","left","right","front","back"].map((face) => (
                <div
                  key={face}
                  className={`cube-face cube-face--${face}`}
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    background: "var(--cube-face-bg)",
                    border: "var(--cube-face-border)",
                    ...(face === "top"    ? { transform: "translateY(-50%) rotateX(90deg)" }  : {}),
                    ...(face === "bottom" ? { transform: "translateY(50%) rotateX(-90deg)" }  : {}),
                    ...(face === "left"   ? { transform: "translateX(-50%) rotateY(-90deg)" } : {}),
                    ...(face === "right"  ? { transform: "translateX(50%) rotateY(90deg)" }   : {}),
                    ...(face === "front" || face === "back"
                      ? { transform: "rotateY(-90deg) translateX(50%) rotateY(90deg)" }
                      : {}),
                  }}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
