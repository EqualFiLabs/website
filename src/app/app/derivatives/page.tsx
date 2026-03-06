"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { AppShell } from "../../app-shell";
import { ActionButton, Card, Field, Input, SectionHeader, Select, StatusLine } from "../../app-components";
import { useToasts } from "@/components/common/ToastProvider";
import { derivativeToken1155Abi } from "@/lib/abis/derivativeToken1155";
import { futuresFacetAbi } from "@/lib/abis/futuresFacet";
import { optionsFacetAbi } from "@/lib/abis/optionsFacet";
import {
  createFuturesSeriesWriteRequest,
  createOptionSeriesWriteRequest,
  derivativesV1Capabilities,
  getFuturesSeriesReadRequest,
  getOptionSeriesReadRequest,
  mapFuturesSeries,
  mapOptionSeries,
  type FuturesSeries,
  type OptionSeries,
} from "@/lib/derivatives";
import useActiveChainId from "@/lib/hooks/useActiveChainId";
import useActivePublicClient from "@/lib/hooks/useActivePublicClient";
import useBufferedWriteContract from "@/lib/hooks/useBufferedWriteContract";
import useExplorerUrl from "@/lib/hooks/useExplorerUrl";
import usePoolsConfig from "@/lib/hooks/usePoolsConfig";
import useProtocolAddresses from "@/lib/hooks/useProtocolAddresses";
import usePositionNFTs from "@/lib/hooks/usePositionNFTs";
import {
  asString,
  buildPoolIdOptions,
  buildPositionIdOptions,
  formatUnixTimestamp,
  parseOptionalUint,
  parseRequiredUint,
  parseExpirySeconds,
  parseTokenAmount,
} from "@/lib/derivatives/ui";
import { resolveChainAddressEnv } from "@/lib/foundryOverrides";

type Scope = "active" | "all";

type OptionApiRow = {
  chain_id: number | string;
  series_id: number | string;
  maker_position_id: number | string | null;
  underlying_pool_id: number | string | null;
  strike_pool_id: number | string | null;
  strike_price: string | null;
  expiry: number | string | null;
  total_size: string | null;
  remaining_size: string | null;
  collateral_locked: string | null;
  create_fee_bps: number | string | null;
  exercise_fee_bps: number | string | null;
  reclaim_fee_bps: number | string | null;
  is_call: boolean | null;
  is_american: boolean | null;
  reclaimed: boolean | null;
  updated_at: string;
};

type FuturesApiRow = {
  chain_id: number | string;
  series_id: number | string;
  maker_position_id: number | string | null;
  underlying_pool_id: number | string | null;
  quote_pool_id: number | string | null;
  forward_price: string | null;
  expiry: number | string | null;
  grace_unlock_time: number | string | null;
  total_size: string | null;
  remaining_size: string | null;
  underlying_locked: string | null;
  create_fee_bps: number | string | null;
  exercise_fee_bps: number | string | null;
  reclaim_fee_bps: number | string | null;
  is_european: boolean | null;
  reclaimed: boolean | null;
  updated_at: string;
};

const EMPTY_OPTION_FORM = {
  positionId: "",
  underlyingPoolId: "",
  strikePoolId: "",
  strikePrice: "",
  expiry: "",
  totalSize: "",
  contractSize: "1",
  isCall: true,
  isAmerican: false,
  useCustomFees: false,
  createFeeBps: "",
  exerciseFeeBps: "",
  reclaimFeeBps: "",
};

const EMPTY_FUTURES_FORM = {
  positionId: "",
  underlyingPoolId: "",
  quotePoolId: "",
  forwardPrice: "",
  expiry: "",
  totalSize: "",
  contractSize: "1",
  isEuropean: true,
  useCustomFees: false,
  createFeeBps: "",
  exerciseFeeBps: "",
  reclaimFeeBps: "",
};

const EMPTY_OPTION_ACTION = {
  seriesId: "",
  amount: "",
  recipient: "",
  maxPayment: "",
  minReceived: "0",
  msgValue: "",
  holder: "",
  burnAmount: "",
};

const EMPTY_FUTURES_ACTION = {
  seriesId: "",
  amount: "",
  recipient: "",
  maxPayment: "",
  minReceived: "0",
  msgValue: "",
  holder: "",
  burnAmount: "",
};

