"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/app/position", label: "Position" },
  { href: "/app/swap", label: "Swap" },
  { href: "/app/auctions", label: "Auctions" },
  { href: "/app/mam-curves", label: "MAM Curves" },
  { href: "/app/derivatives", label: "Derivatives" },
  { href: "/app/credit", label: "Credit" },
  { href: "/app/ilm-isolated", label: "ILM Isolated" },
  { href: "/app/index", label: "Index" },
  { href: "/app/agents", label: "Agents" },
  { href: "/app/tools", label: "Tools" },
  { href: "/app/faucet", label: "Faucet" },
];

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen grid-bg bg-surface1 text-neutral1 flex flex-col md:flex-row overflow-hidden font-mono">
      {/* SIDEBAR - DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-black/80 backdrop-blur-xl h-screen sticky top-0 shrink-0 z-40">
        <div className="h-20 flex flex-col justify-center px-6 border-b border-white/10 shrink-0">
          <Link href="/" className="font-bold tracking-[0.2em] text-xl text-white hover:text-gray-300 transition-colors">
            EQUALFI_UI
          </Link>
          <span className="text-xs text-gray-500 tracking-widest mt-1">EXECUTION CONSOLE</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2 no-scrollbar">
          {NAV_LINKS.map((link) => {
            const isActive = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center justify-between px-4 py-3 rounded-full text-sm tracking-widest transition-all duration-300 uppercase border ${isActive
                  ? "bg-white/5 text-white font-bold border-accent1/50 shadow-[0_0_15px_rgba(20,241,149,0.4)]"
                  : "text-gray-400 hover:text-white border-transparent hover:bg-white/5 card-glow"
                  }`}
              >
                <span className="ml-2 transition-all">// {link.label}</span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-accent1 shadow-[0_0_10px_#14f195]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* SIDEBAR FOOTER (Socials) */}
        <div className="p-6 border-t border-white/10 shrink-0 bg-black/50">
          <div className="flex items-center justify-between">
            <a href="https://discord.gg/brsMNDux4T" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" aria-label="Discord">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" /></svg>
            </a>
            <a href="https://t.me/EqualFi" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" aria-label="Telegram">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
            </a>
            <a href="https://matrix.to/#/#EqualFiLabs:matrix.org" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" aria-label="Matrix">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.632.55v22.9H2.28V24H0V0h2.28v.55zm7.043 7.26v1.157h.033c.309-.443.683-.784 1.117-1.024.433-.245.936-.365 1.5-.365.54 0 1.033.107 1.481.314.448.208.785.582 1.02 1.108.254-.374.6-.706 1.034-.992.434-.287.95-.43 1.546-.43.453 0 .872.056 1.26.167.388.11.716.286.993.53.276.245.489.559.646.951.152.392.23.863.23 1.417v5.728h-2.349V11.52c0-.286-.01-.559-.032-.812a1.755 1.755 0 0 0-.18-.66 1.106 1.106 0 0 0-.438-.448c-.194-.11-.457-.166-.785-.166-.332 0-.6.064-.803.189a1.38 1.38 0 0 0-.48.499 1.946 1.946 0 0 0-.231.696 5.56 5.56 0 0 0-.06.785v4.768h-2.35v-4.8c0-.254-.004-.503-.018-.752a2.074 2.074 0 0 0-.143-.688 1.052 1.052 0 0 0-.415-.503c-.194-.125-.476-.19-.854-.19-.111 0-.259.024-.439.074-.18.051-.36.143-.53.282-.171.138-.319.337-.439.595-.12.259-.18.6-.18 1.02v4.966H5.46V7.81zm15.693 15.64V.55H21.72V0H24v24h-2.28v-.55z" /></svg>
            </a>
            <a href="https://github.com/EqualFiLabs" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" aria-label="GitHub">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
            </a>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-20 w-full border-b border-white/10 px-4 md:px-8 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex flex-col gap-1.5 w-6 h-6 justify-center"
              aria-label="Open menu"
            >
              <span className="block h-0.5 w-full bg-white" />
              <span className="block h-0.5 w-full bg-white" />
              <span className="block h-0.5 w-full bg-white" />
            </button>
            <div className="md:hidden text-lg font-bold tracking-widest uppercase">EQUALFI</div>

            <h1 className="hidden md:block text-2xl font-bold tracking-widest uppercase text-white">
              {title}
            </h1>
          </div>

          <div className="flex items-center">
            <ConnectButton />
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full pb-20">
          <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto flex flex-col gap-12 w-full min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col md:hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
            <div className="flex flex-col">
              <Link href="/" className="font-bold tracking-[0.2em] text-xl text-white" onClick={() => setMobileMenuOpen(false)}>
                EQUALFI_UI
              </Link>
              <span className="text-xs text-gray-500 tracking-widest mt-1">EXECUTION CONSOLE</span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-white p-2"
              aria-label="Close menu"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-4">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2 pl-2">Navigation</div>
            {NAV_LINKS.map((link) => {
              const isActive = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`relative flex items-center justify-between px-6 py-4 rounded-full text-lg tracking-wider uppercase border ${isActive
                    ? "bg-white/5 text-white font-bold border-accent1/50 shadow-[0_0_20px_rgba(20,241,149,0.4)]"
                    : "text-gray-400 border-transparent card-glow hover:text-white hover:bg-white/5"
                    }`}
                >
                  <span className="ml-2 transition-all">// {link.label}</span>
                  {isActive && (
                    <span className="w-2.5 h-2.5 rounded-full bg-accent1 shadow-[0_0_12px_#14f195]" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
