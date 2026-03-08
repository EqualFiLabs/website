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

test("foundry and robinhood configs are separated from shared testnet config", async () => {
  const pools = await readPools();
  const foundry = pools.foundry;
  const robinhood = pools.robinhoodTestnet;
  const testnets = pools.testnets;

  assert.ok(foundry);
  assert.ok(robinhood);
  assert.ok(testnets);
  assert.equal(foundry.diamondAddress.toLowerCase(), "0x6d4d3804be8d213c541f5a0cb64e18ce4bfb7433");
  assert.equal(foundry.positionNFTAddress.toLowerCase(), "0xa06da3a0d7805762ce2cdbf706be4ec7c769fe67");
  assert.equal(foundry.faucetAddress.toLowerCase(), "0x5c3d413b078bda79db22a6b8c425e91f758f7e84");
  assert.equal(foundry.pools[0].tokenAddress.toLowerCase(), "0x392133ff6fc1af8f95d1471828b52ee7056adb76");
  assert.equal(foundry.indexTokens[0].indexTokenAddress.toLowerCase(), "0x03118c7a169e03f4f55e2f6943da7b9ccdb62b20");
  assert.equal(robinhood.diamondAddress.toLowerCase(), "0xf85e0456c59472937484a3c2e6f9180853676efa");
  assert.equal(robinhood.positionNFTAddress.toLowerCase(), "0x009640f8aa72ff6182fc899ae4855a57fbae43b9");
  assert.equal(robinhood.faucetAddress.toLowerCase(), "0xb9013f9e6c8e41271583840e9d7ef36f95d0da9e");
  assert.equal(robinhood.pools[0].tokenAddress.toLowerCase(), "0x5c3d413b078bda79db22a6b8c425e91f758f7e84");
  assert.equal(robinhood.indexTokens[0].indexTokenAddress.toLowerCase(), "0x42b16f9d220952c65507ccf118acd33332b19331");
  assert.deepEqual(
    robinhood.indexTokens.map((token: any) => token.indexTicker),
    ["EQ-ETH", "EQ-BTC", "EQ-USD", "EQRH5", "EQRHAMZN", "EQRHAMD", "EQRHNFLX", "EQRHPLTR", "EQRHTSLA"],
  );
  assert.deepEqual(
    robinhood.indexTokens.map((token: any) => Number(token.indexId)),
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
  );
  const robinhoodStockPools = robinhood.pools.filter((pool: any) =>
    ["AMZN", "AMD", "NFLX", "PLTR", "TSLA"].includes(pool.ticker),
  );
  assert.equal(robinhoodStockPools.length, 5);
  assert.deepEqual(
    robinhoodStockPools.map((pool: any) => pool.ticker),
    ["AMZN", "AMD", "NFLX", "PLTR", "TSLA"],
  );
  assert.deepEqual(
    robinhoodStockPools.map((pool: any) => Number(pool.pid)),
    [10, 11, 12, 13, 14],
  );
  const robinhoodIndexTokenPools = robinhood.pools.filter((pool: any) =>
    ["EQRH5", "EQRHAMZN", "EQRHAMD", "EQRHNFLX", "EQRHPLTR", "EQRHTSLA"].includes(pool.ticker),
  );
  assert.equal(robinhoodIndexTokenPools.length, 6);
  assert.deepEqual(
    robinhoodIndexTokenPools.map((pool: any) => pool.ticker),
    ["EQRH5", "EQRHAMZN", "EQRHAMD", "EQRHNFLX", "EQRHPLTR", "EQRHTSLA"],
  );
  assert.deepEqual(
    robinhoodIndexTokenPools.map((pool: any) => Number(pool.pid)),
    [15, 16, 17, 18, 19, 20],
  );
  assert.notEqual(foundry.diamondAddress.toLowerCase(), testnets.diamondAddress.toLowerCase());
  assert.notEqual(robinhood.diamondAddress.toLowerCase(), testnets.diamondAddress.toLowerCase());
});

