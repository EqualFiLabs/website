const toSafeArgs = (args) =>
  JSON.parse(JSON.stringify(args, (key, value) => (typeof value === 'bigint' ? value.toString() : value)))

const toNumberOrNull = (value) => (value === undefined || value === null ? null : Number(value))
const toStringOrNull = (value) => (value === undefined || value === null ? null : value.toString())
const toLowerOrNull = (value) => (typeof value === 'string' && value.length ? value.toLowerCase() : null)

const insertOptionEvent = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO option_series_events (
      chain_id, series_id, event_name, holder, recipient, amount, strike_amount, payment_received,
      remaining_size, collateral_unlocked, raw, block_number, tx_hash, log_index, created_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW()
    )
    ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING;
  `
  const values = [
    chainId,
    payload.seriesId,
    payload.eventName,
    payload.holder ?? null,
    payload.recipient ?? null,
    payload.amount ?? null,
    payload.strikeAmount ?? null,
    payload.paymentReceived ?? null,
    payload.remainingSize ?? null,
    payload.collateralUnlocked ?? null,
    payload.raw ?? null,
    payload.blockNumber,
    payload.txHash,
    payload.logIndex,
  ]
  await db.query(sql, values)
}

const insertFuturesEvent = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO futures_series_events (
      chain_id, series_id, event_name, holder, recipient, amount, quote_amount, payment_received,
      remaining_size, collateral_unlocked, raw, block_number, tx_hash, log_index, created_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW()
    )
    ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING;
  `
  const values = [
    chainId,
    payload.seriesId,
    payload.eventName,
    payload.holder ?? null,
    payload.recipient ?? null,
    payload.amount ?? null,
    payload.quoteAmount ?? null,
    payload.paymentReceived ?? null,
    payload.remainingSize ?? null,
    payload.collateralUnlocked ?? null,
    payload.raw ?? null,
    payload.blockNumber,
    payload.txHash,
    payload.logIndex,
  ]
  await db.query(sql, values)
}

const upsertOptionSeriesOnCreate = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO option_series (
      chain_id, series_id, maker_position_key, maker_position_id, underlying_pool_id, strike_pool_id,
      underlying_asset, strike_asset, strike_price, expiry, total_size, remaining_size, collateral_locked,
      is_call, is_american, reclaimed, created_block, created_tx_hash, raw, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW()
    )
    ON CONFLICT (chain_id, series_id)
    DO UPDATE SET
      maker_position_key = COALESCE(EXCLUDED.maker_position_key, option_series.maker_position_key),
      maker_position_id = COALESCE(EXCLUDED.maker_position_id, option_series.maker_position_id),
      underlying_pool_id = COALESCE(EXCLUDED.underlying_pool_id, option_series.underlying_pool_id),
      strike_pool_id = COALESCE(EXCLUDED.strike_pool_id, option_series.strike_pool_id),
      underlying_asset = COALESCE(EXCLUDED.underlying_asset, option_series.underlying_asset),
      strike_asset = COALESCE(EXCLUDED.strike_asset, option_series.strike_asset),
      strike_price = COALESCE(EXCLUDED.strike_price, option_series.strike_price),
      expiry = COALESCE(EXCLUDED.expiry, option_series.expiry),
      total_size = COALESCE(EXCLUDED.total_size, option_series.total_size),
      remaining_size = COALESCE(option_series.remaining_size, EXCLUDED.remaining_size),
      collateral_locked = COALESCE(option_series.collateral_locked, EXCLUDED.collateral_locked),
      is_call = COALESCE(EXCLUDED.is_call, option_series.is_call),
      is_american = COALESCE(EXCLUDED.is_american, option_series.is_american),
      reclaimed = option_series.reclaimed OR EXCLUDED.reclaimed,
      created_block = COALESCE(option_series.created_block, EXCLUDED.created_block),
      created_tx_hash = COALESCE(option_series.created_tx_hash, EXCLUDED.created_tx_hash),
      raw = COALESCE(EXCLUDED.raw, option_series.raw),
      updated_at = NOW();
  `
  const values = [
    chainId,
    payload.seriesId,
    payload.makerPositionKey,
    payload.makerPositionId,
    payload.underlyingPoolId,
    payload.strikePoolId,
    payload.underlyingAsset,
    payload.strikeAsset,
    payload.strikePrice,
    payload.expiry,
    payload.totalSize,
    payload.totalSize,
    payload.collateralLocked,
    payload.isCall,
    payload.isAmerican,
    false,
    payload.blockNumber,
    payload.txHash,
    payload.raw,
  ]
  await db.query(sql, values)
}

const upsertOptionSeriesOnExercise = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO option_series (chain_id, series_id, total_exercised, reclaimed, updated_at)
    VALUES ($1,$2,$3,FALSE,NOW())
    ON CONFLICT (chain_id, series_id)
    DO UPDATE SET
      total_exercised = COALESCE(option_series.total_exercised, 0) + COALESCE(EXCLUDED.total_exercised, 0),
      remaining_size = CASE
        WHEN option_series.remaining_size IS NULL THEN NULL
        WHEN option_series.remaining_size > EXCLUDED.total_exercised THEN option_series.remaining_size - EXCLUDED.total_exercised
        ELSE 0
      END,
      collateral_locked = CASE
        WHEN option_series.collateral_locked IS NULL THEN NULL
        WHEN option_series.collateral_locked > $4 THEN option_series.collateral_locked - $4
        ELSE 0
      END,
      updated_at = NOW();
  `
  const values = [chainId, payload.seriesId, payload.amount, payload.strikeAmount]
  await db.query(sql, values)
}

