import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'

import useActivePublicClient from './useActivePublicClient'
import useBufferedWriteContract from './useBufferedWriteContract'
import usePoolsConfig from './usePoolsConfig'
import { ZERO_ADDRESS } from '../address'
import { perpsExecutionFacetAbi, perpsViewFacetAbi } from '../abis/perpsFacet'
import { normalizePerpsMarkets } from '../perps'

const tupleValue = (value, key, index, fallback = 0n) => {
  if (value && typeof value === 'object' && key in value) {
    return value[key] ?? fallback
  }
  if (Array.isArray(value) && value[index] !== undefined) {
    return value[index]
  }
  return fallback
}

const toBool = (value, fallback = false) => {
  if (typeof value === 'boolean') return value
  return fallback
}

const normalizeMarket = (raw) => ({
  marketId: String(tupleValue(raw, 'marketId', 0, '0x')),
  collateralPoolId: Number(tupleValue(raw, 'collateralPoolId', 1, 0n)),
  collateralAsset: String(tupleValue(raw, 'collateralAsset', 2, ZERO_ADDRESS)).toLowerCase(),
  indexAsset: String(tupleValue(raw, 'indexAsset', 3, ZERO_ADDRESS)).toLowerCase(),
  longEnabled: toBool(tupleValue(raw, 'longEnabled', 4, false)),
  shortEnabled: toBool(tupleValue(raw, 'shortEnabled', 5, false)),
  oracleAdapter: String(tupleValue(raw, 'oracleAdapter', 6, ZERO_ADDRESS)).toLowerCase(),
  maxStaleness: Number(tupleValue(raw, 'maxStaleness', 7, 0n)),
  maxDeviationBps: Number(tupleValue(raw, 'maxDeviationBps', 8, 0n)),
  maxLeverageBps: Number(tupleValue(raw, 'maxLeverageBps', 9, 0n)),
  initialMarginBps: Number(tupleValue(raw, 'initialMarginBps', 10, 0n)),
  maintenanceMarginBps: Number(tupleValue(raw, 'maintenanceMarginBps', 11, 0n)),
  liquidationIncentiveBpsMax: Number(tupleValue(raw, 'liquidationIncentiveBpsMax', 12, 0n)),
  maxOpenInterest: BigInt(tupleValue(raw, 'maxOpenInterest', 13, 0n)),
  maxLongOpenInterest: BigInt(tupleValue(raw, 'maxLongOpenInterest', 14, 0n)),
  maxShortOpenInterest: BigInt(tupleValue(raw, 'maxShortOpenInterest', 15, 0n)),
  maxSkewAbs: BigInt(tupleValue(raw, 'maxSkewAbs', 16, 0n)),
  takerFeeBps: Number(tupleValue(raw, 'takerFeeBps', 17, 0n)),
  makerFeeBps: Number(tupleValue(raw, 'makerFeeBps', 18, 0n)),
  maxFundingVelocityBpsPerDay: Number(tupleValue(raw, 'maxFundingVelocityBpsPerDay', 19, 0n)),
  pauseIncrease: toBool(tupleValue(raw, 'pauseIncrease', 20, false)),
  pauseDecrease: toBool(tupleValue(raw, 'pauseDecrease', 21, false)),
  pauseLiquidation: toBool(tupleValue(raw, 'pauseLiquidation', 22, false)),
  pauseSync: toBool(tupleValue(raw, 'pauseSync', 23, false)),
  exists: toBool(tupleValue(raw, 'exists', 24, false)),
})

const normalizeMarketState = (raw) => ({
  openInterestLong: BigInt(tupleValue(raw, 'openInterestLong', 0, 0n)),
  openInterestShort: BigInt(tupleValue(raw, 'openInterestShort', 1, 0n)),
  skew: BigInt(tupleValue(raw, 'skew', 2, 0n)),
  cumulativeFundingLongX18: BigInt(tupleValue(raw, 'cumulativeFundingLongX18', 3, 0n)),
  cumulativeFundingShortX18: BigInt(tupleValue(raw, 'cumulativeFundingShortX18', 4, 0n)),
  lastFundingTs: BigInt(tupleValue(raw, 'lastFundingTs', 5, 0n)),
  insuranceBalance: BigInt(tupleValue(raw, 'insuranceBalance', 6, 0n)),
  insuranceTarget: BigInt(tupleValue(raw, 'insuranceTarget', 7, 0n)),
  badDebt: BigInt(tupleValue(raw, 'badDebt', 8, 0n)),
  lpFeeIndexX18: BigInt(tupleValue(raw, 'lpFeeIndexX18', 9, 0n)),
  protocolFeesAccrued: BigInt(tupleValue(raw, 'protocolFeesAccrued', 10, 0n)),
  reservedCollateral: BigInt(tupleValue(raw, 'reservedCollateral', 11, 0n)),
  realizedPnlOut: BigInt(tupleValue(raw, 'realizedPnlOut', 12, 0n)),
  realizedPnlIn: BigInt(tupleValue(raw, 'realizedPnlIn', 13, 0n)),
})

