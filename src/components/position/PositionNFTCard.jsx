"use client";

import { useEffect, useMemo, useState } from 'react'
import { formatUnits } from 'viem'

export function PositionNFTCard({
  nfts,
  loading,
  error,
  onSelectPosition,
  selectedPositionId,
  onMintNFT,
  poolOptions = [],
  poolMeta = {},
  onDeposit,
  onWithdraw,
  onBorrow,
  onRepay,
  showBorrowRepay = true,
  onCompound,
  onLeavePool,
  onCopy,
  onDepositClick,
  onWithdrawClick,
  publicClient,
}) {
  const [view, setView] = useState('list') // 'list' | 'positions' | 'detail'
  const [showMintModal, setShowMintModal] = useState(false)
  const [selectedPool, setSelectedPool] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [selectedTokenId, setSelectedTokenId] = useState(null)
  const [copyToast, setCopyToast] = useState(null)

  useEffect(() => {
    if (!copyToast) return
    const t = setTimeout(() => setCopyToast(null), 1200)
    return () => clearTimeout(t)
  }, [copyToast])

  const selectedNFT = nfts?.find((nft) => nft.positionKey === selectedPositionId)

  // Keep token selection in sync with position selection
  useEffect(() => {
    if (selectedPositionId) {
      const pos = nfts?.find((n) => n.positionKey === selectedPositionId)
      if (pos) {
        setSelectedTokenId(pos.tokenId)
        setView('detail')
      }
    } else if (selectedTokenId) {
      // If position cleared, stay on positions table for current token
      setView('positions')
    } else {
      setView('list')
    }
  }, [selectedPositionId, nfts, selectedTokenId])

  const isActivePosition = (nft) => {
    const membership = nft.membership
    if (membership) {
      return Boolean(membership.isMember || membership.hasBalance || membership.hasActiveLoans)
    }
    return (
      (nft.principalRaw ?? 0n) > 0n ||
      (nft.totalDebtRaw ?? 0n) > 0n ||
      (nft.rollingCreditRaw ?? 0n) > 0n ||
      (nft.accruedYieldRaw ?? 0n) > 0n
    )
  }

  const positionsByToken = useMemo(() => {
    const grouped = {}
    ;(nfts ?? []).forEach((nft) => {
      if (!grouped[nft.tokenId]) {
        grouped[nft.tokenId] = {
          tokenId: nft.tokenId,
          positions: [],
          activeCount: 0,
          principal: 0n,
          liabilities: 0n,
          ticker: nft.ticker,
          decimals: nft.decimals ?? 18,
        }
      }
      grouped[nft.tokenId].positions.push(nft)
      if (isActivePosition(nft)) grouped[nft.tokenId].activeCount += 1
      grouped[nft.tokenId].principal += nft.principalRaw ?? 0n
      grouped[nft.tokenId].liabilities += nft.totalDebtRaw ?? 0n
    })
    return Object.values(grouped).sort((a, b) => Number(a.tokenId) - Number(b.tokenId))
  }, [nfts])

  const positionsForSelectedToken = useMemo(() => {
    if (!selectedTokenId) return []
    return nfts?.filter((nft) => nft.tokenId === selectedTokenId && isActivePosition(nft)) ?? []
  }, [nfts, selectedTokenId])

  const formatValue = (valueBigInt, decimals = 18) => {
    if (valueBigInt === undefined || valueBigInt === null) return '—'
    try {
      const asNumber = Number(formatUnits(valueBigInt, decimals))
      const maxFraction = decimals > 6 ? 6 : decimals
      return asNumber.toLocaleString(undefined, { maximumFractionDigits: maxFraction, minimumFractionDigits: 0 })
    } catch {
      return '—'
    }
  }

  const truncateKey = (key) => {
    if (!key) return '—'
    const str = key.toString()
    if (str.length <= 10) return str
    return `${str.slice(0, 6)}...${str.slice(-4)}`
  }

  const handleCopyKey = (key) => {
    if (!key) return
    navigator.clipboard.writeText(key)
    setCopyToast('Copied!')
    onCopy?.(key)
  }

  const handleSelectToken = (tokenId) => {
    setSelectedTokenId(tokenId)
    onSelectPosition?.(null)
    setView('positions')
  }

  const handleSelectPosition = (positionKey) => {
    const pos = nfts?.find((n) => n.positionKey === positionKey)
    if (pos) {
      setSelectedTokenId(pos.tokenId)
    }
    onSelectPosition?.(positionKey)
    setView('detail')
  }

  const handleBackToList = () => {
    setView('list')
    onSelectPosition?.(null)
    setSelectedTokenId(null)
  }

  const handleBackToPositions = () => {
    setView('positions')
    onSelectPosition?.(null)
  }

  const copyToastNode = copyToast ? (
    <div className="fixed bottom-6 right-6 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-foam shadow-card">
      {copyToast}
    </div>
  ) : null

  // Show loading state
  if (loading) {
    return (
      <div className="w-full max-w-full rounded-3xl border border-white/10 bg-ink/50 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foam/60">Position NFTs</p>
            <h2 className="text-xl font-semibold text-foam">Your Position NFTs</h2>
            <p className="text-sm text-slate-300">Loading your positions...</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-mint border-t-transparent"></div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full max-w-full rounded-3xl border border-white/10 bg-ink/50 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foam/60">Position NFTs</p>
            <h2 className="text-xl font-semibold text-foam">Your Position NFTs</h2>
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state
  if (!nfts || nfts.length === 0) {
    return (
      <>
        <div className="w-full max-w-full rounded-3xl border border-white/10 bg-ink/50 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-foam/60">Position NFTs</p>
              <h2 className="text-xl font-semibold text-foam">Your Position NFTs</h2>
              <p className="text-sm text-slate-300">No Position NFTs found</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-mint/20 bg-mint/5 p-4">
            <p className="text-sm font-semibold text-foam">Get Started with EqualFi</p>
            <p className="mt-2 text-sm text-slate-300">
              Mint a Position NFT to start depositing and borrowing in Equalis pools. Each NFT represents an isolated
              position with its own deposits, loans, and yield.
            </p>
            <button
              type="button"
              onClick={() => setShowMintModal(true)}
              className="mt-4 min-h-[44px] rounded-full bg-mint px-6 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-1 hover:shadow-xl"
            >
              Mint Position NFT
            </button>
          </div>
          <div className="mt-4 space-y-2 text-xs text-slate-400">
            <p>✓ Isolated positions per NFT</p>
            <p>✓ Transferable ownership</p>
            <p>✓ Independent deposits and loans</p>
          </div>
        </div>

        {/* Mint NFT Modal */}
        {showMintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1021] p-6 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-foam/60">Position NFT</p>
                  <h2 className="text-2xl font-semibold text-foam">Mint New Position</h2>
                  <p className="text-xs text-slate-300">Create an isolated position in a pool</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMintModal(false)}
                  className="min-h-[44px] rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-mint hover:text-mint"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foam" htmlFor="mint-pool">
                    Select Pool
                  </label>
                  <select
                    id="mint-pool"
                    value={selectedPool}
                    onChange={(e) => setSelectedPool(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                  >
                    <option value="">Choose a pool...</option>
                    {poolOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foam" htmlFor="mint-amount">
                    Initial Deposit
                  </label>
                  <input
                    id="mint-amount"
                    type="text"
                    inputMode="decimal"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                  />
                </div>
              </div>

              {selectedPool && poolMeta[selectedPool] && (
                <div className="mt-3 text-xs text-slate-400">
                  <p>Token: {poolMeta[selectedPool].ticker || '—'}</p>
                  <p>Minimum deposit may apply</p>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-mint/20 bg-mint/5 p-3 text-xs text-slate-300">
                <p className="font-semibold text-foam">What happens next?</p>
                <p className="mt-1">
                  A new Position NFT will be minted with your initial deposit. You can add more funds later or use it for borrowing.
                </p>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPool && depositAmount && onMintNFT) {
                      onMintNFT(selectedPool, depositAmount)
                      setShowMintModal(false)
                      setSelectedPool('')
                      setDepositAmount('')
                    }
                  }}
                  disabled={!selectedPool || !depositAmount}
                  className="min-h-[44px] rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mint & Deposit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMintModal(false)
                    setSelectedPool('')
                    setDepositAmount('')
                  }}
                  className="min-h-[44px] rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-foam transition hover:-translate-y-0.5 hover:border-mint hover:text-mint"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  if (view === 'detail' && selectedNFT) {
    const tokenPositions = positionsForSelectedToken
    return (
      <>
      <div className="w-full max-w-full rounded-3xl border border-white/10 bg-ink/50 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foam/60">Position NFT</p>
            <h2 className="text-xl font-semibold text-foam">NFT #{selectedNFT.tokenId} Stats</h2>
            <p className="text-sm text-slate-300">{selectedNFT.poolName} ({selectedNFT.ticker})</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedPositionId}
              onChange={(e) => handleSelectPosition(e.target.value)}
              className="w-32 rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
            >
              {tokenPositions.map((pos) => (
                <option key={`${pos.tokenId}-${pos.poolId}`} value={pos.positionKey}>
                  Pool {pos.poolName} (pid {pos.poolId})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBackToPositions}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-mint hover:text-mint"
            >
              ← Back to pools
            </button>
          </div>
        </div>

                {/* Stats Grid */}

                <div className="mt-4 space-y-4">

                  {/* Assets & Yield Tile */}

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between min-h-[160px]">

                     <h3 className="text-sm font-bold uppercase tracking-wider text-mint mb-6 flex items-center gap-2">

                        <div className="h-2 w-2 rounded-full bg-mint" />

                        Assets & Yield

                     </h3>

                     <div className="space-y-6">

                        <div className="flex justify-between items-center pb-4 border-b border-white/5">

                           <div>

                              <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Principal</p>

                              <p className="text-xs text-slate-500 mt-0.5">Deposited capital</p>

                           </div>

                           <div className="text-right">

                              <p className="text-xl font-bold text-foam">{selectedNFT.principal} {selectedNFT.ticker}</p>

                           </div>

                        </div>

                        

                        <div className="flex justify-between items-center">

                           <div>

                              <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Accrued Yield</p>

                              <p className="text-xs text-slate-500 mt-0.5">Lending gains & trading fees</p>

                           </div>

                           <div className="text-right">

                              <div className="flex items-baseline justify-end gap-2">

                                <p className="text-xl font-bold text-mint">

                                    {(parseFloat(selectedNFT.aciYield.replace(/,/g, '')) + parseFloat(selectedNFT.accruedYield.replace(/,/g, ''))).toLocaleString()}

                                </p>

                                <span className="text-sm font-medium text-slate-400">{selectedNFT.ticker}</span>

                              </div>

                              <div className="flex gap-3 mt-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold justify-end">

                                <span className="flex items-center gap-1"><div className="h-1 w-1 rounded-full bg-mint" /> ACI: {selectedNFT.aciYield}</span>

                                <span className="flex items-center gap-1"><div className="h-1 w-1 rounded-full bg-foam" /> Fee: {selectedNFT.accruedYield}</span>

                              </div>

                           </div>

                        </div>

                     </div>

                  </div>

        

                  {/* Liabilities & Net Tile */}

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between min-h-[160px]">

                     <h3 className="text-sm font-bold uppercase tracking-wider text-rose-300 mb-6 flex items-center gap-2">

                        <div className="h-2 w-2 rounded-full bg-rose-400" />

                        Liabilities & Net

                     </h3>

                     <div className="space-y-6">

                        <div className="flex justify-between items-center pb-4 border-b border-white/5">

                           <div>

                              <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Total Liabilities</p>

                              <p className="text-xs text-slate-500 mt-0.5">Active loans & credit lines</p>

                           </div>

                           <div className="text-right">

                              <div className="flex items-baseline justify-end gap-2">

                                <p className="text-xl font-bold text-foam">{selectedNFT.totalLiabilities}</p>

                                <span className="text-sm font-medium text-slate-400">{selectedNFT.ticker}</span>

                              </div>

                              <div className="flex gap-3 mt-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold justify-end">

                                <span>Rolling: {selectedNFT.rollingCredit}</span>

                                <span>Fixed: {selectedNFT.fixedTermLoans}</span>

                              </div>

                           </div>

                        </div>

        

                        <div className="flex justify-between items-center">

                           <div>

                              <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Net Position</p>

                              <p className="text-xs text-slate-500 mt-0.5">Equity (Principal - Liabilities)</p>

                           </div>

                           <div className="text-right">

                              <p className="text-xl font-bold text-mint">

                                {(parseFloat(selectedNFT.principal.replace(/,/g, '')) - parseFloat(selectedNFT.totalLiabilities.replace(/,/g, ''))).toLocaleString()}{' '}

                                {selectedNFT.ticker}

                              </p>

                           </div>

                        </div>

                     </div>

                  </div>

                </div>

        

                {/* Additional Info */}

                <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6">

                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400 font-bold mb-4">Position Details</p>

                  <div className="mt-2 grid gap-2 text-sm">

        
            <div className="flex justify-between">
              <span className="text-slate-300">Token ID:</span>
              <span className="font-semibold text-foam">#{selectedNFT.tokenId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Pool:</span>
              <span className="font-semibold text-foam">{selectedNFT.poolName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Pool LTV:</span>
              <span className="font-semibold text-foam">
                {Number.isFinite(poolMeta[selectedNFT.poolName]?.depositorLTVBps) &&
                poolMeta[selectedNFT.poolName]?.depositorLTVBps >= 0
                  ? `${(poolMeta[selectedNFT.poolName].depositorLTVBps / 100).toFixed(2)}%`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Utilization:</span>
              <span className="font-semibold text-foam">
                {(
                  (parseFloat(selectedNFT.totalLiabilities.replace(/,/g, '')) /
                    parseFloat(selectedNFT.principal.replace(/,/g, ''))) *
                  100
                ).toFixed(2)}
                %
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/5 mt-1">
              <span className="text-slate-300 font-medium">Total Encumbered:</span>
              <span className="font-semibold text-amber-300">
                {(selectedNFT.totalEncumbered ?? selectedNFT.directLentPrincipal ?? '0')} {selectedNFT.ticker}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onDeposit?.()}
            className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!publicClient}
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => onWithdraw?.()}
            className="rounded-full border border-mint/40 px-4 py-2 text-sm font-semibold text-mint transition hover:-translate-y-0.5 hover:border-mint hover:bg-mint/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!publicClient}
          >
            Withdraw
          </button>
          {showBorrowRepay && (
            <>
              <button
                type="button"
                onClick={() => onBorrow?.()}
                className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!publicClient}
              >
                Borrow
              </button>
              <button
                type="button"
                onClick={() => onRepay?.()}
                className="rounded-full border border-mint/40 px-4 py-2 text-sm font-semibold text-mint transition hover:-translate-y-0.5 hover:border-mint hover:bg-mint/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!publicClient}
              >
                Repay
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onCompound?.(selectedNFT.positionKey)}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-foam transition hover:-translate-y-0.5 hover:border-mint hover:text-mint disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!publicClient}
          >
            Compound
          </button>
          <button
            type="button"
            onClick={() => onLeavePool?.(selectedNFT.positionKey)}
            className="rounded-full border border-red-500 px-4 py-2 text-sm font-semibold text-red-300 transition hover:-translate-y-0.5 hover:border-red-400 hover:text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!publicClient}
          >
            Leave Pool
          </button>
        </div>
      </div>
      {copyToastNode}
      </>
    )
  }

  if (view === 'positions' && selectedTokenId) {
    const tokenMeta = positionsByToken.find((t) => t.tokenId === selectedTokenId)
    return (
      <>
      <div className="w-full max-w-full rounded-3xl border border-white/10 bg-ink/50 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foam/60">Position NFT</p>
            <h2 className="text-xl font-semibold text-foam">NFT #{selectedTokenId} Pool Positions</h2>
            <p className="text-sm text-slate-300">
              Select a pool position to view stats and actions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackToList}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-mint hover:text-mint"
            >
              ← Back to NFTs
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-4 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span>Pool</span>
            <span className="text-right">Principal</span>
            <span className="text-right">Liabilities</span>
            <span className="text-right">Rolling</span>
          </div>
          <div className="divide-y divide-white/5">
            {positionsForSelectedToken.map((position) => (
              <button
                key={`${position.tokenId}-${position.poolId}`}
                type="button"
                onClick={() => handleSelectPosition(position.positionKey)}
                className="grid w-full grid-cols-4 items-center px-4 py-3 text-sm text-foam transition hover:bg-white/5 min-h-[44px]"
              >
                <span className="text-left font-semibold text-foam">{position.poolName}</span>
                <span className="text-right font-semibold text-foam">
                  {position.principal} {position.ticker}
                </span>
                <span
                  className={`text-right font-semibold ${
                    parseFloat(position.totalLiabilities.replace(/,/g, '')) > 0 ? 'text-amber-300' : 'text-slate-400'
                  }`}
                >
                  {position.totalLiabilities} {position.ticker}
                </span>
                <span className="text-right text-xs font-semibold text-slate-300">
                  {position.rollingCredit} {position.ticker}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => onDepositClick?.(selectedTokenId)}
            className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => onWithdrawClick?.(selectedTokenId)}
            className="rounded-full border border-mint/40 px-4 py-2 text-sm font-semibold text-mint transition hover:-translate-y-0.5 hover:border-mint hover:bg-mint/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Withdraw
          </button>
        </div>
      </div>
      {copyToastNode}
      </>
    )
  }

  // List View
  return (
    <>
      <div className="w-full max-w-full rounded-3xl border border-white/10 bg-ink/50 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foam/60">Position NFTs</p>
            <h2 className="text-xl font-semibold text-foam">Your Position NFTs</h2>
            <p className="text-sm text-slate-300">Click any NFT to view its pool positions</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-mint/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-mint">
              {positionsByToken.length} NFT{positionsByToken.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setShowMintModal(true)}
              className="rounded-full border border-mint/40 px-3 py-1 text-xs font-semibold text-mint transition hover:border-mint hover:bg-mint/10"
              title="Mint another Position NFT"
            >
              + Mint
            </button>
          </div>
        </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-3 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span>Token ID</span>
            <span className="text-right">Position Key</span>
            <span className="text-right">Pools</span>
          </div>
          <div className="divide-y divide-white/5">
            {positionsByToken.map((tokenRow) => (
              <button
                key={`token-row-${tokenRow.tokenId}`}
                type="button"
                onClick={() => handleSelectToken(tokenRow.tokenId)}
                className="grid w-full grid-cols-3 items-center px-4 py-3 text-sm text-foam transition hover:bg-white/5 min-h-[44px]"
              >
                <span className="text-left font-mono text-mint">#{tokenRow.tokenId}</span>
                <span className="flex items-center justify-end gap-2 text-right text-xs font-mono text-slate-300 truncate">
                  {truncateKey(tokenRow.positions[0]?.positionAddress)}
                  {tokenRow.positions[0]?.positionAddress ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyKey(tokenRow.positions[0].positionAddress)
                      }}
                      className="cursor-pointer text-slate-400 hover:text-mint"
                      role="button"
                      tabIndex={0}
                      aria-label="Copy position key"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          handleCopyKey(tokenRow.positions[0].positionAddress)
                        }
                      }}
                    >
                    ⧉
                  </span>
                ) : null}
              </span>
                <span className="text-right text-xs font-semibold text-slate-300">
                  {tokenRow.activeCount} pool{tokenRow.activeCount === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
      </div>

        <div className="mt-4 rounded-2xl border border-mint/20 bg-mint/5 p-3 text-xs text-slate-300">
          <p className="font-semibold text-foam">About Position NFTs</p>
          <p className="mt-1">
            Each Position NFT represents your isolated position in a pool. Principal, yield, and loans are tracked
            per-NFT. Transfer the NFT to transfer the entire position.
          </p>
        </div>
      </div>

      {copyToastNode}

      {/* Mint NFT Modal */}
      {showMintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1021] p-6 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-foam/60">Position NFT</p>
                <h2 className="text-2xl font-semibold text-foam">Mint New Position</h2>
                <p className="text-xs text-slate-300">Create an isolated position in a pool</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMintModal(false)}
                className="min-h-[44px] rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-mint hover:text-mint"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foam" htmlFor="mint-pool-list">
                  Select Pool
                </label>
                <select
                  id="mint-pool-list"
                  value={selectedPool}
                  onChange={(e) => setSelectedPool(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                >
                  <option value="">Choose a pool...</option>
                  {poolOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foam" htmlFor="mint-amount-list">
                  Initial Deposit
                </label>
                <input
                  id="mint-amount-list"
                  type="text"
                  inputMode="decimal"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                />
              </div>
            </div>

            {selectedPool && poolMeta[selectedPool] && (
              <div className="mt-3 text-xs text-slate-400">
                <p>Token: {poolMeta[selectedPool].ticker || '—'}</p>
                <p>Minimum deposit may apply</p>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-mint/20 bg-mint/5 p-3 text-xs text-slate-300">
              <p className="font-semibold text-foam">What happens next?</p>
              <p className="mt-1">
                A new Position NFT will be minted with your initial deposit. You can add more funds later or use it for borrowing.
              </p>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (selectedPool && depositAmount && onMintNFT) {
                    onMintNFT(selectedPool, depositAmount)
                    setShowMintModal(false)
                    setSelectedPool('')
                    setDepositAmount('')
                  }
                }}
                disabled={!selectedPool || !depositAmount}
                className="min-h-[44px] rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mint & Deposit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMintModal(false)
                  setSelectedPool('')
                  setDepositAmount('')
                }}
                className="min-h-[44px] rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-foam transition hover:-translate-y-0.5 hover:border-mint hover:text-mint"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PositionNFTCard
