const toNumberSafe = (value, fallback = null) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return fallback
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }
  return fallback
}

const buildPoolsByPid = (pools) =>
  new Map(
    pools
      .map((pool) => {
        const pid = toNumberSafe(pool?.pid)
        if (!Number.isFinite(pid)) return null
        return [pid, pool]
      })
      .filter(Boolean),
  )

const normalizePooledMarket = (market, idx, poolsByPid, idPrefix = 'ilm-pooled-market') => {
  const marketId = toNumberSafe(market?.marketId)
  const loanPoolId = toNumberSafe(market?.loanPoolId)
  const collateralPoolId = toNumberSafe(market?.collateralPoolId)
  const moduleId = toNumberSafe(market?.moduleId, 0)

  if (!Number.isFinite(marketId) || !Number.isFinite(loanPoolId) || !Number.isFinite(collateralPoolId)) {
    return null
  }

  const loanPool = poolsByPid.get(loanPoolId) || null
  const collateralPool = poolsByPid.get(collateralPoolId) || null

  const loanLabel = loanPool?.ticker || `Pool ${loanPoolId}`
  const collateralLabel = collateralPool?.ticker || `Pool ${collateralPoolId}`
  const fallbackName = `${loanLabel} / ${collateralLabel}`

  return {
    id: (market?.id || `${idPrefix}-${idx + 1}`).toString(),
    name: (market?.name || fallbackName).toString(),
    marketId,
    loanPoolId,
    collateralPoolId,
    moduleId,
    loanPool,
    collateralPool,
  }
}

export const normalizeIlmPooledMarkets = (poolsConfig) => {
  const markets = Array.isArray(poolsConfig?.ilmPooledMarkets) ? poolsConfig.ilmPooledMarkets : []
  const pools = Array.isArray(poolsConfig?.pools) ? poolsConfig.pools : []
  const poolsByPid = buildPoolsByPid(pools)

  return markets
    .map((market, idx) => normalizePooledMarket(market, idx, poolsByPid, 'ilm-pooled-market'))
    .filter(Boolean)
}

export const normalizeDiscoveredIlmPooledMarkets = (poolsConfig, rows = []) => {
  const pools = Array.isArray(poolsConfig?.pools) ? poolsConfig.pools : []
  const poolsByPid = buildPoolsByPid(pools)
  return (Array.isArray(rows) ? rows : [])
    .map((row, idx) =>
      normalizePooledMarket(
        { ...row, id: `discovered-pooled-${toNumberSafe(row?.marketId, idx + 1)}` },
        idx,
        poolsByPid,
        'discovered-pooled',
      ),
    )
    .filter(Boolean)
}

export const mergeIlmPooledMarkets = (configMarkets = [], discoveredMarkets = []) => {
  const byMarketId = new Map()
  for (const market of configMarkets) {
    byMarketId.set(Number(market.marketId), market)
  }
  for (const market of discoveredMarkets) {
    const key = Number(market.marketId)
    const existing = byMarketId.get(key)
    byMarketId.set(key, {
      ...(existing || {}),
      ...market,
      id: existing?.id || market.id,
      name: existing?.name || market.name || market.id,
      marketId: key,
    })
  }

  return Array.from(byMarketId.values()).sort((a, b) => Number(a.marketId) - Number(b.marketId))
}
