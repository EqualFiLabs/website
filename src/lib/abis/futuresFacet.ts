export const futuresFacetAbi = [
  {
    type: "function",
    name: "createFuturesSeries",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "positionId", type: "uint256" },
          { name: "underlyingPoolId", type: "uint256" },
          { name: "quotePoolId", type: "uint256" },
          { name: "forwardPrice", type: "uint256" },
          { name: "expiry", type: "uint64" },
          { name: "totalSize", type: "uint256" },
          { name: "contractSize", type: "uint256" },
          { name: "isEuropean", type: "bool" },
          { name: "useCustomFees", type: "bool" },
          { name: "createFeeBps", type: "uint16" },
          { name: "exerciseFeeBps", type: "uint16" },
          { name: "reclaimFeeBps", type: "uint16" },
        ],
      },
    ],
    outputs: [{ name: "seriesId", type: "uint256" }],
  },
  {
    type: "function",
    name: "settleFutures",
    stateMutability: "payable",
    inputs: [
      { name: "seriesId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "maxPayment", type: "uint256" },
      { name: "minReceived", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "previewSettlePayment",
    stateMutability: "view",
    inputs: [
      { name: "seriesId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "payment", type: "uint256" }],
  },
  {
    type: "function",
    name: "reclaimFutures",
    stateMutability: "nonpayable",
    inputs: [{ name: "seriesId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "burnReclaimedFuturesClaims",
    stateMutability: "nonpayable",
    inputs: [
      { name: "holder", type: "address" },
      { name: "seriesId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
