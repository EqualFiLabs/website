import rawPoolsConfig from "./pools.json";

const EMPTY_CONFIG = { pools: [], indexTokens: [], ilmIsolatedMarkets: [], ilmPooledMarkets: [], perpsMarkets: [] };
const FOUNDRY_CHAIN_ID = 31337;
const ROBINHOOD_TESTNET_CHAIN_ID = 46630;

const parseEnvConfig = (rawValue, envName) => {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("expected a JSON object");
    }
    return parsed;
  } catch (error) {
    console.warn(`[poolsConfig] Ignoring invalid ${envName}: ${error.message}`);
    return null;
  }
};

const mergePoolsConfig = (baseConfig, overrideConfig) => {
  if (!overrideConfig) {
    return baseConfig;
  }
  return {
    ...baseConfig,
    ...overrideConfig,
    pools: Array.isArray(overrideConfig.pools) ? overrideConfig.pools : baseConfig.pools,
    indexTokens: Array.isArray(overrideConfig.indexTokens) ? overrideConfig.indexTokens : baseConfig.indexTokens,
    ilmIsolatedMarkets: Array.isArray(overrideConfig.ilmIsolatedMarkets)
      ? overrideConfig.ilmIsolatedMarkets
      : baseConfig.ilmIsolatedMarkets,
    ilmPooledMarkets: Array.isArray(overrideConfig.ilmPooledMarkets)
      ? overrideConfig.ilmPooledMarkets
      : baseConfig.ilmPooledMarkets,
    perpsMarkets: Array.isArray(overrideConfig.perpsMarkets) ? overrideConfig.perpsMarkets : baseConfig.perpsMarkets,
  };
};

export const resolvePoolsConfig = (chainId) => {
  const normalizedChainId = Number(chainId);

  // Foundry uses deployment-local addresses
  if (normalizedChainId === FOUNDRY_CHAIN_ID) {
    const baseConfig = rawPoolsConfig.foundry || rawPoolsConfig["31337"] || EMPTY_CONFIG;
    const envOverride = parseEnvConfig(
      process.env.NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY,
      "NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY",
    );
    return mergePoolsConfig(baseConfig, envOverride);
  }

  // Robinhood testnet uses a dedicated deployment config.
  if (normalizedChainId === ROBINHOOD_TESTNET_CHAIN_ID) {
    const baseConfig = rawPoolsConfig.robinhoodTestnet || rawPoolsConfig["46630"] || EMPTY_CONFIG;
    const envOverride = parseEnvConfig(
      process.env.NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET,
      "NEXT_PUBLIC_POOLS_CONFIG_ROBINHOOD_TESTNET",
    );
    return mergePoolsConfig(baseConfig, envOverride);
  }

  // Remaining chains use shared testnet addresses by default.
  const baseConfig = rawPoolsConfig.testnets || EMPTY_CONFIG;
  const envOverride = parseEnvConfig(
    process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET,
    "NEXT_PUBLIC_POOLS_CONFIG_TESTNET",
  );
  return mergePoolsConfig(baseConfig, envOverride);
};

export const getPoolsConfig = (chainId) => resolvePoolsConfig(chainId);
