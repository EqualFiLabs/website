import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPoolIdOptions,
  buildPositionIdOptions,
  asString,
  formatUnixTimestamp,
  parseBps,
  parseExpirySeconds,
  parseOptionalUint,
  parseRequiredUint,
  parseTokenAmount,
} from "../src/lib/derivatives/ui.ts";

test("parseRequiredUint parses uint strings and rejects invalid inputs", () => {
  assert.equal(parseRequiredUint("123", "Amount"), 123n);
  assert.equal(parseRequiredUint("0009", "Amount"), 9n);

  assert.throws(() => parseRequiredUint("", "Amount"), /Amount is required/);
  assert.throws(() => parseRequiredUint("1.5", "Amount"), /non-negative integer/);
  assert.throws(() => parseRequiredUint("-1", "Amount"), /non-negative integer/);
});

test("parseOptionalUint handles blank and numeric values", () => {
  assert.equal(parseOptionalUint("", "Max payment"), undefined);
  assert.equal(parseOptionalUint("25", "Max payment"), 25n);
  assert.throws(() => parseOptionalUint("abc", "Max payment"), /non-negative integer/);
});

test("parseBps enforces integer bounds", () => {
  assert.equal(parseBps("0", "Create fee"), 0);
  assert.equal(parseBps("10000", "Create fee"), 10_000);

  assert.throws(() => parseBps("10001", "Create fee"), /between 0 and 10000/);
  assert.throws(() => parseBps("1.2", "Create fee"), /must be an integer/);
});

test("parseTokenAmount supports decimal and integer token amounts", () => {
  assert.equal(parseTokenAmount("0.005", 18, "Total size"), 5_000_000_000_000_000n);
  assert.equal(parseTokenAmount(".005", 18, "Total size"), 5_000_000_000_000_000n);
  assert.equal(parseTokenAmount("1.", 6, "Total size"), 1_000_000n);
  assert.equal(parseTokenAmount("0,5", 18, "Total size"), 500_000_000_000_000_000n);
  assert.equal(parseTokenAmount("1", 6, "Total size"), 1_000_000n);
  assert.equal(parseTokenAmount("0", 18, "Total size"), 0n);

  assert.throws(() => parseTokenAmount("", 18, "Total size"), /required/);
  assert.throws(() => parseTokenAmount("-1", 18, "Total size"), /non-negative number/);
  assert.throws(() => parseTokenAmount("abc", 18, "Total size"), /non-negative number/);
  assert.throws(() => parseTokenAmount("1,234.5", 18, "Total size"), /non-negative number/);
  assert.throws(() => parseTokenAmount("0.0000001", 6, "Total size"), /too many decimal places/);
});

test("parseExpirySeconds supports unix and datetime-local inputs", () => {
  assert.equal(parseExpirySeconds("1772658804", "Expiry"), 1_772_658_804n);

  const localInput = "2026-03-04T14:30";
  const expected = BigInt(Math.floor(new Date(localInput).getTime() / 1000));
  assert.equal(parseExpirySeconds(localInput, "Expiry"), expected);

  assert.throws(() => parseExpirySeconds("", "Expiry"), /Expiry is required/);
  assert.throws(() => parseExpirySeconds("not-a-date", "Expiry"), /valid date\/time/);
});

test("formatUnixTimestamp and asString normalize display values", () => {
  assert.equal(formatUnixTimestamp(undefined), "-");
  assert.equal(formatUnixTimestamp("invalid"), "-");
  assert.match(formatUnixTimestamp(1_700_000_000n), /\d/);

  assert.equal(asString("abc"), "abc");
  assert.equal(asString(123), "123");
  assert.equal(asString(4n), "4");
  assert.equal(asString(null), "");
});

test("buildPoolIdOptions normalizes and sorts pools from config", () => {
  const options = buildPoolIdOptions([
    { id: "WBTC", pid: 3, ticker: "WBTC", tokenName: "Wrapped Bitcoin" },
    { id: "USDC", pid: "5", ticker: "USDC", tokenName: "USD Coin" },
    { id: "WETH", pid: 4, ticker: "WETH", tokenName: "Wrapped Ethereum" },
    { id: "WETH_DUP", pid: 4, ticker: "WETH", tokenName: "Duplicate" },
  ]);

  assert.deepEqual(options, [
    { value: "3", label: "WBTC (pid 3) - Wrapped Bitcoin" },
    { value: "4", label: "WETH (pid 4) - Wrapped Ethereum" },
    { value: "5", label: "USDC (pid 5) - USD Coin" },
  ]);
});

test("buildPositionIdOptions dedupes and sorts nft token ids", () => {
  const options = buildPositionIdOptions([
    { tokenId: "12", poolName: "USDC" },
    { tokenId: "2", poolName: "WETH" },
    { tokenId: "12", poolName: "USDC duplicate" },
    { tokenId: 7, poolName: "WBTC" },
  ]);

  assert.deepEqual(options, [
    { value: "2", label: "#2 (WETH)" },
    { value: "7", label: "#7 (WBTC)" },
    { value: "12", label: "#12 (USDC)" },
  ]);
});
