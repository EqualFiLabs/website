import { useEffect, useMemo, useState } from 'react'
import { erc20Abi, formatUnits, parseUnits, maxUint256 } from 'viem'
import { useAccount, useWriteContract } from 'wagmi'
import usePoolsConfig from './usePoolsConfig'
import useActivePublicClient from './useActivePublicClient'
import {
  configViewFacetAbi,
  multiPoolPositionViewFacetAbi,
  positionNFTAbi,
  positionViewFacetAbi,
  positionManagementFacetAbi,
} from '../abis/positionNFT'
import { derivativeViewFacetAbi } from '../abis/derivativeViewFacet'
import { equalLendDirectViewFacetAbi } from '../abis/equalLendDirectViewFacet'
import { activeCreditViewFacetAbi } from '../abis/activeCreditViewFacet'
import { ZERO_ADDRESS } from '../address'

const normalizePoolsConfig = (pools) => {
  const safePools = Array.isArray(pools) ? pools : []
  const options = safePools.map((pool) => pool.id).filter(Boolean)
  const meta = Object.fromEntries(
    safePools
      .map((pool, idx) => [
        pool.id,
        {
          name: pool.tokenName ?? pool.id,
          ticker: pool.ticker ?? '—',
          tokenAddress: (pool.tokenAddress ?? '').toLowerCase(),
          lendingPoolAddress: pool.lendingPoolAddress ?? '',
          pid: typeof pool.pid === 'number' ? pool.pid : Number(pool.pid ?? idx),
          decimals: typeof pool.decimals === 'number' ? pool.decimals : Number(pool.decimals ?? 18),
          depositorLTVBps:
            typeof pool.depositorLTVBps === 'number'
              ? pool.depositorLTVBps
              : Number(pool.depositorLTVBps ?? 0),
        },
      ])
      .filter(([id]) => Boolean(id)),
  )

  return { options, meta }
}

