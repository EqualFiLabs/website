export const equalLendDirectViewFacetAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
      { internalType: 'uint256', name: 'poolId', type: 'uint256' },
    ],
    name: 'getPositionDirectState',
    outputs: [
      { internalType: 'uint256', name: 'locked', type: 'uint256' },
      { internalType: 'uint256', name: 'lent', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]
