import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { erc20Abi, formatUnits } from 'viem'
import { tokensFromConfig } from '../tokens'
import { ZERO_ADDRESS } from '../address'
import useActivePublicClient from './useActivePublicClient'
import usePoolsConfig from './usePoolsConfig'

export const normalizeQuery = (query) => query.trim().toLowerCase()

export const tokenMatchesQuery = (token, normalizedQuery) => {
  if (!normalizedQuery) return true
  const haystacks = [token.name, token.symbol, token.address].filter(Boolean)
  return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery))
}

export const filterTokens = (tokens, query) => {
  const normalizedQuery = normalizeQuery(query || '')
  return tokens.filter((token) => tokenMatchesQuery(token, normalizedQuery))
}

export const mapBalancesToTokens = (tokens, balances) =>
  tokens.map((token, idx) => {
    const balance = balances?.[idx] ?? token.balance ?? BigInt(0)
    return {
      ...token,
      balance,
      balanceFormatted: formatUnits(balance, token.decimals),
    }
  })

function useTokens() {
  const { address } = useAccount()
  const publicClient = useActivePublicClient()
  const poolsConfig = usePoolsConfig()

  const baseTokens = useMemo(() => tokensFromConfig(poolsConfig), [poolsConfig])
  const queryKey = useMemo(() => ['tokens', address, publicClient?.chain?.id], [address, publicClient])

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    enabled: true,
    staleTime: 15_000,
    queryFn: async () => {
      const tokens = baseTokens
      if (!address || !publicClient) {
        return mapBalancesToTokens(tokens, tokens.map(() => BigInt(0)))
      }

      const erc20Tokens = tokens.filter(
        (token) => token.address && token.address.toLowerCase() !== ZERO_ADDRESS,
      )
      const nativeTokens = tokens.filter(
        (token) => token.address && token.address.toLowerCase() === ZERO_ADDRESS,
      )

      const contracts = erc20Tokens.map((token) => ({
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      }))

      const results = contracts.length
        ? await publicClient.multicall({
            contracts,
            allowFailure: true,
          })
        : []
      const nativeBalance = nativeTokens.length ? await publicClient.getBalance({ address }) : BigInt(0)

      let erc20Index = 0
      const balances = tokens.map((token) => {
        if (!token.address) return BigInt(0)
        if (token.address.toLowerCase() === ZERO_ADDRESS) {
          return nativeBalance
        }
        const result = results[erc20Index]
        erc20Index += 1
        return result?.status === 'success' ? result.result : BigInt(0)
      })
      return mapBalancesToTokens(tokens, balances)
    },
  })

  const tokens = data || mapBalancesToTokens(baseTokens, baseTokens.map(() => BigInt(0)))

  return {
    tokens,
    isLoading,
    refetch,
    filterTokens: (query) => filterTokens(tokens, query),
  }
}

export default useTokens
