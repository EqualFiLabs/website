/**
 * Block explorer URL configuration per chain
 */
export const EXPLORER_URLS = {
  31337: "https://explorer.test",
  84532: "https://sepolia.basescan.org",
  11155111: "https://sepolia.etherscan.io",
  421614: "https://sepolia.arbiscan.io",
};

export const getExplorerUrl = (chainId) => EXPLORER_URLS[chainId] || "https://etherscan.io";
export const getTxUrl = (chainId, txHash) => `${getExplorerUrl(chainId)}/tx/${txHash}`;
