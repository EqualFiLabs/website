"use client";

import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'

function RepayModal({ isOpen, onClose, lending }) {
  const [mode, setMode] = useState('rolling')
  const [fixedId, setFixedId] = useState(null)
  const [amount, setAmount] = useState('')

  const rollingBalance = lending?.rollingLoan.balance ?? 0
  const fixedLoans = lending?.fixedLoans ?? []

  const selectedFixed = useMemo(
    () => fixedLoans.find((loan) => loan.id === fixedId) || fixedLoans[0],
    [fixedLoans, fixedId],
  )
  const fixedLimit =
    selectedFixed && Number.isFinite(selectedFixed.principal) ? selectedFixed.principal : Number.POSITIVE_INFINITY

  const validAmount =
    amount &&
    Number(amount) > 0 &&
    (mode === 'rolling'
      ? Number(amount) <= rollingBalance
      : selectedFixed
        ? Number(amount) <= fixedLimit
        : false)

  const submit = async () => {
    if (!validAmount) return
    if (mode === 'rolling') {
      await lending.actions.repayRolling(Number(amount))
    } else if (selectedFixed) {
      await lending.actions.repayFixed(selectedFixed.id, Number(amount))
    }
    setAmount('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-surface2 bg-surface1 p-spacing16 shadow-card">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-neutral1">Repay</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface2 px-spacing10 py-spacing6 text-xs font-semibold text-neutral2 hover:text-neutral1"
          >
            Close
          </button>
        </div>

        <div className="mt-spacing12 space-y-spacing10">
          <div className="flex gap-spacing8">
            <button
              type="button"
              onClick={() => setMode('rolling')}
              className={[
                'flex-1 rounded-full px-spacing12 py-spacing8 text-sm font-semibold',
                mode === 'rolling' ? 'bg-surface2 text-neutral1' : 'bg-surface1 text-neutral2',
              ].join(' ')}
            >
              Rolling
            </button>
            <button
              type="button"
              onClick={() => setMode('fixed')}
              className={[
                'flex-1 rounded-full px-spacing12 py-spacing8 text-sm font-semibold',
                mode === 'fixed' ? 'bg-surface2 text-neutral1' : 'bg-surface1 text-neutral2',
              ].join(' ')}
            >
              Fixed-Term
            </button>
          </div>

          {mode === 'rolling' ? (
            <div className="text-xs text-neutral2">Rolling balance: {rollingBalance.toFixed(2)}</div>
          ) : (
            <div className="space-y-spacing4">
              <label className="text-xs text-neutral2" htmlFor="fixed-select">
                Select loan
              </label>
              <select
                id="fixed-select"
                value={selectedFixed?.id || ''}
                onChange={(e) => setFixedId(Number(e.target.value))}
                className="w-full rounded-xl border border-surface3 bg-surface2 px-spacing12 py-spacing10 text-sm text-neutral1 outline-none focus:ring-2 focus:ring-accent1"
              >
                {fixedLoans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    Loan #{loan.id} — Principal {Number.isFinite(loan.principal) ? loan.principal : '—'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-spacing4">
            <label className="text-xs text-neutral2" htmlFor="repay-amount">
              Amount
            </label>
            <input
              id="repay-amount"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-surface3 bg-surface2 px-spacing12 py-spacing10 text-sm text-neutral1 outline-none focus:ring-2 focus:ring-accent1"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!validAmount}
          className={[
            'mt-spacing12 w-full rounded-full px-spacing12 py-spacing12 text-sm font-semibold transition-colors',
            validAmount ? 'bg-accent1 text-ink hover:bg-accent1Hovered' : 'bg-surface3 text-neutral3',
          ].join(' ')}
        >
          Repay
        </button>
      </div>
    </div>
  )
}

RepayModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  lending: PropTypes.shape({
    rollingLoan: PropTypes.object.isRequired,
    fixedLoans: PropTypes.arrayOf(PropTypes.object).isRequired,
    actions: PropTypes.object.isRequired,
  }),
}

RepayModal.defaultProps = {
  lending: null,
}

export default RepayModal
