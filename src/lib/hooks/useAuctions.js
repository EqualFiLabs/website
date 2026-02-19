import { useEffect, useMemo, useState } from 'react'
import { formatUnits } from 'viem'
import { useAccount } from 'wagmi'
import { ammAuctionFacetAbi } from '../abis/ammAuctionFacet'
import { communityAuctionFacetAbi } from '../abis/communityAuctionFacet'
import useActivePublicClient from './useActivePublicClient'
import useActiveChainId from './useActiveChainId'
import usePoolsConfig from './usePoolsConfig'
import usePositionNFTs from './usePositionNFTs'

function useAuctions() {
  const { address } = useAccount()
  const publicClient = useActivePublicClient()
  const activeChainId = useActiveChainId()
  const poolsConfig = usePoolsConfig()
  const { nfts } = usePositionNFTs()
  const [activeTab, setActiveTab] = useState('all') // all | mine
  const [page, setPage] = useState(1)
  const pageSize = 5
  const [auctions, setAuctions] = useState([])
  const [liveAuctions, setLiveAuctions] = useState({})
  const [refreshIndex, setRefreshIndex] = useState(0)

  const poolMeta = useMemo(() => {
    const byPid = new Map()
    const byAddress = new Map()
    ;(poolsConfig.pools || []).forEach((pool) => {
      const pid = Number(pool.pid)
      const tokenAddress = (pool.tokenAddress || '').toLowerCase()
      const entry = {
        pid,
        ticker: pool.ticker ?? '—',
        decimals: pool.decimals ?? 18,
        tokenAddress,
      }
      if (Number.isFinite(pid)) byPid.set(pid, entry)
      if (tokenAddress) byAddress.set(tokenAddress, entry)
    })
    return { byPid, byAddress }
  }, [poolsConfig])

  const fetchAuctionsApi = async () => {
    const chainId = activeChainId ? `&chainId=${activeChainId}` : ''
    const res = await fetch(`/api/auctions?scope=all${chainId}`)
    if (!res.ok) {
      throw new Error(`Auctions API error (${res.status})`)
    }
    const payload = await res.json()
    return payload.auctions || []
  }

  useEffect(() => {
    let cancelled = false
    const fetchAuctions = async () => {
      try {
        const created = await fetchAuctionsApi()
        const items = []
        for (const entry of created) {
          const raw = entry.raw || {}
          const auctionId = Number(entry.id ?? raw.auctionId ?? 0)
          const poolIdA = Number(entry.pool_id_a ?? raw.poolIdA ?? raw?.args?.poolIdA ?? 0)
          const poolIdB = Number(entry.pool_id_b ?? raw.poolIdB ?? raw?.args?.poolIdB ?? 0)
          const poolA = poolMeta.byPid.get(poolIdA)
          const poolB = poolMeta.byPid.get(poolIdB)
          const tokenAAddress = (entry.token_a || raw.tokenA || '').toString().toLowerCase()
          const tokenBAddress = (entry.token_b || raw.tokenB || '').toString().toLowerCase()
          const tokenA = poolA?.ticker || poolMeta.byAddress.get(tokenAAddress)?.ticker || '—'
          const tokenB = poolB?.ticker || poolMeta.byAddress.get(tokenBAddress)?.ticker || '—'
          const decimalsA = poolA?.decimals ?? poolMeta.byAddress.get(tokenAAddress)?.decimals ?? 18
          const decimalsB = poolB?.decimals ?? poolMeta.byAddress.get(tokenBAddress)?.decimals ?? 18

          const reserveARaw = BigInt(entry.reserve_a || raw.reserveA || 0)
          const reserveBRaw = BigInt(entry.reserve_b || raw.reserveB || 0)
          const startTime = Number(entry.start_time || raw.startTime || 0)
          const endTime = Number(entry.end_time || raw.endTime || 0)
          const feeBps = Number(entry.fee_bps ?? raw.feeBps ?? 0)
          const active = Boolean(entry.active ?? raw.active)
          const finalized = Boolean(entry.finalized ?? raw.finalized)
          const makerFeeA = 0n
          const makerFeeB = 0n
          const totalShares = 0n
          const feeIndexA = 0n
          const feeIndexB = 0n
          const makers = null
          const makerIdRaw =
            entry.maker_position_id ??
            raw.makerPositionId ??
            raw.creatorPositionId ??
            raw?.args?.makerPositionId ??
            raw?.args?.creatorPositionId ??
            0

          items.push({
            id: auctionId,
            tokenA,
            tokenB,
            tokenAAddress,
            tokenBAddress,
            poolIdA,
            poolIdB,
            reserveARaw,
            reserveBRaw,
            reserveA: Number(formatUnits(reserveARaw, decimalsA)),
            reserveB: Number(formatUnits(reserveBRaw, decimalsB)),
            decimalsA,
            decimalsB,
            feeBps,
            active,
            finalized,
            startsAt: startTime * 1000,
            endsAt: endTime * 1000,
            type: entry.type || raw.auctionType || 'solo',
            makers,
            makerPositionId: Number(makerIdRaw),
            makerFeeA: Number(formatUnits(makerFeeA || 0n, decimalsA)),
            makerFeeB: Number(formatUnits(makerFeeB || 0n, decimalsB)),
            totalShares,
            feeIndexA,
            feeIndexB,
          })
        }

        if (!cancelled) {
          setAuctions(items)
        }
      } catch (err) {
        console.error('Failed to fetch auctions from API', err)
        if (!cancelled) {
          setAuctions([])
        }
      }
    }

    fetchAuctions()
    return () => {
      cancelled = true
    }
  }, [poolMeta, refreshIndex, activeChainId])

  useEffect(() => {
    let cancelled = false
    const fetchLive = async () => {
      if (!publicClient) {
        console.info('onchain auction reserves skipped: public client unavailable')
        const nextLive = {}
        auctions.forEach((auction) => {
          nextLive[`${auction.type || 'auction'}-${auction.id}`] = {
            reserveARaw: auction.reserveARaw,
            reserveBRaw: auction.reserveBRaw,
            reserveA: auction.reserveA,
            reserveB: auction.reserveB,
            displayReserveA: null,
            displayReserveB: null,
            displayFeeBps: null,
            liveReserveError: true,
            liveFeeError: true,
            displayMakerFeeA: null,
            displayMakerFeeB: null,
            displayFeeIndexA: null,
            displayFeeIndexB: null,
            displayTotalShares: null,
          }
        })
        setLiveAuctions(nextLive)
        return
      }
      if (!auctions.length) {
        setLiveAuctions({})
        return
      }
          const getField = (entry, key, index) =>
            entry && entry[key] !== undefined ? entry[key] : entry?.[index]
          const updates = await Promise.all(
            auctions.map(async (auction) => {
          const poolA = poolMeta.byPid.get(Number(auction.poolIdA))
          const diamondAddress =
            (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || poolA?.lendingPoolAddress || '').trim()
          if (!diamondAddress) {
            console.info('onchain auction reserves skipped: diamond address missing', {
              auctionId: auction.id,
              type: auction.type,
            })
            return {
              key: `${auction.type || 'auction'}-${auction.id}`,
              next: {
                reserveARaw: auction.reserveARaw,
                reserveBRaw: auction.reserveBRaw,
                reserveA: auction.reserveA,
                reserveB: auction.reserveB,
                displayReserveA: null,
                displayReserveB: null,
                displayFeeBps: null,
                liveReserveError: true,
                liveFeeError: true,
                displayMakerFeeA: null,
                displayMakerFeeB: null,
                displayFeeIndexA: null,
                displayFeeIndexB: null,
                displayTotalShares: null,
              },
            }
          }
          const isCommunity = auction.type === 'community'
          try {
            const onchain = await publicClient.readContract({
              address: diamondAddress,
              abi: isCommunity ? communityAuctionFacetAbi : ammAuctionFacetAbi,
              functionName: isCommunity ? 'getCommunityAuction' : 'getAuction',
              args: [BigInt(auction.id)],
            })
            const reserveARaw = getField(onchain, 'reserveA', 6)
            const reserveBRaw = getField(onchain, 'reserveB', 7)
            console.info('onchain auction reserves', {
              auctionId: auction.id,
              type: auction.type,
              reserveARaw: reserveARaw?.toString?.() ?? String(reserveARaw),
              reserveBRaw: reserveBRaw?.toString?.() ?? String(reserveBRaw),
            })
            const feeBps = Number(getField(onchain, 'feeBps', 8) ?? auction.feeBps)
            console.info('onchain auction fee bps', {
              auctionId: auction.id,
              type: auction.type,
              feeBps,
            })
            const active = Boolean(getField(onchain, 'active', isCommunity ? 24 : 19))
            const finalized = Boolean(getField(onchain, 'finalized', isCommunity ? 25 : 20))
            const endTime = getField(onchain, 'endTime', isCommunity ? 23 : 12)
            const hasReserveA = reserveARaw !== undefined && reserveARaw !== null
            const hasReserveB = reserveBRaw !== undefined && reserveBRaw !== null
            const next = {
              reserveARaw: hasReserveA ? reserveARaw : auction.reserveARaw,
              reserveBRaw: hasReserveB ? reserveBRaw : auction.reserveBRaw,
              reserveA: hasReserveA
                ? Number(formatUnits(reserveARaw, auction.decimalsA ?? 18))
                : auction.reserveA,
              reserveB: hasReserveB
                ? Number(formatUnits(reserveBRaw, auction.decimalsB ?? 18))
                : auction.reserveB,
              displayReserveA: hasReserveA
                ? Number(formatUnits(reserveARaw, auction.decimalsA ?? 18))
                : null,
              displayReserveB: hasReserveB
                ? Number(formatUnits(reserveBRaw, auction.decimalsB ?? 18))
                : null,
              displayFeeBps: Number.isFinite(feeBps) ? feeBps : null,
              feeBps,
              active,
              finalized,
              endsAt: endTime ? Number(endTime) * 1000 : auction.endsAt,
            }
            if (isCommunity) {
              next.displayFeeIndexA = getField(onchain, 'feeIndexA', 10)
              next.displayFeeIndexB = getField(onchain, 'feeIndexB', 11)
              next.displayTotalShares = getField(onchain, 'totalShares', 20)
              next.makerCount = getField(onchain, 'makerCount', 21)
              console.info('onchain community fee indexes', {
                auctionId: auction.id,
                feeIndexA: next.displayFeeIndexA?.toString?.() ?? String(next.displayFeeIndexA),
                feeIndexB: next.displayFeeIndexB?.toString?.() ?? String(next.displayFeeIndexB),
                totalShares: next.displayTotalShares?.toString?.() ?? String(next.displayTotalShares),
              })
            } else {
              const makerFeeAAccrued = getField(onchain, 'makerFeeAAccrued', 15)
              const makerFeeBAccrued = getField(onchain, 'makerFeeBAccrued', 16)
              next.displayMakerFeeA = makerFeeAAccrued
                ? Number(formatUnits(makerFeeAAccrued, auction.decimalsA ?? 18))
                : 0
              next.displayMakerFeeB = makerFeeBAccrued
                ? Number(formatUnits(makerFeeBAccrued, auction.decimalsB ?? 18))
                : 0
              console.info('onchain auction maker fees', {
                auctionId: auction.id,
                makerFeeAAccrued: makerFeeAAccrued?.toString?.() ?? String(makerFeeAAccrued),
                makerFeeBAccrued: makerFeeBAccrued?.toString?.() ?? String(makerFeeBAccrued),
              })
            }
            return {
              key: `${auction.type || 'auction'}-${auction.id}`,
              next,
            }
          } catch (err) {
            console.error('Failed to fetch live auction', { auctionId: auction.id, err })
            return {
              key: `${auction.type || 'auction'}-${auction.id}`,
              next: {
                reserveARaw: auction.reserveARaw,
                reserveBRaw: auction.reserveBRaw,
                reserveA: auction.reserveA,
                reserveB: auction.reserveB,
                displayReserveA: null,
                displayReserveB: null,
                displayFeeBps: null,
                liveReserveError: true,
                liveFeeError: true,
                displayMakerFeeA: null,
                displayMakerFeeB: null,
                displayFeeIndexA: null,
                displayFeeIndexB: null,
                displayTotalShares: null,
              },
            }
          }
        }),
      )

      if (cancelled) return
      const nextLive = {}
      updates.forEach((entry) => {
        if (entry) nextLive[entry.key] = entry.next
      })
      setLiveAuctions(nextLive)
    }

    fetchLive()
    return () => {
      cancelled = true
    }
  }, [auctions, poolMeta, publicClient])

  const auctionsWithLive = useMemo(
    () =>
      auctions.map((auction) => {
        const key = `${auction.type || 'auction'}-${auction.id}`
        const live = liveAuctions[key]
        return live ? { ...auction, ...live } : auction
      }),
    [auctions, liveAuctions],
  )

  const filtered = useMemo(() => {
    if (activeTab === 'mine') {
      if (!address) return []
      const ownedIds = new Set((nfts || []).map((nft) => String(nft.tokenId)))
      return auctionsWithLive.filter((auction) => ownedIds.has(String(auction.makerPositionId)))
    }
    return auctionsWithLive
  }, [activeTab, address, auctionsWithLive, nfts])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const selectTab = (tab) => {
    setActiveTab(tab)
    setPage(1)
  }

  const refresh = () => {
    setRefreshIndex((prev) => prev + 1)
  }

  return {
    auctions: filtered,
    activeTab,
    selectTab,
    page,
    setPage,
    totalPages,
    paged,
    refresh,
  }
}

export default useAuctions
