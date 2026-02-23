import { resolvePoolsConfig } from './poolsConfig'

export const tokensFromConfig = (config) => {
  const seen = new Set()
  const result = []
  ;(config?.pools || []).forEach((pool) => {
    const address = (pool.tokenAddress || '').toLowerCase()
    if (!address || seen.has(address)) return
    seen.add(address)
    result.push({
      address,
      symbol: pool.ticker,
      name: pool.tokenName || pool.ticker,
      decimals: pool.decimals ?? 18,
      logoURI: '',
    })
  })
  ;(config?.indexTokens || []).forEach((idx) => {
    const address = (idx.indexTokenAddress || '').toLowerCase()
    if (!address || seen.has(address)) return
    seen.add(address)
    result.push({
      address,
      symbol: idx.indexTicker || idx.id,
      name: idx.id,
      decimals: 18,
      logoURI: '',
    })
  })
  return result
}

export const defaultTokens = tokensFromConfig(resolvePoolsConfig())

export default defaultTokens
