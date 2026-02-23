# EqualFi Web Interface

Modern web interface for interacting with the EqualFi protocol built with Next.js 15, React 19, and wagmi v2.

## Prerequisites

- **Node.js** 18.x or higher
- **pnpm** 8.x or higher (recommended) or npm
- **PostgreSQL** 14.x or higher
- **Git**
- **Foundry** (for local blockchain testing)

## Installation

### 1. Install Dependencies

```bash
cd website
pnpm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb equalfi
```

Or using psql:

```sql
CREATE DATABASE equalfi;
```

Initialize the database schema:

```bash
psql equalfi < indexer/sql/schema.sql
```

Or manually:

```sql
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chain_id, auction_id)
);

CREATE TABLE IF NOT EXISTS indexer_state (
  chain_id INTEGER PRIMARY KEY,
  last_block BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auctions_active_idx ON auctions (active, finalized);
CREATE INDEX IF NOT EXISTS auctions_pair_idx ON auctions (token_a, token_b);
CREATE INDEX IF NOT EXISTS auctions_updated_idx ON auctions (updated_at DESC);
```

### 3. Environment Configuration

Create a `.env.local` file in the `website/` directory:

```bash
# Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/equalfi

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here

# Indexer Configuration (optional - for running the indexer)
# Select networks: arbitrum-sepolia,base-sepolia,ethereum-sepolia,anvil
INDEXER_NETWORKS=anvil

# Anvil (Local Foundry)
RPC_URL_ANVIL=http://127.0.0.1:8545
DIAMOND_ADDRESS_ANVIL=0xbcdc0d1555c4875fd3cd08d1227530c9b8e698c3
START_BLOCK_ANVIL=0

# Arbitrum Sepolia
RPC_URL_ARBITRUM_SEPOLIA=https://sepolia-rollup.arbitrum.io/rpc
DIAMOND_ADDRESS_ARBITRUM_SEPOLIA=0x027c9ba58be0af69c990da55630d9042d067652b
START_BLOCK_ARBITRUM_SEPOLIA=0

# Base Sepolia
RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
DIAMOND_ADDRESS_BASE_SEPOLIA=0x027c9ba58be0af69c990da55630d9042d067652b
START_BLOCK_BASE_SEPOLIA=0

# Ethereum Sepolia
RPC_URL_ETHEREUM_SEPOLIA=https://rpc.sepolia.org
DIAMOND_ADDRESS_ETHEREUM_SEPOLIA=0x027c9ba58be0af69c990da55630d9042d067652b
START_BLOCK_ETHEREUM_SEPOLIA=0
```

**Note:** Contract addresses are configured in `src/lib/pools.json` and support multi-chain deployments.

### 4. Update Pool Configuration

The application uses `src/lib/pools.json` for multi-chain contract addresses. This file is already configured with:

- **Foundry (31337)**: Local development addresses
- **Testnets (421614, 84532, 11155111)**: Shared addresses for Arbitrum Sepolia, Base Sepolia, and Ethereum Sepolia

After deploying to new networks, update the appropriate section in `pools.json`:

```json
{
  "31337": {
    "diamondAddress": "0xbcdc0d1555c4875fd3cd08d1227530c9b8e698c3",
    "positionNFTAddress": "0x82c098efe320a6226dda913e286bd309994e310c",
    "faucetAddress": "0x88d90fDA745Da2487974879D400A5eCe434D811c",
    "pools": [...]
  },
  "testnets": {
    "diamondAddress": "0x027c9ba58be0af69c990da55630d9042d067652b",
    "positionNFTAddress": "0x560beed75ba42f99602f8786abc4700c8b4cb1c5",
    "faucetAddress": "0x88d90fDA745Da2487974879D400A5eCe434D811c",
    "pools": [...]
  }
}
```

## Development

### Start Local Blockchain

In the root project directory:

```bash
anvil
```

### Deploy Contracts

In a separate terminal:

```bash
forge script script/DeployDiamond.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### Update Contract Addresses

After deployment, update addresses in `src/lib/pools.json` for the appropriate network section.

### Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Production Deployment

### Build

```bash
pnpm build
```

### Start Production Server

```bash
pnpm start
```

### Environment Variables for Production

For production deployments, set the following environment variables:

- `NEXT_PUBLIC_RPC_URL`: Production RPC endpoint (e.g., Alchemy, Infura)
- `NEXT_PUBLIC_CHAIN_ID`: Target chain ID (1 for Ethereum mainnet, 42161 for Arbitrum, etc.)
- `DATABASE_URL`: Production PostgreSQL connection string
- All contract addresses from deployment

### Deployment Platforms

#### Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

#### Docker

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t equalfi-web .
docker run -p 3000:3000 --env-file .env.local equalfi-web
```

## Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **React**: 19.x
- **Styling**: Tailwind CSS
- **Web3**: wagmi v2, viem
- **Database**: PostgreSQL with pg driver
- **State Management**: React hooks + Context API

### Directory Structure

