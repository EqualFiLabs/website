import test from 'node:test'
import assert from 'node:assert/strict'

import { computeMintRequirement, INDEX_SCALE, mulDivUp } from '../src/lib/indexMintQuote.mjs'

test('computeMintRequirement uses initial bundle scaling when supply is zero', () => {
  const quote = computeMintRequirement({
    bundleAmount: 1_000_000_000_000_000_000n,
    units: 10n * INDEX_SCALE,
    totalSupply: 0n,
    mintFeeBps: 100n,
  })

  assert.equal(quote.need, 10_000_000_000_000_000_000n)
  assert.equal(quote.potBuyIn, 0n)
  assert.equal(quote.fee, 100_000_000_000_000_000n)
  assert.equal(quote.total, 10_100_000_000_000_000_000n)
})

test('computeMintRequirement includes economic balance, fee pot buy-in, and ceil rounding', () => {
  const quote = computeMintRequirement({
    bundleAmount: 0n,
    units: 10n,
    totalSupply: 33n,
    mintFeeBps: 250n,
    economicBalance: 101n,
    feePot: 17n,
  })

  assert.equal(quote.need, 31n)
  assert.equal(quote.potBuyIn, 6n)
  assert.equal(quote.grossIn, 37n)
  assert.equal(quote.fee, 1n)
  assert.equal(quote.total, 38n)
})

test('mulDivUp rounds zero inputs to zero', () => {
  assert.equal(mulDivUp(0n, 99n, 10n), 0n)
  assert.equal(mulDivUp(99n, 0n, 10n), 0n)
})
