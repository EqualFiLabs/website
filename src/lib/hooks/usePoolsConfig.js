import { useMemo } from 'react'
import { resolvePoolsConfig } from '../poolsConfig'
import useActiveChainId from './useActiveChainId'

function usePoolsConfig() {
  const chainId = useActiveChainId()
  return useMemo(() => resolvePoolsConfig(chainId), [chainId])
}

export default usePoolsConfig
