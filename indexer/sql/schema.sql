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
