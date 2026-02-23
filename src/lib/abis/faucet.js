// ABI for Faucet contract - testnet token dispenser
export const faucetAbi = [
  {
    type: 'error',
    name: 'Faucet_ClaimTooSoon',
    inputs: [{ name: 'nextAllowed', type: 'uint256' }],
  },
  {
    type: 'error',
    name: 'Faucet_InvalidToken',
    inputs: [{ name: 'token', type: 'address' }],
  },
  {
    type: 'error',
    name: 'Faucet_TokenNotConfigured',
    inputs: [{ name: 'token', type: 'address' }],
  },
  {
    type: 'error',
    name: 'Faucet_InsufficientBalance',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'required', type: 'uint256' },
      { name: 'balance', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'TokenConfigured',
    inputs: [
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'enabled', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Claimed',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'CLAIM_INTERVAL',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'lastClaimAt',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTokens',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTokenConfig',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'enabled', type: 'bool' },
      { name: 'exists', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextClaimAt',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'claim',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
]
