"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="min-h-screen grid-bg bg-surface1 text-neutral1">
      <header className="border-b border-white/15 p-4 flex items-center justify-between sticky top-0 bg-black z-50">
        <div className="flex items-center gap-6">
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
          </nav>
        </div>
        <ConnectButton />
      </header>

      <main className="px-4 md:px-12 py-10 max-w-6xl mx-auto flex flex-col gap-12">
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
