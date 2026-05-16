"use client";

/**
 * Faraday architecture rendered as an SVG isometric stack.
 * SVG eliminates the text-clipping and z-fighting issues of CSS 3D transforms.
 *
 * 3 layers, top to bottom:
 *   - Watched positions (Aave / GMX / Venus on each chain)
 *   - Faraday agent (Gemini brain at center)
 *   - Circle primitives (Gateway / CCTP / USYC / Paymaster / Wallets)
 */

const cos30 = Math.cos(Math.PI / 6);
const sin30 = 0.5;

type IsoPt = { x: number; y: number };
function iso(x: number, y: number, z: number): IsoPt {
  return {
    x: (x - y) * cos30,
    y: (x + y) * sin30 - z,
  };
}
function pts(...arr: IsoPt[]) {
  return arr.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

interface SlabProps {
  cx: number; cy: number;
  w: number;  d: number;  h: number;
  fillTop: string;
  fillSide?: string;
  fillFront?: string;
}
function Slab({ cx, cy, w, d, h, fillTop, fillSide = "rgba(15,23,42,0.85)", fillFront = "rgba(15,23,42,0.95)" }: SlabProps) {
  const c000 = iso(-w/2, -d/2, 0);
  const c100 = iso( w/2, -d/2, 0);
  const c110 = iso( w/2,  d/2, 0);
  const c001 = iso(-w/2, -d/2, h);
  const c101 = iso( w/2, -d/2, h);
  const c111 = iso( w/2,  d/2, h);
  const c011 = iso(-w/2,  d/2, h);

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Front face */}
      <polygon points={pts(c000, c100, c101, c001)} fill={fillFront} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      {/* Right face */}
      <polygon points={pts(c100, c110, c111, c101)} fill={fillSide} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      {/* Top face */}
      <polygon points={pts(c001, c101, c111, c011)} fill={fillTop} stroke="rgba(255,255,255,0.18)" strokeWidth={1.2} />
    </g>
  );
}

interface CubeProps {
  /** Position on the slab's TOP face, in pre-iso world coords (relative to slab center).
   *  x and y here are the world-space coords, not screen-space. */
  x: number; y: number;
  size?: number;
  glow?: boolean;
  /** Slab base height — cube sits on top of slab so cube bottom z = slabHeight */
  z?: number;
}
function Cube({ x, y, size = 26, glow, z = 0 }: CubeProps) {
  const half = size / 2;
  const cz = size; // cube height

  // 8 corners of the cube (world space, cube center at (x, y, z+cz/2))
  const c000 = iso(x - half, y - half, z);
  const c100 = iso(x + half, y - half, z);
  const c110 = iso(x + half, y + half, z);
  const c001 = iso(x - half, y - half, z + cz);
  const c101 = iso(x + half, y - half, z + cz);
  const c111 = iso(x + half, y + half, z + cz);
  const c011 = iso(x - half, y + half, z + cz);

  const topFill   = glow ? "url(#cubeGlow)" : "url(#cubeTop)";
  const frontFill = glow ? "#1d4ed8"        : "#0c1a3f";
  const rightFill = glow ? "#1e3a8a"        : "#0a1530";

  return (
    <g style={{ filter: glow ? "drop-shadow(0 0 14px rgba(6,182,212,0.6))" : undefined }}>
      <polygon points={pts(c000, c100, c101, c001)} fill={frontFill} stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
      <polygon points={pts(c100, c110, c111, c101)} fill={rightFill} stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
      <polygon points={pts(c001, c101, c111, c011)} fill={topFill}   stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} />
    </g>
  );
}

