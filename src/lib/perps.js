import { encodeAbiParameters, isAddress, keccak256, stringToHex } from 'viem'

const MARKET_ID_REGEX = /^0x[a-fA-F0-9]{64}$/
const PERPS_MARKET_ID_NAMESPACE = keccak256(stringToHex('equalis.perps.market.id.v1'))

const toBigIntSafe = (value, fallback = 0n) => {
  try {
    if (typeof value === 'bigint') return value
    if (typeof value === 'number') return BigInt(Math.trunc(value))
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return fallback
      return BigInt(trimmed)
    }
  } catch {
    // ignore parse errors and fall through to fallback
  }
  return fallback
}

const toNumberSafe = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return fallback
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }
  return fallback
}

const toAddress = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!isAddress(trimmed)) return ''
  return trimmed.toLowerCase()
}

export const isValidPerpsMarketId = (value) => typeof value === 'string' && MARKET_ID_REGEX.test(value)

export const derivePerpsMarketId = (params) => {
  const collateralPoolId = toBigIntSafe(params?.collateralPoolId)
  const collateralAsset = toAddress(params?.collateralAsset)
  const indexAsset = toAddress(params?.indexAsset)

  if (!collateralAsset || !indexAsset) {
    throw new Error('Invalid perps market params: collateralAsset/indexAsset address is required')
  }

  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32', name: 'namespace' },
        { type: 'uint256', name: 'collateralPoolId' },
        { type: 'address', name: 'collateralAsset' },
        { type: 'address', name: 'indexAsset' },
      ],
      [PERPS_MARKET_ID_NAMESPACE, collateralPoolId, collateralAsset, indexAsset],
    ),
  )
}

export const normalizePerpsMarkets = (poolsConfig) => {
  const pools = Array.isArray(poolsConfig?.pools) ? poolsConfig.pools : []
  const markets = Array.isArray(poolsConfig?.perpsMarkets) ? poolsConfig.perpsMarkets : []

  const poolsByPid = new Map(
    pools
      .map((pool) => {
        const pid = Number(pool?.pid)
        if (!Number.isFinite(pid)) return null
        return [pid, pool]
      })
      .filter(Boolean),
  )

  const poolsByAddress = new Map(
    pools
      .map((pool) => {
        const tokenAddress = toAddress(pool?.tokenAddress)
        if (!tokenAddress) return null
        return [tokenAddress, pool]
      })
      .filter(Boolean),
  )

  return markets
    .map((market, idx) => {
      const collateralPoolId = Number(market?.collateralPoolId)
      if (!Number.isFinite(collateralPoolId)) {
        return null
      }

      const collateralPool = poolsByPid.get(collateralPoolId) || null
      const collateralAsset = toAddress(market?.collateralAsset || collateralPool?.tokenAddress)
      const indexAsset = toAddress(market?.indexAsset)
      if (!collateralAsset || !indexAsset) {
        return null
      }

      const marketId = isValidPerpsMarketId(market?.marketId)
        ? market.marketId.toLowerCase()
        : derivePerpsMarketId({
            collateralPoolId,
            collateralAsset,
            indexAsset,
          })

      const indexPool = poolsByAddress.get(indexAsset) || null
      const feePoolId = toNumberSafe(market?.feePoolId, collateralPoolId)
      const defaultMaxSlippageBps = toNumberSafe(market?.defaultMaxSlippageBps, 100)
      const defaultExecutorFee = toBigIntSafe(market?.defaultExecutorFee, 0n)

      const collateralLabel = collateralPool?.ticker || `Pool ${collateralPoolId}`
      const indexLabel = indexPool?.ticker || indexAsset.slice(0, 10)
      const fallbackName = `${collateralLabel} / ${indexLabel}`

      return {
        id: (market?.id || `perps-market-${idx + 1}`).toString(),
        name: (market?.name || fallbackName).toString(),
        marketId,
        collateralPoolId,
        collateralAsset,
        indexAsset,
        feePoolId,
        defaultMaxSlippageBps,
        defaultExecutorFee,
        collateralPool,
        indexPool,
      }
    })
    .filter(Boolean)
}
