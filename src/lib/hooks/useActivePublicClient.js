import { usePublicClient } from 'wagmi'
import useActiveChainId from './useActiveChainId'

function useActivePublicClient() {
  const chainId = useActiveChainId()
  return usePublicClient({ chainId })
}

export default useActivePublicClient
