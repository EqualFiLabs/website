import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resolverPath = path.resolve(__dirname, "../src/lib/foundryOverrides.js");

const loadResolvers = async () => {
  const source = await readFile(resolverPath, "utf8");
  const transformed = source
    .replace("export const resolveFoundryOverride = ", "const resolveFoundryOverride = ")
    .replace("export const resolveFoundryAddressEnv = ", "const resolveFoundryAddressEnv = ")
    .concat("\nmodule.exports = { resolveFoundryOverride, resolveFoundryAddressEnv };");

  const module = { exports: {} as Record<string, unknown> };
  runInNewContext(transformed, {
    module,
    exports: module.exports,
    process,
  });

  return {
    resolveFoundryOverride: module.exports.resolveFoundryOverride as (
      chainId: number,
      baseValue: string,
      foundryValue: string,
    ) => string,
    resolveFoundryAddressEnv: module.exports.resolveFoundryAddressEnv as (
      chainId: number,
      baseEnvKey: string,
      foundryEnvKey: string,
    ) => string,
  };
};

test("resolveFoundryOverride uses foundry value only on chain 31337", async () => {
  const { resolveFoundryOverride } = await loadResolvers();

  assert.equal(
    resolveFoundryOverride(31337, "0xtestnet", "0xfoundry"),
    "0xfoundry",
  );
  assert.equal(
    resolveFoundryOverride(421614, "0xtestnet", "0xfoundry"),
    "0xtestnet",
  );
  assert.equal(
    resolveFoundryOverride(31337, "0xtestnet", ""),
    "0xtestnet",
  );
});

test("resolveFoundryAddressEnv applies foundry override and trims whitespace", async () => {
  const { resolveFoundryAddressEnv } = await loadResolvers();
  const prevBase = process.env.NEXT_PUBLIC_OPTION_TOKEN;
  const prevFoundry = process.env.NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY;

  process.env.NEXT_PUBLIC_OPTION_TOKEN = " 0xtestnet ";
  process.env.NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY = " 0xfoundry ";

  try {
    assert.equal(
      resolveFoundryAddressEnv(
        31337,
        "NEXT_PUBLIC_OPTION_TOKEN",
        "NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY",
      ),
      "0xfoundry",
    );
    assert.equal(
      resolveFoundryAddressEnv(
        84532,
        "NEXT_PUBLIC_OPTION_TOKEN",
        "NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY",
      ),
      "0xtestnet",
    );
  } finally {
    if (prevBase === undefined) delete process.env.NEXT_PUBLIC_OPTION_TOKEN;
    else process.env.NEXT_PUBLIC_OPTION_TOKEN = prevBase;

    if (prevFoundry === undefined) delete process.env.NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY;
    else process.env.NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY = prevFoundry;
  }
});