test("resolver routes chain 31337 to foundry, 46630 to robinhood, and others to shared testnets", async () => {
  const pools = await readPools();
  const resolvePoolsConfig = await loadResolvePoolsConfig();

  const foundryConfig = resolvePoolsConfig(31337);
  const robinhoodConfig = resolvePoolsConfig(46630);
  const arbSepoliaConfig = resolvePoolsConfig(421614);
  const baseSepoliaConfig = resolvePoolsConfig(84532);
  const ethSepoliaConfig = resolvePoolsConfig(11155111);

  assert.equal(foundryConfig.diamondAddress.toLowerCase(), pools.foundry.diamondAddress.toLowerCase());
  assert.equal(robinhoodConfig.diamondAddress.toLowerCase(), pools.robinhoodTestnet.diamondAddress.toLowerCase());
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

test("resolver applies robinhood env override only on chain 46630", async () => {
  const pools = await readPools();
  const resolvePoolsConfig = await loadResolvePoolsConfig();
  const previousRobinhood = process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET;

  process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET = JSON.stringify({
    diamondAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    positionNFTAddress: "0xffffffffffffffffffffffffffffffffffffffff",
    faucetAddress: "0x9999999999999999999999999999999999999999",
  });

  try {
    const robinhoodConfig = resolvePoolsConfig(46630);
    const testnetConfig = resolvePoolsConfig(84532);

    assert.equal(robinhoodConfig.diamondAddress, "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
    assert.equal(robinhoodConfig.positionNFTAddress, "0xffffffffffffffffffffffffffffffffffffffff");
    assert.equal(robinhoodConfig.faucetAddress, "0x9999999999999999999999999999999999999999");
    assert.equal(testnetConfig.diamondAddress.toLowerCase(), pools.testnets.diamondAddress.toLowerCase());
  } finally {
    if (previousRobinhood === undefined) delete process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET;
    else process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET = previousRobinhood;
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
    assert.equal(testnetConfig.ilmPooledMarkets.length, pools.testnets.ilmPooledMarkets.length);
    assert.equal(testnetConfig.perpsMarkets.length, pools.testnets.perpsMarkets.length);
  } finally {
    if (previousTestnet === undefined) delete process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET;
    else process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET = previousTestnet;
  }
});

test("resolver accepts robinhood ilm pooled market overrides", async () => {
  const resolvePoolsConfig = await loadResolvePoolsConfig();
  const previousRobinhood = process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET;

  process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET = JSON.stringify({
    ilmPooledMarkets: [
      {
        id: "pooled-usdc-weth",
        marketId: 1,
        loanPoolId: 5,
        collateralPoolId: 4,
        moduleId: 8100,
      },
    ],
  });

  try {
    const robinhoodConfig = resolvePoolsConfig(46630);
    assert.equal(robinhoodConfig.ilmPooledMarkets.length, 1);
    assert.equal(robinhoodConfig.ilmPooledMarkets[0].id, "pooled-usdc-weth");
    assert.equal(robinhoodConfig.ilmPooledMarkets[0].marketId, 1);
  } finally {
    if (previousRobinhood === undefined) delete process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET;
    else process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET = previousRobinhood;
  }
});

test("resolver accepts robinhood perps market overrides", async () => {
  const resolvePoolsConfig = await loadResolvePoolsConfig();
  const previousRobinhood = process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET;

  process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET = JSON.stringify({
    perpsMarkets: [
      {
        id: "rh-usdc-amzn",
        collateralPoolId: 5,
        collateralAsset: "0x9d67E306479B14239774146fe8e16EBD0357440A",
        indexAsset: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02",
        feePoolId: 5,
      },
    ],
  });

  try {
    const robinhoodConfig = resolvePoolsConfig(46630);
    assert.equal(robinhoodConfig.perpsMarkets.length, 1);
    assert.equal(robinhoodConfig.perpsMarkets[0].id, "rh-usdc-amzn");
    assert.equal(robinhoodConfig.perpsMarkets[0].collateralPoolId, 5);
  } finally {
    if (previousRobinhood === undefined) delete process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET;
    else process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET = previousRobinhood;
  }
});
