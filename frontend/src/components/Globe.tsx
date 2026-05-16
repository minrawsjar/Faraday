"use client";

import { useEffect, useRef } from "react";

// Chain locations for the arcs (lat, lng)
const CHAIN_COORDS: Record<string, [number, number]> = {
  arc:      [  1.35,  103.82 ], // Singapore — ARC hub
  base:     [ 37.77, -122.41 ], // San Francisco — Base/Coinbase
  ethereum: [ 51.50,   -0.12 ], // London — Ethereum
  arbitrum: [ 40.71,  -74.00 ], // New York — Arbitrum
  bnb:      [ 22.30,  114.17 ], // Hong Kong — BNB
};

const ARCS = [
  { start: CHAIN_COORDS.arc,      end: CHAIN_COORDS.base,     color: "#06b6d4" },
  { start: CHAIN_COORDS.arc,      end: CHAIN_COORDS.ethereum, color: "#3b82f6" },
  { start: CHAIN_COORDS.arc,      end: CHAIN_COORDS.arbitrum, color: "#8b5cf6" },
  { start: CHAIN_COORDS.arc,      end: CHAIN_COORDS.bnb,      color: "#f59e0b" },
  { start: CHAIN_COORDS.base,     end: CHAIN_COORDS.arc,      color: "#06b6d4" },
  { start: CHAIN_COORDS.ethereum, end: CHAIN_COORDS.arc,      color: "#3b82f6" },
];

const POINTS = Object.entries(CHAIN_COORDS).map(([name, [lat, lng]]) => ({
  lat, lng,
  label: name.toUpperCase(),
  color: name === "arc" ? "#06b6d4" : "#ffffff",
  size: name === "arc" ? 0.8 : 0.5,
}));

export function GlobeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    let destroyed = false;

    import("react-globe.gl").then((mod) => {
      if (destroyed || !containerRef.current) return;

      const Globe = mod.default;
      const { createRoot } = require("react-dom/client");
      const React = require("react");

      const width  = containerRef.current.offsetWidth  || 500;
      const height = containerRef.current.offsetHeight || 500;

      const element = React.createElement(Globe, {
        ref: globeRef,
        width, height,
        backgroundColor: "rgba(0,0,0,0)",
        globeImageUrl: "//unpkg.com/three-globe/example/img/earth-night.jpg",
        atmosphereColor: "#06b6d4",
        atmosphereAltitude: 0.15,
        arcsData: ARCS,
        arcStartLat:   (d: typeof ARCS[0]) => d.start[0],
        arcStartLng:   (d: typeof ARCS[0]) => d.start[1],
        arcEndLat:     (d: typeof ARCS[0]) => d.end[0],
        arcEndLng:     (d: typeof ARCS[0]) => d.end[1],
        arcColor:      (d: typeof ARCS[0]) => [d.color + "aa", d.color],
        arcDashLength: 0.4,
        arcDashGap: 0.15,
        arcDashAnimateTime: 2000,
        arcStroke: 0.5,
        pointsData: POINTS,
        pointLat:   (d: typeof POINTS[0]) => d.lat,
        pointLng:   (d: typeof POINTS[0]) => d.lng,
        pointColor: (d: typeof POINTS[0]) => d.color,
        pointAltitude: 0.01,
        pointRadius:   (d: typeof POINTS[0]) => d.size,
        pointsMerge: false,
        enablePointerInteraction: false,
      });

      const root = createRoot(containerRef.current);
      root.render(element);

      // Auto-rotate
      const interval = setInterval(() => {
        if (globeRef.current && (globeRef.current as { controls?: () => { autoRotate: boolean; autoRotateSpeed: number } }).controls) {
          const controls = (globeRef.current as { controls: () => { autoRotate: boolean; autoRotateSpeed: number } }).controls();
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.5;
          clearInterval(interval);
        }
      }, 500);
    });

    return () => { destroyed = true; };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}
