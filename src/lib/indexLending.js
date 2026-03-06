export const SECONDS_PER_DAY = 86_400n

export function hasDefinedValue(value) {
  return value !== undefined && value !== null
}

export function normalizePositionKey(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return ''
  const separatorIdx = raw.indexOf('-')
  return separatorIdx >= 0 ? raw.slice(0, separatorIdx) : raw
}

export function computeTierFlatFee(collateralUnits, tiers = []) {
  const collateral = BigInt(collateralUnits || 0)
  if (collateral <= 0n || !Array.isArray(tiers) || !tiers.length) return 0n
  let matched = 0n
  for (const tier of tiers) {
    const minUnits = BigInt(tier?.minCollateralUnits || 0)
    const fee = BigInt(tier?.flatFeeNative || 0)
    if (collateral >= minUnits) {
      matched = fee
    } else {
      break
    }
  }
  return matched
}

export function computeAvailablePrincipal(principal, totalEncumbered) {
  const total = BigInt(principal || 0)
  const encumbered = BigInt(totalEncumbered || 0)
  if (encumbered >= total) return 0n
  return total - encumbered
}

export function resolveLoanActionPositionId(loanPositionKey, positionOptions = [], fallbackPositionId = '') {
  const normalizedLoanKey = normalizePositionKey(loanPositionKey)
  if (normalizedLoanKey) {
    for (const option of positionOptions || []) {
      const optionKey = normalizePositionKey(option?.positionKey ?? option?.positionAddress ?? '')
      if (!optionKey || optionKey !== normalizedLoanKey) continue
      const tokenId = String(option?.tokenId ?? '').trim()
      if (tokenId) return tokenId
    }
  }
  return String(fallbackPositionId ?? '').trim()
}

export function durationDaysToSeconds(daysInput) {
  const text = String(daysInput ?? '').trim()
  if (!text) return 0n

  // Backward-compatible: plain integers are interpreted as whole days.
  if (/^\d+$/.test(text)) {
    const days = BigInt(text)
    if (days <= 0n) {
      throw new Error('Duration must be greater than zero')
    }
    return days * SECONDS_PER_DAY
  }

  // Extended format: concatenated unit tokens, e.g. "36h", "1d12h", "90m".
  const compact = text.replace(/\s+/g, '')
  const tokenRegex = /(\d+)([smhd])/gi
  const multipliers = {
    s: 1n,
    m: 60n,
    h: 3600n,
    d: SECONDS_PER_DAY,
  }

  let cursor = 0
  let totalSeconds = 0n
  let match

  while ((match = tokenRegex.exec(compact)) !== null) {
    if (match.index !== cursor) {
      throw new Error('Duration must be a positive value (e.g. 30, 36h, 1d12h)')
    }
    cursor += match[0].length
    totalSeconds += BigInt(match[1]) * multipliers[match[2].toLowerCase()]
  }

  if (cursor !== compact.length) {
    throw new Error('Duration must be a positive value (e.g. 30, 36h, 1d12h)')
  }
  if (totalSeconds <= 0n) {
    throw new Error('Duration must be greater than zero')
  }

  return totalSeconds
}
