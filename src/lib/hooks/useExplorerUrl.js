import { useCallback } from 'react'
import useActiveChainId from './useActiveChainId'
import { getExplorerUrl, getTxUrl } from '../explorers'

function useExplorerUrl() {
  const chainId = useActiveChainId()

  const explorerUrl = getExplorerUrl(chainId)

  const buildTxUrl = useCallback(
    (txHash) => getTxUrl(chainId, txHash),
    [chainId],
  )

  return { explorerUrl, buildTxUrl }
}

export default useExplorerUrl
