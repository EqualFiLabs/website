"use client";

import { useMemo, useState } from "react";
import { erc20Abi, formatUnits, parseUnits, maxUint256 } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import useActivePublicClient from "@/lib/hooks/useActivePublicClient";
import { useToasts } from "@/components/common/ToastProvider";
import useExplorerUrl from "@/lib/hooks/useExplorerUrl";
import PositionNFTCard from "@/components/position/PositionNFTCard";
import BorrowModal from "@/components/position/BorrowModal";
import RepayModal from "@/components/position/RepayModal";
import usePositionNFTs from "@/lib/hooks/usePositionNFTs";
import ActionModal from "@/components/position/ActionModal";
import SegmentedNav from "@/components/layout/SegmentedNav";
import { lendingFacetAbi, positionManagementFacetAbi } from "@/lib/abis/positionNFT";
import { ZERO_ADDRESS } from "@/lib/address";
import { AppShell } from "../../app-shell";

export default function PositionPage() {
  const { addToast } = useToasts();
  const publicClient = useActivePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { buildTxUrl } = useExplorerUrl();
  const { nfts, loading, error, poolOptions, poolMeta, mintPositionNFT, refetch } = usePositionNFTs();
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionPool, setActionPool] = useState(poolOptions[0] || "");
  const [actionTokenId, setActionTokenId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const selectedNFT = useMemo(
    () => nfts?.find((nft) => nft.positionKey === selectedPositionId) || null,
    [nfts, selectedPositionId]
  );
  const uniqueTokens = useMemo(() => {
    const seen = new Set();
    return (
      nfts?.filter((nft) => {
        if (seen.has(nft.tokenId)) return false;
        seen.add(nft.tokenId);
        return true;
      }) ?? []
    );
  }, [nfts]);
  const fixedLoans = useMemo(
    () =>
      selectedNFT?.fixedLoanIds?.map((id) => ({
        id: Number(id),
        principal: Number.POSITIVE_INFINITY,
      })) ?? [],
    [selectedNFT]
  );
  const rollingBalance = useMemo(() => {
    if (!selectedNFT) return 0;
    const decimals = selectedNFT.decimals ?? 18;
    return Number(formatUnits(selectedNFT.rollingCreditRaw ?? 0n, decimals));
  }, [selectedNFT]);
  const maxBorrowable = useMemo(() => {
    if (!selectedNFT) return 0;
    const decimals = selectedNFT.decimals ?? 18;
    const principal = Number(formatUnits(selectedNFT.principalRaw ?? 0n, decimals));
    const debt = Number(formatUnits(selectedNFT.totalDebtRaw ?? 0n, decimals));

    const poolConfig = poolMeta[selectedNFT.poolName];
    const ltvBps = poolConfig?.depositorLTVBps ?? 0;

    const headroom = (principal * ltvBps) / 10000 - debt;
    return headroom > 0 ? headroom : 0;
  }, [selectedNFT, poolMeta]);

  const resolvePoolDetails = (poolName) => poolMeta[poolName] ?? {};

  const ensureWalletReady = () => {
    if (!publicClient || !writeContractAsync) {
      throw new Error("Wallet client unavailable");
    }
    if (!isConnected || !address) {
      throw new Error("Connect wallet to continue");
    }
  };

  const handleActionError = (title, err) => {
    addToast({
      title,
      description: err?.message || "Transaction failed",
      type: "error",
    });
  };

  const handleTxToast = (title, hash) => {
    addToast({
      title,
      description: `Tx: ${hash}`,
      type: "success",
    });
  };

  const handleMint = async (poolName, amount) => {
    const result = await mintPositionNFT(poolName, amount);
    if (result) {
      addToast({
        title: "Mint submitted",
        description: "Waiting for confirmation...",
        type: "pending",
        link: buildTxUrl(result.hash),
      });
      await publicClient.waitForTransactionReceipt({ hash: result.hash });
      addToast({
        title: "Position NFT minted",
        description: `Successfully minted in ${poolName}`,
        type: "success",
        link: buildTxUrl(result.hash),
      });
      refetch();
    } else {
      addToast({
        title: "Mint failed",
        description: "Transaction rejected or failed",
        type: "error",
      });
    }
  };

  const openActionModal = (kind, tokenId, poolName) => {
    setActionModal(kind);
    setActionAmount("");
    setActionPool(poolName || poolOptions[0] || "");
    setActionTokenId(tokenId ? String(tokenId) : "");
  };

  const handleDeposit = async () => {
    setActionLoading(true);
    try {
      ensureWalletReady();
      const tokenId = actionTokenId || selectedNFT?.tokenId;
      if (!tokenId) throw new Error("Select a Position NFT first");
      const poolDetails = resolvePoolDetails(actionPool);
      const pid = poolDetails.pid ?? selectedNFT?.poolId;
      if (pid === undefined || pid === null) throw new Error("Pool ID missing for selected pool");
      const lendingAddress = (poolDetails.lendingPoolAddress ?? "").trim();
      if (!lendingAddress) throw new Error("Lending pool address missing for selected pool");
      const tokenAddress = poolDetails.tokenAddress?.trim();
      if (!tokenAddress) throw new Error(`Token address missing for pool ${actionPool}`);
      const isNative = tokenAddress.toLowerCase() === ZERO_ADDRESS;

      const decimals = poolDetails.decimals ?? 18;
      const parsedAmount = parseUnits(actionAmount || "0", decimals);
      if (parsedAmount <= 0n) throw new Error("Enter an amount above zero");

      if (!isNative) {
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, lendingAddress],
        });

        if (allowance < parsedAmount) {
          const approveTx = await writeContractAsync({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [lendingAddress, maxUint256],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveTx });
        }
      }

      const depositTx = await writeContractAsync({
        address: lendingAddress,
        abi: positionManagementFacetAbi,
        functionName: "depositToPosition",
        args: [BigInt(tokenId), BigInt(pid), parsedAmount, parsedAmount],
        value: isNative ? parsedAmount : undefined,
      });
      await publicClient.waitForTransactionReceipt({ hash: depositTx });
      handleTxToast("Deposit confirmed", depositTx);
      refetch();
    } catch (err) {
      handleActionError("Deposit failed", err);
    } finally {
      setActionLoading(false);
      setActionModal(null);
    }
  };

  const handleWithdraw = async () => {
    setActionLoading(true);
    try {
      ensureWalletReady();
      const tokenId = actionTokenId || selectedNFT?.tokenId;
      if (!tokenId) throw new Error("Select a Position NFT first");
      const poolDetails = resolvePoolDetails(actionPool);
      const pid = poolDetails.pid ?? selectedNFT?.poolId;
      if (pid === undefined || pid === null) throw new Error("Pool ID missing for selected pool");
      const lendingAddress = (poolDetails.lendingPoolAddress ?? "").trim();
      if (!lendingAddress) throw new Error("Lending pool address missing for selected pool");

      const decimals = poolDetails.decimals ?? 18;
      const parsedAmount = parseUnits(actionAmount || "0", decimals);
      if (parsedAmount <= 0n) throw new Error("Enter an amount above zero");

      const withdrawTx = await writeContractAsync({
        address: lendingAddress,
        abi: positionManagementFacetAbi,
        functionName: "withdrawFromPosition",
        args: [BigInt(tokenId), BigInt(pid), parsedAmount, 0n],
      });
      await publicClient.waitForTransactionReceipt({ hash: withdrawTx });
      handleTxToast("Withdraw confirmed", withdrawTx);
      refetch();
    } catch (err) {
      handleActionError("Withdraw failed", err);
    } finally {
      setActionLoading(false);
      setActionModal(null);
    }
  };

  const resolveBorrowContext = () => {
    if (!selectedNFT) throw new Error("Select a pool position first");
    const poolDetails = resolvePoolDetails(selectedNFT.poolName);
    const pid = poolDetails.pid ?? selectedNFT.poolId;
    if (pid === undefined || pid === null) throw new Error("Pool ID missing for selected pool");
    const lendingAddress = (poolDetails.lendingPoolAddress ?? "").trim();
    if (!lendingAddress) throw new Error("Lending pool address missing for selected pool");
    return { poolDetails, pid, lendingAddress };
  };

  const handleBorrowRolling = async (amount) => {
    try {
      ensureWalletReady();
      const { poolDetails, pid, lendingAddress } = resolveBorrowContext();
      const decimals = poolDetails.decimals ?? 18;
      const parsedAmount = parseUnits(amount?.toString?.() || "0", decimals);
      if (parsedAmount <= 0n) throw new Error("Enter an amount above zero");

      const borrowTx = await writeContractAsync({
        address: lendingAddress,
        abi: lendingFacetAbi,
        functionName: "openRollingFromPosition",
        args: [BigInt(selectedNFT.tokenId), BigInt(pid), parsedAmount, 0n],
      });
      await publicClient.waitForTransactionReceipt({ hash: borrowTx });
      handleTxToast("Borrow confirmed", borrowTx);
      refetch();
    } catch (err) {
      handleActionError("Borrow failed", err);
    }
  };

  const handleBorrowFixed = async (termIndex, amount) => {
    try {
      ensureWalletReady();
      const { poolDetails, pid, lendingAddress } = resolveBorrowContext();
      const decimals = poolDetails.decimals ?? 18;
      const parsedAmount = parseUnits(amount?.toString?.() || "0", decimals);
      if (parsedAmount <= 0n) throw new Error("Enter an amount above zero");

      const borrowTx = await writeContractAsync({
        address: lendingAddress,
        abi: lendingFacetAbi,
        functionName: "openFixedFromPosition",
        args: [BigInt(selectedNFT.tokenId), BigInt(pid), parsedAmount, BigInt(termIndex), 0n],
      });
      await publicClient.waitForTransactionReceipt({ hash: borrowTx });
      handleTxToast("Borrow confirmed", borrowTx);
      refetch();
    } catch (err) {
      handleActionError("Borrow failed", err);
    }
  };

  const handleRepayRolling = async (amount) => {
    try {
      ensureWalletReady();
      const { poolDetails, pid, lendingAddress } = resolveBorrowContext();
      const decimals = poolDetails.decimals ?? 18;
      const parsedAmount = parseUnits(amount?.toString?.() || "0", decimals);
      if (parsedAmount <= 0n) throw new Error("Enter an amount above zero");
      const tokenAddress = poolDetails.tokenAddress?.trim();
      if (!tokenAddress) throw new Error(`Token address missing for pool ${selectedNFT.poolName}`);
      const isNative = tokenAddress.toLowerCase() === ZERO_ADDRESS;

      if (!isNative) {
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, lendingAddress],
        });

        if (allowance < parsedAmount) {
          const approveTx = await writeContractAsync({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [lendingAddress, maxUint256],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveTx });
        }
      }

      const repayTx = await writeContractAsync({
        address: lendingAddress,
        abi: lendingFacetAbi,
        functionName: "makePaymentFromPosition",
        args: [BigInt(selectedNFT.tokenId), BigInt(pid), parsedAmount, parsedAmount],
        value: isNative ? parsedAmount : undefined,
      });
      await publicClient.waitForTransactionReceipt({ hash: repayTx });
      handleTxToast("Repay confirmed", repayTx);
      refetch();
    } catch (err) {
      handleActionError("Repay failed", err);
    }
  };

  const handleRepayFixed = async (loanId, amount) => {
    try {
      ensureWalletReady();
      const { poolDetails, pid, lendingAddress } = resolveBorrowContext();
      const decimals = poolDetails.decimals ?? 18;
      const parsedAmount = parseUnits(amount?.toString?.() || "0", decimals);
      if (parsedAmount <= 0n) throw new Error("Enter an amount above zero");
      if (!loanId && loanId !== 0) throw new Error("Select a loan to repay");
      const tokenAddress = poolDetails.tokenAddress?.trim();
      if (!tokenAddress) throw new Error(`Token address missing for pool ${selectedNFT.poolName}`);
      const isNative = tokenAddress.toLowerCase() === ZERO_ADDRESS;

      if (!isNative) {
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, lendingAddress],
        });

        if (allowance < parsedAmount) {
          const approveTx = await writeContractAsync({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [lendingAddress, maxUint256],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveTx });
        }
      }

      const repayTx = await writeContractAsync({
        address: lendingAddress,
        abi: lendingFacetAbi,
        functionName: "repayFixedFromPosition",
        args: [BigInt(selectedNFT.tokenId), BigInt(pid), BigInt(loanId), parsedAmount, parsedAmount],
        value: isNative ? parsedAmount : undefined,
      });
      await publicClient.waitForTransactionReceipt({ hash: repayTx });
      handleTxToast("Repay confirmed", repayTx);
      refetch();
    } catch (err) {
      handleActionError("Repay failed", err);
    }
  };

  const handleCompound = async (positionKey) => {
    if (!positionKey) return;
    const targetNFT = nfts?.find((nft) => nft.positionKey === positionKey);
    if (!targetNFT) return;
    try {
      ensureWalletReady();
      const poolDetails = resolvePoolDetails(targetNFT.poolName);
      const pid = poolDetails.pid ?? targetNFT.poolId;
      if (pid === undefined || pid === null) throw new Error("Pool ID missing for selected pool");
      const lendingAddress = (poolDetails.lendingPoolAddress ?? "").trim();
      if (!lendingAddress) throw new Error("Lending pool address missing for selected pool");

      const tx = await writeContractAsync({
        address: lendingAddress,
        abi: positionManagementFacetAbi,
        functionName: "rollYieldToPosition",
        args: [BigInt(targetNFT.tokenId), BigInt(pid)],
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      handleTxToast("Compound confirmed", tx);
      refetch();
    } catch (err) {
      handleActionError("Compound failed", err);
    }
  };

  const handleLeavePool = async (positionKey) => {
    if (!positionKey) return;
    const targetNFT = nfts?.find((nft) => nft.positionKey === positionKey);
    if (!targetNFT) return;
    try {
      ensureWalletReady();
      const poolDetails = resolvePoolDetails(targetNFT.poolName);
      const pid = poolDetails.pid ?? targetNFT.poolId;
      if (pid === undefined || pid === null) throw new Error("Pool ID missing for selected pool");
      const lendingAddress = (poolDetails.lendingPoolAddress ?? "").trim();
      if (!lendingAddress) throw new Error("Lending pool address missing for selected pool");

      const tx = await writeContractAsync({
        address: lendingAddress,
        abi: positionManagementFacetAbi,
        functionName: "closePoolPosition",
        args: [BigInt(targetNFT.tokenId), BigInt(pid)],
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      handleTxToast("Pool closed", tx);
      refetch();
    } catch (err) {
      handleActionError("Leave pool failed", err);
    }
  };

  const lendingActions = {
    maxBorrowable,
    rollingLoan: { balance: rollingBalance },
    fixedLoans,
    actions: {
      borrowRolling: async (amount) => handleBorrowRolling(amount),
      borrowFixed: async (termIndex, amount) => handleBorrowFixed(termIndex, amount),
      repayRolling: async (amount) => handleRepayRolling(amount),
      repayFixed: async (id, amount) => handleRepayFixed(id, amount),
      rollYield: async () => handleCompound(selectedPositionId),
    },
  };

  return (
    <AppShell title="Position">
      <section className="space-y-spacing12">
        <div className="flex items-center justify-between px-1">
          <SegmentedNav />
        </div>

        <PositionNFTCard
          nfts={nfts}
          loading={loading}
          error={error}
          poolOptions={poolOptions}
          poolMeta={poolMeta}
          onSelectPosition={setSelectedPositionId}
          selectedPositionId={selectedPositionId}
          onMintNFT={handleMint}
          onDeposit={() => openActionModal("deposit", selectedNFT?.tokenId, selectedNFT?.poolName)}
          onWithdraw={() => openActionModal("withdraw", selectedNFT?.tokenId, selectedNFT?.poolName)}
          onBorrow={() => setBorrowOpen(true)}
          onRepay={() => setRepayOpen(true)}
          showBorrowRepay
          onCompound={handleCompound}
          onLeavePool={handleLeavePool}
          onDepositClick={(tokenId) => openActionModal("deposit", tokenId, selectedNFT?.poolName)}
          onWithdrawClick={(tokenId) => openActionModal("withdraw", tokenId, selectedNFT?.poolName)}
          publicClient={publicClient}
        />

        <BorrowModal isOpen={borrowOpen} onClose={() => setBorrowOpen(false)} lending={lendingActions} />
        <RepayModal isOpen={repayOpen} onClose={() => setRepayOpen(false)} lending={lendingActions} />

        <ActionModal
          open={actionModal === "deposit"}
          title="Deposit"
          amount={actionAmount}
          onAmountChange={setActionAmount}
          onClose={() => setActionModal(null)}
          onConfirm={handleDeposit}
          actionLabel="Confirm deposit"
          loading={actionLoading}
          pool={actionPool}
          poolOptions={poolOptions}
          onPoolChange={setActionPool}
          nfts={uniqueTokens}
          selectedTokenId={actionTokenId}
          onTokenChange={setActionTokenId}
        />
        <ActionModal
          open={actionModal === "withdraw"}
          title="Withdraw"
          amount={actionAmount}
          onAmountChange={setActionAmount}
          onClose={() => setActionModal(null)}
          onConfirm={handleWithdraw}
          actionLabel="Confirm withdraw"
          loading={actionLoading}
          pool={actionPool}
          poolOptions={poolOptions}
          onPoolChange={setActionPool}
          nfts={uniqueTokens}
          selectedTokenId={actionTokenId}
          onTokenChange={setActionTokenId}
        />
      </section>
    </AppShell>
  );
}
