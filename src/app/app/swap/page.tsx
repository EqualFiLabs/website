"use client";
import type { TokenInfo } from '@/types'

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import useBufferedWriteContract from '@/lib/hooks/useBufferedWriteContract'
import { formatUnits, parseUnits } from "viem";
import { ammAuctionAbi, communityAuctionAbi } from "@/lib/abis";
import { mamCurveViewAbi, mamCurveExecutionAbi } from "@/lib/abis/mamCurveFacet";
import { derivativeViewFacetAbi } from "@/lib/abis/derivativeViewFacet";
import useActiveChainId from "@/lib/hooks/useActiveChainId";
import useActivePublicClient from "@/lib/hooks/useActivePublicClient";
import usePoolsConfig from "@/lib/hooks/usePoolsConfig";
import useProtocolAddresses from "@/lib/hooks/useProtocolAddresses";
import { isMamSwapRouteActive, pickSwapRouteKind, shouldCompareMamOnSwap } from "@/lib/mamRouting";
import { tokensFromConfig } from "@/lib/tokens";
import { AppShell } from "../../app-shell";
import { StatusLine } from "../../app-components";

type SwapToken = {
  address: string;
  symbol: string;
  decimals: number;
};

type SwapAuction = {
  id: number;
  type: string;
  token_a: string;
  token_b: string;
  reserve_a?: unknown;
  reserve_b?: unknown;
  fee_bps?: unknown;
  active?: boolean;
  finalized?: boolean;
};

type SelectedRoute =
  | { kind: "auction" }
  | { kind: "mam"; curveId: bigint }
  | null;

