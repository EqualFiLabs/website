import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'

import useActivePublicClient from './useActivePublicClient'
import useActiveChainId from './useActiveChainId'
import useBufferedWriteContract from './useBufferedWriteContract'
import usePoolsConfig from './usePoolsConfig'
import { ZERO_ADDRESS } from '../address'
import { positionNFTAbi } from '../abis/positionNFT'
import { ilmIsolatedAdminFacetAbi, ilmIsolatedFacetAbi, ilmIsolatedViewFacetAbi } from '../abis/ilmIsolatedFacet'
import {
  mergeIlmIsolatedMarkets,
  normalizeIlmIsolatedMarkets,
  normalizeIndexedIlmMarkets,
} from '../ilmIsolated'

const tupleValue = (value, key, index, fallback = 0n) => {
  if (value && typeof value === 'object' && key in value) {
    return value[key] ?? fallback
  }
  if (Array.isArray(value) && value[index] !== undefined) {
    return value[index]
  }
  return fallback
}

const normalizeMarketState = (raw) => ({
  totalSupplyAssets: BigInt(tupleValue(raw, 'totalSupplyAssets', 0, 0n)),
  totalSupplyShares: BigInt(tupleValue(raw, 'totalSupplyShares', 1, 0n)),
  totalBorrowAssets: BigInt(tupleValue(raw, 'totalBorrowAssets', 2, 0n)),
  totalBorrowShares: BigInt(tupleValue(raw, 'totalBorrowShares', 3, 0n)),
  lastUpdate: BigInt(tupleValue(raw, 'lastUpdate', 4, 0n)),
  fee: BigInt(tupleValue(raw, 'fee', 5, 0n)),
})

const normalizeMarketParams = (raw) => ({
  loanPoolId: Number(tupleValue(raw, 'loanPoolId', 0, 0n)),
  collateralPoolId: Number(tupleValue(raw, 'collateralPoolId', 1, 0n)),
  oracle: String(tupleValue(raw, 'oracle', 2, ZERO_ADDRESS)).toLowerCase(),
  irm: String(tupleValue(raw, 'irm', 3, ZERO_ADDRESS)).toLowerCase(),
  lltv: BigInt(tupleValue(raw, 'lltv', 4, 0n)),
})

const normalizePosition = (raw) => ({
  supplyShares: BigInt(tupleValue(raw, 'supplyShares', 0, 0n)),
  borrowShares: BigInt(tupleValue(raw, 'borrowShares', 1, 0n)),
  collateralAssets: BigInt(tupleValue(raw, 'collateralAssets', 2, 0n)),
})

const emptyState = {
  market: null,
  params: null,
  position: null,
  healthy: null,
  liquidationFeeBps: 0,
  protocolFeeAssets: 0n,
  positionKey: null,
}

