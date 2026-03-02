const tupleValue = (value, key, index, fallback = null) => {
  if (value && typeof value === 'object' && key in value) {
    return value[key] ?? fallback
  }
  if (Array.isArray(value) && value[index] !== undefined) {
    return value[index]
  }
  return fallback
}

export const handleIlmMarketLog = async (db, chainId, decoded, log) => {
  const eventName = decoded?.eventName
  if (eventName !== 'IlmIsolatedCreateMarket') {
    return false
  }

  const args = decoded?.args || {}
  const params = args.params || tupleValue(args, 'params', 2, null) || {}

  const marketId = String(args.marketId || tupleValue(args, 'marketId', 0, '') || '').toLowerCase()
  const moduleId = Number(args.moduleId ?? tupleValue(args, 'moduleId', 1, 0n) ?? 0n)
  const loanPoolId = Number(tupleValue(params, 'loanPoolId', 0, 0n) ?? 0n)
  const collateralPoolId = Number(tupleValue(params, 'collateralPoolId', 1, 0n) ?? 0n)
  const oracle = String(tupleValue(params, 'oracle', 2, '') || '').toLowerCase()
  const irm = String(tupleValue(params, 'irm', 3, '') || '').toLowerCase()
  const lltv = String(tupleValue(params, 'lltv', 4, 0n) ?? 0n)

  const raw = {
    event: eventName,
    args: JSON.parse(
      JSON.stringify(args, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)),
    ),
  }

  const sql = `
    INSERT INTO ilm_isolated_markets (
      chain_id,
      market_id,
      module_id,
      loan_pool_id,
      collateral_pool_id,
      oracle,
      irm,
      lltv,
      raw,
      block_number,
      tx_hash,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()
    )
    ON CONFLICT (chain_id, market_id)
    DO UPDATE SET
      module_id = EXCLUDED.module_id,
      loan_pool_id = EXCLUDED.loan_pool_id,
      collateral_pool_id = EXCLUDED.collateral_pool_id,
      oracle = EXCLUDED.oracle,
      irm = EXCLUDED.irm,
      lltv = EXCLUDED.lltv,
      raw = EXCLUDED.raw,
      block_number = EXCLUDED.block_number,
      tx_hash = EXCLUDED.tx_hash,
      updated_at = NOW();
  `

  await db.query(sql, [
    chainId,
    marketId,
    moduleId,
    loanPoolId,
    collateralPoolId,
    oracle,
    irm,
    lltv,
    raw,
    Number(log.blockNumber),
    log.transactionHash,
  ])

  return true
}
