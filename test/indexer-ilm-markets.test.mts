import assert from "node:assert/strict";
import test from "node:test";

import { handleIlmMarketLog } from "../indexer/lib/ilm-isolated.mjs";

const makeMockDb = () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  return {
    calls,
    db: {
      async query(sql: string, values: unknown[]) {
        calls.push({ sql, values });
        return { rows: [] };
      },
    },
  };
};

test("handleIlmMarketLog upserts ILM market create event", async () => {
  const { calls, db } = makeMockDb();

  const handled = await handleIlmMarketLog(
    db as never,
    31337,
    {
      eventName: "IlmIsolatedCreateMarket",
      args: {
        marketId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        moduleId: 8004n,
        params: {
          loanPoolId: 5n,
          collateralPoolId: 4n,
          oracle: "0x1111111111111111111111111111111111111111",
          irm: "0x2222222222222222222222222222222222222222",
          lltv: 800000000000000000n,
        },
      },
    },
    {
      blockNumber: 123n,
      transactionHash: "0xtxilm1",
    } as never,
  );

  assert.equal(handled, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO ilm_isolated_markets/);
  assert.equal(calls[0].values[0], 31337);
  assert.equal(
    calls[0].values[1],
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  );
  assert.equal(calls[0].values[2], 8004);
  assert.equal(calls[0].values[3], 5);
  assert.equal(calls[0].values[4], 4);
  assert.equal(calls[0].values[5], "0x1111111111111111111111111111111111111111");
  assert.equal(calls[0].values[6], "0x2222222222222222222222222222222222222222");
  assert.equal(calls[0].values[7], "800000000000000000");
});

test("handleIlmMarketLog ignores non-market events", async () => {
  const { calls, db } = makeMockDb();

  const handled = await handleIlmMarketLog(
    db as never,
    31337,
    { eventName: "IlmIsolatedSetFee", args: {} },
    { blockNumber: 1n, transactionHash: "0xtx-ignore" } as never,
  );

  assert.equal(handled, false);
  assert.equal(calls.length, 0);
});
