export const erc6900AccountAbi = [
  {
    inputs: [
      { internalType: 'address', name: 'module', type: 'address' },
      {
        components: [
          {
            components: [
              { internalType: 'bytes4', name: 'executionSelector', type: 'bytes4' },
              { internalType: 'bool', name: 'skipRuntimeValidation', type: 'bool' },
              { internalType: 'bool', name: 'allowGlobalValidation', type: 'bool' },
            ],
            internalType: 'struct ManifestExecutionFunction[]',
            name: 'executionFunctions',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'bytes4', name: 'executionSelector', type: 'bytes4' },
              { internalType: 'uint32', name: 'entityId', type: 'uint32' },
              { internalType: 'bool', name: 'isPreHook', type: 'bool' },
              { internalType: 'bool', name: 'isPostHook', type: 'bool' },
            ],
            internalType: 'struct ManifestExecutionHook[]',
            name: 'executionHooks',
            type: 'tuple[]',
          },
          { internalType: 'bytes4[]', name: 'interfaceIds', type: 'bytes4[]' },
        ],
        internalType: 'struct ExecutionManifest',
        name: 'manifest',
        type: 'tuple',
      },
      { internalType: 'bytes', name: 'installData', type: 'bytes' },
    ],
    name: 'installExecution',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes25', name: 'validationConfig', type: 'bytes25' },
      { internalType: 'bytes4[]', name: 'selectors', type: 'bytes4[]' },
      { internalType: 'bytes', name: 'installData', type: 'bytes' },
      { internalType: 'bytes[]', name: 'hooks', type: 'bytes[]' },
    ],
    name: 'installValidation',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes25', name: 'validationConfig', type: 'bytes25' },
    ],
    name: 'isValidationInstalled',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'target', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'execute',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    stateMutability: 'payable',
    type: 'function',
  },
];
