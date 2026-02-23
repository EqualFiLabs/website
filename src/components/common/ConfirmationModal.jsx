"use client";

import PropTypes from 'prop-types'

function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  isConfirming = false,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-neutral1 mb-2">{title}</h3>
          <p className="text-neutral2 text-sm leading-relaxed">{description}</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-surface3 bg-transparent px-4 py-3 text-base font-semibold text-neutral2 transition-colors hover:border-neutral2 hover:text-neutral1"
            disabled={isConfirming}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 rounded-full bg-red-500/10 border border-red-500/50 px-4 py-3 text-base font-semibold text-red-400 transition-all hover:bg-red-500/20 hover:border-red-500 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirming ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.node.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isConfirming: PropTypes.bool,
}

export default ConfirmationModal
