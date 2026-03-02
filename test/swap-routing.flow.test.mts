import assert from "node:assert/strict";
import test from "node:test";

import { isMamSwapRouteActive, pickSwapRouteKind } from "../src/lib/mamRouting.js";

test("manual auction mode never activates MAM routing", () => {
  const routeKind = pickSwapRouteKind({
    autoRoute: false,
    includeMamCurves: true,
    auctionAmountOut: 100n,
    mamAmountOut: 1_000n,
  });
  assert.equal(routeKind, "auction");
  assert.equal(isMamSwapRouteActive(routeKind, false, true), false);
});

test("auto route with toggle chooses and activates MAM when better", () => {
  const routeKind = pickSwapRouteKind({
    autoRoute: true,
    includeMamCurves: true,
    auctionAmountOut: 100n,
    mamAmountOut: 101n,
  });
  assert.equal(routeKind, "mam");
  assert.equal(isMamSwapRouteActive(routeKind, true, true), true);
});

test("auto route keeps auction path when MAM toggle is disabled", () => {
  const routeKind = pickSwapRouteKind({
    autoRoute: true,
    includeMamCurves: false,
    auctionAmountOut: 100n,
    mamAmountOut: 1_000n,
  });
  assert.equal(routeKind, "auction");
  assert.equal(isMamSwapRouteActive(routeKind, true, false), false);
});
