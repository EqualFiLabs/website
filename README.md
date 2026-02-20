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

Create the auctions table:

```sql
CREATE TABLE auctions (
  id BIGSERIAL,
  type TEXT NOT NULL,
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chain_id INTEGER NOT NULL,
  auction_id BIGINT NOT NULL,
  maker_position_id BIGINT,
  pool_id_a INTEGER,
  pool_id_b INTEGER,
  block_number BIGINT,
  tx_hash TEXT,
  PRIMARY KEY (chain_id, type, auction_id)
);

CREATE INDEX auctions_active_idx ON auctions(active, finalized);
CREATE INDEX auctions_pair_idx ON auctions(token_a, token_b);
CREATE INDEX auctions_updated_idx ON auctions(updated_at DESC);
```

### 3. Environment Configuration

Create a `.env.local` file in the `website/` directory:

```bash
# RPC Configuration
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here

# Contract Addresses (update after deployment)
NEXT_PUBLIC_DIAMOND_ADDRESS=0xfe5f411481565fbf70d8d33d992c78196e014b90
NEXT_PUBLIC_POSITION_NFT=0xd6b040736e948621c5b6e0a494473c47a6113ea8
NEXT_PUBLIC_FAUCET_ADDRESS=0x1343248cbd4e291c6979e70a138f4c774e902561
NEXT_PUBLIC_OPTION_TOKEN=0x139e1d41943ee15dde4df876f9d0e7f85e26660a
NEXT_PUBLIC_FUTURES_TOKEN=0xade429ba898c34722e722415d722a70a297ce3a2

# Pool Underlying Token Addresses
NEXT_PUBLIC_POOL1_UNDERLYING=0xc1e0a9db9ea830c52603798481045688c8ae99c2
NEXT_PUBLIC_POOL2_UNDERLYING=0x1c9fd50df7a4f066884b58a05d91e4b55005876a
NEXT_PUBLIC_POOL3_UNDERLYING=0x71a0b8a2245a9770a4d887ce1e4ecc6c1d4ff28c
NEXT_PUBLIC_POOL4_UNDERLYING=0xae120f0df055428e45b264e7794a18c54a2a3faf
NEXT_PUBLIC_POOL5_UNDERLYING=0x9fcca440f19c62cdf7f973eb6ddf218b15d4c71d
NEXT_PUBLIC_POOL6_UNDERLYING=0x0000000000000000000000000000000000000000

# ERC-6900 Module Addresses
NEXT_PUBLIC_SESSION_KEY_MODULE=0xd5724171c2b7f0aa717a324626050bd05767e2c6
NEXT_PUBLIC_AMM_SKILL_MODULE=0x67ad6ea566ba6b0fc52e97bc25ce46120fdac04c

# ERC-8004 Registry Addresses
NEXT_PUBLIC_IDENTITY_REGISTRY=0xc7143d5ba86553c06f5730c8dc9f8187a621a8d4
NEXT_PUBLIC_REPUTATION_REGISTRY=0x8004B663056A597Dffe9eCcC1965A193B7388713
NEXT_PUBLIC_VALIDATION_REGISTRY=0x8004Cb1BF31DAf7788923b405b754f57acEB4272

# Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/equalfi
```

### 4. Update Pool Configuration

Edit `src/lib/pools.json` with your deployed contract addresses:

```json
{
  "diamondAddress": "0xfe5f411481565fbf70d8d33d992c78196e014b90",
  "positionNFTAddress": "0xd6b040736e948621c5b6e0a494473c47a6113ea8",
  "faucetAddress": "0x1343248cbd4e291c6979e70a138f4c774e902561",
  "indexTokens": [
    {
      "id": "EQ-ETH",
      "indexTicker": "EQ-ETH",
      "indexTokenAddress": "0x7d8c5ad52e1d30b8e13c58a5955a1a60613a6459"
    }
  ],
  "pools": [
    {
      "id": "rETH",
      "pid": 1,
      "tokenName": "Rocket Pool ETH",
      "ticker": "rETH",
      "decimals": 18,
      "tokenAddress": "0xc1e0a9db9ea830c52603798481045688c8ae99c2",
      "lendingPoolAddress": "0xfe5f411481565fbf70d8d33d992c78196e014b90"
    }
  ]
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

After deployment, update the addresses in:
1. `.env.local`
2. `src/lib/pools.json`

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

## Database Management

### Auction Indexing

Auctions must be manually added to the database. Example:

```sql
INSERT INTO auctions (
  auction_id, type, token_a, token_b, reserve_a, reserve_b,
  pool_id_a, pool_id_b, maker_position_id, fee_bps,
  active, finalized, chain_id, start_time, end_time
) VALUES (
  1, 'solo',
  '0xc1e0a9db9ea830c52603798481045688c8ae99c2',
  '0x9fcca440f19c62cdf7f973eb6ddf218b15d4c71d',
  '5000000000000000000', '15000000000',
  1, 5, 1, 30,
  true, false, 31337,
  EXTRACT(EPOCH FROM NOW())::bigint,
  EXTRACT(EPOCH FROM NOW() + INTERVAL '30 days')::bigint
);
```

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
- Verify contract addresses in `.env.local` and `pools.json`
- Check RPC endpoint is accessible
- Ensure wallet has sufficient gas

**Issue**: "Auctions not displaying"
- Check database has auction records: `psql equalfi -c "SELECT * FROM auctions;"`
- Verify token addresses match deployed contracts
- Hard refresh browser (Ctrl+Shift+R)

**Issue**: "Expected Share (%) shows 0"
- This was fixed - ensure you're on latest code
- Check browser console for calculation logs

### Debug Mode

Enable verbose logging:

```bash
NEXT_PUBLIC_DEBUG=true pnpm dev
```

## Network Configuration

### Supported Networks

The application supports multiple networks with canonical registry addresses:

- **Ethereum Mainnet** (chainid: 1)
- **Sepolia Testnet** (chainid: 11155111)
- **Arbitrum One** (chainid: 42161)
- **Arbitrum Sepolia** (chainid: 421614)
- **Base** (chainid: 8453)
- **Base Sepolia** (chainid: 84532)
- **Optimism** (chainid: 10)
- **Optimism Sepolia** (chainid: 11155420)

### Adding a New Network

1. Update `NEXT_PUBLIC_CHAIN_ID` in `.env.local`
2. Update `NEXT_PUBLIC_RPC_URL` with network RPC endpoint
3. Deploy contracts to the new network
4. Update all contract addresses in configuration files

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
