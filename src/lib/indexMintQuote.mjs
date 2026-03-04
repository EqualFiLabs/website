export const INDEX_SCALE = 10n ** 18n
const BPS_DENOMINATOR = 10_000n

export function mulDivDown(a, b, denominator) {
  if (denominator === 0n) {
    throw new Error('mulDivDown denominator cannot be zero')
  }
  return (a * b) / denominator
}

export function mulDivUp(a, b, denominator) {
  if (denominator === 0n) {
    throw new Error('mulDivUp denominator cannot be zero')
  }
  if (a === 0n || b === 0n) {
    return 0n
  }
  return ((a * b) + denominator - 1n) / denominator
}

export function computeMintRequirement({
  bundleAmount,
  units,
  totalSupply,
  mintFeeBps,
  economicBalance = 0n,
  feePot = 0n,
}) {
  let need = 0n
  let potBuyIn = 0n

  if (totalSupply === 0n) {
    need = mulDivDown(bundleAmount, units, INDEX_SCALE)
  } else {
    need = mulDivUp(economicBalance, units, totalSupply)
    potBuyIn = mulDivUp(feePot, units, totalSupply)
  }

  const grossIn = need + potBuyIn
  const fee = mulDivUp(grossIn, mintFeeBps, BPS_DENOMINATOR)
  const total = grossIn + fee

  return { need, potBuyIn, grossIn, fee, total }
}
