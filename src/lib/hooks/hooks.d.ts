import type { PositionNFT, PoolConfig, Auction, TokenInfo, PoolsConfig } from '@/types'
import type { PublicClient } from 'viem'

declare module '@/lib/hooks/usePositionNFTs' {
  interface PoolMeta {
    [poolId: string]: {
      name: string
      ticker: string
      tokenAddress: string
      lendingPoolAddress: string
      pid: number
      decimals: number
      [key: string]: any
    }
  }
  interface UsePositionNFTsReturn {
    nfts: PositionNFT[]
    loading: boolean
    error: string | null
    poolOptions: string[]
    poolMeta: PoolMeta
    mintPositionNFT: (poolName?: string, amount?: string) => Promise<any>
    refetch: () => void
  }
  export default function usePositionNFTs(): UsePositionNFTsReturn
}

declare module '@/lib/hooks/useAuctions' {
  interface UseAuctionsReturn {
    auctions: Auction[]
    refresh: () => void
  }
  export default function useAuctions(): UseAuctionsReturn
}

declare module '@/lib/hooks/usePoolsConfig' {
  export default function usePoolsConfig(): PoolsConfig
}

declare module '@/lib/hooks/useActivePublicClient' {
  export default function useActivePublicClient(): PublicClient | undefined
}

declare module '@/lib/hooks/useActiveChainId' {
  export default function useActiveChainId(): number
}

declare module '@/lib/hooks/useExplorerUrl' {
  interface UseExplorerUrlReturn {
    buildTxUrl: (hash: string) => string
  }
  export default function useExplorerUrl(): UseExplorerUrlReturn
}

declare module '@/lib/hooks/useCreateAuction' {
  interface UseCreateAuctionReturn {
    successId: string | null
    [key: string]: any
  }
  export default function useCreateAuction(): UseCreateAuctionReturn
}

declare module '@/lib/hooks/useTokens' {
  interface UseTokensReturn {
    tokens: TokenInfo[]
    loading: boolean
    refetch: () => void
  }
  export default function useTokens(): UseTokensReturn
}

declare module '@/lib/hooks/useCommunityParticipation' {
  interface UseCommunityParticipationReturn {
    participatingPositions: { tokenId: string; shares: bigint }[]
    isLoading: boolean
  }
  export function useCommunityParticipation(auction: Auction): UseCommunityParticipationReturn
}

declare module '@/lib/hooks/useBufferedWriteContract' {
  import type { UseWriteContractReturnType } from 'wagmi'
  export default function useBufferedWriteContract(): UseWriteContractReturnType
}