function ensureAddress(value: string, label: string): `0x${string}` {
  const trimmed = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    throw new Error(`${label} must be a valid address`);
  }
  return trimmed as `0x${string}`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Transaction failed";
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export default function DerivativesPage() {
  const { address, isConnected } = useAccount();
  const publicClient = useActivePublicClient();
  const chainId = useActiveChainId();
  const poolsConfig = usePoolsConfig();
  const { diamondAddress } = useProtocolAddresses();
  const { nfts } = usePositionNFTs();
  const { writeContractAsync } = useBufferedWriteContract();
  const { addToast } = useToasts();
  const { buildTxUrl } = useExplorerUrl();

  const optionTokenAddress = useMemo(() => {
    const value = resolveChainAddressEnv(
      chainId,
      "NEXT_PUBLIC_OPTION_TOKEN",
      "NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY",
      "NEXT_PUBLIC_OPTION_TOKEN_ROBINHOOD_TESTNET",
    );
    return value ? (value as `0x${string}`) : undefined;
  }, [chainId]);
  const futuresTokenAddress = useMemo(() => {
    const value = resolveChainAddressEnv(
      chainId,
      "NEXT_PUBLIC_FUTURES_TOKEN",
      "NEXT_PUBLIC_FUTURES_TOKEN_FOUNDRY",
      "NEXT_PUBLIC_FUTURES_TOKEN_ROBINHOOD_TESTNET",
    );
    return value ? (value as `0x${string}`) : undefined;
  }, [chainId]);

  const [scope, setScope] = useState<Scope>("active");
  const [makerPositionIdFilter, setMakerPositionIdFilter] = useState("");
  const [options, setOptions] = useState<OptionApiRow[]>([]);
  const [futures, setFutures] = useState<FuturesApiRow[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesError, setSeriesError] = useState<string | undefined>();

  const [optionForm, setOptionForm] = useState(EMPTY_OPTION_FORM);
  const [futuresForm, setFuturesForm] = useState(EMPTY_FUTURES_FORM);
  const [optionAction, setOptionAction] = useState(EMPTY_OPTION_ACTION);
  const [futuresAction, setFuturesAction] = useState(EMPTY_FUTURES_ACTION);

  const [submittingOptionCreate, setSubmittingOptionCreate] = useState(false);
  const [submittingFuturesCreate, setSubmittingFuturesCreate] = useState(false);
  const [submittingOptionAction, setSubmittingOptionAction] = useState(false);
  const [submittingFuturesAction, setSubmittingFuturesAction] = useState(false);

  const [optionPreviewPayment, setOptionPreviewPayment] = useState("");
  const [futuresPreviewPayment, setFuturesPreviewPayment] = useState("");

  const [optionSeriesDetails, setOptionSeriesDetails] = useState<OptionSeries | undefined>();
  const [futuresSeriesDetails, setFuturesSeriesDetails] = useState<FuturesSeries | undefined>();

  const [optionTokenBalance, setOptionTokenBalance] = useState<string>("-");
  const [futuresTokenBalance, setFuturesTokenBalance] = useState<string>("-");

  const positionIdOptions = useMemo(() => buildPositionIdOptions(nfts), [nfts]);
  const poolIdOptions = useMemo(() => buildPoolIdOptions(poolsConfig?.pools), [poolsConfig?.pools]);
  const getPoolDecimals = useCallback(
    (poolIdInput: string) => {
      const poolId = Number(poolIdInput);
      const pool = (poolsConfig?.pools || []).find((entry) => Number(entry?.pid) === poolId);
      const decimals = Number(pool?.decimals);
      if (Number.isInteger(decimals) && decimals >= 0) {
        return decimals;
      }
      return 18;
    },
    [poolsConfig?.pools],
  );

  useEffect(() => {
    if (!address) {
      return;
    }
    setOptionAction((prev) => ({
      ...prev,
      recipient: prev.recipient || address,
      holder: prev.holder || address,
    }));
    setFuturesAction((prev) => ({
      ...prev,
      recipient: prev.recipient || address,
      holder: prev.holder || address,
    }));
  }, [address]);

  useEffect(() => {
    if (positionIdOptions.length === 0) {
      return;
    }
    const defaultPositionId = positionIdOptions[0].value;
    setOptionForm((prev) => (prev.positionId ? prev : { ...prev, positionId: defaultPositionId }));
    setFuturesForm((prev) => (prev.positionId ? prev : { ...prev, positionId: defaultPositionId }));
  }, [positionIdOptions]);

  useEffect(() => {
    if (poolIdOptions.length === 0) {
      return;
    }
    const firstPoolId = poolIdOptions[0].value;
    const secondPoolId = poolIdOptions[1]?.value ?? firstPoolId;
    setOptionForm((prev) => ({
      ...prev,
      underlyingPoolId: prev.underlyingPoolId || firstPoolId,
      strikePoolId: prev.strikePoolId || secondPoolId,
    }));
    setFuturesForm((prev) => ({
      ...prev,
      underlyingPoolId: prev.underlyingPoolId || firstPoolId,
      quotePoolId: prev.quotePoolId || secondPoolId,
    }));
  }, [poolIdOptions]);

  const loadSeries = useCallback(async () => {
    setLoadingSeries(true);
    setSeriesError(undefined);

    try {
      const params = new URLSearchParams();
      params.set("scope", scope);
      params.set("limit", "50");
      if (chainId) {
        params.set("chainId", String(chainId));
      }
      if (makerPositionIdFilter.trim()) {
        params.set("makerPositionId", makerPositionIdFilter.trim());
      }

      const [optionsResponse, futuresResponse] = await Promise.all([
        getJson<{ options: OptionApiRow[] }>(`/api/derivatives/options?${params.toString()}`),
        getJson<{ futures: FuturesApiRow[] }>(`/api/derivatives/futures?${params.toString()}`),
      ]);

      setOptions(Array.isArray(optionsResponse.options) ? optionsResponse.options : []);
      setFutures(Array.isArray(futuresResponse.futures) ? futuresResponse.futures : []);
    } catch (error) {
      setSeriesError(toErrorMessage(error));
      setOptions([]);
      setFutures([]);
    } finally {
      setLoadingSeries(false);
    }
  }, [chainId, makerPositionIdFilter, scope]);

  useEffect(() => {
    void loadSeries();
  }, [loadSeries]);

  const ensureReady = useCallback(() => {
    if (!diamondAddress) {
      throw new Error("diamondAddress is missing from pools config");
    }
    if (!publicClient || !writeContractAsync) {
      throw new Error("Wallet client unavailable");
    }
    if (!isConnected || !address) {
      throw new Error("Connect wallet to continue");
    }
    return { diamondAddress, account: address };
  }, [address, diamondAddress, isConnected, publicClient, writeContractAsync]);

  const submitWrite = useCallback(
    async (
      config: Parameters<typeof writeContractAsync>[0],
      pendingTitle: string,
      successTitle: string,
      onSuccess?: () => void,
    ) => {
      if (!publicClient) {
        throw new Error("Wallet client unavailable");
      }
      const txHash = await writeContractAsync(config);
      addToast({
        title: pendingTitle,
        description: "Waiting for confirmation...",
        type: "pending",
        link: buildTxUrl(txHash),
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      addToast({
        title: successTitle,
        description: txHash,
        type: "success",
        link: buildTxUrl(txHash),
      });
      onSuccess?.();
    },
    [addToast, buildTxUrl, publicClient, writeContractAsync],
  );

  const refreshOptionSeriesDetails = useCallback(async () => {
    if (!publicClient || !diamondAddress || !optionAction.seriesId.trim()) {
      setOptionSeriesDetails(undefined);
      return;
    }

    try {
      const seriesId = parseRequiredUint(optionAction.seriesId, "Option series id");
      const raw = await publicClient.readContract(getOptionSeriesReadRequest(diamondAddress, seriesId));
      setOptionSeriesDetails(mapOptionSeries(raw as never));
    } catch {
      setOptionSeriesDetails(undefined);
    }
  }, [diamondAddress, optionAction.seriesId, publicClient]);

  const refreshFuturesSeriesDetails = useCallback(async () => {
    if (!publicClient || !diamondAddress || !futuresAction.seriesId.trim()) {
      setFuturesSeriesDetails(undefined);
      return;
    }

    try {
      const seriesId = parseRequiredUint(futuresAction.seriesId, "Futures series id");
      const raw = await publicClient.readContract(getFuturesSeriesReadRequest(diamondAddress, seriesId));
      setFuturesSeriesDetails(mapFuturesSeries(raw as never));
    } catch {
      setFuturesSeriesDetails(undefined);
    }
  }, [diamondAddress, futuresAction.seriesId, publicClient]);

  const refreshTokenBalances = useCallback(async () => {
    if (!publicClient || !address) {
      setOptionTokenBalance("-");
      setFuturesTokenBalance("-");
      return;
    }

    try {
      if (optionTokenAddress && optionAction.seriesId.trim()) {
        const seriesId = parseRequiredUint(optionAction.seriesId, "Option series id");
        const balance = await publicClient.readContract({
          address: optionTokenAddress,
          abi: derivativeToken1155Abi,
          functionName: "balanceOf",
          args: [address, seriesId],
        });
        setOptionTokenBalance(String(balance));
      } else {
        setOptionTokenBalance("-");
      }
    } catch {
      setOptionTokenBalance("-");
    }

    try {
      if (futuresTokenAddress && futuresAction.seriesId.trim()) {
        const seriesId = parseRequiredUint(futuresAction.seriesId, "Futures series id");
        const balance = await publicClient.readContract({
          address: futuresTokenAddress,
          abi: derivativeToken1155Abi,
          functionName: "balanceOf",
          args: [address, seriesId],
        });
        setFuturesTokenBalance(String(balance));
      } else {
        setFuturesTokenBalance("-");
      }
    } catch {
      setFuturesTokenBalance("-");
    }
  }, [address, futuresAction.seriesId, futuresTokenAddress, optionAction.seriesId, optionTokenAddress, publicClient]);

  useEffect(() => {
    void refreshOptionSeriesDetails();
  }, [refreshOptionSeriesDetails]);

  useEffect(() => {
    void refreshFuturesSeriesDetails();
  }, [refreshFuturesSeriesDetails]);

  useEffect(() => {
    void refreshTokenBalances();
  }, [refreshTokenBalances]);

  const handleCreateOption = async () => {
    setSubmittingOptionCreate(true);
    try {
      const { diamondAddress: resolvedDiamond } = ensureReady();

      const config = createOptionSeriesWriteRequest(resolvedDiamond, {
        positionId: parseRequiredUint(optionForm.positionId, "Position id"),
        underlyingPoolId: parseRequiredUint(optionForm.underlyingPoolId, "Underlying pool id"),
        strikePoolId: parseRequiredUint(optionForm.strikePoolId, "Strike pool id"),
        strikePrice: parseRequiredUint(optionForm.strikePrice, "Strike price"),
        expiry: parseExpirySeconds(optionForm.expiry, "Expiry"),
        totalSize: parseTokenAmount(
          optionForm.totalSize,
          getPoolDecimals(optionForm.underlyingPoolId),
          "Total size",
        ),
        contractSize: parseRequiredUint(optionForm.contractSize, "Contract size"),
        isCall: optionForm.isCall,
        isAmerican: optionForm.isAmerican,
        useCustomFees: false,
        createFeeBps: 0,
        exerciseFeeBps: 0,
        reclaimFeeBps: 0,
      });

      await submitWrite(config, "Create option submitted", "Option series created", () => {
        setOptionForm(EMPTY_OPTION_FORM);
        void loadSeries();
      });
    } catch (error) {
      addToast({
        title: "Create option failed",
        description: toErrorMessage(error),
        type: "error",
      });
    } finally {
      setSubmittingOptionCreate(false);
    }
  };

  const handleCreateFutures = async () => {
    setSubmittingFuturesCreate(true);
    try {
      const { diamondAddress: resolvedDiamond } = ensureReady();

      const config = createFuturesSeriesWriteRequest(resolvedDiamond, {
        positionId: parseRequiredUint(futuresForm.positionId, "Position id"),
        underlyingPoolId: parseRequiredUint(futuresForm.underlyingPoolId, "Underlying pool id"),
        quotePoolId: parseRequiredUint(futuresForm.quotePoolId, "Quote pool id"),
        forwardPrice: parseRequiredUint(futuresForm.forwardPrice, "Forward price"),
        expiry: parseExpirySeconds(futuresForm.expiry, "Expiry"),
        totalSize: parseTokenAmount(
          futuresForm.totalSize,
          getPoolDecimals(futuresForm.underlyingPoolId),
          "Total size",
        ),
        contractSize: parseRequiredUint(futuresForm.contractSize, "Contract size"),
        isEuropean: futuresForm.isEuropean,
        useCustomFees: false,
        createFeeBps: 0,
        exerciseFeeBps: 0,
        reclaimFeeBps: 0,
      });

      await submitWrite(config, "Create futures submitted", "Futures series created", () => {
        setFuturesForm(EMPTY_FUTURES_FORM);
        void loadSeries();
      });
    } catch (error) {
      addToast({
        title: "Create futures failed",
        description: toErrorMessage(error),
        type: "error",
      });
    } finally {
      setSubmittingFuturesCreate(false);
    }
  };

  const previewOptionPayment = async () => {
    try {
      if (!publicClient || !diamondAddress) {
        throw new Error("Wallet client unavailable");
      }
      const seriesId = parseRequiredUint(optionAction.seriesId, "Option series id");
      const amount = parseRequiredUint(optionAction.amount, "Exercise amount");
      const payment = await publicClient.readContract({
        address: diamondAddress,
        abi: optionsFacetAbi,
        functionName: "previewExercisePayment",
        args: [seriesId, amount],
      });
      setOptionPreviewPayment(String(payment));
      setOptionAction((prev) => ({ ...prev, maxPayment: prev.maxPayment || String(payment) }));
    } catch (error) {
      addToast({ title: "Preview failed", description: toErrorMessage(error), type: "error" });
    }
  };

  const previewFuturesPayment = async () => {
    try {
      if (!publicClient || !diamondAddress) {
        throw new Error("Wallet client unavailable");
      }
      const seriesId = parseRequiredUint(futuresAction.seriesId, "Futures series id");
      const amount = parseRequiredUint(futuresAction.amount, "Settle amount");
      const payment = await publicClient.readContract({
        address: diamondAddress,
        abi: futuresFacetAbi,
        functionName: "previewSettlePayment",
        args: [seriesId, amount],
      });
      setFuturesPreviewPayment(String(payment));
      setFuturesAction((prev) => ({ ...prev, maxPayment: prev.maxPayment || String(payment) }));
    } catch (error) {
      addToast({ title: "Preview failed", description: toErrorMessage(error), type: "error" });
    }
  };

  const handleExerciseOptions = async () => {
    setSubmittingOptionAction(true);
    try {
      const { diamondAddress: resolvedDiamond, account } = ensureReady();
      const seriesId = parseRequiredUint(optionAction.seriesId, "Option series id");
      const amount = parseRequiredUint(optionAction.amount, "Exercise amount");
      const recipient = ensureAddress(optionAction.recipient || account, "Recipient");
      const maxPayment = parseRequiredUint(optionAction.maxPayment, "Max payment");
      const minReceived = parseOptionalUint(optionAction.minReceived, "Min received") ?? 0n;
      const msgValue = parseOptionalUint(optionAction.msgValue, "Tx value");

      await submitWrite(
        {
          address: resolvedDiamond,
          abi: optionsFacetAbi,
          functionName: "exerciseOptions",
          args: [seriesId, amount, recipient, maxPayment, minReceived],
          value: msgValue,
        },
        "Exercise submitted",
        "Options exercised",
        () => {
          setOptionPreviewPayment("");
          void Promise.all([loadSeries(), refreshOptionSeriesDetails(), refreshTokenBalances()]);
        },
      );
    } catch (error) {
      addToast({ title: "Exercise failed", description: toErrorMessage(error), type: "error" });
    } finally {
      setSubmittingOptionAction(false);
    }
  };

  const handleSettleFutures = async () => {
    setSubmittingFuturesAction(true);
    try {
      const { diamondAddress: resolvedDiamond, account } = ensureReady();
      const seriesId = parseRequiredUint(futuresAction.seriesId, "Futures series id");
      const amount = parseRequiredUint(futuresAction.amount, "Settle amount");
      const recipient = ensureAddress(futuresAction.recipient || account, "Recipient");
      const maxPayment = parseRequiredUint(futuresAction.maxPayment, "Max payment");
      const minReceived = parseOptionalUint(futuresAction.minReceived, "Min received") ?? 0n;
      const msgValue = parseOptionalUint(futuresAction.msgValue, "Tx value");

      await submitWrite(
        {
          address: resolvedDiamond,
          abi: futuresFacetAbi,
          functionName: "settleFutures",
          args: [seriesId, amount, recipient, maxPayment, minReceived],
          value: msgValue,
        },
        "Settle submitted",
        "Futures settled",
        () => {
          setFuturesPreviewPayment("");
          void Promise.all([loadSeries(), refreshFuturesSeriesDetails(), refreshTokenBalances()]);
        },
      );
    } catch (error) {
      addToast({ title: "Settle failed", description: toErrorMessage(error), type: "error" });
    } finally {
      setSubmittingFuturesAction(false);
    }
  };

  const handleReclaimOptions = async () => {
    setSubmittingOptionAction(true);
    try {
      const { diamondAddress: resolvedDiamond } = ensureReady();
      const seriesId = parseRequiredUint(optionAction.seriesId, "Option series id");

      await submitWrite(
        {
          address: resolvedDiamond,
          abi: optionsFacetAbi,
          functionName: "reclaimOptions",
          args: [seriesId],
        },
        "Reclaim submitted",
        "Options reclaimed",
        () => {
          void Promise.all([loadSeries(), refreshOptionSeriesDetails()]);
        },
      );
    } catch (error) {
      addToast({ title: "Reclaim failed", description: toErrorMessage(error), type: "error" });
    } finally {
      setSubmittingOptionAction(false);
    }
  };

  const handleReclaimFutures = async () => {
    setSubmittingFuturesAction(true);
    try {
      const { diamondAddress: resolvedDiamond } = ensureReady();
      const seriesId = parseRequiredUint(futuresAction.seriesId, "Futures series id");

      await submitWrite(
        {
          address: resolvedDiamond,
          abi: futuresFacetAbi,
          functionName: "reclaimFutures",
          args: [seriesId],
        },
        "Reclaim submitted",
        "Futures reclaimed",
        () => {
          void Promise.all([loadSeries(), refreshFuturesSeriesDetails()]);
        },
      );
    } catch (error) {
      addToast({ title: "Reclaim failed", description: toErrorMessage(error), type: "error" });
    } finally {
      setSubmittingFuturesAction(false);
    }
  };

  const handleBurnOptionClaims = async () => {
    setSubmittingOptionAction(true);
    try {
      const { diamondAddress: resolvedDiamond, account } = ensureReady();
      const seriesId = parseRequiredUint(optionAction.seriesId, "Option series id");
      const holder = ensureAddress(optionAction.holder || account, "Holder");
      const amount = parseRequiredUint(optionAction.burnAmount, "Burn amount");

      await submitWrite(
        {
          address: resolvedDiamond,
          abi: optionsFacetAbi,
          functionName: "burnReclaimedOptionsClaims",
          args: [holder, seriesId, amount],
        },
        "Burn submitted",
        "Option claims burned",
        () => {
          void refreshTokenBalances();
        },
      );
    } catch (error) {
      addToast({ title: "Burn failed", description: toErrorMessage(error), type: "error" });
    } finally {
      setSubmittingOptionAction(false);
    }
  };

  const handleBurnFuturesClaims = async () => {
    setSubmittingFuturesAction(true);
    try {
      const { diamondAddress: resolvedDiamond, account } = ensureReady();
      const seriesId = parseRequiredUint(futuresAction.seriesId, "Futures series id");
      const holder = ensureAddress(futuresAction.holder || account, "Holder");
      const amount = parseRequiredUint(futuresAction.burnAmount, "Burn amount");

      await submitWrite(
        {
          address: resolvedDiamond,
          abi: futuresFacetAbi,
          functionName: "burnReclaimedFuturesClaims",
          args: [holder, seriesId, amount],
        },
        "Burn submitted",
        "Futures claims burned",
        () => {
          void refreshTokenBalances();
        },
      );
    } catch (error) {
      addToast({ title: "Burn failed", description: toErrorMessage(error), type: "error" });
    } finally {
      setSubmittingFuturesAction(false);
    }
  };

  const readyStatus = diamondAddress
    ? "Wallet write flows ready"
    : "Set diamondAddress in NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY/ROBINHOOD_TESTNET/TESTNET";

  return (
    <AppShell title="Derivatives">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 pointer-events-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral1">Derivatives V1</h1>
            <p className="text-neutral2">Options & futures lifecycle management and settlement.</p>
          </div>
        </div>

        <Card>
          <SectionHeader title="CAPABILITIES" subtitle="Operator flows and configuration" />
          <div className="mt-4 grid gap-3 text-sm text-neutral2 md:grid-cols-2">
            <p>Operator flows: {derivativesV1Capabilities.operatorFlows ? "enabled" : "excluded"}</p>
            <p>Custom fee selection: {derivativesV1Capabilities.customFees ? "available" : "disabled"}</p>
            <p className="md:col-span-2 text-xs">Series discovery and fee bps are indexed. On-chain reads are still available for selected series verification.</p>
          </div>
          <StatusLine text={readyStatus} />
        </Card>

        <section className="grid gap-6 md:grid-cols-3">
          <Card>
            <SectionHeader title="SERIES INDEX" subtitle="Indexed options and futures" />
            <div className="mt-4 grid gap-3">
              <Field label="Scope">
                <Select value={scope} onChange={(event) => setScope(event.target.value as Scope)}>
                  <option value="active">Active only</option>
                  <option value="all">All</option>
                </Select>
              </Field>
              <Field label="Maker Position Id (optional)">
                <Input
                  value={makerPositionIdFilter}
                  onChange={(event) => setMakerPositionIdFilter(event.target.value)}
                  placeholder="e.g. 1"
                />
              </Field>
              <ActionButton onClick={() => void loadSeries()} disabled={loadingSeries}>
                {loadingSeries ? "Refreshing..." : "Refresh Index"}
              </ActionButton>
              <StatusLine text={seriesError} />
            </div>
          </Card>

          <Card>
            <SectionHeader title="OPTIONS SNAPSHOT" subtitle={`${options.length} rows`} />
            <div className="mt-4 max-h-72 overflow-auto space-y-3 text-sm font-mono text-neutral2">
              {options.length === 0 ? <p className="text-neutral3">No option series found.</p> : null}
              {options.map((row) => (
                <div key={`${asString(row.chain_id)}-${asString(row.series_id)}`} className="border border-surface3 rounded-xl p-3 bg-surface2/50">
                  <p>series #{asString(row.series_id)} / pos #{asString(row.maker_position_id) || "-"}</p>
                  <p>
                    rem={asString(row.remaining_size) || "-"} | collat={asString(row.collateral_locked) || "-"}
                  </p>
                  <p>
                    fees c/e/r={asString(row.create_fee_bps) || "-"}/{asString(row.exercise_fee_bps) || "-"}/
                    {asString(row.reclaim_fee_bps) || "-"}
                  </p>
                  <p>
                    {row.is_call ? "CALL" : "PUT"} | {row.is_american ? "AMERICAN" : "EUROPEAN"} |{" "}
                    {row.reclaimed ? "RECLAIMED" : "OPEN"}
                  </p>
                  <p>expiry {formatUnixTimestamp(row.expiry)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeader title="FUTURES SNAPSHOT" subtitle={`${futures.length} rows`} />
            <div className="mt-4 max-h-72 overflow-auto space-y-3 text-sm font-mono text-neutral2">
              {futures.length === 0 ? <p className="text-neutral3">No futures series found.</p> : null}
              {futures.map((row) => (
                <div key={`${asString(row.chain_id)}-${asString(row.series_id)}`} className="border border-surface3 rounded-xl p-3 bg-surface2/50">
                  <p>series #{asString(row.series_id)} / pos #{asString(row.maker_position_id) || "-"}</p>
                  <p>
                    rem={asString(row.remaining_size) || "-"} | locked={asString(row.underlying_locked) || "-"}
                  </p>
                  <p>
                    fees c/s/r={asString(row.create_fee_bps) || "-"}/{asString(row.exercise_fee_bps) || "-"}/
                    {asString(row.reclaim_fee_bps) || "-"}
                  </p>
                  <p>
                    {row.is_european ? "EUROPEAN" : "AMERICAN-STYLE"} | {row.reclaimed ? "RECLAIMED" : "OPEN"}
                  </p>
                  <p>expiry {formatUnixTimestamp(row.expiry)}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <SectionHeader title="CREATE OPTION" subtitle="Mint option claims to maker" />
            <div className="mt-4 grid gap-3">
              <Field label="Position Id">
                <Select value={optionForm.positionId} onChange={(event) => setOptionForm((prev) => ({ ...prev, positionId: event.target.value }))}>
                  <option value="">{positionIdOptions.length ? "Select Position NFT..." : "No Position NFTs found"}</option>
                  {positionIdOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Underlying Pool Id">
                <Select value={optionForm.underlyingPoolId} onChange={(event) => setOptionForm((prev) => ({ ...prev, underlyingPoolId: event.target.value }))}>
                  <option value="">{poolIdOptions.length ? "Select Underlying Pool..." : "No pools configured"}</option>
                  {poolIdOptions.map((option) => (
                    <option key={`opt-underlying-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Strike Pool Id">
                <Select value={optionForm.strikePoolId} onChange={(event) => setOptionForm((prev) => ({ ...prev, strikePoolId: event.target.value }))}>
                  <option value="">{poolIdOptions.length ? "Select Strike Pool..." : "No pools configured"}</option>
                  {poolIdOptions.map((option) => (
                    <option key={`opt-strike-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Strike Price">
                <Input value={optionForm.strikePrice} onChange={(event) => setOptionForm((prev) => ({ ...prev, strikePrice: event.target.value }))} />
              </Field>
              <Field label="Expiry (date & time)">
                <Input
                  type="datetime-local"
                  step={60}
                  value={optionForm.expiry}
                  onChange={(event) => setOptionForm((prev) => ({ ...prev, expiry: event.target.value }))}
                />
              </Field>
              <Field label="Total Size (underlying units, decimals allowed)">
                <Input value={optionForm.totalSize} onChange={(event) => setOptionForm((prev) => ({ ...prev, totalSize: event.target.value }))} />
              </Field>
              <Field label="Contract Size (raw uint256)">
                <Input value={optionForm.contractSize} onChange={(event) => setOptionForm((prev) => ({ ...prev, contractSize: event.target.value }))} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Side">
                  <Select
                    value={optionForm.isCall ? "call" : "put"}
                    onChange={(event) => setOptionForm((prev) => ({ ...prev, isCall: event.target.value === "call" }))}
                  >
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </Select>
                </Field>
                <Field label="Exercise Window">
                  <Select
                    value={optionForm.isAmerican ? "american" : "european"}
                    onChange={(event) => setOptionForm((prev) => ({ ...prev, isAmerican: event.target.value === "american" }))}
                  >
                    <option value="european">European</option>
                    <option value="american">American</option>
                  </Select>
                </Field>
              </div>
              {derivativesV1Capabilities.customFees ? (
                <>
                  <label className="text-xs font-mono text-neutral2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={optionForm.useCustomFees}
                      onChange={(event) => setOptionForm((prev) => ({ ...prev, useCustomFees: event.target.checked }))}
                    />
                    Use custom fee bps
                  </label>
                  {optionForm.useCustomFees ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="Create bps">
                        <Input value={optionForm.createFeeBps} onChange={(event) => setOptionForm((prev) => ({ ...prev, createFeeBps: event.target.value }))} />
                      </Field>
                      <Field label="Exercise bps">
                        <Input value={optionForm.exerciseFeeBps} onChange={(event) => setOptionForm((prev) => ({ ...prev, exerciseFeeBps: event.target.value }))} />
                      </Field>
                      <Field label="Reclaim bps">
                        <Input value={optionForm.reclaimFeeBps} onChange={(event) => setOptionForm((prev) => ({ ...prev, reclaimFeeBps: event.target.value }))} />
                      </Field>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-xs font-mono text-neutral2">Fees use protocol defaults.</p>
              )}
              <ActionButton onClick={() => void handleCreateOption()} disabled={submittingOptionCreate}>
                {submittingOptionCreate ? "Submitting..." : "Create Option Series"}
              </ActionButton>
            </div>
          </Card>

          <Card>
            <SectionHeader title="CREATE FUTURES" subtitle="Mint futures claims to maker" />
            <div className="mt-4 grid gap-3">
              <Field label="Position Id">
                <Select value={futuresForm.positionId} onChange={(event) => setFuturesForm((prev) => ({ ...prev, positionId: event.target.value }))}>
                  <option value="">{positionIdOptions.length ? "Select Position NFT..." : "No Position NFTs found"}</option>
                  {positionIdOptions.map((option) => (
                    <option key={`fut-pos-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Underlying Pool Id">
                <Select value={futuresForm.underlyingPoolId} onChange={(event) => setFuturesForm((prev) => ({ ...prev, underlyingPoolId: event.target.value }))}>
                  <option value="">{poolIdOptions.length ? "Select Underlying Pool..." : "No pools configured"}</option>
                  {poolIdOptions.map((option) => (
                    <option key={`fut-underlying-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quote Pool Id">
                <Select value={futuresForm.quotePoolId} onChange={(event) => setFuturesForm((prev) => ({ ...prev, quotePoolId: event.target.value }))}>
                  <option value="">{poolIdOptions.length ? "Select Quote Pool..." : "No pools configured"}</option>
                  {poolIdOptions.map((option) => (
                    <option key={`fut-quote-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Forward Price">
                <Input value={futuresForm.forwardPrice} onChange={(event) => setFuturesForm((prev) => ({ ...prev, forwardPrice: event.target.value }))} />
              </Field>
              <Field label="Expiry (date & time)">
                <Input
                  type="datetime-local"
                  step={60}
                  value={futuresForm.expiry}
                  onChange={(event) => setFuturesForm((prev) => ({ ...prev, expiry: event.target.value }))}
                />
              </Field>
              <Field label="Total Size (underlying units, decimals allowed)">
                <Input value={futuresForm.totalSize} onChange={(event) => setFuturesForm((prev) => ({ ...prev, totalSize: event.target.value }))} />
              </Field>
              <Field label="Contract Size (raw uint256)">
                <Input value={futuresForm.contractSize} onChange={(event) => setFuturesForm((prev) => ({ ...prev, contractSize: event.target.value }))} />
              </Field>
              <Field label="Settlement Style">
                <Select
                  value={futuresForm.isEuropean ? "european" : "american"}
                  onChange={(event) => setFuturesForm((prev) => ({ ...prev, isEuropean: event.target.value === "european" }))}
                >
                  <option value="european">European</option>
                  <option value="american">American-style window</option>
                </Select>
              </Field>
              {derivativesV1Capabilities.customFees ? (
                <>
                  <label className="text-xs font-mono text-neutral2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={futuresForm.useCustomFees}
                      onChange={(event) => setFuturesForm((prev) => ({ ...prev, useCustomFees: event.target.checked }))}
                    />
                    Use custom fee bps
                  </label>
                  {futuresForm.useCustomFees ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="Create bps">
                        <Input value={futuresForm.createFeeBps} onChange={(event) => setFuturesForm((prev) => ({ ...prev, createFeeBps: event.target.value }))} />
                      </Field>
                      <Field label="Settle bps">
                        <Input value={futuresForm.exerciseFeeBps} onChange={(event) => setFuturesForm((prev) => ({ ...prev, exerciseFeeBps: event.target.value }))} />
                      </Field>
                      <Field label="Reclaim bps">
                        <Input value={futuresForm.reclaimFeeBps} onChange={(event) => setFuturesForm((prev) => ({ ...prev, reclaimFeeBps: event.target.value }))} />
                      </Field>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-xs font-mono text-neutral2">Fees use protocol defaults.</p>
              )}
              <ActionButton onClick={() => void handleCreateFutures()} disabled={submittingFuturesCreate}>
                {submittingFuturesCreate ? "Submitting..." : "Create Futures Series"}
              </ActionButton>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <SectionHeader title="OPTIONS ACTIONS" subtitle="Exercise, reclaim, burn claims" />
            <div className="mt-4 grid gap-3">
              <Field label="Series Id">
                <Input value={optionAction.seriesId} onChange={(event) => setOptionAction((prev) => ({ ...prev, seriesId: event.target.value }))} />
              </Field>
              <Field label="Token Balance (selected series)">
                <Input value={optionTokenBalance} disabled />
              </Field>
              <Field label="Amount">
                <Input value={optionAction.amount} onChange={(event) => setOptionAction((prev) => ({ ...prev, amount: event.target.value }))} />
              </Field>
              <Field label="Recipient">
                <Input value={optionAction.recipient} onChange={(event) => setOptionAction((prev) => ({ ...prev, recipient: event.target.value }))} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Max Payment">
                  <Input value={optionAction.maxPayment} onChange={(event) => setOptionAction((prev) => ({ ...prev, maxPayment: event.target.value }))} />
                </Field>
                <Field label="Min Received">
                  <Input value={optionAction.minReceived} onChange={(event) => setOptionAction((prev) => ({ ...prev, minReceived: event.target.value }))} />
                </Field>
              </div>
              <Field label="Msg.value (optional)">
                <Input value={optionAction.msgValue} onChange={(event) => setOptionAction((prev) => ({ ...prev, msgValue: event.target.value }))} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <ActionButton onClick={() => void previewOptionPayment()} disabled={submittingOptionAction}>
                  Preview Payment
                </ActionButton>
                <ActionButton onClick={() => void handleExerciseOptions()} disabled={submittingOptionAction}>
                  {submittingOptionAction ? "Submitting..." : "Exercise"}
                </ActionButton>
              </div>
              <StatusLine text={optionPreviewPayment ? `preview payment: ${optionPreviewPayment}` : undefined} />
              <div className="border-t border-white/10 pt-3">
                <ActionButton onClick={() => void handleReclaimOptions()} disabled={submittingOptionAction}>
                  Reclaim Series
                </ActionButton>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Burn Holder">
                  <Input value={optionAction.holder} onChange={(event) => setOptionAction((prev) => ({ ...prev, holder: event.target.value }))} />
                </Field>
                <Field label="Burn Amount">
                  <Input value={optionAction.burnAmount} onChange={(event) => setOptionAction((prev) => ({ ...prev, burnAmount: event.target.value }))} />
                </Field>
              </div>
              <ActionButton onClick={() => void handleBurnOptionClaims()} disabled={submittingOptionAction}>
                Burn Reclaimed Claims
              </ActionButton>
              <StatusLine
                text={
                  optionSeriesDetails
                    ? `fees (create/exercise/reclaim): ${optionSeriesDetails.createFeeBps}/${optionSeriesDetails.exerciseFeeBps}/${optionSeriesDetails.reclaimFeeBps}`
                    : undefined
                }
              />
            </div>
          </Card>

          <Card>
            <SectionHeader title="FUTURES ACTIONS" subtitle="Settle, reclaim, burn claims" />
            <div className="mt-4 grid gap-3">
              <Field label="Series Id">
                <Input value={futuresAction.seriesId} onChange={(event) => setFuturesAction((prev) => ({ ...prev, seriesId: event.target.value }))} />
              </Field>
              <Field label="Token Balance (selected series)">
                <Input value={futuresTokenBalance} disabled />
              </Field>
              <Field label="Amount">
                <Input value={futuresAction.amount} onChange={(event) => setFuturesAction((prev) => ({ ...prev, amount: event.target.value }))} />
              </Field>
              <Field label="Recipient">
                <Input value={futuresAction.recipient} onChange={(event) => setFuturesAction((prev) => ({ ...prev, recipient: event.target.value }))} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Max Payment">
                  <Input value={futuresAction.maxPayment} onChange={(event) => setFuturesAction((prev) => ({ ...prev, maxPayment: event.target.value }))} />
                </Field>
                <Field label="Min Received">
                  <Input value={futuresAction.minReceived} onChange={(event) => setFuturesAction((prev) => ({ ...prev, minReceived: event.target.value }))} />
                </Field>
              </div>
              <Field label="Msg.value (optional)">
                <Input value={futuresAction.msgValue} onChange={(event) => setFuturesAction((prev) => ({ ...prev, msgValue: event.target.value }))} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <ActionButton onClick={() => void previewFuturesPayment()} disabled={submittingFuturesAction}>
                  Preview Payment
                </ActionButton>
                <ActionButton onClick={() => void handleSettleFutures()} disabled={submittingFuturesAction}>
                  {submittingFuturesAction ? "Submitting..." : "Settle"}
                </ActionButton>
              </div>
              <StatusLine text={futuresPreviewPayment ? `preview payment: ${futuresPreviewPayment}` : undefined} />
              <div className="border-t border-white/10 pt-3">
                <ActionButton onClick={() => void handleReclaimFutures()} disabled={submittingFuturesAction}>
                  Reclaim Series
                </ActionButton>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Burn Holder">
                  <Input value={futuresAction.holder} onChange={(event) => setFuturesAction((prev) => ({ ...prev, holder: event.target.value }))} />
                </Field>
                <Field label="Burn Amount">
                  <Input value={futuresAction.burnAmount} onChange={(event) => setFuturesAction((prev) => ({ ...prev, burnAmount: event.target.value }))} />
                </Field>
              </div>
              <ActionButton onClick={() => void handleBurnFuturesClaims()} disabled={submittingFuturesAction}>
                Burn Reclaimed Claims
              </ActionButton>
              <StatusLine
                text={
                  futuresSeriesDetails
                    ? `fees (create/settle/reclaim): ${futuresSeriesDetails.createFeeBps}/${futuresSeriesDetails.exerciseFeeBps}/${futuresSeriesDetails.reclaimFeeBps}`
                    : undefined
                }
              />
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
