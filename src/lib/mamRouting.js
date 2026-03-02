export function shouldCompareMamOnSwap(autoRoute, includeMamCurves) {
  return Boolean(autoRoute && includeMamCurves);
}

export function pickSwapRouteKind({
  autoRoute,
  includeMamCurves,
  auctionAmountOut,
  mamAmountOut,
}) {
  if (!shouldCompareMamOnSwap(autoRoute, includeMamCurves)) {
    return "auction";
  }
  if (typeof mamAmountOut !== "bigint") {
    return "auction";
  }
  return mamAmountOut > auctionAmountOut ? "mam" : "auction";
}

export function isMamSwapRouteActive(routeKind, autoRoute, includeMamCurves) {
  return shouldCompareMamOnSwap(autoRoute, includeMamCurves) && routeKind === "mam";
}