const normalizeAccount = (raw) => ({
  accountId: String(tupleValue(raw, 'accountId', 0, '0x')),
  positionKey: String(tupleValue(raw, 'positionKey', 1, '0x')),
  positionTokenId: BigInt(tupleValue(raw, 'positionTokenId', 2, 0n)),
  nonce: BigInt(tupleValue(raw, 'nonce', 3, 0n)),
  exists: toBool(tupleValue(raw, 'exists', 4, false)),
})

const normalizePosition = (raw) => ({
  isLong: toBool(tupleValue(raw, 'isLong', 0, false)),
  sizeUsdX18: BigInt(tupleValue(raw, 'sizeUsdX18', 1, 0n)),
  collateralAmount: BigInt(tupleValue(raw, 'collateralAmount', 2, 0n)),
  entryPriceX18: BigInt(tupleValue(raw, 'entryPriceX18', 3, 0n)),
  entryFundingX18: BigInt(tupleValue(raw, 'entryFundingX18', 4, 0n)),
  realizedPnlX18: BigInt(tupleValue(raw, 'realizedPnlX18', 5, 0n)),
  lastIncreaseTs: BigInt(tupleValue(raw, 'lastIncreaseTs', 6, 0n)),
})

const normalizeHealthResult = (raw) => ({
  equityUsdX18: BigInt(tupleValue(raw, 'equityUsdX18', 0, 0n)),
  initialMarginRequiredUsdX18: BigInt(tupleValue(raw, 'initialMarginRequiredUsdX18', 1, 0n)),
  maintenanceMarginRequiredUsdX18: BigInt(tupleValue(raw, 'maintenanceMarginRequiredUsdX18', 2, 0n)),
  minEquityForLeverageUsdX18: BigInt(tupleValue(raw, 'minEquityForLeverageUsdX18', 3, 0n)),
  openingMarginRequiredUsdX18: BigInt(tupleValue(raw, 'openingMarginRequiredUsdX18', 4, 0n)),
  leverageBps: BigInt(tupleValue(raw, 'leverageBps', 5, 0n)),
  initialBufferUsdX18: BigInt(tupleValue(raw, 'initialBufferUsdX18', 6, 0n)),
  maintenanceBufferUsdX18: BigInt(tupleValue(raw, 'maintenanceBufferUsdX18', 7, 0n)),
  meetsInitialMargin: toBool(tupleValue(raw, 'meetsInitialMargin', 8, false)),
  meetsMaintenanceMargin: toBool(tupleValue(raw, 'meetsMaintenanceMargin', 9, false)),
})

const normalizeHealthState = (raw) => ({
  collateralValueUsdX18: BigInt(tupleValue(raw, 'collateralValueUsdX18', 0, 0n)),
  positionNotionalUsdX18: BigInt(tupleValue(raw, 'positionNotionalUsdX18', 1, 0n)),
  unrealizedPnlUsdX18: BigInt(tupleValue(raw, 'unrealizedPnlUsdX18', 2, 0n)),
  fundingAccruedUsdX18: BigInt(tupleValue(raw, 'fundingAccruedUsdX18', 3, 0n)),
  feesAccruedUsdX18: BigInt(tupleValue(raw, 'feesAccruedUsdX18', 4, 0n)),
})

const emptyState = {
  market: null,
  marketState: null,
  accountId: null,
  accountExists: false,
  account: null,
  collateral: 0n,
  longPosition: null,
  shortPosition: null,
  health: null,
  healthState: null,
  markPriceX18: 0n,
}

