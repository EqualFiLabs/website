import rawPoolsConfig from "./pools.json";

export const resolvePoolsConfig = (chainId) => {
  // Foundry uses different addresses
  if (chainId === 31337) {
    return rawPoolsConfig["31337"] || { pools: [], indexTokens: [] };
  }
  // All testnets use the same addresses
  return rawPoolsConfig["testnets"] || { pools: [], indexTokens: [] };
};

export const getPoolsConfig = (chainId) => resolvePoolsConfig(chainId);
