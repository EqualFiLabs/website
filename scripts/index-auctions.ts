import { createPublicClient, http } from "viem";
import { db } from "../src/lib/db";
import {
  derivativeViewAbi,
  auctionManagementViewAbi,
  ammAuctionAbi,
  communityAuctionAbi,
} from "../src/lib/abis";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
const diamond = (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || "") as `0x${string}`;
const PAGE_SIZE = Number(process.env.AUCTION_PAGE_SIZE || 100);

if (!diamond) {
  throw new Error("NEXT_PUBLIC_DIAMOND_ADDRESS missing");
}
if (!db) {
  throw new Error("DATABASE_URL missing");
}

const client = createPublicClient({
  transport: http(rpcUrl),
});

const ensureSchema = async () => {
  const sql = `
  CREATE TABLE IF NOT EXISTS auctions (
    id BIGINT NOT NULL,
    type TEXT NOT NULL,
    token_a TEXT,
    token_b TEXT,
    reserve_a NUMERIC,
    reserve_b NUMERIC,
    start_time BIGINT,
    end_time BIGINT,
    fee_bps INTEGER,
    fee_asset INTEGER,
    active BOOLEAN,
    finalized BOOLEAN,
    raw JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, type)
  );
  CREATE INDEX IF NOT EXISTS auctions_active_idx ON auctions (active, finalized);
  CREATE INDEX IF NOT EXISTS auctions_pair_idx ON auctions (token_a, token_b);
  `;
  await db!.query(sql);
};

const upsertAuction = async (row: {
  id: bigint;
  type: "solo" | "community";
  tokenA: string;
  tokenB: string;
  reserveA: bigint;
  reserveB: bigint;
  startTime: bigint;
  endTime: bigint;
  feeBps: number;
  feeAsset: number;
  active: boolean;
  finalized: boolean;
  raw: any;
}) => {
  const sql = `
    INSERT INTO auctions
      (id, type, token_a, token_b, reserve_a, reserve_b, start_time, end_time, fee_bps, fee_asset, active, finalized, raw, updated_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
    ON CONFLICT (id, type)
    DO UPDATE SET
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
  await db!.query(sql, [
    row.id.toString(),
    row.type,
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
    JSON.stringify(row.raw),
  ]);
};

async function fetchIds(
  kind: "solo" | "community",
  offset: number,
  limit: number
): Promise<{ ids: bigint[]; total: bigint }> {
  if (kind === "solo") {
    const result = (await client.readContract({
      address: diamond,
      abi: derivativeViewAbi,
      functionName: "getActiveAuctions",
      args: [BigInt(offset), BigInt(limit)],
    })) as readonly [bigint[], bigint];
    return { ids: result[0], total: result[1] };
  }
  const result = (await client.readContract({
    address: diamond,
    abi: auctionManagementViewAbi,
    functionName: "getActiveCommunityAuctions",
    args: [BigInt(offset), BigInt(limit)],
  })) as readonly [bigint[], bigint];
  return { ids: result[0], total: result[1] };
}

async function fetchAuction(kind: "solo" | "community", id: bigint) {
  if (kind === "solo") {
    const result = (await client.readContract({
      address: diamond,
      abi: ammAuctionAbi,
      functionName: "getAuction",
      args: [id],
    })) as any;
    const a = result?.auction ?? result;
    return {
      id,
      type: "solo" as const,
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
  const result = (await client.readContract({
    address: diamond,
    abi: communityAuctionAbi,
    functionName: "getCommunityAuction",
    args: [id],
  })) as any;
  const a = result?.auction ?? result;
  return {
    id,
    type: "community" as const,
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

async function indexKind(kind: "solo" | "community") {
  let offset = 0;
  while (true) {
    const { ids, total } = await fetchIds(kind, offset, PAGE_SIZE);
    if (!ids.length) break;
    for (const id of ids) {
      const auction = await fetchAuction(kind, id);
      await upsertAuction(auction);
    }
    offset += ids.length;
    if (offset >= Number(total)) break;
  }
}

async function main() {
  await ensureSchema();
  await indexKind("solo");
  await indexKind("community");
  await db!.end();
  console.log("Auction index updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