interface SideLabelProps {
  top: number;
  side: "left" | "right";
  text: string;
  sub?: string;
}
function SideLabel({ top, side, text, sub }: SideLabelProps) {
  const isLeft = side === "left";
  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        top,
        [isLeft ? "left" : "right"]: 0,
        width: 200,
        textAlign: isLeft ? "right" : "left",
        paddingRight: isLeft ? 16 : 0,
        paddingLeft: isLeft ? 0 : 16,
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>
        {text}
      </div>
      {sub && (
        <div className="text-[10px] font-medium mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          {sub}
        </div>
      )}
      {/* connecting line */}
      <div
        className="absolute top-[7px]"
        style={{
          [isLeft ? "right" : "left"]: -90,
          width: 90,
          height: 1,
          background: isLeft
            ? "linear-gradient(to left, rgba(255,255,255,0.05), rgba(255,255,255,0.3))"
            : "linear-gradient(to right, rgba(255,255,255,0.05), rgba(255,255,255,0.3))",
        }}
      />
    </div>
  );
}

export function FaradayStack() {
  // SVG centered at (0, 0). Layers stack along the screen Y axis (each layer raised by slabGap)
  const slabGap = 110;

  return (
    <div className="relative mx-auto" style={{ width: 980, maxWidth: "100%", height: 700 }}>

      {/* Side labels — flat HTML, no rotation issues */}
      <SideLabel top={ 95} side="left"  text="Watched positions" sub="Aave · GMX · Venus" />
      <SideLabel top={140} side="right" text="ARC chain"         sub="Sub-500ms finality" />
      <SideLabel top={310} side="right" text="Faraday agent"     sub="Position monitor · Risk assessor · Orchestrator" />
      <SideLabel top={355} side="left"  text="Gemini brain"      sub="AI decision engine" />
      <SideLabel top={520} side="left"  text="Circle primitives" sub="Gateway · CCTP · USYC · Paymaster · Wallets" />
      <SideLabel top={565} side="right" text="Idle yield"        sub="USYC ~5% APY" />

      <svg
        viewBox="-490 -350 980 700"
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="topSmall" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="rgba(6,182,212,0.35)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0.08)" />
          </linearGradient>
          <linearGradient id="topMid" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="rgba(59,130,246,0.30)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0.06)" />
          </linearGradient>
          <linearGradient id="topBig" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="rgba(124,58,237,0.28)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0.05)" />
          </linearGradient>
          <linearGradient id="cubeTop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="cubeGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Bottom slab — Circle primitives (widest) */}
        <g transform={`translate(0, ${slabGap})`}>
          <Slab cx={0} cy={0} w={420} d={300} h={16} fillTop="url(#topBig)" />
          <g transform={`translate(0, 0)`}>
            <Cube x={-130} y={ -80} z={16} />
            <Cube x={ -50} y={ -90} z={16} />
            <Cube x={  60} y={ -70} z={16} />
            <Cube x={ -90} y={  40} z={16} />
            <Cube x={  40} y={  60} z={16} />
            <Cube x={ 140} y={ -10} z={16} size={20} />
          </g>
        </g>

        {/* Middle slab — Faraday agent */}
        <g transform={`translate(0, ${-slabGap * 0.7})`}>
          <Slab cx={0} cy={0} w={320} d={240} h={16} fillTop="url(#topMid)" />
          <Cube x={-90} y={-60} z={16} size={28} />
          <Cube x={ 20} y={-70} z={16} size={28} />
          <Cube x={100} y={-30} z={16} size={28} />
          <Cube x={-30} y={ 40} z={16} size={42} glow />
          <Cube x={ 80} y={ 60} z={16} size={28} />
        </g>

        {/* Top slab — Watched positions */}
        <g transform={`translate(0, ${-slabGap * 2.3})`}>
          <Slab cx={0} cy={0} w={240} d={180} h={16} fillTop="url(#topSmall)" />
          <Cube x={-70} y={-40} z={16} size={32} glow />
          <Cube x={  0} y={-50} z={16} size={32} glow />
          <Cube x={ 65} y={-30} z={16} size={32} glow />
          <Cube x={-30} y={ 40} z={16} size={22} />
          <Cube x={ 40} y={ 40} z={16} size={22} />
        </g>
      </svg>
    </div>
  );
}
