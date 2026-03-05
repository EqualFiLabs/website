"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";

import { AppShell } from "../../app-shell";
import { Card, SectionHeader } from "../../app-components";
import { useToasts } from "@/components/common/ToastProvider";
import useExplorerUrl from "@/lib/hooks/useExplorerUrl";
import usePositionNFTs from "@/lib/hooks/usePositionNFTs";
import useIlmIsolated from "@/lib/hooks/useIlmIsolated";

const formatDisplay = (value: bigint | number | null | undefined, decimals = 18, maxFraction = 6) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: maxFraction }) : "—";
  }

  const normalized = Number(formatUnits(value, decimals));
  if (!Number.isFinite(normalized)) return "—";
  return normalized.toLocaleString(undefined, {
    maximumFractionDigits: maxFraction,
    minimumFractionDigits: 0,
  });
};

const parseAssetAmount = (value: string, decimals: number, label: string): bigint => {
  const trimmed = (value || "").trim();
  if (!trimmed) return 0n;
  if (trimmed.startsWith("-")) throw new Error(`${label} must be non-negative`);
  return parseUnits(trimmed, decimals);
};

const parseShareAmount = (value: string, label: string): bigint => {
  const trimmed = (value || "").trim();
  if (!trimmed) return 0n;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label} must be an integer`);
  }
  return BigInt(trimmed);
};

const requireExactlyOne = (assets: bigint, shares: bigint, context: string) => {
  if ((assets === 0n && shares === 0n) || (assets > 0n && shares > 0n)) {
    throw new Error(`${context}: provide exactly one of assets or shares`);
  }
};

const parseUintInput = (value: string, label: string): bigint => {
  const trimmed = (value || "").trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label} must be an integer`);
  }
  return BigInt(trimmed);
};

const parseWadInput = (value: string, label: string): bigint => {
  const trimmed = (value || "").trim();
  if (!trimmed) throw new Error(`${label} is required`);
  if (trimmed.startsWith("-")) throw new Error(`${label} must be non-negative`);
  return parseUnits(trimmed, 18);
};

