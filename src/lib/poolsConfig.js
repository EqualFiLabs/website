import rawPoolsConfig from "./pools.json";

const EMPTY_CONFIG = { pools: [], indexTokens: [], ilmIsolatedMarkets: [] };

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
  };
};

export const resolvePoolsConfig = (chainId) => {
  const normalizedChainId = Number(chainId);

  // Foundry uses deployment-local addresses
  if (normalizedChainId === 31337) {
    const baseConfig = rawPoolsConfig.foundry || rawPoolsConfig["31337"] || EMPTY_CONFIG;
    const envOverride = parseEnvConfig(
      process.env.NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY,
      "NEXT_PUBLIC_POOLS_CONFIG_FOUNDRY",
    );
    return mergePoolsConfig(baseConfig, envOverride);
  }

  // All non-foundry chains use shared testnet addresses by default.
  const baseConfig = rawPoolsConfig.testnets || EMPTY_CONFIG;
  const envOverride = parseEnvConfig(
    process.env.NEXT_PUBLIC_POOLS_CONFIG_TESTNET,
    "NEXT_PUBLIC_POOLS_CONFIG_TESTNET",
  );
  return mergePoolsConfig(baseConfig, envOverride);
};

export const getPoolsConfig = (chainId) => resolvePoolsConfig(chainId);