function usePositionNFTs() {
  const publicClient = useActivePublicClient()
  const { address } = useAccount()
  const poolsConfig = usePoolsConfig()
  const { options: poolOptions, meta: basePoolMeta } = useMemo(
    () => normalizePoolsConfig(poolsConfig?.pools),
    [poolsConfig],
  )
  const [poolMeta, setPoolMeta] = useState(basePoolMeta)
  const positionNFTAddress =
    process.env.NEXT_PUBLIC_POSITION_NFT || poolsConfig?.positionNFTAddress || ZERO_ADDRESS
  const diamondAddress =
    process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || basePoolMeta[poolOptions[0]]?.lendingPoolAddress || ZERO_ADDRESS

  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    setPoolMeta(basePoolMeta)
  }, [basePoolMeta])

  const isSelectorMissing = (err) => {
    const message = err?.shortMessage || err?.message || ''
    return message.toLowerCase().includes('selector not found')
  }

  const extractDepositorLtvBps = (value) => {
    if (!value) return null
    if (Array.isArray(value)) return value[3]
    if (typeof value === 'object' && 'depositorLTVBps' in value) return value.depositorLTVBps
    return null
  }

  const extractDirectState = (value) => {
    if (!value) return null
    if (Array.isArray(value)) {
      return { locked: value[0] ?? 0n, lent: value[1] ?? 0n }
    }
    if (typeof value === 'object') {
      return {
        locked: value.locked ?? value.directLockedPrincipal ?? value[0] ?? 0n,
        lent: value.lent ?? value.directLentPrincipal ?? value[1] ?? 0n,
      }
    }
    return null
  }

  const extractEncumbrance = (value) => {
    if (!value) return null
    const hasDirectLent =
      (typeof value === 'object' && value !== null && 'directLent' in value) ||
      (Array.isArray(value) && value.length > 4)
    const directLocked = value.directLocked ?? value[0] ?? 0n
    const directLent = value.directLent ?? (hasDirectLent && Array.isArray(value) ? value[1] : 0n)
    const directOfferEscrow =
      value.directOfferEscrow ?? (Array.isArray(value) ? value[hasDirectLent ? 2 : 1] : 0n)
    const indexEncumbered =
      value.indexEncumbered ?? (Array.isArray(value) ? value[hasDirectLent ? 3 : 2] : 0n)
    const totalEncumbered =
      value.totalEncumbered ??
      (Array.isArray(value) ? value[hasDirectLent ? 4 : 3] : directLocked + directOfferEscrow + indexEncumbered + directLent)
    return { directLocked, directLent, directOfferEscrow, indexEncumbered, totalEncumbered }
  }

  const extractAuctionPage = (value) => {
    if (!value) return { ids: [], total: 0n }
    if (Array.isArray(value)) {
      return { ids: value[0] || [], total: value[1] || 0n }
    }
    return { ids: value.ids || value[0] || [], total: value.total || value[1] || 0n }
  }

  const fetchAuctionEncumbered = async (tokenIds, positionKeys) => {
    const encumbered = new Map()
    if (!publicClient || !diamondAddress || diamondAddress === ZERO_ADDRESS) return encumbered
    if (!tokenIds?.length) return encumbered

    const limit = 200n
    const tokenIdSet = new Set(tokenIds.map((id) => id.toString()))
    const addEncumbered = (tokenIdStr, poolId, amount) => {
      if (!amount || amount === 0n) return
      const key = `${tokenIdStr}-${Number(poolId)}`
      encumbered.set(key, (encumbered.get(key) || 0n) + amount)
    }
    const keyToTokenId = new Map()
    if (positionKeys) {
      Object.entries(positionKeys).forEach(([tokenIdStr, key]) => {
        if (key) keyToTokenId.set(key.toLowerCase(), tokenIdStr)
      })
    }

    await Promise.all(
      tokenIds.map(async (tokenId) => {
        const tokenIdStr = tokenId.toString()
        const positionKey = positionKeys?.[tokenIdStr]
        try {
          const pageRaw = await publicClient.readContract({
            address: diamondAddress,
            abi: derivativeViewFacetAbi,
            functionName: positionKey ? 'getAuctionsByPosition' : 'getAuctionsByPositionId',
            args: positionKey ? [positionKey, 0n, limit] : [tokenId, 0n, limit],
          })
          const page = extractAuctionPage(pageRaw)
          if (!page.ids?.length) return

          const auctionResults = await Promise.allSettled(
            page.ids.map((auctionId) =>
              publicClient.readContract({
                address: diamondAddress,
                abi: derivativeViewFacetAbi,
                functionName: 'getAmmAuction',
                args: [auctionId],
              }),
            ),
          )

          auctionResults.forEach((result) => {
            if (result.status !== 'fulfilled') return
            const auction = result.value
            if (!auction?.active || auction?.finalized) return
            addEncumbered(tokenIdStr, auction.poolIdA, auction.reserveA ?? 0n)
            addEncumbered(tokenIdStr, auction.poolIdB, auction.reserveB ?? 0n)
          })
        } catch (err) {
          if (!isSelectorMissing(err)) {
            console.warn('Failed to load position auctions', err)
          }
        }
      }),
    )

    if (keyToTokenId.size > 0) {
      try {
        const activeRaw = await publicClient.readContract({
          address: diamondAddress,
          abi: derivativeViewFacetAbi,
          functionName: 'getActiveAuctions',
          args: [0n, limit],
        })
        const activePage = extractAuctionPage(activeRaw)
        const activeResults = await Promise.allSettled(
          (activePage.ids || []).map((auctionId) =>
            publicClient.readContract({
              address: diamondAddress,
              abi: derivativeViewFacetAbi,
              functionName: 'getAmmAuction',
              args: [auctionId],
            }),
          ),
        )
        activeResults.forEach((result) => {
          if (result.status !== 'fulfilled') return
          const auction = result.value
          if (!auction?.active || auction?.finalized) return
          let tokenIdStr = null
          if (auction?.makerPositionId !== undefined && auction?.makerPositionId !== null) {
            const makerIdStr = auction.makerPositionId.toString()
            if (tokenIdSet.has(makerIdStr)) tokenIdStr = makerIdStr
          }
          if (!tokenIdStr) {
            tokenIdStr = keyToTokenId.get(String(auction.makerPositionKey).toLowerCase())
          }
          if (!tokenIdStr) return
          addEncumbered(tokenIdStr, auction.poolIdA, auction.reserveA ?? 0n)
          addEncumbered(tokenIdStr, auction.poolIdB, auction.reserveB ?? 0n)
        })
      } catch (err) {
        if (!isSelectorMissing(err)) {
          console.warn('Failed to scan active auctions', err)
        }
      }
    }

    return encumbered
  }

  useEffect(() => {
    let cancelled = false

    const loadPoolConfig = async () => {
      if (!publicClient || !diamondAddress || diamondAddress === ZERO_ADDRESS) return
      const entries = Object.entries(basePoolMeta).filter(([, meta]) => meta?.pid !== undefined && meta?.pid !== null)
      if (entries.length === 0) return

      const results = await Promise.allSettled(
        entries.map(([, meta]) =>
          publicClient.readContract({
            address: diamondAddress,
            abi: configViewFacetAbi,
            functionName: 'getPoolConfigSummary',
            args: [BigInt(meta.pid)],
          }),
        ),
      )

      if (cancelled) return

      let changed = false
      const nextMeta = { ...basePoolMeta }

      results.forEach((result, idx) => {
        if (result.status !== 'fulfilled') return
        const ltvRaw = extractDepositorLtvBps(result.value)
        if (ltvRaw === null || ltvRaw === undefined) return
        const ltvBps = Number(ltvRaw)
        if (!Number.isFinite(ltvBps)) return
        const poolId = entries[idx][0]
        if (nextMeta[poolId]?.depositorLTVBps !== ltvBps) {
          nextMeta[poolId] = { ...nextMeta[poolId], depositorLTVBps: ltvBps }
          changed = true
        }
      })

      if (changed) setPoolMeta(nextMeta)
    }

    loadPoolConfig().catch((err) => {
      if (!isSelectorMissing(err)) {
        console.warn('Failed to load pool config', err)
      }
    })

    return () => {
      cancelled = true
    }
  }, [publicClient, diamondAddress, basePoolMeta])

  const formatPosition = (
    tokenId,
    poolId,
    state,
    membership,
    positionKey,
    directByAsset = null,
    poolDebtRawOverride = null,
    aciYieldRaw = 0n,
    directData = {},
  ) => {
    const { directState, encumbrance, auctionEncumberedRaw = 0n } = directData
    const tokenIdStr = tokenId.toString()
    const pidNum = Number(poolId ?? state.poolId ?? 0)
    const baseKey = positionKey || ''
    const resolvedPositionKey = `${baseKey || tokenIdStr}-${pidNum}`
    const poolEntry = Object.entries(poolMeta).find(([_, meta]) => meta.pid === pidNum)
    const poolName = poolEntry ? poolEntry[0] : `Pool ${pidNum}`
    const poolDetails = poolEntry ? poolEntry[1] : {}
    const ticker = poolDetails.ticker || '???'
    const decimals = poolDetails.decimals || 18

    const principal = formatUnits(state.principal, decimals)
    const accruedYield = formatUnits(state.accruedYield, decimals)
    const aciYield = formatUnits(aciYieldRaw, decimals)
    const assetAddress = poolDetails.tokenAddress?.toLowerCase()
    const assetSummary = assetAddress ? directByAsset?.get(assetAddress) : null
    const directLockedRaw = assetSummary?.locked ?? 0n
    const directLentRaw = assetSummary?.lent ?? 0n
    const directCommittedRaw = directLockedRaw + directLentRaw
    const encumbranceLockedRaw = encumbrance?.directLocked ?? directState?.locked ?? directLockedRaw
    const encumbranceTotalRaw = encumbrance?.totalEncumbered ?? encumbranceLockedRaw ?? 0n
    const offerEscrowRaw = encumbrance?.directOfferEscrow ?? 0n
    const fallbackLentRaw = directLentRaw + auctionEncumberedRaw
    let encumbranceLentRaw = directState?.lent ?? fallbackLentRaw
    if (directState?.lent !== undefined && directState?.lent !== null) {
      encumbranceLentRaw = directState.lent > offerEscrowRaw ? directState.lent - offerEscrowRaw : 0n
    }
    if (auctionEncumberedRaw > encumbranceLentRaw) {
      encumbranceLentRaw = auctionEncumberedRaw
    }
    const encumbranceHasDirectLent = encumbrance?.directLent !== undefined && encumbrance?.directLent !== null
    let totalEncumberedRaw = encumbranceTotalRaw
    if (encumbranceHasDirectLent) {
      const baseLent = encumbrance.directLent ?? 0n
      if (auctionEncumberedRaw > baseLent) {
        totalEncumberedRaw += auctionEncumberedRaw - baseLent
      }
    } else {
      totalEncumberedRaw += encumbranceLentRaw
    }
    const poolDebtRaw =
      poolDebtRawOverride ?? (state.totalDebt > directCommittedRaw ? state.totalDebt - directCommittedRaw : 0n)
    const totalDebt = formatUnits(poolDebtRaw, decimals)
    const rollingDebt = state.rollingLoan.active ? state.rollingLoan.principalRemaining : 0n
    const rollingCredit = state.rollingLoan.active ? formatUnits(rollingDebt, decimals) : '0'
    const fixedTermLoans = formatUnits(poolDebtRaw > rollingDebt ? poolDebtRaw - rollingDebt : 0n, decimals)
    const totalEncumbered = Number(formatUnits(totalEncumberedRaw, decimals)).toLocaleString(undefined, {
      maximumFractionDigits: decimals > 6 ? 6 : decimals,
    })

    return {
      tokenId: tokenIdStr,
      selectionKey: `${tokenIdStr}-${pidNum}`,
      positionKey: resolvedPositionKey,
      positionAddress: baseKey,
      poolId: pidNum,
      poolName,
      ticker,
      decimals,
      principal: Number(principal).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals,
      }),
      totalLiabilities: Number(totalDebt).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals,
      }),
      accruedYield: Number(accruedYield).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals,
      }),
      aciYield: Number(aciYield).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals,
      }),
      rollingCredit: Number(rollingCredit).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals,
      }),
      fixedTermLoans: Number(fixedTermLoans).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals,
      }),
      directLocked: Number(formatUnits(directLockedRaw, decimals)).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals,
      }),
      directLent: Number(formatUnits(directLentRaw, decimals)).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals,
      }),
      directLentPrincipal: Number(formatUnits(directLentRaw, decimals)).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals,
      }),
      directCommitted: Number(formatUnits(directCommittedRaw, decimals)).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals,
      }),
      totalEncumbered,
      principalRaw: state.principal,
      totalDebtRaw: poolDebtRaw,
      accruedYieldRaw: state.accruedYield,
      aciYieldRaw,
      rollingCreditRaw: state.rollingLoan.principalRemaining,
      rollingLoanActive: state.rollingLoan.active,
      fixedLoanIds: state.fixedLoanIds ?? [],
      directLockedRaw,
      directLentRaw,
      directCommittedRaw,
      totalEncumberedRaw,
      isDelinquent: state.isDelinquent,
      eligibleForPenalty: state.eligibleForPenalty,
      membership: membership || null,
    }
  }

  useEffect(() => {
    let cancelled = false

    const fetchNFTs = async () => {
      if (!publicClient || !address) {
        setNfts([])
        setLoading(false)
        setError(null)
        return
      }

      if (
        !positionNFTAddress ||
        positionNFTAddress === ZERO_ADDRESS ||
        !diamondAddress ||
        diamondAddress === ZERO_ADDRESS
      ) {
        setNfts([])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const balance = await publicClient.readContract({
          address: positionNFTAddress,
          abi: positionNFTAbi,
          functionName: 'balanceOf',
          args: [address],
        })

        if (cancelled) return

        if (balance === 0n) {
          setNfts([])
          setLoading(false)
          return
        }

        const tokenIdPromises = []
        for (let i = 0; i < Number(balance); i++) {
          tokenIdPromises.push(
            publicClient.readContract({
              address: positionNFTAddress,
              abi: positionNFTAbi,
              functionName: 'tokenOfOwnerByIndex',
              args: [address, BigInt(i)],
            }),
          )
        }

        const tokenIds = await Promise.all(tokenIdPromises)

        if (cancelled) return

        const positionKeyResults = await Promise.allSettled(
          tokenIds.map((tokenId) =>
            publicClient.readContract({
              address: positionNFTAddress,
              abi: positionNFTAbi,
              functionName: 'getPositionKey',
              args: [tokenId],
            }),
          ),
        )
        const positionKeyMap = {}
        positionKeyResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            positionKeyMap[tokenIds[idx].toString()] = result.value
          }
        })

        const directSummaryByAssetMap = new Map()

        let auctionEncumberedByPool = new Map()
        try {
          auctionEncumberedByPool = await fetchAuctionEncumbered(tokenIds, positionKeyMap)
        } catch (err) {
          console.warn('Auction encumbrance fetch failed', err)
          auctionEncumberedByPool = new Map()
        }

        let selectorMissingCount = 0
        let membershipSuccessCount = 0
        const membershipsResults = await Promise.allSettled(
          tokenIds.map((tokenId) =>
            publicClient.readContract({
              address: diamondAddress,
              abi: multiPoolPositionViewFacetAbi,
              functionName: 'getPositionPoolMemberships',
              args: [tokenId],
            }),
          ),
        )

        if (cancelled) return

        const stateRequests = []
        const unexpectedErrors = []
        const membershipFound = new Map()

        membershipsResults.forEach((result, index) => {
          if (result.status !== 'fulfilled') {
            const message = result.reason?.shortMessage || result.reason?.message || ''
            if (message.toLowerCase().includes('selector not found')) {
              selectorMissingCount += 1
              return
            }
            if (message.includes('InvalidTokenId')) {
              console.warn(`Skipping invalid position token ${tokenIds[index]}`)
              return
            }
            unexpectedErrors.push(result.reason)
            return
          }

          membershipSuccessCount += 1
          const memberships = (result.value || []).filter((membership) => membership.isMember)
          membershipFound.set(tokenIds[index].toString(), memberships.length > 0)
          memberships.forEach((membership) => {
            stateRequests.push({
              tokenId: tokenIds[index],
              poolId: membership.poolId,
              membership,
            })
          })
        })

        if (unexpectedErrors.length > 0) {
          throw unexpectedErrors[0]
        }

        const positionEntries = []
        const selectorMissing = membershipSuccessCount === 0 && selectorMissingCount > 0

        if (selectorMissing) {
          for (const tokenId of tokenIds) {
            try {
              const poolIdFromNFT = await publicClient.readContract({
                address: positionNFTAddress,
                abi: positionNFTAbi,
                functionName: 'getPoolId',
                args: [tokenId],
              })
              const state = await publicClient.readContract({
                address: diamondAddress,
                abi: positionViewFacetAbi,
                functionName: 'getPositionState',
                args: [tokenId, BigInt(poolIdFromNFT)],
              })
              let poolDebtOverride = null
              try {
                const poolData = await publicClient.readContract({
                  address: diamondAddress,
                  abi: multiPoolPositionViewFacetAbi,
                  functionName: 'getPositionPoolDataPoolOnly',
                  args: [tokenId, BigInt(poolIdFromNFT)],
                })
                poolDebtOverride = poolData?.totalDebt ?? null
              } catch (poolErr) {
                console.warn('Failed to load pool-only debt', poolErr)
              }
              const positionKey = positionKeyMap[tokenId.toString()]
              const byAsset = directSummaryByAssetMap.get(tokenId.toString()) ?? null
              
              let aciYieldRaw = 0n
              try {
                aciYieldRaw = await publicClient.readContract({
                  address: diamondAddress,
                  abi: activeCreditViewFacetAbi,
                  functionName: 'pendingActiveCreditByPosition',
                  args: [BigInt(poolIdFromNFT), tokenId],
                })
              } catch (aciErr) {
                console.warn('Failed to load ACI yield', aciErr)
              }

              let directState = null
              try {
                const directStateRaw = await publicClient.readContract({
                  address: diamondAddress,
                  abi: equalLendDirectViewFacetAbi,
                  functionName: 'getPositionDirectState',
                  args: [tokenId, BigInt(poolIdFromNFT)],
                })
                directState = extractDirectState(directStateRaw)
              } catch (directErr) {
                if (!isSelectorMissing(directErr)) {
                  console.warn('Failed to load direct state', directErr)
                }
              }

              let encumbrance = null
              try {
                const encumbranceRaw = await publicClient.readContract({
                  address: diamondAddress,
                  abi: positionViewFacetAbi,
                  functionName: 'getPositionEncumbrance',
                  args: [tokenId, BigInt(poolIdFromNFT)],
                })
                encumbrance = extractEncumbrance(encumbranceRaw)
              } catch (encErr) {
                if (!isSelectorMissing(encErr)) {
                  console.warn('Failed to load encumbrance', encErr)
                }
              }
              const auctionKey = `${tokenId.toString()}-${Number(poolIdFromNFT)}`
              const auctionEncumberedRaw = auctionEncumberedByPool.get(auctionKey) ?? 0n

              positionEntries.push(
                formatPosition(
                  tokenId,
                  BigInt(poolIdFromNFT),
                  state,
                  null,
                  positionKey,
                  byAsset,
                  poolDebtOverride,
                  aciYieldRaw,
                  { directState, encumbrance, auctionEncumberedRaw },
                ),
              )
              membershipFound.set(tokenId.toString(), true)
            } catch (err) {
              const message = err?.shortMessage || err?.message || ''
              if (message.includes('InvalidTokenId')) {
                console.warn(`Skipping invalid position token ${tokenId}`)
                continue
              }
              throw err
            }
          }
        } else {
          if (stateRequests.length > 0) {
            const poolDebtResults = await Promise.allSettled(
              stateRequests.map((req) =>
                publicClient.readContract({
                  address: diamondAddress,
                  abi: multiPoolPositionViewFacetAbi,
                  functionName: 'getPositionPoolDataPoolOnly',
                  args: [req.tokenId, req.poolId],
                }),
              ),
            )
            const poolDebtMap = new Map()
            poolDebtResults.forEach((result, idx) => {
              if (result.status === 'fulfilled') {
                const req = stateRequests[idx]
                poolDebtMap.set(`${req.tokenId.toString()}-${req.poolId.toString()}`, result.value?.totalDebt ?? null)
              }
            })

            const aciYieldResults = await Promise.allSettled(
              stateRequests.map((req) =>
                publicClient.readContract({
                  address: diamondAddress,
                  abi: activeCreditViewFacetAbi,
                  functionName: 'pendingActiveCreditByPosition',
                  args: [req.poolId, req.tokenId],
                }),
              ),
            )

            const directStateResults = await Promise.allSettled(
              stateRequests.map((req) =>
                publicClient.readContract({
                  address: diamondAddress,
                  abi: equalLendDirectViewFacetAbi,
                  functionName: 'getPositionDirectState',
                  args: [req.tokenId, req.poolId],
                }),
              ),
            )

            const encumbranceResults = await Promise.allSettled(
              stateRequests.map((req) =>
                publicClient.readContract({
                  address: diamondAddress,
                  abi: positionViewFacetAbi,
                  functionName: 'getPositionEncumbrance',
                  args: [req.tokenId, req.poolId],
                }),
              ),
            )

            const stateResults = await Promise.allSettled(
              stateRequests.map((req) =>
                publicClient.readContract({
                  address: diamondAddress,
                  abi: positionViewFacetAbi,
                  functionName: 'getPositionState',
                  args: [req.tokenId, req.poolId],
                }),
              ),
            )

            if (cancelled) return

            const stateErrors = []
            stateResults.forEach((result, idx) => {
              const req = stateRequests[idx]
              if (result.status === 'fulfilled') {
                const positionKey = positionKeyMap[req.tokenId.toString()]
                const byAsset = directSummaryByAssetMap.get(req.tokenId.toString()) ?? null
                const poolDebtOverride = poolDebtMap.get(`${req.tokenId.toString()}-${req.poolId.toString()}`) ?? null
                const aciResult = aciYieldResults[idx]
                const aciYieldRaw = aciResult?.status === 'fulfilled' ? aciResult.value : 0n
                const directStateResult = directStateResults[idx]
                const directState =
                  directStateResult?.status === 'fulfilled' ? extractDirectState(directStateResult.value) : null
                const encumbranceResult = encumbranceResults[idx]
                const encumbrance =
                  encumbranceResult?.status === 'fulfilled' ? extractEncumbrance(encumbranceResult.value) : null
                const auctionKey = `${req.tokenId.toString()}-${req.poolId.toString()}`
                const auctionEncumberedRaw = auctionEncumberedByPool.get(auctionKey) ?? 0n

                positionEntries.push(
                  formatPosition(
                    req.tokenId,
                    req.poolId,
                    result.value,
                    req.membership,
                    positionKey,
                    byAsset,
                    poolDebtOverride,
                    aciYieldRaw,
                    { directState, encumbrance, auctionEncumberedRaw }
                  ),
                )
                return
              }
              const message = result.reason?.shortMessage || result.reason?.message || ''
              if (message.includes('InvalidTokenId')) {
                console.warn(`Skipping invalid position token ${req.tokenId}`)
                return
              }
              stateErrors.push(result.reason)
            })

            if (stateErrors.length > 0) {
              throw stateErrors[0]
            }
          }
        }

        tokenIds.forEach((tokenId) => {
          const tokenIdStr = tokenId.toString()
          const alreadyAdded = positionEntries.some((position) => position.tokenId === tokenIdStr)
          const hasMembership = membershipFound.get(tokenIdStr)
          if (!alreadyAdded && !hasMembership) {
            const baseKey = positionKeyMap[tokenIdStr] || tokenIdStr
            positionEntries.push({
              tokenId: tokenIdStr,
              positionKey: `${baseKey}-0`,
              positionAddress: baseKey,
              poolId: null,
              poolName: '—',
              ticker: '',
              decimals: 18,
              principal: '0',
              totalLiabilities: '0',
              accruedYield: '0',
              aciYield: '0',
              rollingCredit: '0',
              fixedTermLoans: '0',
              directLocked: '0',
              directLent: '0',
              directLentPrincipal: '0',
              directCommitted: '0',
              totalEncumbered: '0',
              principalRaw: 0n,
              totalDebtRaw: 0n,
              accruedYieldRaw: 0n,
              aciYieldRaw: 0n,
              rollingCreditRaw: 0n,
              rollingLoanActive: false,
              directLockedRaw: 0n,
              directLentRaw: 0n,
              directCommittedRaw: 0n,
              totalEncumberedRaw: 0n,
              isDelinquent: false,
              eligibleForPenalty: false,
              membership: { isMember: false, hasBalance: false, hasActiveLoans: false, poolId: null },
            })
          }
        })

        setNfts(positionEntries)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch Position NFTs:', err)
          setError('Unable to load Position NFTs')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchNFTs()

    return () => {
      cancelled = true
    }
  }, [publicClient, address, positionNFTAddress, diamondAddress, poolMeta, refreshTrigger])

  const { writeContractAsync } = useWriteContract()

  const refetch = () => setRefreshTrigger((prev) => prev + 1)

  const mintPositionNFT = async (poolName, amount) => {
    if (!poolName || !amount) return null
    const poolId = poolMeta[poolName]?.pid
    if (poolId === undefined) return null
    const decimals = poolMeta[poolName]?.decimals ?? 18
    const amountRaw = parseUnits(amount, decimals)
    if (amountRaw <= 0n) return null
    const tokenAddress = (poolMeta[poolName]?.tokenAddress || '').trim()
    if (!tokenAddress) return null
    const isNative = tokenAddress.toLowerCase() === ZERO_ADDRESS
    if (!diamondAddress || diamondAddress === ZERO_ADDRESS) return null
    if (!publicClient || !writeContractAsync || !address) return null

    try {
      if (!isNative) {
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, diamondAddress],
        })

        if (allowance < amountRaw) {
          const approveTx = await writeContractAsync({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [diamondAddress, maxUint256],
          })
          await publicClient.waitForTransactionReceipt({ hash: approveTx })
        }
      }

      const tx = await writeContractAsync({
        address: diamondAddress,
        abi: positionManagementFacetAbi,
        functionName: 'mintPositionWithDeposit',
        args: [BigInt(poolId), amountRaw, amountRaw, maxUint256],
        value: isNative ? amountRaw : undefined,
      })
      return { hash: tx, poolName, amount }
    } catch (err) {
      console.error('Mint failed', err)
      return null
    }
  }

  return {
    nfts,
    loading,
    error,
    poolOptions,
    poolMeta,
    refetch,
    mintPositionNFT,
  }
}

export default usePositionNFTs
