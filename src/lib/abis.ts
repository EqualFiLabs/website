export const derivativeViewAbi = [
  {
    type: "function",
    name: "getActiveAuctions",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      { name: "ids", type: "uint256[]" },
      { name: "total", type: "uint256" },
    ],
  },
] as const;

export const auctionManagementViewAbi = [
  {
    type: "function",
    name: "getActiveCommunityAuctions",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      { name: "ids", type: "uint256[]" },
      { name: "total", type: "uint256" },
    ],
  },
] as const;

export const ammAuctionAbi = [
  {
    type: "function",
    name: "getAuction",
    stateMutability: "view",
    inputs: [{ name: "auctionId", type: "uint256" }],
    outputs: [
      {
        name: "auction",
        type: "tuple",
        components: [
          { name: "makerPositionKey", type: "bytes32" },
          { name: "makerPositionId", type: "uint256" },
          { name: "poolIdA", type: "uint256" },
          { name: "poolIdB", type: "uint256" },
          { name: "tokenA", type: "address" },
          { name: "tokenB", type: "address" },
          { name: "reserveA", type: "uint256" },
          { name: "reserveB", type: "uint256" },
          { name: "initialReserveA", type: "uint256" },
          { name: "initialReserveB", type: "uint256" },
          { name: "invariant", type: "uint256" },
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "feeBps", type: "uint16" },
          { name: "feeAsset", type: "uint8" },
          { name: "makerFeeAAccrued", type: "uint256" },
          { name: "makerFeeBAccrued", type: "uint256" },
          { name: "treasuryFeeAAccrued", type: "uint256" },
          { name: "treasuryFeeBAccrued", type: "uint256" },
          { name: "active", type: "bool" },
          { name: "finalized", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "createAuction",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "positionId", type: "uint256" },
          { name: "poolIdA", type: "uint256" },
          { name: "poolIdB", type: "uint256" },
          { name: "reserveA", type: "uint256" },
          { name: "reserveB", type: "uint256" },
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "feeBps", type: "uint16" },
          { name: "feeAsset", type: "uint8" },
        ],
      },
    ],
    outputs: [{ name: "auctionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "addLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "previewSwap",
    stateMutability: "view",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "tokenIn", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "feeAmount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "previewSwapWithSlippage",
    stateMutability: "view",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "tokenIn", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "slippageBps", type: "uint16" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "feeAmount", type: "uint256" },
      { name: "minOut", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "swapExactInOrFinalize",
    stateMutability: "payable",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "tokenIn", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "maxIn", type: "uint256" },
      { name: "minOut", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "finalized", type: "bool" },
    ],
  },
] as const;

export const communityAuctionAbi = [
  {
    type: "function",
    name: "getCommunityAuction",
    stateMutability: "view",
    inputs: [{ name: "auctionId", type: "uint256" }],
    outputs: [
      {
        name: "auction",
        type: "tuple",
        components: [
          { name: "creatorPositionKey", type: "bytes32" },
          { name: "creatorPositionId", type: "uint256" },
          { name: "poolIdA", type: "uint256" },
          { name: "poolIdB", type: "uint256" },
          { name: "tokenA", type: "address" },
          { name: "tokenB", type: "address" },
          { name: "reserveA", type: "uint256" },
          { name: "reserveB", type: "uint256" },
          { name: "feeBps", type: "uint16" },
          { name: "feeAsset", type: "uint8" },
          { name: "feeIndexA", type: "uint256" },
          { name: "feeIndexB", type: "uint256" },
          { name: "feeIndexRemainderA", type: "uint256" },
          { name: "feeIndexRemainderB", type: "uint256" },
          { name: "treasuryFeeAAccrued", type: "uint256" },
          { name: "treasuryFeeBAccrued", type: "uint256" },
          { name: "indexFeeAAccrued", type: "uint256" },
          { name: "indexFeeBAccrued", type: "uint256" },
          { name: "activeCreditFeeAAccrued", type: "uint256" },
          { name: "activeCreditFeeBAccrued", type: "uint256" },
          { name: "totalShares", type: "uint256" },
          { name: "makerCount", type: "uint256" },
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "active", type: "bool" },
          { name: "finalized", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "createCommunityAuction",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "positionId", type: "uint256" },
          { name: "poolIdA", type: "uint256" },
          { name: "poolIdB", type: "uint256" },
          { name: "reserveA", type: "uint256" },
          { name: "reserveB", type: "uint256" },
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "feeBps", type: "uint16" },
          { name: "feeAsset", type: "uint8" },
        ],
      },
    ],
    outputs: [{ name: "auctionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinCommunityAuction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "positionId", type: "uint256" },
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "previewCommunitySwap",
    stateMutability: "view",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "tokenIn", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "feeAmount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "swapExactIn",
    stateMutability: "payable",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "tokenIn", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "maxIn", type: "uint256" },
      { name: "minOut", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

export const lendingAbi = [
  {
    type: "function",
    name: "openRollingFromPosition",
    stateMutability: "payable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "pid", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "minReceived", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const equalIndexActionsAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "payable",
    inputs: [
      { name: "indexId", type: "uint256" },
      { name: "units", type: "uint256" },
      { name: "to", type: "address" },
      { name: "maxInputAmounts", type: "uint256[]" },
    ],
    outputs: [{ name: "minted", type: "uint256" }],
  },
  {
    type: "function",
    name: "burn",
    stateMutability: "payable",
    inputs: [
      { name: "indexId", type: "uint256" },
      { name: "units", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "assetsOut", type: "uint256[]" }],
  },
] as const;

export const equalIndexViewAbi = [
  {
    type: "function",
    name: "getIndex",
    stateMutability: "view",
    inputs: [{ name: "indexId", type: "uint256" }],
    outputs: [
      {
        name: "index_",
        type: "tuple",
        components: [
          { name: "assets", type: "address[]" },
          { name: "bundleAmounts", type: "uint256[]" },
          { name: "mintFeeBps", type: "uint16[]" },
          { name: "burnFeeBps", type: "uint16[]" },
          { name: "flashFeeBps", type: "uint16" },
          { name: "totalUnits", type: "uint256" },
          { name: "token", type: "address" },
          { name: "paused", type: "bool" },
        ],
      },
    ],
  },
] as const;
