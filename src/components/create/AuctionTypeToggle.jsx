"use client";

import PropTypes from 'prop-types'

const options = [
  { value: 'solo', label: 'Solo', description: 'Single-maker auction for one position' },
  { value: 'community', label: 'Community', description: 'Multi-maker pooled auction' },
]

function AuctionTypeToggle({ value, onChange }) {
  return (
    <div className="rounded-2xl border border-surface2 bg-surface2 p-spacing12">
      <div className="text-sm font-semibold text-neutral1">Auction Type</div>
      <div className="mt-spacing8 grid grid-cols-2 gap-spacing8">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'flex flex-col items-start rounded-2xl border px-spacing12 py-spacing10 text-left transition-colors',
              value === option.value
                ? 'border-accent1 bg-surface1 text-neutral1'
                : 'border-surface3 bg-surface2 text-neutral2 hover:text-neutral1',
            ].join(' ')}
          >
            <span className="text-sm font-semibold">{option.label}</span>
            <span className="text-xs text-neutral2">{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

AuctionTypeToggle.propTypes = {
  value: PropTypes.oneOf(['solo', 'community']).isRequired,
  onChange: PropTypes.func.isRequired,
}

export default AuctionTypeToggle
