import assert from "node:assert/strict";
import test from "node:test";

import { handleIndexLoanLog } from "../indexer/lib/index-loans.mjs";

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

test("handleIndexLoanLog persists LoanCreated as active", async () => {
  const { calls, db } = makeMockDb();
  const handled = await handleIndexLoanLog(
    db as never,
    42161,
    {
      eventName: "LoanCreated",
      args: {
        loanId: 55n,
        positionKey: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        indexId: 3n,
        borrowAsset: "0x0000000000000000000000000000000000000001",
        collateralUnits: 10n,
        principal: 5000n,
        maturity: 1800000000n,
        fee: 12n,
      },
    } as never,
    { blockNumber: 101n, transactionHash: "0xtx-created" } as never,
  );

  assert.equal(handled, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO index_loans/);
  assert.equal(calls[0].values[0], 42161);
  assert.equal(calls[0].values[1], 55);
  assert.equal(calls[0].values[2], "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(calls[0].values[3], 3);
  assert.equal(calls[0].values[4], "0x0000000000000000000000000000000000000001");
  assert.equal(calls[0].values[5], "10");
  assert.equal(calls[0].values[6], "5000");
  assert.equal(calls[0].values[7], 1800000000);
  assert.equal(calls[0].values[8], "12");
  assert.equal(calls[0].values[9], true);
  assert.equal(calls[0].values[10], false);
  assert.equal(calls[0].values[11], "LoanCreated");
});

test("handleIndexLoanLog marks LoanRepaid inactive", async () => {
  const { calls, db } = makeMockDb();
  const handled = await handleIndexLoanLog(
    db as never,
    42161,
    {
      eventName: "LoanRepaid",
      args: {
        loanId: 77n,
        indexId: 2n,
        borrowAsset: "0x0000000000000000000000000000000000000002",
        principal: 88n,
      },
    } as never,
    { blockNumber: 110n, transactionHash: "0xtx-repaid" } as never,
  );

  assert.equal(handled, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].values[1], 77);
  assert.equal(calls[0].values[9], false);
  assert.equal(calls[0].values[10], false);
  assert.equal(calls[0].values[11], "LoanRepaid");
});

test("handleIndexLoanLog marks LoanRecovered recovered", async () => {
  const { calls, db } = makeMockDb();
  const handled = await handleIndexLoanLog(
    db as never,
    42161,
    {
      eventName: "LoanRecovered",
      args: {
        loanId: 91n,
        indexId: 2n,
        borrowAsset: "0x0000000000000000000000000000000000000003",
        collateralUnits: 1n,
        writtenOffPrincipal: 2n,
      },
    } as never,
    { blockNumber: 111n, transactionHash: "0xtx-recovered" } as never,
  );

  assert.equal(handled, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].values[1], 91);
  assert.equal(calls[0].values[6], "2");
  assert.equal(calls[0].values[9], false);
  assert.equal(calls[0].values[10], true);
  assert.equal(calls[0].values[11], "LoanRecovered");
});

test("handleIndexLoanLog ignores unrelated events", async () => {
  const { calls, db } = makeMockDb();
  const handled = await handleIndexLoanLog(
    db as never,
    42161,
    { eventName: "LendingConfigured", args: { indexId: 1n } } as never,
    { blockNumber: 1n, transactionHash: "0xtx-ignore" } as never,
  );
  assert.equal(handled, false);
  assert.equal(calls.length, 0);
});
