"use client";

import Link from "next/link";
import { AppShell } from "../app-shell";
import { Card, SectionHeader } from "../app-components";

export default function AppIndex() {
  return (
    <AppShell title="EqualFi Execution Layer">
      <p className="text-sm text-gray-400 font-mono max-w-2xl">
        Choose an execution surface.
      </p>
      <section className="grid gap-6 md:grid-cols-6">
        <Link href="/app/position" className="h-full md:col-span-2">
          <Card>
            <SectionHeader title="POSITION" subtitle="NFT management" />
            <p className="text-xs font-mono text-gray-400 mt-4">
              Mint, deposit, withdraw, borrow, repay.
            </p>
          </Card>
        </Link>
        <Link href="/app/swap" className="h-full md:col-span-2">
          <Card>
            <SectionHeader title="SWAP" subtitle="Unified AMM auctions" />
            <p className="text-xs font-mono text-gray-400 mt-4">
              Execute swaps with auto‑routing across solo + community auctions.
            </p>
          </Card>
        </Link>
        <Link href="/app/auctions" className="h-full md:col-span-2">
          <Card>
            <SectionHeader title="AUCTIONS" subtitle="Create + manage" />
            <p className="text-xs font-mono text-gray-400 mt-4">
              Launch auctions and manage liquidity pools.
            </p>
          </Card>
        </Link>
        <Link href="/app/credit" className="h-full md:col-span-2 md:col-start-2">
          <Card>
            <SectionHeader title="CREDIT" subtitle="Borrowing console" />
            <p className="text-xs font-mono text-gray-400 mt-4">
              Self‑secured borrowing flows.
            </p>
          </Card>
        </Link>
        <Link href="/app/index" className="h-full md:col-span-2 md:col-start-4">
          <Card>
            <SectionHeader title="INDEX" subtitle="Mint + burn" />
            <p className="text-xs font-mono text-gray-400 mt-4">
              EqualFi index issuance console.
            </p>
          </Card>
        </Link>
      </section>
    </AppShell>
  );
}
