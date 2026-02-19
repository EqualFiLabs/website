export const equalIndexFacetV3Abi = [
  {
    type: 'event',
    name: 'IndexCreated',
    inputs: [
      { name: 'indexId', type: 'uint256', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'assets', type: 'address[]', indexed: false },
      { name: 'bundleAmounts', type: 'uint256[]', indexed: false },
      { name: 'flashFeeBps', type: 'uint16', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'createIndex',
    inputs: [
      {
        name: 'p',
        type: 'tuple',
        internalType: 'struct EqualIndexBaseV3.CreateIndexParams',
        components: [
          { name: 'name', type: 'string', internalType: 'string' },
          { name: 'symbol', type: 'string', internalType: 'string' },
          { name: 'assets', type: 'address[]', internalType: 'address[]' },
          { name: 'bundleAmounts', type: 'uint256[]', internalType: 'uint256[]' },
          { name: 'mintFeeBps', type: 'uint16[]', internalType: 'uint16[]' },
          { name: 'burnFeeBps', type: 'uint16[]', internalType: 'uint16[]' },
          { name: 'flashFeeBps', type: 'uint16', internalType: 'uint16' },
        ],
      },
    ],
    outputs: [
      { name: 'indexId', type: 'uint256', internalType: 'uint256' },
      { name: 'token', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { name: 'indexId', type: 'uint256', internalType: 'uint256' },
      { name: 'units', type: 'uint256', internalType: 'uint256' },
      { name: 'to', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: 'minted', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'burn',
    inputs: [
      { name: 'indexId', type: 'uint256', internalType: 'uint256' },
      { name: 'units', type: 'uint256', internalType: 'uint256' },
      { name: 'to', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: 'assetsOut', type: 'uint256[]', internalType: 'uint256[]' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mintFromPosition',
    inputs: [
      { name: 'positionId', type: 'uint256', internalType: 'uint256' },
      { name: 'indexId', type: 'uint256', internalType: 'uint256' },
      { name: 'units', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: 'minted', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'burnFromPosition',
    inputs: [
      { name: 'positionId', type: 'uint256', internalType: 'uint256' },
      { name: 'indexId', type: 'uint256', internalType: 'uint256' },
      { name: 'units', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: 'assetsOut', type: 'uint256[]', internalType: 'uint256[]' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getIndex',
    inputs: [{ name: 'indexId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        name: 'index_',
        type: 'tuple',
        internalType: 'struct EqualIndexBaseV3.IndexView',
        components: [
          { name: 'assets', type: 'address[]', internalType: 'address[]' },
          { name: 'bundleAmounts', type: 'uint256[]', internalType: 'uint256[]' },
          { name: 'mintFeeBps', type: 'uint16[]', internalType: 'uint16[]' },
          { name: 'burnFeeBps', type: 'uint16[]', internalType: 'uint16[]' },
          { name: 'flashFeeBps', type: 'uint16', internalType: 'uint16' },
          { name: 'totalUnits', type: 'uint256', internalType: 'uint256' },
          { name: 'token', type: 'address', internalType: 'address' },
          { name: 'paused', type: 'bool', internalType: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
]
