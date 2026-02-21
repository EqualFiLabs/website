"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen grid-bg bg-surface1 text-neutral1 overflow-x-hidden">
      <header className="w-full border-b border-white/15 p-4 flex items-center justify-between sticky top-0 bg-black z-50">
        <div className="flex items-center gap-6 min-w-0">
          {/* Hamburger Menu Button - Mobile Only */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col gap-1.5 w-6 h-6 justify-center"
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-full bg-white transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 w-full bg-white transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-full bg-white transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>

          <Link href="/" className="font-bold tracking-widest text-lg">
            EQUALFI_UI
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-xs font-mono text-gray-400 uppercase tracking-[0.2em]">
            <Link href="/app/position" className="hover:text-white">
              Position
            </Link>
            <Link href="/app/swap" className="hover:text-white">
              Swap
            </Link>
            <Link href="/app/auctions" className="hover:text-white">
              Auctions
            </Link>
            <Link href="/app/credit" className="hover:text-white">
              Credit
            </Link>
            <Link href="/app/index" className="hover:text-white">
              Index
            </Link>
            <Link href="/app/agents" className="hover:text-white">
              Agents
            </Link>
            <Link href="/app/faucet" className="hover:text-white">
              Faucet
            </Link>
          </nav>
        </div>
        <ConnectButton />
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black z-40 md:hidden flex flex-col items-center justify-between py-20 pt-32">
          <nav className="flex flex-col items-center gap-6 text-2xl font-mono text-gray-400 uppercase tracking-[0.2em]">
            <Link href="/app/position" className="hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              Position
            </Link>
            <Link href="/app/swap" className="hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              Swap
            </Link>
            <Link href="/app/auctions" className="hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              Auctions
            </Link>
            <Link href="/app/credit" className="hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              Credit
            </Link>
            <Link href="/app/index" className="hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              Index
            </Link>
            <Link href="/app/agents" className="hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              Agents
            </Link>
            <Link href="/app/faucet" className="hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              Faucet
            </Link>
          </nav>

          {/* Social Media Icons */}
          <div className="flex items-center gap-6">
            <a href="https://discord.gg/brsMNDux4T" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
            <a href="https://t.me/EqualFi" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </a>
            <a href="https://matrix.to/#/#EqualFiLabs:matrix.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.632.55v22.9H2.28V24H0V0h2.28v.55zm7.043 7.26v1.157h.033c.309-.443.683-.784 1.117-1.024.433-.245.936-.365 1.5-.365.54 0 1.033.107 1.481.314.448.208.785.582 1.02 1.108.254-.374.6-.706 1.034-.992.434-.287.95-.43 1.546-.43.453 0 .872.056 1.26.167.388.11.716.286.993.53.276.245.489.559.646.951.152.392.23.863.23 1.417v5.728h-2.349V11.52c0-.286-.01-.559-.032-.812a1.755 1.755 0 0 0-.18-.66 1.106 1.106 0 0 0-.438-.448c-.194-.11-.457-.166-.785-.166-.332 0-.6.064-.803.189a1.38 1.38 0 0 0-.48.499 1.946 1.946 0 0 0-.231.696 5.56 5.56 0 0 0-.06.785v4.768h-2.35v-4.8c0-.254-.004-.503-.018-.752a2.074 2.074 0 0 0-.143-.688 1.052 1.052 0 0 0-.415-.503c-.194-.125-.476-.19-.854-.19-.111 0-.259.024-.439.074-.18.051-.36.143-.53.282-.171.138-.319.337-.439.595-.12.259-.18.6-.18 1.02v4.966H5.46V7.81zm15.693 15.64V.55H21.72V0H24v24h-2.28v-.55z"/>
              </svg>
            </a>
            <a href="https://github.com/EqualFiLabs" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      )}

      <main className="px-4 md:px-12 py-10 max-w-6xl mx-auto flex flex-col gap-12 min-w-0">
        {title && (
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight">{title}</h1>
            <p className="text-sm text-gray-400 font-mono max-w-2xl">
              EqualFi execution console.
            </p>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
