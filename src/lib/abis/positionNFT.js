// Position NFT Contract ABI
export const positionNFTAbi = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'InvalidTokenId',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getPoolId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getPositionKey',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
]

export const positionManagementFacetAbi = [
  { inputs: [], name: 'ActiveLoansExist', type: 'error' },
  {
    inputs: [
      { internalType: 'uint256', name: 'attempted', type: 'uint256' },
      { internalType: 'uint256', name: 'required', type: 'uint256' },
    ],
    name: 'DepositBelowMinimum',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'requested', type: 'uint256' },
      { internalType: 'uint256', name: 'available', type: 'uint256' },
    ],
    name: 'InsufficientPrincipal',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'attempted', type: 'uint256' },
      { internalType: 'uint256', name: 'required', type: 'uint256' },
    ],
    name: 'LoanBelowMinimum',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'address', name: 'caller', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'NotNFTOwner',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'pid', type: 'uint256' }],
    name: 'PoolNotInitialized',
    type: 'error',
  },
  { inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'SafeERC20FailedOperation',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'principal', type: 'uint256' },
      { internalType: 'uint256', name: 'debt', type: 'uint256' },
      { internalType: 'uint256', name: 'ltvBps', type: 'uint256' },
    ],
    name: 'SolvencyViolation',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'InvalidTokenId',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
      { internalType: 'uint256', name: 'maxFee', type: 'uint256' },
    ],
    name: 'mintPosition',
    outputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'maxAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'maxFee', type: 'uint256' },
    ],
    name: 'mintPositionWithDeposit',
    outputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'maxAmount', type: 'uint256' },
    ],
    name: 'depositToPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
      { internalType: 'uint256', name: 'principalToWithdraw', type: 'uint256' },
      { internalType: 'uint256', name: 'minReceived', type: 'uint256' },
    ],
    name: 'withdrawFromPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
    ],
    name: 'rollYieldToPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
    ],
    name: 'closePoolPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
    ],
    name: 'cleanupMembership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const configViewFacetAbi = [
  {
    inputs: [{ internalType: 'uint256', name: 'pid', type: 'uint256' }],
    name: 'getPoolConfigSummary',
    outputs: [
      { internalType: 'bool', name: 'isCapped', type: 'bool' },
      { internalType: 'uint256', name: 'depositCap', type: 'uint256' },
      { internalType: 'address', name: 'underlying', type: 'address' },
      { internalType: 'uint16', name: 'depositorLTVBps', type: 'uint16' },
      { internalType: 'uint16', name: 'rollingApyBps', type: 'uint16' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPositionMintFee',
    outputs: [
      { internalType: 'address', name: 'feeToken', type: 'address' },
      { internalType: 'uint256', name: 'feeAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'offset', type: 'uint256' },
      { internalType: 'uint256', name: 'limit', type: 'uint256' },
    ],
    name: 'getPoolList',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'pid', type: 'uint256' },
          { internalType: 'address', name: 'underlying', type: 'address' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'string', name: 'symbol', type: 'string' },
          { internalType: 'uint8', name: 'decimals', type: 'uint8' },
          { internalType: 'uint16', name: 'depositorLTVBps', type: 'uint16' },
          { internalType: 'uint256', name: 'depositCap', type: 'uint256' },
          { internalType: 'bool', name: 'isCapped', type: 'bool' },
        ],
        internalType: 'struct IPoolConfigFacet.PoolInfo[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]

export const lendingFacetAbi = [
  { inputs: [], name: 'ActiveLoansExist', type: 'error' },
  {
    inputs: [
      { internalType: 'uint256', name: 'attempted', type: 'uint256' },
      { internalType: 'uint256', name: 'required', type: 'uint256' },
    ],
    name: 'LoanBelowMinimum',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'termIndex', type: 'uint256' },
      { internalType: 'uint256', name: 'minReceived', type: 'uint256' },
    ],
    name: 'openFixedFromPosition',
    outputs: [{ internalType: 'uint256', name: 'loanId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'minReceived', type: 'uint256' },
    ],
    name: 'openRollingFromPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'minReceived', type: 'uint256' },
    ],
    name: 'expandRollingFromPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
      { internalType: 'uint256', name: 'loanId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'maxPayment', type: 'uint256' },
    ],
    name: 'repayFixedFromPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'maxPayment', type: 'uint256' },
    ],
    name: 'makePaymentFromPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
    ],
    name: 'closeRollingCreditFromPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export const positionViewFacetAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
    ],
    name: 'getPositionState',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'address', name: 'underlying', type: 'address' },
          { internalType: 'uint256', name: 'principal', type: 'uint256' },
          { internalType: 'uint256', name: 'accruedYield', type: 'uint256' },
          { internalType: 'uint256', name: 'feeIndexCheckpoint', type: 'uint256' },
          { internalType: 'uint256', name: 'maintenanceIndexCheckpoint', type: 'uint256' },
          { internalType: 'uint256', name: 'externalCollateral', type: 'uint256' },
          {
            components: [
              { internalType: 'uint256', name: 'principal', type: 'uint256' },
              { internalType: 'uint256', name: 'principalRemaining', type: 'uint256' },
              { internalType: 'uint40', name: 'openedAt', type: 'uint40' },
              { internalType: 'uint40', name: 'lastPaymentTimestamp', type: 'uint40' },
              { internalType: 'uint40', name: 'lastAccrualTs', type: 'uint40' },
              { internalType: 'uint16', name: 'apyBps', type: 'uint16' },
              { internalType: 'uint8', name: 'missedPayments', type: 'uint8' },
              { internalType: 'uint32', name: 'paymentIntervalSecs', type: 'uint32' },
              { internalType: 'bool', name: 'depositBacked', type: 'bool' },
              { internalType: 'bool', name: 'active', type: 'bool' },
              { internalType: 'uint256', name: 'principalAtOpen', type: 'uint256' },
            ],
            internalType: 'struct IPositionViewFacet.RollingLoan',
            name: 'rollingLoan',
            type: 'tuple',
          },
          { internalType: 'uint256[]', name: 'fixedLoanIds', type: 'uint256[]' },
          { internalType: 'uint256', name: 'totalDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'solvencyRatio', type: 'uint256' },
          { internalType: 'bool', name: 'isDelinquent', type: 'bool' },
          { internalType: 'bool', name: 'eligibleForPenalty', type: 'bool' },
        ],
        internalType: 'struct IPositionViewFacet.PositionState',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
    ],
    name: 'getPositionEncumbrance',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'directLocked', type: 'uint256' },
          { internalType: 'uint256', name: 'directLent', type: 'uint256' },
          { internalType: 'uint256', name: 'directOfferEscrow', type: 'uint256' },
          { internalType: 'uint256', name: 'indexEncumbered', type: 'uint256' },
          { internalType: 'uint256', name: 'totalEncumbered', type: 'uint256' },
        ],
        internalType: 'struct IPositionViewFacet.PositionEncumbrance',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]

export const multiPoolPositionViewFacetAbi = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getPositionPoolMemberships',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'address', name: 'underlying', type: 'address' },
          { internalType: 'bool', name: 'isMember', type: 'bool' },
          { internalType: 'bool', name: 'hasBalance', type: 'bool' },
          { internalType: 'bool', name: 'hasActiveLoans', type: 'bool' },
        ],
        internalType: 'struct IMultiPoolPositionViewFacet.PoolMembershipInfo[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
    ],
    name: 'getPositionPoolDataPoolOnly',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'address', name: 'underlying', type: 'address' },
          { internalType: 'uint256', name: 'principal', type: 'uint256' },
          { internalType: 'uint256', name: 'yield', type: 'uint256' },
          { internalType: 'bool', name: 'hasActiveLoan', type: 'bool' },
          { internalType: 'uint256', name: 'totalDebt', type: 'uint256' },
          { internalType: 'bool', name: 'isMember', type: 'bool' },
        ],
        internalType: 'struct IMultiPoolPositionViewFacet.PoolPositionData',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]
