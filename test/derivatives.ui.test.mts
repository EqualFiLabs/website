import test from "node:test";
import assert from "node:assert/strict";

import {
  asString,
  formatUnixTimestamp,
  parseBps,
  parseOptionalUint,
  parseRequiredUint,
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

test("formatUnixTimestamp and asString normalize display values", () => {
  assert.equal(formatUnixTimestamp(undefined), "-");
  assert.equal(formatUnixTimestamp("invalid"), "-");
  assert.match(formatUnixTimestamp(1_700_000_000n), /\d/);

  assert.equal(asString("abc"), "abc");
  assert.equal(asString(123), "123");
  assert.equal(asString(4n), "4");
  assert.equal(asString(null), "");
});
