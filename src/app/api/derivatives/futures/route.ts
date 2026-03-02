import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  if (!db) {
    return NextResponse.json({ futures: [] }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const scope = (searchParams.get("scope") || "active").toLowerCase();
  const includeAll = scope === "all";
  const chainId = searchParams.get("chainId");
  const makerPositionId = searchParams.get("makerPositionId");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const offset = (page - 1) * limit;

  const params: Array<string | number> = [];
  const whereClauses: string[] = [];

  if (!includeAll) {
    whereClauses.push("reclaimed = false AND COALESCE(remaining_size, 0) > 0");
  }
  if (chainId) {
    params.push(Number(chainId));
    whereClauses.push(`chain_id = $${params.length}`);
  }
  if (makerPositionId) {
    params.push(Number(makerPositionId));
    whereClauses.push(`maker_position_id = $${params.length}`);
  }

  const whereSql = whereClauses.length ? ` WHERE ${whereClauses.join(" AND ")}` : "";
  const sql = `
    SELECT
      chain_id,
      series_id,
      maker_position_key,
      maker_position_id,
      underlying_pool_id,
      quote_pool_id,
      underlying_asset,
      quote_asset,
      forward_price,
      expiry,
      grace_unlock_time,
      total_size,
      remaining_size,
      underlying_locked,
      create_fee_bps,
      exercise_fee_bps,
      reclaim_fee_bps,
      total_settled,
      total_claims_burned,
      is_european,
      reclaimed,
      updated_at
    FROM futures_series
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;
  params.push(limit, offset);

  const { rows } = await db.query(sql, params);
  return NextResponse.json({ futures: rows, page, limit });
}
