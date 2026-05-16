"use client";

export type DashboardTab = "dashboard" | "logs";

const NAV: { label: string; key: DashboardTab }[] = [
  { label: "Dashboard",  key: "dashboard" },
  { label: "Agent Logs", key: "logs" },
];

export function Sidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}) {
  return (
    <aside
      className="fixed top-0 left-0 h-full w-[240px] flex flex-col z-20"
      style={{
        background: "linear-gradient(195deg, #0d1b3e 0%, #060d1f 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/image.png" alt="Faraday" className="w-9 h-9 object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
          <span className="font-display text-base font-black tracking-[0.2em] uppercase"
            style={{ background: "linear-gradient(90deg, #67e8f9, #93c5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Faraday
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV.map((item) => {
          const active = item.key === activeTab;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
              style={active
                ? { background: "linear-gradient(90deg, rgba(6,182,212,0.18), rgba(59,130,246,0.12))", border: "1px solid rgba(6,182,212,0.2)" }
                : { border: "1px solid transparent" }
              }
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                style={active
                  ? { background: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "white" }
                  : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }
                }>
                ◈
              </div>
              <span className="text-sm font-medium" style={{ color: active ? "white" : "rgba(255,255,255,0.4)" }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Help card */}
      <div className="mx-4 mb-6 rounded-2xl p-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a237e, #0d47a1)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)", filter: "blur(20px)", transform: "translate(30%, -30%))" }} />
        <div className="relative z-10">
          <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center text-base"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
            ⚡
          </div>
          <p className="text-xs font-bold text-white mb-0.5">Need help?</p>
          <p className="text-[10px] mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>ARC Hackathon docs</p>
          <a href="https://agora.thecanteenapp.com" target="_blank" rel="noreferrer"
            className="block text-center text-[10px] font-bold py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
            DOCUMENTATION
          </a>
        </div>
      </div>
    </aside>
  );
}
