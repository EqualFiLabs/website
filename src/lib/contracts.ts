export const CONTRACTS = {
  swapRouter: process.env.NEXT_PUBLIC_SWAP_ROUTER as `0x${string}` | undefined,
  soloAuction: process.env.NEXT_PUBLIC_SOLO_AUCTION as `0x${string}` | undefined,
  communityAuction: process.env.NEXT_PUBLIC_COMMUNITY_AUCTION as `0x${string}` | undefined,
  liquidityManager: process.env.NEXT_PUBLIC_LIQUIDITY_MANAGER as `0x${string}` | undefined,
  borrowManager: process.env.NEXT_PUBLIC_BORROW_MANAGER as `0x${string}` | undefined,
  indexToken: process.env.NEXT_PUBLIC_INDEX_TOKEN as `0x${string}` | undefined,
} as const;

export const ABI = {
  // TODO: Replace with real ABIs
  swapRouter: [
    {
      type: "function",
      name: "swap",
      stateMutability: "nonpayable",
      inputs: [
        { name: "tokenIn", type: "address" },
        { name: "tokenOut", type: "address" },
        { name: "amountIn", type: "uint256" },
        { name: "minOut", type: "uint256" },
      ],
      outputs: [],
    },
  ],
  soloAuction: [
    {
      type: "function",
      name: "startSoloAuction",
      stateMutability: "nonpayable",
      inputs: [
        { name: "asset", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "reservePrice", type: "uint256" },
      ],
      outputs: [],
    },
  ],
  communityAuction: [
    {
      type: "function",
      name: "startCommunityAuction",
      stateMutability: "nonpayable",
      inputs: [
        { name: "asset", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "minBid", type: "uint256" },
      ],
      outputs: [],
    },
  ],
  liquidityManager: [
    {
      type: "function",
      name: "addLiquidity",
      stateMutability: "nonpayable",
      inputs: [
        { name: "tokenA", type: "address" },
        { name: "tokenB", type: "address" },
        { name: "amountA", type: "uint256" },
        { name: "amountB", type: "uint256" },
      ],
      outputs: [],
    },
    {
      type: "function",
      name: "removeLiquidity",
      stateMutability: "nonpayable",
      inputs: [
        { name: "tokenA", type: "address" },
        { name: "tokenB", type: "address" },
        { name: "liquidity", type: "uint256" },
      ],
      outputs: [],
    },
  ],
  borrowManager: [
    {
      type: "function",
      name: "borrowSameAsset",
      stateMutability: "nonpayable",
      inputs: [
        { name: "asset", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [],
    },
  ],
  indexToken: [
    {
      type: "function",
      name: "mint",
      stateMutability: "nonpayable",
      inputs: [
        { name: "amount", type: "uint256" },
      ],
      outputs: [],
    },
    {
      type: "function",
      name: "burn",
      stateMutability: "nonpayable",
      inputs: [
        { name: "amount", type: "uint256" },
      ],
      outputs: [],
    },
  ],
} as const;
