import assert from 'node:assert/strict'
import test from 'node:test'

import { derivePerpsMarketId, normalizePerpsMarkets } from '../src/lib/perps.js'

test('derivePerpsMarketId matches expected vector', () => {
  const marketId = derivePerpsMarketId({
    collateralPoolId: 5,
    collateralAsset: '0x9d67E306479B14239774146fe8e16EBD0357440A',
    indexAsset: '0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02',
  })

  assert.equal(
    marketId,
    '0x33529799768089dbacb4fb68873b19b3dee710f45cf78129e3f1b7413d581738',
  )
})

test('normalizePerpsMarkets derives ids and enriches pool metadata', () => {
  const poolsConfig = {
    pools: [
      {
        id: 'USDC',
        pid: 5,
        tokenName: 'USD Coin',
        ticker: 'USDC',
        decimals: 6,
        tokenAddress: '0x9d67E306479B14239774146fe8e16EBD0357440A',
      },
      {
        id: 'AMZN',
        pid: 10,
        tokenName: 'Amazon',
        ticker: 'AMZN',
        decimals: 18,
        tokenAddress: '0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02',
      },
    ],
    perpsMarkets: [
      {
        id: 'rh-usdc-amzn',
        collateralPoolId: 5,
        collateralAsset: '0x9d67E306479B14239774146fe8e16EBD0357440A',
        indexAsset: '0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02',
        feePoolId: 5,
        defaultMaxSlippageBps: 50,
        defaultExecutorFee: '100000000000000',
      },
      {
        id: 'use-pool-collateral-token',
        collateralPoolId: 5,
        indexAsset: '0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02',
      },
      {
        id: 'invalid',
        collateralPoolId: 5,
        indexAsset: 'not-an-address',
      },
    ],
  }

  const markets = normalizePerpsMarkets(poolsConfig)

  assert.equal(markets.length, 2)

  assert.equal(markets[0].id, 'rh-usdc-amzn')
  assert.equal(markets[0].collateralPool?.ticker, 'USDC')
  assert.equal(markets[0].indexPool?.ticker, 'AMZN')
  assert.equal(markets[0].feePoolId, 5)
  assert.equal(markets[0].defaultMaxSlippageBps, 50)
  assert.equal(markets[0].defaultExecutorFee, 100000000000000n)

  assert.equal(markets[1].id, 'use-pool-collateral-token')
  assert.equal(markets[1].collateralAsset, '0x9d67e306479b14239774146fe8e16ebd0357440a')
  assert.equal(markets[1].marketId, '0x33529799768089dbacb4fb68873b19b3dee710f45cf78129e3f1b7413d581738')
})
