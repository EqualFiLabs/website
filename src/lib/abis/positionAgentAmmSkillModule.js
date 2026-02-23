export const positionAgentAmmSkillModuleAbi = [
  {
    name: 'executionManifest',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [
      {
        name: 'manifest',
        type: 'tuple',
        components: [
          {
            name: 'executionFunctions',
            type: 'tuple[]',
            components: [
              { name: 'executionSelector', type: 'bytes4' },
              { name: 'skipRuntimeValidation', type: 'bool' },
              { name: 'allowGlobalValidation', type: 'bool' },
            ],
          },
          {
            name: 'executionHooks',
            type: 'tuple[]',
            components: [
              { name: 'executionSelector', type: 'bytes4' },
              { name: 'entityId', type: 'uint32' },
              { name: 'isPreHook', type: 'bool' },
              { name: 'isPostHook', type: 'bool' },
            ],
          },
          { name: 'interfaceIds', type: 'bytes4[]' },
        ],
      },
    ],
  },
  {
    name: 'moduleId',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'setDiamond',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'diamond', type: 'address' }],
    outputs: [],
  },
  {
    name: 'getDiamond',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'setAuctionPolicy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'policy',
        type: 'tuple',
        components: [
          { name: 'enabled', type: 'bool' },
          { name: 'allowCancel', type: 'bool' },
          { name: 'allowFinalize', type: 'bool' },
          { name: 'allowAddLiquidity', type: 'bool' },
          { name: 'allowCommunityJoin', type: 'bool' },
          { name: 'enforcePoolAllowlist', type: 'bool' },
          { name: 'minDuration', type: 'uint64' },
          { name: 'maxDuration', type: 'uint64' },
          { name: 'minFeeBps', type: 'uint16' },
          { name: 'maxFeeBps', type: 'uint16' },
          { name: 'minReserveA', type: 'uint256' },
          { name: 'maxReserveA', type: 'uint256' },
          { name: 'minReserveB', type: 'uint256' },
          { name: 'maxReserveB', type: 'uint256' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'setRollPolicy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'policy',
        type: 'tuple',
        components: [
          { name: 'enabled', type: 'bool' },
          { name: 'enforcePoolAllowlist', type: 'bool' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'getAuctionPolicy',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 'policy',
        type: 'tuple',
        components: [
          { name: 'enabled', type: 'bool' },
          { name: 'allowCancel', type: 'bool' },
          { name: 'enforcePoolAllowlist', type: 'bool' },
          { name: 'minDuration', type: 'uint64' },
          { name: 'maxDuration', type: 'uint64' },
          { name: 'minFeeBps', type: 'uint16' },
          { name: 'maxFeeBps', type: 'uint16' },
          { name: 'minReserveA', type: 'uint256' },
          { name: 'maxReserveA', type: 'uint256' },
          { name: 'minReserveB', type: 'uint256' },
          { name: 'maxReserveB', type: 'uint256' },
        ],
      },
    ],
  },
];
