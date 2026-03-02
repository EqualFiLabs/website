import { encodeAbiParameters, isAddress, keccak256 } from 'viem'

const MARKET_ID_REGEX = /^0x[a-fA-F0-9]{64}$/

const toBigIntSafe = (value, fallback = 0n) => {
  try {
    if (typeof value === 'bigint') return value
    if (typeof value === 'number') return BigInt(Math.trunc(value))
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return fallback
      return BigInt(trimmed)
    }
    return fallback
  } catch {
    return fallback
  }
}

const toAddress = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!isAddress(trimmed)) return ''
  return trimmed.toLowerCase()
}

const isValidIlmMarketId = (value) => typeof value === 'string' && MARKET_ID_REGEX.test(value)

export const deriveIlmIsolatedMarketId = (params) => {
  const loanPoolId = toBigIntSafe(params?.loanPoolId)
  const collateralPoolId = toBigIntSafe(params?.collateralPoolId)
  const lltv = toBigIntSafe(params?.lltv)
  const oracle = toAddress(params?.oracle)
  const irm = toAddress(params?.irm)

  if (!oracle || !irm) {
    throw new Error('Invalid ILM market params: oracle/irm address is required')
  }

  return keccak256(
    encodeAbiParameters(
      [
        { type: 'uint256', name: 'loanPoolId' },
        { type: 'uint256', name: 'collateralPoolId' },
        { type: 'address', name: 'oracle' },
        { type: 'address', name: 'irm' },
        { type: 'uint256', name: 'lltv' },
      ],
      [loanPoolId, collateralPoolId, oracle, irm, lltv],
    ),
  )
}

export const normalizeIlmIsolatedMarkets = (poolsConfig) => {
  const markets = Array.isArray(poolsConfig?.ilmIsolatedMarkets) ? poolsConfig.ilmIsolatedMarkets : []
  const pools = Array.isArray(poolsConfig?.pools) ? poolsConfig.pools : []

  const poolsByPid = new Map(
    pools
      .map((pool) => {
        const pid = Number(pool?.pid)
        if (!Number.isFinite(pid)) return null
        return [pid, pool]
      })
      .filter(Boolean),
  )

  return markets
    .map((market, idx) => {
      const loanPoolId = Number(market?.loanPoolId)
      const collateralPoolId = Number(market?.collateralPoolId)
      const oracle = toAddress(market?.oracle)
      const irm = toAddress(market?.irm)
      const lltv = toBigIntSafe(market?.lltv)

      if (!Number.isFinite(loanPoolId) || !Number.isFinite(collateralPoolId) || !oracle || !irm) {
        return null
      }

      const marketId = isValidIlmMarketId(market?.marketId)
        ? market.marketId.toLowerCase()
        : deriveIlmIsolatedMarketId({
            loanPoolId,
            collateralPoolId,
            oracle,
            irm,
            lltv,
          })

      const loanPool = poolsByPid.get(loanPoolId) || null
      const collateralPool = poolsByPid.get(collateralPoolId) || null

      const loanLabel = loanPool?.ticker || `Pool ${loanPoolId}`
      const collateralLabel = collateralPool?.ticker || `Pool ${collateralPoolId}`
      const fallbackName = `${loanLabel} / ${collateralLabel}`

      return {
        id: (market?.id || `ilm-market-${idx + 1}`).toString(),
        name: (market?.name || fallbackName).toString(),
        marketId,
        loanPoolId,
        collateralPoolId,
        oracle,
        irm,
        lltv,
        moduleId: toBigIntSafe(market?.moduleId),
        loanPool,
        collateralPool,
      }
    })
    .filter(Boolean)
}

export const normalizeIndexedIlmMarkets = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row, idx) => ({
      id: `indexed-${row.market_id || idx}`,
      name: row.name || '',
      marketId: row.market_id,
      loanPoolId: row.loan_pool_id,
      collateralPoolId: row.collateral_pool_id,
      oracle: row.oracle,
      irm: row.irm,
      lltv: row.lltv,
      moduleId: row.module_id,
    }))
    .filter((market) => typeof market.marketId === 'string' && market.marketId.length > 0)

export const mergeIlmIsolatedMarkets = (configMarkets = [], indexedMarkets = []) => {
  const byMarketId = new Map()
  for (const market of configMarkets) {
    byMarketId.set(market.marketId.toLowerCase(), market)
  }
  for (const market of indexedMarkets) {
    const key = market.marketId.toLowerCase()
    const existing = byMarketId.get(key)
    byMarketId.set(key, {
      ...(existing || {}),
      ...market,
      name: existing?.name || market.name || market.id,
      id: existing?.id || market.id,
      marketId: key,
    })
  }
  return Array.from(byMarketId.values())
}

export { isValidIlmMarketId }
