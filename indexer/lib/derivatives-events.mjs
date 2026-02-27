import { parseAbiItem } from 'viem'

export const OPTION_EVENTS = [
  parseAbiItem('event SeriesCreated(uint256 indexed seriesId, bytes32 indexed makerPositionKey, uint256 indexed makerPositionId, uint256 underlyingPoolId, uint256 strikePoolId, address underlyingAsset, address strikeAsset, uint256 strikePrice, uint64 expiry, uint256 totalSize, uint256 collateralLocked, bool isCall, bool isAmerican)'),
  parseAbiItem('event Exercised(uint256 indexed seriesId, address indexed holder, address indexed recipient, uint256 amount, uint256 strikeAmount, uint256 paymentReceived)'),
  parseAbiItem('event Reclaimed(uint256 indexed seriesId, bytes32 indexed makerPositionKey, uint256 remainingSize, uint256 collateralUnlocked)'),
  parseAbiItem('event ReclaimedClaimsBurned(uint256 indexed seriesId, address indexed holder, uint256 amount)'),
]

export const FUTURES_EVENTS = [
  parseAbiItem('event SeriesCreated(uint256 indexed seriesId, bytes32 indexed makerPositionKey, uint256 indexed makerPositionId, uint256 underlyingPoolId, uint256 quotePoolId, address underlyingAsset, address quoteAsset, uint256 forwardPrice, uint64 expiry, uint256 totalSize, uint256 underlyingLocked, uint64 graceUnlockTime, bool isEuropean)'),
  parseAbiItem('event Settled(uint256 indexed seriesId, address indexed holder, address indexed recipient, uint256 amount, uint256 quoteAmount, uint256 paymentReceived)'),
  parseAbiItem('event Reclaimed(uint256 indexed seriesId, bytes32 indexed makerPositionKey, uint256 remainingSize, uint256 collateralUnlocked)'),
  parseAbiItem('event ReclaimedClaimsBurned(uint256 indexed seriesId, address indexed holder, uint256 amount)'),
]
