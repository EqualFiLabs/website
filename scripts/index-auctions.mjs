import { createPublicClient, http } from "viem";
import pg from "pg";
const { Pool } = pg;

const derivativeViewAbi = [
  {
    type: "function",
    name: "getActiveAuctions",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      { name: "ids", type: "uint256[]" },
      { name: "total", type: "uint256" },
    ],
  },
];

const auctionManagementViewAbi = [
  {
    type: "function",
    name: "getActiveCommunityAuctions",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      { name: "ids", type: "uint256[]" },
      { name: "total", type: "uint256" },
    ],
  },
];

const ammAuctionAbi = [
  {
    type: "function",
    name: "getAuction",
    stateMutability: "view",
    inputs: [{ name: "auctionId", type: "uint256" }],
    outputs: [
      {
        name: "auction",
        type: "tuple",
        components: [
          { name: "makerPositionKey", type: "bytes32" },
          { name: "makerPositionId", type: "uint256" },
          { name: "poolIdA", type: "uint256" },
          { name: "poolIdB", type: "uint256" },
          { name: "tokenA", type: "address" },
          { name: "tokenB", type: "address" },
          { name: "reserveA", type: "uint256" },
          { name: "reserveB", type: "uint256" },
          { name: "initialReserveA", type: "uint256" },
          { name: "initialReserveB", type: "uint256" },
          { name: "invariant", type: "uint256" },
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "feeBps", type: "uint16" },
          { name: "feeAsset", type: "uint8" },
          { name: "makerFeeAAccrued", type: "uint256" },
          { name: "makerFeeBAccrued", type: "uint256" },
          { name: "treasuryFeeAAccrued", type: "uint256" },
          { name: "treasuryFeeBAccrued", type: "uint256" },
          { name: "active", type: "bool" },
          { name: "finalized", type: "bool" },
        ],
      },
    ],
  },
];

const communityAuctionAbi = [
  {
    type: "function",
    name: "getCommunityAuction",
    stateMutability: "view",
    inputs: [{ name: "auctionId", type: "uint256" }],
    outputs: [
      {
        name: "auction",
        type: "tuple",
        components: [
          { name: "creatorPositionKey", type: "bytes32" },
          { name: "creatorPositionId", type: "uint256" },
          { name: "poolIdA", type: "uint256" },
          { name: "poolIdB", type: "uint256" },
          { name: "tokenA", type: "address" },
          { name: "tokenB", type: "address" },
          { name: "reserveA", type: "uint256" },
          { name: "reserveB", type: "uint256" },
          { name: "feeBps", type: "uint16" },
          { name: "feeAsset", type: "uint8" },
          { name: "feeIndexA", type: "uint256" },
          { name: "feeIndexB", type: "uint256" },
          { name: "feeIndexRemainderA", type: "uint256" },
          { name: "feeIndexRemainderB", type: "uint256" },
          { name: "treasuryFeeAAccrued", type: "uint256" },
          { name: "treasuryFeeBAccrued", type: "uint256" },
          { name: "indexFeeAAccrued", type: "uint256" },
          { name: "indexFeeBAccrued", type: "uint256" },
          { name: "activeCreditFeeAAccrued", type: "uint256" },
          { name: "activeCreditFeeBAccrued", type: "uint256" },
          { name: "totalShares", type: "uint256" },
          { name: "makerCount", type: "uint256" },
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "active", type: "bool" },
          { name: "finalized", type: "bool" },
        ],
      },
    ],
  },
];

// ── Multi-chain config ──────────────────────────────────────────────
// RPC URLs from env to avoid leaking API keys
const CHAINS = [
  {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpcUrl: process.env.RPC_ARBITRUM_SEPOLIA || "https://sepolia-rollup.arbitrum.io/rpc",
    diamond: "0x027c9ba58be0af69c990da55630d9042d067652b",
  },
  {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: process.env.RPC_BASE_SEPOLIA || "https://sepolia.base.org",
    diamond: "0x027c9ba58be0af69c990da55630d9042d067652b",
  },
  {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    rpcUrl: process.env.RPC_ETHEREUM_SEPOLIA || "https://rpc.sepolia.org",
    diamond: "0x027c9ba58be0af69c990da55630d9042d067652b",
  },
];

// Allow filtering to a single chain via CLI arg: node index-auctions.mjs 84532
const filterChainId = process.argv[2] ? Number(process.argv[2]) : null;

const PAGE_SIZE = Number(process.env.AUCTION_PAGE_SIZE || 100);
const connectionString = process.env.DATABASE_URL;

// BigInt-safe JSON serializer for raw on-chain structs
const safeStringify = (obj) =>
  JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
if (!connectionString) throw new Error("DATABASE_URL missing");

const db = new Pool({ connectionString });

