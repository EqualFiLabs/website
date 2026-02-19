export const activeCreditViewFacetAbi = [
  {
    type: 'function',
    name: 'pendingActiveCreditByPosition',
    stateMutability: 'view',
    inputs: [
      { name: 'pid', type: 'uint256' },
      { name: 'positionId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
]
