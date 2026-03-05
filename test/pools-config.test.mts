import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const poolsPath = path.resolve(__dirname, "../src/lib/pools.json");
const resolverPath = path.resolve(__dirname, "../src/lib/poolsConfig.js");

const readPools = async () => {
  const raw = await readFile(poolsPath, "utf8");
  return JSON.parse(raw);
};

const loadResolvePoolsConfig = async () => {
  const resolverSource = await readFile(resolverPath, "utf8");
  const transformed = resolverSource
    .replace(
      'import rawPoolsConfig from "./pools.json";',
      `const rawPoolsConfig = JSON.parse(readFileSync(${JSON.stringify(poolsPath)}, "utf8"));`,
    )
    .replace("export const resolvePoolsConfig = ", "const resolvePoolsConfig = ")
    .replace("export const getPoolsConfig = ", "const getPoolsConfig = ")
    .concat("\nmodule.exports = { resolvePoolsConfig, getPoolsConfig };");

  const module = { exports: {} as Record<string, unknown> };
  runInNewContext(transformed, {
    module,
    exports: module.exports,
    process,
    console,
    readFileSync,
  });
  return module.exports.resolvePoolsConfig as (chainId: number) => any;
};

test("foundry config is separated from shared testnet config", async () => {
  const pools = await readPools();
  const foundry = pools.foundry;
  const testnets = pools.testnets;

  assert.ok(foundry);
  assert.ok(testnets);
  assert.equal(foundry.diamondAddress.toLowerCase(), "0xbe5a795ae0754d8d36f6edfd546e55f5e60d6455");
  assert.equal(foundry.positionNFTAddress.toLowerCase(), "0x6ee471e753ba98246152528bb76302401848f9cf");
  assert.equal(foundry.faucetAddress.toLowerCase(), "0x23f458e00f9b84283724cd5a68bfee47ff060a06");
  assert.equal(foundry.pools[0].tokenAddress.toLowerCase(), "0xd651bdab64a34fc8f8c0d4044cbe742ca8d45314");
  assert.equal(foundry.indexTokens[0].indexTokenAddress.toLowerCase(), "0x91ec682537438775ecc53cdf46b7184f74d99473");
  assert.notEqual(foundry.diamondAddress.toLowerCase(), testnets.diamondAddress.toLowerCase());
});

test("resolver routes chain 31337 to foundry and others to shared testnets", async () => {
  const pools = await readPools();
  const resolvePoolsConfig = await loadResolvePoolsConfig();

  const foundryConfig = resolvePoolsConfig(31337);
  const arbSepoliaConfig = resolvePoolsConfig(421614);
  const baseSepoliaConfig = resolvePoolsConfig(84532);
  const ethSepoliaConfig = resolvePoolsConfig(11155111);

  assert.equal(foundryConfig.diamondAddress.toLowerCase(), pools.foundry.diamondAddress.toLowerCase());
  assert.equal(arbSepoliaConfig.diamondAddress.toLowerCase(), pools.testnets.diamondAddress.toLowerCase());
  assert.equal(baseSepoliaConfig.diamondAddress.toLowerCase(), pools.testnets.diamondAddress.toLowerCase());
  assert.equal(ethSepoliaConfig.diamondAddress.toLowerCase(), pools.testnets.diamondAddress.toLowerCase());
});

test("resolver applies foundry env override only on chain 31337", async () => {
  const pools = await readPools();
  const resolvePoolsConfig = await loadResolvePoolsConfig();
  const previousFoundry = process.env.NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY;
  const previousTestnet = process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET;

  process.env.NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY = JSON.stringify({
    diamondAddress: "0x1111111111111111111111111111111111111111",
    positionNFTAddress: "0x2222222222222222222222222222222222222222",
    faucetAddress: "0x3333333333333333333333333333333333333333",
  });
  delete process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET;

  try {
    const foundryConfig = resolvePoolsConfig(31337);
    const testnetConfig = resolvePoolsConfig(421614);

    assert.equal(foundryConfig.diamondAddress, "0x1111111111111111111111111111111111111111");
    assert.equal(foundryConfig.positionNFTAddress, "0x2222222222222222222222222222222222222222");
    assert.equal(foundryConfig.faucetAddress, "0x3333333333333333333333333333333333333333");
    assert.equal(testnetConfig.diamondAddress.toLowerCase(), pools.testnets.diamondAddress.toLowerCase());
  } finally {
    if (previousFoundry === undefined) delete process.env.NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY;
    else process.env.NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY = previousFoundry;

    if (previousTestnet === undefined) delete process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET;
    else process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET = previousTestnet;
  }
});

test("resolver applies testnet env override only for non-foundry chains", async () => {
  const pools = await readPools();
  const resolvePoolsConfig = await loadResolvePoolsConfig();
  const previousFoundry = process.env.NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY;
  const previousTestnet = process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET;

  delete process.env.NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY;
  process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET = JSON.stringify({
    diamondAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    positionNFTAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    faucetAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
  });

  try {
    const foundryConfig = resolvePoolsConfig(31337);
    const testnetConfig = resolvePoolsConfig(84532);

    assert.equal(foundryConfig.diamondAddress.toLowerCase(), pools.foundry.diamondAddress.toLowerCase());
    assert.equal(testnetConfig.diamondAddress, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(testnetConfig.positionNFTAddress, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(testnetConfig.faucetAddress, "0xcccccccccccccccccccccccccccccccccccccccc");
  } finally {
    if (previousFoundry === undefined) delete process.env.NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY;
    else process.env.NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY = previousFoundry;

    if (previousTestnet === undefined) delete process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET;
    else process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET = previousTestnet;
  }
});

test("resolver merges partial env overrides and keeps base pools/index tokens", async () => {
  const pools = await readPools();
  const resolvePoolsConfig = await loadResolvePoolsConfig();
  const previousTestnet = process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET;

  process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET = JSON.stringify({
    diamondAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
  });

  try {
    const testnetConfig = resolvePoolsConfig(11155111);
    assert.equal(testnetConfig.diamondAddress, "0xdddddddddddddddddddddddddddddddddddddddd");
    assert.equal(testnetConfig.pools.length, pools.testnets.pools.length);
    assert.equal(testnetConfig.indexTokens.length, pools.testnets.indexTokens.length);
  } finally {
    if (previousTestnet === undefined) delete process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET;
    else process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET = previousTestnet;
  }
});