```
website/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API routes
│   │   │   └── auctions/      # Auction data endpoint
│   │   ├── app/               # Main application pages
│   │   │   ├── auctions/      # Auction management
│   │   │   ├── credit/        # P2P lending
│   │   │   ├── faucet/        # Token faucet
│   │   │   ├── index/         # Index tokens
│   │   │   ├── position/      # Position management
│   │   │   └── swap/          # Token swaps
│   │   └── blog/              # Blog/documentation
│   ├── components/            # React components
│   │   ├── common/            # Shared components
│   │   ├── create/            # Creation forms
│   │   └── pool/              # Pool/auction components
│   ├── lib/                   # Utilities and configuration
│   │   ├── abis/              # Contract ABIs
│   │   ├── hooks/             # Custom React hooks
│   │   ├── db.ts              # Database client
│   │   ├── pools.json         # Pool configuration
│   │   └── tokens.js          # Token utilities
│   └── styles/                # Global styles
├── public/                    # Static assets
├── .env.local                 # Environment variables
└── package.json
```

### Key Features

- **Position Management**: Create and manage Position NFTs
- **Lending & Borrowing**: Self-secured credit and P2P lending
- **AMM Auctions**: Solo and community liquidity pools
- **Token Swaps**: Swap tokens through auction pools
- **Index Tokens**: Create and manage basket tokens
- **Derivatives**: Options and futures trading
- **Agent Wallets**: ERC-6551 token-bound accounts with ERC-6900 modules

## Auction Indexer

The indexer automatically tracks auction events across all configured networks.

### Running the Indexer

```bash
# Index all configured networks
node indexer/index.mjs

# Index specific networks
node indexer/index.mjs --networks anvil
node indexer/index.mjs --networks arbitrum-sepolia,base-sepolia,ethereum-sepolia

# Or use environment variable
INDEXER_NETWORKS=anvil node indexer/index.mjs
```

### Configuration

Networks are configured in `indexer/config.mjs`. Each network requires:
- `RPC_URL_*` - RPC endpoint
- `DIAMOND_ADDRESS_*` - Deployed Diamond contract address
- `START_BLOCK_*` (optional) - Block to start indexing from

The indexer will:
- Automatically create database tables on first run
- Track last indexed block per chain in `indexer_state` table
- Resume from last block on restart
- Skip networks with missing configuration

See `indexer/README.md` for more details.

## Database Management

### Backup and Restore

```bash
# Backup
pg_dump equalfi > equalfi_backup.sql

# Restore
psql equalfi < equalfi_backup.sql
```

## Troubleshooting

### Common Issues

**Issue**: "Cannot connect to database"
- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` in `.env.local`
- Ensure database exists: `psql -l | grep equalfi`

**Issue**: "Contract call reverted"
- Verify you're connected to the correct network in your wallet
- Check contract addresses in `pools.json` match your connected network
- Ensure wallet has sufficient gas

**Issue**: "Auctions not displaying"
- Ensure the indexer is running: `node indexer/index.mjs`
- Check database has auction records: `psql equalfi -c "SELECT * FROM auctions;"`
- Verify indexer is configured for the correct network
- Hard refresh browser (Ctrl+Shift+R)

**Issue**: "Expected Share (%) shows 0"
- This was fixed in recent updates
- Ensure you're on the latest code
- Check browser console for calculation logs

**Issue**: "Indexer not finding events"
- Verify `DIAMOND_ADDRESS_*` matches deployed contract
- Check `START_BLOCK_*` is set to deployment block or earlier
- Ensure RPC endpoint is accessible and not rate-limited

### Debug Mode

Enable verbose logging:

```bash
NEXT_PUBLIC_DEBUG=true pnpm dev
```

## Network Configuration

### Supported Networks

The application supports multiple networks:

- **Foundry Local** (chainId: 31337)
- **Arbitrum Sepolia** (chainId: 421614)
- **Base Sepolia** (chainId: 84532)
- **Ethereum Sepolia** (chainId: 11155111)

Network switching is handled automatically by the UI based on the connected wallet's network.

### Adding a New Network

1. Add network configuration to `indexer/config.mjs`
2. Add corresponding env vars for RPC URL, Diamond address, and start block
3. Deploy contracts to the new network
4. Update `src/lib/pools.json` with new network section (or add to "testnets" if addresses match)

## API Reference

### GET /api/auctions

Fetch auction data from database.

**Query Parameters:**
- `chainId` (optional): Filter by chain ID
- `scope` (optional): `active` (default) or `all`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)

**Response:**
```json
{
  "auctions": [
    {
      "id": 1,
      "type": "solo",
      "token_a": "0x...",
      "token_b": "0x...",
      "reserve_a": "5000000000000000000",
      "reserve_b": "15000000000",
      "active": true,
      "finalized": false
    }
  ],
  "page": 1,
  "limit": 50
}
```

## Contributing

See the main project README for contribution guidelines.

## License

BUSL-1.1 - See LICENSE file in root directory.
