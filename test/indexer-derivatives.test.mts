import assert from "node:assert/strict";
import test from "node:test";
import { handleFuturesLog, handleOptionLog } from "../indexer/lib/derivatives.mjs";

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

test("handleOptionLog SeriesCreated upserts series and appends event", async () => {
  const { calls, db } = makeMockDb();
  await handleOptionLog(
    db as never,
    31337,
    {
      eventName: "SeriesCreated",
      args: {
        seriesId: 7n,
        makerPositionKey: "0x1234000000000000000000000000000000000000000000000000000000000000",
        makerPositionId: 11n,
        underlyingPoolId: 1n,
        strikePoolId: 5n,
        underlyingAsset: "0x0000000000000000000000000000000000000001",
        strikeAsset: "0x0000000000000000000000000000000000000002",
        strikePrice: 2500n,
        expiry: 1700000000n,
        totalSize: 42n,
        collateralLocked: 42n,
        isCall: true,
        isAmerican: false,
      },
    },
    {
      blockNumber: 123n,
      transactionHash: "0xtx1",
      logIndex: 2,
    } as never,
  );

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /INSERT INTO option_series/);
  assert.equal(calls[0].values[0], 31337);
  assert.equal(calls[0].values[1], 7);
  assert.match(calls[1].sql, /INSERT INTO option_series_events/);
  assert.equal(calls[1].values[1], 7);
  assert.equal(calls[1].values[2], "SeriesCreated");
});

test("handleOptionLog SeriesCreated persists resolved fee bps", async () => {
  const { calls, db } = makeMockDb();
  await handleOptionLog(
    db as never,
    31337,
    {
      eventName: "SeriesCreated",
      args: {
        seriesId: 8n,
        makerPositionKey: "0x1234000000000000000000000000000000000000000000000000000000000000",
        makerPositionId: 11n,
        underlyingPoolId: 1n,
        strikePoolId: 5n,
        underlyingAsset: "0x0000000000000000000000000000000000000001",
        strikeAsset: "0x0000000000000000000000000000000000000002",
        strikePrice: 2500n,
        expiry: 1700000000n,
        totalSize: 42n,
        collateralLocked: 42n,
        isCall: true,
        isAmerican: false,
      },
    },
    {
      blockNumber: 124n,
      transactionHash: "0xtx-option-fees",
      logIndex: 3,
    } as never,
    {
      resolveOptionSeriesFees: async () => ({ createFeeBps: 77, exerciseFeeBps: 88, reclaimFeeBps: 99 }),
    },
  );

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /create_fee_bps/);
  assert.equal(calls[0].values[13], 77);
  assert.equal(calls[0].values[14], 88);
  assert.equal(calls[0].values[15], 99);
});

test("handleOptionLog Exercised updates cumulative fields and writes event", async () => {
  const { calls, db } = makeMockDb();
  await handleOptionLog(
    db as never,
    31337,
    {
      eventName: "Exercised",
      args: {
        seriesId: 9n,
        holder: "0x0000000000000000000000000000000000000003",
        recipient: "0x0000000000000000000000000000000000000004",
        amount: 3n,
        strikeAmount: 7500n,
        paymentReceived: 7510n,
      },
    },
    {
      blockNumber: 200n,
      transactionHash: "0xtx2",
      logIndex: 9,
    } as never,
  );

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /total_exercised = COALESCE\(option_series.total_exercised/);
  assert.deepEqual(calls[0].values, [31337, 9, "3", "7500"]);
  assert.match(calls[1].sql, /INSERT INTO option_series_events/);
  assert.equal(calls[1].values[2], "Exercised");
  assert.equal(calls[1].values[3], "0x0000000000000000000000000000000000000003");
});

test("handleFuturesLog Settled updates series and appends event", async () => {
  const { calls, db } = makeMockDb();
  await handleFuturesLog(
    db as never,
    31337,
    {
      eventName: "Settled",
      args: {
        seriesId: 12n,
        holder: "0x0000000000000000000000000000000000000005",
        recipient: "0x0000000000000000000000000000000000000006",
        amount: 4n,
        quoteAmount: 10000n,
        paymentReceived: 10005n,
      },
    },
    {
      blockNumber: 205n,
      transactionHash: "0xtx3",
      logIndex: 1,
    } as never,
  );

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /INSERT INTO futures_series/);
  assert.deepEqual(calls[0].values, [31337, 12, "4"]);
  assert.match(calls[1].sql, /INSERT INTO futures_series_events/);
  assert.equal(calls[1].values[2], "Settled");
  assert.equal(calls[1].values[6], "10000");
});

test("handleFuturesLog SeriesCreated persists resolved fee bps", async () => {
  const { calls, db } = makeMockDb();
  await handleFuturesLog(
    db as never,
    31337,
    {
      eventName: "SeriesCreated",
      args: {
        seriesId: 19n,
        makerPositionKey: "0x1234000000000000000000000000000000000000000000000000000000000000",
        makerPositionId: 13n,
        underlyingPoolId: 1n,
        quotePoolId: 2n,
        underlyingAsset: "0x0000000000000000000000000000000000000001",
        quoteAsset: "0x0000000000000000000000000000000000000002",
        forwardPrice: 2200n,
        expiry: 1700001000n,
        totalSize: 55n,
        underlyingLocked: 55n,
        graceUnlockTime: 1700001200n,
        isEuropean: true,
      },
    },
    {
      blockNumber: 240n,
      transactionHash: "0xtx-futures-fees",
      logIndex: 4,
    } as never,
    {
      resolveFuturesSeriesFees: async () => ({ createFeeBps: 12, exerciseFeeBps: 34, reclaimFeeBps: 56 }),
    },
  );

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /create_fee_bps/);
  assert.equal(calls[0].values[14], 12);
  assert.equal(calls[0].values[15], 34);
  assert.equal(calls[0].values[16], 56);
});

test("unknown derivative event is ignored", async () => {
  const { calls, db } = makeMockDb();
  const handledOption = await handleOptionLog(
    db as never,
    31337,
    { eventName: "OptionsPausedUpdated", args: {} },
    { blockNumber: 1n, transactionHash: "0xtx4", logIndex: 0 } as never,
  );
  const handledFutures = await handleFuturesLog(
    db as never,
    31337,
    { eventName: "FuturesPausedUpdated", args: {} },
    { blockNumber: 1n, transactionHash: "0xtx5", logIndex: 0 } as never,
  );
  assert.equal(handledOption, false);
  assert.equal(handledFutures, false);
  assert.equal(calls.length, 0);
});
