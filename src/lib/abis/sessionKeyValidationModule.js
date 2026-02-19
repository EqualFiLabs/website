export const sessionKeyValidationModuleAbi = [
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint32', name: 'entityId', type: 'uint32' },
      { internalType: 'address', name: 'sessionKey', type: 'address' },
    ],
    name: 'getSessionKeyPolicy',
    outputs: [
      {
        internalType: 'tuple',
        name: 'policy',
        type: 'tuple',
        components: [
          { internalType: 'bool', name: 'active', type: 'bool' },
          { internalType: 'uint48', name: 'validAfter', type: 'uint48' },
          { internalType: 'uint48', name: 'validUntil', type: 'uint48' },
          { internalType: 'uint256', name: 'maxValuePerCall', type: 'uint256' },
          { internalType: 'uint256', name: 'cumulativeValueLimit', type: 'uint256' },
        ],
      },
      { internalType: 'uint64', name: 'nonce', type: 'uint64' },
      { internalType: 'uint256', name: 'targetCount', type: 'uint256' },
      { internalType: 'uint256', name: 'selectorCount', type: 'uint256' },
      { internalType: 'uint256', name: 'targetSelectorRuleCount', type: 'uint256' },
      { internalType: 'uint256', name: 'cumulativeValueUsed', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint32', name: 'entityId', type: 'uint32' },
      { internalType: 'address', name: 'sessionKey', type: 'address' },
      { internalType: 'uint48', name: 'validAfter', type: 'uint48' },
      { internalType: 'uint48', name: 'validUntil', type: 'uint48' },
      { internalType: 'uint256', name: 'maxValuePerCall', type: 'uint256' },
      { internalType: 'uint256', name: 'cumulativeValueLimit', type: 'uint256' },
      { internalType: 'address[]', name: 'allowedTargets_', type: 'address[]' },
      { internalType: 'bytes4[]', name: 'allowedSelectors_', type: 'bytes4[]' },
      {
        internalType: 'tuple[]',
        name: 'targetSelectorRules',
        type: 'tuple[]',
        components: [
          { internalType: 'address', name: 'target', type: 'address' },
          { internalType: 'bytes4[]', name: 'selectors', type: 'bytes4[]' },
        ],
      },
    ],
    name: 'setSessionKeyPolicy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint32', name: 'entityId', type: 'uint32' },
      { internalType: 'address', name: 'sessionKey', type: 'address' },
    ],
    name: 'revokeSessionKey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint32', name: 'entityId', type: 'uint32' },
    ],
    name: 'revokeAllSessionKeys',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
