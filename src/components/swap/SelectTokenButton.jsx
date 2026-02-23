"use client";

import PropTypes from 'prop-types'

function TokenBadge({ symbol }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface2 text-xs font-semibold text-accent1 shadow-inner">
      {symbol?.slice(0, 3)?.toUpperCase() || '?'}
    </span>
  )
}

function SelectTokenButton({ currencyInfo, onPress, disabled }) {
  const hasToken = Boolean(currencyInfo?.symbol)

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={[
        'flex shrink-0 items-center gap-spacing8 rounded-full border px-spacing12 py-spacing8 transition-colors shadow-sm min-h-[44px]',
        hasToken
          ? 'border-surface3 bg-surface1 text-neutral1 hover:border-accent1'
          : 'border-transparent bg-accent1 text-ink hover:bg-accent1Hovered',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      {hasToken ? <TokenBadge symbol={currencyInfo.symbol} /> : null}
      <span className="whitespace-nowrap text-sm font-semibold">
        {hasToken ? currencyInfo.symbol : 'Select token'}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-neutral2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

SelectTokenButton.propTypes = {
  currencyInfo: PropTypes.shape({
    symbol: PropTypes.string,
  }),
  onPress: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

SelectTokenButton.defaultProps = {
  currencyInfo: null,
  disabled: false,
}

export default SelectTokenButton
