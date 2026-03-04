import assert from 'node:assert/strict'
import test from 'node:test'

import {
  indexerStatusLabel,
  mergeActiveIndexLoans,
  normalizeIndexLoanRow,
  removeRecentIndexLoan,
  upsertRecentIndexLoan,
} from '../src/lib/indexLoanFeed.js'

test('normalizeIndexLoanRow handles snake_case payloads', () => {
  const normalized = normalizeIndexLoanRow({
    loan_id: '7',
    index_id: '3',
    position_key: '0xABC',
    borrow_asset: '0xDEf',
    collateral_units: '1000000000000000000',
    principal: '5000000',
    maturity: '12345',
    active: true,
    recovered: false,
  })

  assert.equal(normalized.loanId, 7n)
  assert.equal(normalized.indexId, 3n)
  assert.equal(normalized.positionKey, '0xabc')
  assert.equal(normalized.borrowAsset, '0xdef')
  assert.equal(normalized.collateralUnits, 1_000_000_000_000_000_000n)
  assert.equal(normalized.principal, 5_000_000n)
  assert.equal(normalized.maturity, 12_345n)
  assert.equal(normalized.active, true)
  assert.equal(normalized.recovered, false)
})

test('mergeActiveIndexLoans keeps active unique loans and lets indexer override local', () => {
  const recent = [
    {
      loanId: 11n,
      principal: 10n,
      active: true,
      recovered: false,
    },
  ]
  const indexer = [
    {
      loanId: 11n,
      principal: 12n,
      active: true,
      recovered: false,
    },
    {
      loanId: 10n,
      principal: 1n,
      active: false,
      recovered: false,
    },
  ]

  const merged = mergeActiveIndexLoans(indexer, recent)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].loanId, 11n)
  assert.equal(merged[0].principal, 12n)
})

test('upsertRecentIndexLoan and removeRecentIndexLoan maintain recent list', () => {
  let list: Array<{ loanId: bigint; principal?: bigint; active: boolean; recovered: boolean }> = []

  list = upsertRecentIndexLoan(list, { loanId: 1n, active: true, recovered: false })
  list = upsertRecentIndexLoan(list, { loanId: 2n, active: true, recovered: false })
  list = upsertRecentIndexLoan(list, { loanId: 1n, principal: 9n, active: true, recovered: false })
  assert.deepEqual(
    list.map((loan) => loan.loanId),
    [1n, 2n],
  )
  assert.equal(list[0].principal, 9n)

  list = upsertRecentIndexLoan(list, { loanId: 1n, active: false, recovered: false })
  assert.deepEqual(
    list.map((loan) => loan.loanId),
    [2n],
  )

  list = removeRecentIndexLoan(list, 2n)
  assert.equal(list.length, 0)
})

test('indexerStatusLabel reflects availability and lag', () => {
  assert.equal(indexerStatusLabel(null), 'Indexer offline (local recent loans only)')
  assert.equal(indexerStatusLabel({ available: false }), 'Indexer offline (local recent loans only)')
  assert.equal(indexerStatusLabel({ available: true, staleSeconds: 10 }), 'Indexer synced')
  assert.equal(indexerStatusLabel({ available: true, staleSeconds: 500 }), 'Indexer lagging (8m)')
})
