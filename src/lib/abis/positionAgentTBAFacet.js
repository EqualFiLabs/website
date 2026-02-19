export const positionAgentTBAFacetAbi = [
  {
    inputs: [{ internalType: 'uint256', name: 'positionTokenId', type: 'uint256' }],
    name: 'deployTBA',
    outputs: [{ internalType: 'address', name: 'tbaAddress', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'positionTokenId', type: 'uint256' }],
    name: 'computeTBAAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];
