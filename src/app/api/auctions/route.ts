import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  if (!db) {
    return NextResponse.json({ auctions: [] }, { status: 200 });
  }
  const { searchParams } = new URL(request.url);
  const scope = (searchParams.get("scope") || "active").toLowerCase();
  const includeAll = scope === "all";
  const chainId = searchParams.get("chainId");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const offset = (page - 1) * limit;

  const baseSelect = `SELECT chain_id, auction_id AS id, type, maker_position_id, pool_id_a, pool_id_b, token_a, token_b, reserve_a, reserve_b, start_time, end_time, fee_bps, fee_asset, active, finalized, raw, updated_at
       FROM auctions`;

  const params: Array<string | number> = [];
  const whereClauses: string[] = [];

  if (!includeAll) {
    whereClauses.push("active = true AND finalized = false");
  }
  if (chainId) {
    params.push(Number(chainId));
    whereClauses.push(`chain_id = $${params.length}`);
  }

  const whereSql = whereClauses.length ? ` WHERE ${whereClauses.join(" AND ")}` : "";
  const sql = `${baseSelect}${whereSql} ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await db.query(sql, params);
  return NextResponse.json({ auctions: rows, page, limit });
}
