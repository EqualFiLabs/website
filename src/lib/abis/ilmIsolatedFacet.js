export const ilmIsolatedFacetAbi = [
  {
    inputs: [
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'assets', type: 'uint256' },
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'isolatedSupply',
    outputs: [
      { internalType: 'uint256', name: 'assetsOut', type: 'uint256' },
      { internalType: 'uint256', name: 'sharesOut', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'assets', type: 'uint256' },
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'isolatedWithdraw',
    outputs: [
      { internalType: 'uint256', name: 'assetsOut', type: 'uint256' },
      { internalType: 'uint256', name: 'sharesOut', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'assets', type: 'uint256' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'isolatedSupplyCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'assets', type: 'uint256' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'isolatedWithdrawCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'assets', type: 'uint256' },
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'isolatedBorrow',
    outputs: [
      { internalType: 'uint256', name: 'assetsOut', type: 'uint256' },
      { internalType: 'uint256', name: 'sharesOut', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'assets', type: 'uint256' },
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'isolatedRepay',
    outputs: [
      { internalType: 'uint256', name: 'assetsOut', type: 'uint256' },
      { internalType: 'uint256', name: 'sharesOut', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const ilmIsolatedLiquidationFacetAbi = [
  {
    inputs: [
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'borrowerPositionId', type: 'uint256' },
      { internalType: 'uint256', name: 'seizedAssets', type: 'uint256' },
      { internalType: 'uint256', name: 'repaidShares', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidatorPositionId', type: 'uint256' },
    ],
    name: 'isolatedLiquidate',
    outputs: [
      { internalType: 'uint256', name: 'seizedOut', type: 'uint256' },
      { internalType: 'uint256', name: 'repaidAssetsOut', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const ilmIsolatedViewFacetAbi = [
  {
    inputs: [{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' }],
    name: 'getIsolatedMarket',
    outputs: [
      {
        components: [
          { internalType: 'uint128', name: 'totalSupplyAssets', type: 'uint128' },
          { internalType: 'uint128', name: 'totalSupplyShares', type: 'uint128' },
          { internalType: 'uint128', name: 'totalBorrowAssets', type: 'uint128' },
          { internalType: 'uint128', name: 'totalBorrowShares', type: 'uint128' },
          { internalType: 'uint128', name: 'lastUpdate', type: 'uint128' },
          { internalType: 'uint128', name: 'fee', type: 'uint128' },
        ],
        internalType: 'struct IlmIsolatedTypes.IlmIsolatedMarket',
        name: 'market',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' }],
    name: 'getIsolatedMarketParams',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'loanPoolId', type: 'uint256' },
          { internalType: 'uint256', name: 'collateralPoolId', type: 'uint256' },
          { internalType: 'address', name: 'oracle', type: 'address' },
          { internalType: 'address', name: 'irm', type: 'address' },
          { internalType: 'uint256', name: 'lltv', type: 'uint256' },
        ],
        internalType: 'struct IlmIsolatedTypes.IlmIsolatedMarketParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'positionKey', type: 'bytes32' },
    ],
    name: 'getIsolatedPosition',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'supplyShares', type: 'uint256' },
          { internalType: 'uint128', name: 'borrowShares', type: 'uint128' },
          { internalType: 'uint128', name: 'collateralAssets', type: 'uint128' },
        ],
        internalType: 'struct IlmIsolatedTypes.IlmIsolatedPosition',
        name: 'position',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' }],
    name: 'getIsolatedMarketLiquidationFeeBps',
    outputs: [{ internalType: 'uint16', name: 'bps', type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' }],
    name: 'getIsolatedMarketProtocolFeeAssets',
    outputs: [{ internalType: 'uint256', name: 'feeAssets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'irm', type: 'address' }],
    name: 'isIlmIrmManagedOnly',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'marketId', type: 'bytes32' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'isIsolatedHealthy',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
]

export const ilmIsolatedAdminFacetAbi = [
  {
    inputs: [
      {
        components: [
          { internalType: 'uint256', name: 'loanPoolId', type: 'uint256' },
          { internalType: 'uint256', name: 'collateralPoolId', type: 'uint256' },
          { internalType: 'address', name: 'oracle', type: 'address' },
          { internalType: 'address', name: 'irm', type: 'address' },
          { internalType: 'uint256', name: 'lltv', type: 'uint256' },
        ],
        internalType: 'struct IlmIsolatedTypes.IlmIsolatedMarketParams',
        name: 'params',
        type: 'tuple',
      },
      { internalType: 'uint256', name: 'moduleId', type: 'uint256' },
    ],
    name: 'createIlmIsolatedMarket',
    outputs: [{ internalType: 'bytes32', name: 'marketId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]