const upsertOptionSeriesOnReclaim = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO option_series (chain_id, series_id, reclaimed, remaining_size, updated_at)
    VALUES ($1,$2,TRUE,0,NOW())
    ON CONFLICT (chain_id, series_id)
    DO UPDATE SET
      reclaimed = TRUE,
      remaining_size = 0,
      collateral_locked = CASE
        WHEN option_series.collateral_locked IS NULL THEN NULL
        WHEN option_series.collateral_locked > $3 THEN option_series.collateral_locked - $3
        ELSE 0
      END,
      updated_at = NOW();
  `
  const values = [chainId, payload.seriesId, payload.collateralUnlocked]
  await db.query(sql, values)
}

const upsertOptionSeriesOnClaimsBurn = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO option_series (chain_id, series_id, total_claims_burned, updated_at)
    VALUES ($1,$2,$3,NOW())
    ON CONFLICT (chain_id, series_id)
    DO UPDATE SET
      total_claims_burned = COALESCE(option_series.total_claims_burned, 0) + COALESCE(EXCLUDED.total_claims_burned, 0),
      updated_at = NOW();
  `
  await db.query(sql, [chainId, payload.seriesId, payload.amount])
}

const upsertFuturesSeriesOnCreate = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO futures_series (
      chain_id, series_id, maker_position_key, maker_position_id, underlying_pool_id, quote_pool_id,
      underlying_asset, quote_asset, forward_price, expiry, grace_unlock_time, total_size, remaining_size,
      underlying_locked, is_european, reclaimed, created_block, created_tx_hash, raw, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW()
    )
    ON CONFLICT (chain_id, series_id)
    DO UPDATE SET
      maker_position_key = COALESCE(EXCLUDED.maker_position_key, futures_series.maker_position_key),
      maker_position_id = COALESCE(EXCLUDED.maker_position_id, futures_series.maker_position_id),
      underlying_pool_id = COALESCE(EXCLUDED.underlying_pool_id, futures_series.underlying_pool_id),
      quote_pool_id = COALESCE(EXCLUDED.quote_pool_id, futures_series.quote_pool_id),
      underlying_asset = COALESCE(EXCLUDED.underlying_asset, futures_series.underlying_asset),
      quote_asset = COALESCE(EXCLUDED.quote_asset, futures_series.quote_asset),
      forward_price = COALESCE(EXCLUDED.forward_price, futures_series.forward_price),
      expiry = COALESCE(EXCLUDED.expiry, futures_series.expiry),
      grace_unlock_time = COALESCE(EXCLUDED.grace_unlock_time, futures_series.grace_unlock_time),
      total_size = COALESCE(EXCLUDED.total_size, futures_series.total_size),
      remaining_size = COALESCE(futures_series.remaining_size, EXCLUDED.remaining_size),
      underlying_locked = COALESCE(futures_series.underlying_locked, EXCLUDED.underlying_locked),
      is_european = COALESCE(EXCLUDED.is_european, futures_series.is_european),
      reclaimed = futures_series.reclaimed OR EXCLUDED.reclaimed,
      created_block = COALESCE(futures_series.created_block, EXCLUDED.created_block),
      created_tx_hash = COALESCE(futures_series.created_tx_hash, EXCLUDED.created_tx_hash),
      raw = COALESCE(EXCLUDED.raw, futures_series.raw),
      updated_at = NOW();
  `
  const values = [
    chainId,
    payload.seriesId,
    payload.makerPositionKey,
    payload.makerPositionId,
    payload.underlyingPoolId,
    payload.quotePoolId,
    payload.underlyingAsset,
    payload.quoteAsset,
    payload.forwardPrice,
    payload.expiry,
    payload.graceUnlockTime,
    payload.totalSize,
    payload.totalSize,
    payload.underlyingLocked,
    payload.isEuropean,
    false,
    payload.blockNumber,
    payload.txHash,
    payload.raw,
  ]
  await db.query(sql, values)
}

const upsertFuturesSeriesOnSettled = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO futures_series (chain_id, series_id, total_settled, reclaimed, updated_at)
    VALUES ($1,$2,$3,FALSE,NOW())
    ON CONFLICT (chain_id, series_id)
    DO UPDATE SET
      total_settled = COALESCE(futures_series.total_settled, 0) + COALESCE(EXCLUDED.total_settled, 0),
      remaining_size = CASE
        WHEN futures_series.remaining_size IS NULL THEN NULL
        WHEN futures_series.remaining_size > EXCLUDED.total_settled THEN futures_series.remaining_size - EXCLUDED.total_settled
        ELSE 0
      END,
      underlying_locked = CASE
        WHEN futures_series.underlying_locked IS NULL THEN NULL
        WHEN futures_series.underlying_locked > EXCLUDED.total_settled THEN futures_series.underlying_locked - EXCLUDED.total_settled
        ELSE 0
      END,
      updated_at = NOW();
  `
  await db.query(sql, [chainId, payload.seriesId, payload.amount])
}

