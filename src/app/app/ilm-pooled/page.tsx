"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";

import { AppShell } from "../../app-shell";
import { Card, SectionHeader } from "../../app-components";
import { useToasts } from "@/components/common/ToastProvider";
import useExplorerUrl from "@/lib/hooks/useExplorerUrl";
import useIlmPooled from "@/lib/hooks/useIlmPooled";
import usePositionNFTs from "@/lib/hooks/usePositionNFTs";

const MAX_UINT32 = 4294967295n;

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

const parseAmountInput = (value: string, decimals: number, label: string): bigint => {
  const trimmed = (value || "").trim();
  if (!trimmed) throw new Error(`${label} is required`);
  if (trimmed.startsWith("-")) throw new Error(`${label} must be non-negative`);
  return parseUnits(trimmed, decimals);
};

const parseUintInput = (value: string, label: string): bigint => {
  const trimmed = (value || "").trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label} must be an integer`);
  }
  return BigInt(trimmed);
};

const parseBpsInput = (value: string, label: string): number => {
  const parsed = parseUintInput(value, label);
  if (parsed > 10_000n) {
    throw new Error(`${label} must be <= 10000`);
  }
  return Number(parsed);
};

const parseUint32Input = (value: string, label: string): number => {
  const parsed = parseUintInput(value, label);
  if (parsed > MAX_UINT32) {
    throw new Error(`${label} must fit uint32`);
  }
  return Number(parsed);
};

type IlmPooledStateView = {
  market: {
    utilizationBps: number;
    totalSupplyAssets: bigint;
    totalDebtAssets: bigint;
    availableLiquidity: bigint;
    badDebt: bigint;
    ltvBps: number;
    liquidationThresholdBps: number;
    liquidationBonusBps: number;
    liquidationProtocolFeeBps: number;
    reserveFactorBps: number;
    supplyCap: bigint;
    borrowCap: bigint;
    active: boolean;
    paused: boolean;
    frozen: boolean;
  } | null;
  position: {
    scaledSupply: bigint;
    scaledDebt: bigint;
    useAsCollateral: boolean;
  } | null;
  healthFactor: bigint | null;
  supplyBalance: bigint;
  debtBalance: bigint;
  protocolFeeAssets: bigint;
};

export default function IlmPooledPage() {
  const { addToast } = useToasts();
  const { buildTxUrl } = useExplorerUrl();
  const { nfts } = usePositionNFTs();

  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");

  const [supplyAmount, setSupplyAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [addCollateralAmount, setAddCollateralAmount] = useState("");
  const [removeCollateralAmount, setRemoveCollateralAmount] = useState("");

  const [liquidatorPositionId, setLiquidatorPositionId] = useState("");
  const [borrowerPositionId, setBorrowerPositionId] = useState("");
  const [debtToCover, setDebtToCover] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoanPoolId, setCreateLoanPoolId] = useState("");
  const [createCollateralPoolId, setCreateCollateralPoolId] = useState("");
  const [createModuleId, setCreateModuleId] = useState("");
  const [createLtvBps, setCreateLtvBps] = useState("7500");
  const [createLiquidationThresholdBps, setCreateLiquidationThresholdBps] = useState("8000");
  const [createLiquidationBonusBps, setCreateLiquidationBonusBps] = useState("500");
  const [createLiquidationProtocolFeeBps, setCreateLiquidationProtocolFeeBps] = useState("100");
  const [createReserveFactorBps, setCreateReserveFactorBps] = useState("1000");
  const [createOptimalUtilizationBps, setCreateOptimalUtilizationBps] = useState("8000");
  const [createBaseVariableRateRayPerYear, setCreateBaseVariableRateRayPerYear] = useState("0");
  const [createVariableSlope1RayPerYear, setCreateVariableSlope1RayPerYear] = useState("0");
  const [createVariableSlope2RayPerYear, setCreateVariableSlope2RayPerYear] = useState("0");
  const [createSupplyCap, setCreateSupplyCap] = useState("0");
  const [createBorrowCap, setCreateBorrowCap] = useState("0");

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
  } = useIlmPooled(selectedMarketId, selectedPositionId);
  const typedState = state as IlmPooledStateView;

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
    if (!liquidatorPositionId && selectedPositionId) {
      setLiquidatorPositionId(selectedPositionId);
    }
  }, [liquidatorPositionId, selectedPositionId]);

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
  const collateralTicker = selectedMarket?.collateralPool?.ticker || `Pool ${selectedMarket?.collateralPoolId ?? "?"}`;

  const healthFactorLabel = useMemo(() => {
    const hf = typedState.healthFactor;
    if (hf === null) return "—";
    if (hf > 10n ** 34n) return "∞";
    return formatDisplay(hf, 18, 4);
  }, [typedState.healthFactor]);

  const utilizationPct = useMemo(() => {
    const utilizationBps = typedState.market?.utilizationBps ?? 0;
    return utilizationBps / 100;
  }, [typedState.market?.utilizationBps]);

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
      const amount = parseAmountInput(supplyAmount, loanDecimals, "Supply amount");
      if (amount <= 0n) throw new Error("Supply amount must be greater than zero");
      const hash = await actions.pooledSupply({ amount });
      setSupplyAmount("");
      return hash;
    });

  const runWithdraw = () =>
    submit("Withdraw", async () => {
      const amount = parseAmountInput(withdrawAmount, loanDecimals, "Withdraw amount");
      if (amount <= 0n) throw new Error("Withdraw amount must be greater than zero");
      const hash = await actions.pooledWithdraw({ amount });
      setWithdrawAmount("");
      return hash;
    });

  const runBorrow = () =>
    submit("Borrow", async () => {
      const amount = parseAmountInput(borrowAmount, loanDecimals, "Borrow amount");
      if (amount <= 0n) throw new Error("Borrow amount must be greater than zero");
      const hash = await actions.pooledBorrow({ amount });
      setBorrowAmount("");
      return hash;
    });

  const runRepay = () =>
    submit("Repay", async () => {
      const amount = parseAmountInput(repayAmount, loanDecimals, "Repay amount");
      if (amount <= 0n) throw new Error("Repay amount must be greater than zero");
      const hash = await actions.pooledRepay({ amount });
      setRepayAmount("");
      return hash;
    });

  const runAddCollateral = () =>
    submit("Add Collateral", async () => {
      const amount = parseAmountInput(addCollateralAmount, collateralDecimals, "Collateral amount");
      if (amount <= 0n) throw new Error("Collateral amount must be greater than zero");
      const hash = await actions.pooledAddCollateral({ amount });
      setAddCollateralAmount("");
      return hash;
    });

  const runRemoveCollateral = () =>
    submit("Remove Collateral", async () => {
      const amount = parseAmountInput(removeCollateralAmount, collateralDecimals, "Collateral amount");
      if (amount <= 0n) throw new Error("Collateral amount must be greater than zero");
      const hash = await actions.pooledRemoveCollateral({ amount });
      setRemoveCollateralAmount("");
      return hash;
    });

  const runLiquidation = () =>
    submit("Liquidation", async () => {
      const liquidatorId = parseUintInput(liquidatorPositionId || selectedPositionId, "Liquidator position ID");
      const borrowerId = parseUintInput(borrowerPositionId, "Borrower position ID");
      const debt = parseAmountInput(debtToCover, loanDecimals, "Debt to cover");
      if (debt <= 0n) throw new Error("Debt to cover must be greater than zero");

      const hash = await actions.pooledLiquidationCall({
        liquidatorPositionId: liquidatorId,
        borrowerPositionId: borrowerId,
        debtToCover: debt,
      });
      setBorrowerPositionId("");
      setDebtToCover("");
      return hash;
    });

  const runCreateMarket = () =>
    submit("Create Market", async () => {
      const hash = await actions.createMarket({
        loanPoolId: parseUintInput(createLoanPoolId, "Loan pool ID"),
        collateralPoolId: parseUintInput(createCollateralPoolId, "Collateral pool ID"),
        moduleId: parseUintInput(createModuleId, "Module ID"),
        ltvBps: parseBpsInput(createLtvBps, "LTV bps"),
        liquidationThresholdBps: parseBpsInput(createLiquidationThresholdBps, "Liquidation threshold bps"),
        liquidationBonusBps: parseBpsInput(createLiquidationBonusBps, "Liquidation bonus bps"),
        liquidationProtocolFeeBps: parseBpsInput(
          createLiquidationProtocolFeeBps,
          "Liquidation protocol fee bps",
        ),
        reserveFactorBps: parseBpsInput(createReserveFactorBps, "Reserve factor bps"),
        optimalUtilizationBps: parseBpsInput(createOptimalUtilizationBps, "Optimal utilization bps"),
        baseVariableRateRayPerYear: parseUint32Input(
          createBaseVariableRateRayPerYear,
          "Base variable rate ray/year",
        ),
        variableSlope1RayPerYear: parseUint32Input(createVariableSlope1RayPerYear, "Variable slope1 ray/year"),
        variableSlope2RayPerYear: parseUint32Input(createVariableSlope2RayPerYear, "Variable slope2 ray/year"),
        supplyCap: parseUintInput(createSupplyCap, "Supply cap"),
        borrowCap: parseUintInput(createBorrowCap, "Borrow cap"),
      });

      setIsCreateOpen(false);
      await refreshCatalog();
      return hash;
    });

  return (
    <AppShell title="ILM Pooled Lending">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 pointer-events-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral3">EqualFi</p>
            <h1 className="text-3xl font-bold text-neutral1">ILM Pooled</h1>
            <p className="text-neutral2">
              Pooled-market lending with supply, collateral, borrow, repay, and liquidation operations.
            </p>
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
          <SectionHeader title="MARKET" subtitle="Config + on-chain discovery" />
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm text-neutral2">
              ILM Pooled Market
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
              <div className="mt-2 rounded-xl border border-surface3 bg-surface2 px-3 py-2 font-mono text-xs text-neutral1">
                {selectedMarket?.marketId ?? "—"}
              </div>
            </div>
          </div>

          {markets.length === 0 && (
            <p className="mt-4 text-sm text-amber-300">
              No ILM pooled markets found. Add `ilmPooledMarkets` in `src/lib/pools.json` or click Sync Markets.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full bg-surface3 px-4 py-2 text-xs font-semibold text-neutral1 hover:bg-surface2"
            >
              Refresh State
            </button>
            <button
              type="button"
              onClick={() => refreshCatalog()}
              className="rounded-full bg-surface3 px-4 py-2 text-xs font-semibold text-neutral1 hover:bg-surface2"
            >
              Sync Markets
            </button>
            {loading && <span className="text-xs text-neutral3">Loading market state…</span>}
            {error && <span className="text-xs text-rose-300">{error}</span>}
            {catalogLoading && <span className="text-xs text-neutral3">Discovering market IDs…</span>}
            {catalogError && <span className="text-xs text-amber-300">{catalogError}</span>}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <SectionHeader title="MARKET STATE" subtitle={`${loanTicker} pool metrics`} />
            <div className="mt-4 space-y-2 text-sm text-neutral2">
              <div>
                Total Supply: {formatDisplay(typedState.market?.totalSupplyAssets, loanDecimals)} {loanTicker}
              </div>
              <div>Total Debt: {formatDisplay(typedState.market?.totalDebtAssets, loanDecimals)} {loanTicker}</div>
              <div>
                Available Liquidity: {formatDisplay(typedState.market?.availableLiquidity, loanDecimals)} {loanTicker}
              </div>
              <div>Utilization: {utilizationPct.toFixed(2)}%</div>
              <div>Protocol Fee Claim: {formatDisplay(typedState.protocolFeeAssets, loanDecimals)} {loanTicker}</div>
              <div>Bad Debt: {formatDisplay(typedState.market?.badDebt, loanDecimals)} {loanTicker}</div>
            </div>
          </Card>

          <Card>
            <SectionHeader title="RISK PARAMS" subtitle="LTV + liquidation controls" />
            <div className="mt-4 space-y-2 text-sm text-neutral2">
              <div>LTV: {((typedState.market?.ltvBps ?? 0) / 100).toFixed(2)}%</div>
              <div>
                Liquidation Threshold: {((typedState.market?.liquidationThresholdBps ?? 0) / 100).toFixed(2)}%
              </div>
              <div>Liquidation Bonus: {((typedState.market?.liquidationBonusBps ?? 0) / 100).toFixed(2)}%</div>
              <div>Liquidation Protocol Fee: {((typedState.market?.liquidationProtocolFeeBps ?? 0) / 100).toFixed(2)}%</div>
              <div>Reserve Factor: {((typedState.market?.reserveFactorBps ?? 0) / 100).toFixed(2)}%</div>
              <div>Supply Cap: {formatDisplay(typedState.market?.supplyCap, loanDecimals)} {loanTicker}</div>
              <div>Borrow Cap: {formatDisplay(typedState.market?.borrowCap, loanDecimals)} {loanTicker}</div>
              <div>Health Factor: {healthFactorLabel}</div>
            </div>
          </Card>

          <Card>
            <SectionHeader title="POSITION" subtitle="Selected NFT position" />
            <div className="mt-4 space-y-2 text-sm text-neutral2">
              <div>Supply Balance: {formatDisplay(typedState.supplyBalance, loanDecimals)} {loanTicker}</div>
              <div>Debt Balance: {formatDisplay(typedState.debtBalance, loanDecimals)} {loanTicker}</div>
              <div>Scaled Supply: {typedState.position?.scaledSupply?.toString() ?? "—"}</div>
              <div>Scaled Debt: {typedState.position?.scaledDebt?.toString() ?? "—"}</div>
              <div>Use As Collateral: {typedState.position?.useAsCollateral ? "Yes" : "No"}</div>
              <div>Module ID: {selectedMarket?.moduleId ?? "—"}</div>
              <div>Flags: {typedState.market ? `${typedState.market.active ? "active" : "inactive"} / ${typedState.market.paused ? "paused" : "live"} / ${typedState.market.frozen ? "frozen" : "unfrozen"}` : "—"}</div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <SectionHeader title="SUPPLY / WITHDRAW" subtitle={`${loanTicker} market side`} />
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder={`Supply amount (${loanTicker})`}
                value={supplyAmount}
                onChange={(e) => setSupplyAmount(e.target.value)}
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
                placeholder={`Withdraw amount (${loanTicker})`}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
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
                placeholder={`Borrow amount (${loanTicker})`}
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(e.target.value)}
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
                placeholder={`Repay amount (${loanTicker})`}
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
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
                placeholder={`Add collateral (${collateralTicker})`}
                value={addCollateralAmount}
                onChange={(e) => setAddCollateralAmount(e.target.value)}
              />
              <button
                type="button"
                disabled={pendingWrite}
                onClick={runAddCollateral}
                className="w-full rounded-full bg-accent1 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
              >
                Add Collateral
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder={`Remove collateral (${collateralTicker})`}
                value={removeCollateralAmount}
                onChange={(e) => setRemoveCollateralAmount(e.target.value)}
              />
              <button
                type="button"
                disabled={pendingWrite}
                onClick={runRemoveCollateral}
                className="w-full rounded-full bg-surface3 px-4 py-2 text-sm font-semibold text-neutral1 disabled:opacity-60"
              >
                Remove Collateral
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral3">
            ILM pooled actions use principal and module encumbrance under your selected Position NFT.
          </p>
        </Card>

        <Card>
          <SectionHeader title="LIQUIDATION" subtitle="Liquidator and borrower positions" />
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input
              className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
              placeholder="Liquidator position ID"
              value={liquidatorPositionId}
              onChange={(e) => setLiquidatorPositionId(e.target.value)}
            />
            <input
              className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
              placeholder="Borrower position ID"
              value={borrowerPositionId}
              onChange={(e) => setBorrowerPositionId(e.target.value)}
            />
            <input
              className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
              placeholder={`Debt to cover (${loanTicker})`}
              value={debtToCover}
              onChange={(e) => setDebtToCover(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <button
              type="button"
              disabled={pendingWrite}
              onClick={runLiquidation}
              className="rounded-full bg-accent1 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            >
              Liquidate
            </button>
          </div>
        </Card>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:px-4">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-none border-white/10 bg-[#0b1021] shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-3xl sm:border">
            <div className="flex-shrink-0 flex items-start justify-between border-b border-white/10 p-4 sm:p-6 sm:pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-foam/60">ILM Pooled</p>
                <h2 className="text-xl sm:text-2xl font-semibold text-foam">Create Pooled Market</h2>
                <p className="mt-1 text-sm text-neutral2">
                  Governance-only on most deployments. All values are raw contract inputs.
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
                <div className="grid gap-4 sm:grid-cols-3">
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

                <div className="grid gap-4 sm:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">LTV bps</span>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={createLtvBps}
                      onChange={(e) => setCreateLtvBps(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Liq Threshold bps</span>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={createLiquidationThresholdBps}
                      onChange={(e) => setCreateLiquidationThresholdBps(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Liq Bonus bps</span>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={createLiquidationBonusBps}
                      onChange={(e) => setCreateLiquidationBonusBps(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Liq Fee bps</span>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={createLiquidationProtocolFeeBps}
                      onChange={(e) => setCreateLiquidationProtocolFeeBps(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Reserve Factor bps</span>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={createReserveFactorBps}
                      onChange={(e) => setCreateReserveFactorBps(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Optimal Util bps</span>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={createOptimalUtilizationBps}
                      onChange={(e) => setCreateOptimalUtilizationBps(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Base Rate (uint32)</span>
                    <input
                      type="number"
                      min="0"
                      value={createBaseVariableRateRayPerYear}
                      onChange={(e) => setCreateBaseVariableRateRayPerYear(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Slope1 (uint32)</span>
                    <input
                      type="number"
                      min="0"
                      value={createVariableSlope1RayPerYear}
                      onChange={(e) => setCreateVariableSlope1RayPerYear(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Slope2 (uint32)</span>
                    <input
                      type="number"
                      min="0"
                      value={createVariableSlope2RayPerYear}
                      onChange={(e) => setCreateVariableSlope2RayPerYear(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Supply Cap (raw)</span>
                    <input
                      type="text"
                      value={createSupplyCap}
                      onChange={(e) => setCreateSupplyCap(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral3">Borrow Cap (raw)</span>
                    <input
                      type="text"
                      value={createBorrowCap}
                      onChange={(e) => setCreateBorrowCap(e.target.value)}
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
