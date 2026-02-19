"use client";

import { useEffect } from 'react'
import PropTypes from 'prop-types'

const normalizeAddress = (value) => (value ? value.toLowerCase() : '')

function CreateIndexModal({
  open,
  onClose,
  name,
  symbol,
  flashFeeBps,
  creationFeeEth,
  assetRows,
  assetMeta,
  onNameChange,
  onSymbolChange,
  onFlashFeeChange,
  onCreationFeeChange,
  onAddAssetRow,
  onRemoveAssetRow,
  onUpdateAssetRow,
  onConfirm,
  loading,
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const canCreate = assetRows.some((row) => row.assetAddress?.trim().length)

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:px-4 pointer-events-auto">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-none border-white/10 bg-[#0b1021] shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-3xl sm:border">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-start justify-between border-b border-white/10 p-4 sm:p-6 sm:pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foam/60">EqualIndex</p>
            <h2 className="text-xl sm:text-2xl font-semibold text-foam">Create New Index</h2>
            <p className="mt-1 text-sm text-slate-300">
              Define bundle assets, per-asset fees, and index metadata.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-mint hover:text-mint transition-colors"
          >
            Close
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-4 sm:px-6 sm:pb-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foam" htmlFor="create-index-name">
                Name
              </label>
              <input
                id="create-index-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                placeholder="EqualIndex Ether Blend"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foam" htmlFor="create-index-symbol">
                Symbol
              </label>
              <input
                id="create-index-symbol"
                value={symbol}
                onChange={(e) => onSymbolChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                placeholder="EQX"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foam" htmlFor="create-index-flash">
                Flash Fee (bps)
              </label>
              <input
                id="create-index-flash"
                type="number"
                min="0"
                max="1000"
                value={flashFeeBps}
                onChange={(e) => onFlashFeeChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foam" htmlFor="create-index-fee">
                Creation Fee (ETH)
              </label>
              <input
                id="create-index-fee"
                type="number"
                min="0"
                value={creationFeeEth}
                onChange={(e) => onCreationFeeChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                placeholder="0.0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foam mb-3">Token Addresses</label>
            <div className="space-y-3">
              {assetRows.map((row, index) => {
                const meta = assetMeta.get(normalizeAddress(row.assetAddress))
                return (
                  <div key={row.id} className="rounded-2xl border border-white/10 bg-ink/50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={row.assetAddress}
                        onChange={(e) => onUpdateAssetRow(row.id, { assetAddress: e.target.value })}
                        placeholder="0x0000..."
                        className="flex-1 rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                      />
                      {assetRows.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => onRemoveAssetRow(row.id)}
                          className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-red-400/70 hover:text-red-300 transition-colors"
                        >
                          Remove
                        </button>
                      ) : null}
                      {index === assetRows.length - 1 ? (
                        <button
                          type="button"
                          onClick={onAddAssetRow}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-mint/40 text-lg font-bold text-mint hover:-translate-y-0.5 hover:border-mint hover:bg-mint/10 transition-all"
                        >
                          +
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      {meta
                        ? `Detected: ${meta.ticker || meta.id || 'Token'} | ${meta.decimals ?? '--'} decimals`
                        : 'Unknown asset. Provide decimals if not 18.'}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1">
                        <label
                          className="text-[11px] uppercase tracking-[0.2em] text-slate-400"
                          htmlFor={`${row.id}-bundle`}
                        >
                          Bundle Amount
                        </label>
                        <input
                          id={`${row.id}-bundle`}
                          value={row.bundleAmount}
                          onChange={(e) => onUpdateAssetRow(row.id, { bundleAmount: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                          placeholder="0.0"
                        />
                      </div>
                      <div className="space-y-1">
                        <label
                          className="text-[11px] uppercase tracking-[0.2em] text-slate-400"
                          htmlFor={`${row.id}-decimals`}
                        >
                          Decimals
                        </label>
                        <input
                          id={`${row.id}-decimals`}
                          type="number"
                          min="0"
                          max="36"
                          value={row.decimals}
                          onChange={(e) => onUpdateAssetRow(row.id, { decimals: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                          placeholder={meta?.decimals !== undefined ? String(meta.decimals) : '18'}
                        />
                      </div>
                      <div className="space-y-1">
                        <label
                          className="text-[11px] uppercase tracking-[0.2em] text-slate-400"
                          htmlFor={`${row.id}-mint-fee`}
                        >
                          Mint Fee (bps)
                        </label>
                        <input
                          id={`${row.id}-mint-fee`}
                          type="number"
                          min="0"
                          max="1000"
                          value={row.mintFeeBps}
                          onChange={(e) => onUpdateAssetRow(row.id, { mintFeeBps: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <label
                          className="text-[11px] uppercase tracking-[0.2em] text-slate-400"
                          htmlFor={`${row.id}-burn-fee`}
                        >
                          Burn Fee (bps)
                        </label>
                        <input
                          id={`${row.id}-burn-fee`}
                          type="number"
                          min="0"
                          max="1000"
                          value={row.burnFeeBps}
                          onChange={(e) => onUpdateAssetRow(row.id, { burnFeeBps: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-sm text-foam outline-none ring-mint/60 focus:border-mint focus:ring-2"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t border-white/10 p-4 sm:px-6 sm:py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canCreate || loading}
              className="flex-1 min-h-[44px] rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
              )}
              {loading ? 'Creating…' : 'Create Index'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-foam transition hover:-translate-y-0.5 hover:border-mint hover:text-mint"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

CreateIndexModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  symbol: PropTypes.string.isRequired,
  flashFeeBps: PropTypes.string.isRequired,
  creationFeeEth: PropTypes.string.isRequired,
  assetRows: PropTypes.arrayOf(PropTypes.object).isRequired,
  assetMeta: PropTypes.instanceOf(Map).isRequired,
  onNameChange: PropTypes.func.isRequired,
  onSymbolChange: PropTypes.func.isRequired,
  onFlashFeeChange: PropTypes.func.isRequired,
  onCreationFeeChange: PropTypes.func.isRequired,
  onAddAssetRow: PropTypes.func.isRequired,
  onRemoveAssetRow: PropTypes.func.isRequired,
  onUpdateAssetRow: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
}

CreateIndexModal.defaultProps = {
  loading: false,
}

export default CreateIndexModal
