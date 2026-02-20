"use client";

import { useEffect, useMemo, useState } from 'react'
import { decodeEventLog, erc20Abi, formatUnits, isAddress, maxUint256, parseUnits } from 'viem'
import { useAccount, useWriteContract } from 'wagmi'
import { AppShell } from '../../app-shell'
import useActivePublicClient from '@/lib/hooks/useActivePublicClient'
import usePoolsConfig from '@/lib/hooks/usePoolsConfig'
import useExplorerUrl from '@/lib/hooks/useExplorerUrl'
import usePositionNFTs from '@/lib/hooks/usePositionNFTs'
import { equalIndexFacetV3Abi } from '@/lib/abis/equalIndex'
import { useToasts } from '@/components/common/ToastProvider'
import CreateIndexModal from '@/components/index/CreateIndexModal'
import { ZERO_ADDRESS } from '@/lib/address'

const INDEX_SCALE = 10n ** 18n

const normalizeAddress = (value) => (value ? value.toLowerCase() : '')

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
  const { writeContractAsync } = useWriteContract()
  const { nfts } = usePositionNFTs()
  const poolsConfig = usePoolsConfig()
  const { buildTxUrl } = useExplorerUrl()

  const diamondAddress =
    (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || poolsConfig.pools?.[0]?.lendingPoolAddress || '').trim()
  const diamondAddressLower = diamondAddress.toLowerCase()

  const assetOptions = useMemo(() => {
    return (poolsConfig.pools || [])
      .map((pool) => ({
        id: pool.id,
        address: pool.tokenAddress,
        ticker: pool.ticker || pool.id,
        decimals: pool.decimals ?? 18,
        label: `${pool.ticker || pool.id} (${pool.id})`,
      }))
      .filter((asset) => asset.address)
  }, [poolsConfig])

  const assetMeta = useMemo(() => {
    const map = new Map()
    assetOptions.forEach((option) => {
      map.set(normalizeAddress(option.address), option)
    })
    return map
  }, [assetOptions])

  const configIndexOptions = useMemo(
    () =>
      (poolsConfig.indexTokens || []).map((token, idx) => ({
        indexId: idx,
        label: token.id || token.indexTicker || `Index ${idx}`,
        tokenAddress: token.indexTokenAddress || '',
      })),
    [poolsConfig],
  )

  const [createdIndexes, setCreatedIndexes] = useState([])
  const indexOptions = useMemo(() => {
    const seen = new Set()
    const combined = []
    const add = (option) => {
      if (seen.has(option.indexId)) return
      seen.add(option.indexId)
      combined.push(option)
    }
    configIndexOptions.forEach(add)
    createdIndexes.forEach(add)
    return combined
  }, [configIndexOptions, createdIndexes])

  const [selectedIndexId, setSelectedIndexId] = useState(indexOptions[0]?.indexId ?? 0)
  const [manualIndexId, setManualIndexId] = useState('')
  const [indexView, setIndexView] = useState(null)
  const [indexError, setIndexError] = useState('')
  const [indexLoading, setIndexLoading] = useState(false)
  const [userIndexBalance, setUserIndexBalance] = useState(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  const [mintMode, setMintMode] = useState('wallet')
  const [units, setUnits] = useState('')
  const [positionId, setPositionId] = useState('')

  const [createName, setCreateName] = useState('')
  const [createSymbol, setCreateSymbol] = useState('')
  const [createFlashFeeBps, setCreateFlashFeeBps] = useState('0')
  const [createFeeEth, setCreateFeeEth] = useState('')
  const [assetRows, setAssetRows] = useState(() => [newAssetRow()])
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

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
        const view = await publicClient.readContract({
          address: diamondAddress,
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
        const balance = await publicClient.readContract({
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
    ;(nfts || []).forEach((nft) => {
      if (!nft?.tokenId) return
      if (!seen.has(nft.tokenId)) {
        seen.set(nft.tokenId, nft)
      }
    })
    return Array.from(seen.values()).map((nft) => ({
      tokenId: nft.tokenId,
      label: `#${nft.tokenId}`,
    }))
  }, [nfts])

  const resolvedPositionId = positionId || positionOptions[0]?.tokenId || ''

  const parsedUnits = useMemo(() => {
    if (!units) return 0n
    try {
      return parseUnits(units, 18)
    } catch {
      return 0n
    }
  }, [units])

  const unitsValid = parsedUnits > 0n && parsedUnits % INDEX_SCALE === 0n

  const mintDisabledReason = useMemo(() => {
    if (!isConnected) return 'Connect wallet to mint or burn.'
    if (!indexView) return 'Select an index to continue.'
    if (indexView?.paused) return 'Index is paused.'
    if (!unitsValid) return 'Units must be whole index units (1.0).'
    if (mintMode === 'position' && !resolvedPositionId) return 'Select a Position NFT.'
    return ''
  }, [isConnected, indexView, unitsValid, mintMode, resolvedPositionId])

  const requiredAssets = useMemo(() => {
    if (!indexView || parsedUnits <= 0n) return []
    const assets = indexView.assets || []
    const bundles = indexView.bundleAmounts || []
    const fees = indexView.mintFeeBps || []
    return assets.map((asset, idx) => {
      const meta = assetMeta.get(normalizeAddress(asset))
      const decimals = meta?.decimals ?? 18
      const base = (bundles[idx] * parsedUnits) / INDEX_SCALE
      const fee = (base * BigInt(fees[idx] ?? 0)) / 10_000n
      return {
        asset,
        ticker: meta?.ticker || 'UNK',
        decimals,
        base,
        fee,
        total: base + fee,
      }
    })
  }, [indexView, parsedUnits, assetMeta])

  const indexSummary = useMemo(() => {
    if (!indexView) return null
    const assets = indexView.assets || []
    return assets.map((asset, idx) => {
      const meta = assetMeta.get(normalizeAddress(asset))
      const decimals = meta?.decimals ?? 18
      const bundle = indexView.bundleAmounts?.[idx] ?? 0n
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

  const ensureAllowance = async (tokenAddress, spender, amount) => {
    if (normalizeAddress(tokenAddress) === ZERO_ADDRESS) return
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address, spender],
    })
    if (allowance < amount) {
      const approveTx = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, maxUint256],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })
    }
  }

  const refreshIndexData = async () => {
    if (!publicClient || selectedIndexId === null || selectedIndexId === undefined) return
    try {
      const view = await publicClient.readContract({
        address: diamondAddress,
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
        const balance = await publicClient.readContract({
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

  const handleMint = async () => {
    setIsSubmitting(true)
    try {
      ensureWalletReady()
      if (!indexView) throw new Error('Select an index first')
      if (!unitsValid) throw new Error('Units must be whole index units (1.0)')
      if (indexView.paused) throw new Error('Index is paused')

      if (mintMode === 'position') {
        if (!resolvedPositionId) throw new Error('Select a position NFT')
        const txHash = await writeContractAsync({
          address: diamondAddress,
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
        await publicClient.waitForTransactionReceipt({ hash: txHash })
        await refreshIndexData()
        addToast({
          title: 'Index minted from position',
          description: `Index #${selectedIndexId}`,
          type: 'success',
          link: buildTxUrl(txHash),
        })
      } else {
        let nativeTotal = 0n
        for (const asset of requiredAssets) {
          if (asset.total === 0n) continue
          if (normalizeAddress(asset.asset) === ZERO_ADDRESS) {
            nativeTotal += asset.total
            continue
          }
          await ensureAllowance(asset.asset, diamondAddress, asset.total)
        }
        const maxInputAmounts = requiredAssets.map((asset) => asset.total)
        const txHash = await writeContractAsync({
          address: diamondAddress,
          abi: equalIndexFacetV3Abi,
          functionName: 'mint',
          args: [BigInt(selectedIndexId), parsedUnits, address, maxInputAmounts],
          value: nativeTotal > 0n ? nativeTotal : undefined,
        })
        addToast({
          title: 'Index mint submitted',
          description: 'Waiting for confirmation...',
          type: 'pending',
          link: buildTxUrl(txHash),
        })
        await publicClient.waitForTransactionReceipt({ hash: txHash })
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
        description: err?.message || 'Transaction reverted',
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
        const txHash = await writeContractAsync({
          address: diamondAddress,
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
        await publicClient.waitForTransactionReceipt({ hash: txHash })
        await refreshIndexData()
        addToast({
          title: 'Index burned from position',
          description: `Index #${selectedIndexId}`,
          type: 'success',
          link: buildTxUrl(txHash),
        })
      } else {
        const txHash = await writeContractAsync({
          address: diamondAddress,
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
        await publicClient.waitForTransactionReceipt({ hash: txHash })
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
        description: err?.message || 'Transaction reverted',
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
            const onchain = await publicClient.readContract({
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
        if (parsedBundle <= 0n) throw new Error('Bundle amounts must be greater than zero')
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

      const creationFeeWei = createFeeEth ? parseUnits(createFeeEth, 18) : 0n

      const txHash = await writeContractAsync({
        address: diamondAddress,
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

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
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
            createdIndexId = Number(decoded.args.indexId)
            createdToken = decoded.args.token
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
        setCreatedIndexes((prev) => [
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
        description: err?.message || 'Transaction reverted',
        type: 'error',
      })
      setIsCreateOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateAssetRow = (rowId, patch) => {
    setAssetRows((rows) =>
      rows.map((row) => {
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
    setAssetRows((rows) => [...rows, newAssetRow()])
  }

  const handleRemoveAssetRow = (rowId) => {
    setAssetRows((rows) => rows.filter((row) => row.id !== rowId))
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
                    onChange={(e) => setManualIndexId(e.target.value)}
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
                  onChange={(e) => setSelectedIndexId(Number(e.target.value))}
                  className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                >
                  {indexOptions.length ? (
                    indexOptions.map((option) => (
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
                    {indexLoading ? '—' : indexView ? formatUnits(indexView.totalUnits || 0n, 18) : '--'}
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
                    {indexSummary.map((asset) => (
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
                      onChange={(e) => setUnits(e.target.value)}
                      className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                      placeholder="1"
                    />
                    <div className="flex flex-col gap-1">
                      {[1, 5, 10].map((quick) => (
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
                    onChange={(e) => setPositionId(e.target.value)}
                    disabled={mintMode !== 'position'}
                    className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {positionOptions.length ? (
                      positionOptions.map((option) => (
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
                {requiredAssets.length ? (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-neutral1">Mint Requirements</div>
                    {requiredAssets.map((asset) => (
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
                          <span>Fee: {formatUnits(asset.fee, asset.decimals)}</span>
                        </div>
                      </div>
                    ))}
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
              <p className="text-xs uppercase tracking-[0.2em] text-neutral3">Index Notes</p>
              <div className="mt-4 space-y-2 text-sm text-neutral2">
                <p>Each index unit represents the bundle amounts defined in the blueprint above.</p>
                <p>Mint fees are collected per asset, while burn fees are deducted from redemptions.</p>
                <p>Flash fee bps are applied to proportional bundle borrows.</p>
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
