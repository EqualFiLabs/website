const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

const parseOptionalInt = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.trunc(parsed)
}

const clampInt = (value, min, max, fallback) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const whole = Math.trunc(parsed)
  return Math.min(max, Math.max(min, whole))
}

export function parseIndexLoansQuery(searchParams) {
  const scope = (searchParams.get('scope') || 'active').toLowerCase()
  const page = clampInt(searchParams.get('page') || DEFAULT_PAGE, 1, Number.MAX_SAFE_INTEGER, DEFAULT_PAGE)
  const limit = clampInt(searchParams.get('limit') || DEFAULT_LIMIT, 1, MAX_LIMIT, DEFAULT_LIMIT)

  return {
    chainId: parseOptionalInt(searchParams.get('chainId')),
    indexId: parseOptionalInt(searchParams.get('indexId')),
    positionKey: (searchParams.get('positionKey') || '').toLowerCase(),
    includeAll: scope === 'all',
    page,
    limit,
    offset: (page - 1) * limit,
  }
}

export function buildIndexLoansFilters(query) {
  const params = []
  const whereClauses = []

  if (!query.includeAll) {
    whereClauses.push('active = true')
  }
  if (query.chainId !== null) {
    params.push(query.chainId)
    whereClauses.push(`chain_id = $${params.length}`)
  }
  if (query.indexId !== null) {
    params.push(query.indexId)
    whereClauses.push(`index_id = $${params.length}`)
  }
  if (query.positionKey) {
    params.push(query.positionKey)
    whereClauses.push(`LOWER(position_key) = $${params.length}`)
  }

  return {
    params,
    whereSql: whereClauses.length ? ` WHERE ${whereClauses.join(' AND ')}` : '',
  }
}

export function computeIndexLoanIndexerStatus(updatedAt, nowMs = Date.now()) {
  if (!updatedAt) {
    return {
      updatedAt: null,
      staleSeconds: null,
      healthy: false,
    }
  }

  const timestamp = new Date(updatedAt).getTime()
  if (!Number.isFinite(timestamp)) {
    return {
      updatedAt: null,
      staleSeconds: null,
      healthy: false,
    }
  }

  const staleSeconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000))
  return {
    updatedAt: new Date(timestamp).toISOString(),
    staleSeconds,
    healthy: staleSeconds <= 180,
  }
}
