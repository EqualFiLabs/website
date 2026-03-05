"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import useBufferedWriteContract from "@/lib/hooks/useBufferedWriteContract";
import useActivePublicClient from "@/lib/hooks/useActivePublicClient";
import usePoolsConfig from "@/lib/hooks/usePoolsConfig";
import useProtocolAddresses from "@/lib/hooks/useProtocolAddresses";
import usePositionNFTs from "@/lib/hooks/usePositionNFTs";
import { useToasts } from "@/components/common/ToastProvider";
import useExplorerUrl from "@/lib/hooks/useExplorerUrl";
import { tokensFromConfig } from "@/lib/tokens";
import { AppShell } from "../../app-shell";
import {
  Card,
  SectionHeader,
  Field,
  Input,
  Select,
  ActionButton,
  StatusLine,
} from "../../app-components";
import {
  mamCurveViewAbi,
  mamCurveCreationAbi,
  mamCurveManagementAbi,
  mamCurveExecutionAbi,
} from "@/lib/abis/mamCurveFacet";
import { MAM_INITIAL_GENERATION } from "@/lib/mamCurveConfig";

function formatTime(unix) {
  if (!unix) return "—";
  const d = new Date(Number(unix) * 1000);
  return d.toLocaleString();
}

function formatDuration(seconds) {
  const s = Number(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function toErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return "Transaction failed";
}

function buildPositionIdOptions(nfts) {
  if (!nfts?.length) return [];
  const seen = new Set();
  return nfts
    .filter((n) => {
      if (seen.has(n.tokenId)) return false;
      seen.add(n.tokenId);
      return true;
    })
    .map((n) => ({
      value: n.tokenId,
      label: `#${n.tokenId} (${n.poolName || "—"})`,
    }));
}

function buildPoolIdOptions(pools) {
  if (!pools?.length) return [];
  return pools.map((p) => ({
    value: String(p.pid),
    label: `${p.pid} — ${p.ticker || p.tokenName || p.id}`,
  }));
}

export default function MamCurvesPage() {
  const { address, isConnected } = useAccount();
  const publicClient = useActivePublicClient();
  const poolsConfig = usePoolsConfig();
  const { diamondAddress } = useProtocolAddresses();
  const { nfts } = usePositionNFTs();
  const { writeContractAsync } = useBufferedWriteContract();
  const { addToast } = useToasts();
  const { buildTxUrl } = useExplorerUrl();
  const tokens = useMemo(() => tokensFromConfig(poolsConfig), [poolsConfig]);

  const positionIdOptions = useMemo(() => buildPositionIdOptions(nfts), [nfts]);
  const poolIdOptions = useMemo(
    () => buildPoolIdOptions(poolsConfig?.pools),
    [poolsConfig?.pools]
  );

  // --- Active curves browser ---
  const [activeCurveIds, setActiveCurveIds] = useState([]);
  const [activeCurveTotal, setActiveCurveTotal] = useState(0);
  const [curveDetails, setCurveDetails] = useState({});
  const [loadingCurves, setLoadingCurves] = useState(false);
  const [curveError, setCurveError] = useState(undefined);
  const [filterMode, setFilterMode] = useState("all");
  const [filterPairA, setFilterPairA] = useState("");
  const [filterPairB, setFilterPairB] = useState("");
  const [filterPositionId, setFilterPositionId] = useState("");

  // --- Curve detail inspector ---
  const [inspectCurveId, setInspectCurveId] = useState("");
  const [inspectedCurve, setInspectedCurve] = useState(null);
  const [inspectedStatus, setInspectedStatus] = useState(null);

  // --- Create curve form ---
  const [createForm, setCreateForm] = useState({
    positionId: "",
    poolIdA: "",
    poolIdB: "",
    tokenA: "",
    tokenB: "",
    side: "false",
    priceIsQuotePerBase: "true",
    maxVolume: "",
    startPrice: "",
    endPrice: "",
    startTime: "",
    duration: "",
    feeRateBps: "30",
    feeAsset: "0",
    salt: "0",
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // --- Update curve form ---
  const [updateForm, setUpdateForm] = useState({
    curveId: "",
    startPrice: "",
    endPrice: "",
    startTime: "",
    duration: "",
  });
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  // --- Cancel / Expire ---
  const [actionCurveId, setActionCurveId] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // --- Taker swap ---
  const [swapForm, setSwapForm] = useState({
    curveId: "",
    amountIn: "",
    slippageBps: "50",
  });
  const [swapPreview, setSwapPreview] = useState(null);
  const [submittingSwap, setSubmittingSwap] = useState(false);

  // --- Helpers ---
  const ensureReady = useCallback(() => {
    if (!diamondAddress) throw new Error("diamondAddress is missing from pools config");
    if (!publicClient || !writeContractAsync) throw new Error("Wallet client unavailable");
    if (!isConnected || !address) throw new Error("Connect wallet to continue");
    return { diamondAddress, account: address };
  }, [address, diamondAddress, isConnected, publicClient, writeContractAsync]);

  const submitWrite = useCallback(
    async (config, pendingTitle, successTitle, onSuccess) => {
      if (!publicClient) throw new Error("Wallet client unavailable");
      const txHash = await writeContractAsync(config);
      addToast({ title: pendingTitle, description: "Waiting for confirmation...", type: "pending", link: buildTxUrl(txHash) });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      addToast({ title: successTitle, description: txHash, type: "success", link: buildTxUrl(txHash) });
      onSuccess?.();
    },
    [addToast, buildTxUrl, publicClient, writeContractAsync]
  );

  // --- Load active curves ---
  const loadCurves = useCallback(async () => {
    if (!publicClient || !diamondAddress) return;
    setLoadingCurves(true);
    setCurveError(undefined);
    try {
      let ids = [];
      let total = 0;
      if (filterMode === "pair" && filterPairA && filterPairB) {
        const result = await publicClient.readContract({
          address: diamondAddress,
          abi: mamCurveViewAbi,
          functionName: "getCurvesByPair",
          args: [filterPairA, filterPairB, BigInt(0), BigInt(50)],
        });
        ids = (result[0] || []).map((id) => Number(id));
        total = Number(result[1] || 0);
      } else if (filterMode === "position" && filterPositionId) {
        const result = await publicClient.readContract({
          address: diamondAddress,
          abi: mamCurveViewAbi,
          functionName: "getCurvesByPositionId",
          args: [BigInt(filterPositionId), BigInt(0), BigInt(50)],
        });
        ids = (result[0] || []).map((id) => Number(id));
        total = Number(result[1] || 0);
      } else {
        const result = await publicClient.readContract({
          address: diamondAddress,
          abi: mamCurveViewAbi,
          functionName: "getActiveCurves",
          args: [BigInt(0), BigInt(50)],
        });
        ids = (result[0] || []).map((id) => Number(id));
        total = Number(result[1] || 0);
      }
      setActiveCurveIds(ids);
      setActiveCurveTotal(total);

      // Fetch status for each
      const details = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const status = await publicClient.readContract({
              address: diamondAddress,
              abi: mamCurveViewAbi,
              functionName: "getCurveStatus",
              args: [BigInt(id)],
            });
            details[id] = {
              active: status[0],
              expired: status[1],
              remainingVolume: status[2],
              currentPrice: status[3],
              startTime: status[4],
              endTime: status[5],
              baseIsA: status[6],
              tokenA: status[7],
              tokenB: status[8],
              timeRemaining: status[9],
            };
          } catch {
            details[id] = null;
          }
        })
      );
      setCurveDetails(details);
    } catch (err) {
      setCurveError(toErrorMessage(err));
    } finally {
      setLoadingCurves(false);
    }
  }, [publicClient, diamondAddress, filterMode, filterPairA, filterPairB, filterPositionId]);

  useEffect(() => {
    loadCurves();
  }, [loadCurves]);

  // --- Inspect a single curve ---
  const inspectCurve = useCallback(async () => {
    if (!publicClient || !diamondAddress || !inspectCurveId) return;
    try {
      const full = await publicClient.readContract({
        address: diamondAddress,
        abi: mamCurveViewAbi,
        functionName: "getCurve",
        args: [BigInt(inspectCurveId)],
      });
      setInspectedCurve(full);
      const status = await publicClient.readContract({
        address: diamondAddress,
        abi: mamCurveViewAbi,
        functionName: "getCurveStatus",
        args: [BigInt(inspectCurveId)],
      });
      setInspectedStatus(status);
    } catch (err) {
      addToast({ title: "Inspect failed", description: toErrorMessage(err), type: "error" });
    }
  }, [publicClient, diamondAddress, inspectCurveId, addToast]);

  // --- Create curve ---
  const handleCreateCurve = async () => {
    setSubmittingCreate(true);
    try {
      const { diamondAddress: d } = ensureReady();
      const positionKey = nfts.find((n) => n.tokenId === createForm.positionId)?.positionAddress || "0x0000000000000000000000000000000000000000000000000000000000000000";
      const desc = {
        makerPositionKey: positionKey,
        makerPositionId: BigInt(createForm.positionId),
        poolIdA: BigInt(createForm.poolIdA),
        poolIdB: BigInt(createForm.poolIdB),
        tokenA: createForm.tokenA,
        tokenB: createForm.tokenB,
        side: createForm.side === "true",
        priceIsQuotePerBase: createForm.priceIsQuotePerBase === "true",
        maxVolume: parseUnits(createForm.maxVolume || "0", 18),
        startPrice: parseUnits(createForm.startPrice || "0", 18),
        endPrice: parseUnits(createForm.endPrice || "0", 18),
        startTime: BigInt(createForm.startTime || "0"),
        duration: BigInt(createForm.duration || "0"),
        generation: MAM_INITIAL_GENERATION,
        feeRateBps: Number(createForm.feeRateBps || "0"),
        feeAsset: Number(createForm.feeAsset || "0"),
        salt: BigInt(createForm.salt || "0"),
      };
      await submitWrite(
        { address: d, abi: mamCurveCreationAbi, functionName: "createCurve", args: [desc] },
        "Create curve submitted",
        "Curve created",
        () => void loadCurves()
      );
    } catch (err) {
      addToast({ title: "Create curve failed", description: toErrorMessage(err), type: "error" });
    } finally {
      setSubmittingCreate(false);
    }
  };

  // --- Update curve ---
  const handleUpdateCurve = async () => {
    setSubmittingUpdate(true);
    try {
      const { diamondAddress: d } = ensureReady();
      const params = {
        startPrice: parseUnits(updateForm.startPrice || "0", 18),
        endPrice: parseUnits(updateForm.endPrice || "0", 18),
        startTime: BigInt(updateForm.startTime || "0"),
        duration: BigInt(updateForm.duration || "0"),
      };
      await submitWrite(
        { address: d, abi: mamCurveManagementAbi, functionName: "updateCurve", args: [BigInt(updateForm.curveId), params] },
        "Update curve submitted",
        "Curve updated",
        () => void loadCurves()
      );
    } catch (err) {
      addToast({ title: "Update curve failed", description: toErrorMessage(err), type: "error" });
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // --- Cancel / Expire ---
  const handleCancelCurve = async () => {
    setSubmittingAction(true);
    try {
      const { diamondAddress: d } = ensureReady();
      await submitWrite(
        { address: d, abi: mamCurveManagementAbi, functionName: "cancelCurve", args: [BigInt(actionCurveId)] },
        "Cancel submitted",
        "Curve cancelled",
        () => void loadCurves()
      );
    } catch (err) {
      addToast({ title: "Cancel failed", description: toErrorMessage(err), type: "error" });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExpireCurve = async () => {
    setSubmittingAction(true);
    try {
      const { diamondAddress: d } = ensureReady();
      await submitWrite(
        { address: d, abi: mamCurveManagementAbi, functionName: "expireCurve", args: [BigInt(actionCurveId)] },
        "Expire submitted",
        "Curve expired",
        () => void loadCurves()
      );
    } catch (err) {
      addToast({ title: "Expire failed", description: toErrorMessage(err), type: "error" });
    } finally {
      setSubmittingAction(false);
    }
  };

  // --- Taker: preview + swap ---
  const previewSwap = useCallback(async () => {
    if (!publicClient || !diamondAddress || !swapForm.curveId || !swapForm.amountIn) {
      setSwapPreview(null);
      return;
    }
    try {
      const amountIn = parseUnits(swapForm.amountIn, 18);
      const result = await publicClient.readContract({
        address: diamondAddress,
        abi: mamCurveViewAbi,
        functionName: "quoteCurveExactIn",
        args: [BigInt(swapForm.curveId), amountIn],
      });
      setSwapPreview({
        amountOut: result[0],
        feeAmount: result[1],
        totalQuote: result[2],
        remainingVolume: result[3],
        ok: result[4],
      });
    } catch (err) {
      setSwapPreview(null);
      addToast({ title: "Preview failed", description: toErrorMessage(err), type: "error" });
    }
  }, [publicClient, diamondAddress, swapForm.curveId, swapForm.amountIn, addToast]);

  const handleSwap = async () => {
    setSubmittingSwap(true);
    try {
      const { diamondAddress: d, account } = ensureReady();
      const amountIn = parseUnits(swapForm.amountIn || "0", 18);
      // Get maxQuote from previewCurveQuote
      const maxQuote = await publicClient.readContract({
        address: d,
        abi: mamCurveExecutionAbi,
        functionName: "previewCurveQuote",
        args: [BigInt(swapForm.curveId), amountIn],
      });
      const slipBps = BigInt(swapForm.slippageBps || "50");
      const minOut = swapPreview?.ok
        ? (swapPreview.amountOut * (BigInt(10000) - slipBps)) / BigInt(10000)
        : BigInt(0);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

      // Check if quote token is native ETH
      let value = undefined;
      try {
        const fillView = await publicClient.readContract({
          address: d,
          abi: mamCurveExecutionAbi,
          functionName: "loadCurveForFill",
          args: [BigInt(swapForm.curveId)],
        });
        const quoteToken = fillView.baseIsA ? fillView.tokenB : fillView.tokenA;
        if (quoteToken === "0x0000000000000000000000000000000000000000") {
          value = maxQuote;
        }
      } catch {
        // If loadCurveForFill fails, proceed without value
      }

      await submitWrite(
        {
          address: d,
          abi: mamCurveExecutionAbi,
          functionName: "executeCurveSwap",
          args: [BigInt(swapForm.curveId), amountIn, maxQuote, minOut, deadline, account],
          value,
        },
        "Swap submitted",
        "Curve swap executed",
        () => void loadCurves()
      );
    } catch (err) {
      addToast({ title: "Swap failed", description: toErrorMessage(err), type: "error" });
    } finally {
      setSubmittingSwap(false);
    }
  };

  const tokenSymbol = (addr) => {
    if (!addr) return "?";
    if (addr === "0x0000000000000000000000000000000000000000") return "ETH";
    const t = tokens.find((tk) => tk.address.toLowerCase() === addr.toLowerCase());
    return t?.symbol || `${addr.slice(0, 6)}…`;
  };

  const readyStatus = diamondAddress
    ? "MAM Curve flows ready"
    : "Set diamondAddress in NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY/TESTNET";

  return (
    <AppShell title="MAM Curves">
      <Card>
        <SectionHeader title="MAM CURVE MARKET MAKER" subtitle="Time-weighted price curves for position-backed liquidity" />
        <StatusLine text={readyStatus} />
      </Card>

      {/* --- Active Curves Browser --- */}
      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <SectionHeader title="CURVE INDEX" subtitle="Browse active curves" />
          <div className="mt-4 grid gap-3">
            <Field label="Filter">
              <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
                <option value="all">All active</option>
                <option value="pair">By token pair</option>
                <option value="position">By position</option>
              </Select>
            </Field>
            {filterMode === "pair" && (
              <>
                <Field label="Token A">
                  <Select value={filterPairA} onChange={(e) => setFilterPairA(e.target.value)}>
                    <option value="">Select token...</option>
                    {tokens.map((t) => (
                      <option key={`fa-${t.address}`} value={t.address}>{t.symbol}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Token B">
                  <Select value={filterPairB} onChange={(e) => setFilterPairB(e.target.value)}>
                    <option value="">Select token...</option>
                    {tokens.map((t) => (
                      <option key={`fb-${t.address}`} value={t.address}>{t.symbol}</option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
            {filterMode === "position" && (
              <Field label="Position Id">
                <Input
                  value={filterPositionId}
                  onChange={(e) => setFilterPositionId(e.target.value)}
                  placeholder="e.g. 1"
                />
              </Field>
            )}
            <ActionButton onClick={() => void loadCurves()} disabled={loadingCurves}>
              {loadingCurves ? "Loading..." : "Refresh"}
            </ActionButton>
            <StatusLine text={curveError} />
            <p className="text-xs text-gray-500 font-mono">{activeCurveTotal} curve(s) found</p>
          </div>
        </Card>

        <div className="md:col-span-2">
          <Card>
            <SectionHeader title="ACTIVE CURVES" subtitle={`${activeCurveIds.length} loaded`} />
            <div className="mt-4 max-h-96 overflow-auto space-y-2 text-xs font-mono">
              {activeCurveIds.length === 0 && <p className="text-gray-500">No curves found.</p>}
              {activeCurveIds.map((id) => {
                const d = curveDetails[id];
                if (!d) return (
                  <div key={id} className="border border-white/15 rounded p-2">
                    <p>Curve #{id} — loading failed</p>
                  </div>
                );
                return (
                  <div
                    key={id}
                    className="border border-white/15 rounded p-2 cursor-pointer hover:border-white/40 transition-colors"
                    onClick={() => { setInspectCurveId(String(id)); }}
                  >
                    <div className="flex justify-between items-center">
                      <span>Curve #{id}</span>
                      <span className={d.active ? "text-green-400" : "text-red-400"}>
                        {d.active ? "ACTIVE" : d.expired ? "EXPIRED" : "INACTIVE"}
                      </span>
                    </div>
                    <p>{tokenSymbol(d.tokenA)} / {tokenSymbol(d.tokenB)} • base={d.baseIsA ? "A" : "B"}</p>
                    <p>price: {formatUnits(d.currentPrice || BigInt(0), 18)} • vol: {formatUnits(d.remainingVolume || BigInt(0), 18)}</p>
                    <p>time left: {formatDuration(d.timeRemaining || 0)}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>

      {/* --- Curve Inspector --- */}
      <Card>
        <SectionHeader title="CURVE INSPECTOR" subtitle="Deep view of a single curve" />
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Field label="Curve Id">
                <Input value={inspectCurveId} onChange={(e) => setInspectCurveId(e.target.value)} placeholder="e.g. 1" />
              </Field>
            </div>
            <div className="flex items-end">
              <ActionButton onClick={() => void inspectCurve()}>Inspect</ActionButton>
            </div>
          </div>
          {inspectedCurve && (
            <div className="border border-white/15 rounded p-3 text-xs font-mono space-y-1 mt-2">
              <p className="text-gray-400">{"// StoredCurve"}</p>
              <p>active: {String(inspectedCurve[0]?.active)} • gen: {String(inspectedCurve[0]?.generation)} • vol: {formatUnits(inspectedCurve[0]?.remainingVolume || BigInt(0), 18)}</p>
              <p>endTime: {formatTime(inspectedCurve[0]?.endTime)}</p>
              <p className="text-gray-400 mt-2">{"// CurveData"}</p>
              <p>maker pos: #{String(inspectedCurve[1]?.makerPositionId)} • poolA: {String(inspectedCurve[1]?.poolIdA)} • poolB: {String(inspectedCurve[1]?.poolIdB)}</p>
              <p className="text-gray-400 mt-2">{"// Pricing"}</p>
              <p>start: {formatUnits(inspectedCurve[2]?.startPrice || BigInt(0), 18)} → end: {formatUnits(inspectedCurve[2]?.endPrice || BigInt(0), 18)}</p>
              <p>startTime: {formatTime(inspectedCurve[2]?.startTime)} • duration: {formatDuration(inspectedCurve[2]?.duration || 0)}</p>
              <p className="text-gray-400 mt-2">{"// Immutables"}</p>
              <p>tokenA: {tokenSymbol(inspectedCurve[3]?.tokenA)} ({inspectedCurve[3]?.tokenA})</p>
              <p>tokenB: {tokenSymbol(inspectedCurve[3]?.tokenB)} ({inspectedCurve[3]?.tokenB})</p>
              <p>maxVol: {formatUnits(inspectedCurve[3]?.maxVolume || BigInt(0), 18)} • fee: {String(inspectedCurve[3]?.feeRateBps)}bps • baseIsA: {String(inspectedCurve[4])}</p>
            </div>
          )}
          {inspectedStatus && (
            <div className="border border-white/15 rounded p-3 text-xs font-mono space-y-1">
              <p className="text-gray-400">{"// Live Status"}</p>
              <p>active: {String(inspectedStatus[0])} • expired: {String(inspectedStatus[1])}</p>
              <p>currentPrice: {formatUnits(inspectedStatus[3] || BigInt(0), 18)}</p>
              <p>remaining: {formatUnits(inspectedStatus[2] || BigInt(0), 18)} • timeLeft: {formatDuration(inspectedStatus[9] || 0)}</p>
            </div>
          )}
        </div>
      </Card>

      {/* --- Maker: Create + Update + Cancel/Expire --- */}
      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <SectionHeader title="CREATE CURVE" subtitle="Deploy a new MAM price curve" />
          <div className="mt-4 grid gap-3">
            <Field label="Position Id">
              <Select value={createForm.positionId} onChange={(e) => setCreateForm((p) => ({ ...p, positionId: e.target.value }))}>
                <option value="">{positionIdOptions.length ? "Select Position..." : "No positions"}</option>
                {positionIdOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Pool Id A">
                <Select value={createForm.poolIdA} onChange={(e) => setCreateForm((p) => ({ ...p, poolIdA: e.target.value }))}>
                  <option value="">Select...</option>
                  {poolIdOptions.map((o) => <option key={`cpa-${o.value}`} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Pool Id B">
                <Select value={createForm.poolIdB} onChange={(e) => setCreateForm((p) => ({ ...p, poolIdB: e.target.value }))}>
                  <option value="">Select...</option>
                  {poolIdOptions.map((o) => <option key={`cpb-${o.value}`} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Token A Address">
                <Select value={createForm.tokenA} onChange={(e) => setCreateForm((p) => ({ ...p, tokenA: e.target.value }))}>
                  <option value="">Select token...</option>
                  {tokens.map((t) => <option key={`cta-${t.address}`} value={t.address}>{t.symbol} ({t.address.slice(0,8)}…)</option>)}
                </Select>
              </Field>
              <Field label="Token B Address">
                <Select value={createForm.tokenB} onChange={(e) => setCreateForm((p) => ({ ...p, tokenB: e.target.value }))}>
                  <option value="">Select token...</option>
                  {tokens.map((t) => <option key={`ctb-${t.address}`} value={t.address}>{t.symbol} ({t.address.slice(0,8)}…)</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Side">
                <Select value={createForm.side} onChange={(e) => setCreateForm((p) => ({ ...p, side: e.target.value }))}>
                  <option value="false">Sell A for B</option>
                  <option value="true">Sell B for A</option>
                </Select>
              </Field>
              <Field label="Price Direction">
                <Select value={createForm.priceIsQuotePerBase} onChange={(e) => setCreateForm((p) => ({ ...p, priceIsQuotePerBase: e.target.value }))}>
                  <option value="true">Quote per Base</option>
                  <option value="false">Base per Quote</option>
                </Select>
              </Field>
            </div>
            <Field label="Max Volume (base units)">
              <Input value={createForm.maxVolume} onChange={(e) => setCreateForm((p) => ({ ...p, maxVolume: e.target.value }))} placeholder="e.g. 1.0" />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Start Price">
                <Input value={createForm.startPrice} onChange={(e) => setCreateForm((p) => ({ ...p, startPrice: e.target.value }))} />
              </Field>
              <Field label="End Price">
                <Input value={createForm.endPrice} onChange={(e) => setCreateForm((p) => ({ ...p, endPrice: e.target.value }))} />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Start Time (unix)">
                <Input value={createForm.startTime} onChange={(e) => setCreateForm((p) => ({ ...p, startTime: e.target.value }))} placeholder={String(Math.floor(Date.now() / 1000) + 60)} />
              </Field>
              <Field label="Duration (seconds)">
                <Input value={createForm.duration} onChange={(e) => setCreateForm((p) => ({ ...p, duration: e.target.value }))} placeholder="e.g. 3600" />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Fee (bps)">
                <Input value={createForm.feeRateBps} onChange={(e) => setCreateForm((p) => ({ ...p, feeRateBps: e.target.value }))} />
              </Field>
              <Field label="Fee Asset">
                <Select value={createForm.feeAsset} onChange={(e) => setCreateForm((p) => ({ ...p, feeAsset: e.target.value }))}>
                  <option value="0">Token In</option>
                  <option value="1">Token Out</option>
                </Select>
              </Field>
              <Field label="Salt">
                <Input value={createForm.salt} onChange={(e) => setCreateForm((p) => ({ ...p, salt: e.target.value }))} />
              </Field>
            </div>
            <ActionButton onClick={() => void handleCreateCurve()} disabled={submittingCreate}>
              {submittingCreate ? "Submitting..." : "Create Curve"}
            </ActionButton>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <SectionHeader title="UPDATE CURVE" subtitle="Modify pricing parameters" />
            <div className="mt-4 grid gap-3">
              <Field label="Curve Id">
                <Input value={updateForm.curveId} onChange={(e) => setUpdateForm((p) => ({ ...p, curveId: e.target.value }))} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="New Start Price">
                  <Input value={updateForm.startPrice} onChange={(e) => setUpdateForm((p) => ({ ...p, startPrice: e.target.value }))} />
                </Field>
                <Field label="New End Price">
                  <Input value={updateForm.endPrice} onChange={(e) => setUpdateForm((p) => ({ ...p, endPrice: e.target.value }))} />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="New Start Time (unix)">
                  <Input value={updateForm.startTime} onChange={(e) => setUpdateForm((p) => ({ ...p, startTime: e.target.value }))} />
                </Field>
                <Field label="New Duration (s)">
                  <Input value={updateForm.duration} onChange={(e) => setUpdateForm((p) => ({ ...p, duration: e.target.value }))} />
                </Field>
              </div>
              <ActionButton onClick={() => void handleUpdateCurve()} disabled={submittingUpdate}>
                {submittingUpdate ? "Submitting..." : "Update Curve"}
              </ActionButton>
            </div>
          </Card>

          <Card>
            <SectionHeader title="CANCEL / EXPIRE" subtitle="Close a curve" />
            <div className="mt-4 grid gap-3">
              <Field label="Curve Id">
                <Input value={actionCurveId} onChange={(e) => setActionCurveId(e.target.value)} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <ActionButton onClick={() => void handleCancelCurve()} disabled={submittingAction}>
                  {submittingAction ? "..." : "Cancel"}
                </ActionButton>
                <ActionButton onClick={() => void handleExpireCurve()} disabled={submittingAction}>
                  {submittingAction ? "..." : "Expire"}
                </ActionButton>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* --- Taker: Quote + Swap --- */}
      <Card>
        <SectionHeader title="SWAP AGAINST CURVE" subtitle="Fill a MAM curve as taker" />
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Curve Id">
              <Input value={swapForm.curveId} onChange={(e) => setSwapForm((p) => ({ ...p, curveId: e.target.value }))} />
            </Field>
            <Field label="Amount In">
              <Input value={swapForm.amountIn} onChange={(e) => setSwapForm((p) => ({ ...p, amountIn: e.target.value }))} placeholder="e.g. 0.5" />
            </Field>
            <Field label="Slippage (bps)">
              <Input value={swapForm.slippageBps} onChange={(e) => setSwapForm((p) => ({ ...p, slippageBps: e.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ActionButton onClick={() => void previewSwap()}>Preview Quote</ActionButton>
            <ActionButton onClick={() => void handleSwap()} disabled={submittingSwap || !swapPreview?.ok}>
              {submittingSwap ? "Submitting..." : "Execute Swap"}
            </ActionButton>
          </div>
          {swapPreview && (
            <div className="border border-white/15 rounded p-3 text-xs font-mono space-y-1">
              <p>ok: {String(swapPreview.ok)} • amountOut: {formatUnits(swapPreview.amountOut || BigInt(0), 18)}</p>
              <p>fee: {formatUnits(swapPreview.feeAmount || BigInt(0), 18)} • totalQuote: {formatUnits(swapPreview.totalQuote || BigInt(0), 18)}</p>
              <p>remaining after: {formatUnits(swapPreview.remainingVolume || BigInt(0), 18)}</p>
            </div>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
