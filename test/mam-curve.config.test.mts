import assert from "node:assert/strict";
import test from "node:test";

import { MAM_INITIAL_GENERATION } from "../src/lib/mamCurveConfig.js";

test("MAM initial generation uses protocol version 1", () => {
  assert.equal(MAM_INITIAL_GENERATION, 1);
});
