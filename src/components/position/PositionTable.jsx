"use client";

import PropTypes from 'prop-types'
import { useToasts } from '../common/ToastProvider'

function PositionTable({ positions, onSelect }) {
  const { addToast } = useToasts()

  const copyKey = (key) => {
    navigator.clipboard.writeText(key)
    addToast({ title: 'Copied position key', description: key, type: 'success' })
  }

  return (
    <div className="rounded-2xl border border-surface2 bg-surface1 p-spacing12 shadow-card">
      <div className="mb-spacing8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral3">Position NFTs</p>
          <h2 className="text-lg font-semibold text-neutral1">Your Position NFTs</h2>
          <p className="text-xs text-neutral2">Select an NFT to view its pools and lending actions.</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-surface2">
        <div className="grid grid-cols-6 bg-surface2 px-spacing12 py-spacing8 text-xs font-semibold uppercase tracking-wide text-neutral2">
          <span>ID</span>
          <span>Key</span>
          <span>Pools</span>
          <span>Principal</span>
          <span>Liabilities</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-surface2">
          {positions.map((p) => (
            <div
              key={p.tokenId}
              className="grid grid-cols-6 items-center px-spacing12 py-spacing10 text-sm text-neutral1 hover:bg-surface2/70"
            >
              <span className="font-semibold">#{p.tokenId}</span>
              <span className="truncate text-neutral2">{p.positionKey}</span>
              <span className="text-neutral2">{p.pools}</span>
              <span className="text-neutral1">{p.stats?.principal ?? '—'}</span>
              <span className="text-neutral1">{p.stats?.liabilities ?? '—'}</span>
              <div className="flex items-center justify-end gap-spacing6">
                <button
                  type="button"
                  onClick={() => copyKey(p.positionKey)}
                  className="rounded-full bg-surface1 px-spacing10 py-spacing6 text-xs font-semibold text-neutral2 hover:text-neutral1"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(p.tokenId)}
                  className="rounded-full bg-accent1 px-spacing12 py-spacing8 text-xs font-semibold text-ink hover:bg-accent1Hovered"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

PositionTable.propTypes = {
  positions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSelect: PropTypes.func.isRequired,
}

export default PositionTable
