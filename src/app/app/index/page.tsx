"use client";
import type { PoolConfig, PositionNFT } from '@/types'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { decodeEventLog, erc20Abi, formatUnits, isAddress, maxUint256, parseUnits } from 'viem'
import { useAccount } from 'wagmi'
import useBufferedWriteContract from '@/lib/hooks/useBufferedWriteContract'
import { AppShell } from '../../app-shell'
import useActivePublicClient from '@/lib/hooks/useActivePublicClient'
import usePoolsConfig from '@/lib/hooks/usePoolsConfig'
import useExplorerUrl from '@/lib/hooks/useExplorerUrl'
import usePositionNFTs from '@/lib/hooks/usePositionNFTs'
import { equalIndexFacetV3Abi } from '@/lib/abis/equalIndex'
import { configViewFacetAbi, multiPoolPositionViewFacetAbi, positionNFTAbi, positionViewFacetAbi } from '@/lib/abis/positionNFT'
import { useToasts } from '@/components/common/ToastProvider'
import CreateIndexModal from '@/components/index/CreateIndexModal'
import { ZERO_ADDRESS } from '@/lib/address'
import {
  buildBufferedMaxInputs,
  computeMintRequirement,
  DEFAULT_MINT_MAX_SLIPPAGE_BPS,
  INDEX_SCALE,
} from '@/lib/indexMintQuote'
import {
  computeAvailablePrincipal,
  computeNetBorrow,
  computeOriginationFee,
  durationDaysToSeconds,
} from '@/lib/indexLending'
import {
  indexerStatusLabel,
  mergeActiveIndexLoans,
  normalizeIndexLoanRow,
  removeRecentIndexLoan,
  upsertRecentIndexLoan,
} from '@/lib/indexLoanFeed'

const normalizeAddress = (value: any) => (value ? value.toLowerCase() : '')
const toBigInt = (value: any) => (typeof value === 'bigint' ? value : BigInt(value ?? 0))
type IndexLoanStatus = {
  available: boolean
  reason?: string
  updatedAt: string | null
  staleSeconds: number | null
  healthy: boolean
}

