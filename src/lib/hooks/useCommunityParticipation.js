import { useMemo } from 'react'
import { useReadContracts } from 'wagmi'
import { communityAuctionFacetAbi } from '../abis/communityAuctionFacet'
import usePoolsConfig from './usePoolsConfig'
import usePositionNFTs from './usePositionNFTs'

export function useCommunityParticipation(auction) {
  const { nfts } = usePositionNFTs()
  const poolsConfig = usePoolsConfig()
  
  const diamondAddress =
    process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || poolsConfig?.pools?.[0]?.lendingPoolAddress || ''

  // Filter unique positions to check
  // We need to map positionKey (bytes32) back to tokenId for the exit action
  const uniquePositions = useMemo(() => {
    if (!nfts || !nfts.length) return []
    // Use a map to ensure unique positionKeys, keeping the first tokenId found for that key
    const map = new Map()
    nfts.forEach(nft => {
      // nft.positionAddress is the bytes32 positionKey from the contract
      if (nft.positionAddress && !map.has(nft.positionAddress)) {
        map.set(nft.positionAddress, nft.tokenId)
      }
    })
    return Array.from(map.entries()).map(([key, tokenId]) => ({ key, tokenId }))
  }, [nfts])

  const { data: shares, isLoading } = useReadContracts({
    contracts: uniquePositions.map(({ key }) => ({
      address: diamondAddress,
      abi: communityAuctionFacetAbi,
      functionName: 'getMakerShare',
      args: [BigInt(auction.id), key],
    })),
    query: {
      enabled: !!diamondAddress && auction.type === 'community' && uniquePositions.length > 0 && !auction.finalized,
    }
  })

  const participatingPositions = useMemo(() => {
    if (!shares || !uniquePositions.length) return []
    
    const results = []
    for (let i = 0; i < shares.length; i++) {
      const result = shares[i]
      if (result.status === 'success' && result.result) {
        const shareValue = typeof result.result === 'object' && 'share' in result.result 
            ? result.result.share 
            : Array.isArray(result.result) ? result.result[0] : 0n

        if (shareValue > 0n) {
          results.push({
            tokenId: uniquePositions[i].tokenId,
            share: shareValue,
            feesA: result.result.pendingFeesA ?? (Array.isArray(result.result) ? result.result[1] : 0n),
            feesB: result.result.pendingFeesB ?? (Array.isArray(result.result) ? result.result[2] : 0n),
          })
        }
      }
    }
    return results
  }, [shares, uniquePositions])

  return {
    participatingPositions,
    isLoading
  }
}
