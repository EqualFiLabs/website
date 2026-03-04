const BPS_DENOMINATOR = 10_000n
export const SECONDS_PER_DAY = 86_400n

export function computeOriginationFee(amount, feeBps) {
  const principal = BigInt(amount || 0)
  const bps = BigInt(feeBps || 0)
  if (principal <= 0n || bps <= 0n) return 0n
  return (principal * bps) / BPS_DENOMINATOR
}

export function computeNetBorrow(amount, feeBps) {
  const principal = BigInt(amount || 0)
  if (principal <= 0n) return 0n
  const fee = computeOriginationFee(principal, feeBps)
  return principal > fee ? principal - fee : 0n
}

export function computeAvailablePrincipal(principal, totalEncumbered) {
  const total = BigInt(principal || 0)
  const encumbered = BigInt(totalEncumbered || 0)
  if (encumbered >= total) return 0n
  return total - encumbered
}

export function durationDaysToSeconds(daysInput) {
  const text = String(daysInput ?? '').trim()
  if (!text) return 0n
  if (!/^\d+$/.test(text)) {
    throw new Error('Duration days must be a positive whole number')
  }
  const days = BigInt(text)
  if (days <= 0n) {
    throw new Error('Duration days must be greater than zero')
  }
  return days * SECONDS_PER_DAY
}
