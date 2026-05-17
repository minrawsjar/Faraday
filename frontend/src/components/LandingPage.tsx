"use client";

import { useRef, useState, useEffect } from "react";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Lightning } from "./Lightning";
import { Cubes } from "./Cubes";
import { FaradayStack } from "./FaradayStack";

// ── Glow bento card ─────────────────────────────────────────────────────────
function BentoCard({
  children,
  className = "",
  glowColor = "cyan",
  span = "",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  span?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const colors: Record<string, string> = {
    cyan:   "rgba(6,182,212,0.25)",
    blue:   "rgba(59,130,246,0.25)",
    violet: "rgba(139,92,246,0.25)",
    green:  "rgba(34,197,94,0.20)",
    orange: "rgba(249,115,22,0.20)",
  };
  const glow = colors[glowColor] ?? colors.cyan;

  return (
    <div
      ref={ref}
      className={`relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden transition-all duration-300 ${hovered ? "border-white/20 scale-[1.01]" : ""} ${span} ${className}`}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, ${glow}, transparent 60%), rgba(255,255,255,0.03)`
          : undefined,
      }}
    >
      {children}
    </div>
  );
}

// ── Floating particle dot ────────────────────────────────────────────────────
function Dot({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute w-1 h-1 rounded-full bg-cyan-400 opacity-40 animate-ping"
      style={style}
    />
  );
}

// ── Section heading ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold text-cyan-500 tracking-widest uppercase mb-3">
      {children}
    </p>
  );
}

// ── Main landing page ────────────────────────────────────────────────────────
export function LandingPage() {
  const { connect, isPending } = useConnect();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-[#020810] text-white min-h-screen overflow-x-hidden">

      {/* ── Sticky nav ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-300 ${scrolled ? "bg-black/70 backdrop-blur-xl border-b border-white/5" : ""}`}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/image.png" alt="Faraday" className="w-9 h-9 object-contain drop-shadow-[0_0_14px_rgba(59,130,246,0.6)]" />
          <span className="font-display text-xl font-bold tracking-widest text-cyan-400 uppercase">Faraday</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#primitives" className="hover:text-white transition-colors">Architecture</a>
          <button
            onClick={() => connect({ connector: injected() })}
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all disabled:opacity-50"
          >
            {isPending ? "Connecting…" : "Launch App →"}
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Lightning bg */}
        <div className="absolute inset-0 z-0">
          <Lightning hue={200} xOffset={-0.55} speed={0.7} intensity={1.3} size={0.9} />
          <div className="absolute inset-0 scale-x-[-1]">
            <Lightning hue={215} xOffset={-0.55} speed={0.65} intensity={1.1} size={1.0} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#020810]/70 via-[#020810]/85 to-[#020810]/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020810]/50 via-transparent to-[#020810]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl">
          <h1 className="font-display text-7xl md:text-9xl font-black tracking-tighter leading-none mb-6">
            <span className="bg-gradient-to-b from-white via-gray-100 to-gray-500 bg-clip-text text-transparent">
              FARADAY
            </span>
          </h1>

          <p className="text-xl md:text-3xl text-gray-300 font-light mb-4 leading-relaxed">
            Your DeFi positions inside a{" "}
            <span className="text-cyan-400 font-semibold">Faraday cage.</span>
          </p>
          <p className="text-base text-gray-500 max-w-xl mb-12">
            An autonomous AI agent that monitors your Aave, Venus & GMX positions 24/7
            and moves collateral cross-chain in <strong className="text-white">under 500ms</strong>, before
            liquidation engines fire.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button
              onClick={() => connect({ connector: injected() })}
              disabled={isPending}
              className="px-10 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 font-bold text-black text-lg transition-all duration-200 shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:shadow-[0_0_70px_rgba(6,182,212,0.7)]"
            >
              {isPending ? "Connecting…" : "Protect My Positions"}
            </button>
            <a href="#how"
              className="px-8 py-4 rounded-2xl border border-white/15 text-gray-300 hover:border-white/30 hover:text-white font-medium transition-all"
            >
              How it works ↓
            </a>
          </div>
        </div>

        {/* scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce text-gray-600 text-xs tracking-widest uppercase">
          scroll
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          THE PROBLEM,stats strip with Cubes bg
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Cubes gridSize={12} faceColor="#020810" borderStyle="1px solid rgba(6,182,212,0.2)" maxAngle={35} />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <SectionLabel>The Problem</SectionLabel>
            <h2 className="font-display text-4xl md:text-6xl font-black tracking-tight">
              $19 billion liquidated.
              <br />
              <span className="text-gray-500">Most positions weren't insolvent.</span>
            </h2>
            <p className="mt-6 text-gray-400 max-w-2xl mx-auto text-lg">
              In the October 2025 flash crash, billions in DeFi positions were liquidated not because they were underwater,
              but because collateral couldn't move fast enough. Traditional bridges take 5 to 20 minutes.
              Liquidation engines fire in <span className="text-white font-semibold">seconds.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { val: "$19B", sub: "liquidated in Oct 2025", color: "text-red-400" },
              { val: "5–20 min", sub: "traditional bridge time", color: "text-orange-400" },
              { val: "<500ms", sub: "Faraday response time", color: "text-cyan-400" },
            ].map((s) => (
              <BentoCard key={s.val} glowColor={s.color.includes("cyan") ? "cyan" : s.color.includes("orange") ? "orange" : "violet"} className="p-8 text-center">
                <div className={`text-5xl font-black ${s.color} mb-2`}>{s.val}</div>
                <div className="text-gray-500 text-sm">{s.sub}</div>
              </BentoCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="how" className="py-32 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <SectionLabel>How Faraday Works</SectionLabel>
          <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">
            Six steps. Fully autonomous.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { step: "01", title: "Monitor", desc: "Agent polls your Aave, Venus, and GMX positions every 30 seconds using on-chain reads on ARC.", icon: "👁" },
            { step: "02", title: "Detect", desc: "When health factor drops below your set threshold, Gemini AI analyzes market context and confirms intervention.", icon: "🧠" },
            { step: "03", title: "Assess", desc: "Agent calculates exact USDC needed to restore HF to target. Checks liquid buffer vs USYC yield reserve.", icon: "📊" },
            { step: "04", title: "Move", desc: "Gateway transfers USDC cross-chain in under 500ms using Circle's unified balance infrastructure.", icon: "⚡" },
            { step: "05", title: "Protect", desc: "USDC arrives on destination chain as native (via CCTP, no wrapping risk). Deposited as collateral.", icon: "🛡" },
            { step: "06", title: "Log", desc: "Intervention logged on-chain via PositionRegistry. Fully auditable. You get an on-chain receipt.", icon: "📝" },
          ].map((item) => (
            <BentoCard key={item.step} glowColor="cyan" className="p-6">
              <div className="flex items-start gap-4">
                <div>
                  <span className="text-xs text-cyan-500 font-mono font-bold">{item.step}</span>
                  <div className="text-2xl mt-1">{item.icon}</div>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </BentoCard>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ARCHITECTURE,isometric stack diagram
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-32 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <SectionLabel>Architecture</SectionLabel>
          <h2 className="font-display text-5xl md:text-6xl font-black mt-4 mb-4">
            Three layers.
            <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              One protection loop.
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Faraday is a stack. ARC primitives at the base, the agent in the middle,
            user positions at the top. Every layer is independently auditable.
          </p>
        </div>
        <div className="flex items-center justify-center">
          <FaradayStack />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          WHY ARC,magic bento primitives
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="primitives" className="py-32 bg-black/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <SectionLabel>Why ARC</SectionLabel>
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">
              Six primitives.
              <br />
              <span className="text-gray-500">Each one load-bearing.</span>
            </h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto">
              Faraday can only exist because all six ARC/Circle primitives work together.
              Remove any one and the product breaks.
            </p>
          </div>

          {/* Big bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">

            {/* Gateway,large */}
            <BentoCard glowColor="cyan" span="md:col-span-2 md:row-span-2" className="p-8 relative overflow-hidden min-h-[280px]">
              <Dot style={{ top: "20%", right: "15%", animationDelay: "0s" }} />
              <Dot style={{ bottom: "30%", right: "25%", animationDelay: "0.5s" }} />
              <div className="relative z-10">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-display text-2xl font-black text-white mb-2">Gateway</h3>
                <div className="text-xs text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full inline-block mb-3">Sub-500ms · Unified Balance</div>
                <p className="text-gray-400 leading-relaxed max-w-md">
                  The core unlock. When a health factor drops below threshold, the agent pulls USDC from
                  wherever the user holds it across all chains and tops up collateral, before the liquidation
                  engine fires. Without sub-500ms transfer, this is physically impossible. No other bridge gives you this.
                </p>
              </div>
            </BentoCard>

            {/* CCTP */}
            <BentoCard glowColor="blue" className="p-6">
              <div className="text-2xl mb-2">🔄</div>
              <h3 className="font-bold text-white mb-1">CCTP</h3>
              <div className="text-xs text-blue-400 mb-2">Native burn-and-mint</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Burns on source, mints natively on destination. No wrapped token depeg risk during the exact moment
                of maximum market stress.
              </p>
            </BentoCard>

            {/* USYC */}
            <BentoCard glowColor="green" className="p-6">
              <div className="text-2xl mb-2">💰</div>
              <h3 className="font-bold text-white mb-1">USYC</h3>
              <div className="text-xs text-green-400 mb-2">~5% APY on idle reserve</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                95% of the time nothing happens. Your protection reserve earns yield in USYC. It pays for itself.
              </p>
            </BentoCard>

            {/* Paymaster */}
            <BentoCard glowColor="violet" className="p-6">
              <div className="text-2xl mb-2">⛽</div>
              <h3 className="font-bold text-white mb-1">Paymaster</h3>
              <div className="text-xs text-violet-400 mb-2">$0.01 USDC gas everywhere</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                One USDC balance pays gas on Ethereum, Arbitrum, BNB, and ARC. Agent never goes offline from an empty gas wallet.
              </p>
            </BentoCard>

            {/* Wallets */}
            <BentoCard glowColor="orange" className="p-6">
              <div className="text-2xl mb-2">🔑</div>
              <h3 className="font-bold text-white mb-1">Circle Wallets</h3>
              <div className="text-xs text-orange-400 mb-2">Scoped permissions</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Agent can only add collateral or repay debt. Mathematically incapable of withdrawing your funds.
              </p>
            </BentoCard>

            {/* Contracts,wide */}
            <BentoCard glowColor="cyan" span="md:col-span-2" className="p-6">
              <div className="flex items-center gap-6">
                <div className="text-3xl shrink-0">📜</div>
                <div>
                  <h3 className="font-bold text-white mb-1">On-chain Contracts</h3>
                  <div className="text-xs text-cyan-500 mb-2">Auditable · Deterministic · Trustless</div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    HF thresholds, intervention logic, and permission scope are all on-chain. The agent can't go rogue
                    because its behaviour is constrained by smart contract rules, not by trusting us.
                  </p>
                </div>
              </div>
            </BentoCard>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          THE AI BRAIN
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-32 max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <SectionLabel>Agentic Sophistication</SectionLabel>
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-6">
              Not a bot.
              <br />
              <span className="text-cyan-400">A risk manager.</span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              A simple if/then script is AI-flavored automation. Faraday's Gemini-powered brain
              actually <em>decides</em>, reading market volatility, collateral correlation, and
              liquidation momentum before acting.
            </p>
            <ul className="space-y-3">
              {[
                "Dynamic threshold adjustment based on market volatility",
                "Predicts HF trajectory, intervenes before threshold breach",
                "Decides which reserve to draw from (liquid vs USYC)",
                "Deterministic fallback if AI call fails, never goes dark",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-300">
                  <span className="text-cyan-400 shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <BentoCard glowColor="cyan" className="p-8 font-mono text-xs">
            <div className="text-gray-600 mb-2">{`// brain/decide.ts`}</div>
            <div className="space-y-1 leading-relaxed">
              <div><span className="text-violet-400">const</span> <span className="text-cyan-300">decision</span> <span className="text-white">= await</span> <span className="text-yellow-300">gemini</span><span className="text-white">.decide({"{"}</span></div>
              <div className="pl-4"><span className="text-cyan-200">healthFactor</span><span className="text-white">: </span><span className="text-orange-300">1.28</span><span className="text-white">,</span></div>
              <div className="pl-4"><span className="text-cyan-200">trigger</span><span className="text-white">: </span><span className="text-orange-300">1.30</span><span className="text-white">,</span></div>
              <div className="pl-4"><span className="text-cyan-200">collateral</span><span className="text-white">: </span><span className="text-green-300">"$4,999"</span><span className="text-white">,</span></div>
              <div className="pl-4"><span className="text-cyan-200">debt</span><span className="text-white">: </span><span className="text-green-300">"$3,198"</span></div>
              <div><span className="text-white">{"});"}</span></div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <div><span className="text-gray-500">{`// Response:`}</span></div>
                <div><span className="text-cyan-200">shouldIntervene</span><span className="text-white">: </span><span className="text-green-400">true</span></div>
                <div><span className="text-cyan-200">usdcAmount</span><span className="text-white">: </span><span className="text-orange-300">580_000000</span></div>
                <div><span className="text-cyan-200">urgency</span><span className="text-white">: </span><span className="text-red-400">"immediate"</span></div>
                <div><span className="text-cyan-200">reasoning</span><span className="text-white">: </span><span className="text-green-300">"HF below trigger,</span></div>
                <div className="pl-4"><span className="text-green-300">intervene before cascade"</span></div>
              </div>
            </div>
          </BentoCard>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TRUST MODEL
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-32 bg-black/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <SectionLabel>Trust Model</SectionLabel>
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">
              The agent can't steal from you.
              <br />
              <span className="text-gray-500">That's not a promise. It's math.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🔐",
                title: "Can only add, never subtract",
                desc: "Agent wallet has permission to call addCollateral() and repayDebt() only. Withdraw is blocked at the smart contract level.",
                color: "cyan",
              },
              {
                icon: "📋",
                title: "On-chain rules, not promises",
                desc: "Every threshold, every permission, every intervention is governed by FaradayVault and PositionRegistry on ARC. Auditable by anyone.",
                color: "blue",
              },
              {
                icon: "🌐",
                title: "MCP-composable",
                desc: "Faraday exposes an MCP server. Other AI agents can use it as a protection primitive without rebuilding the infrastructure.",
                color: "violet",
              },
            ].map((item) => (
              <BentoCard key={item.title} glowColor={item.color} className="p-7">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </BentoCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CTA,bottom section with Cubes
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-40 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <Cubes
            gridSize={10}
            faceColor="#020810"
            borderStyle="1px solid rgba(6,182,212,0.15)"
            maxAngle={50}
            rippleColor="rgba(6,182,212,0.6)"
          />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <h2 className="font-display text-5xl md:text-7xl font-black tracking-tighter mb-6">
            Stop watching your
            <br />
            <span className="text-cyan-400">health factor.</span>
          </h2>
          <p className="text-gray-400 max-w-lg mb-12 text-lg">
            Connect your wallet, register your positions, deposit a reserve.
            Faraday watches while you sleep.
          </p>
          <button
            onClick={() => connect({ connector: injected() })}
            disabled={isPending}
            className="px-12 py-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 font-black text-black text-xl transition-all duration-200 shadow-[0_0_60px_rgba(6,182,212,0.5)] hover:shadow-[0_0_100px_rgba(6,182,212,0.7)]"
          >
            {isPending ? "Connecting…" : "Protect My Positions →"}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/image.png" alt="Faraday" className="w-6 h-6 object-contain opacity-70" />
            <span className="font-bold tracking-widest uppercase text-gray-600">Faraday</span>
          </div>
          <span>Built on ARC · Powered by Circle Gateway, CCTP, USYC, Paymaster & Wallets</span>
          <div className="flex gap-4">
            <a href="https://testnet.arcscan.app/address/0xD109399A31D3b632841A1C3f92060F362467bf59"
              target="_blank" rel="noreferrer" className="hover:text-gray-400 transition-colors">
              Contract ↗
            </a>
            <a href="https://testnet.arcscan.app/address/0xcD22999397FfEd77c891E8413A349087060c33d1"
              target="_blank" rel="noreferrer" className="hover:text-gray-400 transition-colors">
              Registry ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
