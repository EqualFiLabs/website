"use client";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <div className="min-h-screen grid-bg flex flex-col relative overflow-hidden">
      {/* HEADER */}
      <header className="border-b border-white/20 p-4 flex justify-between items-center bg-black sticky top-0 z-50">
        <div className="font-bold tracking-widest text-xl">EQUALIS_V1</div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8 text-sm uppercase tracking-widest items-center">
          <div className="flex gap-4">
            <a href="https://discord.gg/brsMNDux4T" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" aria-label="Discord">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084-.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/></svg>
            </a>
            <a href="https://t.me/EqualFi" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" aria-label="Telegram">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.820 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </a>
            <a href="https://matrix.to/#/#EqualFiLabs:matrix.org" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" aria-label="Matrix">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.632.55v22.9H2.28V24H0V0h2.28v.55zm7.043 7.26v1.157h.033c.309-.443.683-.784 1.117-1.024.433-.245.936-.365 1.5-.365.54 0 1.033.107 1.481.314.448.208.785.582 1.02 1.108.254-.374.6-.706 1.034-.992.434-.287.95-.43 1.546-.43.453 0 .872.056 1.26.167.388.11.716.286.993.53.276.245.489.559.646.951.152.392.23.863.23 1.417v5.728h-2.349V11.52c0-.286-.01-.559-.032-.812a1.755 1.755 0 0 0-.18-.66 1.106 1.106 0 0 0-.438-.448c-.194-.11-.457-.166-.785-.166-.332 0-.6.064-.803.189a1.38 1.38 0 0 0-.48.499 1.946 1.946 0 0 0-.231.696 5.56 5.56 0 0 0-.06.785v4.768h-2.35v-4.8c0-.254-.004-.503-.018-.752a2.074 2.074 0 0 0-.143-.688 1.052 1.052 0 0 0-.415-.503c-.194-.125-.476-.19-.854-.19-.111 0-.259.024-.439.074-.18.051-.36.143-.53.282-.171.138-.319.337-.439.595-.12.259-.18.6-.18 1.02v4.966H5.46V7.81zm15.693 15.64V.55H21.72V0H24v24h-2.28v-.55z"/></svg>
            </a>
          </div>
          <Link href="/blog" className="hover:bg-white hover:text-black px-2 transition-colors">Transmissions</Link>
          <Link href="/app" className="hover:bg-white hover:text-black px-2 transition-colors">App</Link>
          <a href="https://github.com/EqualFiLabs" target="_blank" className="hover:bg-white hover:text-black px-2 transition-colors">Source</a>
        </nav>

        {/* Mobile Hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden z-50 relative" aria-label="Menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="fixed inset-0 bg-black z-40 md:hidden flex flex-col items-center justify-between py-20 pt-32">
            <nav className="flex flex-col items-center gap-6 text-2xl font-mono uppercase tracking-[0.2em]">
              <Link href="/blog" className="hover:text-white text-gray-400 transition-colors" onClick={() => setMenuOpen(false)}>Transmissions</Link>
              <Link href="/app" className="hover:text-white text-gray-400 transition-colors" onClick={() => setMenuOpen(false)}>App</Link>
              <a href="https://github.com/EqualFiLabs" target="_blank" className="hover:text-white text-gray-400 transition-colors">Source</a>
            </nav>
            
            {/* Social Media Icons */}
            <div className="flex items-center gap-6">
              <a href="https://discord.gg/brsMNDux4T" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </a>
              <a href="https://t.me/EqualFi" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </a>
              <a href="https://matrix.to/#/#EqualFiLabs:matrix.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.632.55v22.9H2.28V24H0V0h2.28v.55zm7.043 7.26v1.157h.033c.309-.443.683-.784 1.117-1.024.433-.245.936-.365 1.5-.365.54 0 1.033.107 1.481.314.448.208.785.582 1.02 1.108.254-.374.6-.706 1.034-.992.434-.287.95-.43 1.546-.43.453 0 .872.056 1.26.167.388.11.716.286.993.53.276.245.489.559.646.951.152.392.23.863.23 1.417v5.728h-2.349V11.52c0-.286-.01-.559-.032-.812a1.755 1.755 0 0 0-.18-.66 1.106 1.106 0 0 0-.438-.448c-.194-.11-.457-.166-.785-.166-.332 0-.6.064-.803.189a1.38 1.38 0 0 0-.48.499 1.946 1.946 0 0 0-.231.696 5.56 5.56 0 0 0-.06.785v4.768h-2.35v-4.8c0-.254-.004-.503-.018-.752a2.074 2.074 0 0 0-.143-.688 1.052 1.052 0 0 0-.415-.503c-.194-.125-.476-.19-.854-.19-.111 0-.259.024-.439.074-.18.051-.36.143-.53.282-.171.138-.319.337-.439.595-.12.259-.18.6-.18 1.02v4.966H5.46V7.81zm15.693 15.64V.55H21.72V0H24v24h-2.28v-.55z"/></svg>
              </a>
            </div>
          </div>
        )}
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
            <a
              href="https://github.com/EqualFiLabs/EqualFi/blob/dev/docs/Equalis/Equalis_Protocol.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white px-8 py-4 text-lg font-bold uppercase hover:bg-white hover:text-black transition-all active:scale-95"
            >
              Read Whitepaper -&gt;
            </a>
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
              <h3 className="text-lg font-bold uppercase tracking-tight">Lossless</h3>
              <p className="text-sm text-gray-400 font-mono leading-relaxed">
                Your deposit is never at risk unless you decide to opt-in. Earn from providing flashloan liquidity and protocol revenue.
              </p>
            </div>

            <div className="space-y-3">
              <div className="font-mono text-xs text-gray-500">[02] CREDIT</div>
              <h3 className="text-lg font-bold uppercase tracking-tight">0% Interest</h3>
              <p className="text-sm text-gray-400 font-mono leading-relaxed">
                Self Secured 0% interest credit that earns yield. The Active Credit Index pays active capital from protocol revenue.
              </p>
            </div>

            <div className="space-y-3">
              <div className="font-mono text-xs text-gray-500">[03] SOLVENCY</div>
              <h3 className="text-lg font-bold uppercase tracking-tight">Cash-Flow First</h3>
              <p className="text-sm text-gray-400 font-mono leading-relaxed">
                Solvency is defined by cash flow, not price wicks. As long as you pay the fee,
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

          <div className="grid gap-x-8 gap-y-3 text-sm font-mono text-gray-300 md:grid-cols-3">
            <div className="text-xs text-gray-500 md:row-start-1 md:col-start-1">ORACLES</div>
            <p className="text-gray-500 md:row-start-2 md:col-start-1">
              Incumbents: price feeds decide when you die and can be victims of manipulation.
            </p>
            <p className="md:row-start-3 md:col-start-1">
              Equalis: solvency is a function of cash flow and encumbrance, not spot price
              noise. Wicks can&apos;t liquidate you; only failing flows can.
            </p>

            <div className="text-xs text-gray-500 md:row-start-1 md:col-start-2">INTEREST</div>
            <p className="text-gray-500 md:row-start-2 md:col-start-2">
              Incumbents: utilization curves price your loan based on pool dynamics you don&apos;t
              control and can&apos;t predict.
            </p>
            <p className="md:row-start-3 md:col-start-2">
              Equalis: self-secured credit is 0%. No spread to extract. No curve to game. You
              pay explicit fees for explicit actions, not rent for existing.
            </p>

            <div className="text-xs text-gray-500 md:row-start-1 md:col-start-3">MEV</div>
            <p className="text-gray-500 md:row-start-2 md:col-start-3">
              Incumbents: your collateral is auctioned to the fastest bot during the worst
              possible moment and is an MEV playground.
            </p>
            <p className="md:row-start-3 md:col-start-3">
              Equalis: there is no liquidation engine because there is nothing to liquidate.
              Self-secured debt is denominated in what you deposited. Default is a missed
              obligation, not a price movement.
            </p>
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
          desc="Self-secured 0% interest borrowing that earns yield powered by protocol revenue. Maximize capital efficiency."
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
