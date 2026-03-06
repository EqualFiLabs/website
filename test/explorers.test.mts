import assert from "node:assert/strict";
import test from "node:test";
import { getExplorerUrl, getTxUrl } from "../src/lib/explorers.js";

test("explorer map includes robinhood testnet", () => {
  assert.equal(getExplorerUrl(46630), "https://explorer.testnet.chain.robinhood.com");
});

test("tx url builder uses mapped explorer per chain", () => {
  const txHash = "0xabc123";
  assert.equal(
    getTxUrl(46630, txHash),
    "https://explorer.testnet.chain.robinhood.com/tx/0xabc123",
  );
});

test("unknown chains fallback to etherscan", () => {
  assert.equal(getExplorerUrl(999999), "https://etherscan.io");
});
