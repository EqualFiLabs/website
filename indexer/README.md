# EqualFi Derivatives Indexer

Multi-chain indexer for auction + derivatives (options/futures) events.

## Networks
Configured via `indexer/config.mjs` with placeholders. Select networks using:

- CLI flag: `--networks arbitrum-sepolia,base-sepolia,ethereum-sepolia,robinhood-testnet,anvil`
- Or env: `INDEXER_NETWORKS=anvil`

Each network also expects:
- `RPC_URL_*`
- `DIAMOND_ADDRESS_*`
- Optional: `START_BLOCK_*`

## Run
```bash
node indexer/index.mjs --networks anvil
```

## Notes
- Will skip networks with missing RPC or diamond address.
- Database requires `DATABASE_URL` (Postgres).
- Tables are created automatically on start.
- Tracks:
  - `auctions` (solo/community AMM auctions)
  - `option_series` + `option_series_events`
  - `futures_series` + `futures_series_events`
  - `ilm_isolated_markets` (from `IlmIsolatedCreateMarket`)

Placeholder values live in `config.mjs` until deployments are ready.
