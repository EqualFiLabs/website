export const DEFAULT_TOKEN_IN = 'rETH'
export const DEFAULT_TOKEN_OUT = 'USDC'

export function findTokenBySymbol(tokens, symbol) {
  const needle = (symbol || '').toLowerCase()
  if (!needle) return null
  return tokens.find((token) => (token?.symbol || '').toLowerCase() === needle) || null
}
