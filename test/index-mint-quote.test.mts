import assert from "node:assert/strict";
import test from "node:test";

import {
  INDEX_SCALE,
  applyBpsBuffer,
  buildBufferedMaxInputs,
  computeMintRequirement,
} from "../src/lib/indexMintQuote.js";

test("computeMintRequirement uses bundle-only math at zero supply", () => {
  const quote = computeMintRequirement({
    bundleAmount: 2n * INDEX_SCALE,
    units: 3n * INDEX_SCALE,
    totalSupply: 0n,
    mintFeeBps: 100n,
  });

  assert.equal(quote.need, 6n * INDEX_SCALE);
  assert.equal(quote.potBuyIn, 0n);
  assert.equal(quote.fee, 60_000_000_000_000_000n);
  assert.equal(quote.total, 6_060_000_000_000_000_000n);
});

test("computeMintRequirement includes economic balance and fee-pot buy-in", () => {
  const quote = computeMintRequirement({
    bundleAmount: 0n,
    units: 1n * INDEX_SCALE,
    totalSupply: 3n * INDEX_SCALE,
    mintFeeBps: 25n,
    economicBalance: 100n,
    feePot: 7n,
  });

  assert.equal(quote.need, 34n);
  assert.equal(quote.potBuyIn, 3n);
  assert.equal(quote.grossIn, 37n);
  assert.equal(quote.fee, 1n);
  assert.equal(quote.total, 38n);
});

test("applyBpsBuffer rounds up and leaves zero untouched", () => {
  assert.equal(applyBpsBuffer(0n, 50n), 0n);
  assert.equal(applyBpsBuffer(100n, 50n), 101n);
  assert.equal(applyBpsBuffer(10_000n, 100n), 10_100n);
});

test("buildBufferedMaxInputs applies per-asset buffer to totals", () => {
  const maxInputs = buildBufferedMaxInputs(
    [{ total: 100n }, { total: 0n }, { total: 19_999n }],
    50n,
  );

  assert.deepEqual(maxInputs, [101n, 0n, 20_099n]);
});
