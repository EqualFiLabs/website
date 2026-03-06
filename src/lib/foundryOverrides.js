const FOUNDRY_CHAIN_ID = 31337;
const ROBINHOOD_TESTNET_CHAIN_ID = 46630;

const trimString = (value) => (typeof value === "string" ? value.trim() : "");

export const resolveFoundryOverride = (chainId, baseValue, foundryValue) => {
  const base = trimString(baseValue);
  const foundry = trimString(foundryValue);
  if (Number(chainId) === FOUNDRY_CHAIN_ID && foundry) {
    return foundry;
  }
  return base;
};

export const resolveFoundryAddressEnv = (chainId, baseEnvKey, foundryEnvKey) =>
  resolveFoundryOverride(chainId, process.env[baseEnvKey], process.env[foundryEnvKey]);

export const resolveChainOverride = (
  chainId,
  baseValue,
  foundryValue,
  robinhoodTestnetValue,
) => {
  const normalizedChainId = Number(chainId);
  const base = trimString(baseValue);
  const foundry = trimString(foundryValue);
  const robinhood = trimString(robinhoodTestnetValue);

  if (normalizedChainId === FOUNDRY_CHAIN_ID && foundry) {
    return foundry;
  }
  if (normalizedChainId === ROBINHOOD_TESTNET_CHAIN_ID && robinhood) {
    return robinhood;
  }
  return base;
};

export const resolveChainAddressEnv = (
  chainId,
  baseEnvKey,
  foundryEnvKey,
  robinhoodTestnetEnvKey,
) =>
  resolveChainOverride(
    chainId,
    process.env[baseEnvKey],
    process.env[foundryEnvKey],
    process.env[robinhoodTestnetEnvKey],
  );
