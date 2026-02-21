"use client";

import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import { parseUnits } from 'viem'
import { useAccount, useWriteContract } from 'wagmi'
import { useToasts } from '../common/ToastProvider'
import useActivePublicClient from '@/lib/hooks/useActivePublicClient'
import usePoolsConfig from '@/lib/hooks/usePoolsConfig'
import usePositionNFTs from '@/lib/hooks/usePositionNFTs'
import useExplorerUrl from '@/lib/hooks/useExplorerUrl'
import { communityAuctionFacetAbi } from '@/lib/abis/communityAuctionFacet'

function JoinModal({ isOpen, auction, onClose }) {
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [expectedSharePct, setExpectedSharePct] = useState('')
  const [positionId, setPositionId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totalShares, setTotalShares] = useState(null)
  const { addToast } = useToasts()
  const { address, isConnected } = useAccount()
  const publicClient = useActivePublicClient()
  const { writeContractAsync } = useWriteContract()
  const { nfts } = usePositionNFTs()
  const poolsConfig = usePoolsConfig()
  const { buildTxUrl } = useExplorerUrl()

  useEffect(() => {
    if (!auction) return
    setAmountA('')
    setAmountB('')
    setExpectedSharePct('')
    setPositionId('')
    setTotalShares(
      Number.isFinite(Number(auction.totalShares)) ? Number(auction.totalShares) : null,
    )
  }, [auction])

  useEffect(() => {
    let cancelled = false
    const loadTotalShares = async () => {
      if (!auction || auction.type !== 'community' || !publicClient) return
      const poolA = poolsConfig.pools.find((pool) => Number(pool.pid) === Number(auction.poolIdA))
      const diamondAddress =
        (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || poolA?.lendingPoolAddress || '').trim()
      if (!diamondAddress) return
      try {
        const community = await publicClient.readContract({
          address: diamondAddress,
          abi: communityAuctionFacetAbi,
          functionName: 'getCommunityAuction',
          args: [BigInt(auction.id)],
        })
        if (!cancelled) {
          setTotalShares(Number(community.totalShares))
        }
      } catch (err) {
        if (!cancelled) {
          setTotalShares(null)
        }
      }
    }

    loadTotalShares()
    return () => {
      cancelled = true
    }
  }, [auction, publicClient, poolsConfig])

  const computeAmounts = useMemo(() => {
    if (!auction || !amountA) return null
    const amtA = Number(amountA)
    if (Number.isNaN(amtA) || amtA <= 0) return null
    const ratio = auction.reserveB / auction.reserveA
    const amtB = amtA * ratio
    const share = Math.sqrt(amtA * amtB)
    return { amtB, share }
  }, [auction, amountA])

  useEffect(() => {
    if (!computeAmounts) return
    setAmountB(computeAmounts.amtB.toFixed(4))
    if (auction?.type !== 'community') {
      setExpectedSharePct('')
      return
    }
    const fallbackTotal =
      auction?.reserveA && auction?.reserveB
        ? Math.sqrt(auction.reserveA * auction.reserveB)
        : null
    // totalShares is in wei (1e18), need to convert to regular units
    const baseTotalWei = totalShares && totalShares > 0 ? totalShares / 1e18 : fallbackTotal
    
    console.log('[JoinModal] Share calculation:', {
      totalSharesRaw: totalShares,
      totalSharesConverted: totalShares ? totalShares / 1e18 : null,
      fallbackTotal,
      baseTotalWei,
      share: computeAmounts.share,
      reserveA: auction?.reserveA,
      reserveB: auction?.reserveB,
    })
    
    if (baseTotalWei && baseTotalWei > 0) {
      const share = computeAmounts.share
      const pct = (share / (baseTotalWei + share)) * 100
      console.log('[JoinModal] Expected share %:', pct)
      setExpectedSharePct(pct.toFixed(2))
    } else {
      console.log('[JoinModal] No baseTotalWei, cannot calculate share')
      setExpectedSharePct('')
    }
  }, [computeAmounts, totalShares, auction])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      if (auction?.type !== 'community') {
        throw new Error('Only community auctions can accept added liquidity')
      }
      if (!publicClient || !writeContractAsync) throw new Error('Wallet client unavailable')
      if (!isConnected || !address) throw new Error('Connect wallet to join')
      if (!positionId) throw new Error('Select a Position NFT')

      const poolA = poolsConfig.pools.find((pool) => Number(pool.pid) === Number(auction.poolIdA))
      const poolB = poolsConfig.pools.find((pool) => Number(pool.pid) === Number(auction.poolIdB))
      if (!poolA || !poolB) throw new Error('Pool config missing for auction')

      const amountARaw = parseUnits(amountA || '0', poolA.decimals ?? 18)
      const amountBRaw = parseUnits(amountB || '0', poolB.decimals ?? 18)
      if (amountARaw <= BigInt(0) || amountBRaw <= BigInt(0)) throw new Error('Enter amounts above zero')

      const diamondAddress =
        (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || poolA.lendingPoolAddress || '').trim()
      if (!diamondAddress) throw new Error('Diamond address missing from config')

      const txHash = await writeContractAsync({
        address: diamondAddress,
        abi: communityAuctionFacetAbi,
        functionName: 'joinCommunityAuction',
        args: [BigInt(auction.id), BigInt(positionId), amountARaw, amountBRaw],
      })

      addToast({
        title: 'Join submitted',
        description: 'Waiting for confirmation…',
        type: 'pending',
        link: buildTxUrl(txHash),
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })
      addToast({
        title: 'Joined auction',
        description: `Auction #${auction.id}`,
        type: 'success',
        link: buildTxUrl(txHash),
      })
      onClose()
    } catch (err) {
      addToast({
        title: 'Join failed',
        description: err.message || 'Transaction reverted',
        type: 'error',
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
          <div className="text-xl font-bold text-neutral1">Add Liquidity</div>
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral2" htmlFor="join-position-id">
              Position NFT
            </label>
            <div className="relative">
              <select
                id="join-position-id"
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                disabled={!nfts?.length}
              >
                <option value="">{nfts?.length ? 'Select an NFT…' : 'No Position NFTs found'}</option>
                {(nfts || [])
                  .filter((nft, idx, arr) => arr.findIndex((item) => item.tokenId === nft.tokenId) === idx)
                  .map((nft) => (
                    <option key={nft.tokenId} value={nft.tokenId}>
                      NFT #{nft.tokenId}
                    </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral2" htmlFor="join-amount-a">
              Amount {auction.tokenA}
            </label>
            <input
              id="join-amount-a"
              type="number"
              min="0"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral2" htmlFor="join-amount-b">
              Amount {auction.tokenB}
            </label>
            <input
              id="join-amount-b"
              type="number"
              min="0"
              value={amountB}
              readOnly
              className="w-full rounded-2xl border border-surface2 bg-surface2/50 px-4 py-3 text-base text-neutral1 outline-none cursor-not-allowed"
              placeholder="0.00"
            />
          </div>

          {auction.type === 'community' && (
            <div className="rounded-2xl border border-surface2 bg-surface2/50 px-4 py-3 text-sm text-neutral2 flex justify-between">
              <span>Expected Share (%):</span>
              <span className="font-semibold text-neutral1">{expectedSharePct || '--'}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !amountA || !positionId}
          className={[
            'mt-8 w-full rounded-full px-6 py-4 text-base font-semibold transition-all shadow-lg',
            !amountA || !positionId || isSubmitting
              ? 'bg-surface3 text-neutral3 shadow-none'
              : 'bg-accent1 text-ink hover:bg-accent1Hovered hover:shadow-xl hover:-translate-y-0.5',
          ].join(' ')}
        >
          {isSubmitting ? 'Joining…' : 'Add Liquidity'}
        </button>
      </div>
    </div>
  )
}

JoinModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  auction: PropTypes.object,
  onClose: PropTypes.func.isRequired,
}

JoinModal.defaultProps = {
  auction: null,
}

export default JoinModal
