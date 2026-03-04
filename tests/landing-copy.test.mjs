import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const landingPagePath = resolve(process.cwd(), "src/app/page.tsx");

test("landing page uses update branch copy while keeping navbar labels", async () => {
  const source = await readFile(landingPagePath, "utf8");

  assert.match(source, /\/\/ THE_ON-CHAIN_PRIME_BROKERAGE/);
  assert.match(source, /No Rehypothecation/);
  assert.match(source, /\/\/ ARCHITECTURAL_SUPERIORITY/);
  assert.match(source, /title="SOVEREIGN"/);
  assert.match(source, /title="UNIVERSAL"/);

  assert.doesNotMatch(source, /\/\/ HOW_EQUALIS_CORE_WORKS/);
  assert.doesNotMatch(source, /title="YIELD_OPTIMIZED"/);

  assert.match(source, />Transmissions</);
  assert.match(source, />App</);
  assert.match(source, />Source</);
});
