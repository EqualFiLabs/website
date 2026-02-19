import rawPoolsConfig from "./pools.json";

export const resolvePoolsConfig = () => rawPoolsConfig || { pools: [], indexTokens: [] };
export const getPoolsConfig = (chainId) => resolvePoolsConfig(chainId);
