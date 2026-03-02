import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveIlmIsolatedMarketId,
  mergeIlmIsolatedMarkets,
  normalizeIlmIsolatedMarkets,
  normalizeIndexedIlmMarkets,
} from "../src/lib/ilmIsolated.js";

test("deriveIlmIsolatedMarketId matches expected vector", () => {
  const marketId = deriveIlmIsolatedMarketId({
    loanPoolId: 5,
    collateralPoolId: 4,
    oracle: "0x1111111111111111111111111111111111111111",
    irm: "0x2222222222222222222222222222222222222222",
    lltv: "800000000000000000",
  });

  assert.equal(
    marketId,
    "0x42a6af361227718084641884b8e61bc86596686d0f2de025cdd227a4471a2165",
  );
});

test("normalizeIlmIsolatedMarkets derives ids and enriches pool metadata", () => {
  const poolsConfig = {
    pools: [
      { id: "USDC", pid: 5, ticker: "USDC", decimals: 6 },
      { id: "WETH", pid: 4, ticker: "WETH", decimals: 18 },
    ],
    ilmIsolatedMarkets: [
      {
        id: "usdc-weth-1",
        name: "USDC/WETH 80%",
        loanPoolId: 5,
        collateralPoolId: 4,
        oracle: "0x1111111111111111111111111111111111111111",
        irm: "0x2222222222222222222222222222222222222222",
        lltv: "800000000000000000",
      },
      {
        id: "explicit",
        loanPoolId: 5,
        collateralPoolId: 4,
        oracle: "0x1111111111111111111111111111111111111111",
        irm: "0x2222222222222222222222222222222222222222",
        lltv: "750000000000000000",
        marketId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      {
        id: "invalid",
        loanPoolId: 5,
        collateralPoolId: 4,
        oracle: "not-an-address",
        irm: "0x2222222222222222222222222222222222222222",
        lltv: "750000000000000000",
      },
    ],
  };

  const markets = normalizeIlmIsolatedMarkets(poolsConfig);
  assert.equal(markets.length, 2);

  assert.equal(markets[0].id, "usdc-weth-1");
  assert.equal(markets[0].loanPool.ticker, "USDC");
  assert.equal(markets[0].collateralPool.ticker, "WETH");
  assert.equal(markets[0].marketId, "0x42a6af361227718084641884b8e61bc86596686d0f2de025cdd227a4471a2165");

  assert.equal(markets[1].id, "explicit");
  assert.equal(markets[1].marketId, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
});

test("mergeIlmIsolatedMarkets prefers indexed rows while preserving config labels", () => {
  const configMarkets = normalizeIlmIsolatedMarkets({
    pools: [
      { id: "USDC", pid: 5, ticker: "USDC", decimals: 6 },
      { id: "WETH", pid: 4, ticker: "WETH", decimals: 18 },
    ],
    ilmIsolatedMarkets: [
      {
        id: "cfg-a",
        name: "Configured Market",
        loanPoolId: 5,
        collateralPoolId: 4,
        oracle: "0x1111111111111111111111111111111111111111",
        irm: "0x2222222222222222222222222222222222222222",
        lltv: "800000000000000000",
      },
    ],
  });

  const indexedRows = normalizeIndexedIlmMarkets([
    {
      market_id: "0x42a6af361227718084641884b8e61bc86596686d0f2de025cdd227a4471a2165",
      module_id: 8004,
      loan_pool_id: 5,
      collateral_pool_id: 4,
      oracle: "0x1111111111111111111111111111111111111111",
      irm: "0x2222222222222222222222222222222222222222",
      lltv: "800000000000000000",
    },
  ]);

  const indexedMarkets = normalizeIlmIsolatedMarkets({
    pools: [
      { id: "USDC", pid: 5, ticker: "USDC", decimals: 6 },
      { id: "WETH", pid: 4, ticker: "WETH", decimals: 18 },
    ],
    ilmIsolatedMarkets: indexedRows,
  });

  const merged = mergeIlmIsolatedMarkets(configMarkets, indexedMarkets);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, "Configured Market");
  assert.equal(merged[0].moduleId, 8004n);
});
