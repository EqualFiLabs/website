import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'

import useActiveChainId from './useActiveChainId'
import useActivePublicClient from './useActivePublicClient'
import useBufferedWriteContract from './useBufferedWriteContract'
import usePoolsConfig from './usePoolsConfig'
import {
  ilmPooledAdminFacetAbi,
  ilmPooledFacetAbi,
  ilmPooledLiquidationFacetAbi,
  ilmPooledViewFacetAbi,
} from '../abis/ilmPooledFacet'
import {
  mergeIlmPooledMarkets,
  normalizeDiscoveredIlmPooledMarkets,
  normalizeIlmPooledMarkets,
} from '../ilmPooled'

const RAY = 10n ** 27n
const DISCOVERY_BLOCK_WINDOW = 100_000n
const ILM_MARKET_CREATED_EVENT = ilmPooledAdminFacetAbi.find(
  (item) => item.type === 'event' && item.name === 'IlmMarketCreated',
)

const tupleValue = (value, key, index, fallback = 0n) => {
  if (value && typeof value === 'object' && key in value) {
    return value[key] ?? fallback
  }
  if (Array.isArray(value) && value[index] !== undefined) {
    return value[index]
  }
  return fallback
}

const normalizeMarket = (raw) => {
  const liquidityIndexRay = BigInt(tupleValue(raw, 'liquidityIndexRay', 16, 0n))
  const variableBorrowIndexRay = BigInt(tupleValue(raw, 'variableBorrowIndexRay', 17, 0n))
  const scaledSupplyTotal = BigInt(tupleValue(raw, 'scaledSupplyTotal', 21, 0n))
  const scaledVariableDebtTotal = BigInt(tupleValue(raw, 'scaledVariableDebtTotal', 22, 0n))

  const totalSupplyAssets = liquidityIndexRay > 0n ? (scaledSupplyTotal * liquidityIndexRay) / RAY : 0n
  const totalDebtAssets = variableBorrowIndexRay > 0n ? (scaledVariableDebtTotal * variableBorrowIndexRay) / RAY : 0n
  const availableLiquidity = BigInt(tupleValue(raw, 'availableLiquidity', 23, 0n))

  const liquidityBase = availableLiquidity + totalDebtAssets
  const utilizationBps = liquidityBase > 0n ? Number((totalDebtAssets * 10_000n) / liquidityBase) : 0

  return {
    loanPoolId: Number(tupleValue(raw, 'loanPoolId', 0, 0n)),
    collateralPoolId: Number(tupleValue(raw, 'collateralPoolId', 1, 0n)),
    ltvBps: Number(tupleValue(raw, 'ltvBps', 2, 0n)),
    liquidationThresholdBps: Number(tupleValue(raw, 'liquidationThresholdBps', 3, 0n)),
    liquidationBonusBps: Number(tupleValue(raw, 'liquidationBonusBps', 4, 0n)),
    liquidationProtocolFeeBps: Number(tupleValue(raw, 'liquidationProtocolFeeBps', 5, 0n)),
    reserveFactorBps: Number(tupleValue(raw, 'reserveFactorBps', 6, 0n)),
    optimalUtilizationBps: Number(tupleValue(raw, 'optimalUtilizationBps', 7, 0n)),
    baseVariableRateRayPerYear: Number(tupleValue(raw, 'baseVariableRateRayPerYear', 8, 0n)),
    variableSlope1RayPerYear: Number(tupleValue(raw, 'variableSlope1RayPerYear', 9, 0n)),
    variableSlope2RayPerYear: Number(tupleValue(raw, 'variableSlope2RayPerYear', 10, 0n)),
    supplyCap: BigInt(tupleValue(raw, 'supplyCap', 11, 0n)),
    borrowCap: BigInt(tupleValue(raw, 'borrowCap', 12, 0n)),
    active: Boolean(tupleValue(raw, 'active', 13, false)),
    paused: Boolean(tupleValue(raw, 'paused', 14, false)),
    frozen: Boolean(tupleValue(raw, 'frozen', 15, false)),
    liquidityIndexRay,
    variableBorrowIndexRay,
    currentLiquidityRateRay: BigInt(tupleValue(raw, 'currentLiquidityRateRay', 18, 0n)),
    currentVariableBorrowRateRay: BigInt(tupleValue(raw, 'currentVariableBorrowRateRay', 19, 0n)),
    lastUpdate: BigInt(tupleValue(raw, 'lastUpdate', 20, 0n)),
    scaledSupplyTotal,
    scaledVariableDebtTotal,
    availableLiquidity,
    badDebt: BigInt(tupleValue(raw, 'badDebt', 24, 0n)),
    totalSupplyAssets,
    totalDebtAssets,
    utilizationBps,
  }
}

