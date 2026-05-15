"use client";

import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Lightning } from "./Lightning";

const STATS = [
  { value: "$19B", label: "liquidated in Oct 2025 crash" },
  { value: "<500ms", label: "cross-chain response time" },
  { value: "6", label: "ARC primitives powering protection" },
];

const FEATURES = [
  {
    icon: "⚡",
    title: "Sub-500ms Protection",
    desc: "Gateway moves USDC cross-chain before liquidation engines fire.",
  },
  {
    icon: "🧠",
    title: "AI Risk Engine",
    desc: "Gemini reads market conditions and decides when and how to intervene.",
  },
  {
    icon: "🔒",
    title: "Scoped Permissions",
    desc: "Agent can only add collateral — mathematically incapable of draining funds.",
  },
  {
    icon: "💰",
    title: "Yield on Reserve",
    desc: "Idle protection capital earns ~5% APY in USYC between interventions.",
  },
];

export function LandingPage() {
  const { connect, isPending } = useConnect();

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Lightning background — left and right bolts */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0">
          <Lightning hue={200} xOffset={-0.6} speed={0.8} intensity={1.4} size={0.9} />
        </div>
        <div className="absolute inset-0 scale-x-[-1]">
          <Lightning hue={210} xOffset={-0.6} speed={0.7} intensity={1.2} size={1.0} />
        </div>
        {/* Dark center overlay so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/80 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <span className="text-lg font-bold tracking-widest text-cyan-400 uppercase">
          Faraday
        </span>
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <a href="https://testnet.arcscan.app/address/0xD12BEe576b9402eaB04ca8d9EB73691B72850A4E"
            target="_blank" rel="noreferrer"
            className="hover:text-white transition-colors">
            Contract ↗
          </a>
          <a href="https://github.com" target="_blank" rel="noreferrer"
            className="hover:text-white transition-colors">
            GitHub ↗
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-4 py-1.5 rounded-full tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Live on ARC Testnet
          </span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-none">
          <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            FARADAY
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mb-4 font-light leading-relaxed">
          Your DeFi positions inside a Faraday cage.
          <br />
          <span className="text-cyan-400 font-medium">Nothing external can touch them.</span>
        </p>

        <p className="text-sm text-gray-500 max-w-lg mb-12">
          An autonomous AI agent monitors your Aave, Venus, and GMX positions 24/7.
          When liquidation threatens, Faraday moves collateral cross-chain in under 500ms — before the engine fires.
        </p>

        <button
          onClick={() => connect({ connector: injected() })}
          disabled={isPending}
          className="group relative px-10 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 font-bold text-black text-lg transition-all duration-200 shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:shadow-[0_0_60px_rgba(6,182,212,0.6)]"
        >
          {isPending ? "Connecting…" : "Protect Your Positions"}
          <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
        </button>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-8 mt-16">
          {STATS.map((s) => (
            <div key={s.value} className="text-center">
              <div className="text-3xl font-black text-white">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1 max-w-[120px]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/8 hover:border-cyan-500/30 transition-all duration-200"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <div className="font-semibold text-white mb-1">{f.title}</div>
              <div className="text-sm text-gray-400 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-600 tracking-widest uppercase mb-6">How It Works</p>
          <div className="flex flex-wrap justify-center items-center gap-3 text-sm">
            {[
              "Monitor HF every 30s",
              "→",
              "Gemini assesses risk",
              "→",
              "Gateway moves USDC",
              "→",
              "Position saved",
            ].map((step, i) => (
              <span
                key={i}
                className={step === "→"
                  ? "text-gray-600"
                  : "bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-gray-300"
                }
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-12">
          Built on ARC · Powered by Circle Gateway, CCTP, USYC, Paymaster & Wallets
        </p>
      </div>
    </div>
  );
}