type CurveFillView = {
  baseIsA?: boolean;
  tokenA?: string;
  tokenB?: string;
  [key: number]: unknown;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const toSwapToken = (token: Partial<SwapToken> | undefined): SwapToken => ({
  address: token?.address || "",
  symbol: token?.symbol || "",
  decimals: token?.decimals ?? 18,
});

export default function SwapPage() {
  const { isConnected, address } = useAccount();
  const { writeContract, isPending } = useBufferedWriteContract();
  const activeChainId = useActiveChainId();
  const publicClient = useActivePublicClient();
  const poolsConfig = usePoolsConfig();
  const { diamondAddress } = useProtocolAddresses();
  const tokens = useMemo(() => tokensFromConfig(poolsConfig) as SwapToken[], [poolsConfig]);
  const defaultIn = toSwapToken(tokens[0]);
  const defaultOut = toSwapToken(tokens[1]);

  const [swapIn, setSwapIn] = useState<SwapToken>(defaultIn);
  const [swapOut, setSwapOut] = useState<SwapToken>(defaultOut);
  const [hasManualSelection, setHasManualSelection] = useState<boolean>(false);
  const [swapAmount, setSwapAmount] = useState<string>("");
  const [swapMinOut, setSwapMinOut] = useState<string>("");
  const [hasManualMinOut, setHasManualMinOut] = useState<boolean>(false);
  const [auctions, setAuctions] = useState<SwapAuction[]>([]);
  const [onchainAuctions, setOnchainAuctions] = useState<SwapAuction[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<string>("");
  const [bestAuction, setBestAuction] = useState<SwapAuction | null>(null);
  const [autoRoute, setAutoRoute] = useState<boolean>(true);
  const [expectedOut, setExpectedOut] = useState<string>("");

  // MAM Curve integration
  const [includeMamCurves, setIncludeMamCurves] = useState<boolean>(false);
  const [mamCurveIds, setMamCurveIds] = useState<bigint[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute>(null);

  const missingContracts = useMemo(() => {
    const missing = [] as string[];
    if (!diamondAddress) missing.push("Diamond");
    return missing;
  }, [diamondAddress]);

  useEffect(() => {
    let cancelled = false;
    const fetchAuctions = () => {
      const chainParam = activeChainId ? `?chainId=${activeChainId}` : "";
      const cacheBuster = `${chainParam ? '&' : '?'}t=${Date.now()}`;
      fetch(`/api/auctions${chainParam}${cacheBuster}`)
        .then((res: Response) => res.json())
        .then((data: { auctions?: SwapAuction[] }) => {
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
      if (!publicClient || !diamondAddress || !swapIn?.address || !swapOut?.address) {
        setOnchainAuctions([]);
        return;
      }
      try {
        const [ids] = (await publicClient!.readContract({
          address: diamondAddress as `0x${string}`,
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
            const a = await publicClient!.readContract({
              address: diamondAddress as `0x${string}`,
              abi: derivativeViewFacetAbi,
              functionName: "getAmmAuction",
              args: [BigInt(id)],
            }) as Record<string, unknown> & unknown[];
            return {
              id,
              type: "solo",
              token_a: String(a.tokenA ?? a[4] ?? ""),
              token_b: String(a.tokenB ?? a[5] ?? ""),
              reserve_a: a.reserveA ?? a[6],
              reserve_b: a.reserveB ?? a[7],
              fee_bps: a.feeBps ?? a[13],
              active: Boolean(a.active ?? a[19]),
              finalized: Boolean(a.finalized ?? a[20]),
            };
          })
        );
        setOnchainAuctions(auctions.filter(Boolean));
      } catch {
        setOnchainAuctions([]);
      }
    };
    run();
  }, [publicClient, diamondAddress, swapIn?.address, swapOut?.address]);

  // Fetch MAM curves for the selected pair when toggle is on
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!includeMamCurves || !publicClient || !diamondAddress || !swapIn?.address || !swapOut?.address) {
        if (!cancelled) setMamCurveIds([]);
        return;
      }
      try {
        const [ids] = (await publicClient.readContract({
          address: diamondAddress as `0x${string}`,
          abi: mamCurveViewAbi,
          functionName: "getCurvesByPair",
          args: [swapIn.address, swapOut.address, BigInt(0), BigInt(20)],
        })) as [bigint[]];
        if (!cancelled) setMamCurveIds(ids || []);
      } catch {
        if (!cancelled) setMamCurveIds([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [includeMamCurves, publicClient, diamondAddress, swapIn?.address, swapOut?.address]);

  useEffect(() => {
    const run = () => {
      if (!tokens.length) return;
      if (!swapIn?.address && tokens[0]) {
        console.log('[DEBUG] Setting swapIn from tokens[0]:', tokens[0]);
        setSwapIn(toSwapToken(tokens[0]));
      }
      if (!swapOut?.address && tokens[1]) {
        console.log('[DEBUG] Setting swapOut from tokens[1]:', tokens[1]);
        setSwapOut(toSwapToken(tokens[1]));
      }
    };
    run();
  }, [tokens, swapIn?.address, swapOut?.address]);

  useEffect(() => {
    const run = () => {
      if (hasManualSelection || !auctions.length) return;
      const first = auctions[0];
      const tokenA = (first.token_a || '').toLowerCase();
      const tokenB = (first.token_b || '').toLowerCase();
      const matchA = tokens.find((t: TokenInfo) => t.address.toLowerCase() === tokenA);
      const matchB = tokens.find((t: TokenInfo) => t.address.toLowerCase() === tokenB);
      if (matchA && matchB) {
        setSwapIn(toSwapToken(matchA));
        setSwapOut(toSwapToken(matchB));
      }
    };
    run();
  }, [auctions, hasManualSelection, tokens]);

  const swapInAddress = swapIn.address || "";
  const swapOutAddress = swapOut.address || "";

  const eligibleAuctions = useMemo(() => {
    console.log('[DEBUG] Computing eligibleAuctions:', {
      swapInAddress,
      swapOutAddress,
      auctionCount: (auctions.length + onchainAuctions.length),
      auctions,
      onchainAuctions,
    });

    if (!swapInAddress || !swapOutAddress) {
      console.log('[DEBUG] Early return - swapIn/swapOut undefined');
      return [];
    }
    const inAddr = swapInAddress.toLowerCase();
    const outAddr = swapOutAddress.toLowerCase();
    const source = auctions.length ? auctions : onchainAuctions;
    
    console.log('[DEBUG] Filtering auctions:', {
      inAddr,
      outAddr,
      sourceLength: source.length,
      sampleAuction: source[0],
    });
    
    const result = source.filter((a: SwapAuction) => {
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
  }, [auctions, onchainAuctions, swapInAddress, swapOutAddress]);

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

      if (!publicClient || !diamondAddress || !swapAmount || Number(swapAmount) <= 0 || eligibleAuctions.length === 0) {
        console.log('[DEBUG] Early return - not enough data');
        setExpectedOut("");
        if (!hasManualMinOut) setSwapMinOut("");
        setBestAuction(null);
        setSelectedRoute(null);
        return;
      }

      try {
        const amountInRaw = parseUnits(swapAmount, swapIn.decimals ?? 18);
        const slippageBps = BigInt(50);
        let pick = eligibleAuctions[0];
        let auctionBestOut = BigInt(0);

        const previewAuction = async (auction: SwapAuction): Promise<bigint> => {
          if (auction.type === "community") {
            const preview = await publicClient.readContract({
              address: diamondAddress as `0x${string}`,
              abi: communityAuctionAbi,
              functionName: "previewCommunitySwap",
              args: [BigInt(auction.id), swapIn.address, amountInRaw],
            });
            return preview[0] ?? BigInt(0);
          }
          const preview = await publicClient.readContract({
            address: diamondAddress as `0x${string}`,
            abi: ammAuctionAbi,
            functionName: "previewSwap",
            args: [BigInt(auction.id), swapIn.address, amountInRaw],
          });
          return preview[0] ?? BigInt(0);
        };

        if (autoRoute) {
          let bestAuction = eligibleAuctions[0];
          let bestOutput = BigInt(0);
          for (const auction of eligibleAuctions) {
            try {
              const amountOutRaw = await previewAuction(auction);
              if (amountOutRaw > bestOutput) {
                bestOutput = amountOutRaw;
                bestAuction = auction;
              }
            } catch (err) {
              console.log('[DEBUG] Preview failed for auction', auction.id, err);
            }
          }
          pick = bestAuction;
          auctionBestOut = bestOutput;
          setBestAuction(bestAuction);
        } else {
          pick = eligibleAuctions.find((m) => String(m.id) === selectedAuction) || eligibleAuctions[0];
          setBestAuction(pick);
          auctionBestOut = await previewAuction(pick);
        }

        console.log('[DEBUG] Selected auction:', {
          id: pick.id,
          type: pick.type,
          token_a: pick.token_a,
          token_b: pick.token_b,
          reserve_a: pick.reserve_a,
          reserve_b: pick.reserve_b,
        });

        let mamBest = null;
        let mamBestOutput = BigInt(0);
        if (shouldCompareMamOnSwap(autoRoute, includeMamCurves) && mamCurveIds.length > 0) {
          const fillAmounts = mamCurveIds.map(() => amountInRaw);
          try {
            const [outs, , oks] = (await publicClient.readContract({
              address: diamondAddress as `0x${string}`,
              abi: mamCurveViewAbi,
              functionName: "quoteCurvesExactInBatch",
              args: [mamCurveIds, fillAmounts],
            })) as [bigint[], bigint[], boolean[]];
            for (let i = 0; i < mamCurveIds.length; i++) {
              if (oks[i] && outs[i] > mamBestOutput) {
                mamBestOutput = outs[i];
                mamBest = { curveId: mamCurveIds[i], amountOut: outs[i] };
              }
            }
          } catch (err) {
            console.log('[DEBUG] MAM batch quote failed', err);
          }
        }
        console.log('[DEBUG] Preview params:', {
          tokenIn: swapIn.address,
          swapInSymbol: swapIn.symbol,
          amountInRaw,
          decimals: swapIn.decimals,
        });

        const routeKind = pickSwapRouteKind({
          autoRoute,
          includeMamCurves,
          auctionAmountOut: auctionBestOut,
          mamAmountOut: mamBest?.amountOut,
        });
        if (routeKind === "mam" && mamBest) {
          const mamOutDisplay = formatUnits(mamBest.amountOut, swapOut.decimals ?? 18);
          const mamMinRaw = (mamBest.amountOut * (BigInt(10000) - slippageBps)) / BigInt(10000);
          const mamMinDisplay = formatUnits(mamMinRaw, swapOut.decimals ?? 18);
          setSelectedRoute({ kind: "mam", curveId: mamBest.curveId });
          setExpectedOut(mamOutDisplay);
          if (!hasManualMinOut) setSwapMinOut(mamMinDisplay);
        } else {
          const minOutRaw = (auctionBestOut * (BigInt(10000) - slippageBps)) / BigInt(10000);
          const outDisplay = formatUnits(auctionBestOut, swapOut.decimals ?? 18);
          const minDisplay = formatUnits(minOutRaw, swapOut.decimals ?? 18);
          console.log('[DEBUG] Preview result:', { amountOutRaw: auctionBestOut, outDisplay, minDisplay });
          setSelectedRoute({ kind: "auction" });
          setExpectedOut(outDisplay);
          if (!hasManualMinOut) setSwapMinOut(minDisplay);
        }
      } catch (err) {
        console.log('[DEBUG] Preview failed:', err);
        setExpectedOut("");
        setSelectedRoute(null);
      }
    };

    run();
  }, [swapAmount, swapIn, swapOut, eligibleAuctions, selectedAuction, autoRoute, publicClient, diamondAddress, hasManualMinOut, includeMamCurves, mamCurveIds, auctions.length, onchainAuctions.length]);

  const mamRouteActive = isMamSwapRouteActive(selectedRoute?.kind, autoRoute, includeMamCurves);
  const summary = useMemo(() => {
    if (!swapIn || !swapOut) return "Select tokens to view route";
    if (eligibleAuctions.length === 0) return "No matching auctions for this pair";
    if (!swapAmount) return "Enter amount to preview";
    const routeLabel = mamRouteActive ? " • via MAM Curve" : "";
    return `Expected: ${expectedOut || "--"} ${swapOut.symbol} • Min: ${swapMinOut || "--"}${routeLabel}`;
  }, [swapAmount, expectedOut, swapMinOut, swapIn, swapOut, eligibleAuctions.length, mamRouteActive]);

  const buttonDisabled =
    !isConnected ||
    !swapAmount ||
    isPending ||
    !diamondAddress ||
    !swapIn ||
    !swapOut ||
    eligibleAuctions.length === 0;

  return (
    <AppShell title="Swap">
      {missingContracts.length > 0 && (
        <div className="border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs font-mono text-yellow-200">
          Missing contract addresses: {missingContracts.join(", ")}. Configure
          <span className="font-bold"> NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY / ROBINHOOD_TESTNET / TESTNET</span> to
          enable onchain actions.
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
                        setSwapIn(toSwapToken(tokens.find((t: TokenInfo) => t.symbol === e.target.value) || tokens[0]));
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
                        setSwapOut(toSwapToken(tokens.find((t: TokenInfo) => t.symbol === e.target.value) || tokens[1]));
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const nextAutoRoute = e.target.checked;
                      setAutoRoute(nextAutoRoute);
                      if (!nextAutoRoute) setIncludeMamCurves(false);
                    }}
                    className="h-4 w-4 accent-accent1"
                  />
                  Auto route
                </label>
              </div>

              <div className="flex items-center justify-between mt-spacing8 pt-spacing8 border-t border-surface3">
                <div>
                  <div className="text-xs font-semibold text-neutral1">MAM Curves</div>
                  <div className="text-xs text-neutral2">
                    {!includeMamCurves
                      ? "Disabled"
                      : !autoRoute
                        ? "Available in auto route only"
                        : mamCurveIds.length > 0
                          ? `${mamCurveIds.length} curve(s) found${mamRouteActive ? " • best route" : ""}`
                          : "No curves for this pair"}
                  </div>
                </div>
                <label className="flex items-center gap-spacing8 text-sm font-semibold text-neutral1">
                  <input
                    type="checkbox"
                    checked={includeMamCurves}
                    disabled={!autoRoute}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncludeMamCurves(e.target.checked)}
                    className="h-4 w-4 accent-accent1"
                  />
                  Include MAM
                </label>
              </div>

              {!autoRoute && (
                <div className="mt-spacing10">
                  <select
                    value={selectedAuction}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedAuction(e.target.value)}
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
              onClick={async () => {
                const amountIn = parseUnits(swapAmount || "0", swapIn.decimals);
                const minOut = parseUnits((swapMinOut || expectedOut || "0"), swapOut.decimals);

                // Route via MAM curve only when auto-route selected it with the toggle enabled.
                if (mamRouteActive && selectedRoute?.kind === "mam" && publicClient) {
                  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
                  const maxQuote = await publicClient.readContract({
                    address: diamondAddress as `0x${string}`,
                    abi: mamCurveExecutionAbi,
                    functionName: "previewCurveQuote",
                    args: [selectedRoute.curveId, amountIn],
                  }) as bigint;

                  let value = undefined;
                  try {
                    const fillView = await publicClient.readContract({
                      address: diamondAddress as `0x${string}`,
                      abi: mamCurveExecutionAbi,
                      functionName: "loadCurveForFill",
                      args: [selectedRoute.curveId],
                    }) as CurveFillView;
                    const baseIsA = fillView.baseIsA ?? fillView[6];
                    const tokenA = fillView.tokenA ?? fillView[4];
                    const tokenB = fillView.tokenB ?? fillView[5];
                    const quoteToken = baseIsA ? tokenB : tokenA;
                    if (String(quoteToken).toLowerCase() === ZERO_ADDRESS) {
                      value = maxQuote;
                    }
                  } catch (err) {
                    console.log("[DEBUG] loadCurveForFill failed, continuing without value", err);
                  }

                  writeContract({
                    address: diamondAddress as `0x${string}`,
                    abi: mamCurveExecutionAbi,
                    functionName: "executeCurveSwap",
                    args: [
                      selectedRoute.curveId,
                      amountIn,
                      maxQuote,
                      minOut,
                      deadline,
                      address!,
                    ],
                    value,
                  });
                  return;
                }

                if (!eligibleAuctions.length) return;
                const pick = autoRoute
                  ? (bestAuction || eligibleAuctions[0])
                  : eligibleAuctions.find((m) => String(m.id) === selectedAuction) || eligibleAuctions[0];
                const isCommunity = pick.type === "community";
                writeContract({
                  address: diamondAddress as `0x${string}`,
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
                  value: swapIn.address === ZERO_ADDRESS ? amountIn : undefined,
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
