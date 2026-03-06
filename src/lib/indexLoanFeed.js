const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const normalizeAddress = (value) => (value ? String(value).toLowerCase() : '')
const toBigInt = (value) => (typeof value === 'bigint' ? value : BigInt(value ?? 0))

export function normalizeIndexLoanRow(row = {}) {
  return {
    loanId: toBigInt(row.loanId ?? row.loan_id ?? 0),
    indexId: toBigInt(row.indexId ?? row.index_id ?? 0),
    positionKey: String(row.positionKey ?? row.position_key ?? '').toLowerCase(),
    ltvBps: toBigInt(row.ltvBps ?? row.ltv_bps ?? 0),
    borrowAsset: normalizeAddress(row.borrowAsset ?? row.borrow_asset ?? ZERO_ADDRESS) || ZERO_ADDRESS,
    collateralUnits: toBigInt(row.collateralUnits ?? row.collateral_units ?? 0),
    principal: toBigInt(row.principal ?? 0),
    maturity: toBigInt(row.maturity ?? 0),
    active: Boolean(row.active),
    recovered: Boolean(row.recovered),
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
  }
}

export function mergeActiveIndexLoans(indexerLoans = [], recentLoans = []) {
  const merged = new Map()

  for (const loan of recentLoans || []) {
    const normalized = normalizeIndexLoanRow(loan)
    if (normalized.loanId > 0n) {
      merged.set(normalized.loanId.toString(), normalized)
    }
  }

  // Indexer rows override optimistic local rows when both exist.
  for (const loan of indexerLoans || []) {
    const normalized = normalizeIndexLoanRow(loan)
    if (normalized.loanId > 0n) {
      merged.set(normalized.loanId.toString(), normalized)
    }
  }

  return Array.from(merged.values())
    .filter((loan) => loan.active && !loan.recovered)
    .sort((a, b) => {
      if (a.loanId === b.loanId) return 0
      return a.loanId > b.loanId ? -1 : 1
    })
}

export function upsertRecentIndexLoan(existing = [], candidate, limit = 20) {
  const normalized = normalizeIndexLoanRow(candidate)
  if (normalized.loanId <= 0n) return existing

  const key = normalized.loanId.toString()
  const withoutCandidate = (existing || [])
    .map((item) => normalizeIndexLoanRow(item))
    .filter((item) => item.loanId.toString() !== key)

  if (!normalized.active || normalized.recovered) {
    return withoutCandidate.slice(0, Math.max(1, Number(limit) || 20))
  }

  return [normalized, ...withoutCandidate].slice(0, Math.max(1, Number(limit) || 20))
}

export function removeRecentIndexLoan(existing = [], loanId) {
  const key = toBigInt(loanId).toString()
  return (existing || [])
    .map((item) => normalizeIndexLoanRow(item))
    .filter((item) => item.loanId.toString() !== key)
}

export function indexerStatusLabel(status) {
  if (!status?.available) return 'Indexer offline (local recent loans only)'
  if (typeof status.staleSeconds !== 'number') return 'Indexer status unavailable'
  if (status.staleSeconds <= 180) return 'Indexer synced'

  const minutes = Math.floor(status.staleSeconds / 60)
  if (minutes >= 1) return `Indexer lagging (${minutes}m)`
  return `Indexer lagging (${status.staleSeconds}s)`
}
