import { useEffect, useMemo, useState } from 'react'
import { decodeEventLog, parseUnits } from 'viem'
import { useAccount, useWriteContract } from 'wagmi'
import { useToasts } from '@/components/common/ToastProvider'
import useActivePublicClient from './useActivePublicClient'
import usePoolsConfig from './usePoolsConfig'
import useExplorerUrl from './useExplorerUrl'
import { tokensFromConfig } from '../tokens'
import { DEFAULT_TOKEN_IN, DEFAULT_TOKEN_OUT, findTokenBySymbol } from '../tokenDefaults'
import { ammAuctionFacetAbi } from '../abis/ammAuctionFacet'
import { communityAuctionFacetAbi } from '../abis/communityAuctionFacet'

function useCreateAuction() {
  const { addToast } = useToasts()
  const { address, isConnected } = useAccount()
  const publicClient = useActivePublicClient()
  const { writeContractAsync } = useWriteContract()
  const poolsConfig = usePoolsConfig()
  const { buildTxUrl } = useExplorerUrl()
  const tokens = useMemo(() => tokensFromConfig(poolsConfig), [poolsConfig])
  const defaultTokenA = useMemo(() => findTokenBySymbol(tokens, DEFAULT_TOKEN_IN), [tokens])
  const defaultTokenB = useMemo(() => findTokenBySymbol(tokens, DEFAULT_TOKEN_OUT), [tokens])
  const defaultState = useMemo(
    () => ({
      auctionType: 'solo',
      positionId: '',
      poolIdA: defaultTokenA?.address || '',
      poolIdB: defaultTokenB?.address || '',
      reserveA: '',
      reserveB: '',
      feeBps: 30,
      start: null,
      end: null,
    }),
    [defaultTokenA, defaultTokenB],
  )
  const [state, setState] = useState(defaultState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successId, setSuccessId] = useState(null)
  const [error, setError] = useState('')

  const setField = (field, value) => setState((prev) => ({ ...prev, [field]: value }))

  const poolsByToken = useMemo(() => {
    const byAddress = new Map()
    ;(poolsConfig.pools || []).forEach((pool) => {
      const address = (pool.tokenAddress || '').toLowerCase()
      if (!address) return
      if (!byAddress.has(address)) {
        byAddress.set(address, pool)
      }
    })
    return byAddress
  }, [poolsConfig])

  useEffect(() => {
    if (!defaultState.poolIdA && !defaultState.poolIdB) return
    setState((prev) => {
      const hasA = prev.poolIdA && poolsByToken.has(prev.poolIdA.toLowerCase())
      const hasB = prev.poolIdB && poolsByToken.has(prev.poolIdB.toLowerCase())
      if (hasA && hasB) return prev
      return { ...prev, poolIdA: defaultState.poolIdA, poolIdB: defaultState.poolIdB }
    })
  }, [defaultState, poolsByToken])

  const resolvePool = (tokenAddress) => {
    if (!tokenAddress) return null
    return poolsByToken.get(tokenAddress.toLowerCase()) || null
  }

  const validation = useMemo(() => {
    const issues = []
    const poolIdA = (state.poolIdA || '').trim()
    const poolIdB = (state.poolIdB || '').trim()
    const reserveA = Number(state.reserveA || 0)
    const reserveB = Number(state.reserveB || 0)
    const positionId = (state.positionId || '').trim()

    if (!poolIdA || !poolIdB) issues.push('Pool IDs required')
    if (Number.isNaN(reserveA) || reserveA <= 0) issues.push('Reserve A must be > 0')
    if (Number.isNaN(reserveB) || reserveB <= 0) issues.push('Reserve B must be > 0')
    const start = state.start
    const end = state.end
    if (!start) issues.push('Start time required')
    if (!end || !start || end <= start) issues.push('End must be after start')
    if (state.feeBps < 0 || state.feeBps > 1000) issues.push('Fee must be between 0 and 10%')
    if (!positionId) issues.push('Position ID required')
    return {
      valid: issues.length === 0,
      issues,
    }
  }, [state])

  const submit = async () => {
    setError('')
    setSuccessId(null)
    if (!validation.valid) {
      setError(validation.issues[0])
      return
    }
    setIsSubmitting(true)
    try {
      if (!publicClient || !writeContractAsync) throw new Error('Wallet client unavailable')
      if (!isConnected || !address) throw new Error('Connect wallet to create an auction')

      const poolA = resolvePool(state.poolIdA)
      const poolB = resolvePool(state.poolIdB)
      if (!poolA || !poolB) throw new Error('Selected tokens are not configured pools')
      if (poolA.pid === poolB.pid) throw new Error('Pool A and Pool B must differ')

      if (!state.start || !state.end) throw new Error('Start and end time required')
      const startTime = Math.floor(state.start.getTime() / 1000)
      const endTime = Math.floor(state.end.getTime() / 1000)

      const reserveA = parseUnits(state.reserveA, poolA.decimals ?? 18)
      const reserveB = parseUnits(state.reserveB, poolB.decimals ?? 18)
      if (reserveA <= 0n || reserveB <= 0n) throw new Error('Reserve values must be above zero')

      const diamondAddress =
        (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || poolA.lendingPoolAddress || '').trim()
      if (!diamondAddress) throw new Error('Diamond address missing from config')
      if (poolB.lendingPoolAddress && poolB.lendingPoolAddress.toLowerCase() !== diamondAddress.toLowerCase()) {
        throw new Error('Pools must share the same diamond address')
      }

      const params = {
        positionId: BigInt(state.positionId),
        poolIdA: BigInt(poolA.pid),
        poolIdB: BigInt(poolB.pid),
        reserveA,
        reserveB,
        startTime: BigInt(startTime),
        endTime: BigInt(endTime),
        feeBps: Number(state.feeBps),
        feeAsset: 0,
      }

      const isSolo = state.auctionType === 'solo'
      const abi = isSolo ? ammAuctionFacetAbi : communityAuctionFacetAbi
      const functionName = isSolo ? 'createAuction' : 'createCommunityAuction'
      const eventName = isSolo ? 'AuctionCreated' : 'CommunityAuctionCreated'

      const txHash = await writeContractAsync({
        address: diamondAddress,
        abi,
        functionName,
        args: [params],
      })

      addToast({
        title: 'Create auction submitted',
        description: 'Waiting for confirmation…',
        type: 'pending',
        link: buildTxUrl(txHash),
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      let newId = null
      for (const log of receipt.logs || []) {
        if (!log || !log.topics || !log.data) continue
        if (log.address?.toLowerCase?.() !== diamondAddress.toLowerCase()) continue
        try {
          const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics })
          if (decoded.eventName === eventName) {
            newId = Number(decoded.args.auctionId)
            break
          }
        } catch {
          // ignore non-matching logs
        }
      }
      setSuccessId(newId)
      addToast({
        title: 'Auction created',
        description: newId ? `Auction ID #${newId}` : 'Auction created',
        type: 'success',
        link: buildTxUrl(txHash),
      })
    } catch (err) {
      setError(err.message)
      addToast({
        title: 'Create failed',
        description: err.message || 'Transaction reverted',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setState(DEFAULT_STATE)
    setSuccessId(null)
    setError('')
  }

  return {
    state,
    setField,
    isSubmitting,
    successId,
    error,
    validation,
    submit,
    reset,
  }
}

export default useCreateAuction
