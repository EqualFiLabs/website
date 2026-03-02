import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  if (!db) {
    return NextResponse.json({ markets: [] }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") || 200)));
  const offset = (page - 1) * limit;

  const params: Array<string | number> = [];
  const whereClauses: string[] = [];

  if (chainId) {
    params.push(Number(chainId));
    whereClauses.push(`chain_id = $${params.length}`);
  }

  const whereSql = whereClauses.length ? ` WHERE ${whereClauses.join(" AND ")}` : "";
  const sql = `
    SELECT
      chain_id,
      market_id,
      module_id,
      loan_pool_id,
      collateral_pool_id,
      oracle,
      irm,
      lltv,
      tx_hash,
      block_number,
      updated_at,
      raw
    FROM ilm_isolated_markets
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  params.push(limit, offset);

  const { rows } = await db.query(sql, params);
  return NextResponse.json({ markets: rows, page, limit });
}