const upsertFuturesSeriesOnReclaim = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO futures_series (chain_id, series_id, reclaimed, remaining_size, updated_at)
    VALUES ($1,$2,TRUE,0,NOW())
    ON CONFLICT (chain_id, series_id)
    DO UPDATE SET
      reclaimed = TRUE,
      remaining_size = 0,
      underlying_locked = CASE
        WHEN futures_series.underlying_locked IS NULL THEN NULL
        WHEN futures_series.underlying_locked > $3 THEN futures_series.underlying_locked - $3
        ELSE 0
      END,
      updated_at = NOW();
  `
  await db.query(sql, [chainId, payload.seriesId, payload.collateralUnlocked])
}

const upsertFuturesSeriesOnClaimsBurn = async (db, chainId, payload) => {
  const sql = `
    INSERT INTO futures_series (chain_id, series_id, total_claims_burned, updated_at)
    VALUES ($1,$2,$3,NOW())
    ON CONFLICT (chain_id, series_id)
    DO UPDATE SET
      total_claims_burned = COALESCE(futures_series.total_claims_burned, 0) + COALESCE(EXCLUDED.total_claims_burned, 0),
      updated_at = NOW();
  `
  await db.query(sql, [chainId, payload.seriesId, payload.amount])
}

export const handleOptionLog = async (db, chainId, decoded, log) => {
  const eventName = decoded.eventName
  const args = decoded.args || {}
  const safeArgs = toSafeArgs(args)
  const base = {
    seriesId: toNumberOrNull(args.seriesId) ?? 0,
    blockNumber: toNumberOrNull(log.blockNumber) ?? 0,
    txHash: log.transactionHash,
    logIndex: toNumberOrNull(log.logIndex) ?? 0,
    raw: { event: eventName, args: safeArgs },
  }

  if (eventName === 'SeriesCreated') {
    await upsertOptionSeriesOnCreate(db, chainId, {
      ...base,
      makerPositionKey: toLowerOrNull(args.makerPositionKey),
      makerPositionId: toNumberOrNull(args.makerPositionId),
      underlyingPoolId: toNumberOrNull(args.underlyingPoolId),
      strikePoolId: toNumberOrNull(args.strikePoolId),
      underlyingAsset: toLowerOrNull(args.underlyingAsset),
      strikeAsset: toLowerOrNull(args.strikeAsset),
      strikePrice: toStringOrNull(args.strikePrice),
      expiry: toNumberOrNull(args.expiry),
      totalSize: toStringOrNull(args.totalSize),
      collateralLocked: toStringOrNull(args.collateralLocked),
      isCall: Boolean(args.isCall),
      isAmerican: Boolean(args.isAmerican),
    })
    await insertOptionEvent(db, chainId, { ...base, eventName })
    return true
  }

  if (eventName === 'Exercised') {
    const amount = toStringOrNull(args.amount)
    const strikeAmount = toStringOrNull(args.strikeAmount)
    const paymentReceived = toStringOrNull(args.paymentReceived)
    await upsertOptionSeriesOnExercise(db, chainId, {
      ...base,
      amount,
      strikeAmount,
    })
    await insertOptionEvent(db, chainId, {
      ...base,
      eventName,
      holder: toLowerOrNull(args.holder),
      recipient: toLowerOrNull(args.recipient),
      amount,
      strikeAmount,
      paymentReceived,
    })
    return true
  }

  if (eventName === 'Reclaimed') {
    const remainingSize = toStringOrNull(args.remainingSize)
    const collateralUnlocked = toStringOrNull(args.collateralUnlocked)
    await upsertOptionSeriesOnReclaim(db, chainId, {
      ...base,
      collateralUnlocked,
    })
    await insertOptionEvent(db, chainId, {
      ...base,
      eventName,
      remainingSize,
      collateralUnlocked,
    })
    return true
  }

  if (eventName === 'ReclaimedClaimsBurned') {
    const amount = toStringOrNull(args.amount)
    await upsertOptionSeriesOnClaimsBurn(db, chainId, {
      ...base,
      amount,
    })
    await insertOptionEvent(db, chainId, {
      ...base,
      eventName,
      holder: toLowerOrNull(args.holder),
      amount,
    })
    return true
  }

  return false
}

export const handleFuturesLog = async (db, chainId, decoded, log) => {
  const eventName = decoded.eventName
  const args = decoded.args || {}
  const safeArgs = toSafeArgs(args)
  const base = {
    seriesId: toNumberOrNull(args.seriesId) ?? 0,
    blockNumber: toNumberOrNull(log.blockNumber) ?? 0,
    txHash: log.transactionHash,
    logIndex: toNumberOrNull(log.logIndex) ?? 0,
    raw: { event: eventName, args: safeArgs },
  }

  if (eventName === 'SeriesCreated') {
    await upsertFuturesSeriesOnCreate(db, chainId, {
      ...base,
      makerPositionKey: toLowerOrNull(args.makerPositionKey),
      makerPositionId: toNumberOrNull(args.makerPositionId),
      underlyingPoolId: toNumberOrNull(args.underlyingPoolId),
      quotePoolId: toNumberOrNull(args.quotePoolId),
      underlyingAsset: toLowerOrNull(args.underlyingAsset),
      quoteAsset: toLowerOrNull(args.quoteAsset),
      forwardPrice: toStringOrNull(args.forwardPrice),
      expiry: toNumberOrNull(args.expiry),
      graceUnlockTime: toNumberOrNull(args.graceUnlockTime),
      totalSize: toStringOrNull(args.totalSize),
      underlyingLocked: toStringOrNull(args.underlyingLocked),
      isEuropean: Boolean(args.isEuropean),
    })
    await insertFuturesEvent(db, chainId, { ...base, eventName })
    return true
  }

  if (eventName === 'Settled') {
    const amount = toStringOrNull(args.amount)
    const quoteAmount = toStringOrNull(args.quoteAmount)
    const paymentReceived = toStringOrNull(args.paymentReceived)
    await upsertFuturesSeriesOnSettled(db, chainId, {
      ...base,
      amount,
    })
    await insertFuturesEvent(db, chainId, {
      ...base,
      eventName,
      holder: toLowerOrNull(args.holder),
      recipient: toLowerOrNull(args.recipient),
      amount,
      quoteAmount,
      paymentReceived,
    })
    return true
  }

  if (eventName === 'Reclaimed') {
    const remainingSize = toStringOrNull(args.remainingSize)
    const collateralUnlocked = toStringOrNull(args.collateralUnlocked)
    await upsertFuturesSeriesOnReclaim(db, chainId, {
      ...base,
      collateralUnlocked,
    })
    await insertFuturesEvent(db, chainId, {
      ...base,
      eventName,
      remainingSize,
      collateralUnlocked,
    })
    return true
  }

  if (eventName === 'ReclaimedClaimsBurned') {
    const amount = toStringOrNull(args.amount)
    await upsertFuturesSeriesOnClaimsBurn(db, chainId, {
      ...base,
      amount,
    })
    await insertFuturesEvent(db, chainId, {
      ...base,
      eventName,
      holder: toLowerOrNull(args.holder),
      amount,
    })
    return true
  }

  return false
}
