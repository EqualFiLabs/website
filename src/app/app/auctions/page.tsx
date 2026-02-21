"use client";
import type { PoolConfig, Auction, PositionNFT, TokenInfo, ParticipatingPosition } from '@/types'

import { useState, useMemo, useEffect } from 'react'
import { useAccount } from 'wagmi'
import useBufferedWriteContract from '@/lib/hooks/useBufferedWriteContract'
import useActivePublicClient from '@/lib/hooks/useActivePublicClient'
import useAuctions from '@/lib/hooks/useAuctions'
import usePositionNFTs from '@/lib/hooks/usePositionNFTs'
import CreateAuctionForm from '@/components/create/CreateAuctionForm'
import useCreateAuction from '@/lib/hooks/useCreateAuction'
import AuctionCard from '@/components/pool/AuctionCard'
import JoinModal from '@/components/pool/JoinModal'
import SoloAddLiquidityModal from '@/components/pool/SoloAddLiquidityModal'
import ExitModal from '@/components/pool/ExitModal'
import ConfirmationModal from '@/components/common/ConfirmationModal'
import { useToasts } from '@/components/common/ToastProvider'
import usePoolsConfig from '@/lib/hooks/usePoolsConfig'
import useExplorerUrl from '@/lib/hooks/useExplorerUrl'
import { ammAuctionFacetAbi } from '@/lib/abis/ammAuctionFacet'
import { communityAuctionFacetAbi } from '@/lib/abis/communityAuctionFacet'
import { AppShell } from '../../app-shell'

