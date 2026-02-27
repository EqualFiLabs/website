import type { Address } from "viem";
import { derivativeViewFacetAbi } from "../abis/derivativeViewFacet.js";
import { futuresFacetAbi } from "../abis/futuresFacet.ts";
import { optionsFacetAbi } from "../abis/optionsFacet.ts";
import type {
  CreateFuturesSeriesInput,
  CreateOptionSeriesInput,
  DerivativeFeeSelection,
  FuturesSeries,
  OptionSeries,
} from "./types.ts";

type StructLike = Record<string, unknown> | unknown[];

const MAX_BPS = 10_000;

const pick = <T>(value: StructLike, key: string, index: number): T => {
  if (Array.isArray(value)) {
    return value[index] as T;
  }
  return value[key] as T;
};

const normalizeFeeSelection = (fees: DerivativeFeeSelection) => {
  if (!fees.useCustomFees) {
    return {
      useCustomFees: false,
      createFeeBps: 0,
      exerciseFeeBps: 0,
      reclaimFeeBps: 0,
    };
  }

  const createFeeBps = fees.createFeeBps ?? 0;
  const exerciseFeeBps = fees.exerciseFeeBps ?? 0;
  const reclaimFeeBps = fees.reclaimFeeBps ?? 0;
  [createFeeBps, exerciseFeeBps, reclaimFeeBps].forEach((fee) => {
    if (!Number.isInteger(fee) || fee < 0 || fee > MAX_BPS) {
      throw new Error(`Invalid custom fee bps: ${fee}`);
    }
  });
  return {
    useCustomFees: true,
    createFeeBps,
    exerciseFeeBps,
    reclaimFeeBps,
  };
};

export const derivativesV1Capabilities = Object.freeze({
  operatorFlows: false,
  customFees: true,
});

export const mapOptionSeries = (series: StructLike): OptionSeries => ({
  makerPositionKey: pick(series, "makerPositionKey", 0),
  makerPositionId: pick(series, "makerPositionId", 1),
  underlyingPoolId: pick(series, "underlyingPoolId", 2),
  strikePoolId: pick(series, "strikePoolId", 3),
  underlyingAsset: pick(series, "underlyingAsset", 4),
  strikeAsset: pick(series, "strikeAsset", 5),
  strikePrice: pick(series, "strikePrice", 6),
  expiry: pick(series, "expiry", 7),
  totalSize: pick(series, "totalSize", 8),
  remaining: pick(series, "remaining", 9),
  collateralLocked: pick(series, "collateralLocked", 10),
  createFeeBps: Number(pick(series, "createFeeBps", 11)),
  exerciseFeeBps: Number(pick(series, "exerciseFeeBps", 12)),
  reclaimFeeBps: Number(pick(series, "reclaimFeeBps", 13)),
  isCall: pick(series, "isCall", 14),
  isAmerican: pick(series, "isAmerican", 15),
  reclaimed: pick(series, "reclaimed", 16),
});

export const mapFuturesSeries = (series: StructLike): FuturesSeries => ({
  makerPositionKey: pick(series, "makerPositionKey", 0),
  makerPositionId: pick(series, "makerPositionId", 1),
  underlyingPoolId: pick(series, "underlyingPoolId", 2),
  quotePoolId: pick(series, "quotePoolId", 3),
  underlyingAsset: pick(series, "underlyingAsset", 4),
  quoteAsset: pick(series, "quoteAsset", 5),
  forwardPrice: pick(series, "forwardPrice", 6),
  expiry: pick(series, "expiry", 7),
  totalSize: pick(series, "totalSize", 8),
  remaining: pick(series, "remaining", 9),
  underlyingLocked: pick(series, "underlyingLocked", 10),
  createFeeBps: Number(pick(series, "createFeeBps", 11)),
  exerciseFeeBps: Number(pick(series, "exerciseFeeBps", 12)),
  reclaimFeeBps: Number(pick(series, "reclaimFeeBps", 13)),
  graceUnlockTime: pick(series, "graceUnlockTime", 14),
  isEuropean: pick(series, "isEuropean", 15),
  reclaimed: pick(series, "reclaimed", 16),
});

export const toCreateOptionSeriesParams = (input: CreateOptionSeriesInput) => {
  const fees = normalizeFeeSelection(input);
  return {
    positionId: input.positionId,
    underlyingPoolId: input.underlyingPoolId,
    strikePoolId: input.strikePoolId,
    strikePrice: input.strikePrice,
    expiry: input.expiry,
    totalSize: input.totalSize,
    isCall: input.isCall,
    isAmerican: input.isAmerican,
    useCustomFees: fees.useCustomFees,
    createFeeBps: fees.createFeeBps,
    exerciseFeeBps: fees.exerciseFeeBps,
    reclaimFeeBps: fees.reclaimFeeBps,
  };
};

export const toCreateFuturesSeriesParams = (input: CreateFuturesSeriesInput) => {
  const fees = normalizeFeeSelection(input);
  return {
    positionId: input.positionId,
    underlyingPoolId: input.underlyingPoolId,
    quotePoolId: input.quotePoolId,
    forwardPrice: input.forwardPrice,
    expiry: input.expiry,
    totalSize: input.totalSize,
    isEuropean: input.isEuropean,
    useCustomFees: fees.useCustomFees,
    createFeeBps: fees.createFeeBps,
    exerciseFeeBps: fees.exerciseFeeBps,
    reclaimFeeBps: fees.reclaimFeeBps,
  };
};

export const getOptionSeriesReadRequest = (diamondAddress: Address, seriesId: bigint) => ({
  address: diamondAddress,
  abi: derivativeViewFacetAbi,
  functionName: "getOptionSeries" as const,
  args: [seriesId] as const,
});

export const getFuturesSeriesReadRequest = (diamondAddress: Address, seriesId: bigint) => ({
  address: diamondAddress,
  abi: derivativeViewFacetAbi,
  functionName: "getFuturesSeries" as const,
  args: [seriesId] as const,
});

export const createOptionSeriesWriteRequest = (diamondAddress: Address, input: CreateOptionSeriesInput) => ({
  address: diamondAddress,
  abi: optionsFacetAbi,
  functionName: "createOptionSeries" as const,
  args: [toCreateOptionSeriesParams(input)] as const,
});

export const createFuturesSeriesWriteRequest = (diamondAddress: Address, input: CreateFuturesSeriesInput) => ({
  address: diamondAddress,
  abi: futuresFacetAbi,
  functionName: "createFuturesSeries" as const,
  args: [toCreateFuturesSeriesParams(input)] as const,
});
