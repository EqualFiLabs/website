const FOUNDRY_CHAIN_ID = 31337;

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
