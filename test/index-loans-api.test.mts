import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildIndexLoansFilters,
  computeIndexLoanIndexerStatus,
  parseIndexLoansQuery,
} from '../src/lib/indexLoansApi.js'

test('parseIndexLoansQuery clamps paging and normalizes fields', () => {
  const params = new URLSearchParams({
    chainId: '42161',
    indexId: '3',
    positionKey: '0xABCD',
    scope: 'all',
    page: '-5',
    limit: '999',
  })

  const parsed = parseIndexLoansQuery(params)
  assert.equal(parsed.chainId, 42161)
  assert.equal(parsed.indexId, 3)
  assert.equal(parsed.positionKey, '0xabcd')
  assert.equal(parsed.includeAll, true)
  assert.equal(parsed.page, 1)
  assert.equal(parsed.limit, 200)
  assert.equal(parsed.offset, 0)
})

test('buildIndexLoansFilters creates deterministic where clauses and params', () => {
  const parsed = {
    chainId: 1,
    indexId: 7,
    positionKey: '0xabc',
    includeAll: false,
  }
  const { whereSql, params } = buildIndexLoansFilters(parsed)

  assert.equal(
    whereSql,
    ' WHERE active = true AND chain_id = $1 AND index_id = $2 AND LOWER(position_key) = $3',
  )
  assert.deepEqual(params, [1, 7, '0xabc'])
})

test('computeIndexLoanIndexerStatus reports stale seconds and health', () => {
  const now = Date.UTC(2026, 0, 1, 0, 10, 0)
  const updatedAt = new Date(Date.UTC(2026, 0, 1, 0, 8, 0)).toISOString()
  const status = computeIndexLoanIndexerStatus(updatedAt, now)

  assert.equal(status.staleSeconds, 120)
  assert.equal(status.healthy, true)
  assert.equal(status.updatedAt, updatedAt)

  const stale = computeIndexLoanIndexerStatus(new Date(Date.UTC(2026, 0, 1, 0, 0, 0)), now)
  assert.equal(stale.healthy, false)
  assert.equal(stale.staleSeconds, 600)
})
