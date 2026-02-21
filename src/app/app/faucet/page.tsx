"use client";
import type { PoolConfig, Auction, PositionNFT, ParticipatingPosition } from '@/types'

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import useBufferedWriteContract from '@/lib/hooks/useBufferedWriteContract'
import { formatUnits, erc20Abi } from "viem";
import useActivePublicClient from "@/lib/hooks/useActivePublicClient";
import { faucetAbi } from "@/lib/abis/faucet";
import { AppShell } from "../../app-shell";
import { useToasts } from "@/components/common/ToastProvider";
import { resolvePoolsConfig } from "@/lib/poolsConfig";
import useActiveChainId from "@/lib/hooks/useActiveChainId";

interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  amount: bigint;
  enabled: boolean;
  balance: bigint;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Ready to claim";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

export default function FaucetPage() {
  const { addToast } = useToasts();
  const publicClient = useActivePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useBufferedWriteContract();
  const chainId = useActiveChainId();
  const poolsConfig = resolvePoolsConfig(chainId);
  const FAUCET_ADDRESS = poolsConfig?.faucetAddress as `0x${string}` | undefined;

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [lastClaimAt, setLastClaimAt] = useState<bigint>(BigInt(0));
  const [claimInterval, setClaimInterval] = useState<bigint>(BigInt(86400));
  const [loading, setLoading] = useState<boolean>(true);
  const [claiming, setClaiming] = useState<boolean>(false);

  const canClaim = useMemo(() => {
    if (!address || lastClaimAt === BigInt(0)) return true;
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now >= lastClaimAt + claimInterval;
  }, [address, lastClaimAt, claimInterval]);

  const nextClaimTime = useMemo(() => {
    if (lastClaimAt === BigInt(0)) return 0;
    return Number(lastClaimAt + claimInterval) * 1000;
  }, [lastClaimAt, claimInterval]);

  const secondsRemaining = useMemo(() => {
    if (canClaim) return 0;
    return Math.max(0, Math.floor((nextClaimTime - Date.now()) / 1000));
  }, [canClaim, nextClaimTime]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!publicClient || !FAUCET_ADDRESS) {
        console.log('[Faucet] Missing publicClient or FAUCET_ADDRESS:', { publicClient: !!publicClient, FAUCET_ADDRESS });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('[Faucet] Fetching data from:', FAUCET_ADDRESS);
        
        // Fetch claim interval
        const interval = await publicClient!.readContract({
          address: FAUCET_ADDRESS,
          abi: faucetAbi,
          functionName: "CLAIM_INTERVAL",
        });
        console.log('[Faucet] Claim interval:', interval);
        if (!cancelled) setClaimInterval(interval as bigint);

        // Fetch user's last claim time
        if (address) {
          const lastClaim = await publicClient!.readContract({
            address: FAUCET_ADDRESS,
            abi: faucetAbi,
            functionName: "lastClaimAt",
            args: [address],
          });
          console.log('[Faucet] Last claim at:', lastClaim);
          if (!cancelled) setLastClaimAt(lastClaim as bigint);
        }

        // Fetch configured tokens
        const tokenAddresses = await publicClient!.readContract({
          address: FAUCET_ADDRESS,
          abi: faucetAbi,
          functionName: "getTokens",
        }) as `0x${string}`[];
        
        console.log('[Faucet] Token addresses:', tokenAddresses);

        if (!cancelled && tokenAddresses.length > 0) {
          // Fetch config and metadata for each token
          const tokenData = await Promise.all(
            tokenAddresses.map(async (tokenAddr: any) => {
              try {
                const [config, symbol, decimals, balance] = await Promise.all([
                  publicClient.readContract({
                    address: FAUCET_ADDRESS!,
                    abi: faucetAbi,
                    functionName: "getTokenConfig",
                    args: [tokenAddr],
                  }) as Promise<[bigint, boolean, boolean]>,
                  publicClient.readContract({
                    address: tokenAddr,
                    abi: erc20Abi,
                    functionName: "symbol",
                  }) as Promise<string>,
                  publicClient.readContract({
                    address: tokenAddr,
                    abi: erc20Abi,
                    functionName: "decimals",
                  }) as Promise<number>,
                  publicClient.readContract({
                    address: tokenAddr,
                    abi: erc20Abi,
                    functionName: "balanceOf",
                    args: [FAUCET_ADDRESS!],
                  }) as Promise<bigint>,
                ]);

                return {
                  address: tokenAddr,
                  symbol,
                  decimals: Number(decimals),
                  amount: config[0],
                  enabled: config[1],
                  balance,
                };
              } catch (err) {
                console.warn(`Failed to fetch token ${tokenAddr}`, err);
                return null;
              }
            })
          );

          if (!cancelled) {
            setTokens(tokenData.filter((t): t is TokenInfo => t !== null && t.enabled));
          }
        }
      } catch (err) {
        console.error("Failed to fetch faucet data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [publicClient, address]);

  // Update countdown timer every second
  useEffect(() => {
    if (canClaim) return;
    
    const interval = setInterval(() => {
      // Force re-render to update countdown
    }, 1000);
    
    return () => clearInterval(interval);
  }, [canClaim]);

  const handleClaim = async () => {
    if (!FAUCET_ADDRESS || !address || !publicClient || !writeContractAsync) return;

    setClaiming(true);
    try {
      const tx = await writeContractAsync({
        address: FAUCET_ADDRESS,
        abi: faucetAbi,
        functionName: "claim",
      });

      addToast({
        title: "Claim submitted",
        description: `Tx: ${tx}`,
        type: "pending",
      });

      await publicClient!.waitForTransactionReceipt({ hash: tx });

      // Update last claim time
      const now = BigInt(Math.floor(Date.now() / 1000));
      setLastClaimAt(now);

      addToast({
        title: "Tokens claimed!",
        description: "Check your wallet for the received tokens.",
        type: "success",
      });
    } catch (err) {
      const message = (err as any)?.message || (err as any)?.shortMessage || "Claim failed";
      
      // Parse common errors
      if (message.includes("ClaimTooSoon")) {
        addToast({
          title: "Too soon",
          description: "You must wait 24 hours between claims.",
          type: "error",
        });
      } else if (message.includes("InsufficientBalance")) {
        addToast({
          title: "Faucet empty",
          description: "The faucet doesn't have enough tokens. Contact admin.",
          type: "error",
        });
      } else {
        addToast({
          title: "Claim failed",
          description: message,
          type: "error",
        });
      }
    } finally {
      setClaiming(false);
    }
  };

  const totalValue = useMemo(() => {
    // Just count enabled tokens with balance
    return tokens.filter(t => t.enabled && t.balance >= t.amount).length;
  }, [tokens]);

  if (!FAUCET_ADDRESS) {
    return (
      <AppShell title="Faucet">
        <div className="rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💧</div>
            <h2 className="text-xl font-semibold text-neutral1 mb-2">Faucet Not Configured</h2>
            <p className="text-neutral3 text-sm">
              Set <code className="bg-surface2 px-2 py-1 rounded">NEXT_PUBLIC_FAUCET_ADDRESS</code> in your environment.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Faucet">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        {/* Status Card */}
        <div className="rounded-3xl border border-surface2 bg-surface1 p-8 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-neutral1 flex items-center gap-3">
                <span className="text-3xl">💧</span>
                Testnet Faucet
              </h2>
              <p className="text-neutral3 text-sm mt-2">
                Claim test tokens once every 24 hours. Tokens are for testing only.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {!isConnected ? (
                <div className="text-neutral3 text-sm">Connect wallet to claim</div>
              ) : canClaim ? (
                <div className="text-success text-sm font-medium">Ready to claim</div>
              ) : (
                <div className="text-warning text-sm font-medium">
                  {formatTimeRemaining(secondsRemaining)}
                </div>
              )}

              <button
                onClick={handleClaim}
                disabled={!isConnected || !canClaim || claiming || isPending || loading}
                className={`
                  min-h-[48px] px-8 rounded-full font-semibold text-sm transition-all
                  ${canClaim && isConnected && !claiming
                    ? "bg-accent1 text-black hover:bg-accent1/90"
                    : "bg-surface3 text-neutral3 cursor-not-allowed"
                  }
                `}
              >
                {claiming || isPending ? "Claiming..." : "Claim All Tokens"}
              </button>
            </div>
          </div>
        </div>

        {/* Token List */}
        <div className="rounded-3xl border border-surface2 bg-surface1 p-6 shadow-card">
          <h3 className="text-lg font-semibold text-neutral1 mb-4">Available Tokens</h3>

          {loading ? (
            <div className="text-neutral3 text-sm py-8 text-center">
              Loading faucet tokens...
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-neutral3 text-sm py-8 text-center">
              No tokens configured in faucet.
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token: TokenInfo) => {
                const hasEnough = token.balance >= token.amount;
                return (
                  <div
                    key={token.address}
                    className="flex items-center justify-between p-4 rounded-2xl bg-surface2/40 border border-surface3"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface3 flex items-center justify-center text-lg font-bold">
                        {token.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-neutral1">{token.symbol}</div>
                        <div className="text-xs text-neutral3 font-mono">
                          {token.address.slice(0, 6)}...{token.address.slice(-4)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-neutral1">
                        {formatUnits(token.amount, token.decimals)} {token.symbol}
                      </div>
                      <div className={`text-xs ${hasEnough ? "text-success" : "text-error"}`}>
                        {hasEnough ? "Available" : "Insufficient balance"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="rounded-2xl border border-surface3 bg-surface2/20 p-4">
          <div className="flex gap-3">
            <div className="text-xl">ℹ️</div>
            <div className="text-sm text-neutral3">
              <p className="mb-2">
                <strong className="text-neutral2">How it works:</strong> Click "Claim All Tokens" to receive the configured amount of each enabled token in a single transaction.
              </p>
              <p>
                <strong className="text-neutral2">Cooldown:</strong> You can claim once every 24 hours per wallet address.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
