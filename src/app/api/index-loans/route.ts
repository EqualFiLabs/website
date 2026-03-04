import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildIndexLoansFilters, computeIndexLoanIndexerStatus, parseIndexLoansQuery } from "@/lib/indexLoansApi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseIndexLoansQuery(searchParams);

  if (!db) {
    return NextResponse.json(
      {
        loans: [],
        page: query.page,
        limit: query.limit,
        status: {
          available: false,
          reason: "db_unavailable",
          updatedAt: null,
          staleSeconds: null,
          healthy: false,
        },
      },
      { status: 200 },
    );
  }

  const { params, whereSql } = buildIndexLoansFilters(query);
  const sql = `
    SELECT
      chain_id,
      loan_id,
      position_key,
      index_id,
      borrow_asset,
      collateral_units,
      principal,
      maturity,
      last_fee,
      active,
      recovered,
      last_event,
      block_number,
      tx_hash,
      updated_at,
      raw
    FROM index_loans
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;
  params.push(query.limit, query.offset);

  const [loansResult, statusResult] = await Promise.all([
    db.query(sql, params),
    query.chainId !== null
      ? db.query("SELECT MAX(updated_at) AS updated_at FROM index_loans WHERE chain_id = $1", [query.chainId])
      : db.query("SELECT MAX(updated_at) AS updated_at FROM index_loans"),
  ]);

  const status = computeIndexLoanIndexerStatus(statusResult.rows?.[0]?.updated_at ?? null);

  return NextResponse.json({
    loans: loansResult.rows,
    page: query.page,
    limit: query.limit,
    status: {
      available: true,
      ...status,
    },
  });
}
