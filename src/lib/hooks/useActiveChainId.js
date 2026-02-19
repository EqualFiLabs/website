import { useAccount, useChainId } from 'wagmi'

function useActiveChainId() {
  const { chainId: connectedChainId } = useAccount()
  const configChainId = useChainId()
  return connectedChainId ?? configChainId
}

export default useActiveChainId
