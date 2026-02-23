// Core types for EqualFi application

export interface PositionNFT {
  tokenId: string;
  positionKey: string;
  poolName: string;
  poolId?: number;
  decimals?: number;
  principalRaw?: bigint;
  totalDebtRaw?: bigint;
  rollingCreditRaw?: bigint;
  accruedYieldRaw?: bigint;
  fixedLoanIds?: bigint[];
  directLocked?: bigint;
  directLent?: bigint;
  directOfferEscrow?: bigint;
  indexEncumbered?: bigint;
  [key: string]: any;
}

export interface Auction {
  id: string;
  type?: string;
  poolIdA: number;
  poolIdB: number;
  reserveA?: bigint;
  reserveB?: bigint;
  reserveARaw?: bigint;
  reserveBRaw?: bigint;
  displayReserveA?: number;
  displayReserveB?: number;
  makerPositionId?: string;
  endsAt: number;
  makerFeeA?: number;
  makerFeeB?: number;
  totalShares?: bigint;
  feeIndexA?: bigint;
  feeIndexB?: bigint;
  participatingPositions?: ParticipatingPosition[];
}

export interface ParticipatingPosition {
  tokenId: string;
  shares: bigint;
}

export interface PoolConfig {
  id: string;
  pid: number;
  tokenName: string;
  ticker: string;
  decimals: number;
  tokenAddress: string;
  lendingPoolAddress: string;
}

export interface PoolsConfig {
  diamondAddress: string;
  positionNFTAddress: string;
  faucetAddress?: string;
  pools: PoolConfig[];
  indexTokens: IndexToken[];
}

export interface IndexToken {
  id: string;
  indexTicker: string;
  indexTokenAddress: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  balance: bigint;
}

export interface IndexView {
  totalUnits?: bigint;
  bundleAmounts?: bigint[];
  assets?: string[];
  [key: string]: any; // Allow additional properties from contract
}

export interface IndexOption {
  indexId: string;
  indexTicker: string;
  indexTokenAddress: string;
}

export interface AgentConfig {
  minReserveA: bigint;
  minReserveB: bigint;
  [key: string]: any;
}