function usePerps(selectedMarketId, selectedPositionId, subaccountNonce = 0n) {
  const { address, isConnected } = useAccount()
  const publicClient = useActivePublicClient()
  const { writeContractAsync, isPending } = useBufferedWriteContract()
  const poolsConfig = usePoolsConfig()

  const diamondAddress = (poolsConfig?.diamondAddress || '').trim()

  const markets = useMemo(() => normalizePerpsMarkets(poolsConfig), [poolsConfig])
  const selectedMarket = useMemo(
    () => markets.find((market) => market.id === selectedMarketId) || null,
    [markets, selectedMarketId],
  )

  const [state, setState] = useState(emptyState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const resolveAccountId = useCallback(async () => {
    if (!publicClient || !diamondAddress || !selectedPositionId) return null
    return publicClient.readContract({
      address: diamondAddress,
      abi: perpsExecutionFacetAbi,
      functionName: 'deriveAccountIdForPosition',
      args: [BigInt(selectedPositionId), BigInt(subaccountNonce)],
    })
  }, [diamondAddress, publicClient, selectedPositionId, subaccountNonce])

  const refetch = useCallback(async () => {
    if (!publicClient || !diamondAddress || !selectedMarket) {
      setState(emptyState)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [marketRaw, marketStateRaw, accountId] = await Promise.all([
        publicClient.readContract({
          address: diamondAddress,
          abi: perpsViewFacetAbi,
          functionName: 'getMarket',
          args: [selectedMarket.marketId],
        }),
        publicClient.readContract({
          address: diamondAddress,
          abi: perpsViewFacetAbi,
          functionName: 'getMarketState',
          args: [selectedMarket.marketId],
        }),
        resolveAccountId(),
      ])

      const normalizedMarket = normalizeMarket(marketRaw)
      const normalizedMarketState = normalizeMarketState(marketStateRaw)

      if (!accountId) {
        setState({
          ...emptyState,
          market: normalizedMarket,
          marketState: normalizedMarketState,
          accountId: null,
        })
        return
      }

      const accountExists = await publicClient.readContract({
        address: diamondAddress,
        abi: perpsExecutionFacetAbi,
        functionName: 'accountExists',
        args: [accountId],
      })

      if (!accountExists) {
        setState({
          ...emptyState,
          market: normalizedMarket,
          marketState: normalizedMarketState,
          accountId,
          accountExists: false,
        })
        return
      }

      const [accountRaw, collateralRaw, longRaw, shortRaw, healthRaw] = await Promise.all([
        publicClient.readContract({
          address: diamondAddress,
          abi: perpsViewFacetAbi,
          functionName: 'getPerpsAccount',
          args: [accountId],
        }),
        publicClient.readContract({
          address: diamondAddress,
          abi: perpsViewFacetAbi,
          functionName: 'getPerpsAccountCollateral',
          args: [selectedMarket.marketId, accountId],
        }),
        publicClient.readContract({
          address: diamondAddress,
          abi: perpsViewFacetAbi,
          functionName: 'getPerpsPosition',
          args: [selectedMarket.marketId, accountId, true],
        }),
        publicClient.readContract({
          address: diamondAddress,
          abi: perpsViewFacetAbi,
          functionName: 'getPerpsPosition',
          args: [selectedMarket.marketId, accountId, false],
        }),
        publicClient.readContract({
          address: diamondAddress,
          abi: perpsViewFacetAbi,
          functionName: 'previewHealth',
          args: [selectedMarket.marketId, accountId],
        }),
      ])

      const healthTuple = Array.isArray(healthRaw) ? healthRaw : [healthRaw?.health, healthRaw?.state, healthRaw?.markPriceX18]

      setState({
        market: normalizedMarket,
        marketState: normalizedMarketState,
        accountId,
        accountExists: true,
        account: normalizeAccount(accountRaw),
        collateral: BigInt(collateralRaw ?? 0n),
        longPosition: normalizePosition(longRaw),
        shortPosition: normalizePosition(shortRaw),
        health: normalizeHealthResult(healthTuple[0]),
        healthState: normalizeHealthState(healthTuple[1]),
        markPriceX18: BigInt(healthTuple[2] ?? 0n),
      })
    } catch (err) {
      console.error('Failed to fetch perps state', err)
      setError(err instanceof Error ? err.message : 'Failed to load perps state')
    } finally {
      setLoading(false)
    }
  }, [diamondAddress, publicClient, resolveAccountId, selectedMarket])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const ensureWalletReady = useCallback(() => {
    if (!diamondAddress) {
      throw new Error('Diamond address missing from config')
    }
    if (!publicClient || !writeContractAsync) {
      throw new Error('Wallet client unavailable')
    }
    if (!isConnected || !address) {
      throw new Error('Connect wallet to continue')
    }

    return { diamondAddress }
  }, [address, diamondAddress, isConnected, publicClient, writeContractAsync])

  const ensureMarketReady = useCallback(() => {
    const { diamondAddress: target } = ensureWalletReady()
    if (!selectedMarket) {
      throw new Error('Select a perps market')
    }

    return {
      diamondAddress: target,
      marketId: selectedMarket.marketId,
    }
  }, [ensureWalletReady, selectedMarket])

  const ensureAccountReady = useCallback(() => {
    const context = ensureMarketReady()
    if (!state.accountId || !state.accountExists) {
      throw new Error('Create a perps account first')
    }

    return {
      ...context,
      accountId: state.accountId,
      collateralAsset: selectedMarket.collateralAsset,
    }
  }, [ensureMarketReady, selectedMarket, state.accountExists, state.accountId])

  const runTx = useCallback(
    async (abi, functionName, args) => {
      const { diamondAddress: target } = ensureMarketReady()

      const hash = await writeContractAsync({
        address: target,
        abi,
        functionName,
        args,
      })

      await publicClient.waitForTransactionReceipt({ hash })
      await refetch()
      return hash
    },
    [ensureMarketReady, publicClient, refetch, writeContractAsync],
  )

  const createAccount = useCallback(async () => {
    const { diamondAddress: target } = ensureWalletReady()
    if (!selectedPositionId) {
      throw new Error('Select a position')
    }

    const hash = await writeContractAsync({
      address: target,
      abi: perpsExecutionFacetAbi,
      functionName: 'createAccount',
      args: [BigInt(selectedPositionId), BigInt(subaccountNonce)],
    })

    await publicClient.waitForTransactionReceipt({ hash })
    await refetch()
    return hash
  }, [ensureWalletReady, publicClient, refetch, selectedPositionId, subaccountNonce, writeContractAsync])

  const addCollateral = useCallback(
    async ({ amount }) => {
      const { marketId, accountId, collateralAsset } = ensureAccountReady()
      return runTx(perpsExecutionFacetAbi, 'addCollateral', [
        {
          marketId,
          accountId,
          collateralAsset,
          amount,
        },
      ])
    },
    [ensureAccountReady, runTx],
  )

  const removeCollateral = useCallback(
    async ({ amount }) => {
      const { marketId, accountId, collateralAsset } = ensureAccountReady()
      return runTx(perpsExecutionFacetAbi, 'removeCollateral', [
        {
          marketId,
          accountId,
          collateralAsset,
          amount,
        },
      ])
    },
    [ensureAccountReady, runTx],
  )

  const openOrIncrease = useCallback(
    async ({ isLong, sizeDeltaUsdX18, executionPriceX18, limitPriceX18, maxSlippageBps, feePoolId, executorFee }) => {
      const { marketId, accountId } = ensureAccountReady()
      return runTx(perpsExecutionFacetAbi, 'openOrIncrease', [
        {
          marketId,
          accountId,
          isLong,
          sizeDeltaUsdX18,
          executionPriceX18,
          limitPriceX18,
          maxSlippageBps,
          feePoolId,
          executorFee,
        },
      ])
    },
    [ensureAccountReady, runTx],
  )

  const decreaseOrClose = useCallback(
    async ({ isLong, sizeDeltaUsdX18, executionPriceX18, limitPriceX18, maxSlippageBps, feePoolId, executorFee }) => {
      const { marketId, accountId } = ensureAccountReady()
      return runTx(perpsExecutionFacetAbi, 'decreaseOrClose', [
        {
          marketId,
          accountId,
          isLong,
          sizeDeltaUsdX18,
          executionPriceX18,
          limitPriceX18,
          maxSlippageBps,
          feePoolId,
          executorFee,
        },
      ])
    },
    [ensureAccountReady, runTx],
  )

  return {
    markets,
    selectedMarket,
    state,
    loading,
    error,
    pendingWrite: isPending,
    refetch,
    actions: {
      createAccount,
      addCollateral,
      removeCollateral,
      openOrIncrease,
      decreaseOrClose,
    },
  }
}

export default usePerps
