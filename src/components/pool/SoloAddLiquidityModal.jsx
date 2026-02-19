"use client";

import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useWriteContract } from 'wagmi'
import { useToasts } from '../common/ToastProvider'
import useActivePublicClient from '@/lib/hooks/useActivePublicClient'
import usePoolsConfig from '@/lib/hooks/usePoolsConfig'
import useExplorerUrl from '@/lib/hooks/useExplorerUrl'
import { ammAuctionFacetAbi } from '@/lib/abis/ammAuctionFacet'

function formatDisplayAmount(value, decimals) {
  if (!value) return ''
  const formatted = formatUnits(value, decimals)
  const numeric = Number(formatted)
  if (!Number.isFinite(numeric)) return formatted
  if (numeric === 0) return '0'
  return numeric.toFixed(6).replace(/\.?0+$/, '')
}

function SoloAddLiquidityModal({ isOpen, auction, onClose, onSuccess }) {
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToasts()
  const { address, isConnected } = useAccount()
  const publicClient = useActivePublicClient()
  const { writeContractAsync } = useWriteContract()
  const poolsConfig = usePoolsConfig()
  const { buildTxUrl } = useExplorerUrl()

  useEffect(() => {
    if (!auction) return
    setAmountA('')
    setAmountB('')
  }, [auction])

  const computed = useMemo(() => {
    if (!auction || !amountA) return null
    const poolA = poolsConfig.pools.find((pool) => Number(pool.pid) === Number(auction.poolIdA))
    const poolB = poolsConfig.pools.find((pool) => Number(pool.pid) === Number(auction.poolIdB))
    const decimalsA = poolA?.decimals ?? auction.decimalsA ?? 18
    const decimalsB = poolB?.decimals ?? auction.decimalsB ?? 18
    let reserveARaw = auction.reserveARaw ?? 0n
    let reserveBRaw = auction.reserveBRaw ?? 0n
    if (reserveARaw <= 0n && auction.displayReserveA != null) {
      try {
        reserveARaw = parseUnits(String(auction.displayReserveA), decimalsA)
      } catch {
        reserveARaw = 0n
      }
    }
    if (reserveBRaw <= 0n && auction.displayReserveB != null) {
      try {
        reserveBRaw = parseUnits(String(auction.displayReserveB), decimalsB)
      } catch {
        reserveBRaw = 0n
      }
    }
    if (reserveARaw <= 0n || reserveBRaw <= 0n) return null
    let amountARaw
    try {
      amountARaw = parseUnits(amountA, decimalsA)
    } catch {
      return null
    }
    if (amountARaw <= 0n) return null
    const amountBRaw = (amountARaw * reserveBRaw) / reserveARaw
    return {
      amountARaw,
      amountBRaw,
      usingFallback: reserveARaw === 0n || reserveBRaw === 0n,
      decimalsB,
    }
  }, [auction, amountA, poolsConfig])

  useEffect(() => {
    if (!computed) {
      setAmountB('')
      return
    }
    setAmountB(formatDisplayAmount(computed.amountBRaw, computed.decimalsB))
  }, [computed])

  const handleSubmit = async () => {
    if (!auction) return
    setIsSubmitting(true)
    let txHash

    try {
      if (auction.type !== 'solo') throw new Error('Only solo auctions can use this flow')
      if (!publicClient || !writeContractAsync) throw new Error('Wallet client unavailable')
      if (!isConnected || !address) throw new Error('Connect wallet to add liquidity')
      if (!computed?.amountARaw || !computed?.amountBRaw) throw new Error('Enter an amount')
      if (computed.amountARaw <= 0n || computed.amountBRaw <= 0n) throw new Error('Enter amounts above zero')

      const poolA = poolsConfig.pools.find((pool) => Number(pool.pid) === Number(auction.poolIdA))
      if (!poolA) throw new Error('Pool config missing for auction')
      const diamondAddress =
        (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || poolA.lendingPoolAddress || '').trim()
      if (!diamondAddress) throw new Error('Diamond address missing from config')

      txHash = await writeContractAsync({
        address: diamondAddress,
        abi: ammAuctionFacetAbi,
        functionName: 'addLiquidity',
        args: [BigInt(auction.id), computed.amountARaw, computed.amountBRaw],
      })

      addToast({
        title: 'Add liquidity submitted',
        description: 'Waiting for confirmation…',
        type: 'pending',
        link: buildTxUrl(txHash),
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })
      addToast({
        title: 'Liquidity added',
        description: `Auction #${auction.id}`,
        type: 'success',
        link: buildTxUrl(txHash),
      })
      onClose()
      if (onSuccess) onSuccess()
    } catch (err) {
      addToast({
        title: 'Add liquidity failed',
        description: err.message || 'Transaction reverted',
        type: 'error',
        link: txHash ? buildTxUrl(txHash) : undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !auction) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div className="text-xl font-bold text-neutral1">Add Liquidity (Solo)</div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-neutral2 transition-colors hover:bg-surface3 hover:text-neutral1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="space-y-6">
          {computed?.usingFallback && (
            <div className="rounded-2xl border border-statusCritical/30 bg-statusCritical/10 px-4 py-3 text-sm text-statusCritical">
              Live reserves unavailable. Amounts are estimated and may revert if ratios are off.
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral2" htmlFor="solo-amount-a">
              Amount {auction.tokenA}
            </label>
            <input
              id="solo-amount-a"
              type="number"
              min="0"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral2" htmlFor="solo-amount-b">
              Amount {auction.tokenB}
            </label>
            <input
              id="solo-amount-b"
              type="text"
              value={amountB}
              readOnly
              className="w-full rounded-2xl border border-surface2 bg-surface2/50 px-4 py-3 text-base text-neutral1 outline-none cursor-not-allowed"
              placeholder="0.00"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !amountA || !amountB}
          className={[
            'mt-8 w-full rounded-full px-6 py-4 text-base font-semibold transition-all shadow-lg',
            !amountA || !amountB || isSubmitting
              ? 'bg-surface3 text-neutral3 shadow-none'
              : 'bg-accent1 text-ink hover:bg-accent1Hovered hover:shadow-xl hover:-translate-y-0.5',
          ].join(' ')}
        >
          {isSubmitting ? 'Adding…' : 'Add Liquidity'}
        </button>
      </div>
    </div>
  )
}

SoloAddLiquidityModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  auction: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
}

SoloAddLiquidityModal.defaultProps = {
  auction: null,
  onSuccess: null,
}

export default SoloAddLiquidityModal
