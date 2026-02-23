import { useWriteContract } from 'wagmi'
import useActivePublicClient from './useActivePublicClient'
import { useCallback, useRef } from 'react'

const FEE_CACHE_MS = 4_000

async function getBufferedFees(publicClient) {
  const block = await publicClient.getBlock({ blockTag: 'latest' })
  const baseFee = block.baseFeePerGas ?? 0n
  const tip = baseFee > 0n ? baseFee / 10n : 100_000n
  const maxPriorityFeePerGas = tip < 100_000n ? 100_000n : tip
  const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas
  console.log('[fee-buffer] baseFee=%s maxFee=%s tip=%s', baseFee, maxFeePerGas, maxPriorityFeePerGas)
  return { maxFeePerGas, maxPriorityFeePerGas }
}

export default function useBufferedWriteContract() {
  const result = useWriteContract()
  const publicClient = useActivePublicClient()
  const cacheRef = useRef({ ts: 0, fees: null })

  const getFees = useCallback(async () => {
    if (!publicClient) return {}
    const now = Date.now()
    if (cacheRef.current.fees && now - cacheRef.current.ts < FEE_CACHE_MS) {
      return cacheRef.current.fees
    }
    const fees = await getBufferedFees(publicClient)
    cacheRef.current = { ts: now, fees }
    return fees
  }, [publicClient])

  const writeContract = useCallback(
    async (args) => {
      const fees = await getFees()
      return result.writeContract({ ...fees, ...args })
    },
    [result.writeContract, getFees],
  )

  const writeContractAsync = useCallback(
    async (args) => {
      const fees = await getFees()
      return result.writeContractAsync({ ...fees, ...args })
    },
    [result.writeContractAsync, getFees],
  )

  return { ...result, writeContract, writeContractAsync }
}
