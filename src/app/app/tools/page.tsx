"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { erc20Abi, erc721Abi, formatUnits, parseUnits, maxUint256 } from "viem";
import useActivePublicClient from "@/lib/hooks/useActivePublicClient";
import usePoolsConfig from "@/lib/hooks/usePoolsConfig";
import usePositionNFTs from "@/lib/hooks/usePositionNFTs";
import useBufferedWriteContract from "@/lib/hooks/useBufferedWriteContract";
import { useToasts } from "@/components/common/ToastProvider";
import { AppShell } from "../../app-shell";

export default function ToolsPage() {
  const { address, isConnected } = useAccount();
  const publicClient = useActivePublicClient();
  const { writeContractAsync } = useBufferedWriteContract();
  const { addToast } = useToasts();
  const poolsConfig = usePoolsConfig();
  const { nfts } = usePositionNFTs();

  const [erc20Allowances, setErc20Allowances] = useState<Record<string, bigint>>({});
  const [nftApprovals, setNftApprovals] = useState<Record<string, string>>({});
  const [nftsWithTba, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [approveModalToken, setApproveModalToken] = useState<any>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  const diamondAddress = process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`;
  const positionNftAddress = process.env.NEXT_PUBLIC_POSITION_NFT as `0x${string}`;

  const tokens = (poolsConfig.pools || [])
    .filter((pool: any) => pool.tokenAddress && pool.tokenAddress !== "0x0000000000000000000000000000000000000000")
    .map((pool: any) => ({
      symbol: pool.ticker,
      address: pool.tokenAddress as `0x${string}`,
      decimals: pool.decimals,
      spender: diamondAddress,
    }));

  const fetchAllowances = async () => {
    if (!address || !publicClient || !diamondAddress) return;
    setLoading(true);
    const newErc20Allowances: Record<string, bigint> = {};
    const newNftApprovals: Record<string, string> = {};

    try {
      // Deduplicate NFTs by tokenId (hook returns one per pool)
      const uniqueNfts = Array.from(
        new Map((nfts || []).map((nft: any) => [nft.tokenId, nft])).values()
      );

      // Fetch TBA addresses for unique NFTs
      const nftsWithTba = await Promise.all(
        uniqueNfts.map(async (nft: any) => {
          try {
            const tbaAddr = await publicClient.readContract({
              address: diamondAddress,
              abi: [
                {
                  inputs: [{ name: "tokenId", type: "uint256" }],
                  name: "getTBAAddress",
                  outputs: [{ name: "", type: "address" }],
                  stateMutability: "view",
                  type: "function",
                },
              ],
              functionName: "getTBAAddress",
              args: [BigInt(nft.tokenId)],
            });
            return { ...nft, tbaAddress: tbaAddr as string };
          } catch {
            return { ...nft, tbaAddress: null };
          }
        })
      );

      await Promise.all([
        ...tokens.map(async (token) => {
          const allowance = await publicClient.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, token.spender],
          });
          newErc20Allowances[token.address] = allowance as bigint;
        }),
        ...nftsWithTba.map(async (nft) => {
          if (!positionNftAddress) return;
          const approved = await publicClient.readContract({
            address: positionNftAddress,
            abi: erc721Abi,
            functionName: "getApproved",
            args: [BigInt(nft.tokenId)],
          });
          newNftApprovals[nft.tokenId] = approved as string;
        }),
      ]);

      // Update NFTs with TBA addresses
      setNfts(nftsWithTba as any);
      setErc20Allowances(newErc20Allowances);
      setNftApprovals(newNftApprovals);
    } catch (err) {
      console.error("Failed to fetch allowances", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) fetchAllowances();
    else {
      setErc20Allowances({});
      setNftApprovals({});
      setNfts([]);
    }
  }, [isConnected, address, publicClient, nfts]);

  // Debug: log what we're getting
  useEffect(() => {
    console.log('[Tools] Raw nfts from hook:', nfts);
    console.log('[Tools] nftsWithTba:', nftsWithTba);
    console.log('[Tools] nftApprovals:', nftApprovals);
  }, [nfts, nftsWithTba, nftApprovals]);

  const handleRevokeErc20 = async (token: any) => {
    setRevoking(token.address);
    try {
      const tx = await writeContractAsync({
        address: token.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [token.spender, 0n],
      });
      addToast({ title: "Revoke submitted", description: `Revoking ${token.symbol}...`, type: "pending" });
      await publicClient?.waitForTransactionReceipt({ hash: tx });
      addToast({ title: "Revoked", description: `${token.symbol} allowance revoked`, type: "success" });
      await fetchAllowances();
    } catch (err: any) {
      addToast({ title: "Revoke failed", description: err.message || "Transaction failed", type: "error" });
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeNft = async (tokenId: string) => {
    if (!positionNftAddress) return;
    setRevoking(tokenId);
    try {
      const tx = await writeContractAsync({
        address: positionNftAddress,
        abi: erc721Abi,
        functionName: "approve",
        args: ["0x0000000000000000000000000000000000000000", BigInt(tokenId)],
      });
      addToast({ title: "Revoke submitted", description: `Revoking NFT #${tokenId}...`, type: "pending" });
      await publicClient?.waitForTransactionReceipt({ hash: tx });
      addToast({ title: "Revoked", description: `NFT #${tokenId} approval revoked`, type: "success" });
      await fetchAllowances();
    } catch (err: any) {
      addToast({ title: "Revoke failed", description: err.message || "Transaction failed", type: "error" });
    } finally {
      setRevoking(null);
    }
  };

  const handleApproveNft = async (tokenId: string, tbaAddress: string) => {
    console.log('[Tools] handleApproveNft called', { tokenId, tbaAddress, positionNftAddress });
    if (!positionNftAddress) {
      console.error('[Tools] No position NFT address');
      addToast({ title: "Position NFT address not configured", type: "error" });
      return;
    }
    setRevoking(tokenId);
    try {
      console.log('[Tools] Calling writeContractAsync...');
      const tx = await writeContractAsync({
        address: positionNftAddress,
        abi: erc721Abi,
        functionName: "approve",
        args: [tbaAddress as `0x${string}`, BigInt(tokenId)],
      });
      console.log('[Tools] Transaction submitted:', tx);
      addToast({ title: "Approval submitted", description: `Approving TBA for NFT #${tokenId}...`, type: "pending" });
      await publicClient?.waitForTransactionReceipt({ hash: tx });
      addToast({ title: "Approved", description: `TBA approved for NFT #${tokenId}`, type: "success" });
      await fetchAllowances();
    } catch (err: any) {
      console.error('[Tools] Approval failed:', err);
      addToast({ title: "Approval failed", description: err.message || "Transaction failed", type: "error" });
    } finally {
      setRevoking(null);
    }
  };

  const handleConfirmApproveErc20 = async () => {
    if (!approveModalToken) return;
    setIsApproving(true);
    try {
      const amount = approveAmount === "Infinite" ? maxUint256 : parseUnits(approveAmount, approveModalToken.decimals);
      const tx = await writeContractAsync({
        address: approveModalToken.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [approveModalToken.spender, amount],
      });
      addToast({ title: "Approval submitted", description: `Approving ${approveModalToken.symbol}...`, type: "pending" });
      await publicClient?.waitForTransactionReceipt({ hash: tx });
      addToast({ title: "Approved", description: `${approveModalToken.symbol} approved`, type: "success" });
      await fetchAllowances();
      setApproveModalToken(null);
      setApproveAmount("");
    } catch (err: any) {
      addToast({ title: "Approval failed", description: err.message || "Transaction failed", type: "error" });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <AppShell title="Tools & Settings">
      <div className="space-y-8">
        {/* ERC20 Approvals */}
        <div className="rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral1">ERC20 Token Approvals</h2>
            <button onClick={fetchAllowances} disabled={loading} className="text-sm text-accent1 hover:text-accent1Hovered font-medium">
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {!isConnected ? (
            <div className="text-center py-12 text-neutral3 bg-surface2/30 rounded-2xl border border-surface2 border-dashed">
              <p>Connect your wallet to view approvals.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-surface2">
                <table className="w-full text-left">
                  <thead className="bg-surface2 text-xs uppercase tracking-wider text-neutral3 font-semibold">
                    <tr>
                      <th className="px-6 py-4">Asset</th>
                      <th className="px-6 py-4">Allowance</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface2 bg-surface1/50">
                    {tokens.map((token) => {
                      const allowance = erc20Allowances[token.address] ?? 0n;
                      const isRevoked = allowance === 0n;
                      const isInfinite = allowance > 1n << 255n;

                      return (
                        <tr key={token.address} className="hover:bg-surface2/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-neutral1">{token.symbol}</div>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-neutral2">
                            {isRevoked ? <span className="text-neutral3">Revoked</span> : isInfinite ? <span className="text-accent1">Infinite</span> : formatUnits(allowance, token.decimals)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRevokeErc20(token)}
                                disabled={isRevoked || revoking === token.address}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                  isRevoked ? "text-neutral3 cursor-not-allowed bg-surface2" : "text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20"
                                }`}
                              >
                                {revoking === token.address ? "Revoking..." : "Revoke"}
                              </button>
                              <button
                                onClick={() => setApproveModalToken(token)}
                                className="px-4 py-2 rounded-full text-xs font-bold text-ink bg-accent1 hover:bg-accent1Hovered transition-all"
                              >
                                Approve
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {tokens.map((token) => {
                  const allowance = erc20Allowances[token.address] ?? 0n;
                  const isRevoked = allowance === 0n;
                  const isInfinite = allowance > 1n << 255n;

                  return (
                    <div key={token.address} className="rounded-2xl border border-surface2 bg-surface1/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-neutral1">{token.symbol}</div>
                        <div className="text-sm font-mono text-neutral2">
                          {isRevoked ? <span className="text-neutral3">Revoked</span> : isInfinite ? <span className="text-accent1">Infinite</span> : formatUnits(allowance, token.decimals)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRevokeErc20(token)}
                          disabled={isRevoked || revoking === token.address}
                          className={`flex-1 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                            isRevoked ? "text-neutral3 cursor-not-allowed bg-surface2" : "text-red-400 bg-red-500/10 border border-red-500/30"
                          }`}
                        >
                          {revoking === token.address ? "Revoking..." : "Revoke"}
                        </button>
                        <button
                          onClick={() => setApproveModalToken(token)}
                          className="flex-1 px-4 py-2 rounded-full text-xs font-bold text-ink bg-accent1"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Position NFT Approvals */}
        <div className="rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral1">Position NFT Approvals</h2>
          </div>

          {!isConnected ? (
            <div className="text-center py-12 text-neutral3 bg-surface2/30 rounded-2xl border border-surface2 border-dashed">
              <p>Connect your wallet to view NFT approvals.</p>
            </div>
          ) : !nftsWithTba || nftsWithTba.length === 0 ? (
            <div className="text-center py-12 text-neutral3 bg-surface2/30 rounded-2xl border border-surface2 border-dashed">
              <p>No Position NFTs found.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-surface2">
                <table className="w-full text-left">
                  <thead className="bg-surface2 text-xs uppercase tracking-wider text-neutral3 font-semibold">
                    <tr>
                      <th className="px-6 py-4">NFT</th>
                      <th className="px-6 py-4">Approved To</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface2 bg-surface1/50">
                    {nftsWithTba.map((nft: any) => {
                      const approved = nftApprovals[nft.tokenId] || "0x0000000000000000000000000000000000000000";
                      const isRevoked = approved === "0x0000000000000000000000000000000000000000";
                      const isTba = nft.tbaAddress && approved.toLowerCase() === nft.tbaAddress.toLowerCase();

                      return (
                        <tr key={nft.tokenId} className="hover:bg-surface2/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-neutral1">Position #{nft.tokenId}</div>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-neutral2">
                            {isRevoked ? (
                              <span className="text-neutral3">None</span>
                            ) : isTba ? (
                              <span className="text-accent1">TBA</span>
                            ) : (
                              <span className="text-xs">{approved.slice(0, 10)}...{approved.slice(-8)}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isTba ? (
                                <span className="text-xs text-neutral3">Approved</span>
                              ) : nft.tbaAddress ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('[Tools] Approve TBA clicked for NFT', nft.tokenId, nft.tbaAddress);
                                    handleApproveNft(nft.tokenId, nft.tbaAddress);
                                  }}
                                  disabled={revoking === nft.tokenId}
                                  className="px-4 py-2 rounded-full text-xs font-bold text-ink bg-accent1 hover:bg-accent1Hovered transition-all disabled:opacity-50 cursor-pointer"
                                  style={{ pointerEvents: 'auto' }}
                                >
                                  {revoking === nft.tokenId ? "Approving..." : "Approve TBA"}
                                </button>
                              ) : (
                                <span className="text-xs text-neutral3">No TBA</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {nftsWithTba.map((nft: any) => {
                  const approved = nftApprovals[nft.tokenId] || "0x0000000000000000000000000000000000000000";
                  const isRevoked = approved === "0x0000000000000000000000000000000000000000";
                  const isTba = nft.tbaAddress && approved.toLowerCase() === nft.tbaAddress.toLowerCase();

                  return (
                    <div key={nft.tokenId} className="rounded-2xl border border-surface2 bg-surface1/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-neutral1">Position #{nft.tokenId}</div>
                        <div className="text-sm font-mono text-neutral2">
                          {isRevoked ? (
                            <span className="text-neutral3">None</span>
                          ) : isTba ? (
                            <span className="text-accent1">TBA</span>
                          ) : (
                            <span className="text-xs">{approved.slice(0, 8)}...{approved.slice(-6)}</span>
                          )}
                        </div>
                      </div>
                      {isTba ? (
                        <div className="text-center text-xs text-neutral3 py-2">Approved</div>
                      ) : nft.tbaAddress ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[Tools Mobile] Approve TBA clicked for NFT', nft.tokenId, nft.tbaAddress);
                            handleApproveNft(nft.tokenId, nft.tbaAddress);
                          }}
                          disabled={revoking === nft.tokenId}
                          className="w-full px-4 py-2 rounded-full text-xs font-bold text-ink bg-accent1 hover:bg-accent1Hovered disabled:opacity-50 cursor-pointer"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {revoking === nft.tokenId ? "Approving..." : "Approve TBA"}
                        </button>
                      ) : (
                        <div className="text-center text-xs text-neutral3 py-2">No TBA deployed</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ERC20 Approve Modal */}
      {approveModalToken && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface1 border border-surface2 rounded-3xl p-8 max-w-md w-full shadow-card">
            <h3 className="text-xl font-bold text-neutral1 mb-4">Approve {approveModalToken.symbol}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral2 mb-2">Amount</label>
                <input
                  type="text"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  placeholder="0.0 or 'Infinite'"
                  className="w-full px-4 py-3 rounded-xl border border-surface2 bg-surface2 text-neutral1 focus:outline-none focus:ring-2 focus:ring-accent1"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setApproveAmount("Infinite")}
                  className="flex-1 px-4 py-2 rounded-full text-xs font-bold text-neutral1 bg-surface2 hover:bg-surface3 transition-all"
                >
                  Infinite
                </button>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setApproveModalToken(null);
                    setApproveAmount("");
                  }}
                  className="flex-1 px-4 py-3 rounded-full text-sm font-bold text-neutral1 bg-surface2 hover:bg-surface3 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApproveErc20}
                  disabled={isApproving || !approveAmount}
                  className="flex-1 px-4 py-3 rounded-full text-sm font-bold text-ink bg-accent1 hover:bg-accent1Hovered disabled:opacity-50 transition-all"
                >
                  {isApproving ? "Approving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
