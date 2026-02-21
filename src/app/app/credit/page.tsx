"use client";
import type { PoolConfig, Auction, PositionNFT, TokenInfo, ParticipatingPosition } from '@/types'

import { useEffect, useMemo, useState } from 'react'
import { erc20Abi, formatUnits, parseUnits, maxUint256 } from 'viem'
import { useAccount, useWriteContract } from 'wagmi'
import useActivePublicClient from '@/lib/hooks/useActivePublicClient'
import { useToasts } from '@/components/common/ToastProvider'
import usePositionNFTs from '@/lib/hooks/usePositionNFTs'
import { lendingFacetAbi } from '@/lib/abis/positionNFT'
import { ZERO_ADDRESS } from '@/lib/address'
import { AppShell } from '../../app-shell'

const FIXED_TERMS = [30, 90, 180, 365]

const formatDisplay = (value: any, maxFraction = 4) => {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString(undefined, {
    maximumFractionDigits: maxFraction,
    minimumFractionDigits: 0,
  })
}

function CreditPage() {
  const { addToast } = useToasts()
  const publicClient = useActivePublicClient()
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { nfts, loading, error, poolMeta, refetch } = usePositionNFTs()

  const [selectedPositionKey, setSelectedPositionKey] = useState<string>('')
  const [rollingBorrowAmount, setRollingBorrowAmount] = useState<string>('')
  const [rollingPaymentAmount, setRollingPaymentAmount] = useState<string>('')
  const [fixedBorrowAmount, setFixedBorrowAmount] = useState<string>('')
  const [fixedRepayAmount, setFixedRepayAmount] = useState<string>('')
  const [fixedTermIndex, setFixedTermIndex] = useState<number>(0)
  const [selectedFixedLoanId, setSelectedFixedLoanId] = useState<string>('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const sortedPositions: any[] = useMemo(() => {
    return [...(nfts ?? [])].sort((a: any, b: any) => {
      const tokenDiff = Number(a.tokenId) - Number(b.tokenId)
      if (tokenDiff !== 0) return tokenDiff
      return a.poolName.localeCompare(b.poolName)
    })
  }, [nfts])

  useEffect(() => {
    if (!selectedPositionKey && sortedPositions.length > 0) {
      setSelectedPositionKey(sortedPositions[0].positionKey)
    }
  }, [sortedPositions, selectedPositionKey])

  const selectedNFT = useMemo(
    () => sortedPositions.find((nft: PositionNFT) => nft.positionKey === selectedPositionKey) || null,
    [sortedPositions, selectedPositionKey],
  )

  const fixedLoanOptions = useMemo(
    () => selectedNFT?.fixedLoanIds?.map((id: any) => Number(id)) ?? [],
    [selectedNFT],
  )

  useEffect(() => {
    if (fixedLoanOptions.length > 0) {
      setSelectedFixedLoanId(String(fixedLoanOptions[0]))
    } else {
      setSelectedFixedLoanId('')
    }
  }, [fixedLoanOptions])

  const resolvePoolDetails = (poolName: string) => poolMeta[poolName] ?? {} as Record<string, any>

  const poolDetails: Record<string, any> = selectedNFT ? resolvePoolDetails(selectedNFT.poolName) : {}
  const decimals = poolDetails.decimals ?? 18

  const principalValue = useMemo(() => {
    if (!selectedNFT) return 0
    return Number(formatUnits(selectedNFT.principalRaw ?? BigInt(0), decimals))
  }, [selectedNFT, decimals])

  const totalDebtValue = useMemo(() => {
    if (!selectedNFT) return 0
    return Number(formatUnits(selectedNFT.totalDebtRaw ?? BigInt(0), decimals))
  }, [selectedNFT, decimals])

  const rollingBalanceValue = useMemo(() => {
    if (!selectedNFT) return 0
    return Number(formatUnits(selectedNFT.rollingCreditRaw ?? BigInt(0), decimals))
  }, [selectedNFT, decimals])

  const fixedDebtValue = Math.max(totalDebtValue - rollingBalanceValue, 0)

  const ltvRatio = principalValue > 0 ? (totalDebtValue / principalValue) * 100 : 0

  const maxBorrowable = useMemo(() => {
    if (!selectedNFT) return 0
    const ltvBps = poolDetails.depositorLTVBps ?? 0
    const headroom = (principalValue * ltvBps) / 10000 - totalDebtValue
    return headroom > 0 ? headroom : 0
  }, [poolDetails.depositorLTVBps, principalValue, selectedNFT, totalDebtValue])

  const ensureWalletReady = () => {
    if (!publicClient || !writeContractAsync) {
      throw new Error('Wallet client unavailable')
    }
    if (!isConnected || !address) {
      throw new Error('Connect wallet to continue')
    }
  }

  const handleActionError = (title: any, err: any) => {
    addToast({
      title,
      description: (err as any)?.message || 'Transaction failed',
      type: 'error',
    })
  }

  const handleTxToast = (title: any, hash: any) => {
    addToast({
      title,
      description: `Tx: ${hash}`,
      type: 'success',
    })
  }

  const ensureAllowance = async (tokenAddress: any, spender: any, amount: any) => {
    if (!tokenAddress) throw new Error('Token address missing')
    if (tokenAddress.toLowerCase() === ZERO_ADDRESS) return
    const allowance = await publicClient!.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address!, spender],
    })
    if (allowance < amount) {
      const approveTx = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, maxUint256],
      })
      await publicClient!.waitForTransactionReceipt({ hash: approveTx })
    }
  }

  const withLoading = async (label: any, action: any) => {
    if (pendingAction) return
    setPendingAction(label)
    try {
      await action()
    } finally {
      setPendingAction(null)
    }
  }

  const handleOpenRolling = async () => {
    await withLoading('openRolling', async () => {
      try {
        ensureWalletReady()
        if (!selectedNFT) throw new Error('Select a Position NFT first')
        const pid = poolDetails.pid ?? selectedNFT.poolId
        if (pid === undefined || pid === null) throw new Error('Pool ID missing for selected pool')
        const lendingAddress = (poolDetails.lendingPoolAddress ?? '').trim()
        if (!lendingAddress) throw new Error('Lending pool address missing for selected pool')
        const parsedAmount = parseUnits(rollingBorrowAmount || '0', decimals)
        if (parsedAmount <= BigInt(0)) throw new Error('Enter an amount above zero')

        const tx = await writeContractAsync({
          address: lendingAddress,
          abi: lendingFacetAbi,
          functionName: 'openRollingFromPosition',
          args: [BigInt(selectedNFT.tokenId), BigInt(pid), parsedAmount, BigInt(0)],
        })
        await publicClient!.waitForTransactionReceipt({ hash: tx })
        handleTxToast('Rolling credit opened', tx)
        setRollingBorrowAmount('')
        refetch()
      } catch (err) {
        handleActionError('Rolling credit failed', err)
      }
    })
  }

  const handleExpandRolling = async () => {
    await withLoading('expandRolling', async () => {
      try {
        ensureWalletReady()
        if (!selectedNFT) throw new Error('Select a Position NFT first')
        const pid = poolDetails.pid ?? selectedNFT.poolId
        if (pid === undefined || pid === null) throw new Error('Pool ID missing for selected pool')
        const lendingAddress = (poolDetails.lendingPoolAddress ?? '').trim()
        if (!lendingAddress) throw new Error('Lending pool address missing for selected pool')
        const parsedAmount = parseUnits(rollingBorrowAmount || '0', decimals)
        if (parsedAmount <= BigInt(0)) throw new Error('Enter an amount above zero')

        const tx = await writeContractAsync({
          address: lendingAddress,
          abi: lendingFacetAbi,
          functionName: 'expandRollingFromPosition',
          args: [BigInt(selectedNFT.tokenId), BigInt(pid), parsedAmount, BigInt(0)],
        })
        await publicClient!.waitForTransactionReceipt({ hash: tx })
        handleTxToast('Rolling credit expanded', tx)
        setRollingBorrowAmount('')
        refetch()
      } catch (err) {
        handleActionError('Rolling credit expand failed', err)
      }
    })
  }

  const handleRepayRolling = async () => {
    await withLoading('repayRolling', async () => {
      try {
        ensureWalletReady()
        if (!selectedNFT) throw new Error('Select a Position NFT first')
        const pid = poolDetails.pid ?? selectedNFT.poolId
        if (pid === undefined || pid === null) throw new Error('Pool ID missing for selected pool')
        const lendingAddress = (poolDetails.lendingPoolAddress ?? '').trim()
        if (!lendingAddress) throw new Error('Lending pool address missing for selected pool')

        const parsedAmount = parseUnits(rollingPaymentAmount || '0', decimals)
        if (parsedAmount <= BigInt(0)) throw new Error('Enter an amount above zero')

        const tokenAddress = poolDetails.tokenAddress?.trim()
        if (!tokenAddress) throw new Error('Token address missing for pool')

        await ensureAllowance(tokenAddress, lendingAddress, parsedAmount)

        const isNative = tokenAddress.toLowerCase() === ZERO_ADDRESS
        const tx = await writeContractAsync({
          address: lendingAddress,
          abi: lendingFacetAbi,
          functionName: 'makePaymentFromPosition',
          args: [BigInt(selectedNFT.tokenId), BigInt(pid), parsedAmount, parsedAmount],
          value: isNative ? parsedAmount : undefined,
        })
        await publicClient!.waitForTransactionReceipt({ hash: tx })
        handleTxToast('Rolling credit repaid', tx)
        setRollingPaymentAmount('')
        refetch()
      } catch (err) {
        handleActionError('Rolling credit repayment failed', err)
      }
    })
  }

  const handleOpenFixed = async () => {
    await withLoading('openFixed', async () => {
      try {
        ensureWalletReady()
        if (!selectedNFT) throw new Error('Select a Position NFT first')
        const pid = poolDetails.pid ?? selectedNFT.poolId
        if (pid === undefined || pid === null) throw new Error('Pool ID missing for selected pool')
        const lendingAddress = (poolDetails.lendingPoolAddress ?? '').trim()
        if (!lendingAddress) throw new Error('Lending pool address missing for selected pool')

        const parsedAmount = parseUnits(fixedBorrowAmount || '0', decimals)
        if (parsedAmount <= BigInt(0)) throw new Error('Enter an amount above zero')

        const tx = await writeContractAsync({
          address: lendingAddress,
          abi: lendingFacetAbi,
          functionName: 'openFixedFromPosition',
          args: [
            BigInt(selectedNFT.tokenId),
            BigInt(pid),
            parsedAmount,
            BigInt(fixedTermIndex),
            BigInt(0),
          ],
        })
        await publicClient!.waitForTransactionReceipt({ hash: tx })
        handleTxToast('Fixed loan opened', tx)
        setFixedBorrowAmount('')
        refetch()
      } catch (err) {
        handleActionError('Fixed-term borrow failed', err)
      }
    })
  }

  const handleRepayFixed = async () => {
    await withLoading('repayFixed', async () => {
      try {
        ensureWalletReady()
        if (!selectedNFT) throw new Error('Select a Position NFT first')
        const pid = poolDetails.pid ?? selectedNFT.poolId
        if (pid === undefined || pid === null) throw new Error('Pool ID missing for selected pool')
        const lendingAddress = (poolDetails.lendingPoolAddress ?? '').trim()
        if (!lendingAddress) throw new Error('Lending pool address missing for selected pool')
        if (!selectedFixedLoanId) throw new Error('Select a loan')

        const parsedAmount = parseUnits(fixedRepayAmount || '0', decimals)
        if (parsedAmount <= BigInt(0)) throw new Error('Enter an amount above zero')

        const tokenAddress = poolDetails.tokenAddress?.trim()
        if (!tokenAddress) throw new Error('Token address missing for pool')

        await ensureAllowance(tokenAddress, lendingAddress, parsedAmount)

        const isNative = tokenAddress.toLowerCase() === ZERO_ADDRESS
        const tx = await writeContractAsync({
          address: lendingAddress,
          abi: lendingFacetAbi,
          functionName: 'repayFixedFromPosition',
          args: [
            BigInt(selectedNFT.tokenId),
            BigInt(pid),
            BigInt(selectedFixedLoanId),
            parsedAmount,
            parsedAmount,
          ],
          value: isNative ? parsedAmount : undefined,
        })
        await publicClient!.waitForTransactionReceipt({ hash: tx })
        handleTxToast('Fixed loan repaid', tx)
        setFixedRepayAmount('')
        refetch()
      } catch (err) {
        handleActionError('Fixed-term repay failed', err)
      }
    })
  }

  return (
    <AppShell title="Credit">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <section className="rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral1">Credit Console</h1>
              <p className="text-neutral2">
                Manage rolling credit, fixed term loans, and repayment schedules per Position NFT.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-surface2 bg-surface2/40 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral3">Position</div>
              <select
                className="mt-2 w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                value={selectedPositionKey}
                onChange={(e: any) => setSelectedPositionKey(e.target.value)}
              >
                {sortedPositions.map((nft: PositionNFT) => (
                  <option key={nft.positionKey} value={nft.positionKey}>
                    #{nft.tokenId} · {nft.poolName}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-2xl border border-surface2 bg-surface2/40 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral3">Metrics</div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-neutral2">
                <div>
                  <div className="text-neutral3">Principal</div>
                  <div className="text-neutral1 text-lg font-semibold">{formatDisplay(principalValue)}</div>
                </div>
                <div>
                  <div className="text-neutral3">Total Debt</div>
                  <div className="text-neutral1 text-lg font-semibold">{formatDisplay(totalDebtValue)}</div>
                </div>
                <div>
                  <div className="text-neutral3">Rolling Balance</div>
                  <div className="text-neutral1 text-lg font-semibold">{formatDisplay(rollingBalanceValue)}</div>
                </div>
                <div>
                  <div className="text-neutral3">Fixed Debt</div>
                  <div className="text-neutral1 text-lg font-semibold">{formatDisplay(fixedDebtValue)}</div>
                </div>
                <div>
                  <div className="text-neutral3">LTV</div>
                  <div className="text-neutral1 text-lg font-semibold">{formatDisplay(ltvRatio, 2)}%</div>
                </div>
                <div>
                  <div className="text-neutral3">Max Borrow</div>
                  <div className="text-neutral1 text-lg font-semibold">{formatDisplay(maxBorrowable)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-surface2 bg-surface1 p-6 shadow-card">
            <div className="mb-6 text-lg font-semibold text-neutral1">Rolling Credit</div>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-neutral3">Borrow Amount</label>
                <input
                  value={rollingBorrowAmount}
                  onChange={(e: any) => setRollingBorrowAmount(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                  placeholder="0.0"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleOpenRolling}
                    className="min-h-[44px] rounded-full border border-surface3 px-4 text-xs font-semibold text-neutral1 transition hover:border-accent1"
                    disabled={!!pendingAction}
                  >
                    Open Rolling
                  </button>
                  <button
                    onClick={handleExpandRolling}
                    className="min-h-[44px] rounded-full border border-surface3 px-4 text-xs font-semibold text-neutral1 transition hover:border-accent1"
                    disabled={!!pendingAction}
                  >
                    Expand Rolling
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-neutral3">Repay Amount</label>
                <input
                  value={rollingPaymentAmount}
                  onChange={(e: any) => setRollingPaymentAmount(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                  placeholder="0.0"
                />
                <div className="mt-2">
                  <button
                    onClick={handleRepayRolling}
                    className="min-h-[44px] rounded-full border border-surface3 px-4 text-xs font-semibold text-neutral1 transition hover:border-accent1"
                    disabled={!!pendingAction}
                  >
                    Repay Rolling
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-surface2 bg-surface1 p-6 shadow-card">
            <div className="mb-6 text-lg font-semibold text-neutral1">Fixed Term</div>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-neutral3">Term</label>
                <select
                  className="mt-2 w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                  value={fixedTermIndex}
                  onChange={(e: any) => setFixedTermIndex(Number(e.target.value))}
                >
                  {FIXED_TERMS.map((term: any, idx: any) => (
                    <option key={term} value={idx}>
                      {term} days
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-neutral3">Borrow Amount</label>
                <input
                  value={fixedBorrowAmount}
                  onChange={(e: any) => setFixedBorrowAmount(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                  placeholder="0.0"
                />
                <div className="mt-2">
                  <button
                    onClick={handleOpenFixed}
                    className="min-h-[44px] rounded-full border border-surface3 px-4 text-xs font-semibold text-neutral1 transition hover:border-accent1"
                    disabled={!!pendingAction}
                  >
                    Open Fixed
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-neutral3">Repay Amount</label>
                <input
                  value={fixedRepayAmount}
                  onChange={(e: any) => setFixedRepayAmount(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                  placeholder="0.0"
                />
                <div className="mt-2">
                  <button
                    onClick={handleRepayFixed}
                    className="min-h-[44px] rounded-full border border-surface3 px-4 text-xs font-semibold text-neutral1 transition hover:border-accent1"
                    disabled={!!pendingAction}
                  >
                    Repay Fixed
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-neutral3">Loan ID</label>
                <select
                  className="mt-2 w-full rounded-2xl border border-surface3 bg-surface2 px-4 py-3 text-sm text-neutral1 outline-none focus:border-accent1 focus:ring-2 focus:ring-accent1/20"
                  value={selectedFixedLoanId}
                  onChange={(e: any) => setSelectedFixedLoanId(e.target.value)}
                >
                  {fixedLoanOptions.map((id: any) => (
                    <option key={id} value={id}>
                      Loan #{id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

export default CreditPage
