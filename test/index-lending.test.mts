import assert from "node:assert/strict";
import test from "node:test";

import {
  SECONDS_PER_DAY,
  computeAvailablePrincipal,
  computeNetBorrow,
  computeOriginationFee,
  durationDaysToSeconds,
} from "../src/lib/indexLending.js";

test("computeOriginationFee uses floor division", () => {
  assert.equal(computeOriginationFee(100_000n, 125n), 1_250n);
  assert.equal(computeOriginationFee(9n, 333n), 0n);
  assert.equal(computeOriginationFee(0n, 250n), 0n);
});

test("computeNetBorrow subtracts origination fee", () => {
  assert.equal(computeNetBorrow(100_000n, 125n), 98_750n);
  assert.equal(computeNetBorrow(1n, 10_000n), 0n);
});

test("computeAvailablePrincipal saturates at zero", () => {
  assert.equal(computeAvailablePrincipal(1_000n, 250n), 750n);
  assert.equal(computeAvailablePrincipal(1_000n, 1_000n), 0n);
  assert.equal(computeAvailablePrincipal(1_000n, 1_100n), 0n);
});

test("durationDaysToSeconds parses positive whole days", () => {
  assert.equal(durationDaysToSeconds("1"), SECONDS_PER_DAY);
  assert.equal(durationDaysToSeconds("30"), 30n * SECONDS_PER_DAY);
  assert.equal(durationDaysToSeconds(""), 0n);
  assert.throws(() => durationDaysToSeconds("1.5"), /positive whole number/);
  assert.throws(() => durationDaysToSeconds("0"), /greater than zero/);
});
