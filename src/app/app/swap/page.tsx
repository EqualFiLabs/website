"use client";
import type { PoolConfig, Auction, PositionNFT, TokenInfo, ParticipatingPosition } from '@/types'

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import useBufferedWriteContract from '@/lib/hooks/useBufferedWriteContract'
import { formatUnits, parseUnits } from "viem";
import { ammAuctionAbi, communityAuctionAbi } from "@/lib/abis";
import { derivativeViewFacetAbi } from "@/lib/abis/derivativeViewFacet";
import useActiveChainId from "@/lib/hooks/useActiveChainId";
import useActivePublicClient from "@/lib/hooks/useActivePublicClient";
import usePoolsConfig from "@/lib/hooks/usePoolsConfig";
import { tokensFromConfig } from "@/lib/tokens";
import { AppShell } from "../../app-shell";
import { StatusLine } from "../../app-components";

export default function SwapPage() {
  const { isConnected, address } = useAccount();
  const { writeContract, isPending } = useBufferedWriteContract();
  const activeChainId = useActiveChainId();
  const publicClient = useActivePublicClient();
  const poolsConfig = usePoolsConfig();
  const tokens = useMemo(() => tokensFromConfig(poolsConfig), [poolsConfig]);
  const defaultIn = tokens[0] || { symbol: "", address: "", decimals: 18 };
  const defaultOut = tokens[1] || { symbol: "", address: "", decimals: 18 };

  const [swapIn, setSwapIn] = useState<any>(defaultIn);
  const [swapOut, setSwapOut] = useState<any>(defaultOut);
  const [hasManualSelection, setHasManualSelection] = useState<boolean>(false);
  const [swapAmount, setSwapAmount] = useState<any>("");
  const [swapMinOut, setSwapMinOut] = useState<any>("");
  const [hasManualMinOut, setHasManualMinOut] = useState<boolean>(false);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [onchainAuctions, setOnchainAuctions] = useState<any[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<string>("");
  const [bestAuction, setBestAuction] = useState<any>(null);
  const [autoRoute, setAutoRoute] = useState<boolean>(true);
  const [expectedOut, setExpectedOut] = useState<string>("");

  const missingContracts = useMemo(() => {
    const missing = [] as string[];
    if (!process.env.NEXT_PUBLIC_DIAMOND_ADDRESS) missing.push("Diamond");
    return missing;
  }, []);

  const canTransact = isConnected && missingContracts.length === 0;

  useEffect(() => {
    let cancelled = false;
    const fetchAuctions = () => {
      const chainParam = activeChainId ? `?chainId=${activeChainId}` : "";
      const cacheBuster = `${chainParam ? '&' : '?'}t=${Date.now()}`;
      fetch(`/api/auctions${chainParam}${cacheBuster}`)
        .then((res: Response) => res.json())
        .then((data: any) => {
          if (!cancelled) {
            console.log('[DEBUG] Auctions fetched:', data.auctions?.length, data.auctions);
            setAuctions(data.auctions || []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            console.log('[DEBUG] Auctions fetch failed');
            setAuctions([]);
          }
        });
    };
    fetchAuctions();
    const id = setInterval(fetchAuctions, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeChainId]);

  useEffect(() => {
    const run = async () => {
      if (!publicClient || !swapIn?.address || !swapOut?.address) {
        setOnchainAuctions([]);
        return;
      }
      try {
        const [ids] = (await publicClient!.readContract({
          address: process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`,
          abi: derivativeViewFacetAbi,
          functionName: "getAuctionsByPair",
          args: [swapIn.address, swapOut.address, BigInt(0), BigInt(20)],
        })) as [bigint[]];
        const uniqueIds = Array.from(new Set((ids || []).map((id: bigint) => Number(id))))
        if (!uniqueIds.length) {
          setOnchainAuctions([]);
          return;
        }
        const auctions = await Promise.all(
          uniqueIds.map(async (id: number) => {
            const a: any = await publicClient!.readContract({
              address: process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`,
              abi: derivativeViewFacetAbi,
              functionName: "getAmmAuction",
              args: [BigInt(id)],
            });
            return {
              id,
              type: "solo",
              token_a: a.tokenA ?? a[4],
              token_b: a.tokenB ?? a[5],
              reserve_a: a.reserveA ?? a[6],
              reserve_b: a.reserveB ?? a[7],
              fee_bps: a.feeBps ?? a[13],
              active: a.active ?? a[19],
              finalized: a.finalized ?? a[20],
            };
          })
        );
        setOnchainAuctions(auctions.filter(Boolean));
      } catch {
        setOnchainAuctions([]);
      }
    };
    run();
  }, [publicClient, swapIn?.address, swapOut?.address]);

  useEffect(() => {
    if (!tokens.length) return;
    if (!swapIn?.address && tokens[0]) {
      console.log('[DEBUG] Setting swapIn from tokens[0]:', tokens[0]);
      setSwapIn(tokens[0]);
    }
    if (!swapOut?.address && tokens[1]) {
      console.log('[DEBUG] Setting swapOut from tokens[1]:', tokens[1]);
      setSwapOut(tokens[1]);
    }
  }, [tokens, swapIn?.address, swapOut?.address]);

  useEffect(() => {
    if (hasManualSelection || !auctions.length) return;
    const first = auctions[0];
    const tokenA = (first.token_a || '').toLowerCase();
    const tokenB = (first.token_b || '').toLowerCase();
    const matchA = tokens.find((t: TokenInfo) => t.address.toLowerCase() === tokenA);
    const matchB = tokens.find((t: TokenInfo) => t.address.toLowerCase() === tokenB);
    if (matchA && matchB) {
      setSwapIn(matchA);
      setSwapOut(matchB);
    }
  }, [auctions, hasManualSelection, tokens]);

  const eligibleAuctions = useMemo(() => {
    console.log('[DEBUG] Computing eligibleAuctions:', {
      swapInAddress: swapIn?.address,
      swapOutAddress: swapOut?.address,
      auctionCount: (auctions.length + onchainAuctions.length),
      auctions,
      onchainAuctions,
    });

    if (!swapIn?.address || !swapOut?.address) {
      console.log('[DEBUG] Early return - swapIn/swapOut undefined');
      return [];
    }
    const inAddr = swapIn.address.toLowerCase();
    const outAddr = swapOut.address.toLowerCase();
    const source = auctions.length ? auctions : onchainAuctions;
    
    console.log('[DEBUG] Filtering auctions:', {
      inAddr,
      outAddr,
      sourceLength: source.length,
      sampleAuction: source[0],
    });
    
    const result = source.filter((a: any) => {
      const aIn = a.token_a?.toLowerCase();
      const aOut = a.token_b?.toLowerCase();
      const isActive = a.active !== false && a.finalized !== true;
      const matchesTokens = (aIn === inAddr && aOut === outAddr) || (aIn === outAddr && aOut === inAddr);
      
      console.log('[DEBUG] Auction filter check:', {
        auctionId: a.id,
        aIn,
        aOut,
        isActive,
        matchesTokens,
        passes: matchesTokens && isActive,
      });
      
      return matchesTokens && isActive;
    });
    console.log('[DEBUG] eligibleAuctions result:', result.length, 'found');
    return result;
  }, [auctions, onchainAuctions, swapIn?.address, swapOut?.address]);

  useEffect(() => {
    const run = async () => {
      console.log('[DEBUG] Preview run:', {
        publicClient: !!publicClient,
        swapAmount,
        swapAmountNum: Number(swapAmount),
        swapIn,
        swapOut,
        eligibleAuctionsLength: eligibleAuctions.length,
        auctionsLength: auctions.length,
        onchainAuctionsLength: onchainAuctions.length,
      });

      if (!publicClient || !swapAmount || Number(swapAmount) <= 0 || eligibleAuctions.length === 0) {
        console.log('[DEBUG] Early return - not enough data');
        setExpectedOut("");
        if (!hasManualMinOut) setSwapMinOut("");
        return;
      }

      let pick;
      if (autoRoute) {
        // Find best price by previewing all eligible auctions
        const amountInRaw = parseUnits(swapAmount, swapIn.decimals ?? 18);
        let bestAuction = eligibleAuctions[0];
        let bestOutput = BigInt(0);

        for (const auction of eligibleAuctions) {
          try {
            let amountOutRaw = BigInt(0);
            if (auction.type === "community") {
              const preview = await publicClient!.readContract({
                address: process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`,
                abi: communityAuctionAbi,
                functionName: "previewCommunitySwap",
                args: [BigInt(auction.id), swapIn.address, amountInRaw],
              });
              amountOutRaw = preview[0] ?? BigInt(0);
            } else {
              const preview = await publicClient!.readContract({
                address: process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`,
                abi: ammAuctionAbi,
                functionName: "previewSwap",
                args: [BigInt(auction.id), swapIn.address, amountInRaw],
              });
              amountOutRaw = preview[0] ?? BigInt(0);
            }
            if (amountOutRaw > bestOutput) {
              bestOutput = amountOutRaw;
              bestAuction = auction;
            }
          } catch (err) {
            console.log('[DEBUG] Preview failed for auction', auction.id, err);
          }
        }
        pick = bestAuction;
        setBestAuction(bestAuction);
      } else {
        pick = eligibleAuctions.find((m: any) => String(m.id) === selectedAuction) || eligibleAuctions[0];
      }

      console.log('[DEBUG] Selected auction:', {
        id: pick.id,
        type: pick.type,
        token_a: pick.token_a,
        token_b: pick.token_b,
        reserve_a: pick.reserve_a,
        reserve_b: pick.reserve_b,
      });

      try {
        const amountInRaw = parseUnits(swapAmount, swapIn.decimals ?? 18);
        const slippageBps = BigInt(50);
        let amountOutRaw = BigInt(0);
        let minOutRaw = BigInt(0);

        console.log('[DEBUG] Preview params:', {
          tokenIn: swapIn.address,
          swapInSymbol: swapIn.symbol,
          amountInRaw,
          decimals: swapIn.decimals,
        });

        if (pick.type === "community") {
          const preview = await publicClient!.readContract({
            address: process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`,
            abi: communityAuctionAbi,
            functionName: "previewCommunitySwap",
            args: [BigInt(pick.id), swapIn.address, amountInRaw],
          });
          amountOutRaw = preview[0] ?? BigInt(0);
          minOutRaw = (amountOutRaw * (BigInt(10000) - slippageBps)) / BigInt(10000);
        } else {
          const preview = await publicClient!.readContract({
            address: process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`,
            abi: ammAuctionAbi,
            functionName: "previewSwap",
            args: [BigInt(pick.id), swapIn.address, amountInRaw],
          });
          amountOutRaw = preview[0] ?? BigInt(0);
          minOutRaw = (amountOutRaw * (BigInt(10000) - slippageBps)) / BigInt(10000);
        }

        const outDisplay = formatUnits(amountOutRaw, swapOut.decimals ?? 18);
        const minDisplay = formatUnits(minOutRaw, swapOut.decimals ?? 18);
        console.log('[DEBUG] Preview result:', { amountOutRaw, outDisplay, minDisplay });
        setExpectedOut(outDisplay);
        if (!hasManualMinOut) setSwapMinOut(minDisplay);
      } catch (err) {
        console.log('[DEBUG] Preview failed:', err);
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSwapAmount(e.target.value)}
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        setHasManualSelection(true);
                        setSwapIn(tokens.find((t: TokenInfo) => t.symbol === e.target.value) || tokens[0]);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer [&>option]:text-black [&>option]:bg-white"
                    >
                      {tokens.map((token: TokenInfo) => (
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        setHasManualSelection(true);
                        setSwapOut(tokens.find((t: TokenInfo) => t.symbol === e.target.value) || tokens[1]);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer [&>option]:text-black [&>option]:bg-white"
                    >
                      {tokens.map((token: TokenInfo) => (
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoRoute(e.target.checked)}
                    className="h-4 w-4 accent-accent1"
                  />
                  Auto route
                </label>
              </div>

              {!autoRoute && (
                <div className="mt-spacing10">
                  <select
                    value={selectedAuction}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedAuction(e.target.value)}
                    className="w-full rounded-xl border border-surface3 bg-surface1 px-spacing12 py-spacing8 text-sm text-neutral1 focus:outline-none focus:ring-2 focus:ring-accent1"
                  >
                    {eligibleAuctions.map((auction: any) => (
                      <option key={`${auction.type}-${auction.id}`} value={auction.id}>
                        Auction {auction.id} — Fee {auction.fee_bps}
                      </option>
                    ))}
                  </select>

                  <div className="mt-spacing8 space-y-spacing6 text-xs text-neutral2">
                    {eligibleAuctions.map((auction: any) => (
                      <div
                        key={`${auction.type}-${auction.id}-row`}
                        className={[
                          "flex justify-between items-center rounded-xl border px-spacing10 py-spacing8 min-h-[44px]",
                          String(auction.id) === selectedAuction ? "border-accent1" : "border-surface3",
                        ].join(" ")}
                      >
                        <span>
                          Auction {auction.id} ({auction.type}) • Reserves {auction.reserve_a ?? "—"} / {auction.reserve_b ?? "—"}
                        </span>
                        <span className="whitespace-nowrap">Fee {auction.fee_bps}bps</span>
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
                  ? (bestAuction || eligibleAuctions[0])
                  : eligibleAuctions.find((m: any) => String(m.id) === selectedAuction) || eligibleAuctions[0];
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
                    address!,
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
