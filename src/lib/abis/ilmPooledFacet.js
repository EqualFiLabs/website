export const ilmPooledFacetAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'pooledSupply',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'pooledWithdraw',
    outputs: [{ internalType: 'uint256', name: 'withdrawn', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'pooledAddCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'pooledRemoveCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'pooledBorrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'pooledRepay',
    outputs: [{ internalType: 'uint256', name: 'repaid', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const ilmPooledAdminFacetAbi = [
  {
    inputs: [
      {
        components: [
          { internalType: 'uint256', name: 'loanPoolId', type: 'uint256' },
          { internalType: 'uint256', name: 'collateralPoolId', type: 'uint256' },
          { internalType: 'uint256', name: 'moduleId', type: 'uint256' },
          { internalType: 'uint16', name: 'ltvBps', type: 'uint16' },
          { internalType: 'uint16', name: 'liquidationThresholdBps', type: 'uint16' },
          { internalType: 'uint16', name: 'liquidationBonusBps', type: 'uint16' },
          { internalType: 'uint16', name: 'liquidationProtocolFeeBps', type: 'uint16' },
          { internalType: 'uint16', name: 'reserveFactorBps', type: 'uint16' },
          { internalType: 'uint16', name: 'optimalUtilizationBps', type: 'uint16' },
          { internalType: 'uint32', name: 'baseVariableRateRayPerYear', type: 'uint32' },
          { internalType: 'uint32', name: 'variableSlope1RayPerYear', type: 'uint32' },
          { internalType: 'uint32', name: 'variableSlope2RayPerYear', type: 'uint32' },
          { internalType: 'uint256', name: 'supplyCap', type: 'uint256' },
          { internalType: 'uint256', name: 'borrowCap', type: 'uint256' },
        ],
        internalType: 'struct IlmTypes.IlmCreateParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'createPooledMarket',
    outputs: [{ internalType: 'uint256', name: 'marketId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { indexed: true, internalType: 'uint256', name: 'loanPoolId', type: 'uint256' },
      { indexed: true, internalType: 'uint256', name: 'collateralPoolId', type: 'uint256' },
    ],
    name: 'IlmMarketCreated',
    type: 'event',
  },
]

export const ilmPooledLiquidationFacetAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'liquidatorPositionId', type: 'uint256' },
      { internalType: 'uint256', name: 'borrowerPositionId', type: 'uint256' },
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'debtToCover', type: 'uint256' },
    ],
    name: 'pooledLiquidationCall',
    outputs: [
      { internalType: 'uint256', name: 'debtLiquidated', type: 'uint256' },
      { internalType: 'uint256', name: 'collateralSeized', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const ilmPooledViewFacetAbi = [
  {
    inputs: [{ internalType: 'uint256', name: 'marketId', type: 'uint256' }],
    name: 'getPooledMarket',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'loanPoolId', type: 'uint256' },
          { internalType: 'uint256', name: 'collateralPoolId', type: 'uint256' },
          { internalType: 'uint16', name: 'ltvBps', type: 'uint16' },
          { internalType: 'uint16', name: 'liquidationThresholdBps', type: 'uint16' },
          { internalType: 'uint16', name: 'liquidationBonusBps', type: 'uint16' },
          { internalType: 'uint16', name: 'liquidationProtocolFeeBps', type: 'uint16' },
          { internalType: 'uint16', name: 'reserveFactorBps', type: 'uint16' },
          { internalType: 'uint16', name: 'optimalUtilizationBps', type: 'uint16' },
          { internalType: 'uint32', name: 'baseVariableRateRayPerYear', type: 'uint32' },
          { internalType: 'uint32', name: 'variableSlope1RayPerYear', type: 'uint32' },
          { internalType: 'uint32', name: 'variableSlope2RayPerYear', type: 'uint32' },
          { internalType: 'uint256', name: 'supplyCap', type: 'uint256' },
          { internalType: 'uint256', name: 'borrowCap', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
          { internalType: 'bool', name: 'paused', type: 'bool' },
          { internalType: 'bool', name: 'frozen', type: 'bool' },
          { internalType: 'uint128', name: 'liquidityIndexRay', type: 'uint128' },
          { internalType: 'uint128', name: 'variableBorrowIndexRay', type: 'uint128' },
          { internalType: 'uint128', name: 'currentLiquidityRateRay', type: 'uint128' },
          { internalType: 'uint128', name: 'currentVariableBorrowRateRay', type: 'uint128' },
          { internalType: 'uint64', name: 'lastUpdate', type: 'uint64' },
          { internalType: 'uint256', name: 'scaledSupplyTotal', type: 'uint256' },
          { internalType: 'uint256', name: 'scaledVariableDebtTotal', type: 'uint256' },
          { internalType: 'uint256', name: 'availableLiquidity', type: 'uint256' },
          { internalType: 'uint256', name: 'badDebt', type: 'uint256' },
        ],
        internalType: 'struct IlmTypes.IlmMarket',
        name: 'market',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'getPooledPosition',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'scaledSupply', type: 'uint256' },
          { internalType: 'uint256', name: 'scaledDebt', type: 'uint256' },
          { internalType: 'bool', name: 'useAsCollateral', type: 'bool' },
        ],
        internalType: 'struct IlmTypes.IlmPosition',
        name: 'position',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'previewHealthFactor',
    outputs: [{ internalType: 'uint256', name: 'hf', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'previewSupplyBalance',
    outputs: [{ internalType: 'uint256', name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    name: 'previewDebtBalance',
    outputs: [{ internalType: 'uint256', name: 'debt', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'marketId', type: 'uint256' }],
    name: 'getPooledMarketProtocolFeeAssets',
    outputs: [{ internalType: 'uint256', name: 'feeAssets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
]
