import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createPublicClient, decodeEventLog, http, parseAbiItem } from 'viem'
import pkg from 'pg'
import { networks as baseNetworks } from './config.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const { Pool } = pkg

const argv = process.argv.slice(2)
const networksFlag = (() => {
  const idx = argv.findIndex((arg) => arg === '--networks')
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1]
  return null
})()

const selectedKeys = (networksFlag || process.env.INDEXER_NETWORKS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const resolveNetworks = () => {
  const requested = selectedKeys.length ? new Set(selectedKeys) : null
  return baseNetworks
    .filter((net) => (requested ? requested.has(net.key) : true))
    .map((net) => {
      const rpcUrl = process.env[net.rpcEnv] || ''
      const diamondAddress = (process.env[net.diamondEnv] || '').trim()
      const startBlock = Number(process.env[net.startBlockEnv] || net.defaultStartBlock || 0)
      return {
        ...net,
        rpcUrl,
        diamondAddress,
        startBlock,
      }
    })
}

const AUCTION_EVENTS = [
  parseAbiItem('event AuctionCreated(uint256 indexed auctionId, bytes32 indexed makerPositionKey, uint256 indexed makerPositionId, uint256 poolIdA, uint256 poolIdB, address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, uint64 startTime, uint64 endTime, uint16 feeBps, uint8 feeAsset)'),
  parseAbiItem('event CommunityAuctionCreated(uint256 indexed auctionId, bytes32 indexed creatorPositionKey, uint256 indexed creatorPositionId, uint256 poolIdA, uint256 poolIdB, address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, uint64 startTime, uint64 endTime, uint16 feeBps, uint8 feeAsset)'),
  parseAbiItem('event AuctionLiquidityAdded(uint256 indexed auctionId, bytes32 indexed makerPositionKey, uint256 amountA, uint256 amountB, uint256 reserveA, uint256 reserveB)'),
  parseAbiItem('event MakerJoined(uint256 indexed auctionId, bytes32 indexed positionKey, uint256 positionId, uint256 amountA, uint256 amountB, uint256 share)'),
  parseAbiItem('event AuctionFinalized(uint256 indexed auctionId, bytes32 indexed makerPositionKey, uint256 reserveA, uint256 reserveB, uint256 makerFeeA, uint256 makerFeeB)'),
  parseAbiItem('event CommunityAuctionFinalized(uint256 indexed auctionId, bytes32 indexed creatorPositionKey, uint256 reserveA, uint256 reserveB)'),
  parseAbiItem('event AuctionCancelled(uint256 indexed auctionId, bytes32 indexed makerPositionKey, uint256 reserveA, uint256 reserveB, uint256 makerFeeA, uint256 makerFeeB)'),
  parseAbiItem('event CommunityAuctionCancelled(uint256 indexed auctionId, bytes32 indexed creatorPositionKey, uint256 reserveA, uint256 reserveB)'),
]

const ensureSchema = async (db) => {
  const schemaPath = path.join(__dirname, 'sql', 'schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')
  await db.query(sql)
}

const getLastBlock = async (db, chainId, startBlock) => {
  const { rows } = await db.query('SELECT last_block FROM indexer_state WHERE chain_id = $1', [chainId])
  if (!rows.length) return startBlock
  return Number(rows[0].last_block || startBlock)
}

const setLastBlock = async (db, chainId, lastBlock) => {
  await db.query(
    'INSERT INTO indexer_state (chain_id, last_block) VALUES ($1, $2) ON CONFLICT (chain_id) DO UPDATE SET last_block = $2, updated_at = NOW()',
    [chainId, lastBlock],
  )
}

const upsertAuction = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO auctions (
      chain_id, auction_id, type, maker_position_id, pool_id_a, pool_id_b, token_a, token_b,
      reserve_a, reserve_b, start_time, end_time, fee_bps, fee_asset, active, finalized,
      raw, block_number, tx_hash, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW()
    )
    ON CONFLICT (chain_id, auction_id)
    DO UPDATE SET
      type = COALESCE(EXCLUDED.type, auctions.type),
      maker_position_id = COALESCE(EXCLUDED.maker_position_id, auctions.maker_position_id),
      pool_id_a = COALESCE(EXCLUDED.pool_id_a, auctions.pool_id_a),
      pool_id_b = COALESCE(EXCLUDED.pool_id_b, auctions.pool_id_b),
      token_a = COALESCE(EXCLUDED.token_a, auctions.token_a),
      token_b = COALESCE(EXCLUDED.token_b, auctions.token_b),
      reserve_a = COALESCE(EXCLUDED.reserve_a, auctions.reserve_a),
      reserve_b = COALESCE(EXCLUDED.reserve_b, auctions.reserve_b),
      start_time = COALESCE(EXCLUDED.start_time, auctions.start_time),
      end_time = COALESCE(EXCLUDED.end_time, auctions.end_time),
      fee_bps = COALESCE(EXCLUDED.fee_bps, auctions.fee_bps),
      fee_asset = COALESCE(EXCLUDED.fee_asset, auctions.fee_asset),
      active = EXCLUDED.active,
      finalized = EXCLUDED.finalized,
      raw = COALESCE(EXCLUDED.raw, auctions.raw),
      block_number = COALESCE(EXCLUDED.block_number, auctions.block_number),
      tx_hash = COALESCE(EXCLUDED.tx_hash, auctions.tx_hash),
      updated_at = NOW();
  `
  const values = [
    chainId,
    payload.auctionId,
    payload.type,
    payload.makerPositionId,
    payload.poolIdA,
    payload.poolIdB,
    payload.tokenA,
    payload.tokenB,
    payload.reserveA,
    payload.reserveB,
    payload.startTime,
    payload.endTime,
    payload.feeBps,
    payload.feeAsset,
    payload.active,
    payload.finalized,
    payload.raw,
    payload.blockNumber,
    payload.txHash,
  ]
  await db.query(sql, values)
}

const indexNetwork = async (db, net) => {
  if (!net.rpcUrl) {
    console.warn(`[${net.key}] missing RPC url (${net.rpcEnv}) — skipping`)
    return
  }
  if (!net.diamondAddress) {
    console.warn(`[${net.key}] missing diamond address (${net.diamondEnv}) — skipping`)
    return
  }

  const client = createPublicClient({ transport: http(net.rpcUrl), chain: { id: net.chainId } })
  const latest = await client.getBlockNumber()
  const confirmed = latest - BigInt(net.confirmations || 0)
  if (confirmed < 0n) return

  const fromBlock = BigInt(await getLastBlock(db, net.chainId, net.startBlock))
  const toBlock = confirmed
  if (toBlock <= fromBlock) {
    console.log(`[${net.key}] no new blocks (${fromBlock} → ${toBlock})`)
    return
  }

  console.log(`[${net.key}] indexing ${fromBlock} → ${toBlock}`)

  const logs = await client.getLogs({
    address: net.diamondAddress,
    events: AUCTION_EVENTS,
    fromBlock,
    toBlock,
  })

  for (const log of logs) {
    try {
      const decoded = decodeEventLog({ abi: AUCTION_EVENTS, data: log.data, topics: log.topics })
      const eventName = decoded.eventName
      const args = decoded.args || {}
      const safeArgs = JSON.parse(
        JSON.stringify(args, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
      )

      const base = {
        auctionId: Number(args.auctionId ?? 0),
        makerPositionId: args.makerPositionId
          ? Number(args.makerPositionId)
          : args.creatorPositionId
            ? Number(args.creatorPositionId)
            : args.positionId
              ? Number(args.positionId)
              : null,
        poolIdA: args.poolIdA ? Number(args.poolIdA) : null,
        poolIdB: args.poolIdB ? Number(args.poolIdB) : null,
        tokenA: args.tokenA?.toLowerCase?.() ?? null,
        tokenB: args.tokenB?.toLowerCase?.() ?? null,
        reserveA: args.reserveA ? args.reserveA.toString() : null,
        reserveB: args.reserveB ? args.reserveB.toString() : null,
        startTime: args.startTime ? Number(args.startTime) : null,
        endTime: args.endTime ? Number(args.endTime) : null,
        feeBps: args.feeBps ? Number(args.feeBps) : null,
        feeAsset: args.feeAsset ? Number(args.feeAsset) : null,
        blockNumber: Number(log.blockNumber),
        txHash: log.transactionHash,
      }

      if (eventName === 'AuctionCreated' || eventName === 'CommunityAuctionCreated') {
        await upsertAuction(db, net.chainId, {
          ...base,
          type: eventName === 'CommunityAuctionCreated' ? 'community' : 'solo',
          active: true,
          finalized: false,
          raw: { event: eventName, args: safeArgs },
        })
      }

      if (eventName === 'AuctionLiquidityAdded') {
        await upsertAuction(db, net.chainId, {
          ...base,
          type: 'solo',
          active: true,
          finalized: false,
          raw: { event: eventName, args: safeArgs },
        })
      }

      // MakerJoined events ignored for now (no reserve totals)
      if (eventName === 'AuctionFinalized' || eventName === 'CommunityAuctionFinalized') {
        await upsertAuction(db, net.chainId, {
          ...base,
          type: eventName === 'CommunityAuctionFinalized' ? 'community' : 'solo',
          active: false,
          finalized: true,
          raw: { event: eventName, args: safeArgs },
        })
      }

      if (eventName === 'AuctionCancelled' || eventName === 'CommunityAuctionCancelled') {
        await upsertAuction(db, net.chainId, {
          ...base,
          type: eventName === 'CommunityAuctionCancelled' ? 'community' : 'solo',
          active: false,
          finalized: true,
          raw: { event: eventName, args: safeArgs },
        })
      }
    } catch (err) {
      console.warn(`[${net.key}] log decode failed`, err)
    }
  }

  await setLastBlock(db, net.chainId, Number(toBlock))
  console.log(`[${net.key}] indexed ${logs.length} logs, saved last_block=${toBlock}`)
}

const main = async () => {
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl) {
    console.error('DATABASE_URL missing; aborting.')
    process.exit(1)
  }

  const db = new Pool({ connectionString: dbUrl })
  await ensureSchema(db)

  const targets = resolveNetworks()
  if (!targets.length) {
    console.error('No networks selected. Use --networks or INDEXER_NETWORKS.')
    process.exit(1)
  }

  for (const net of targets) {
    await indexNetwork(db, net)
  }

  await db.end()
}

main().catch((err) => {
  console.error('Indexer failed', err)
  process.exit(1)
})
