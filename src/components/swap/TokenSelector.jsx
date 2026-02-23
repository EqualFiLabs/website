"use client";

import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { formatUnits } from 'viem'
import { filterTokens } from '@/lib/hooks/useTokens'
import { ZERO_ADDRESS } from '@/lib/address'

const networkOptions = ['Foundry', 'Base Sepolia', 'Sepolia']

function TokenRow({ token, onSelect, disabled, highlight }) {
  const balanceDisplay =
    token.balance !== undefined && token.balance !== null
      ? formatUnits(token.balance, token.decimals)
      : '0'
  const usdDisplay = token.usdValue ? `$${token.usdValue}` : ''

  return (
    <button
      type="button"
      data-testid={`token-row-${token.address.toLowerCase()}`}
      onClick={() => {
        if (!disabled) onSelect(token)
      }}
      disabled={disabled}
      className={[
        'flex w-full items-center justify-between rounded-2xl px-spacing12 py-spacing12 text-left transition-colors min-h-[44px]',
        highlight ? 'bg-surface2' : 'bg-transparent hover:bg-surface2/70',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-spacing12">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface2 text-sm font-semibold text-accent1">
          {token.symbol?.slice(0, 3)?.toUpperCase() || '?'}
        </span>
        <div>
          <div className="font-semibold text-neutral1">{token.symbol || 'Unknown'}</div>
          <div className="text-xs text-neutral2">{token.name}</div>
        </div>
      </div>
      <div className="text-right text-sm font-semibold text-neutral1">
        <div>{balanceDisplay}</div>
        <div className="text-xs text-neutral2">{usdDisplay}</div>
      </div>
    </button>
  )
}

TokenRow.propTypes = {
  token: PropTypes.shape({
    address: PropTypes.string.isRequired,
    symbol: PropTypes.string,
    name: PropTypes.string,
    decimals: PropTypes.number.isRequired,
    balance: PropTypes.bigint,
    usdValue: PropTypes.string,
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  highlight: PropTypes.bool,
}

TokenRow.defaultProps = {
  disabled: false,
  highlight: false,
}

function TokenSection({ title, tokens, onSelectToken, otherSelectedAddress }) {
  if (!tokens.length) return null
  return (
    <div className="space-y-spacing6">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral3">{title}</div>
      <div className="space-y-spacing6">
        {tokens.map((token) => (
          <TokenRow
            key={token.address}
            token={token}
            onSelect={onSelectToken}
            disabled={otherSelectedAddress?.toLowerCase() === token.address.toLowerCase()}
            highlight={false}
          />
        ))}
      </div>
    </div>
  )
}

TokenSection.propTypes = {
  title: PropTypes.string.isRequired,
  tokens: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSelectToken: PropTypes.func.isRequired,
  otherSelectedAddress: PropTypes.string,
}

TokenSection.defaultProps = {
  otherSelectedAddress: undefined,
}

function TokenSelector({
  isOpen,
  onClose,
  onSelectToken,
  tokens,
  otherSelectedAddress,
  recentTokens,
}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [network, setNetwork] = useState(networkOptions[0])

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(handler)
  }, [query])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setDebouncedQuery('')
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const filteredTokens = useMemo(
    () => filterTokens(tokens, debouncedQuery),
    [tokens, debouncedQuery],
  )
  const filteredRecentTokens = useMemo(
    () => filterTokens(recentTokens, debouncedQuery),
    [recentTokens, debouncedQuery],
  )

  const yourTokens = useMemo(
    () => filteredTokens.filter((token) => token.balance && token.balance > BigInt(0)),
    [filteredTokens],
  )
  const nativeToken = filteredTokens.find(
    (token) => token.address?.toLowerCase?.() === ZERO_ADDRESS,
  )
  const popularBase = filteredTokens.filter(
    (token) => token.address?.toLowerCase?.() !== ZERO_ADDRESS,
  )
  const popularTokens = (nativeToken ? [nativeToken, ...popularBase] : popularBase).slice(0, 5)

  const handlePaste = async () => {
    if (navigator?.clipboard?.readText) {
      const text = await navigator.clipboard.readText()
      setQuery(text)
    }
  }

  if (!isOpen) return null

  return (
    <div
      data-testid="token-selector-overlay"
      className="fixed inset-0 z-30 flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center"
    >
      <div
        data-testid="token-selector-panel"
        className="relative flex h-full w-full flex-col overflow-hidden rounded-none bg-surface1 shadow-card sm:h-auto sm:max-h-[80vh] sm:max-w-[480px] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-surface2 px-spacing16 py-spacing12">
          <div>
            <div className="text-sm font-semibold text-neutral1">Select a token</div>
            <div className="text-xs text-neutral3">{network}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full bg-surface2 px-spacing12 py-spacing6 text-xs font-semibold text-neutral2 hover:text-neutral1"
          >
            Close
          </button>
        </div>

        <div className="space-y-spacing12 px-spacing16 py-spacing12">
          <div className="flex flex-wrap items-center gap-spacing8 sm:flex-nowrap">
            <div className="flex w-full items-center rounded-full bg-surface2 px-spacing12 py-spacing8 focus-within:ring-2 focus-within:ring-accent1 min-h-[44px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-neutral2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1012 19.5a7.5 7.5 0 004.65-2.85z" />
              </svg>
              <input
                type="text"
                placeholder="Search name, symbol, address"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ml-spacing8 w-full bg-transparent text-sm text-neutral1 outline-none placeholder:text-neutral3"
              />
            </div>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="min-h-[44px] rounded-2xl border border-surface3 bg-surface2 px-spacing12 py-spacing8 text-xs font-semibold text-neutral1"
            >
              {networkOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePaste}
              className="min-h-[44px] rounded-2xl border border-surface3 bg-surface2 px-spacing12 py-spacing8 text-xs font-semibold text-neutral1 transition-colors hover:border-accent1"
            >
              Paste
            </button>
          </div>

          <div className="grid max-h-[60vh] gap-spacing12 overflow-y-auto pb-spacing12">
            <TokenSection
              title="Recent"
              tokens={filteredRecentTokens}
              onSelectToken={onSelectToken}
              otherSelectedAddress={otherSelectedAddress}
            />
            <TokenSection
              title="Popular"
              tokens={popularTokens}
              onSelectToken={onSelectToken}
              otherSelectedAddress={otherSelectedAddress}
            />
            <TokenSection
              title="Your tokens"
              tokens={yourTokens}
              onSelectToken={onSelectToken}
              otherSelectedAddress={otherSelectedAddress}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

TokenSelector.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelectToken: PropTypes.func.isRequired,
  tokens: PropTypes.arrayOf(PropTypes.object),
  otherSelectedAddress: PropTypes.string,
  recentTokens: PropTypes.arrayOf(PropTypes.object),
}

TokenSelector.defaultProps = {
  tokens: [],
  otherSelectedAddress: undefined,
  recentTokens: [],
}

export default TokenSelector
