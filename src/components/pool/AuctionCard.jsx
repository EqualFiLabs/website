"use client";

import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import { formatUnits } from 'viem'
import { useCommunityParticipation } from '@/lib/hooks/useCommunityParticipation'

function AuctionCard({ auction, onJoin, onCancel, onAdd, onExit, canAddLiquidity }) {
  const { participatingPositions, isLoading: isParticipationLoading } = useCommunityParticipation(auction)
  const [expanded, setExpanded] = useState(false)
  const now = Date.now()
  const remainingMs = Math.max(0, auction.endsAt - now)
  
  const formatDuration = (ms) => {
    if (ms <= 0) return 'Ended'
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const durationLabel = formatDuration(remainingMs)
  const isExpired = auction.endsAt <= now
  const isInactive = !auction.active || auction.finalized || isExpired
  const canCancel = auction.type !== 'community' && !isInactive
  const canAddSolo = auction.type === 'solo' && canAddLiquidity
  const canAddCommunity = auction.type === 'community'

  const formatFee = (val) => {
    if (val === null || val === undefined || Number.isNaN(val)) return '—'
    if (!val) return '0.0000'
    if (val < 0.0001 && val > 0) return '< 0.0001'
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  }

  const communityFees = useMemo(() => {
    if (auction.type !== 'community') return null
    const totalShares = BigInt(auction.displayTotalShares ?? 0)
    if (totalShares === 0n) return { feeA: null, feeB: null }
    const feeIndexA = BigInt(auction.displayFeeIndexA ?? 0)
    const feeIndexB = BigInt(auction.displayFeeIndexB ?? 0)
    const scale = 10n ** 18n
    const amountARaw = (feeIndexA * totalShares) / scale
    const amountBRaw = (feeIndexB * totalShares) / scale
    return {
      feeA: formatUnits(amountARaw, auction.decimalsA ?? 18),
      feeB: formatUnits(amountBRaw, auction.decimalsB ?? 18),
    }
  }, [auction])

  const formatReserve = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return value.toLocaleString()
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card transition-all hover:border-surface3 hover:shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-surface2 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-neutral1">
              {auction.tokenA} <span className="text-neutral3">/</span> {auction.tokenB}
            </h3>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              auction.type === 'community' ? 'bg-accent1/10 text-accent1' : 'bg-surface3 text-neutral2'
            }`}>
              {auction.type}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-neutral2">
            <span className="font-mono">#{auction.id}</span>
            <span className="h-1 w-1 rounded-full bg-neutral3" />
            <span>Fee {(auction.feeBps / 100).toFixed(2)}%</span>
          </div>
        </div>
        
        <div className="text-right">
           <div className="text-xs font-bold uppercase tracking-widest text-neutral3 mb-1">Time Remaining</div>
           <div className={`text-xl font-mono font-bold ${remainingMs > 0 ? 'text-neutral1' : 'text-statusCritical'}`}>
             {durationLabel}
           </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="mt-6 grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral3">
            <span>Pool Reserves</span>
            {auction.liveReserveError && (
              <span className="rounded-full border border-statusCritical/30 px-2 py-0.5 text-[10px] text-statusCritical">
                Live fetch failed
              </span>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral2">{auction.tokenA}</span>
              <span className="text-lg font-mono font-bold text-neutral1">
                {formatReserve(auction.displayReserveA)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral2">{auction.tokenB}</span>
              <span className="text-lg font-mono font-bold text-neutral1">
                {formatReserve(auction.displayReserveB)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral3">
            <span>Accrued Fees</span>
            {auction.liveFeeError && (
              <span className="rounded-full border border-statusCritical/30 px-2 py-0.5 text-[10px] text-statusCritical">
                Live fetch failed
              </span>
            )}
          </div>
          <div className="space-y-2">
            {auction.type === 'solo' ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-neutral2">{auction.tokenA}</span>
                  <span className="text-lg font-mono font-bold text-accent1">
                    {formatFee(auction.displayMakerFeeA)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-neutral2">{auction.tokenB}</span>
                  <span className="text-lg font-mono font-bold text-accent1">
                    {formatFee(auction.displayMakerFeeB)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-neutral2">Index A</span>
                  <span className="text-lg font-mono font-bold text-accent1">
                    {formatFee(communityFees?.feeA ? Number(communityFees.feeA) : null)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-neutral2">Index B</span>
                  <span className="text-lg font-mono font-bold text-accent1">
                    {formatFee(communityFees?.feeB ? Number(communityFees.feeB) : null)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Info */}
      {expanded && (
        <div className="mt-6 border-t border-surface2 pt-6 grid grid-cols-2 gap-4 text-sm text-neutral2 animate-in fade-in slide-in-from-top-2">
          <div>
             <span className="block text-xs font-bold uppercase tracking-widest text-neutral3 mb-1">Ends At</span>
             <span className="font-mono">{new Date(auction.endsAt).toLocaleString()}</span>
          </div>
          {auction.type === 'community' && (
             <div>
               <span className="block text-xs font-bold uppercase tracking-widest text-neutral3 mb-1">Makers</span>
               <span className="font-mono text-neutral1">{auction.makers ?? 0}</span>
             </div>
          )}
          {auction.totalShares && (
             <div>
               <span className="block text-xs font-bold uppercase tracking-widest text-neutral3 mb-1">Total Shares</span>
               <span className="font-mono text-neutral1">{(Number(auction.totalShares) / 1e18).toFixed(4)}</span>
             </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-4 pt-6 border-t border-surface2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-bold uppercase tracking-wider text-neutral2 hover:text-neutral1 transition-colors text-left"
        >
          {expanded ? 'Hide Details' : 'View Details'}
        </button>
        
        <div className="flex flex-wrap items-center gap-3">
          {auction.type === 'community' && participatingPositions?.length > 0 && (
            <button
              type="button"
              onClick={() => onExit && onExit(auction, participatingPositions)}
              disabled={isParticipationLoading}
              className="rounded-full border border-surface3 px-6 py-3 text-xs font-bold uppercase tracking-wider text-neutral2 transition-colors hover:border-statusCritical hover:text-statusCritical hover:bg-statusCritical/5 w-full sm:w-auto"
            >
              Exit Pool
            </button>
          )}
          {auction.type === 'community' && (
            <button
              type="button"
              onClick={() => onJoin && onJoin(auction)}
              disabled={isInactive}
              className={[
                'rounded-full border border-surface3 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors w-full sm:w-auto',
                isInactive
                  ? 'text-neutral3 cursor-not-allowed'
                  : 'text-neutral2 hover:border-accent1 hover:text-accent1 hover:bg-accent1/5',
              ].join(' ')}
            >
              Join Pool
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel && onCancel(auction)}
              className="cancel-auction-btn rounded-full border border-surface3 px-6 py-3 text-xs font-bold uppercase tracking-wider text-neutral2 transition-colors w-full sm:w-auto"
            >
              Cancel Auction
            </button>
          )}
          {canAddCommunity && (
            <button
              type="button"
              onClick={() => onAdd && onAdd(auction)}
              disabled={isInactive}
              className={[
                'rounded-full px-8 py-3 text-xs font-bold uppercase tracking-wider shadow-lg transition-all w-full sm:w-auto',
                isInactive
                  ? 'bg-surface3 text-neutral3 shadow-none cursor-not-allowed'
                  : 'bg-accent1 text-ink hover:bg-accent1Hovered hover:shadow-xl hover:-translate-y-0.5',
              ].join(' ')}
            >
              Add Liquidity
            </button>
          )}
          {canAddSolo && (
            <button
              type="button"
              onClick={() => onAdd && onAdd(auction)}
              disabled={isInactive}
              className={[
                'rounded-full px-8 py-3 text-xs font-bold uppercase tracking-wider shadow-lg transition-all w-full sm:w-auto',
                isInactive
                  ? 'bg-surface3 text-neutral3 shadow-none cursor-not-allowed'
                  : 'bg-accent1 text-ink hover:bg-accent1Hovered hover:shadow-xl hover:-translate-y-0.5',
              ].join(' ')}
            >
              Add Liquidity
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

AuctionCard.propTypes = {
  auction: PropTypes.shape({
    id: PropTypes.number.isRequired,
    tokenA: PropTypes.string.isRequired,
    tokenB: PropTypes.string.isRequired,
    reserveA: PropTypes.number.isRequired,
    reserveB: PropTypes.number.isRequired,
    displayReserveA: PropTypes.number,
    displayReserveB: PropTypes.number,
    displayFeeBps: PropTypes.number,
    feeBps: PropTypes.number.isRequired,
    liveReserveError: PropTypes.bool,
    liveFeeError: PropTypes.bool,
    active: PropTypes.bool,
    finalized: PropTypes.bool,
    endsAt: PropTypes.number.isRequired,
    type: PropTypes.oneOf(['solo', 'community']).isRequired,
    makers: PropTypes.number,
    displayMakerFeeA: PropTypes.number,
    displayMakerFeeB: PropTypes.number,
    displayFeeIndexA: PropTypes.any,
    displayFeeIndexB: PropTypes.any,
    displayTotalShares: PropTypes.any,
    makerFeeA: PropTypes.number,
    makerFeeB: PropTypes.number,
    feeIndexA: PropTypes.any,
    feeIndexB: PropTypes.any,
    totalShares: PropTypes.any,
  }).isRequired,
  onJoin: PropTypes.func,
  onCancel: PropTypes.func,
  onAdd: PropTypes.func,
  onExit: PropTypes.func,
  canAddLiquidity: PropTypes.bool,
}

AuctionCard.defaultProps = {
  canAddLiquidity: false,
}

export default AuctionCard