function useIlmIsolated(selectedMarketId, selectedPositionId) {
  const { address, isConnected } = useAccount()
  const chainId = useActiveChainId()
  const publicClient = useActivePublicClient()
  const { writeContractAsync, isPending } = useBufferedWriteContract()
  const poolsConfig = usePoolsConfig()

  const diamondAddress = (poolsConfig?.diamondAddress || '').trim()
  const positionNftAddress = (poolsConfig?.positionNFTAddress || '').trim()

  const [indexedMarketRows, setIndexedMarketRows] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState(null)

  const markets = useMemo(() => {
    const configMarkets = normalizeIlmIsolatedMarkets(poolsConfig)
    const indexedConfigLike = normalizeIndexedIlmMarkets(indexedMarketRows)
    const indexedMarkets = normalizeIlmIsolatedMarkets({ ...poolsConfig, ilmIsolatedMarkets: indexedConfigLike })
    return mergeIlmIsolatedMarkets(configMarkets, indexedMarkets)
  }, [indexedMarketRows, poolsConfig])
  const selectedMarket = useMemo(
    () => markets.find((market) => market.id === selectedMarketId) || null,
    [markets, selectedMarketId],
  )

  const [state, setState] = useState(emptyState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshCatalog = useCallback(async () => {
    if (!chainId) {
      setIndexedMarketRows([])
      setCatalogError(null)
      return
    }

    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const params = new URLSearchParams()
      params.set('chainId', String(chainId))
      params.set('limit', '500')
      const response = await fetch(`/api/ilm-markets?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`Failed to load indexed ILM markets (${response.status})`)
      }
      const json = await response.json()
      setIndexedMarketRows(Array.isArray(json?.markets) ? json.markets : [])
    } catch (err) {
      console.warn('Failed to load indexed ILM markets', err)
      setCatalogError(err instanceof Error ? err.message : 'Failed to load indexed ILM markets')
      setIndexedMarketRows([])
    } finally {
      setCatalogLoading(false)
    }
  }, [chainId])

  useEffect(() => {
    void refreshCatalog()
  }, [refreshCatalog])

  const resolvePositionKey = useCallback(async () => {
    if (!selectedPositionId || !publicClient || !positionNftAddress || positionNftAddress === ZERO_ADDRESS) {
      return null
    }

    const positionKey = await publicClient.readContract({
      address: positionNftAddress,
      abi: positionNFTAbi,
      functionName: 'getPositionKey',
      args: [BigInt(selectedPositionId)],
    })

    return positionKey
  }, [publicClient, positionNftAddress, selectedPositionId])

  const refetch = useCallback(async () => {
    if (!publicClient || !diamondAddress || !selectedMarket) {
      setState(emptyState)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [positionKey, marketRaw, paramsRaw, liquidationFeeBpsRaw, protocolFeeAssetsRaw] = await Promise.all([
        resolvePositionKey(),
        publicClient.readContract({
          address: diamondAddress,
          abi: ilmIsolatedViewFacetAbi,
          functionName: 'getIsolatedMarket',
          args: [selectedMarket.marketId],
        }),
        publicClient.readContract({
          address: diamondAddress,
          abi: ilmIsolatedViewFacetAbi,
          functionName: 'getIsolatedMarketParams',
          args: [selectedMarket.marketId],
        }),
        publicClient.readContract({
          address: diamondAddress,
          abi: ilmIsolatedViewFacetAbi,
          functionName: 'getIsolatedMarketLiquidationFeeBps',
          args: [selectedMarket.marketId],
        }),
        publicClient.readContract({
          address: diamondAddress,
          abi: ilmIsolatedViewFacetAbi,
          functionName: 'getIsolatedMarketProtocolFeeAssets',
          args: [selectedMarket.marketId],
        }),
      ])

      let positionRaw = null
      let healthyRaw = null
      if (positionKey && selectedPositionId) {
        ;[positionRaw, healthyRaw] = await Promise.all([
          publicClient.readContract({
            address: diamondAddress,
            abi: ilmIsolatedViewFacetAbi,
            functionName: 'getIsolatedPosition',
            args: [selectedMarket.marketId, positionKey],
          }),
          publicClient.readContract({
            address: diamondAddress,
            abi: ilmIsolatedViewFacetAbi,
            functionName: 'isIsolatedHealthy',
            args: [selectedMarket.marketId, BigInt(selectedPositionId)],
          }),
        ])
      }

      setState({
        market: normalizeMarketState(marketRaw),
        params: normalizeMarketParams(paramsRaw),
        position: positionRaw ? normalizePosition(positionRaw) : null,
        healthy: typeof healthyRaw === 'boolean' ? healthyRaw : null,
        liquidationFeeBps: Number(liquidationFeeBpsRaw ?? 0n),
        protocolFeeAssets: BigInt(protocolFeeAssetsRaw ?? 0n),
        positionKey,
      })
    } catch (err) {
      console.error('Failed to fetch ILM isolated state', err)
      setError(err instanceof Error ? err.message : 'Failed to load ILM market state')
    } finally {
      setLoading(false)
    }
  }, [publicClient, diamondAddress, resolvePositionKey, selectedMarket, selectedPositionId])

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
      throw new Error('Select an ILM market')
    }
    if (!selectedPositionId) {
      throw new Error('Select a position')
    }

    return {
      diamondAddress: target,
      marketId: selectedMarket.marketId,
      positionId: BigInt(selectedPositionId),
    }
  }, [ensureWalletReady, selectedMarket, selectedPositionId])

  const runTx = useCallback(
    async (functionName, args) => {
      const { diamondAddress: target } = ensureReadyForWrite()

      const hash = await writeContractAsync({
        address: target,
        abi: ilmIsolatedFacetAbi,
        functionName,
        args,
      })

      await publicClient.waitForTransactionReceipt({ hash })
      await refetch()
      return hash
    },
    [ensureReadyForWrite, publicClient, refetch, writeContractAsync],
  )

  const isolatedSupply = useCallback(
    async ({ assets, shares }) => {
      const { marketId, positionId } = ensureReadyForWrite()
      return runTx('isolatedSupply', [marketId, assets, shares, positionId])
    },
    [ensureReadyForWrite, runTx],
  )

  const isolatedWithdraw = useCallback(
    async ({ assets, shares }) => {
      const { marketId, positionId } = ensureReadyForWrite()
      return runTx('isolatedWithdraw', [marketId, assets, shares, positionId])
    },
    [ensureReadyForWrite, runTx],
  )

  const isolatedSupplyCollateral = useCallback(
    async ({ assets }) => {
      const { marketId, positionId } = ensureReadyForWrite()
      return runTx('isolatedSupplyCollateral', [marketId, assets, positionId])
    },
    [ensureReadyForWrite, runTx],
  )

  const isolatedWithdrawCollateral = useCallback(
    async ({ assets }) => {
      const { marketId, positionId } = ensureReadyForWrite()
      return runTx('isolatedWithdrawCollateral', [marketId, assets, positionId])
    },
    [ensureReadyForWrite, runTx],
  )

  const isolatedBorrow = useCallback(
    async ({ assets, shares }) => {
      const { marketId, positionId } = ensureReadyForWrite()
      return runTx('isolatedBorrow', [marketId, assets, shares, positionId])
    },
    [ensureReadyForWrite, runTx],
  )

  const isolatedRepay = useCallback(
    async ({ assets, shares }) => {
      const { marketId, positionId } = ensureReadyForWrite()
      return runTx('isolatedRepay', [marketId, assets, shares, positionId])
    },
    [ensureReadyForWrite, runTx],
  )

  const createMarket = useCallback(
    async ({ loanPoolId, collateralPoolId, oracle, irm, lltvWad, moduleId }) => {
      if (!isAddress(oracle)) {
        throw new Error('Oracle must be a valid address')
      }
      if (!isAddress(irm)) {
        throw new Error('IRM must be a valid address')
      }
      const { diamondAddress: target } = ensureWalletReady()
      const hash = await writeContractAsync({
        address: target,
        abi: ilmIsolatedAdminFacetAbi,
        functionName: 'createIlmIsolatedMarket',
        args: [
          {
            loanPoolId: BigInt(loanPoolId),
            collateralPoolId: BigInt(collateralPoolId),
            oracle,
            irm,
            lltv: BigInt(lltvWad),
          },
          BigInt(moduleId),
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
      isolatedSupply,
      isolatedWithdraw,
      isolatedSupplyCollateral,
      isolatedWithdrawCollateral,
      isolatedBorrow,
      isolatedRepay,
      createMarket,
    },
  }
}

export default useIlmIsolated