const newAssetRow = (assetAddress = '', decimals = '') => ({
  id: `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  assetAddress: assetAddress || '',
  bundleAmount: '',
  mintFeeBps: '0',
  burnFeeBps: '0',
  decimals: decimals === undefined || decimals === null ? '' : String(decimals),
})

export default function IndexPage() {
  const { addToast } = useToasts()
  const publicClient = useActivePublicClient()
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useBufferedWriteContract()
  const { nfts } = usePositionNFTs()
  const poolsConfig = usePoolsConfig()
  const { buildTxUrl } = useExplorerUrl()

  const diamondAddress = (poolsConfig.diamondAddress || '').trim()
  const positionNFTAddress = (poolsConfig.positionNFTAddress || '').trim()
  const activeChainId = publicClient?.chain?.id ?? null
  const diamondAddressLower = diamondAddress.toLowerCase()

  console.log('[Index] poolsConfig:', poolsConfig)
  console.log('[Index] diamondAddress:', diamondAddress)
  console.log('[Index] publicClient chain:', publicClient?.chain?.id)

  const assetOptions = useMemo(() => {
    return (poolsConfig.pools || [])
      .map((pool: PoolConfig) => ({
        id: pool.id,
        address: pool.tokenAddress,
        ticker: pool.ticker || pool.id,
        decimals: pool.decimals ?? 18,
        label: `${pool.ticker || pool.id} (${pool.id})`,
      }))
      .filter((asset: any) => asset.address)
  }, [poolsConfig])

  const assetMeta = useMemo(() => {
    const map = new Map()
    assetOptions.forEach((option: any) => {
      map.set(normalizeAddress(option.address), option)
    })
    return map
  }, [assetOptions])

  const configIndexOptions = useMemo(
    () =>
      (poolsConfig.indexTokens || []).map((token: any, idx: any) => ({
        indexId: idx,
        label: token.id || token.indexTicker || `Index ${idx}`,
        tokenAddress: token.indexTokenAddress || '',
      })),
    [poolsConfig],
  )

  const [createdIndexes, setCreatedIndexes] = useState<any[]>([])
  const indexOptions = useMemo(() => {
    const seen = new Set()
    const combined: any[] = []
    const add = (option: any) => {
      if (seen.has(option.indexId)) return
      seen.add(option.indexId)
      combined.push(option)
    }
    configIndexOptions.forEach(add)
    createdIndexes.forEach(add)
    return combined
  }, [configIndexOptions, createdIndexes])

  const [selectedIndexId, setSelectedIndexId] = useState<any>(indexOptions[0]?.indexId ?? 0)
  const [manualIndexId, setManualIndexId] = useState<string>('')
  const [indexView, setIndexView] = useState<any>(null)
  const [indexError, setIndexError] = useState<string>('')
  const [indexLoading, setIndexLoading] = useState<boolean>(false)
  const [userIndexBalance, setUserIndexBalance] = useState<any>(null)
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false)

  const [mintMode, setMintMode] = useState<any>('wallet')
  const [units, setUnits] = useState<string>('')
  const [positionId, setPositionId] = useState<string>('')

  const [createName, setCreateName] = useState<string>('')
  const [createSymbol, setCreateSymbol] = useState<string>('')
  const [createFlashFeeBps, setCreateFlashFeeBps] = useState<any>('0')
  const [createFeeEth, setCreateFeeEth] = useState<string>('')
  const [assetRows, setAssetRows] = useState<any>(() => [newAssetRow()])
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false)

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [requiredAssets, setRequiredAssets] = useState<any[]>([])
  const [requiredAssetsLoading, setRequiredAssetsLoading] = useState<boolean>(false)
  const [lendingPositionId, setLendingPositionId] = useState<string>('')
  const [lendingAsset, setLendingAsset] = useState<string>('')
  const [collateralUnitsInput, setCollateralUnitsInput] = useState<string>('')
  const [borrowAmountInput, setBorrowAmountInput] = useState<string>('')
  const [durationDaysInput, setDurationDaysInput] = useState<string>('30')
  const [extendDaysInput, setExtendDaysInput] = useState<string>('30')
  const [loanIdInput, setLoanIdInput] = useState<string>('')
  const [lendingConfig, setLendingConfig] = useState<any>(null)
  const [lendingConfigLoading, setLendingConfigLoading] = useState<boolean>(false)
  const [lendingConfigError, setLendingConfigError] = useState<string>('')
  const [maxBorrowableRaw, setMaxBorrowableRaw] = useState<bigint>(0n)
  const [maxBorrowableLoading, setMaxBorrowableLoading] = useState<boolean>(false)
  const [indexPoolSnapshot, setIndexPoolSnapshot] = useState<any>(null)
  const [loanDetails, setLoanDetails] = useState<any>(null)
  const [loanLoading, setLoanLoading] = useState<boolean>(false)
  const [lendingRefreshKey, setLendingRefreshKey] = useState<number>(0)
  const [lendingPositionKey, setLendingPositionKey] = useState<string>('')
  const [indexedLoans, setIndexedLoans] = useState<any[]>([])
  const [recentIndexedLoans, setRecentIndexedLoans] = useState<ReturnType<typeof normalizeIndexLoanRow>[]>([])
  const [indexedLoansLoading, setIndexedLoansLoading] = useState<boolean>(false)
  const [indexedLoansStatus, setIndexedLoansStatus] = useState<IndexLoanStatus | null>(null)

  useEffect(() => {
    if (!assetRows.length) {
      setAssetRows([newAssetRow()])
    }
  }, [assetRows.length])

  useEffect(() => {
    if ((selectedIndexId === null || selectedIndexId === undefined) && indexOptions.length) {
      setSelectedIndexId(indexOptions[0].indexId)
    }
  }, [indexOptions, selectedIndexId])

  useEffect(() => {
    let cancelled = false
    const fetchIndex = async () => {
      if (!publicClient || !diamondAddress) {
        setIndexView(null)
        return
      }
      setIndexError('')
      if (!cancelled) setIndexLoading(true)
      try {
        const view = await publicClient!.readContract({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'getIndex',
          args: [BigInt(selectedIndexId)],
        })
        if (!cancelled) {
          setIndexView(view)
        }
      } catch (err) {
        if (!cancelled) {
          setIndexView(null)
          setIndexError('Unable to load index data. Check the ID or network.')
        }
      } finally {
        if (!cancelled) setIndexLoading(false)
      }
    }
    if (selectedIndexId !== null && selectedIndexId !== undefined) {
      fetchIndex()
    }
    return () => {
      cancelled = true
    }
  }, [publicClient, diamondAddress, selectedIndexId])

  useEffect(() => {
    let cancelled = false
    const fetchBalance = async () => {
      if (!publicClient || !address || !indexView?.token) {
        setUserIndexBalance(null)
        return
      }
      if (!cancelled) setBalanceLoading(true)
      try {
        const balance = await publicClient!.readContract({
          address: indexView.token,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        if (!cancelled) {
          setUserIndexBalance(balance)
        }
      } catch {
        if (!cancelled) {
          setUserIndexBalance(null)
        }
      } finally {
        if (!cancelled) setBalanceLoading(false)
      }
    }
    fetchBalance()
    return () => {
      cancelled = true
    }
  }, [publicClient, address, indexView?.token])

  const positionOptions = useMemo(() => {
    const seen = new Map()
    ;(nfts || []).forEach((nft: PositionNFT) => {
      if (!nft?.tokenId) return
      if (!seen.has(nft.tokenId)) {
        seen.set(nft.tokenId, nft)
      }
    })
    return Array.from(seen.values()).map((nft: PositionNFT) => ({
      tokenId: nft.tokenId,
      label: `#${nft.tokenId}`,
    }))
  }, [nfts])

  const resolvedPositionId = positionId || positionOptions[0]?.tokenId || ''
  const resolvedLendingPositionId = lendingPositionId || positionOptions[0]?.tokenId || ''

  const parsedUnits = useMemo(() => {
    if (!units) return BigInt(0)
    try {
      return parseUnits(units, 18)
    } catch {
      return BigInt(0)
    }
  }, [units])

  const unitsValid = parsedUnits > BigInt(0) && parsedUnits % INDEX_SCALE === BigInt(0)
  const lendingAssetDecimals = useMemo(() => {
    const meta = assetMeta.get(normalizeAddress(lendingAsset))
    return meta?.decimals ?? 18
  }, [assetMeta, lendingAsset])
  const parsedCollateralUnits = useMemo(() => {
    if (!collateralUnitsInput) return 0n
    try {
      return parseUnits(collateralUnitsInput, 18)
    } catch {
      return 0n
    }
  }, [collateralUnitsInput])
  const collateralUnitsValid = parsedCollateralUnits > 0n && parsedCollateralUnits % INDEX_SCALE === 0n
  const parsedBorrowAmount = useMemo(() => {
    if (!borrowAmountInput) return 0n
    try {
      return parseUnits(borrowAmountInput, lendingAssetDecimals)
    } catch {
      return 0n
    }
  }, [borrowAmountInput, lendingAssetDecimals])
  const parsedDurationSeconds = useMemo(() => {
    try {
      return durationDaysToSeconds(durationDaysInput)
    } catch {
      return 0n
    }
  }, [durationDaysInput])
  const parsedExtendSeconds = useMemo(() => {
    try {
      return durationDaysToSeconds(extendDaysInput)
    } catch {
      return 0n
    }
  }, [extendDaysInput])
  const lendingConfigured = useMemo(() => {
    if (!lendingConfig) return false
    return (
      toBigInt(lendingConfig.ltvBps) > 0n ||
      toBigInt(lendingConfig.originationFeeBps) > 0n ||
      toBigInt(lendingConfig.minDuration) > 0n ||
      toBigInt(lendingConfig.maxDuration) > 0n
    )
  }, [lendingConfig])
  const borrowFeePreview = useMemo(
    () => computeOriginationFee(parsedBorrowAmount, toBigInt(lendingConfig?.originationFeeBps ?? 0)),
    [parsedBorrowAmount, lendingConfig],
  )
  const borrowNetPreview = useMemo(
    () => computeNetBorrow(parsedBorrowAmount, toBigInt(lendingConfig?.originationFeeBps ?? 0)),
    [parsedBorrowAmount, lendingConfig],
  )
  const extendFeePreview = useMemo(
    () => computeOriginationFee(toBigInt(loanDetails?.principal ?? 0), toBigInt(lendingConfig?.originationFeeBps ?? 0)),
    [loanDetails, lendingConfig],
  )

  const mintDisabledReason = useMemo(() => {
    if (!isConnected) return 'Connect wallet to mint or burn.'
    if (!indexView) return 'Select an index to continue.'
    if (indexView?.paused) return 'Index is paused.'
    if (!unitsValid) return 'Units must be whole index units (1.0).'
    if (mintMode === 'position' && !resolvedPositionId) return 'Select a Position NFT.'
    return ''
  }, [isConnected, indexView, unitsValid, mintMode, resolvedPositionId])

  useEffect(() => {
    if (!lendingPositionId && positionOptions.length) {
      setLendingPositionId(String(positionOptions[0].tokenId))
    }
  }, [lendingPositionId, positionOptions])

  useEffect(() => {
    let cancelled = false

    const loadLendingPositionKey = async () => {
      if (!publicClient || !positionNFTAddress || !resolvedLendingPositionId) {
        if (!cancelled) setLendingPositionKey('')
        return
      }
      try {
        const key = await publicClient.readContract({
          address: positionNFTAddress as `0x${string}`,
          abi: positionNFTAbi,
          functionName: 'getPositionKey',
          args: [BigInt(resolvedLendingPositionId)],
        })
        if (!cancelled) {
          setLendingPositionKey(String(key).toLowerCase())
        }
      } catch {
        if (!cancelled) {
          setLendingPositionKey('')
        }
      }
    }

    loadLendingPositionKey()
    return () => {
      cancelled = true
    }
  }, [positionNFTAddress, publicClient, resolvedLendingPositionId])

  useEffect(() => {
    const assets = indexView?.assets || []
    if (!assets.length) {
      setLendingAsset('')
      return
    }
    const current = normalizeAddress(lendingAsset)
    const exists = assets.some((asset: any) => normalizeAddress(asset) === current)
    if (!exists) {
      setLendingAsset(assets[0])
    }
  }, [indexView?.assets, lendingAsset])

  useEffect(() => {
    let cancelled = false

    const loadLendingConfig = async () => {
      if (!publicClient || !diamondAddress || selectedIndexId === null || selectedIndexId === undefined) {
        if (!cancelled) {
          setLendingConfig(null)
          setLendingConfigError('')
          setLendingConfigLoading(false)
        }
        return
      }

      if (!cancelled) {
        setLendingConfigLoading(true)
        setLendingConfigError('')
      }
      try {
        const cfg = await publicClient.readContract({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'getLendingConfig',
          args: [BigInt(selectedIndexId)],
        })
        if (!cancelled) {
          setLendingConfig(cfg)
        }
      } catch (err: any) {
        if (!cancelled) {
          setLendingConfig(null)
          setLendingConfigError(err?.shortMessage || err?.message || 'Unable to load lending config')
        }
      } finally {
        if (!cancelled) setLendingConfigLoading(false)
      }
    }

    loadLendingConfig()
    return () => {
      cancelled = true
    }
  }, [diamondAddress, lendingRefreshKey, publicClient, selectedIndexId])

  useEffect(() => {
    let cancelled = false

    const loadIndexPoolSnapshot = async () => {
      if (!publicClient || !diamondAddress || !indexView?.token || !resolvedLendingPositionId) {
        if (!cancelled) setIndexPoolSnapshot(null)
        return
      }

      try {
        const indexPoolId = toBigInt(
          await publicClient.readContract({
            address: diamondAddress as `0x${string}`,
            abi: configViewFacetAbi,
            functionName: 'getPoolIdForAsset',
            args: [indexView.token],
          }),
        )
        const poolData: any = await publicClient.readContract({
          address: diamondAddress as `0x${string}`,
          abi: multiPoolPositionViewFacetAbi,
          functionName: 'getPositionPoolDataPoolOnly',
          args: [BigInt(resolvedLendingPositionId), indexPoolId],
        })
        const encumbrance: any = await publicClient.readContract({
          address: diamondAddress as `0x${string}`,
          abi: positionViewFacetAbi,
          functionName: 'getPositionEncumbrance',
          args: [BigInt(resolvedLendingPositionId), indexPoolId],
        })

        const principalRaw = toBigInt(poolData?.principal ?? 0)
        const totalEncumberedRaw = toBigInt(encumbrance?.totalEncumbered ?? 0)
        const availableRaw = computeAvailablePrincipal(principalRaw, totalEncumberedRaw)
        if (!cancelled) {
          setIndexPoolSnapshot({
            poolId: indexPoolId,
            isMember: Boolean(poolData?.isMember),
            principalRaw,
            totalEncumberedRaw,
            availableRaw,
          })
        }
      } catch {
        if (!cancelled) {
          setIndexPoolSnapshot(null)
        }
      }
    }

    loadIndexPoolSnapshot()
    return () => {
      cancelled = true
    }
  }, [diamondAddress, indexView?.token, lendingRefreshKey, publicClient, resolvedLendingPositionId])

  useEffect(() => {
    let cancelled = false

    const loadMaxBorrowable = async () => {
      if (!publicClient || !diamondAddress || !lendingAsset || parsedCollateralUnits <= 0n) {
        if (!cancelled) {
          setMaxBorrowableRaw(0n)
          setMaxBorrowableLoading(false)
        }
        return
      }
      if (!cancelled) setMaxBorrowableLoading(true)
      try {
        const quoted = await publicClient.readContract({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'maxBorrowable',
          args: [BigInt(selectedIndexId), lendingAsset, parsedCollateralUnits],
        })
        if (!cancelled) {
          setMaxBorrowableRaw(toBigInt(quoted))
        }
      } catch {
        if (!cancelled) {
          setMaxBorrowableRaw(0n)
        }
      } finally {
        if (!cancelled) setMaxBorrowableLoading(false)
      }
    }

    loadMaxBorrowable()
    return () => {
      cancelled = true
    }
  }, [diamondAddress, lendingAsset, lendingRefreshKey, parsedCollateralUnits, publicClient, selectedIndexId])

  useEffect(() => {
    let cancelled = false

    const loadIndexedLoans = async () => {
      if (!activeChainId || !lendingPositionKey || selectedIndexId === null || selectedIndexId === undefined) {
        if (!cancelled) {
          setIndexedLoans([])
          setIndexedLoansStatus(null)
          setIndexedLoansLoading(false)
        }
        return
      }

      if (!cancelled) setIndexedLoansLoading(true)
      try {
        const params = new URLSearchParams({
          chainId: String(activeChainId),
          indexId: String(selectedIndexId),
          positionKey: lendingPositionKey,
          scope: 'active',
          limit: '100',
          page: '1',
        })
        const response = await fetch(`/api/index-loans?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Failed to load indexed loans (${response.status})`)
        const payload = await response.json()
        const nextLoans = (payload?.loans || []).map((row: unknown) =>
          normalizeIndexLoanRow((row || {}) as Record<string, unknown>),
        )
        if (!cancelled) {
          setIndexedLoans(nextLoans)
          setIndexedLoansStatus(payload?.status || null)
        }
      } catch {
        if (!cancelled) {
          setIndexedLoans([])
          setIndexedLoansStatus({
            available: false,
            reason: 'fetch_failed',
            updatedAt: null,
            staleSeconds: null,
            healthy: false,
          })
        }
      } finally {
        if (!cancelled) setIndexedLoansLoading(false)
      }
    }

    loadIndexedLoans()
    return () => {
      cancelled = true
    }
  }, [activeChainId, lendingPositionKey, lendingRefreshKey, selectedIndexId])

  const scopedRecentIndexedLoans = useMemo(
    () =>
      (recentIndexedLoans || []).filter((loan) => {
        const sameIndex = toBigInt(loan.indexId ?? 0) === toBigInt(selectedIndexId ?? 0)
        const normalizedPositionKey = String(loan.positionKey ?? '').toLowerCase()
        const samePosition = !lendingPositionKey || normalizedPositionKey === lendingPositionKey
        return sameIndex && samePosition
      }),
    [lendingPositionKey, recentIndexedLoans, selectedIndexId],
  )
  const activeIndexedLoans = useMemo(
    () => mergeActiveIndexLoans(indexedLoans, scopedRecentIndexedLoans),
    [indexedLoans, scopedRecentIndexedLoans],
  )
  const indexedLoanStatusText = useMemo(
    () => indexerStatusLabel(indexedLoansStatus),
    [indexedLoansStatus],
  )

  const quoteMintInputs = useCallback(
    async (unitsToMint: bigint) => {
      if (!publicClient || !diamondAddress || !indexView || unitsToMint <= 0n) return []

      const assets = indexView.assets || []
      const bundles = indexView.bundleAmounts || []
      const mintFeeBps = indexView.mintFeeBps || []
      const totalSupply = toBigInt(indexView.totalUnits)
      const indexId = BigInt(selectedIndexId)

      return Promise.all(
        assets.map(async (asset: any, idx: any) => {
          const meta = assetMeta.get(normalizeAddress(asset))
          const decimals = meta?.decimals ?? 18
          const bundleAmount = toBigInt(bundles[idx] ?? 0)
          const feeBps = toBigInt(mintFeeBps[idx] ?? 0)

          let economicBalance = 0n
          let feePot = 0n
          if (totalSupply > 0n) {
            feePot = toBigInt(
              await publicClient.readContract({
                address: diamondAddress as `0x${string}`,
                abi: equalIndexFacetV3Abi,
                functionName: 'getFeePot',
                args: [indexId, asset],
              }),
            )

            try {
              economicBalance = toBigInt(
                await publicClient.readContract({
                  address: diamondAddress as `0x${string}`,
                  abi: equalIndexFacetV3Abi,
                  functionName: 'economicBalance',
                  args: [indexId, asset],
                }),
              )
            } catch {
              const vaultBalance = toBigInt(
                await publicClient.readContract({
                  address: diamondAddress as `0x${string}`,
                  abi: equalIndexFacetV3Abi,
                  functionName: 'getVaultBalance',
                  args: [indexId, asset],
                }),
              )
              let outstandingPrincipal = 0n
              try {
                outstandingPrincipal = toBigInt(
                  await publicClient.readContract({
                    address: diamondAddress as `0x${string}`,
                    abi: equalIndexFacetV3Abi,
                    functionName: 'getOutstandingPrincipal',
                    args: [indexId, asset],
                  }),
                )
              } catch {
                outstandingPrincipal = 0n
              }
              economicBalance = vaultBalance + outstandingPrincipal
            }
          }

          const { need, potBuyIn, fee, total } = computeMintRequirement({
            bundleAmount,
            units: unitsToMint,
            totalSupply,
            mintFeeBps: feeBps,
            economicBalance,
            feePot,
          })

          return {
            asset,
            ticker: meta?.ticker || 'UNK',
            decimals,
            base: need,
            potBuyIn,
            fee,
            total,
          }
        }),
      )
    },
    [assetMeta, diamondAddress, indexView, publicClient, selectedIndexId],
  )

  useEffect(() => {
    let cancelled = false

    const loadRequirements = async () => {
      if (!indexView || parsedUnits <= 0n || !publicClient || !diamondAddress) {
        setRequiredAssets([])
        setRequiredAssetsLoading(false)
        return
      }

      setRequiredAssetsLoading(true)
      try {
        const next = await quoteMintInputs(parsedUnits)
        if (!cancelled) {
          setRequiredAssets(next)
        }
      } catch {
        if (!cancelled) {
          setRequiredAssets([])
        }
      } finally {
        if (!cancelled) {
          setRequiredAssetsLoading(false)
        }
      }
    }

    loadRequirements()
    return () => {
      cancelled = true
    }
  }, [diamondAddress, indexView, parsedUnits, publicClient, quoteMintInputs])

  const indexSummary = useMemo(() => {
    if (!indexView) return null
    const assets = indexView.assets || []
    return assets.map((asset: any, idx: any) => {
      const meta = assetMeta.get(normalizeAddress(asset))
      const decimals = meta?.decimals ?? 18
      const bundle = indexView.bundleAmounts?.[idx] ?? BigInt(0)
      return {
        address: asset,
        ticker: meta?.ticker || 'UNK',
        bundle: formatUnits(bundle, decimals),
        mintFee: indexView.mintFeeBps?.[idx] ?? 0,
        burnFee: indexView.burnFeeBps?.[idx] ?? 0,
      }
    })
  }, [indexView, assetMeta])

  const ensureWalletReady = () => {
    if (!publicClient || !writeContractAsync) throw new Error('Wallet client unavailable')
    if (!isConnected || !address) throw new Error('Connect wallet to continue')
    if (!diamondAddress) throw new Error('Diamond address missing from config')
  }

  const ensureAllowance = async (tokenAddress: any, spender: any, amount: any) => {
    if (normalizeAddress(tokenAddress) === ZERO_ADDRESS) return
    const allowance = await publicClient!.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address!, spender],
    })
    if (allowance < amount) {
      const approveTx = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, maxUint256],
      })
      await publicClient!.waitForTransactionReceipt({ hash: approveTx })
    }
  }

  const refreshIndexData = async () => {
    if (!publicClient || selectedIndexId === null || selectedIndexId === undefined) return
    try {
      const view = await publicClient!.readContract({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'getIndex',
        args: [BigInt(selectedIndexId)],
      })
      setIndexView(view)
    } catch {
      // ignore
    }
    if (address && indexView?.token) {
      try {
        const balance = await publicClient!.readContract({
          address: indexView.token,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        setUserIndexBalance(balance)
      } catch {
        // ignore
      }
    }
  }

  const fetchLoanById = useCallback(
    async (loanIdRaw: bigint) => {
      if (!publicClient || !diamondAddress) return null
      const loan: any = await publicClient.readContract({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'getLoan',
        args: [loanIdRaw],
      })
      const principal = toBigInt(loan?.principal ?? 0)
      if (principal === 0n) return null
      return {
        ...loan,
        loanId: loanIdRaw,
        principal,
        collateralUnits: toBigInt(loan?.collateralUnits ?? 0),
        maturity: toBigInt(loan?.maturity ?? 0),
      }
    },
    [diamondAddress, publicClient],
  )

  const handleLoadLoan = async () => {
    if (!loanIdInput) return
    if (!/^\d+$/.test(loanIdInput)) {
      addToast({
        title: 'Invalid loan ID',
        description: 'Enter a valid numeric loan ID',
        type: 'error',
      })
      return
    }
    setLoanLoading(true)
    try {
      const loaded = await fetchLoanById(BigInt(loanIdInput))
      if (!loaded) {
        setLoanDetails(null)
        addToast({
          title: 'Loan not found',
          description: 'Loan is inactive or does not exist',
          type: 'error',
        })
      } else {
        setLoanDetails(loaded)
        setRecentIndexedLoans((prev) =>
          upsertRecentIndexLoan(prev, {
            ...loaded,
            active: true,
            recovered: false,
            updatedAt: new Date().toISOString(),
          }),
        )
      }
    } catch (err: any) {
      addToast({
        title: 'Loan lookup failed',
        description: err?.shortMessage || err?.message || 'Unable to load loan',
        type: 'error',
      })
    } finally {
      setLoanLoading(false)
    }
  }

  const handleSelectIndexedLoan = async (loanIdRaw: bigint) => {
    setLoanIdInput(loanIdRaw.toString())
    setLoanLoading(true)
    try {
      const loaded = await fetchLoanById(loanIdRaw)
      setLoanDetails(loaded)
      if (loaded) {
        setRecentIndexedLoans((prev) =>
          upsertRecentIndexLoan(prev, {
            ...loaded,
            active: true,
            recovered: false,
            updatedAt: new Date().toISOString(),
          }),
        )
      }
    } catch {
      // ignore and keep manual controls available
    } finally {
      setLoanLoading(false)
    }
  }

  const lendingDisabledReason = useMemo(() => {
    if (!isConnected) return 'Connect wallet to borrow, repay, extend, or recover.'
    if (!indexView) return 'Select an index to continue.'
    if (indexView?.paused) return 'Index is paused.'
    if (lendingConfigLoading) return 'Loading lending config…'
    if (lendingConfigError) return lendingConfigError
    if (!lendingConfigured) return 'Lending is not configured for this index.'
    if (!resolvedLendingPositionId) return 'Select a Position NFT.'
    if (!lendingAsset) return 'Select a borrow asset.'
    if (!collateralUnitsValid) return 'Collateral units must be whole index units.'
    if (parsedBorrowAmount <= 0n) return 'Borrow amount must be greater than zero.'
    if (parsedDurationSeconds <= 0n) return 'Borrow duration must be greater than zero days.'
    const minDuration = toBigInt(lendingConfig?.minDuration ?? 0)
    const maxDuration = toBigInt(lendingConfig?.maxDuration ?? 0)
    if (minDuration > 0n && parsedDurationSeconds < minDuration) return 'Borrow duration is below configured minimum.'
    if (maxDuration > 0n && parsedDurationSeconds > maxDuration) return 'Borrow duration exceeds configured maximum.'
    if (indexPoolSnapshot && !indexPoolSnapshot.isMember) return 'Selected position is not a member of the index token pool.'
    if (indexPoolSnapshot && indexPoolSnapshot.availableRaw < parsedCollateralUnits) {
      return 'Insufficient available index-pool principal for requested collateral units.'
    }
    if (maxBorrowableRaw > 0n && parsedBorrowAmount > maxBorrowableRaw) {
      return 'Borrow amount exceeds quoted max borrowable amount.'
    }
    return ''
  }, [
    collateralUnitsValid,
    indexPoolSnapshot,
    indexView,
    isConnected,
    lendingAsset,
    lendingConfigError,
    lendingConfigLoading,
    lendingConfigured,
    maxBorrowableRaw,
    parsedBorrowAmount,
    parsedCollateralUnits,
    parsedDurationSeconds,
    resolvedLendingPositionId,
  ])

  const loanAssetMeta = useMemo(
    () => assetMeta.get(normalizeAddress(loanDetails?.borrowAsset || '')),
    [assetMeta, loanDetails?.borrowAsset],
  )
  const loanAssetDecimals = loanAssetMeta?.decimals ?? 18
  const loanAssetTicker = loanAssetMeta?.ticker || 'UNK'

  const handleBorrowFromPosition = async () => {
    setIsSubmitting(true)
    try {
      ensureWalletReady()
      if (lendingDisabledReason) throw new Error(lendingDisabledReason)
      const args = [
        BigInt(resolvedLendingPositionId),
        BigInt(selectedIndexId),
        lendingAsset,
        parsedCollateralUnits,
        parsedBorrowAmount,
        parsedDurationSeconds,
      ] as const
      await publicClient!.simulateContract({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'borrowFromPosition',
        args,
        account: address,
      })
      const txHash = await writeContractAsync({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'borrowFromPosition',
        args,
      })
      addToast({
        title: 'Borrow submitted',
        description: 'Waiting for confirmation...',
        type: 'pending',
        link: buildTxUrl(txHash),
      })
      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash })
      let createdLoanId: bigint | null = null
      for (const log of receipt.logs) {
        if (!log?.topics?.length) continue
        if (diamondAddressLower && log.address?.toLowerCase() !== diamondAddressLower) continue
        try {
          const decoded = decodeEventLog({
            abi: equalIndexFacetV3Abi,
            data: log.data,
            topics: log.topics,
          })
          if (decoded.eventName === 'LoanCreated') {
            createdLoanId = toBigInt((decoded.args as any)?.loanId ?? 0)
            break
          }
        } catch {
          // ignore non-matching log
        }
      }
      if (createdLoanId !== null && createdLoanId > 0n) {
        setLoanIdInput(createdLoanId.toString())
        const loaded = await fetchLoanById(createdLoanId)
        setLoanDetails(loaded)
        setRecentIndexedLoans((prev) =>
          upsertRecentIndexLoan(prev, {
            ...(loaded || {}),
            loanId: createdLoanId,
            indexId: BigInt(selectedIndexId),
            positionKey: lendingPositionKey,
            borrowAsset: loaded?.borrowAsset || lendingAsset,
            collateralUnits: loaded?.collateralUnits ?? parsedCollateralUnits,
            principal: loaded?.principal ?? parsedBorrowAmount,
            maturity:
              loaded?.maturity ??
              BigInt(Math.floor(Date.now() / 1000)) + parsedDurationSeconds,
            active: true,
            recovered: false,
            updatedAt: new Date().toISOString(),
          }),
        )
      }
      await refreshIndexData()
      setLendingRefreshKey((v) => v + 1)
      setBorrowAmountInput('')
      setCollateralUnitsInput('')
      addToast({
        title: 'Borrow confirmed',
        description: createdLoanId !== null ? `Loan #${createdLoanId.toString()}` : 'Index lending borrow confirmed',
        type: 'success',
        link: buildTxUrl(txHash),
      })
    } catch (err: any) {
      addToast({
        title: 'Borrow failed',
        description: err?.shortMessage || err?.message || 'Transaction reverted',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRepayLoan = async () => {
    setIsSubmitting(true)
    try {
      ensureWalletReady()
      if (!loanDetails?.loanId) throw new Error('Load a valid loan first')
      if (!resolvedLendingPositionId) throw new Error('Select a Position NFT')
      const isNative = normalizeAddress(loanDetails.borrowAsset) === ZERO_ADDRESS
      if (!isNative) {
        await ensureAllowance(loanDetails.borrowAsset, diamondAddress, loanDetails.principal)
      }
      const args = [BigInt(resolvedLendingPositionId), BigInt(loanDetails.loanId)] as const
      const value = isNative ? loanDetails.principal : undefined
      await publicClient!.simulateContract({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'repayFromPosition',
        args,
        value,
        account: address,
      })
      const txHash = await writeContractAsync({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'repayFromPosition',
        args,
        value,
      })
      addToast({
        title: 'Repay submitted',
        description: 'Waiting for confirmation...',
        type: 'pending',
        link: buildTxUrl(txHash),
      })
      await publicClient!.waitForTransactionReceipt({ hash: txHash })
      await refreshIndexData()
      setLoanDetails(null)
      setRecentIndexedLoans((prev) => removeRecentIndexLoan(prev, loanDetails.loanId))
      setLendingRefreshKey((v) => v + 1)
      addToast({
        title: 'Repay confirmed',
        description: `Loan #${loanDetails.loanId.toString()} repaid`,
        type: 'success',
        link: buildTxUrl(txHash),
      })
    } catch (err: any) {
      addToast({
        title: 'Repay failed',
        description: err?.shortMessage || err?.message || 'Transaction reverted',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExtendLoan = async () => {
    setIsSubmitting(true)
    try {
      ensureWalletReady()
      if (!loanDetails?.loanId) throw new Error('Load a valid loan first')
      if (!resolvedLendingPositionId) throw new Error('Select a Position NFT')
      if (parsedExtendSeconds <= 0n) throw new Error('Extend days must be greater than zero')
      const isNative = normalizeAddress(loanDetails.borrowAsset) === ZERO_ADDRESS
      if (!isNative && extendFeePreview > 0n) {
        await ensureAllowance(loanDetails.borrowAsset, diamondAddress, extendFeePreview)
      }
      const args = [BigInt(resolvedLendingPositionId), BigInt(loanDetails.loanId), parsedExtendSeconds] as const
      const value = isNative && extendFeePreview > 0n ? extendFeePreview : undefined
      await publicClient!.simulateContract({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'extendFromPosition',
        args,
        value,
        account: address,
      })
      const txHash = await writeContractAsync({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'extendFromPosition',
        args,
        value,
      })
      addToast({
        title: 'Extend submitted',
        description: 'Waiting for confirmation...',
        type: 'pending',
        link: buildTxUrl(txHash),
      })
      await publicClient!.waitForTransactionReceipt({ hash: txHash })
      const refreshed = await fetchLoanById(BigInt(loanDetails.loanId))
      setLoanDetails(refreshed)
      if (refreshed) {
        setRecentIndexedLoans((prev) =>
          upsertRecentIndexLoan(prev, {
            ...refreshed,
            loanId: BigInt(loanDetails.loanId),
            indexId: BigInt(selectedIndexId),
            positionKey: lendingPositionKey,
            active: true,
            recovered: false,
            updatedAt: new Date().toISOString(),
          }),
        )
      }
      setLendingRefreshKey((v) => v + 1)
      addToast({
        title: 'Extend confirmed',
        description: `Loan #${loanDetails.loanId.toString()} extended`,
        type: 'success',
        link: buildTxUrl(txHash),
      })
    } catch (err: any) {
      addToast({
        title: 'Extend failed',
        description: err?.shortMessage || err?.message || 'Transaction reverted',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecoverLoan = async () => {
    setIsSubmitting(true)
    try {
      ensureWalletReady()
      if (!loanDetails?.loanId) throw new Error('Load a valid loan first')
      const args = [BigInt(loanDetails.loanId)] as const
      await publicClient!.simulateContract({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'recoverExpired',
        args,
        account: address,
      })
      const txHash = await writeContractAsync({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'recoverExpired',
        args,
      })
      addToast({
        title: 'Recover submitted',
        description: 'Waiting for confirmation...',
        type: 'pending',
        link: buildTxUrl(txHash),
      })
      await publicClient!.waitForTransactionReceipt({ hash: txHash })
      setLoanDetails(null)
      setRecentIndexedLoans((prev) => removeRecentIndexLoan(prev, loanDetails.loanId))
      setLendingRefreshKey((v) => v + 1)
      addToast({
        title: 'Recover confirmed',
        description: `Loan #${loanIdInput} recovered`,
        type: 'success',
        link: buildTxUrl(txHash),
      })
    } catch (err: any) {
      addToast({
        title: 'Recover failed',
        description: err?.shortMessage || err?.message || 'Transaction reverted',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMint = async () => {
    setIsSubmitting(true)
    try {
      ensureWalletReady()
      if (!indexView) throw new Error('Select an index first')
      if (!unitsValid) throw new Error('Units must be whole index units (1.0)')
      if (indexView.paused) throw new Error('Index is paused')

      if (mintMode === 'position') {
        if (!resolvedPositionId) throw new Error('Select a position NFT')
        await publicClient!.simulateContract({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'mintFromPosition',
          args: [BigInt(resolvedPositionId), BigInt(selectedIndexId), parsedUnits],
          account: address,
        })
        const txHash = await writeContractAsync({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'mintFromPosition',
          args: [BigInt(resolvedPositionId), BigInt(selectedIndexId), parsedUnits],
        })
        addToast({
          title: 'Index mint submitted',
          description: 'Waiting for confirmation...',
          type: 'pending',
          link: buildTxUrl(txHash),
        })
        await publicClient!.waitForTransactionReceipt({ hash: txHash })
        await refreshIndexData()
        addToast({
          title: 'Index minted from position',
          description: `Index #${selectedIndexId}`,
          type: 'success',
          link: buildTxUrl(txHash),
        })
      } else {
        const quotedAssets = await quoteMintInputs(parsedUnits)
        if (!quotedAssets.length) {
          throw new Error('Unable to calculate mint inputs from chain state')
        }
        setRequiredAssets(quotedAssets)

        const maxInputAmounts = buildBufferedMaxInputs(quotedAssets, DEFAULT_MINT_MAX_SLIPPAGE_BPS)
        let nativeTotal = BigInt(0)
        for (let i = 0; i < quotedAssets.length; i++) {
          const asset = quotedAssets[i]
          const maxAmount = maxInputAmounts[i]
          if (maxAmount === BigInt(0)) continue
          if (normalizeAddress(asset.asset) === ZERO_ADDRESS) {
            nativeTotal += maxAmount
            continue
          }
          await ensureAllowance(asset.asset, diamondAddress, maxAmount)
        }
        await publicClient!.simulateContract({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'mint',
          args: [BigInt(selectedIndexId), parsedUnits, address, maxInputAmounts],
          value: nativeTotal > BigInt(0) ? nativeTotal : undefined,
          account: address,
        })
        const txHash = await writeContractAsync({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'mint',
          args: [BigInt(selectedIndexId), parsedUnits, address, maxInputAmounts],
          value: nativeTotal > BigInt(0) ? nativeTotal : undefined,
        })
        addToast({
          title: 'Index mint submitted',
          description: 'Waiting for confirmation...',
          type: 'pending',
          link: buildTxUrl(txHash),
        })
        await publicClient!.waitForTransactionReceipt({ hash: txHash })
        await refreshIndexData()
        addToast({
          title: 'Index minted',
          description: `Index #${selectedIndexId}`,
          type: 'success',
          link: buildTxUrl(txHash),
        })
      }
      setUnits('')
    } catch (err) {
      addToast({
        title: 'Mint failed',
        description: (err as any)?.message || 'Transaction reverted',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBurn = async () => {
    setIsSubmitting(true)
    try {
      ensureWalletReady()
      if (!indexView) throw new Error('Select an index first')
      if (!unitsValid) throw new Error('Units must be whole index units (1.0)')
      if (indexView.paused) throw new Error('Index is paused')

      if (mintMode === 'position') {
        if (!resolvedPositionId) throw new Error('Select a position NFT')
        await publicClient!.simulateContract({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'burnFromPosition',
          args: [BigInt(resolvedPositionId), BigInt(selectedIndexId), parsedUnits],
          account: address,
        })
        const txHash = await writeContractAsync({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'burnFromPosition',
          args: [BigInt(resolvedPositionId), BigInt(selectedIndexId), parsedUnits],
        })
        addToast({
          title: 'Index burn submitted',
          description: 'Waiting for confirmation...',
          type: 'pending',
          link: buildTxUrl(txHash),
        })
        await publicClient!.waitForTransactionReceipt({ hash: txHash })
        await refreshIndexData()
        addToast({
          title: 'Index burned from position',
          description: `Index #${selectedIndexId}`,
          type: 'success',
          link: buildTxUrl(txHash),
        })
      } else {
        await publicClient!.simulateContract({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'burn',
          args: [BigInt(selectedIndexId), parsedUnits, address],
          account: address,
        })
        const txHash = await writeContractAsync({
          address: diamondAddress as `0x${string}`,
          abi: equalIndexFacetV3Abi,
          functionName: 'burn',
          args: [BigInt(selectedIndexId), parsedUnits, address],
        })
        addToast({
          title: 'Index burn submitted',
          description: 'Waiting for confirmation...',
          type: 'pending',
          link: buildTxUrl(txHash),
        })
        await publicClient!.waitForTransactionReceipt({ hash: txHash })
        await refreshIndexData()
        addToast({
          title: 'Index burned',
          description: `Index #${selectedIndexId}`,
          type: 'success',
          link: buildTxUrl(txHash),
        })
      }
      setUnits('')
    } catch (err) {
      addToast({
        title: 'Burn failed',
        description: (err as any)?.message || 'Transaction reverted',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateIndex = async () => {
    setIsSubmitting(true)
    try {
      ensureWalletReady()
      if (!createName.trim() || !createSymbol.trim()) {
        throw new Error('Enter an index name and symbol')
      }
      if (!assetRows.length) throw new Error('Add at least one asset')

      const seen = new Set()
      const assets = []
      const bundleAmounts = []
      const mintFeeBps = []
      const burnFeeBps = []

      for (const row of assetRows) {
        const addr = row.assetAddress?.trim()
        if (!addr) throw new Error('Enter an asset address for each row')
        if (!isAddress(addr)) throw new Error(`Invalid token address: ${addr}`)
        const normalized = normalizeAddress(addr)
        if (seen.has(normalized)) {
          throw new Error('Duplicate assets are not allowed')
        }
        seen.add(normalized)

        let decimals =
          row.decimals !== undefined && row.decimals !== '' ? Number(row.decimals) : undefined
        if (decimals === undefined || Number.isNaN(decimals)) {
          decimals = assetMeta.get(normalized)?.decimals
        }
        if (decimals === undefined || decimals === null) {
          try {
            const onchain = await publicClient!.readContract({
              address: addr,
              abi: erc20Abi,
              functionName: 'decimals',
            })
            decimals = typeof onchain === 'bigint' ? Number(onchain) : Number(onchain)
          } catch {
            throw new Error(`Provide decimals for ${addr}`)
          }
        }

        if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
          throw new Error('Decimals must be between 0 and 36')
        }

        let parsedBundle
        try {
          parsedBundle = parseUnits(row.bundleAmount || '0', decimals)
        } catch {
          throw new Error(`Invalid bundle amount for ${addr}`)
        }
        if (parsedBundle <= BigInt(0)) throw new Error('Bundle amounts must be greater than zero')
        const mintFee = Number(row.mintFeeBps)
        const burnFee = Number(row.burnFeeBps)
        if (!Number.isFinite(mintFee) || mintFee < 0 || mintFee > 1000) {
          throw new Error('Mint fee must be between 0 and 1000 bps')
        }
        if (!Number.isFinite(burnFee) || burnFee < 0 || burnFee > 1000) {
          throw new Error('Burn fee must be between 0 and 1000 bps')
        }

        assets.push(addr)
        bundleAmounts.push(parsedBundle)
        mintFeeBps.push(mintFee)
        burnFeeBps.push(burnFee)
      }

      const flashFeeBps = Number(createFlashFeeBps)
      if (!Number.isFinite(flashFeeBps) || flashFeeBps < 0 || flashFeeBps > 1000) {
        throw new Error('Flash fee must be between 0 and 1000 bps')
      }

      const creationFeeWei = createFeeEth ? parseUnits(createFeeEth, 18) : BigInt(0)

      const txHash = await writeContractAsync({
        address: diamondAddress as `0x${string}`,
        abi: equalIndexFacetV3Abi,
        functionName: 'createIndex',
        args: [
          {
            name: createName.trim(),
            symbol: createSymbol.trim(),
            assets,
            bundleAmounts,
            mintFeeBps,
            burnFeeBps,
            flashFeeBps,
          },
        ],
        value: creationFeeWei,
      })

      addToast({
        title: 'Index creation submitted',
        description: 'Waiting for confirmation...',
        type: 'pending',
        link: buildTxUrl(txHash),
      })

      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash })
      let createdIndexId = null
      let createdToken = null

      for (const log of receipt.logs) {
        if (!log?.topics?.length) continue
        if (diamondAddressLower && log.address?.toLowerCase() !== diamondAddressLower) continue
        try {
          const decoded = decodeEventLog({
            abi: equalIndexFacetV3Abi,
            data: log.data,
            topics: log.topics,
          })
          if (decoded.eventName === 'IndexCreated') {
            createdIndexId = Number((decoded.args as any)?.indexId)
            createdToken = (decoded.args as any)?.token
            break
          }
        } catch {
          // ignore non-matching log
        }
      }

      addToast({
        title: 'Index created',
        description:
          createdIndexId !== null ? `Index #${createdIndexId}` : 'Creation confirmed on-chain',
        type: 'success',
        link: buildTxUrl(txHash),
      })

      if (createdIndexId !== null) {
        setCreatedIndexes((prev: any) => [
          ...prev,
          {
            indexId: createdIndexId,
            label: `${createName.trim()} (${createSymbol.trim()})`,
            tokenAddress: createdToken || '',
          },
        ])
        setSelectedIndexId(createdIndexId)
      }

      setCreateName('')
      setCreateSymbol('')
      setCreateFlashFeeBps('0')
      setCreateFeeEth('')
      setAssetRows([newAssetRow()])
    } catch (err) {
      addToast({
        title: 'Index creation failed',
        description: (err as any)?.message || 'Transaction reverted',
        type: 'error',
      })
      setIsCreateOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateAssetRow = (rowId: any, patch: any) => {
    setAssetRows((rows: any) =>
      rows.map((row: any) => {
        if (row.id !== rowId) return row
        const next = { ...row, ...patch }
        if (Object.prototype.hasOwnProperty.call(patch, 'assetAddress')) {
          const normalized = normalizeAddress(patch.assetAddress)
          const meta = assetMeta.get(normalized)
          if (meta?.decimals !== undefined && meta?.decimals !== null) {
            next.decimals = String(meta.decimals)
          } else if (assetMeta.has(normalizeAddress(row.assetAddress))) {
            next.decimals = ''
          }
        }
        return next
      }),
    )
  }

  const handleAddAssetRow = () => {
    setAssetRows((rows: any) => [...rows, newAssetRow()])
  }

  const handleRemoveAssetRow = (rowId: any) => {
    setAssetRows((rows: any) => rows.filter((row: any) => row.id !== rowId))
  }

  const handleLoadIndexId = () => {
    if (!manualIndexId) return
    const numericId = Number(manualIndexId)
    if (Number.isNaN(numericId) || numericId < 0) {
      addToast({
        title: 'Invalid index ID',
        description: 'Enter a valid numeric index ID',
        type: 'error',
      })
      return
    }
    setSelectedIndexId(numericId)
  }

  return (
    <AppShell title="Index">
      <div className="w-full space-y-8 px-6 py-8 pointer-events-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral3">EqualIndex</p>
            <h1 className="text-3xl font-bold text-neutral1">Index Forge</h1>
            <p className="text-neutral2">
              Compose new index bundles, mint units from wallets or positions, and track live index health.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="min-h-[44px] rounded-full bg-accent1 px-5 py-2 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-0.5 hover:bg-accent1Hovered"
          >
            Create+
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-surface2 bg-surface1 p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral3">Index Directory</p>
                  <h2 className="text-lg font-semibold text-neutral1">EqualIndex Overview</h2>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    value={manualIndexId}
                    onChange={(e: any) => setManualIndexId(e.target.value)}
                    placeholder="Index ID"
                    className="h-10 w-28 rounded-full border border-surface3 bg-surface2 px-3 text-sm text-neutral1 outline-none focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                  />
                  <button
                    type="button"
                    onClick={handleLoadIndexId}
                    className="h-10 rounded-full border border-surface3 px-4 text-xs font-semibold text-neutral1 transition hover:border-accent1 hover:text-accent1"
                  >
                    Load
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <label className="text-sm font-medium text-neutral2" htmlFor="index-select">
                  Select Index
                </label>
                <select
                  id="index-select"
                  value={selectedIndexId}
                  onChange={(e: any) => setSelectedIndexId(Number(e.target.value))}
                  className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                >
                  {indexOptions.length ? (
                    indexOptions.map((option: any) => (
                      <option key={option.indexId} value={option.indexId}>
                        {option.label} (#{option.indexId})
                      </option>
                    ))
                  ) : (
                    <option value="">No indexes configured</option>
                  )}
                </select>
              </div>

              {indexError ? (
                <div className="mt-4 rounded-2xl border border-statusCritical/30 bg-statusCritical2/20 px-4 py-3 text-xs text-statusCritical">
                  {indexError}
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-surface2 bg-surface2/40 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-neutral3">Token</div>
                  <div className="mt-2 text-sm font-semibold text-neutral1">
                    {indexLoading ? 'Loading…' : indexView?.token ? `${indexView.token.slice(0, 6)}...${indexView.token.slice(-4)}` : '--'}
                  </div>
                  <div className="mt-2 text-xs text-neutral3">
                    Total Units:{' '}
                    {indexLoading ? '—' : indexView ? formatUnits(indexView.totalUnits || BigInt(0), 18) : '--'}
                  </div>
                  {isConnected ? (
                    <div className="mt-2 text-xs text-neutral3">
                      Your Balance:{' '}
                      <span className="font-semibold text-accent1">
                        {balanceLoading ? 'Loading…' : userIndexBalance !== null ? formatUnits(userIndexBalance, 18) : '--'}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-neutral3">Connect wallet to see your balance.</div>
                  )}
                </div>
                <div className="rounded-2xl border border-surface2 bg-surface2/40 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-neutral3">Status</div>
                  <div className="mt-2 text-sm font-semibold text-neutral1">
                    {indexLoading ? 'Loading…' : indexView ? (indexView.paused ? 'Paused' : 'Active') : '--'}
                  </div>
                  <div className="mt-2 text-xs text-neutral3">
                    Flash Fee: {indexLoading ? '—' : indexView ? `${indexView.flashFeeBps} bps` : '--'}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-surface2 bg-surface2/40 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-neutral3">Bundle Blueprint</div>
                {indexSummary && indexSummary.length ? (
                  <div className="mt-4 space-y-3 text-sm">
                    {indexSummary.map((asset: any) => (
                      <div
                        key={`${asset.address}-${asset.ticker}`}
                        className="flex flex-wrap items-center justify-between border-b border-surface2/60 pb-2 last:border-none last:pb-0"
                      >
                        <div className="font-semibold text-neutral1">{asset.ticker}</div>
                        <div className="text-xs text-neutral2">
                          Bundle: {asset.bundle} | Mint {asset.mintFee} bps | Burn {asset.burnFee} bps
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-neutral3">Select an index to view its bundle.</p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-surface2 bg-surface1 p-6 shadow-card">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral3">Index Builder</p>
              <div className="mt-4 space-y-3 text-sm text-neutral2">
                <p>Use the Create+ button to open the EqualIndex builder modal.</p>
                <p>Define bundle assets, per-asset fees, and the flash loan fee.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="mt-6 min-h-[44px] rounded-full border border-accent1 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent1 transition hover:bg-accent1/10"
              >
                Launch Builder
              </button>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-surface2 bg-surface1 p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral3">Mint and Burn</p>
                  <h2 className="text-lg font-semibold text-neutral1">Index Operations</h2>
                </div>
                <div className="flex h-10 items-center rounded-full border border-surface3 bg-surface2 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setMintMode('wallet')}
                    className={`rounded-full px-4 py-1.5 transition ${
                      mintMode === 'wallet'
                        ? 'bg-accent1 text-ink shadow-card'
                        : 'text-neutral2 hover:text-neutral1'
                    }`}
                  >
                    Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setMintMode('position')}
                    className={`rounded-full px-4 py-1.5 transition ${
                      mintMode === 'position'
                        ? 'bg-accent1 text-ink shadow-card'
                        : 'text-neutral2 hover:text-neutral1'
                    }`}
                  >
                    Position
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral2" htmlFor="index-units">
                    Units
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="index-units"
                      type="number"
                      min="0"
                      step="1"
                      value={units}
                      onChange={(e: any) => setUnits(e.target.value)}
                      className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                      placeholder="1"
                    />
                    <div className="flex flex-col gap-1">
                      {[1, 5, 10].map((quick: any) => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => setUnits(String(quick))}
                          className="h-8 w-12 rounded-full border border-surface3 text-xs font-semibold text-neutral2 transition hover:border-accent1 hover:text-accent1"
                        >
                          {quick}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-neutral3">Units are whole index tokens (1.0 = 1e18).</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral2" htmlFor="position-select">
                    Position NFT
                  </label>
                  <select
                    id="position-select"
                    value={resolvedPositionId}
                    onChange={(e: any) => setPositionId(e.target.value)}
                    disabled={mintMode !== 'position'}
                    className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {positionOptions.length ? (
                      positionOptions.map((option: any) => (
                        <option key={option.tokenId} value={option.tokenId}>
                          {option.label}
                        </option>
                      ))
                    ) : (
                      <option value="">No positions found</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-surface2 bg-surface2/40 p-4 text-sm text-neutral2">
                {requiredAssetsLoading ? (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <p className="mb-1 text-base font-medium text-neutral1">Mint Requirements</p>
                    <p>Refreshing on-chain quote…</p>
                  </div>
                ) : requiredAssets.length ? (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-neutral1">Mint Requirements</div>
                    {requiredAssets.map((asset: any) => (
                      <div
                        key={asset.asset}
                        className="flex flex-col border-b border-surface2/60 pb-2 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{asset.ticker}</span>
                          <span className="font-mono font-bold text-neutral1">
                            {formatUnits(asset.total, asset.decimals)} {asset.ticker}
                          </span>
                        </div>
                        <div className="mt-1 flex justify-end gap-3 text-xs text-neutral2">
                          <span>Base: {formatUnits(asset.base, asset.decimals)}</span>
                          <span>Fee Pot Buy-in: {formatUnits(asset.potBuyIn || BigInt(0), asset.decimals)}</span>
                          <span>Fee: {formatUnits(asset.fee, asset.decimals)}</span>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-neutral3">
                      Max input uses a {(Number(DEFAULT_MINT_MAX_SLIPPAGE_BPS) / 100).toFixed(2)}% safety buffer.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <p className="mb-1 text-base font-medium text-neutral1">Mint Requirements</p>
                    <p>Enter units to preview bundle inputs.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <button
                  type="button"
                  onClick={handleMint}
                  disabled={isSubmitting || !unitsValid || !indexView || indexView?.paused || !isConnected}
                  className="min-h-[44px] rounded-full bg-accent1 px-6 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-1 hover:shadow-xl hover:bg-accent1Hovered disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {mintMode === 'position' ? 'Mint from Position' : 'Mint'}
                </button>
                <button
                  type="button"
                  onClick={handleBurn}
                  disabled={isSubmitting || !unitsValid || !indexView || indexView?.paused || !isConnected}
                  className="min-h-[44px] rounded-full border border-surface3 px-6 py-2.5 text-sm font-semibold text-neutral1 transition hover:-translate-y-0.5 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {mintMode === 'position' ? 'Burn from Position' : 'Burn'}
                </button>
              </div>
              {mintDisabledReason ? (
                <p className="mt-3 text-center text-xs text-neutral3">{mintDisabledReason}</p>
              ) : null}
            </section>

            <section className="rounded-3xl border border-surface2 bg-surface1 p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral3">Index Lending</p>
                  <h2 className="text-lg font-semibold text-neutral1">Borrow Against Index Pool Collateral</h2>
                </div>
                <div className="text-xs text-neutral3">
                  {lendingConfigLoading ? (
                    <span>Loading config…</span>
                  ) : lendingConfigured ? (
                    <div className="text-right">
                      <div>LTV {String(lendingConfig?.ltvBps ?? 0)} bps | Origination {String(lendingConfig?.originationFeeBps ?? 0)} bps</div>
                      <div>
                        Duration {formatUnits(toBigInt(lendingConfig?.minDuration ?? 0), 0)}s - {formatUnits(toBigInt(lendingConfig?.maxDuration ?? 0), 0)}s
                      </div>
                    </div>
                  ) : (
                    <span>Not configured</span>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral2" htmlFor="lending-position-select">
                    Position NFT
                  </label>
                  <select
                    id="lending-position-select"
                    value={resolvedLendingPositionId}
                    onChange={(e: any) => setLendingPositionId(e.target.value)}
                    className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                  >
                    {positionOptions.length ? (
                      positionOptions.map((option: any) => (
                        <option key={option.tokenId} value={option.tokenId}>
                          {option.label}
                        </option>
                      ))
                    ) : (
                      <option value="">No positions found</option>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral2" htmlFor="lending-asset-select">
                    Borrow Asset
                  </label>
                  <select
                    id="lending-asset-select"
                    value={lendingAsset}
                    onChange={(e: any) => setLendingAsset(e.target.value)}
                    className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                  >
                    {(indexView?.assets || []).map((asset: any) => {
                      const meta = assetMeta.get(normalizeAddress(asset))
                      return (
                        <option key={asset} value={asset}>
                          {meta?.ticker || asset}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral2" htmlFor="collateral-units">
                    Collateral Units
                  </label>
                  <input
                    id="collateral-units"
                    type="number"
                    min="0"
                    step="1"
                    value={collateralUnitsInput}
                    onChange={(e: any) => setCollateralUnitsInput(e.target.value)}
                    className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral2" htmlFor="borrow-amount">
                    Borrow Amount
                  </label>
                  <input
                    id="borrow-amount"
                    type="number"
                    min="0"
                    step="any"
                    value={borrowAmountInput}
                    onChange={(e: any) => setBorrowAmountInput(e.target.value)}
                    className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral2" htmlFor="borrow-duration-days">
                    Duration (days)
                  </label>
                  <input
                    id="borrow-duration-days"
                    type="number"
                    min="1"
                    step="1"
                    value={durationDaysInput}
                    onChange={(e: any) => setDurationDaysInput(e.target.value)}
                    className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-surface2 bg-surface2/40 p-4 text-xs text-neutral2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <p>
                    Max Borrowable:{' '}
                    <span className="font-semibold text-neutral1">
                      {maxBorrowableLoading ? 'Loading…' : formatUnits(maxBorrowableRaw, lendingAssetDecimals)}{' '}
                      {assetMeta.get(normalizeAddress(lendingAsset))?.ticker || 'UNK'}
                    </span>
                  </p>
                  <p>
                    Borrow Fee:{' '}
                    <span className="font-semibold text-neutral1">
                      {formatUnits(borrowFeePreview, lendingAssetDecimals)}{' '}
                      {assetMeta.get(normalizeAddress(lendingAsset))?.ticker || 'UNK'}
                    </span>
                  </p>
                  <p>
                    Net Received:{' '}
                    <span className="font-semibold text-neutral1">
                      {formatUnits(borrowNetPreview, lendingAssetDecimals)}{' '}
                      {assetMeta.get(normalizeAddress(lendingAsset))?.ticker || 'UNK'}
                    </span>
                  </p>
                  <p>
                    Position Available in Index Pool:{' '}
                    <span className="font-semibold text-neutral1">
                      {indexPoolSnapshot
                        ? `${formatUnits(indexPoolSnapshot.availableRaw, 18)} units`
                        : '—'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <button
                  type="button"
                  onClick={handleBorrowFromPosition}
                  disabled={isSubmitting || !!lendingDisabledReason}
                  className="min-h-[44px] rounded-full bg-accent1 px-6 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-1 hover:shadow-xl hover:bg-accent1Hovered disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Borrow from Position
                </button>
              </div>
              {lendingDisabledReason ? (
                <p className="mt-3 text-center text-xs text-neutral3">{lendingDisabledReason}</p>
              ) : null}

              <div className="mt-8 rounded-2xl border border-surface2 bg-surface2/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral1">Active Indexed Loans</p>
                  <div className="text-right text-xs text-neutral3">
                    <p>
                      {lendingPositionKey
                        ? `Position key: ${lendingPositionKey.slice(0, 10)}…${lendingPositionKey.slice(-6)}`
                        : 'Position key unavailable'}
                    </p>
                    <p>{indexedLoanStatusText}</p>
                  </div>
                </div>
                {indexedLoansLoading ? (
                  <p className="mt-3 text-xs text-neutral3">Loading indexed loans…</p>
                ) : activeIndexedLoans.length ? (
                  <div className="mt-3 space-y-2">
                    {activeIndexedLoans.map((loan: any) => {
                      const meta = assetMeta.get(normalizeAddress(loan.borrowAsset))
                      const decimals = meta?.decimals ?? 18
                      const ticker = meta?.ticker || 'UNK'
                      return (
                        <button
                          key={loan.loanId.toString()}
                          type="button"
                          onClick={() => handleSelectIndexedLoan(loan.loanId)}
                          className="w-full rounded-xl border border-surface3 bg-surface2 px-3 py-2 text-left text-xs text-neutral2 transition hover:border-accent1 hover:text-neutral1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-neutral1">Loan #{loan.loanId.toString()}</span>
                            <span>{new Date(Number(loan.maturity) * 1000).toLocaleString()}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-3">
                            <span>
                              Principal: {formatUnits(loan.principal, decimals)} {ticker}
                            </span>
                            <span>Collateral: {formatUnits(loan.collateralUnits, 18)} units</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-neutral3">No active indexed loans for this position/index yet.</p>
                )}
              </div>

              <div className="mt-8 rounded-2xl border border-surface2 bg-surface2/40 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[180px] space-y-2">
                    <label className="text-sm font-medium text-neutral2" htmlFor="loan-id-input">
                      Loan ID
                    </label>
                    <input
                      id="loan-id-input"
                      type="number"
                      min="0"
                      value={loanIdInput}
                      onChange={(e: any) => setLoanIdInput(e.target.value)}
                      className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                      placeholder="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadLoan}
                    disabled={loanLoading || !loanIdInput}
                    className="h-11 rounded-full border border-surface3 px-5 text-xs font-semibold text-neutral1 transition hover:border-accent1 hover:text-accent1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loanLoading ? 'Loading…' : 'Load Loan'}
                  </button>
                </div>

                {loanDetails ? (
                  <div className="mt-4 space-y-3 text-xs text-neutral2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p>
                        Principal:{' '}
                        <span className="font-semibold text-neutral1">
                          {formatUnits(loanDetails.principal, loanAssetDecimals)} {loanAssetTicker}
                        </span>
                      </p>
                      <p>
                        Collateral:{' '}
                        <span className="font-semibold text-neutral1">
                          {formatUnits(loanDetails.collateralUnits, 18)} units
                        </span>
                      </p>
                      <p>
                        Maturity:{' '}
                        <span className="font-semibold text-neutral1">
                          {new Date(Number(loanDetails.maturity) * 1000).toLocaleString()}
                        </span>
                      </p>
                      <p>
                        Extend Fee:{' '}
                        <span className="font-semibold text-neutral1">
                          {formatUnits(extendFeePreview, loanAssetDecimals)} {loanAssetTicker}
                        </span>
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral2" htmlFor="extend-days-input">
                          Extend Days
                        </label>
                        <input
                          id="extend-days-input"
                          type="number"
                          min="1"
                          step="1"
                          value={extendDaysInput}
                          onChange={(e: any) => setExtendDaysInput(e.target.value)}
                          className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                          placeholder="30"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRepayLoan}
                        disabled={isSubmitting}
                        className="h-11 rounded-full bg-accent1 px-5 text-xs font-semibold text-ink shadow-card transition hover:bg-accent1Hovered disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Repay
                      </button>
                      <button
                        type="button"
                        onClick={handleExtendLoan}
                        disabled={isSubmitting || parsedExtendSeconds <= 0n}
                        className="h-11 rounded-full border border-surface3 px-5 text-xs font-semibold text-neutral1 transition hover:border-accent1 hover:text-accent1 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Extend
                      </button>
                      <button
                        type="button"
                        onClick={handleRecoverLoan}
                        disabled={isSubmitting}
                        className="h-11 rounded-full border border-statusCritical/50 px-5 text-xs font-semibold text-statusCritical transition hover:bg-statusCritical2/30 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Recover Expired
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-neutral3">Load a loan ID to repay, extend, or recover.</p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-surface2 bg-surface1 p-6 shadow-card">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral3">Index Notes</p>
              <div className="mt-4 space-y-2 text-sm text-neutral2">
                <p>Each index unit represents the bundle amounts defined in the blueprint above.</p>
                <p>Mint fees are collected per asset, while burn fees are deducted from redemptions.</p>
                <p>Flash fee bps are applied to proportional bundle borrows.</p>
                <p>Index lending borrows against index-pool principal and can be repaid, extended, or recovered after expiry.</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <CreateIndexModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        name={createName}
        symbol={createSymbol}
        flashFeeBps={createFlashFeeBps}
        creationFeeEth={createFeeEth}
        assetRows={assetRows}
        assetMeta={assetMeta}
        onNameChange={setCreateName}
        onSymbolChange={setCreateSymbol}
        onFlashFeeChange={setCreateFlashFeeBps}
        onCreationFeeChange={setCreateFeeEth}
        onAddAssetRow={handleAddAssetRow}
        onRemoveAssetRow={handleRemoveAssetRow}
        onUpdateAssetRow={updateAssetRow}
        onConfirm={handleCreateIndex}
        loading={isSubmitting}
      />
    </AppShell>
  )
}
