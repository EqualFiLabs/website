"use client";

import PropTypes from 'prop-types'
import { useState } from 'react'

const terms = [30, 90, 180, 365]

function BorrowModal({ isOpen, onClose, lending }) {
  const [mode, setMode] = useState('rolling')
  const [amount, setAmount] = useState('')
  const [termIndex, setTermIndex] = useState(0)
  const headroom = lending?.maxBorrowable ?? 0

  const validAmount =
    amount && Number(amount) > 0 && Number(amount) <= (mode === 'rolling' ? headroom : Number.MAX_SAFE_INTEGER)

  const submit = async () => {
    if (!validAmount) return
    if (mode === 'rolling') {
      await lending.actions.borrowRolling(Number(amount))
    } else {
      await lending.actions.borrowFixed(termIndex, Number(amount))
    }
    setAmount('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div className="text-xl font-bold text-neutral1">Borrow</div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-neutral2 transition-colors hover:bg-surface3 hover:text-neutral1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="mb-6 flex rounded-xl bg-surface2 p-1">
          <button
            type="button"
            onClick={() => setMode('rolling')}
            className={[
              'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
              mode === 'rolling' ? 'bg-surface1 text-neutral1 shadow-sm' : 'text-neutral2 hover:text-neutral1',
            ].join(' ')}
          >
            Rolling Credit
          </button>
          <button
            type="button"
            onClick={() => setMode('fixed')}
            className={[
              'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
              mode === 'fixed' ? 'bg-surface1 text-neutral1 shadow-sm' : 'text-neutral2 hover:text-neutral1',
            ].join(' ')}
          >
            Fixed-Term
          </button>
        </div>

        <div className="space-y-6">
          {mode === 'fixed' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral2" htmlFor="term">
                Term
              </label>
              <div className="relative">
                <select
                  id="term"
                  value={terms[termIndex]}
                  onChange={(e) => setTermIndex(terms.indexOf(Number(e.target.value)))}
                  className="w-full appearance-none rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                >
                  {terms.map((t, idx) => (
                    <option key={`${t}-${idx}`} value={t}>
                      {t} days
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral2" htmlFor="borrow-amount">
                Amount
              </label>
              {mode === 'rolling' && (
                <span className="text-xs text-neutral3">
                  Available: <span className="font-mono text-neutral1">{headroom.toFixed(4)}</span>
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="borrow-amount"
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                placeholder="0.00"
              />
              {mode === 'rolling' && (
                <button
                  type="button"
                  onClick={() => setAmount(headroom.toString())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-surface3 px-2 py-1 text-xs font-bold text-neutral1 hover:bg-accent1/10 hover:text-accent1"
                >
                  MAX
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!validAmount}
          className={[
            'mt-8 w-full rounded-full px-6 py-4 text-base font-semibold transition-all shadow-lg',
            validAmount ? 'bg-accent1 text-ink hover:bg-accent1Hovered hover:shadow-xl hover:-translate-y-0.5' : 'bg-surface3 text-neutral3 shadow-none',
          ].join(' ')}
        >
          Borrow {mode === 'rolling' ? 'Rolling' : 'Fixed'}
        </button>
      </div>
    </div>
  )
}

BorrowModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  lending: PropTypes.shape({
    maxBorrowable: PropTypes.number.isRequired,
    actions: PropTypes.object.isRequired,
  }),
}

BorrowModal.defaultProps = {
  lending: null,
}

export default BorrowModal
