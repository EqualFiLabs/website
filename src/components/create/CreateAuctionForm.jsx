"use client";

import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import AuctionTypeToggle from './AuctionTypeToggle'
import TimeWindowInput from './TimeWindowInput'
import TokenSelector from '../swap/TokenSelector'
import SelectTokenButton from '../swap/SelectTokenButton'
import useTokens from '@/lib/hooks/useTokens'
import usePositionNFTs from '@/lib/hooks/usePositionNFTs'

function CreateAuctionForm({ state, setField, validation, isSubmitting, successId, onSubmit, error }) {
  const { tokens } = useTokens()
  const { nfts } = usePositionNFTs()
  const [activeSelector, setActiveSelector] = useState(null)
  const [recentTokens, setRecentTokens] = useState([])

  const tokenA = useMemo(
    () => tokens.find((t) => t.address === state.poolIdA) || null,
    [tokens, state.poolIdA],
  )
  const tokenB = useMemo(
    () => tokens.find((t) => t.address === state.poolIdB) || null,
    [tokens, state.poolIdB],
  )

  const selectedAddresses = useMemo(
    () => ({
      a: tokenA?.address?.toLowerCase(),
      b: tokenB?.address?.toLowerCase(),
    }),
    [tokenA, tokenB],
  )

  const positionOptions = useMemo(() => {
    const seen = new Set()
    return (nfts || []).filter((nft) => {
      if (seen.has(nft.tokenId)) return false
      seen.add(nft.tokenId)
      return true
    })
  }, [nfts])

  const handleSelectToken = (token) => {
    if (activeSelector === 'a') setField('poolIdA', token.address)
    if (activeSelector === 'b') setField('poolIdB', token.address)
    setActiveSelector(null)
    setRecentTokens((prev) => {
      const filtered = prev.filter((t) => t.address !== token.address)
      return [token, ...filtered].slice(0, 5)
    })
  }

  const disableSubmit = !validation.valid || isSubmitting

  return (
    <div className="space-y-8">
      <AuctionTypeToggle value={state.auctionType} onChange={(value) => setField('auctionType', value)} />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral2">Token A</label>
          <SelectTokenButton currencyInfo={tokenA} onPress={() => setActiveSelector('a')} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral2">Token B</label>
          <SelectTokenButton currencyInfo={tokenB} onPress={() => setActiveSelector('b')} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral2">Reserve A</label>
          <input
            type="number"
            min="0"
            value={state.reserveA}
            onChange={(e) => setField('reserveA', e.target.value)}
            className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
            placeholder="0.0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral2">Reserve B</label>
          <input
            type="number"
            min="0"
            value={state.reserveB}
            onChange={(e) => setField('reserveB', e.target.value)}
            className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
            placeholder="0.0"
          />
        </div>
      </div>

      <TimeWindowInput
        start={state.start}
        end={state.end}
        onChange={({ start, end }) => {
          setField('start', start)
          setField('end', end)
        }}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral2">Fee (bps)</label>
          <input
            type="number"
            min="0"
            max="1000"
            value={state.feeBps}
            onChange={(e) => setField('feeBps', Number(e.target.value))}
            className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
          />
          <p className="text-xs text-neutral2">0 - 1000 bps (0% - 10%)</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral2" htmlFor="create-position-id">
            Position ID
          </label>
          <select
            id="create-position-id"
            value={state.positionId}
            onChange={(e) => setField('positionId', e.target.value)}
            className="w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-base text-neutral1 outline-none transition-colors hover:border-surface3Hovered focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
            disabled={!positionOptions.length}
          >
            <option value="">{positionOptions.length ? 'Select a Position NFT…' : 'No Position NFTs found'}</option>
            {positionOptions.map((nft) => (
              <option key={nft.tokenId} value={nft.tokenId}>
                NFT #{nft.tokenId}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className="rounded-xl bg-statusCritical2 px-spacing10 py-spacing8 text-sm text-statusCritical">{error}</div> : null}

      {successId ? (
        <div className="rounded-xl border border-accent1 bg-surface1 px-spacing12 py-spacing10 text-sm text-neutral1">
          Auction created! ID #{successId}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={disableSubmit}
        className={[
          'w-full rounded-full px-6 py-4 text-base font-semibold transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5',
          disableSubmit ? 'bg-surface3 text-neutral3 cursor-not-allowed' : 'bg-accent1 text-ink hover:bg-accent1Hovered',
        ].join(' ')}
      >
        {isSubmitting ? 'Creating…' : 'Create auction'}
      </button>

      <TokenSelector
        isOpen={Boolean(activeSelector)}
        onClose={() => setActiveSelector(null)}
        onSelectToken={handleSelectToken}
        tokens={tokens}
        otherSelectedAddress={activeSelector === 'a' ? selectedAddresses.b : selectedAddresses.a}
        recentTokens={recentTokens}
      />
    </div>
  )
}

CreateAuctionForm.propTypes = {
  state: PropTypes.object.isRequired,
  setField: PropTypes.func.isRequired,
  validation: PropTypes.shape({
    valid: PropTypes.bool.isRequired,
    issues: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  successId: PropTypes.number,
  onSubmit: PropTypes.func.isRequired,
  error: PropTypes.string,
}

CreateAuctionForm.defaultProps = {
  successId: null,
  error: '',
}

export default CreateAuctionForm
