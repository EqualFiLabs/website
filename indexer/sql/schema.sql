CREATE TABLE IF NOT EXISTS auctions (
  chain_id INTEGER NOT NULL,
  auction_id BIGINT NOT NULL,
  type TEXT NOT NULL,
  maker_position_id BIGINT,
  pool_id_a INTEGER,
  pool_id_b INTEGER,
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
  block_number BIGINT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chain_id, type, auction_id)
);

CREATE TABLE IF NOT EXISTS indexer_state (
  chain_id INTEGER PRIMARY KEY,
  last_block BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auctions_active_idx ON auctions (active, finalized);
CREATE INDEX IF NOT EXISTS auctions_pair_idx ON auctions (token_a, token_b);
CREATE INDEX IF NOT EXISTS auctions_updated_idx ON auctions (updated_at DESC);

CREATE TABLE IF NOT EXISTS option_series (
  chain_id INTEGER NOT NULL,
  series_id BIGINT NOT NULL,
  maker_position_key TEXT,
  maker_position_id BIGINT,
  underlying_pool_id INTEGER,
  strike_pool_id INTEGER,
  underlying_asset TEXT,
  strike_asset TEXT,
  strike_price NUMERIC,
  expiry BIGINT,
  total_size NUMERIC,
  remaining_size NUMERIC,
  collateral_locked NUMERIC,
  create_fee_bps INTEGER,
  exercise_fee_bps INTEGER,
  reclaim_fee_bps INTEGER,
  total_exercised NUMERIC DEFAULT 0,
  total_claims_burned NUMERIC DEFAULT 0,
  is_call BOOLEAN,
  is_american BOOLEAN,
  reclaimed BOOLEAN DEFAULT FALSE,
  created_block BIGINT,
  created_tx_hash TEXT,
  raw JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chain_id, series_id)
);

CREATE TABLE IF NOT EXISTS option_series_events (
  chain_id INTEGER NOT NULL,
  series_id BIGINT NOT NULL,
  event_name TEXT NOT NULL,
  holder TEXT,
  recipient TEXT,
  amount NUMERIC,
  strike_amount NUMERIC,
  payment_received NUMERIC,
  remaining_size NUMERIC,
  collateral_unlocked NUMERIC,
  raw JSONB,
  block_number BIGINT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chain_id, tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS futures_series (
  chain_id INTEGER NOT NULL,
  series_id BIGINT NOT NULL,
  maker_position_key TEXT,
  maker_position_id BIGINT,
  underlying_pool_id INTEGER,
  quote_pool_id INTEGER,
  underlying_asset TEXT,
  quote_asset TEXT,
  forward_price NUMERIC,
  expiry BIGINT,
  grace_unlock_time BIGINT,
  total_size NUMERIC,
  remaining_size NUMERIC,
  underlying_locked NUMERIC,
  create_fee_bps INTEGER,
  exercise_fee_bps INTEGER,
  reclaim_fee_bps INTEGER,
  total_settled NUMERIC DEFAULT 0,
  total_claims_burned NUMERIC DEFAULT 0,
  is_european BOOLEAN,
  reclaimed BOOLEAN DEFAULT FALSE,
  created_block BIGINT,
  created_tx_hash TEXT,
  raw JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chain_id, series_id)
);

CREATE TABLE IF NOT EXISTS futures_series_events (
  chain_id INTEGER NOT NULL,
  series_id BIGINT NOT NULL,
  event_name TEXT NOT NULL,
  holder TEXT,
  recipient TEXT,
  amount NUMERIC,
  quote_amount NUMERIC,
  payment_received NUMERIC,
  remaining_size NUMERIC,
  collateral_unlocked NUMERIC,
  raw JSONB,
  block_number BIGINT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chain_id, tx_hash, log_index)
);

ALTER TABLE option_series ADD COLUMN IF NOT EXISTS create_fee_bps INTEGER;
ALTER TABLE option_series ADD COLUMN IF NOT EXISTS exercise_fee_bps INTEGER;
ALTER TABLE option_series ADD COLUMN IF NOT EXISTS reclaim_fee_bps INTEGER;

ALTER TABLE futures_series ADD COLUMN IF NOT EXISTS create_fee_bps INTEGER;
ALTER TABLE futures_series ADD COLUMN IF NOT EXISTS exercise_fee_bps INTEGER;
ALTER TABLE futures_series ADD COLUMN IF NOT EXISTS reclaim_fee_bps INTEGER;

CREATE INDEX IF NOT EXISTS option_series_active_idx ON option_series (reclaimed, remaining_size);
CREATE INDEX IF NOT EXISTS option_series_position_idx ON option_series (maker_position_id);
CREATE INDEX IF NOT EXISTS option_series_updated_idx ON option_series (updated_at DESC);
CREATE INDEX IF NOT EXISTS option_series_events_series_idx ON option_series_events (chain_id, series_id, block_number DESC);

CREATE INDEX IF NOT EXISTS futures_series_active_idx ON futures_series (reclaimed, remaining_size);
CREATE INDEX IF NOT EXISTS futures_series_position_idx ON futures_series (maker_position_id);
CREATE INDEX IF NOT EXISTS futures_series_updated_idx ON futures_series (updated_at DESC);
CREATE INDEX IF NOT EXISTS futures_series_events_series_idx ON futures_series_events (chain_id, series_id, block_number DESC);
