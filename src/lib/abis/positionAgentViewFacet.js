export const positionAgentViewFacetAbi = [
  {
    inputs: [{ internalType: 'uint256', name: 'positionTokenId', type: 'uint256' }],
    name: 'getTBAAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'positionTokenId', type: 'uint256' }],
    name: 'getAgentId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'positionTokenId', type: 'uint256' }],
    name: 'isAgentRegistered',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'positionTokenId', type: 'uint256' }],
    name: 'isTBADeployed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCanonicalRegistries',
    outputs: [
      { internalType: 'address', name: 'erc6551Registry', type: 'address' },
      { internalType: 'address', name: 'erc6551Implementation', type: 'address' },
      { internalType: 'address', name: 'identityRegistry', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'positionTokenId', type: 'uint256' }],
    name: 'getTBAInterfaceSupport',
    outputs: [
      { internalType: 'bool', name: 'supportsAccount', type: 'bool' },
      { internalType: 'bool', name: 'supportsExecutable', type: 'bool' },
      { internalType: 'bool', name: 'supportsERC721Receiver', type: 'bool' },
      { internalType: 'bool', name: 'supportsERC1271', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
