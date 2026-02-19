export const erc6900AccountAbi = [
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
