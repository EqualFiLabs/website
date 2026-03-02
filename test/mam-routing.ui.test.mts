import assert from "node:assert/strict";
import test from "node:test";

import {
  isMamSwapRouteActive,
  pickSwapRouteKind,
  shouldCompareMamOnSwap,
} from "../src/lib/mamRouting.js";

test("MAM comparison is enabled only for auto-route + toggle", () => {
  assert.equal(shouldCompareMamOnSwap(true, true), true);
  assert.equal(shouldCompareMamOnSwap(true, false), false);
  assert.equal(shouldCompareMamOnSwap(false, true), false);
});

test("pickSwapRouteKind selects MAM only when enabled and better", () => {
  assert.equal(
    pickSwapRouteKind({
      autoRoute: true,
      includeMamCurves: true,
      auctionAmountOut: 100n,
      mamAmountOut: 110n,
    }),
    "mam",
  );

  assert.equal(
    pickSwapRouteKind({
      autoRoute: true,
      includeMamCurves: true,
      auctionAmountOut: 100n,
      mamAmountOut: 100n,
    }),
    "auction",
  );

  assert.equal(
    pickSwapRouteKind({
      autoRoute: false,
      includeMamCurves: true,
      auctionAmountOut: 100n,
      mamAmountOut: 999n,
    }),
    "auction",
  );

  assert.equal(
    pickSwapRouteKind({
      autoRoute: true,
      includeMamCurves: false,
      auctionAmountOut: 100n,
      mamAmountOut: 999n,
    }),
    "auction",
  );
});

test("isMamSwapRouteActive requires both feature gate and selected route", () => {
  assert.equal(isMamSwapRouteActive("mam", true, true), true);
  assert.equal(isMamSwapRouteActive("mam", false, true), false);
  assert.equal(isMamSwapRouteActive("auction", true, true), false);
});
