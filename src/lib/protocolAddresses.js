const trimString = (value) => (typeof value === "string" ? value.trim() : "");

export const resolveProtocolAddresses = (poolsConfig) => {
  const diamondAddress = trimString(
    poolsConfig?.diamondAddress || process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || "",
  );
  const positionNFTAddress = trimString(
    poolsConfig?.positionNFTAddress ||
      process.env.NEXT_PUBLIC_POSITION_NFT ||
      process.env.NEXT_PUBLIC_POSITION_NFT_ADDRESS ||
      "",
  );
  const faucetAddress = trimString(
    poolsConfig?.faucetAddress || process.env.NEXT_PUBLIC_FAUCET_ADDRESS || "",
  );

  return {
    diamondAddress,
    positionNFTAddress,
    faucetAddress,
  };
};
