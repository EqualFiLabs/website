import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mergeIlmPooledMarkets,
  normalizeDiscoveredIlmPooledMarkets,
  normalizeIlmPooledMarkets,
} from '../src/lib/ilmPooled.js'

test('normalizeIlmPooledMarkets enriches market config with pool metadata', () => {
  const poolsConfig = {
    pools: [
      { id: 'USDC', pid: 5, ticker: 'USDC', decimals: 6 },
      { id: 'WETH', pid: 4, ticker: 'WETH', decimals: 18 },
    ],
    ilmPooledMarkets: [
      {
        id: 'pooled-usdc-weth',
        marketId: 1,
        loanPoolId: 5,
        collateralPoolId: 4,
        moduleId: 8100,
      },
      {
        id: 'invalid',
        marketId: 'abc',
        loanPoolId: 5,
        collateralPoolId: 4,
      },
    ],
  }

  const markets = normalizeIlmPooledMarkets(poolsConfig)

  assert.equal(markets.length, 1)
  assert.equal(markets[0].id, 'pooled-usdc-weth')
  assert.equal(markets[0].marketId, 1)
  assert.equal(markets[0].loanPool?.ticker, 'USDC')
  assert.equal(markets[0].collateralPool?.ticker, 'WETH')
  assert.equal(markets[0].moduleId, 8100)
})

test('normalizeDiscoveredIlmPooledMarkets enriches on-chain discovered rows', () => {
  const poolsConfig = {
    pools: [
      { id: 'USDC', pid: 5, ticker: 'USDC', decimals: 6 },
      { id: 'WETH', pid: 4, ticker: 'WETH', decimals: 18 },
    ],
  }

  const markets = normalizeDiscoveredIlmPooledMarkets(poolsConfig, [
    { marketId: 7, loanPoolId: 5, collateralPoolId: 4 },
  ])

  assert.equal(markets.length, 1)
  assert.equal(markets[0].marketId, 7)
  assert.equal(markets[0].loanPool?.ticker, 'USDC')
  assert.equal(markets[0].collateralPool?.ticker, 'WETH')
})

test('mergeIlmPooledMarkets prefers config labels while filling discovered markets', () => {
  const merged = mergeIlmPooledMarkets(
    [
      {
        id: 'config-1',
        name: 'Configured USDC/WETH',
        marketId: 1,
        loanPoolId: 5,
        collateralPoolId: 4,
        moduleId: 8100,
      },
    ],
    [
      {
        id: 'discovered-1',
        name: 'Discovered 1',
        marketId: 1,
        loanPoolId: 5,
        collateralPoolId: 4,
      },
      {
        id: 'discovered-2',
        name: 'Discovered 2',
        marketId: 2,
        loanPoolId: 4,
        collateralPoolId: 5,
      },
    ],
  )

  assert.equal(merged.length, 2)
  assert.equal(merged[0].id, 'config-1')
  assert.equal(merged[0].name, 'Configured USDC/WETH')
  assert.equal(merged[1].id, 'discovered-2')
})
