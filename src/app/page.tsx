import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen grid-bg flex flex-col relative overflow-hidden">
      {/* HEADER */}
      <header className="border-b border-white/20 p-4 flex justify-between items-center bg-black sticky top-0 z-50">
        <div className="font-bold tracking-widest text-xl">EQUALFI_PROTO_V1</div>
        <nav className="flex gap-8 text-sm uppercase tracking-widest">
          <Link href="/blog" className="hover:bg-white hover:text-black px-2 transition-colors">Transmissions</Link>
          <a href="https://github.com/EqualFiLabs" target="_blank" className="hover:bg-white hover:text-black px-2 transition-colors">Source</a>
        </nav>
      </header>

      {/* HERO */}
      <main className="flex-1 flex flex-col px-4 md:px-12 py-20 relative">
        <div className="max-w-[90vw] mb-12">
          <h1 className="text-huge mb-8">
            Sovereign<br/>
            Financial<br/>
            Infrastructure
          </h1>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 border-t border-white/20 pt-8">
          <div className="space-y-6">
            <p className="text-xl md:text-2xl font-bold uppercase leading-tight max-w-lg">
              // The Unified Liquidity Layer for the Agentic Finance Era.
            </p>
            <p className="text-gray-400 font-mono text-sm max-w-md">
              Low-Risk Yield. Deterministic Solvency.<br/>
              The inevitable base layer for programmable credit.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4">
            <Link 
              href="/blog/manifesto" 
              className="border border-white px-8 py-4 text-lg font-bold uppercase hover:bg-white hover:text-black transition-all active:scale-95"
            >
              Read Strategy -&gt;
            </Link>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section className="mt-16 border-t border-white/20 pt-10">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-gray-500 mb-6">
            // HOW_EQUALIS_CORE_WORKS
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="font-mono text-xs text-gray-500">[01] DEPOSIT</div>
              <h3 className="text-lg font-bold uppercase tracking-tight">Active Credit</h3>
              <p className="text-sm text-gray-400 font-mono leading-relaxed">
                You deposit collateral. It becomes Active Credit, not idle TVL. Every unit is wired
                for productive use instead of sitting in a pool.
              </p>
            </div>

            <div className="space-y-3">
              <div className="font-mono text-xs text-gray-500">[02] BORROW</div>
              <h3 className="text-lg font-bold uppercase tracking-tight">0% Interest</h3>
              <p className="text-sm text-gray-400 font-mono leading-relaxed">
                You borrow at 0% interest. Your obligation is a rolling fee serviced by protocol
                revenue – not a time-based rate that compounds against you.
              </p>
            </div>

            <div className="space-y-3">
              <div className="font-mono text-xs text-gray-500">[03] SOLVENCY</div>
              <h3 className="text-lg font-bold uppercase tracking-tight">Cash-Flow First</h3>
              <p className="text-sm text-gray-400 font-mono leading-relaxed">
                Solvency is defined by cash flow, not price wicks. As long as flows cover the fee,
                your position cannot be nuked by oracle noise or MEV games.
              </p>
            </div>
          </div>
        </section>

        {/* PHYSICS VS NARRATIVE */}
        <section className="mt-20 border-t border-white/20 pt-10">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-gray-500 mb-6">
            // PROTOCOL_PHYSICS_VS_MARKET_STORY
          </h2>

          <div className="grid md:grid-cols-3 gap-8 text-sm font-mono text-gray-300">
            <div className="space-y-3">
              <div className="text-xs text-gray-500">ORACLES</div>
              <p className="text-gray-500">
                Incumbents: price feeds decide when you die.
              </p>
              <p>
                Equalis: solvency is a function of cash flow and encumbrance, not spot price
                noise. Wicks can&apos;t liquidate you; only failing flows can.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-gray-500">INTEREST</div>
              <p className="text-gray-500">
                Incumbents: you pay rent for time.
              </p>
              <p>
                Equalis: borrow cost is a rolling fee funded by protocol revenue. Capital
                works; it isn&apos;t farmed.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-gray-500">MEV</div>
              <p className="text-gray-500">
                Incumbents: liquidations are a MEV playground.
              </p>
              <p>
                Equalis: auction &amp; fee mechanics are designed to collapse sandwich and
                liquidation games by construction, not by hoping &quot;good actors&quot; behave.
              </p>
            </div>
          </div>
        </section>

        {/* AGENT WALLET CORE SPOTLIGHT */}
        <section className="mt-20 border-t border-white/20 pt-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-gray-500">
                // AGENT_WALLET_CORE
              </h2>
              <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">
                Identity as an Asset. Credit as a Primitive.
              </h3>
              <p className="text-sm text-gray-400 font-mono leading-relaxed">
                Agents are more than wallets – they are capital accounts with history,
                permissions, and credit. AWC binds identity to ERC-6551 accounts and
                delegates control via ERC-6900 session keys.
              </p>
              <p className="text-sm text-gray-400 font-mono leading-relaxed">
                Equalis plugs in as the native credit layer behind those agents:
                self-secured 0% interest borrowing, deterministic solvency, and
                composable encumbrance for agent-native finance.
              </p>
            </div>

            <div className="border border-white/20 bg-black/40 p-6 max-w-sm">
              <div className="font-mono text-xs text-gray-500 mb-2">
                [AGENT_TRANSMISSION]
              </div>
              <p className="text-sm text-gray-300 font-mono mb-4">
                Explore how Agent Wallet Core turns identity into a programmable
                balance sheet, and why Equalis is the default credit rail for
                autonomous agents.
              </p>
              <a
                href="/blog/agent-wallet-core"
                className="inline-flex items-center text-xs font-mono uppercase tracking-widest border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors"
              >
                Read AWC Transmission &rarr;
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER GRID */}
      <footer className="grid grid-cols-1 md:grid-cols-3 border-t border-white/20 divide-y md:divide-y-0 md:divide-x divide-white/20 bg-black">
        <Feature 
          num="01" 
          title="DETERMINISTIC" 
          desc="Solvency defined by cash flow, not price wicks. No Oracles. No fragility."
        />
        <Feature 
          num="02" 
          title="YIELD_OPTIMIZED" 
          desc="Self-secured 0% interest borrowing powered by protocol revenue. Maximize capital efficiency."
        />
        <Feature 
          num="03" 
          title="MODULAR_CORE" 
          desc="A unified liquidity layer that can support any venue. The foundation not the casino."
        />
      </footer>
    </div>
  );
}

function Feature({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="p-8 hover:bg-white/5 transition-colors group h-full">
      <div className="text-xs text-gray-500 mb-4 font-mono">[{num}]</div>
      <h3 className="text-2xl font-bold mb-2 group-hover:underline decoration-2 underline-offset-4">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed font-mono">{desc}</p>
    </div>
  );
}
