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
    .replace("export const resolveChainOverride = ", "const resolveChainOverride = ")
    .replace("export const resolveChainAddressEnv = ", "const resolveChainAddressEnv = ")
    .concat(
      "\nmodule.exports = { resolveFoundryOverride, resolveFoundryAddressEnv, resolveChainOverride, resolveChainAddressEnv };",
    );

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
    resolveChainOverride: module.exports.resolveChainOverride as (
      chainId: number,
      baseValue: string,
      foundryValue: string,
      robinhoodValue: string,
    ) => string,
    resolveChainAddressEnv: module.exports.resolveChainAddressEnv as (
      chainId: number,
      baseEnvKey: string,
      foundryEnvKey: string,
      robinhoodEnvKey: string,
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

test("resolveChainOverride supports foundry and robinhood chain-specific overrides", async () => {
  const { resolveChainOverride } = await loadResolvers();

  assert.equal(
    resolveChainOverride(31337, "0xtestnet", "0xfoundry", "0xrobinhood"),
    "0xfoundry",
  );
  assert.equal(
    resolveChainOverride(46630, "0xtestnet", "0xfoundry", "0xrobinhood"),
    "0xrobinhood",
  );
  assert.equal(
    resolveChainOverride(84532, "0xtestnet", "0xfoundry", "0xrobinhood"),
    "0xtestnet",
  );
  assert.equal(
    resolveChainOverride(46630, "0xtestnet", "0xfoundry", ""),
    "0xtestnet",
  );
});

test("resolveChainAddressEnv applies robinhood override and trims whitespace", async () => {
  const { resolveChainAddressEnv } = await loadResolvers();
  const prevBase = process.env.NEXT_PUBLIC_OPTION_TOKEN;
  const prevFoundry = process.env.NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY;
  const prevRobinhood = process.env.NEXT_PUBLIC_OPTION_TOKEN_ROBINHOOD_TESTNET;

  process.env.NEXT_PUBLIC_OPTION_TOKEN = " 0xtestnet ";
  process.env.NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY = " 0xfoundry ";
  process.env.NEXT_PUBLIC_OPTION_TOKEN_ROBINHOOD_TESTNET = " 0xrobinhood ";

  try {
    assert.equal(
      resolveChainAddressEnv(
        31337,
        "NEXT_PUBLIC_OPTION_TOKEN",
        "NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY",
        "NEXT_PUBLIC_OPTION_TOKEN_ROBINHOOD_TESTNET",
      ),
      "0xfoundry",
    );
    assert.equal(
      resolveChainAddressEnv(
        46630,
        "NEXT_PUBLIC_OPTION_TOKEN",
        "NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY",
        "NEXT_PUBLIC_OPTION_TOKEN_ROBINHOOD_TESTNET",
      ),
      "0xrobinhood",
    );
    assert.equal(
      resolveChainAddressEnv(
        84532,
        "NEXT_PUBLIC_OPTION_TOKEN",
        "NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY",
        "NEXT_PUBLIC_OPTION_TOKEN_ROBINHOOD_TESTNET",
      ),
      "0xtestnet",
    );
  } finally {
    if (prevBase === undefined) delete process.env.NEXT_PUBLIC_OPTION_TOKEN;
    else process.env.NEXT_PUBLIC_OPTION_TOKEN = prevBase;

    if (prevFoundry === undefined) delete process.env.NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY;
    else process.env.NEXT_PUBLIC_OPTION_TOKEN_FOUNDRY = prevFoundry;

    if (prevRobinhood === undefined) delete process.env.NEXT_PUBLIC_OPTION_TOKEN_ROBINHOOD_TESTNET;
    else process.env.NEXT_PUBLIC_OPTION_TOKEN_ROBINHOOD_TESTNET = prevRobinhood;
  }
});
