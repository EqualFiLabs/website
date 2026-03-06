import assert from "node:assert/strict";
import test from "node:test";

import {
  SECONDS_PER_DAY,
  computeAvailablePrincipal,
  computeTierFlatFee,
  durationDaysToSeconds,
  hasDefinedValue,
  normalizePositionKey,
  resolveLoanActionPositionId,
} from "../src/lib/indexLending.js";

test("computeTierFlatFee picks the highest matching collateral tier", () => {
  const tiers = [
    { minCollateralUnits: 1_000000000000000000n, flatFeeNative: 1_000000000000000n },
    { minCollateralUnits: 3_000000000000000000n, flatFeeNative: 3_000000000000000n },
    { minCollateralUnits: 5_000000000000000000n, flatFeeNative: 5_000000000000000n },
  ];
  assert.equal(computeTierFlatFee(0n, tiers), 0n);
  assert.equal(computeTierFlatFee(1_000000000000000000n, tiers), 1_000000000000000n);
  assert.equal(computeTierFlatFee(4_000000000000000000n, tiers), 3_000000000000000n);
  assert.equal(computeTierFlatFee(6_000000000000000000n, tiers), 5_000000000000000n);
});

test("computeAvailablePrincipal saturates at zero", () => {
  assert.equal(computeAvailablePrincipal(1_000n, 250n), 750n);
  assert.equal(computeAvailablePrincipal(1_000n, 1_000n), 0n);
  assert.equal(computeAvailablePrincipal(1_000n, 1_100n), 0n);
});

test("durationDaysToSeconds parses whole-day input and unit-based durations", () => {
  assert.equal(durationDaysToSeconds("1"), SECONDS_PER_DAY);
  assert.equal(durationDaysToSeconds("30"), 30n * SECONDS_PER_DAY);
  assert.equal(durationDaysToSeconds("36h"), 36n * 3600n);
  assert.equal(durationDaysToSeconds("1d12h"), (1n * SECONDS_PER_DAY) + (12n * 3600n));
  assert.equal(durationDaysToSeconds("2h 30m"), (2n * 3600n) + (30n * 60n));
  assert.equal(durationDaysToSeconds(""), 0n);
  assert.throws(() => durationDaysToSeconds("1.5"), /positive value/);
  assert.throws(() => durationDaysToSeconds("1w"), /positive value/);
  assert.throws(() => durationDaysToSeconds("0"), /greater than zero/);
  assert.throws(() => durationDaysToSeconds("0h"), /greater than zero/);
});

test("normalizePositionKey strips pool suffixes and lowercases", () => {
  assert.equal(
    normalizePositionKey("0xABCDEF1234567890abcdef1234567890ABCDEF12-7"),
    "0xabcdef1234567890abcdef1234567890abcdef12",
  );
  assert.equal(
    normalizePositionKey("0xABCDEF1234567890abcdef1234567890ABCDEF12"),
    "0xabcdef1234567890abcdef1234567890abcdef12",
  );
  assert.equal(normalizePositionKey(""), "");
});

test("resolveLoanActionPositionId picks matching position key over fallback", () => {
  const options = [
    { tokenId: "1", positionKey: "0xa953d0e97adb4ae4c8be86de55f13eda8422ea7ea1c1285349dbeee62072302f-15" },
    { tokenId: "2", positionKey: "0x738103468c343d3a11deef8e6cacdbfde4e208acac295700728c447a92f32635-15" },
  ];
  assert.equal(
    resolveLoanActionPositionId(
      "0x738103468c343d3a11deef8e6cacdbfde4e208acac295700728c447a92f32635",
      options,
      "1",
    ),
    "2",
  );
  assert.equal(
    resolveLoanActionPositionId(
      "0xdeadbeef00000000000000000000000000000000000000000000000000000000",
      options,
      "1",
    ),
    "1",
  );
});

test("hasDefinedValue treats zero-like identifiers as valid", () => {
  assert.equal(hasDefinedValue(0n), true);
  assert.equal(hasDefinedValue(0), true);
  assert.equal(hasDefinedValue("0"), true);
  assert.equal(hasDefinedValue(null), false);
  assert.equal(hasDefinedValue(undefined), false);
});
