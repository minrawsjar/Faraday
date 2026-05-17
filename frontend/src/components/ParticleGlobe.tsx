"use client";

import { useEffect, useRef } from "react";

const CHAIN_ARCS = [
  // Singapore hub
  { startLat:  1.35, startLng: 103.82, endLat: 37.77, endLng: -122.41, color: "#06b6d4" },
  { startLat:  1.35, startLng: 103.82, endLat: 51.50, endLng:   -0.12, color: "#3b82f6" },
  { startLat:  1.35, startLng: 103.82, endLat: 40.71, endLng:  -74.00, color: "#8b5cf6" },
  { startLat:  1.35, startLng: 103.82, endLat: 22.30, endLng:  114.17, color: "#f59e0b" },
  { startLat:  1.35, startLng: 103.82, endLat: 19.08, endLng:   72.88, color: "#06b6d4" },
  { startLat:  1.35, startLng: 103.82, endLat: 35.68, endLng:  139.69, color: "#22d3ee" },
  { startLat:  1.35, startLng: 103.82, endLat:-33.87, endLng:  151.21, color: "#3b82f6" },
  // San Francisco
  { startLat: 37.77, startLng:-122.41, endLat:  1.35, endLng:  103.82, color: "#06b6d4" },
  { startLat: 37.77, startLng:-122.41, endLat: 51.50, endLng:   -0.12, color: "#8b5cf6" },
  { startLat: 37.77, startLng:-122.41, endLat: 40.71, endLng:  -74.00, color: "#3b82f6" },
  { startLat: 37.77, startLng:-122.41, endLat: 19.08, endLng:   72.88, color: "#f59e0b" },
  { startLat: 37.77, startLng:-122.41, endLat:-23.55, endLng:  -46.63, color: "#10b981" },
  // London
  { startLat: 51.50, startLng:  -0.12, endLat: 19.08, endLng:   72.88, color: "#8b5cf6" },
  { startLat: 51.50, startLng:  -0.12, endLat: 25.20, endLng:   55.27, color: "#f59e0b" },
  { startLat: 51.50, startLng:  -0.12, endLat: 40.71, endLng:  -74.00, color: "#3b82f6" },
  { startLat: 51.50, startLng:  -0.12, endLat: 50.11, endLng:    8.68, color: "#60a5fa" },
  { startLat: 51.50, startLng:  -0.12, endLat:-23.55, endLng:  -46.63, color: "#10b981" },
  // Mumbai, India
  { startLat: 19.08, startLng:  72.88, endLat: 51.50, endLng:   -0.12, color: "#f59e0b" },
  { startLat: 19.08, startLng:  72.88, endLat: 25.20, endLng:   55.27, color: "#f97316" },
  { startLat: 19.08, startLng:  72.88, endLat: 22.30, endLng:  114.17, color: "#f59e0b" },
  { startLat: 19.08, startLng:  72.88, endLat: 12.97, endLng:   77.59, color: "#fbbf24" },
  { startLat: 19.08, startLng:  72.88, endLat: 37.57, endLng:  126.98, color: "#f59e0b" },
  // Bangalore, India
  { startLat: 12.97, startLng:  77.59, endLat:  1.35, endLng:  103.82, color: "#f59e0b" },
  { startLat: 12.97, startLng:  77.59, endLat: 37.77, endLng: -122.41, color: "#f97316" },
  { startLat: 12.97, startLng:  77.59, endLat: 25.20, endLng:   55.27, color: "#fbbf24" },
  // Dubai
  { startLat: 25.20, startLng:  55.27, endLat: 40.71, endLng:  -74.00, color: "#f59e0b" },
  { startLat: 25.20, startLng:  55.27, endLat: 22.30, endLng:  114.17, color: "#06b6d4" },
  { startLat: 25.20, startLng:  55.27, endLat: 37.77, endLng: -122.41, color: "#8b5cf6" },
  // Tokyo
  { startLat: 35.68, startLng: 139.69, endLat: 37.77, endLng: -122.41, color: "#22d3ee" },
  { startLat: 35.68, startLng: 139.69, endLat: 40.71, endLng:  -74.00, color: "#06b6d4" },
  { startLat: 35.68, startLng: 139.69, endLat: 37.57, endLng:  126.98, color: "#3b82f6" },
  // Sydney
  { startLat:-33.87, startLng: 151.21, endLat: 37.77, endLng: -122.41, color: "#10b981" },
  { startLat:-33.87, startLng: 151.21, endLat: 22.30, endLng:  114.17, color: "#06b6d4" },
  { startLat:-33.87, startLng: 151.21, endLat: 19.08, endLng:   72.88, color: "#f59e0b" },
  // New York
  { startLat: 40.71, startLng: -74.00, endLat: 50.11, endLng:    8.68, color: "#8b5cf6" },
  { startLat: 40.71, startLng: -74.00, endLat: 19.08, endLng:   72.88, color: "#f59e0b" },
  // São Paulo
  { startLat:-23.55, startLng: -46.63, endLat: 40.71, endLng:  -74.00, color: "#10b981" },
  { startLat:-23.55, startLng: -46.63, endLat: 51.50, endLng:   -0.12, color: "#10b981" },
  // Seoul
  { startLat: 37.57, startLng: 126.98, endLat: 37.77, endLng: -122.41, color: "#22d3ee" },
  { startLat: 37.57, startLng: 126.98, endLat:  1.35, endLng:  103.82, color: "#3b82f6" },
];

