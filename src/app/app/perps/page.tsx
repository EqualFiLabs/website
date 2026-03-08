"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";

import { AppShell } from "../../app-shell";
import { Card, SectionHeader } from "../../app-components";
import { useToasts } from "@/components/common/ToastProvider";
import useActiveChainId from "@/lib/hooks/useActiveChainId";
import useExplorerUrl from "@/lib/hooks/useExplorerUrl";
import usePerps from "@/lib/hooks/usePerps";
import usePositionNFTs from "@/lib/hooks/usePositionNFTs";

const ROBINHOOD_TESTNET_CHAIN_ID = 46630;

const formatDisplay = (value: bigint | number | null | undefined, decimals = 18, maxFraction = 6) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value.toLocaleString(undefined, { maximumFractionDigits: maxFraction })
      : "—";
  }

  const normalized = Number(formatUnits(value, decimals));
  if (!Number.isFinite(normalized)) return "—";

  return normalized.toLocaleString(undefined, {
    maximumFractionDigits: maxFraction,
    minimumFractionDigits: 0,
  });
};

const parseUintInput = (value: string, label: string): bigint => {
  const trimmed = (value || "").trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label} must be an integer`);
  }
  return BigInt(trimmed);
};

const parseAmountInput = (value: string, decimals: number, label: string): bigint => {
  const trimmed = (value || "").trim();
  if (!trimmed) throw new Error(`${label} is required`);
  if (trimmed.startsWith("-")) throw new Error(`${label} must be non-negative`);
  return parseUnits(trimmed, decimals);
};

const parseUsdX18Input = (value: string, label: string): bigint => parseAmountInput(value, 18, label);

export default function PerpsPage() {
  const activeChainId = useActiveChainId();
  const { addToast } = useToasts();
  const { buildTxUrl } = useExplorerUrl();
  const { nfts } = usePositionNFTs();

  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [subaccountNonceInput, setSubaccountNonceInput] = useState("0");

  const [collateralAddAmount, setCollateralAddAmount] = useState("");
  const [collateralRemoveAmount, setCollateralRemoveAmount] = useState("");

  const [tradeSide, setTradeSide] = useState<"long" | "short">("long");
  const [sizeDeltaUsd, setSizeDeltaUsd] = useState("");
  const [executionPrice, setExecutionPrice] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [maxSlippageBps, setMaxSlippageBps] = useState("100");
  const [feePoolId, setFeePoolId] = useState("");
  const [executorFee, setExecutorFee] = useState("0");

  const parsedSubaccountNonce = useMemo(() => {
    if (!/^\d+$/.test(subaccountNonceInput.trim())) return 0n;
    return BigInt(subaccountNonceInput.trim());
  }, [subaccountNonceInput]);

  const { markets, selectedMarket, state, loading, error, pendingWrite, actions, refetch } = usePerps(
    selectedMarketId,
    selectedPositionId,
    parsedSubaccountNonce,
  );

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
    if (!selectedMarket) return;
    setFeePoolId(String(selectedMarket.feePoolId));
    setMaxSlippageBps(String(selectedMarket.defaultMaxSlippageBps));
    setExecutorFee(formatUnits(selectedMarket.defaultExecutorFee || 0n, 18));
  }, [selectedMarket]);

  const isRobinhoodChain = Number(activeChainId) === ROBINHOOD_TESTNET_CHAIN_ID;

  const collateralDecimals = selectedMarket?.collateralPool?.decimals ?? 18;
  const collateralTicker =
    selectedMarket?.collateralPool?.ticker || `Pool ${selectedMarket?.collateralPoolId ?? "?"}`;

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
      addToast({
        title: `${label} failed`,
        description: err instanceof Error ? err.message : "Transaction failed",
        type: "error",
      });
    }
  };

  const parseTradeInputs = () => ({
    isLong: tradeSide === "long",
    sizeDeltaUsdX18: parseUsdX18Input(sizeDeltaUsd, "Size delta"),
    executionPriceX18: parseUsdX18Input(executionPrice, "Execution price"),
    limitPriceX18: parseUsdX18Input(limitPrice, "Limit price"),
    maxSlippageBps: parseUintInput(maxSlippageBps, "Max slippage bps"),
    feePoolId: parseUintInput(feePoolId, "Fee pool ID"),
    executorFee: parseUsdX18Input(executorFee, "Executor fee"),
  });

  const runCreateAccount = () =>
    submit("Create Account", async () => {
      const hash = await actions.createAccount();
      return hash;
    });

  const runAddCollateral = () =>
    submit("Add Collateral", async () => {
      const amount = parseAmountInput(collateralAddAmount, collateralDecimals, "Collateral amount");
      if (amount <= 0n) throw new Error("Collateral amount must be greater than zero");
      const hash = await actions.addCollateral({ amount });
      setCollateralAddAmount("");
      return hash;
    });

  const runRemoveCollateral = () =>
    submit("Remove Collateral", async () => {
      const amount = parseAmountInput(collateralRemoveAmount, collateralDecimals, "Collateral amount");
      if (amount <= 0n) throw new Error("Collateral amount must be greater than zero");
      const hash = await actions.removeCollateral({ amount });
      setCollateralRemoveAmount("");
      return hash;
    });

  const runOpenOrIncrease = () =>
    submit("Open/Increase", async () => {
      const args = parseTradeInputs();
      if (args.sizeDeltaUsdX18 <= 0n) throw new Error("Size delta must be greater than zero");
      const hash = await actions.openOrIncrease(args);
      return hash;
    });

  const runDecreaseOrClose = () =>
    submit("Decrease/Close", async () => {
      const args = parseTradeInputs();
      if (args.sizeDeltaUsdX18 <= 0n) throw new Error("Size delta must be greater than zero");
      const hash = await actions.decreaseOrClose(args);
      return hash;
    });

  return (
    <AppShell title="Perps">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 pointer-events-auto">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral3">EqualFi</p>
          <h1 className="text-3xl font-bold text-neutral1">Perps (MVP)</h1>
          <p className="text-neutral2">Create perps account, manage collateral, and execute open/close flows.</p>
        </div>

        {!isRobinhoodChain && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Perps MVP is currently configured for Robinhood Testnet (chain {ROBINHOOD_TESTNET_CHAIN_ID}) only.
          </div>
        )}

        <Card>
          <SectionHeader title="MARKET + ACCOUNT" subtitle="Robinhood config driven" />
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="text-sm text-neutral2">
              Perps Market
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

            <label className="text-sm text-neutral2">
              Subaccount Nonce
              <input
                className="mt-2 w-full rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                value={subaccountNonceInput}
                onChange={(e) => setSubaccountNonceInput(e.target.value)}
                placeholder="0"
              />
            </label>

            <div className="text-sm text-neutral2">
              <div>Account Status</div>
              <div className="mt-2 rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1">
                {state.accountExists ? "Created" : "Not created"}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="text-sm text-neutral2">
              <div>Market ID</div>
              <div className="mt-2 break-all rounded-xl border border-surface3 bg-surface2 px-3 py-2 font-mono text-xs text-neutral1">
                {selectedMarket?.marketId || "—"}
              </div>
            </div>
            <div className="text-sm text-neutral2">
              <div>Account ID</div>
              <div className="mt-2 break-all rounded-xl border border-surface3 bg-surface2 px-3 py-2 font-mono text-xs text-neutral1">
                {state.accountId || "—"}
              </div>
            </div>
          </div>

          {markets.length === 0 && (
            <p className="mt-4 text-sm text-amber-300">
              No perps markets configured for this network. Add `perpsMarkets` entries to `src/lib/pools.json` under
              `robinhoodTestnet`.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full bg-surface3 px-4 py-2 text-xs font-semibold text-neutral1 hover:bg-surface2"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={runCreateAccount}
              disabled={pendingWrite || !selectedPositionId || !selectedMarket}
              className="rounded-full bg-accent1 px-4 py-2 text-xs font-semibold text-ink disabled:opacity-60"
            >
              Create Account
            </button>
            {loading && <span className="text-xs text-neutral3">Loading perps state…</span>}
            {error && <span className="text-xs text-rose-300">{error}</span>}
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <SectionHeader title="MARKET STATE" subtitle="Risk + OI" />
            <div className="mt-4 space-y-2 text-sm text-neutral2">
              <div>Collateral Asset: {selectedMarket?.collateralAsset || "—"}</div>
              <div>Index Asset: {selectedMarket?.indexAsset || "—"}</div>
              <div>Open Interest (Long): {formatDisplay(state.marketState?.openInterestLong)}</div>
              <div>Open Interest (Short): {formatDisplay(state.marketState?.openInterestShort)}</div>
              <div>Taker Fee: {state.market?.takerFeeBps ?? "—"} bps</div>
              <div>Maker Fee: {state.market?.makerFeeBps ?? "—"} bps</div>
              <div>Reserved Collateral: {formatDisplay(state.marketState?.reservedCollateral, collateralDecimals)} {collateralTicker}</div>
            </div>
          </Card>

          <Card>
            <SectionHeader title="ACCOUNT HEALTH" subtitle="Preview health view" />
            <div className="mt-4 space-y-2 text-sm text-neutral2">
              <div>Collateral: {formatDisplay(state.collateral, collateralDecimals)} {collateralTicker}</div>
              <div>Mark Price: {formatDisplay(state.markPriceX18, 18)}</div>
              <div>Equity: {formatDisplay(state.health?.equityUsdX18, 18)}</div>
              <div>Leverage (bps): {state.health?.leverageBps?.toString() ?? "—"}</div>
              <div>Initial Margin Check: {state.health?.meetsInitialMargin ? "Pass" : "Fail"}</div>
              <div>Maintenance Check: {state.health?.meetsMaintenanceMargin ? "Pass" : "Fail"}</div>
            </div>
          </Card>

          <Card>
            <SectionHeader title="POSITIONS" subtitle="Long + short notional" />
            <div className="mt-4 space-y-2 text-sm text-neutral2">
              <div>Long Size (USD): {formatDisplay(state.longPosition?.sizeUsdX18, 18)}</div>
              <div>Long Entry: {formatDisplay(state.longPosition?.entryPriceX18, 18)}</div>
              <div>Long Realized PnL: {formatDisplay(state.longPosition?.realizedPnlX18, 18)}</div>
              <div>Short Size (USD): {formatDisplay(state.shortPosition?.sizeUsdX18, 18)}</div>
              <div>Short Entry: {formatDisplay(state.shortPosition?.entryPriceX18, 18)}</div>
              <div>Short Realized PnL: {formatDisplay(state.shortPosition?.realizedPnlX18, 18)}</div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <SectionHeader title="COLLATERAL" subtitle={`${collateralTicker} collateral management`} />
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder={`Add collateral (${collateralTicker})`}
                value={collateralAddAmount}
                onChange={(e) => setCollateralAddAmount(e.target.value)}
              />
              <button
                type="button"
                disabled={pendingWrite}
                onClick={runAddCollateral}
                className="rounded-full bg-accent1 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
              >
                Add Collateral
              </button>

              <hr className="border-surface3" />

              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder={`Remove collateral (${collateralTicker})`}
                value={collateralRemoveAmount}
                onChange={(e) => setCollateralRemoveAmount(e.target.value)}
              />
              <button
                type="button"
                disabled={pendingWrite}
                onClick={runRemoveCollateral}
                className="rounded-full bg-surface3 px-4 py-2 text-sm font-semibold text-neutral1 disabled:opacity-60"
              >
                Remove Collateral
              </button>
            </div>
          </Card>

          <Card>
            <SectionHeader title="TRADE" subtitle="Open/increase and decrease/close" />
            <div className="mt-4 grid gap-3">
              <label className="text-sm text-neutral2">
                Side
                <select
                  className="mt-2 w-full rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                  value={tradeSide}
                  onChange={(e) => setTradeSide(e.target.value as "long" | "short")}
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </label>

              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder="Size Delta USD (x18)"
                value={sizeDeltaUsd}
                onChange={(e) => setSizeDeltaUsd(e.target.value)}
              />
              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder="Execution Price (x18)"
                value={executionPrice}
                onChange={(e) => setExecutionPrice(e.target.value)}
              />
              <input
                className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                placeholder="Limit Price (x18)"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <input
                  className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                  placeholder="Slippage bps"
                  value={maxSlippageBps}
                  onChange={(e) => setMaxSlippageBps(e.target.value)}
                />
                <input
                  className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                  placeholder="Fee Pool ID"
                  value={feePoolId}
                  onChange={(e) => setFeePoolId(e.target.value)}
                />
                <input
                  className="rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-sm text-neutral1"
                  placeholder="Executor Fee (x18)"
                  value={executorFee}
                  onChange={(e) => setExecutorFee(e.target.value)}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  disabled={pendingWrite}
                  onClick={runOpenOrIncrease}
                  className="rounded-full bg-accent1 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                >
                  Open / Increase
                </button>
                <button
                  type="button"
                  disabled={pendingWrite}
                  onClick={runDecreaseOrClose}
                  className="rounded-full bg-surface3 px-4 py-2 text-sm font-semibold text-neutral1 disabled:opacity-60"
                >
                  Decrease / Close
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
