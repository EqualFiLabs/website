import { parseAbiItem } from "viem";

export const INDEX_LOAN_EVENTS = [
  parseAbiItem(
    "event LoanCreated(uint256 indexed loanId, bytes32 indexed positionKey, uint256 indexed indexId, address borrowAsset, uint256 collateralUnits, uint256 principal, uint40 maturity, uint256 fee)",
  ),
  parseAbiItem(
    "event LoanRepaid(uint256 indexed loanId, uint256 indexed indexId, address borrowAsset, uint256 principal)",
  ),
  parseAbiItem("event LoanExtended(uint256 indexed loanId, uint40 newMaturity, uint256 fee)"),
  parseAbiItem(
    "event LoanRecovered(uint256 indexed loanId, uint256 indexed indexId, address borrowAsset, uint256 collateralUnits, uint256 writtenOffPrincipal)",
  ),
];

const upsertIndexLoan = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO index_loans (
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
      raw,
      block_number,
      tx_hash,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW()
    )
    ON CONFLICT (chain_id, loan_id)
    DO UPDATE SET
      position_key = COALESCE(EXCLUDED.position_key, index_loans.position_key),
      index_id = COALESCE(EXCLUDED.index_id, index_loans.index_id),
      borrow_asset = COALESCE(EXCLUDED.borrow_asset, index_loans.borrow_asset),
      collateral_units = COALESCE(EXCLUDED.collateral_units, index_loans.collateral_units),
      principal = COALESCE(EXCLUDED.principal, index_loans.principal),
      maturity = COALESCE(EXCLUDED.maturity, index_loans.maturity),
      last_fee = COALESCE(EXCLUDED.last_fee, index_loans.last_fee),
      active = EXCLUDED.active,
      recovered = EXCLUDED.recovered,
      last_event = EXCLUDED.last_event,
      raw = COALESCE(EXCLUDED.raw, index_loans.raw),
      block_number = COALESCE(EXCLUDED.block_number, index_loans.block_number),
      tx_hash = COALESCE(EXCLUDED.tx_hash, index_loans.tx_hash),
      updated_at = NOW()
  `;

  const values = [
    chainId,
    payload.loanId,
    payload.positionKey,
    payload.indexId,
    payload.borrowAsset,
    payload.collateralUnits,
    payload.principal,
    payload.maturity,
    payload.lastFee,
    payload.active,
    payload.recovered,
    payload.lastEvent,
    payload.raw,
    payload.blockNumber,
    payload.txHash,
  ];

  await db.query(sql, values);
};

export const handleIndexLoanLog = async (db, chainId, decoded, log) => {
  const eventName = decoded?.eventName;
  const args = decoded?.args || {};
  const safeArgs = JSON.parse(
    JSON.stringify(args, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
  );

  const base = {
    loanId: Number(args.loanId ?? 0),
    indexId: args.indexId !== undefined && args.indexId !== null ? Number(args.indexId) : null,
    positionKey: args.positionKey ?? null,
    borrowAsset: args.borrowAsset?.toLowerCase?.() ?? null,
    collateralUnits:
      args.collateralUnits !== undefined && args.collateralUnits !== null
        ? args.collateralUnits.toString()
        : null,
    principal:
      args.principal !== undefined && args.principal !== null
        ? args.principal.toString()
        : args.writtenOffPrincipal !== undefined && args.writtenOffPrincipal !== null
          ? args.writtenOffPrincipal.toString()
          : null,
    maturity:
      args.maturity !== undefined && args.maturity !== null
        ? Number(args.maturity)
        : args.newMaturity !== undefined && args.newMaturity !== null
          ? Number(args.newMaturity)
          : null,
    lastFee: args.fee !== undefined && args.fee !== null ? args.fee.toString() : null,
    blockNumber: log?.blockNumber !== undefined ? Number(log.blockNumber) : null,
    txHash: log?.transactionHash ?? null,
    raw: { event: eventName, args: safeArgs },
  };

  if (eventName === "LoanCreated") {
    await upsertIndexLoan(db, chainId, {
      ...base,
      active: true,
      recovered: false,
      lastEvent: eventName,
    });
    return true;
  }

  if (eventName === "LoanExtended") {
    await upsertIndexLoan(db, chainId, {
      ...base,
      active: true,
      recovered: false,
      lastEvent: eventName,
    });
    return true;
  }

  if (eventName === "LoanRepaid") {
    await upsertIndexLoan(db, chainId, {
      ...base,
      active: false,
      recovered: false,
      lastEvent: eventName,
    });
    return true;
  }

  if (eventName === "LoanRecovered") {
    await upsertIndexLoan(db, chainId, {
      ...base,
      active: false,
      recovered: true,
      lastEvent: eventName,
    });
    return true;
  }

  return false;
};