const upsertAuction = async (chainId, row) => {
  const sql = `
    INSERT INTO auctions
      (chain_id, auction_id, type, maker_position_id, pool_id_a, pool_id_b,
       token_a, token_b, reserve_a, reserve_b, start_time, end_time,
       fee_bps, fee_asset, active, finalized, raw, updated_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
    ON CONFLICT (chain_id, type, auction_id)
    DO UPDATE SET
      maker_position_id = EXCLUDED.maker_position_id,
      pool_id_a = EXCLUDED.pool_id_a,
      pool_id_b = EXCLUDED.pool_id_b,
      token_a = EXCLUDED.token_a,
      token_b = EXCLUDED.token_b,
      reserve_a = EXCLUDED.reserve_a,
      reserve_b = EXCLUDED.reserve_b,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      fee_bps = EXCLUDED.fee_bps,
      fee_asset = EXCLUDED.fee_asset,
      active = EXCLUDED.active,
      finalized = EXCLUDED.finalized,
      raw = EXCLUDED.raw,
      updated_at = NOW();
  `;
  await db.query(sql, [
    chainId,
    row.id.toString(),
    row.type,
    row.makerPositionId?.toString() ?? null,
    row.poolIdA != null ? Number(row.poolIdA) : null,
    row.poolIdB != null ? Number(row.poolIdB) : null,
    row.tokenA,
    row.tokenB,
    row.reserveA.toString(),
    row.reserveB.toString(),
    row.startTime.toString(),
    row.endTime.toString(),
    row.feeBps,
    row.feeAsset,
    row.active,
    row.finalized,
    safeStringify(row.raw),
  ]);
};

async function fetchIds(client, diamond, kind, offset, limit) {
  if (kind === "solo") {
    const result = await client.readContract({
      address: diamond,
      abi: derivativeViewAbi,
      functionName: "getActiveAuctions",
      args: [BigInt(offset), BigInt(limit)],
    });
    return { ids: result[0], total: result[1] };
  }
  const result = await client.readContract({
    address: diamond,
    abi: auctionManagementViewAbi,
    functionName: "getActiveCommunityAuctions",
    args: [BigInt(offset), BigInt(limit)],
  });
  return { ids: result[0], total: result[1] };
}

async function fetchAuction(client, diamond, kind, id) {
  if (kind === "solo") {
    const result = await client.readContract({
      address: diamond,
      abi: ammAuctionAbi,
      functionName: "getAuction",
      args: [id],
    });
    const a = result?.auction ?? result;
    return {
      id,
      type: "solo",
      makerPositionId: a.makerPositionId,
      poolIdA: a.poolIdA,
      poolIdB: a.poolIdB,
      tokenA: a.tokenA,
      tokenB: a.tokenB,
      reserveA: BigInt(a.reserveA),
      reserveB: BigInt(a.reserveB),
      startTime: BigInt(a.startTime),
      endTime: BigInt(a.endTime),
      feeBps: Number(a.feeBps),
      feeAsset: Number(a.feeAsset),
      active: Boolean(a.active),
      finalized: Boolean(a.finalized),
      raw: a,
    };
  }
  const result = await client.readContract({
    address: diamond,
    abi: communityAuctionAbi,
    functionName: "getCommunityAuction",
    args: [id],
  });
  const a = result?.auction ?? result;
  return {
    id,
    type: "community",
    makerPositionId: a.creatorPositionId,
    poolIdA: a.poolIdA,
    poolIdB: a.poolIdB,
    tokenA: a.tokenA,
    tokenB: a.tokenB,
    reserveA: BigInt(a.reserveA),
    reserveB: BigInt(a.reserveB),
    startTime: BigInt(a.startTime),
    endTime: BigInt(a.endTime),
    feeBps: Number(a.feeBps),
    feeAsset: Number(a.feeAsset),
    active: Boolean(a.active),
    finalized: Boolean(a.finalized),
    raw: a,
  };
}

async function indexChain(chain) {
  console.log(`Indexing ${chain.name} (${chain.chainId})...`);
  const client = createPublicClient({ transport: http(chain.rpcUrl) });

  for (const kind of ["solo", "community"]) {
    let offset = 0;
    while (true) {
      const { ids, total } = await fetchIds(client, chain.diamond, kind, offset, PAGE_SIZE);
      if (!ids.length) break;
      for (const id of ids) {
        try {
          const auction = await fetchAuction(client, chain.diamond, kind, id);
          await upsertAuction(chain.chainId, auction);
          console.log(`  ${kind} #${id} ✓`);
        } catch (err) {
          console.error(`  ${kind} #${id} ✗`, err.message);
        }
      }
      offset += ids.length;
      if (offset >= Number(total)) break;
    }
  }
}

async function main() {
  const chains = filterChainId
    ? CHAINS.filter((c) => c.chainId === filterChainId)
    : CHAINS;

  if (!chains.length) {
    throw new Error(`No chain config for chainId ${filterChainId}`);
  }

  for (const chain of chains) {
    await indexChain(chain);
  }

  await db.end();
  console.log("Auction index updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
