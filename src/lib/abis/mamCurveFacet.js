// ABI for MAM Curve facets - Creation, Management, Execution, and View queries
export const mamCurveViewAbi = [
  {
    type: 'function',
    name: 'getCurve',
    inputs: [{ name: 'curveId', type: 'uint256' }],
    outputs: [
      {
        name: 'curve', type: 'tuple', components: [
          { name: 'commitment', type: 'bytes32' },
          { name: 'remainingVolume', type: 'uint128' },
          { name: 'endTime', type: 'uint64' },
          { name: 'generation', type: 'uint32' },
          { name: 'active', type: 'bool' },
        ],
      },
      {
        name: 'data', type: 'tuple', components: [
          { name: 'makerPositionKey', type: 'bytes32' },
          { name: 'makerPositionId', type: 'uint256' },
          { name: 'poolIdA', type: 'uint256' },
          { name: 'poolIdB', type: 'uint256' },
        ],
      },
      {
        name: 'pricing', type: 'tuple', components: [
          { name: 'startPrice', type: 'uint128' },
          { name: 'endPrice', type: 'uint128' },
          { name: 'startTime', type: 'uint64' },
          { name: 'duration', type: 'uint64' },
        ],
      },
      {
        name: 'immutables', type: 'tuple', components: [
          { name: 'tokenA', type: 'address' },
          { name: 'tokenB', type: 'address' },
          { name: 'maxVolume', type: 'uint128' },
          { name: 'salt', type: 'uint96' },
          { name: 'feeRateBps', type: 'uint16' },
          { name: 'priceIsQuotePerBase', type: 'bool' },
          { name: 'feeAsset', type: 'uint8' },
        ],
      },
      { name: 'baseIsA', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getActiveCurves',
    inputs: [
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      { name: 'ids', type: 'uint256[]' },
      { name: 'total', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurvesByPair',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      { name: 'ids', type: 'uint256[]' },
      { name: 'total', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurvesByPositionId',
    inputs: [
      { name: 'positionId', type: 'uint256' },
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      { name: 'ids', type: 'uint256[]' },
      { name: 'total', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurveStatus',
    inputs: [{ name: 'curveId', type: 'uint256' }],
    outputs: [
      { name: 'active', type: 'bool' },
      { name: 'expired', type: 'bool' },
      { name: 'remainingVolume', type: 'uint128' },
      { name: 'currentPrice', type: 'uint256' },
      { name: 'startTime', type: 'uint64' },
      { name: 'endTime', type: 'uint64' },
      { name: 'baseIsA', type: 'bool' },
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'timeRemaining', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'quoteCurveExactIn',
    inputs: [
      { name: 'curveId', type: 'uint256' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'feeAmount', type: 'uint256' },
      { name: 'totalQuote', type: 'uint256' },
      { name: 'remainingVolume', type: 'uint128' },
      { name: 'ok', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'quoteCurvesExactInBatch',
    inputs: [
      { name: 'curveIds', type: 'uint256[]' },
      { name: 'amountIns', type: 'uint256[]' },
    ],
    outputs: [
      { name: 'amountOuts', type: 'uint256[]' },
      { name: 'feeAmounts', type: 'uint256[]' },
      { name: 'oks', type: 'bool[]' },
    ],
    stateMutability: 'view',
  },
];

export const mamCurveCreationAbi = [
  {
    type: 'function',
    name: 'createCurve',
    inputs: [
      {
        name: 'desc', type: 'tuple', components: [
          { name: 'makerPositionKey', type: 'bytes32' },
          { name: 'makerPositionId', type: 'uint256' },
          { name: 'poolIdA', type: 'uint256' },
          { name: 'poolIdB', type: 'uint256' },
          { name: 'tokenA', type: 'address' },
          { name: 'tokenB', type: 'address' },
          { name: 'side', type: 'bool' },
          { name: 'priceIsQuotePerBase', type: 'bool' },
          { name: 'maxVolume', type: 'uint128' },
          { name: 'startPrice', type: 'uint128' },
          { name: 'endPrice', type: 'uint128' },
          { name: 'startTime', type: 'uint64' },
          { name: 'duration', type: 'uint64' },
          { name: 'generation', type: 'uint32' },
          { name: 'feeRateBps', type: 'uint16' },
          { name: 'feeAsset', type: 'uint8' },
          { name: 'salt', type: 'uint96' },
        ],
      },
    ],
    outputs: [{ name: 'curveId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
];

export const mamCurveManagementAbi = [
  {
    type: 'function',
    name: 'updateCurve',
    inputs: [
      { name: 'curveId', type: 'uint256' },
      {
        name: 'params', type: 'tuple', components: [
          { name: 'startPrice', type: 'uint128' },
          { name: 'endPrice', type: 'uint128' },
          { name: 'startTime', type: 'uint64' },
          { name: 'duration', type: 'uint64' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelCurve',
    inputs: [{ name: 'curveId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'expireCurve',
    inputs: [{ name: 'curveId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
];

export const mamCurveExecutionAbi = [
  {
    type: 'function',
    name: 'executeCurveSwap',
    inputs: [
      { name: 'curveId', type: 'uint256' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'maxQuote', type: 'uint256' },
      { name: 'minOut', type: 'uint256' },
      { name: 'deadline', type: 'uint64' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'previewCurveQuote',
    inputs: [
      { name: 'curveId', type: 'uint256' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [{ name: 'maxQuote', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'loadCurveForFill',
    inputs: [{ name: 'curveId', type: 'uint256' }],
    outputs: [
      {
        name: 'viewData', type: 'tuple', components: [
          { name: 'makerPositionKey', type: 'bytes32' },
          { name: 'makerPositionId', type: 'uint256' },
          { name: 'poolIdA', type: 'uint256' },
          { name: 'poolIdB', type: 'uint256' },
          { name: 'tokenA', type: 'address' },
          { name: 'tokenB', type: 'address' },
          { name: 'baseIsA', type: 'bool' },
          { name: 'startPrice', type: 'uint128' },
          { name: 'endPrice', type: 'uint128' },
          { name: 'startTime', type: 'uint64' },
          { name: 'duration', type: 'uint64' },
          { name: 'feeRateBps', type: 'uint16' },
          { name: 'remainingVolume', type: 'uint128' },
        ],
      },
    ],
    stateMutability: 'view',
  },
];
