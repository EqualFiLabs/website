import type { Address } from "viem";

export interface DerivativeFeeSelection {
  useCustomFees: boolean;
  createFeeBps?: number;
  exerciseFeeBps?: number;
  reclaimFeeBps?: number;
}

export interface OptionSeries {
  makerPositionKey: `0x${string}`;
  makerPositionId: bigint;
  underlyingPoolId: bigint;
  strikePoolId: bigint;
  underlyingAsset: Address;
  strikeAsset: Address;
  strikePrice: bigint;
  expiry: bigint;
  totalSize: bigint;
  remaining: bigint;
  collateralLocked: bigint;
  createFeeBps: number;
  exerciseFeeBps: number;
  reclaimFeeBps: number;
  isCall: boolean;
  isAmerican: boolean;
  reclaimed: boolean;
}

export interface FuturesSeries {
  makerPositionKey: `0x${string}`;
  makerPositionId: bigint;
  underlyingPoolId: bigint;
  quotePoolId: bigint;
  underlyingAsset: Address;
  quoteAsset: Address;
  forwardPrice: bigint;
  expiry: bigint;
  totalSize: bigint;
  remaining: bigint;
  underlyingLocked: bigint;
  createFeeBps: number;
  exerciseFeeBps: number;
  reclaimFeeBps: number;
  graceUnlockTime: bigint;
  isEuropean: boolean;
  reclaimed: boolean;
}

export interface CreateOptionSeriesInput extends DerivativeFeeSelection {
  positionId: bigint;
  underlyingPoolId: bigint;
  strikePoolId: bigint;
  strikePrice: bigint;
  expiry: bigint;
  totalSize: bigint;
  contractSize: bigint;
  isCall: boolean;
  isAmerican: boolean;
}

export interface CreateFuturesSeriesInput extends DerivativeFeeSelection {
  positionId: bigint;
  underlyingPoolId: bigint;
  quotePoolId: bigint;
  forwardPrice: bigint;
  expiry: bigint;
  totalSize: bigint;
  contractSize: bigint;
  isEuropean: boolean;
}