const CHAIN_POINTS = [
  { lat:  1.35, lng: 103.82, color: "#06b6d4", size: 0.8 },
  { lat: 37.77, lng:-122.41, color: "#3b82f6", size: 0.6 },
  { lat: 51.50, lng:  -0.12, color: "#8b5cf6", size: 0.6 },
  { lat: 40.71, lng: -74.00, color: "#06b6d4", size: 0.6 },
  { lat: 22.30, lng: 114.17, color: "#f59e0b", size: 0.6 },
  { lat: 19.08, lng:  72.88, color: "#f59e0b", size: 0.8 },
  { lat: 12.97, lng:  77.59, color: "#fbbf24", size: 0.6 },
  { lat: 35.68, lng: 139.69, color: "#22d3ee", size: 0.6 },
  { lat: 25.20, lng:  55.27, color: "#f97316", size: 0.6 },
  { lat:-33.87, lng: 151.21, color: "#10b981", size: 0.5 },
  { lat: 50.11, lng:   8.68, color: "#60a5fa", size: 0.5 },
  { lat:-23.55, lng: -46.63, color: "#10b981", size: 0.5 },
  { lat: 37.57, lng: 126.98, color: "#22d3ee", size: 0.5 },
];

export function ParticleGlobe({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    let raf = 0;
    let destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let canvasEl: any;
    const container = mountRef.current;

    const init = async () => {
      const [THREE, ThreeGlobeMod, OrbitControlsMod, topoMod, countriesData] = await Promise.all([
        import("three"),
        import("three-globe"),
        import("three/examples/jsm/controls/OrbitControls.js"),
        import("topojson-client"),
        fetch("/countries-50m.json").then((r) => r.json()),
      ]);

      if (destroyed || !container) return;

      const ThreeGlobe = ThreeGlobeMod.default;
      const { feature } = topoMod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countries: any = (feature as any)(countriesData, countriesData.objects.countries);

      const w = container.offsetWidth  || 800;
      const h = container.offsetHeight || 800;

      // ---------- Globe (using ThreeGlobe directly, exact Vision UI config) ----------
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globe: any = new ThreeGlobe({
        waitForGlobeReady: true,
        animateIn: true,
      })
        .hexPolygonsData(countries.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.4)
        .hexPolygonAltitude(0.006)
        .showAtmosphere(true)
        .atmosphereColor("#1e40af")
        .atmosphereAltitude(0.25)
        .hexPolygonColor(() => "rgba(96, 165, 250, 1)");

      // Arcs
      globe
        .arcsData(CHAIN_ARCS)
        .arcColor((d: typeof CHAIN_ARCS[0]) => d.color)
        .arcAltitude(0.3)
        .arcStroke(0.5)
        .arcDashLength(0.4)
        .arcDashGap(0.15)
        .arcDashAnimateTime(2000);

      // Points
      globe
        .pointsData(CHAIN_POINTS)
        .pointLat((d: typeof CHAIN_POINTS[0]) => d.lat)
        .pointLng((d: typeof CHAIN_POINTS[0]) => d.lng)
        .pointColor((d: typeof CHAIN_POINTS[0]) => d.color)
        .pointAltitude(0.02)
        .pointRadius((d: typeof CHAIN_POINTS[0]) => d.size);

      // Globe material tweak — dark navy sphere
      const globeMat = globe.globeMaterial();
      globeMat.color = new THREE.Color(0x040d21);
      globeMat.emissive = new THREE.Color(0x0a1530);
      globeMat.emissiveIntensity = 0.1;
      globeMat.shininess = 0.7;

      // ---------- Scene ----------
      const scene = new THREE.Scene();
      scene.add(globe);
      // Bright ambient so the blue hex dots glow regardless of angle
      scene.add(new THREE.AmbientLight(0xffffff, 2.0));

      const dLight = new THREE.DirectionalLight(0xffffff, 1.5);
      dLight.position.set(-800, 2000, 400);
      scene.add(dLight);

      const dLight1 = new THREE.DirectionalLight(0x60a5fa, 2.5);
      dLight1.position.set(-200, 500, 200);
      scene.add(dLight1);

      const dLight2 = new THREE.PointLight(0x3b82f6, 1.5);
      dLight2.position.set(-200, 500, 200);
      scene.add(dLight2);

      // ---------- Camera ----------
      const camera = new THREE.PerspectiveCamera(50, w / h, 180, 1800);
      camera.position.z = 320;
      camera.position.x = 0;
      camera.position.y = 0;

      // ---------- Renderer ----------
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      canvasEl = renderer.domElement;
      container.appendChild(canvasEl);

      // ---------- Controls (mouse drag 360 rotation) ----------
      const { OrbitControls } = OrbitControlsMod;
      const controls = new OrbitControls(camera, canvasEl);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.minPolarAngle = Math.PI / 3.5;
      controls.maxPolarAngle = Math.PI - Math.PI / 3.5;
      // Pause auto-rotate while user is dragging, resume after
      let dragTimeout: ReturnType<typeof setTimeout> | null = null;
      controls.addEventListener("start", () => {
        controls.autoRotate = false;
        if (dragTimeout) clearTimeout(dragTimeout);
      });
      controls.addEventListener("end", () => {
        if (dragTimeout) clearTimeout(dragTimeout);
        dragTimeout = setTimeout(() => { controls.autoRotate = true; }, 1800);
      });

      // ---------- Resize handling ----------
      const onResize = () => {
        if (!container) return;
        const newW = container.offsetWidth;
        const newH = container.offsetHeight;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };
      window.addEventListener("resize", onResize);

      // ---------- Animate ----------
      const animate = () => {
        if (destroyed) return;
        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();

      // Store cleanup ref
      (container as HTMLDivElement & { __cleanup?: () => void }).__cleanup = () => {
        window.removeEventListener("resize", onResize);
      };
    };

    init();

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      try {
        (container as HTMLDivElement & { __cleanup?: () => void }).__cleanup?.();
        if (canvasEl && container && container.contains(canvasEl)) {
          container.removeChild(canvasEl);
        }
        renderer?.dispose();
      } catch { /* ignore */ }
    };
  }, []);

  return <div ref={mountRef} className={className} />;
}
