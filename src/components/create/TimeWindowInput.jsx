"use client";

import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

const DURATION_OPTIONS = [30, 90, 120, 365]
const DELAY_OPTIONS = [0, 1, 3, 7]

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)

const daysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return null
  const diff = endDate.getTime() - startDate.getTime()
  return Math.round(diff / (24 * 60 * 60 * 1000))
}

function TimeWindowInput({ start, end, onChange }) {
  const [durationIndex, setDurationIndex] = useState(0)
  const [delayIndex, setDelayIndex] = useState(0)

  const selectedDuration = DURATION_OPTIONS[durationIndex]
  const selectedDelay = DELAY_OPTIONS[delayIndex]

  const derivedDurationIndex = useMemo(() => {
    const days = daysBetween(start, end)
    const match = DURATION_OPTIONS.indexOf(days)
    return match >= 0 ? match : null
  }, [start, end])

  const derivedDelayIndex = useMemo(() => {
    if (!start) return null
    const now = new Date()
    const delayDays = Math.max(0, Math.round((start.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    const match = DELAY_OPTIONS.indexOf(delayDays)
    return match >= 0 ? match : null
  }, [start])

  useEffect(() => {
    if (!start || !end) {
      const now = new Date()
      const nextStart = addDays(now, DELAY_OPTIONS[delayIndex])
      const nextEnd = addDays(nextStart, DURATION_OPTIONS[durationIndex])
      onChange({ start: nextStart, end: nextEnd })
    }
  }, [start, end, onChange, durationIndex, delayIndex])

  useEffect(() => {
    if (derivedDurationIndex !== null && derivedDurationIndex !== durationIndex) {
      setDurationIndex(derivedDurationIndex)
    }
  }, [derivedDurationIndex, durationIndex])

  useEffect(() => {
    if (derivedDelayIndex !== null && derivedDelayIndex !== delayIndex) {
      setDelayIndex(derivedDelayIndex)
    }
  }, [derivedDelayIndex, delayIndex])

  const updateWindow = (nextDurationIndex, nextDelayIndex) => {
    const now = new Date()
    const nextStart = addDays(now, DELAY_OPTIONS[nextDelayIndex])
    const nextEnd = addDays(nextStart, DURATION_OPTIONS[nextDurationIndex])
    onChange({ start: nextStart, end: nextEnd })
  }

  return (
    <div className="rounded-2xl border border-surface3 bg-surface2/50 p-6">
      <div className="text-sm font-medium text-neutral1">Time Window</div>

      <div className="mt-6 space-y-6">
        <div>
          <div className="flex items-center justify-between text-sm text-neutral2">
            <span>Duration</span>
            <span className="font-semibold text-neutral1">{selectedDuration} days</span>
          </div>
          <input
            type="range"
            min="0"
            max={DURATION_OPTIONS.length - 1}
            step="1"
            aria-label="Duration"
            value={durationIndex}
            onChange={(e) => {
              const nextIndex = Number(e.target.value)
              setDurationIndex(nextIndex)
              updateWindow(nextIndex, delayIndex)
            }}
            className="mt-4 w-full accent-accent1"
          />
          <div className="mt-2 flex justify-between text-xs font-semibold text-neutral3">
            {DURATION_OPTIONS.map((option) => (
              <span key={option}>{option}d</span>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm text-neutral2">
            <span>Delay</span>
            <span className="font-semibold text-neutral1">
              {selectedDelay === 0 ? 'No delay' : `${selectedDelay} day${selectedDelay > 1 ? 's' : ''}`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={DELAY_OPTIONS.length - 1}
            step="1"
            aria-label="Delay"
            value={delayIndex}
            onChange={(e) => {
              const nextIndex = Number(e.target.value)
              setDelayIndex(nextIndex)
              updateWindow(durationIndex, nextIndex)
            }}
            className="mt-4 w-full accent-accent1"
          />
          <div className="mt-2 flex justify-between text-xs font-semibold text-neutral3">
            {DELAY_OPTIONS.map((option) => (
              <span key={option}>{option === 0 ? 'None' : `${option}d`}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

TimeWindowInput.propTypes = {
  start: PropTypes.instanceOf(Date),
  end: PropTypes.instanceOf(Date),
  onChange: PropTypes.func.isRequired,
}

TimeWindowInput.defaultProps = {
  start: null,
  end: null,
}

export default TimeWindowInput