function AuctionManagementPage() {
  const { address, isConnected } = useAccount()
  const publicClient = useActivePublicClient()
  const { writeContractAsync } = useBufferedWriteContract()
  const { addToast } = useToasts()
  const { auctions, refresh } = useAuctions()
  const { nfts } = usePositionNFTs()
  const createForm = useCreateAuction()

  useEffect(() => {
    if (createForm?.successId === null || createForm?.successId === undefined) return
    refresh()
    setView('list')
  }, [createForm?.successId, refresh])
  const poolsConfig = usePoolsConfig()
  const { buildTxUrl } = useExplorerUrl()

  const [view, setView] = useState<'list' | 'create'>('list')
  const [filter, setFilter] = useState<'all' | 'solo' | 'community' | 'inactive' | 'mine'>('all')
  const [joinTarget, setJoinTarget] = useState<Auction | null>(null)
  const [soloAddTarget, setSoloAddTarget] = useState<Auction | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Auction | null>(null)
  const [isCancelling, setIsCancelling] = useState<boolean>(false)
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(() => new Set())
  const [exitTarget, setExitTarget] = useState<Auction | null>(null)
  const [isExiting, setIsExiting] = useState<boolean>(false)

  const ownedNftIds = useMemo(
    () => new Set((nfts || []).map((nft: PositionNFT) => String(nft.tokenId))),
    [nfts],
  )

  const displayedAuctions = useMemo(() => {
    const now = Date.now()
    const isInactive = (auction: Auction): boolean =>
      inactiveIds.has(`${auction.type || 'auction'}-${auction.id}`) ||
      (auction as any).active === false ||
      (auction as any).finalized === true ||
      auction.endsAt <= now

    if (filter === 'all') return auctions.filter((auction: Auction) => !isInactive(auction))
    if (filter === 'inactive') {
      return auctions.filter((auction: Auction) => isInactive(auction))
    }
    if (!address || !nfts) return []

    return auctions.filter((auction: Auction) => {
      return ownedNftIds.has(String(auction.makerPositionId)) && !isInactive(auction)
    })
  }, [auctions, nfts, address, filter, inactiveIds, ownedNftIds])

  const handleAdd = (auction: Auction) => {
    if (auction?.type === 'community') {
      setJoinTarget(auction)
      return
    }
    setSoloAddTarget(auction)
  }

  const handleCancel = (auction: Auction) => {
    setCancelTarget(auction)
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    setIsCancelling(true)

    try {
      if (!publicClient || !writeContractAsync) throw new Error('Wallet client unavailable')
      if (!isConnected || !address) throw new Error('Connect wallet to cancel')

      const poolA = poolsConfig.pools.find((pool: PoolConfig) => Number(pool.pid) === Number(cancelTarget.poolIdA))
      const diamondAddress = (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || poolA?.lendingPoolAddress || '').trim()
      if (!diamondAddress) throw new Error('Diamond address missing')

      const isCommunity = cancelTarget.type === 'community'
      const abi = isCommunity ? communityAuctionFacetAbi : ammAuctionFacetAbi
      const functionName = isCommunity ? 'cancelCommunityAuction' : 'cancelAuction'

      const txHash = await writeContractAsync({
        address: diamondAddress as `0x${string}`,
        abi,
        functionName,
        args: [BigInt(cancelTarget.id)],
      })

      addToast({
        title: 'Cancel submitted',
        description: 'Waiting for confirmation…',
        type: 'pending',
        link: buildTxUrl(txHash),
      })

      await publicClient!.waitForTransactionReceipt({ hash: txHash })
      addToast({
        title: 'Auction cancelled',
        description: `Auction #${cancelTarget.id} stopped`,
        type: 'success',
        link: buildTxUrl(txHash),
      })
      setInactiveIds((prev: Set<string>) => {
        const next = new Set(prev)
        next.add(`${cancelTarget.type || 'auction'}-${cancelTarget.id}`)
        return next
      })
      refresh()
      setCancelTarget(null)
    } catch (err) {
      console.error(err)
      addToast({
        title: 'Cancel failed',
        description: (err as Error).message || 'Transaction reverted',
        type: 'error',
      })
    } finally {
      setIsCancelling(false)
    }
  }

  const handleExit = (auction: Auction, positions: ParticipatingPosition[]) => {
    setExitTarget({ ...auction, participatingPositions: positions })
  }

  const confirmExit = async (positionId: string) => {
    if (!exitTarget || !positionId) return
    setIsExiting(true)

    try {
      if (!publicClient || !writeContractAsync) throw new Error('Wallet client unavailable')
      if (!isConnected || !address) throw new Error('Connect wallet to exit')

      const poolA = poolsConfig.pools.find((pool: PoolConfig) => Number(pool.pid) === Number(exitTarget.poolIdA))
      const diamondAddress = (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || poolA?.lendingPoolAddress || '').trim()
      if (!diamondAddress) throw new Error('Diamond address missing')

      const txHash = await writeContractAsync({
        address: diamondAddress as `0x${string}`,
        abi: communityAuctionFacetAbi,
        functionName: 'leaveCommunityAuction',
        args: [BigInt(exitTarget.id), BigInt(positionId)],
      })

      addToast({
        title: 'Exit submitted',
        description: 'Waiting for confirmation…',
        type: 'pending',
        link: buildTxUrl(txHash),
      })

      await publicClient!.waitForTransactionReceipt({ hash: txHash })
      addToast({
        title: 'Exited Auction',
        description: `Left Community Auction #${exitTarget.id}`,
        type: 'success',
        link: buildTxUrl(txHash),
      })
      refresh()
      setExitTarget(null)
    } catch (err) {
      console.error(err)
      addToast({
        title: 'Exit failed',
        description: (err as Error).message || 'Transaction reverted',
        type: 'error',
      })
    } finally {
      setIsExiting(false)
    }
  }

  return (
    <AppShell title="Auctions">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral1">Auction Management</h1>
            <p className="text-neutral2">Manage your liquidity positions and auction lifecycles.</p>
          </div>
          <div className="flex gap-2 bg-surface2 p-1 rounded-full overflow-x-auto">
            <button
              onClick={() => {
                setView('list')
                setFilter('all')
              }}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                view === 'list' && filter === 'all' ? 'bg-surface1 text-neutral1 shadow-sm' : 'text-neutral2 hover:text-neutral1'
              }`}
            >
              All Auctions
            </button>
            <button
              onClick={() => {
                setView('list')
                setFilter('mine')
              }}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                view === 'list' && filter === 'mine' ? 'bg-surface1 text-neutral1 shadow-sm' : 'text-neutral2 hover:text-neutral1'
              }`}
            >
              My Auctions
            </button>
            <button
              onClick={() => setView('create')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                view === 'create' ? 'bg-surface1 text-neutral1 shadow-sm' : 'text-neutral2 hover:text-neutral1'
              }`}
            >
              Create New
            </button>
          </div>
        </div>

        {view === 'create' && (
          <div className="rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-6 text-neutral1">Create Auction</h2>
            <CreateAuctionForm
              state={createForm.state}
              setField={createForm.setField}
              validation={createForm.validation}
              isSubmitting={createForm.isSubmitting}
              successId={createForm.successId}
              onSubmit={createForm.submit}
              error={createForm.error}
            />
          </div>
        )}

        {view === 'list' && (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {displayedAuctions.length === 0 ? (
              <div className="col-span-full py-20 text-center text-neutral3 border border-dashed border-surface2 rounded-3xl bg-surface1/50">
                <p>No auctions found.</p>
                {filter === 'mine' && (
                  <button onClick={() => setView('create')} className="mt-4 text-accent1 hover:underline font-semibold">
                    Create one now
                  </button>
                )}
              </div>
            ) : (
              displayedAuctions.map((auction: Auction) => (
                <AuctionCard
                  key={`${auction.type || 'auction'}-${auction.id}`}
                  auction={auction}
                  canAddLiquidity={ownedNftIds.has(String(auction.makerPositionId))}
                  onCancel={handleCancel}
                  onJoin={handleAdd}
                  onAdd={handleAdd}
                  onExit={handleExit}
                />
              ))
            )}
          </div>
        )}

        <JoinModal isOpen={Boolean(joinTarget)} auction={joinTarget} onClose={() => setJoinTarget(null)} />
        <SoloAddLiquidityModal
          isOpen={Boolean(soloAddTarget)}
          auction={soloAddTarget}
          onClose={() => setSoloAddTarget(null)}
          onSuccess={() => refresh()}
        />
        <ExitModal
          isOpen={Boolean(exitTarget)}
          auction={exitTarget}
          participatingPositions={exitTarget?.participatingPositions}
          isExiting={isExiting}
          onClose={() => setExitTarget(null)}
          onConfirm={confirmExit}
        />
        <ConfirmationModal
          isOpen={Boolean(cancelTarget)}
          title="Cancel Auction"
          description={
            cancelTarget
              ? `Are you sure you want to cancel auction #${cancelTarget.id}? This will finalize the auction and unlock reserves.`
              : ''
          }
          confirmLabel={isCancelling ? 'Cancelling…' : 'Cancel Auction'}
          isConfirming={isCancelling}
          onConfirm={confirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      </div>
    </AppShell>
  )
}

export default AuctionManagementPage