export default function IlmIsolatedPage() {
  const { addToast } = useToasts();
  const { buildTxUrl } = useExplorerUrl();
  const { nfts } = usePositionNFTs();

  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");

  const [supplyAssets, setSupplyAssets] = useState("");
  const [supplyShares, setSupplyShares] = useState("");
  const [withdrawAssets, setWithdrawAssets] = useState("");
  const [withdrawShares, setWithdrawShares] = useState("");
  const [borrowAssets, setBorrowAssets] = useState("");
  const [borrowShares, setBorrowShares] = useState("");
  const [repayAssets, setRepayAssets] = useState("");
  const [repayShares, setRepayShares] = useState("");
  const [supplyCollateralAssets, setSupplyCollateralAssets] = useState("");
  const [withdrawCollateralAssets, setWithdrawCollateralAssets] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoanPoolId, setCreateLoanPoolId] = useState("");
  const [createCollateralPoolId, setCreateCollateralPoolId] = useState("");
  const [createOracle, setCreateOracle] = useState("");
  const [createIrm, setCreateIrm] = useState("");
  const [createLltv, setCreateLltv] = useState("0.8");
  const [createModuleId, setCreateModuleId] = useState("");

  const {
    markets,
    selectedMarket,
    state,
    loading,
    error,
    catalogLoading,
    catalogError,
    pendingWrite,
    actions,
    refetch,
    refreshCatalog,
  } = useIlmIsolated(selectedMarketId, selectedPositionId);

  useEffect(() => {
    if (!selectedMarketId && markets.length > 0) {
      setSelectedMarketId(markets[0].id);
    }
  }, [markets, selectedMarketId]);

  const positionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const nft of nfts || []) {
      if (!nft?.tokenId) continue;
      if (!map.has(String(nft.tokenId))) {
        map.set(String(nft.tokenId), `#${String(nft.tokenId)}`);
      }
    }

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => Number(a.value) - Number(b.value));
  }, [nfts]);

  useEffect(() => {
    if (!selectedPositionId && positionOptions.length > 0) {
      setSelectedPositionId(positionOptions[0].value);
    }
  }, [positionOptions, selectedPositionId]);

  useEffect(() => {
    if (!isCreateOpen) return;
    if (!createLoanPoolId && selectedMarket?.loanPoolId !== undefined) {
      setCreateLoanPoolId(String(selectedMarket.loanPoolId));
    }
    if (!createCollateralPoolId && selectedMarket?.collateralPoolId !== undefined) {
      setCreateCollateralPoolId(String(selectedMarket.collateralPoolId));
    }
    if (!createModuleId && selectedMarket?.moduleId !== undefined) {
      setCreateModuleId(String(selectedMarket.moduleId));
    }
  }, [
    createCollateralPoolId,
    createLoanPoolId,
    createModuleId,
    isCreateOpen,
    selectedMarket?.collateralPoolId,
    selectedMarket?.loanPoolId,
    selectedMarket?.moduleId,
  ]);

  const loanDecimals = selectedMarket?.loanPool?.decimals ?? 18;
  const collateralDecimals = selectedMarket?.collateralPool?.decimals ?? 18;
  const loanTicker = selectedMarket?.loanPool?.ticker || `Pool ${selectedMarket?.loanPoolId ?? "?"}`;
  const collateralTicker =
    selectedMarket?.collateralPool?.ticker || `Pool ${selectedMarket?.collateralPoolId ?? "?"}`;

  const utilizationPct = useMemo(() => {
    const supply = state.market?.totalSupplyAssets ?? 0n;
    const borrow = state.market?.totalBorrowAssets ?? 0n;
    if (supply === 0n) return 0;
    return Number((borrow * 10000n) / supply) / 100;
  }, [state.market]);

  const submit = async (label: string, action: () => Promise<`0x${string}`>) => {
    try {
      const hash = await action();
      addToast({
        title: `${label} confirmed`,
        description: hash,
        type: "success",
        link: buildTxUrl(hash),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      addToast({
        title: `${label} failed`,
        description: message,
        type: "error",
      });
    }
  };

  const runSupply = () =>
    submit("Supply", async () => {
      const assets = parseAssetAmount(supplyAssets, loanDecimals, "Supply assets");
      const shares = parseShareAmount(supplyShares, "Supply shares");
      requireExactlyOne(assets, shares, "Supply");
      const hash = await actions.isolatedSupply({ assets, shares });
      setSupplyAssets("");
      setSupplyShares("");
      return hash;
    });

  const runWithdraw = () =>
    submit("Withdraw", async () => {
      const assets = parseAssetAmount(withdrawAssets, loanDecimals, "Withdraw assets");
      const shares = parseShareAmount(withdrawShares, "Withdraw shares");
      requireExactlyOne(assets, shares, "Withdraw");
      const hash = await actions.isolatedWithdraw({ assets, shares });
      setWithdrawAssets("");
      setWithdrawShares("");
      return hash;
    });

  const runBorrow = () =>
    submit("Borrow", async () => {
      const assets = parseAssetAmount(borrowAssets, loanDecimals, "Borrow assets");
      const shares = parseShareAmount(borrowShares, "Borrow shares");
      requireExactlyOne(assets, shares, "Borrow");
      const hash = await actions.isolatedBorrow({ assets, shares });
      setBorrowAssets("");
      setBorrowShares("");
      return hash;
    });

  const runRepay = () =>
    submit("Repay", async () => {
      const assets = parseAssetAmount(repayAssets, loanDecimals, "Repay assets");
      const shares = parseShareAmount(repayShares, "Repay shares");
      requireExactlyOne(assets, shares, "Repay");
      const hash = await actions.isolatedRepay({ assets, shares });
      setRepayAssets("");
      setRepayShares("");
      return hash;
    });

  const runSupplyCollateral = () =>
    submit("Supply Collateral", async () => {
      const assets = parseAssetAmount(supplyCollateralAssets, collateralDecimals, "Collateral assets");
      if (assets <= 0n) throw new Error("Supply collateral: amount must be greater than zero");
      const hash = await actions.isolatedSupplyCollateral({ assets });
      setSupplyCollateralAssets("");
      return hash;
    });

  const runWithdrawCollateral = () =>
    submit("Withdraw Collateral", async () => {
      const assets = parseAssetAmount(withdrawCollateralAssets, collateralDecimals, "Collateral assets");
      if (assets <= 0n) throw new Error("Withdraw collateral: amount must be greater than zero");
      const hash = await actions.isolatedWithdrawCollateral({ assets });
      setWithdrawCollateralAssets("");
      return hash;
    });

  const runCreateMarket = () =>
    submit("Create Market", async () => {
      if (!isAddress(createOracle)) throw new Error("Oracle must be a valid address");
      if (!isAddress(createIrm)) throw new Error("IRM must be a valid address");
      const loanPoolId = parseUintInput(createLoanPoolId, "Loan pool ID");
      const collateralPoolId = parseUintInput(createCollateralPoolId, "Collateral pool ID");
      const lltvWad = parseWadInput(createLltv, "LLTV");
      const moduleId = parseUintInput(createModuleId, "Module ID");

      const hash = await actions.createMarket({
        loanPoolId,
        collateralPoolId,
        oracle: createOracle,
        irm: createIrm,
        lltvWad,
        moduleId,
      });

      setIsCreateOpen(false);
      await refreshCatalog();
      return hash;
    });

  return (
    <AppShell title="ILM Isolated Lending">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 pointer-events-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral3">EqualFi</p>
            <h1 className="text-3xl font-bold text-neutral1">ILM Isolated</h1>
            <p className="text-neutral2">Config + indexed market discovery with direct user operations.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={pendingWrite}
            className="min-h-[44px] rounded-full bg-accent1 px-5 py-2 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-0.5 hover:bg-accent1Hovered disabled:opacity-60"
          >
            Create+
          </button>
        </div>

        <Card>
          <SectionHeader title="MARKET" subtitle="Config-driven discovery" />
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm text-neutral2">
              ILM Market
              <select
                className="mt-2 w-full rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                value={selectedMarketId}
                onChange={(e) => setSelectedMarketId(e.target.value)}
              >
                <option value="">Select market</option>
                {markets.map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-neutral2">
              Position NFT
              <select
                className="mt-2 w-full rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
              >
                <option value="">Select position</option>
                {positionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-sm text-neutral2">
              <div>Market ID</div>
              <div className="mt-2 break-all rounded-xl border border-surface3 bg-surface2 px-3 py-2 font-mono text-xs text-neutral1">
                {selectedMarket?.marketId || "—"}
              </div>
            </div>
          </div>

          {markets.length === 0 && (
            <p className="mt-4 text-sm text-amber-300">
              No ILM markets configured. Add `ilmIsolatedMarkets` entries to `src/lib/pools.json`.
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full bg-surface3 px-4 py-2 text-xs font-semibold text-neutral1 hover:bg-surface2"
            >
              Refresh
            </button>
            {loading && <span className="text-xs text-neutral3">Loading market state…</span>}
            {error && <span className="text-xs text-rose-300">{error}</span>}
            {catalogLoading && <span className="text-xs text-neutral3">Syncing indexed markets…</span>}
            {catalogError && <span className="text-xs text-amber-300">{catalogError}</span>}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <SectionHeader title="MARKET STATE" subtitle={`${loanTicker} debt/supply`} />
            <div className="mt-4 space-y-2 text-sm text-neutral2">
              <div>Total Supply: {formatDisplay(state.market?.totalSupplyAssets, loanDecimals)} {loanTicker}</div>
              <div>Total Borrow: {formatDisplay(state.market?.totalBorrowAssets, loanDecimals)} {loanTicker}</div>
              <div>Utilization: {utilizationPct.toFixed(2)}%</div>
              <div>Protocol Fee Claim: {formatDisplay(state.protocolFeeAssets, loanDecimals)} {loanTicker}</div>
              <div>Liquidation Fee: {state.liquidationFeeBps} bps</div>
            </div>
          </Card>

          <Card>
            <SectionHeader title="POSITION" subtitle="Selected market position" />
            <div className="mt-4 space-y-2 text-sm text-neutral2">
              <div>Supply Shares: {state.position ? state.position.supplyShares.toString() : "—"}</div>
              <div>Borrow Shares: {state.position ? state.position.borrowShares.toString() : "—"}</div>
              <div>
                Collateral: {state.position ? formatDisplay(state.position.collateralAssets, collateralDecimals) : "—"}{" "}
                {collateralTicker}
              </div>
              <div>
                Health: {state.healthy === null ? "—" : state.healthy ? "Healthy" : "At Risk"}
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader title="MARKET PARAMS" subtitle="Immutable market config" />
            <div className="mt-4 space-y-2 text-xs text-neutral2 break-all">
              <div>Loan Pool ID: {state.params?.loanPoolId ?? "—"}</div>
              <div>Collateral Pool ID: {state.params?.collateralPoolId ?? "—"}</div>
              <div>LLTV: {state.params?.lltv ? formatDisplay(state.params.lltv, 16, 2) + "%" : "—"}</div>
              <div>Oracle: {state.params?.oracle || "—"}</div>
              <div>IRM: {state.params?.irm || "—"}</div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <SectionHeader title="SUPPLY / WITHDRAW" subtitle={`${loanTicker} market side`} />
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder={`Supply assets (${loanTicker})`}
                value={supplyAssets}
                onChange={(e) => setSupplyAssets(e.target.value)}
              />
              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder="Supply shares (integer)"
                value={supplyShares}
                onChange={(e) => setSupplyShares(e.target.value)}
              />
              <button
                type="button"
                disabled={pendingWrite}
                onClick={runSupply}
                className="rounded-full bg-accent1 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
              >
                Supply
              </button>

              <hr className="border-surface3" />

              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder={`Withdraw assets (${loanTicker})`}
                value={withdrawAssets}
                onChange={(e) => setWithdrawAssets(e.target.value)}
              />
              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder="Withdraw shares (integer)"
                value={withdrawShares}
                onChange={(e) => setWithdrawShares(e.target.value)}
              />
              <button
                type="button"
                disabled={pendingWrite}
                onClick={runWithdraw}
                className="rounded-full bg-surface3 px-4 py-2 text-sm font-semibold text-neutral1 disabled:opacity-60"
              >
                Withdraw
              </button>
            </div>
          </Card>

          <Card>
            <SectionHeader title="BORROW / REPAY" subtitle={`${loanTicker} debt side`} />
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder={`Borrow assets (${loanTicker})`}
                value={borrowAssets}
                onChange={(e) => setBorrowAssets(e.target.value)}
              />
              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder="Borrow shares (integer)"
                value={borrowShares}
                onChange={(e) => setBorrowShares(e.target.value)}
              />
              <button
                type="button"
                disabled={pendingWrite}
                onClick={runBorrow}
                className="rounded-full bg-accent1 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
              >
                Borrow
              </button>

              <hr className="border-surface3" />

              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder={`Repay assets (${loanTicker})`}
                value={repayAssets}
                onChange={(e) => setRepayAssets(e.target.value)}
              />
              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder="Repay shares (integer)"
                value={repayShares}
                onChange={(e) => setRepayShares(e.target.value)}
              />
              <button
                type="button"
                disabled={pendingWrite}
                onClick={runRepay}
                className="rounded-full bg-surface3 px-4 py-2 text-sm font-semibold text-neutral1 disabled:opacity-60"
              >
                Repay
              </button>
            </div>
          </Card>
        </div>

        <Card>
          <SectionHeader title="COLLATERAL" subtitle={`${collateralTicker} side`} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder={`Supply collateral (${collateralTicker})`}
                value={supplyCollateralAssets}
                onChange={(e) => setSupplyCollateralAssets(e.target.value)}
              />
              <button
                type="button"
                disabled={pendingWrite}
                onClick={runSupplyCollateral}
                className="w-full rounded-full bg-accent1 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
              >
                Supply Collateral
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder={`Withdraw collateral (${collateralTicker})`}
                value={withdrawCollateralAssets}
                onChange={(e) => setWithdrawCollateralAssets(e.target.value)}
              />
              <button
                type="button"
                disabled={pendingWrite}
                onClick={runWithdrawCollateral}
                className="w-full rounded-full bg-surface3 px-4 py-2 text-sm font-semibold text-neutral1 disabled:opacity-60"
              >
                Withdraw Collateral
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral3">
            ILM actions use principal already held by the selected Position NFT in each pool. Deposit principal first via
            Position flows.
          </p>
        </Card>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:px-4">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-none border-white/10 bg-[#0b1021] shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl sm:border">
            <div className="flex-shrink-0 flex items-start justify-between border-b border-white/10 p-4 sm:p-6 sm:pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-foam/60">ILM Isolated</p>
                <h2 className="text-xl sm:text-2xl font-semibold text-foam">Create Lending Market</h2>
                <p className="mt-1 text-sm text-neutral2">
                  Permissionless for enabled non-managed IRMs. Managed-only IRMs require manager/owner authorization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="min-h-[44px] rounded-full border border-surface3 px-3 py-1 text-xs font-semibold text-neutral2 hover:border-accent1 hover:text-accent1 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-5 p-4 sm:px-6 sm:pb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Loan Pool ID</span>
                    <input
                      type="number"
                      min="0"
                      value={createLoanPoolId}
                      onChange={(e) => setCreateLoanPoolId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Collateral Pool ID</span>
                    <input
                      type="number"
                      min="0"
                      value={createCollateralPoolId}
                      onChange={(e) => setCreateCollateralPoolId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Oracle Address</span>
                    <input
                      type="text"
                      value={createOracle}
                      onChange={(e) => setCreateOracle(e.target.value)}
                      placeholder="0x..."
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">IRM Address</span>
                    <input
                      type="text"
                      value={createIrm}
                      onChange={(e) => setCreateIrm(e.target.value)}
                      placeholder="0x..."
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">LLTV (0..1)</span>
                    <input
                      type="text"
                      value={createLltv}
                      onChange={(e) => setCreateLltv(e.target.value)}
                      placeholder="0.8"
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Module ID</span>
                    <input
                      type="number"
                      min="0"
                      value={createModuleId}
                      onChange={(e) => setCreateModuleId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-white/10 p-4 sm:px-6 sm:py-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={runCreateMarket}
                  disabled={pendingWrite}
                  className="flex-1 min-h-[44px] rounded-full bg-accent1 px-4 py-2 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pendingWrite ? "Submitting..." : "Create Market"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="min-h-[44px] rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-foam transition hover:-translate-y-0.5 hover:border-mint hover:text-mint"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
