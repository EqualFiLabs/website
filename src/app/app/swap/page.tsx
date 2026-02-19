"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { ammAuctionAbi, communityAuctionAbi } from "@/lib/abis";
import useActiveChainId from "@/lib/hooks/useActiveChainId";
import useActivePublicClient from "@/lib/hooks/useActivePublicClient";
import { AppShell } from "../../app-shell";
import { StatusLine, TOKENS } from "../../app-components";

export default function SwapPage() {
  const { isConnected, address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const activeChainId = useActiveChainId();
  const publicClient = useActivePublicClient();

  const [swapIn, setSwapIn] = useState(TOKENS[0]);
  const [swapOut, setSwapOut] = useState(TOKENS[1]);
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const [swapAmount, setSwapAmount] = useState("");
  const [swapMinOut, setSwapMinOut] = useState("");
  const [hasManualMinOut, setHasManualMinOut] = useState(false);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<string>("");
  const [autoRoute, setAutoRoute] = useState(true);
  const [expectedOut, setExpectedOut] = useState<string>("");

  const missingContracts = useMemo(() => {
    const missing = [] as string[];
    if (!process.env.NEXT_PUBLIC_DIAMOND_ADDRESS) missing.push("Diamond");
    return missing;
  }, []);

  const canTransact = isConnected && missingContracts.length === 0;

  useEffect(() => {
    const chainParam = activeChainId ? `?chainId=${activeChainId}` : "";
    fetch(`/api/auctions${chainParam}`)
      .then((res) => res.json())
      .then((data) => setAuctions(data.auctions || []))
      .catch(() => setAuctions([]));
  }, [activeChainId]);

  useEffect(() => {
    if (hasManualSelection || !auctions.length) return;
    const first = auctions[0];
    const tokenA = (first.token_a || '').toLowerCase();
    const tokenB = (first.token_b || '').toLowerCase();
    const matchA = TOKENS.find((t) => t.address.toLowerCase() === tokenA);
    const matchB = TOKENS.find((t) => t.address.toLowerCase() === tokenB);
    if (matchA && matchB) {
      setSwapIn(matchA);
      setSwapOut(matchB);
    }
  }, [auctions, hasManualSelection]);

  const eligibleAuctions = useMemo(() => {
    if (!swapIn?.address || !swapOut?.address) return [];
    const inAddr = swapIn.address.toLowerCase();
    const outAddr = swapOut.address.toLowerCase();
    return auctions.filter((a) => {
      const aIn = a.token_a?.toLowerCase();
      const aOut = a.token_b?.toLowerCase();
      return (aIn === inAddr && aOut === outAddr) || (aIn === outAddr && aOut === inAddr);
    });
  }, [auctions, swapIn?.address, swapOut?.address]);

  useEffect(() => {
    const run = async () => {
      if (!publicClient || !swapAmount || Number(swapAmount) <= 0 || eligibleAuctions.length === 0) {
        setExpectedOut("");
        if (!hasManualMinOut) setSwapMinOut("");
        return;
      }
      const pick = autoRoute
        ? eligibleAuctions[0]
        : eligibleAuctions.find((m) => String(m.id) === selectedAuction) || eligibleAuctions[0];

      try {
        const amountInRaw = parseUnits(swapAmount, swapIn.decimals ?? 18);
        const slippageBps = 50n;
        let amountOutRaw = 0n;
        let minOutRaw = 0n;

        if (pick.type === "community") {
          const preview = await publicClient.readContract({
            address: process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`,
            abi: communityAuctionAbi,
            functionName: "previewCommunitySwap",
            args: [BigInt(pick.id), swapIn.address, amountInRaw],
          });
          amountOutRaw = preview.amountOut ?? preview[0] ?? 0n;
          minOutRaw = (amountOutRaw * (10_000n - slippageBps)) / 10_000n;
        } else {
          const preview = await publicClient.readContract({
            address: process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`,
            abi: ammAuctionAbi,
            functionName: "previewSwapWithSlippage",
            args: [BigInt(pick.id), swapIn.address, amountInRaw, Number(slippageBps)],
          });
          amountOutRaw = preview.amountOut ?? preview[0] ?? 0n;
          minOutRaw = preview.minOut ?? preview[2] ?? 0n;
        }

        const outDisplay = formatUnits(amountOutRaw, swapOut.decimals ?? 18);
        const minDisplay = formatUnits(minOutRaw, swapOut.decimals ?? 18);
        setExpectedOut(outDisplay);
        if (!hasManualMinOut) setSwapMinOut(minDisplay);
      } catch {
        setExpectedOut("");
      }
    };

    run();
  }, [swapAmount, swapIn, swapOut, eligibleAuctions, selectedAuction, autoRoute, publicClient, hasManualMinOut]);

  const summary = useMemo(() => {
    if (!swapIn || !swapOut) return "Select tokens to view route";
    if (eligibleAuctions.length === 0) return "No matching auctions for this pair";
    if (!swapAmount) return "Enter amount to preview";
    return `Expected: ${expectedOut || "--"} ${swapOut.symbol} • Min: ${swapMinOut || "--"}`;
  }, [swapAmount, expectedOut, swapMinOut, swapIn, swapOut, eligibleAuctions.length]);

  const buttonDisabled =
    !isConnected ||
    !swapAmount ||
    isPending ||
    !swapIn ||
    !swapOut ||
    eligibleAuctions.length === 0;

  return (
    <AppShell title="Swap">
      {missingContracts.length > 0 && (
        <div className="border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs font-mono text-yellow-200">
          Missing contract addresses: {missingContracts.join(", ")}. Configure in <span className="font-bold">.env</span> to enable onchain actions.
        </div>
      )}
      <section className="flex justify-center">
        <div className="relative w-full max-w-card rounded-2xl border border-surface2 bg-surface1 p-spacing16 shadow-card">
          <div className="space-y-spacing12">
            <div className="flex flex-col">
              <div className="flex flex-col gap-spacing8 rounded-[20px] border border-surface2 bg-surface2 px-spacing16 py-spacing16 transition-colors hover:border-surface2Hovered focus-within:border-surface3 rounded-b-none border-b-0">
                <div className="flex items-center justify-between text-sm text-neutral2">
                  <span className="font-medium text-neutral1">Sell</span>
                </div>
                <div className="flex items-center gap-spacing12">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-3xl font-semibold text-neutral1 outline-none placeholder:text-neutral3"
                  />
                  <div className="relative">
                    <div className="flex shrink-0 items-center gap-spacing8 rounded-full border border-surface3 bg-surface1 px-spacing12 py-spacing8 transition-colors shadow-sm min-h-[44px]">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface2 text-xs font-semibold text-accent1 shadow-inner">
                        {swapIn.symbol.slice(0, 3).toUpperCase()}
                      </span>
                      <span className="whitespace-nowrap text-sm font-semibold text-neutral1">{swapIn.symbol}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <select
                      value={swapIn.symbol}
                      onChange={(e) => {
                        setHasManualSelection(true);
                        setSwapIn(TOKENS.find((t) => t.symbol === e.target.value) || TOKENS[0]);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    >
                      {TOKENS.map((token) => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="relative h-0 z-20">
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setHasManualSelection(true);
                      const tmp = swapIn;
                      setSwapIn(swapOut);
                      setSwapOut(tmp);
                    }}
                    className="z-10 -mt-6 rounded-2xl border-4 border-surface1 bg-surface2 p-spacing8 text-neutral1 shadow-card transition-colors hover:bg-surface2Hovered focus:outline-none focus:ring-2 focus:ring-accent1"
                  >
                    ⇅
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-spacing8 rounded-[20px] border border-surface2 bg-surface2 px-spacing16 py-spacing16 transition-colors hover:border-surface2Hovered focus-within:border-surface3 rounded-t-none">
                <div className="flex items-center justify-between text-sm text-neutral2">
                  <span className="font-medium text-neutral1">Buy</span>
                </div>
                <div className="flex items-center gap-spacing12">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={swapMinOut}
                    onChange={(e) => {
                      setHasManualMinOut(true);
                      setSwapMinOut(e.target.value);
                    }}
                    className="flex-1 min-w-0 bg-transparent text-3xl font-semibold text-neutral1 outline-none placeholder:text-neutral3"
                  />
                  <div className="relative">
                    <div className="flex shrink-0 items-center gap-spacing8 rounded-full border border-surface3 bg-surface1 px-spacing12 py-spacing8 transition-colors shadow-sm min-h-[44px]">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface2 text-xs font-semibold text-accent1 shadow-inner">
                        {swapOut.symbol.slice(0, 3).toUpperCase()}
                      </span>
                      <span className="whitespace-nowrap text-sm font-semibold text-neutral1">{swapOut.symbol}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <select
                      value={swapOut.symbol}
                      onChange={(e) => {
                        setHasManualSelection(true);
                        setSwapOut(TOKENS.find((t) => t.symbol === e.target.value) || TOKENS[1]);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    >
                      {TOKENS.map((token) => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-surface2 bg-surface2 px-spacing12 py-spacing10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-neutral1">Pricing</div>
                  <div className="text-xs text-neutral2">
                    {autoRoute ? "Best price automatically" : "Manual auction selection"}
                  </div>
                </div>
                <label className="flex items-center gap-spacing8 text-sm font-semibold text-neutral1">
                  <input
                    type="checkbox"
                    checked={autoRoute}
                    onChange={(e) => setAutoRoute(e.target.checked)}
                    className="h-4 w-4 accent-accent1"
                  />
                  Auto route
                </label>
              </div>

              {!autoRoute && (
                <div className="mt-spacing10">
                  <select
                    value={selectedAuction}
                    onChange={(e) => setSelectedAuction(e.target.value)}
                    className="w-full rounded-xl border border-surface3 bg-surface1 px-spacing12 py-spacing8 text-sm text-neutral1 focus:outline-none focus:ring-2 focus:ring-accent1"
                  >
                    {eligibleAuctions.map((auction) => (
                      <option key={`${auction.type}-${auction.id}`} value={auction.id}>
                        Auction {auction.id} — Fee {auction.fee_bps}
                      </option>
                    ))}
                  </select>

                  <div className="mt-spacing8 space-y-spacing6 text-xs text-neutral2">
                    {eligibleAuctions.map((auction) => (
                      <div
                        key={`${auction.type}-${auction.id}-row`}
                        className={[
                          "flex justify-between rounded-xl border px-spacing10 py-spacing8",
                          String(auction.id) === selectedAuction ? "border-accent1" : "border-surface3",
                        ].join(" ")}
                      >
                        <span>
                          Auction {auction.id} • Reserves {auction.reserve_a ?? "—"} / {auction.reserve_b ?? "—"}
                        </span>
                        <span>Fee {auction.fee_bps}bps</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-surface2 bg-surface2 px-spacing12 py-spacing10 text-sm text-neutral1">
              {summary}
            </div>

            <button
              type="button"
              onClick={() => {
                const amountIn = parseUnits(swapAmount || "0", swapIn.decimals);
                const minOut = parseUnits((swapMinOut || expectedOut || "0"), swapOut.decimals);
                if (!eligibleAuctions.length) return;
                const pick = autoRoute
                  ? eligibleAuctions[0]
                  : eligibleAuctions.find((m) => String(m.id) === selectedAuction) || eligibleAuctions[0];
                const isCommunity = pick.type === "community";
                writeContract({
                  address: process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`,
                  abi: isCommunity ? communityAuctionAbi : ammAuctionAbi,
                  functionName: isCommunity ? "swapExactIn" : "swapExactInOrFinalize",
                  args: [
                    BigInt(pick.id),
                    swapIn.address,
                    amountIn,
                    amountIn,
                    minOut,
                    address,
                  ],
                  value: swapIn.address === "0x0000000000000000000000000000000000000000" ? amountIn : undefined,
                });
              }}
              disabled={buttonDisabled}
              className={[
                "w-full rounded-full px-spacing12 py-spacing12 text-center text-sm font-semibold transition-colors min-h-[44px]",
                buttonDisabled ? "bg-surface3 text-neutral3" : "bg-accent1 text-ink hover:bg-accent1Hovered",
              ].join(" ")}
            >
              Swap
            </button>
            <StatusLine text={!isConnected ? "Connect wallet to execute swaps." : undefined} />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
