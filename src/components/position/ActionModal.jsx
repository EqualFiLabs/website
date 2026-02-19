"use client";

import PropTypes from 'prop-types'

function ActionModal({
  open,
  title,
  amount,
  onAmountChange,
  onClose,
  onConfirm,
  actionLabel,
  loading,
  pool,
  poolOptions,
  onPoolChange,
  nfts,
  selectedTokenId,
  onTokenChange,
}) {
  if (!open) return null

  const hasNfts = Array.isArray(nfts) && nfts.length > 0
  const selectedValue = selectedTokenId === null || selectedTokenId === undefined ? '' : String(selectedTokenId)
  const requiresToken = hasNfts
  const hasTokenSelected = !requiresToken || selectedValue !== ''
  const amountValid = Boolean(amount) && Number(amount) > 0
  const disableSubmit = loading || !amountValid || !hasTokenSelected

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div className="text-xl font-bold text-neutral1">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-neutral2 transition-colors hover:bg-surface3 hover:text-neutral1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="space-y-6">
          {hasNfts && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral2" htmlFor="position-token">
                Position NFT
              </label>
              <div className="relative">
                <select
                  id="position-token"
                  value={selectedValue}
                  onChange={(e) => onTokenChange?.(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                >
                  <option value="">Select an NFT…</option>
                  {nfts.map((nft) => (
                    <option key={nft.tokenId} value={String(nft.tokenId)}>
                      NFT #{nft.tokenId}
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
            <label className="text-sm font-medium text-neutral2" htmlFor="action-pool">
              Pool
            </label>
            <div className="relative">
              <select
                id="action-pool"
                value={pool}
                onChange={(e) => onPoolChange(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
              >
                {poolOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral2" htmlFor="action-amount">
              Amount
            </label>
            <input
              id="action-amount"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
              placeholder="0.00"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={disableSubmit}
          className={[
            'mt-8 w-full rounded-full px-6 py-4 text-base font-semibold transition-all shadow-lg',
            disableSubmit ? 'bg-surface3 text-neutral3 shadow-none' : 'bg-accent1 text-ink hover:bg-accent1Hovered hover:shadow-xl hover:-translate-y-0.5',
          ].join(' ')}
        >
          {loading ? 'Submitting…' : actionLabel}
        </button>
      </div>
    </div>
  )
}

ActionModal.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  amount: PropTypes.string.isRequired,
  onAmountChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  actionLabel: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  pool: PropTypes.string.isRequired,
  poolOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onPoolChange: PropTypes.func.isRequired,
  nfts: PropTypes.arrayOf(PropTypes.object),
  selectedTokenId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onTokenChange: PropTypes.func,
}

ActionModal.defaultProps = {
  loading: false,
  nfts: null,
  selectedTokenId: null,
  onTokenChange: null,
}

export default ActionModal
