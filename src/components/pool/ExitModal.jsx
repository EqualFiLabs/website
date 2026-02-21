"use client";

import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { formatUnits } from 'viem'

function ExitModal({ isOpen, auction, participatingPositions, onClose, onConfirm, isExiting }) {
  const [selectedTokenId, setSelectedTokenId] = useState(null)

  useEffect(() => {
    if (isOpen && participatingPositions?.length > 0) {
      setSelectedTokenId(participatingPositions[0].tokenId)
    } else if (!isOpen) {
        setSelectedTokenId(null)
    }
  }, [isOpen, participatingPositions])

  const handleConfirm = () => {
    if (selectedTokenId) {
      onConfirm(selectedTokenId)
    }
  }

  if (!isOpen || !auction) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border border-surface2 bg-surface1 p-6 shadow-card animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <h3 className="text-xl font-bold leading-6 text-neutral1 mb-2">
            Exit Community Auction #{auction.id}
        </h3>
        
        <p className="text-sm text-neutral2 mb-4">
            Select the Position NFT you want to withdraw liquidity from. Fees will be settled upon exit.
        </p>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 mb-6 pr-2">
            {participatingPositions?.map((pos) => {
                const isSelected = pos.tokenId === selectedTokenId
                return (
                <div 
                    key={pos.tokenId}
                    onClick={() => !isExiting && setSelectedTokenId(pos.tokenId)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        isSelected 
                            ? 'border-accent1 bg-accent1/5' 
                            : 'border-surface3 bg-surface2 hover:border-neutral3'
                    } ${isExiting ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral1">Position #{pos.tokenId}</span>
                        {isSelected && <div className="h-3 w-3 rounded-full bg-accent1 shadow-[0_0_8px_rgba(20,241,149,0.5)]" />}
                    </div>
                    <div className="mt-2 text-xs text-neutral2 space-y-1 font-mono">
                        <div className="flex justify-between">
                            <span>Share:</span>
                            <span className="text-neutral1">{(Number(formatUnits(pos.share, 18))).toFixed(6)}</span>
                        </div>
                        {(pos.feesA > BigInt(0) || pos.feesB > BigInt(0)) && (
                            <div className="flex justify-between text-accent1">
                                <span>Unclaimed Fees:</span>
                                <span>
                                    {pos.feesA > BigInt(0) && `${formatUnits(pos.feesA, auction.decimalsA)} ${auction.tokenA}`}
                                    {pos.feesA > BigInt(0) && pos.feesB > BigInt(0) && ' + '}
                                    {pos.feesB > BigInt(0) && `${formatUnits(pos.feesB, auction.decimalsB)} ${auction.tokenB}`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                )
            })}
        </div>

        <div className="flex justify-end gap-3 mt-auto">
            <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-bold text-neutral2 hover:text-neutral1 transition-colors"
            onClick={onClose}
            disabled={isExiting}
            >
            Cancel
            </button>
            <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-statusCritical px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleConfirm}
            disabled={!selectedTokenId || isExiting}
            >
            {isExiting ? (
                <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Exiting...
                </>
            ) : (
                'Confirm Exit'
            )}
            </button>
        </div>
      </div>
    </div>
  )
}

ExitModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  auction: PropTypes.object,
  participatingPositions: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  isExiting: PropTypes.bool.isRequired,
}

export default ExitModal