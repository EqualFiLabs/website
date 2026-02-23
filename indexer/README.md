# EqualFi Auctions Indexer

Scaffolded multi-chain indexer for auction events.

## Networks
Configured via `indexer/config.mjs` with placeholders. Select networks using:

- CLI flag: `--networks arbitrum-sepolia,base-sepolia,ethereum-sepolia,anvil`
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

Placeholder values live in `config.mjs` until deployments are ready.