const normalizePosition = (raw) => ({
  scaledSupply: BigInt(tupleValue(raw, 'scaledSupply', 0, 0n)),
  scaledDebt: BigInt(tupleValue(raw, 'scaledDebt', 1, 0n)),
  useAsCollateral: Boolean(tupleValue(raw, 'useAsCollateral', 2, false)),
})

const normalizeDiscoveredRows = (logs) =>
  (Array.isArray(logs) ? logs : [])
    .map((log) => ({
      marketId: Number(log?.args?.marketId ?? -1),
      loanPoolId: Number(log?.args?.loanPoolId ?? -1),
      collateralPoolId: Number(log?.args?.collateralPoolId ?? -1),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.marketId) &&
        row.marketId > 0 &&
        Number.isFinite(row.loanPoolId) &&
        row.loanPoolId >= 0 &&
        Number.isFinite(row.collateralPoolId) &&
        row.collateralPoolId >= 0,
    )

const emptyState = {
  market: null,
  position: null,
  healthFactor: null,
  supplyBalance: 0n,
  debtBalance: 0n,
  protocolFeeAssets: 0n,
}

async function fetchCreatedMarketLogs(publicClient, diamondAddress) {
  if (!ILM_MARKET_CREATED_EVENT) return []

  try {
    return await publicClient.getLogs({
      address: diamondAddress,
      event: ILM_MARKET_CREATED_EVENT,
      fromBlock: 0n,
      toBlock: 'latest',
    })
  } catch {
    const latestBlock = await publicClient.getBlockNumber()
    const logs = []
    let fromBlock = 0n

    while (fromBlock <= latestBlock) {
      const toBlock = fromBlock + DISCOVERY_BLOCK_WINDOW > latestBlock ? latestBlock : fromBlock + DISCOVERY_BLOCK_WINDOW
      const chunk = await publicClient.getLogs({
        address: diamondAddress,
        event: ILM_MARKET_CREATED_EVENT,
        fromBlock,
        toBlock,
      })
      if (chunk.length > 0) {
        logs.push(...chunk)
      }
      fromBlock = toBlock + 1n
    }

    return logs
  }
}

function useIlmPooled(selectedMarketId, selectedPositionId) {
  const { address, isConnected } = useAccount()
  const chainId = useActiveChainId()
  const publicClient = useActivePublicClient()
  const { writeContractAsync, isPending } = useBufferedWriteContract()
  const poolsConfig = usePoolsConfig()

  const diamondAddress = (poolsConfig?.diamondAddress || '').trim()

  const [discoveredMarketRows, setDiscoveredMarketRows] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState(null)

  const markets = useMemo(() => {
    const configMarkets = normalizeIlmPooledMarkets(poolsConfig)
    const discoveredMarkets = normalizeDiscoveredIlmPooledMarkets(poolsConfig, discoveredMarketRows)
    return mergeIlmPooledMarkets(configMarkets, discoveredMarkets)
  }, [discoveredMarketRows, poolsConfig])

  const selectedMarket = useMemo(
    () => markets.find((market) => market.id === selectedMarketId) || null,
    [markets, selectedMarketId],
  )

  const [state, setState] = useState(emptyState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshCatalog = useCallback(async () => {
    if (!chainId || !publicClient || !diamondAddress) {
      setDiscoveredMarketRows([])
      setCatalogError(null)
      return
    }

    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const logs = await fetchCreatedMarketLogs(publicClient, diamondAddress)
      setDiscoveredMarketRows(normalizeDiscoveredRows(logs))
    } catch (err) {
      console.warn('Failed to discover ILM pooled markets', err)
      setCatalogError(err instanceof Error ? err.message : 'Failed to discover ILM pooled markets')
      setDiscoveredMarketRows([])
    } finally {
      setCatalogLoading(false)
    }
  }, [chainId, diamondAddress, publicClient])

  useEffect(() => {
    void refreshCatalog()
  }, [refreshCatalog])

  const refetch = useCallback(async () => {
    if (!publicClient || !diamondAddress || !selectedMarket) {
      setState(emptyState)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const marketId = BigInt(selectedMarket.marketId)
      const marketPromise = publicClient.readContract({
        address: diamondAddress,
        abi: ilmPooledViewFacetAbi,
        functionName: 'getPooledMarket',
        args: [marketId],
      })

      const protocolFeePromise = publicClient.readContract({
        address: diamondAddress,
        abi: ilmPooledViewFacetAbi,
        functionName: 'getPooledMarketProtocolFeeAssets',
        args: [marketId],
      })

      let positionRaw = null
      let hfRaw = null
      let supplyRaw = 0n
      let debtRaw = 0n

      if (selectedPositionId) {
        const positionId = BigInt(selectedPositionId)
        ;[positionRaw, hfRaw, supplyRaw, debtRaw] = await Promise.all([
          publicClient.readContract({
            address: diamondAddress,
            abi: ilmPooledViewFacetAbi,
            functionName: 'getPooledPosition',
            args: [marketId, positionId],
          }),
          publicClient.readContract({
            address: diamondAddress,
            abi: ilmPooledViewFacetAbi,
            functionName: 'previewHealthFactor',
            args: [marketId, positionId],
          }),
          publicClient.readContract({
            address: diamondAddress,
            abi: ilmPooledViewFacetAbi,
            functionName: 'previewSupplyBalance',
            args: [marketId, positionId],
          }),
          publicClient.readContract({
            address: diamondAddress,
            abi: ilmPooledViewFacetAbi,
            functionName: 'previewDebtBalance',
            args: [marketId, positionId],
          }),
        ])
      }

      const [marketRaw, protocolFeeRaw] = await Promise.all([marketPromise, protocolFeePromise])

      setState({
        market: normalizeMarket(marketRaw),
        position: positionRaw ? normalizePosition(positionRaw) : null,
        healthFactor: hfRaw === null ? null : BigInt(hfRaw),
        supplyBalance: BigInt(supplyRaw ?? 0n),
        debtBalance: BigInt(debtRaw ?? 0n),
        protocolFeeAssets: BigInt(protocolFeeRaw ?? 0n),
      })
    } catch (err) {
      console.error('Failed to fetch ILM pooled state', err)
      setError(err instanceof Error ? err.message : 'Failed to load ILM pooled market state')
    } finally {
      setLoading(false)
    }
  }, [publicClient, diamondAddress, selectedMarket, selectedPositionId])

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

    return {
      diamondAddress,
    }
  }, [address, diamondAddress, isConnected, publicClient, writeContractAsync])

  const ensureReadyForWrite = useCallback(() => {
    const { diamondAddress: target } = ensureWalletReady()
    if (!selectedMarket) {
      throw new Error('Select an ILM pooled market')
    }
    if (!selectedPositionId) {
      throw new Error('Select a position')
    }

    return {
      diamondAddress: target,
      marketId: BigInt(selectedMarket.marketId),
      positionId: BigInt(selectedPositionId),
    }
  }, [ensureWalletReady, selectedMarket, selectedPositionId])

  const runPooledTx = useCallback(
    async (functionName, amount) => {
      const { diamondAddress: target, marketId, positionId } = ensureReadyForWrite()

      const hash = await writeContractAsync({
        address: target,
        abi: ilmPooledFacetAbi,
        functionName,
        args: [positionId, marketId, amount],
      })

      await publicClient.waitForTransactionReceipt({ hash })
      await refetch()
      return hash
    },
    [ensureReadyForWrite, publicClient, refetch, writeContractAsync],
  )

  const pooledSupply = useCallback(async ({ amount }) => runPooledTx('pooledSupply', amount), [runPooledTx])
  const pooledWithdraw = useCallback(async ({ amount }) => runPooledTx('pooledWithdraw', amount), [runPooledTx])
  const pooledAddCollateral = useCallback(async ({ amount }) => runPooledTx('pooledAddCollateral', amount), [runPooledTx])
  const pooledRemoveCollateral = useCallback(
    async ({ amount }) => runPooledTx('pooledRemoveCollateral', amount),
    [runPooledTx],
  )
  const pooledBorrow = useCallback(async ({ amount }) => runPooledTx('pooledBorrow', amount), [runPooledTx])
  const pooledRepay = useCallback(async ({ amount }) => runPooledTx('pooledRepay', amount), [runPooledTx])

  const pooledLiquidationCall = useCallback(
    async ({ liquidatorPositionId, borrowerPositionId, debtToCover }) => {
      const { diamondAddress: target, marketId, positionId } = ensureReadyForWrite()
      const liquidatorId = liquidatorPositionId === undefined || liquidatorPositionId === null
        ? positionId
        : BigInt(liquidatorPositionId)
      const borrowerId = BigInt(borrowerPositionId)

      const hash = await writeContractAsync({
        address: target,
        abi: ilmPooledLiquidationFacetAbi,
        functionName: 'pooledLiquidationCall',
        args: [liquidatorId, borrowerId, marketId, debtToCover],
      })

      await publicClient.waitForTransactionReceipt({ hash })
      await refetch()
      return hash
    },
    [ensureReadyForWrite, publicClient, refetch, writeContractAsync],
  )

  const createMarket = useCallback(
    async ({
      loanPoolId,
      collateralPoolId,
      moduleId,
      ltvBps,
      liquidationThresholdBps,
      liquidationBonusBps,
      liquidationProtocolFeeBps,
      reserveFactorBps,
      optimalUtilizationBps,
      baseVariableRateRayPerYear,
      variableSlope1RayPerYear,
      variableSlope2RayPerYear,
      supplyCap,
      borrowCap,
    }) => {
      const { diamondAddress: target } = ensureWalletReady()
      const hash = await writeContractAsync({
        address: target,
        abi: ilmPooledAdminFacetAbi,
        functionName: 'createPooledMarket',
        args: [
          {
            loanPoolId: BigInt(loanPoolId),
            collateralPoolId: BigInt(collateralPoolId),
            moduleId: BigInt(moduleId),
            ltvBps: Number(ltvBps),
            liquidationThresholdBps: Number(liquidationThresholdBps),
            liquidationBonusBps: Number(liquidationBonusBps),
            liquidationProtocolFeeBps: Number(liquidationProtocolFeeBps),
            reserveFactorBps: Number(reserveFactorBps),
            optimalUtilizationBps: Number(optimalUtilizationBps),
            baseVariableRateRayPerYear: Number(baseVariableRateRayPerYear),
            variableSlope1RayPerYear: Number(variableSlope1RayPerYear),
            variableSlope2RayPerYear: Number(variableSlope2RayPerYear),
            supplyCap: BigInt(supplyCap),
            borrowCap: BigInt(borrowCap),
          },
        ],
      })

      await publicClient.waitForTransactionReceipt({ hash })
      await Promise.all([refetch(), refreshCatalog()])
      return hash
    },
    [ensureWalletReady, publicClient, refetch, refreshCatalog, writeContractAsync],
  )

  return {
    markets,
    selectedMarket,
    state,
    loading,
    error,
    catalogLoading,
    catalogError,
    pendingWrite: isPending,
    refetch,
    refreshCatalog,
    actions: {
      pooledSupply,
      pooledWithdraw,
      pooledAddCollateral,
      pooledRemoveCollateral,
      pooledBorrow,
      pooledRepay,
      pooledLiquidationCall,
      createMarket,
    },
  }
}

export default useIlmPooled
