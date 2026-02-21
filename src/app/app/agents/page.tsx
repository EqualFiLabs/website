"use client";
import type { PoolConfig, Auction, PositionNFT, TokenInfo, ParticipatingPosition } from '@/types'

import { useEffect, useMemo, useState } from "react";
import { encodePacked, isAddress, decodeEventLog, encodeFunctionData, erc721Abi } from "viem";
import { useAccount } from "wagmi";
import useBufferedWriteContract from '@/lib/hooks/useBufferedWriteContract'
import { AppShell } from "../../app-shell";
import { Card, Field, Input, Select, ActionButton, SectionHeader } from "../../app-components";
import usePositionNFTs from "@/lib/hooks/usePositionNFTs";
import useActivePublicClient from "@/lib/hooks/useActivePublicClient";
import { useToasts } from "@/components/common/ToastProvider";
import { positionAgentViewFacetAbi } from "@/lib/abis/positionAgentViewFacet";
import { positionAgentTBAFacetAbi } from "@/lib/abis/positionAgentTBAFacet";
import { positionAgentRegistryFacetAbi } from "@/lib/abis/positionAgentRegistryFacet";
import { erc6900AccountAbi } from "@/lib/abis/erc6900Account";
import { sessionKeyValidationModuleAbi } from "@/lib/abis/sessionKeyValidationModule";
import { positionAgentAmmSkillModuleAbi } from "@/lib/abis/positionAgentAmmSkillModule";
import { erc8004IdentityRegistryAbi as erc8004RegistryAbi } from "@/lib/abis/erc8004Registry";

// Skill catalog removed

const EXECUTE_SELECTORS = ["0xb61d27f6", "0x34fcd5be", "0x51945447"];
const AMM_ACTION_SELECTORS = [
  "0xed5b5ef5", // createAuction((uint256,uint256,uint256,uint256,uint256,uint64,uint64,uint16,uint8))
  "0x96b5a755", // cancelAuction(uint256)
  "0xc88d8213", // rollYieldToPosition(uint256,uint256)
];

const ACTION_PRESETS = [
  {
    id: "amm",
    label: "AMM Auctions",
    selectors: AMM_ACTION_SELECTORS,
    description: "Create + cancel AMM auctions (and roll yield) via the AMM skill module.",
  },
  {
    id: "nonce",
    label: "Check status (nonce)",
    selectors: ["0xaffed0e0"],
    description: "Read-only health check for the TBA.",
  },
  {
    id: "execute",
    label: "Execute (single call)",
    selectors: ["0xb61d27f6"],
    description: "Allow a single call to an approved target.",
  },
  {
    id: "executeBatch",
    label: "Execute batch",
    selectors: ["0x34fcd5be"],
    description: "Allow batch calls to approved targets.",
  },
  {
    id: "executeOp",
    label: "Execute (operation)",
    selectors: ["0x51945447"],
    description: "Allow execute(address,uint256,bytes,uint8) (operation=0).",
  },
];

export default function AgentsPage() {
  const { nfts } = usePositionNFTs();
  const publicClient = useActivePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useBufferedWriteContract();
  const { addToast } = useToasts();

  const diamondAddress = (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS || "").trim() as `0x${string}` | "";
  const positionNFTAddress = (process.env.NEXT_PUBLIC_POSITION_NFT || "").trim() as `0x${string}` | "";
  const sessionKeyModule = (process.env.NEXT_PUBLIC_SESSION_KEY_MODULE || "").trim() as `0x${string}` | "";
  const ammSkillModule = (process.env.NEXT_PUBLIC_AMM_SKILL_MODULE || "").trim() as `0x${string}` | "";
  const identityRegistry = (process.env.NEXT_PUBLIC_IDENTITY_REGISTRY || "").trim() as `0x${string}` | "";
  const chainId = (process.env.NEXT_PUBLIC_CHAIN_ID || "").toString();

  const [selectedNft, setSelectedNft] = useState<any>("");
  const [validFrom, setValidFrom] = useState<any>("");
  const [validUntil, setValidUntil] = useState<any>("");
  const [valueLimit, setValueLimit] = useState<any>("0");
  const [budget, setBudget] = useState<any>("0");
  const [selectedActions, setSelectedActions] = useState<any>(["amm"]);
  const [ammMaxReserve, setAmmMaxReserve] = useState<any>("0");
  const [ammTtlSeconds, setAmmTtlSeconds] = useState<any>("0");
  const [isInstallingAmm, setIsInstallingAmm] = useState<boolean>(false);
  const selectors = useMemo(() => {
    const set = new Set<string>();
    selectedActions.forEach((id: any) => {
      const preset = ACTION_PRESETS.find((p: any) => p.id === id);
      preset?.selectors?.forEach((selector: any) => set.add(selector));
    });
    return Array.from(set);
  }, [selectedActions]);
  const [entityId, setEntityId] = useState<any>("7");
  const [sessionKey, setSessionKey] = useState<any>("");
  const [allowedTargetsInput, setAllowedTargetsInput] = useState<any>("");
  const [trackedKeyInput, setTrackedKeyInput] = useState<any>("");
  const [trackedKeys, setTrackedKeys] = useState<any>([] as string[]);
  const [trackedPolicies, setTrackedPolicies] = useState<any>({} as Record<string, any>);
  const [tbaAddress, setTbaAddress] = useState<`0x${string}` | "">("");
  const [tbaDeployed, setTbaDeployed] = useState<boolean>(false);
  const [agentId, setAgentId] = useState<bigint | null>(null);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [sessionModuleInstalled, setSessionModuleInstalled] = useState<boolean | null>(null);
  const sessionModuleKey = useMemo(() => {
    if (!tbaAddress || !sessionKeyModule) return "";
    return ["equalfi.sessionModule", chainId || "0", tbaAddress, entityId || "0", sessionKeyModule].join(":");
  }, [chainId, tbaAddress, entityId, sessionKeyModule]);
  const [isCreatingKey, setIsCreatingKey] = useState<boolean>(false);
  const [isRevoking, setIsRevoking] = useState<any>("");
  const [isRegisteringAgent, setIsRegisteringAgent] = useState<boolean>(false);

  const trackedStorageKey = useMemo(() => {
    const base = ["equalfi.sessionKeys", chainId || "0", tbaAddress || "none", entityId || "0"].join(":");
    return base;
  }, [chainId, tbaAddress, entityId]);

  useEffect(() => {
    if (!allowedTargetsInput && diamondAddress) {
      setAllowedTargetsInput(diamondAddress);
    }
  }, [diamondAddress, allowedTargetsInput]);

  useEffect(() => {
    if (!trackedStorageKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(trackedStorageKey);
      if (!raw) {
        setTrackedKeys([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setTrackedKeys(parsed.filter((item: any) => typeof item === "string"));
      }
    } catch (err) {
      console.error("Failed to load tracked keys", err);
    }
  }, [trackedStorageKey]);

  useEffect(() => {
    if (!trackedStorageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(trackedStorageKey, JSON.stringify(trackedKeys));
    } catch (err) {
      console.error("Failed to persist tracked keys", err);
    }
  }, [trackedKeys, trackedStorageKey]);

  useEffect(() => {
    let cancelled = false;
    const loadTba = async () => {
      if (!publicClient || !selectedNft || !diamondAddress) {
        setTbaAddress("");
        setTbaDeployed(false);
        setAgentId(null);
        return;
      }
      try {
        const tokenId = BigInt(selectedNft);
        const [addr, deployed, registeredAgentId] = await Promise.all([
          publicClient.readContract({
            address: diamondAddress,
            abi: positionAgentViewFacetAbi,
            functionName: "getTBAAddress",
            args: [tokenId],
          }) as Promise<`0x${string}`>,
          publicClient.readContract({
            address: diamondAddress,
            abi: positionAgentViewFacetAbi,
            functionName: "isTBADeployed",
            args: [tokenId],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: diamondAddress,
            abi: positionAgentViewFacetAbi,
            functionName: "getAgentId",
            args: [tokenId],
          }) as Promise<bigint>,
        ]);
        if (!cancelled) {
          setTbaAddress(addr);
          setTbaDeployed(Boolean(deployed));
          setAgentId(registeredAgentId && registeredAgentId > BigInt(0) ? registeredAgentId : null);
        }
      } catch (err) {
        console.error("Failed to load TBA", err);
        if (!cancelled) {
          setTbaAddress("");
          setTbaDeployed(false);
          setAgentId(null);
        }
      }
    };

    loadTba();
    return () => {
      cancelled = true;
    };
  }, [publicClient, selectedNft, diamondAddress]);

  useEffect(() => {
    let cancelled = false;
    const loadSessionModule = async () => {
      if (!publicClient || !sessionKeyModule || !tbaAddress || !tbaDeployed) {
        setSessionModuleInstalled(null);
        return;
      }
      let cached: boolean | null = null;
      try {
        if (sessionModuleKey) {
          const stored = window.localStorage.getItem(sessionModuleKey);
          cached = stored === "1" ? true : stored === "0" ? false : null;
        }
      } catch {
        cached = null;
      }
      try {
        const entity = Number(entityId || 0);
        if (!Number.isFinite(entity) || entity < 0) {
          setSessionModuleInstalled(cached);
          return;
        }
        const validationConfig = packValidationConfig(sessionKeyModule, entity);
        const installed = await publicClient!.readContract({
          address: tbaAddress,
          abi: erc6900AccountAbi,
          functionName: "isValidationInstalled",
          args: [validationConfig],
        });
        if (!cancelled) {
          setSessionModuleInstalled(Boolean(installed));
        }
      } catch {
        if (!cancelled) {
          setSessionModuleInstalled(cached);
        }
      }
    };

    loadSessionModule();
    return () => {
      cancelled = true;
    };
  }, [publicClient, sessionKeyModule, tbaAddress, tbaDeployed, entityId, sessionModuleKey]);

  useEffect(() => {
    let cancelled = false;
    const loadPolicies = async () => {
      if (!publicClient || !sessionKeyModule || !tbaAddress || !trackedKeys.length) {
        setTrackedPolicies({});
        return;
      }
      const entity = Number(entityId || 0);
      if (!Number.isFinite(entity)) return;
      const results = await Promise.allSettled(
        trackedKeys.map((key: any) =>
          publicClient.readContract({
            address: sessionKeyModule,
            abi: sessionKeyValidationModuleAbi,
            functionName: "getSessionKeyPolicy",
            args: [tbaAddress, entity, key as `0x${string}`],
          }),
        ),
      );
      if (cancelled) return;
      const next: Record<string, any> = {};
      results.forEach((result: any, idx: any) => {
        const key = trackedKeys[idx];
        if (result.status !== "fulfilled") {
          next[key] = { error: result.reason };
          return;
        }
        const value: any = result.value;
        const policy = value?.policy ?? value?.[0] ?? {};
        next[key] = {
          active: policy.active ?? policy?.[0] ?? false,
          validAfter: policy.validAfter ?? policy?.[1] ?? BigInt(0),
          validUntil: policy.validUntil ?? policy?.[2] ?? BigInt(0),
          maxValuePerCall: policy.maxValuePerCall ?? policy?.[3] ?? BigInt(0),
          cumulativeValueLimit: policy.cumulativeValueLimit ?? policy?.[4] ?? BigInt(0),
          nonce: value?.nonce ?? value?.[1] ?? BigInt(0),
          targetCount: value?.targetCount ?? value?.[2] ?? BigInt(0),
          selectorCount: value?.selectorCount ?? value?.[3] ?? BigInt(0),
          targetSelectorRuleCount: value?.targetSelectorRuleCount ?? value?.[4] ?? BigInt(0),
          cumulativeValueUsed: value?.cumulativeValueUsed ?? value?.[5] ?? BigInt(0),
        };
      });
      setTrackedPolicies(next);
    };

    loadPolicies().catch((err: any) => {
      console.error("Failed to load session key policies", err);
    });

    return () => {
      cancelled = true;
    };
  }, [publicClient, sessionKeyModule, tbaAddress, entityId, trackedKeys]);

  const positionOptions = useMemo(() => {
    const byId = new Map();
    (nfts || []).forEach((nft: PositionNFT) => {
      if (!nft?.tokenId) return;
      const entry = byId.get(nft.tokenId) || {
        tokenId: nft.tokenId,
        pools: new Set(),
      };
      if (nft.poolId !== null && nft.poolId !== undefined) {
        entry.pools.add(nft.poolId);
      }
      byId.set(nft.tokenId, entry);
    });
    return Array.from(byId.values()).map((entry: any) => ({
      tokenId: entry.tokenId,
      poolCount: entry.pools.size,
    }));
  }, [nfts]);

  const policyPreview = useMemo(
    () => ({
      validAfter: validFrom || "now",
      validUntil: validUntil || "+1h",
      valueLimit: valueLimit ? `${valueLimit} USDC` : "—",
      budget: budget ? `${budget} USDC` : "—",
      permissions: selectors.map((selector: any) => ({
        target: allowedTargetsInput || diamondAddress || "0xEqualFiDiamond",
        selectors: [selector],
      })),
    }),
    [validFrom, validUntil, valueLimit, budget, selectors, diamondAddress, allowedTargetsInput],
  );

  // Placeholder handler removed

  const packValidationConfig = (module: string, entity: number) => {
    const flags = 4 | 2 | 1; // global + signature + userOp
    return encodePacked(["address", "uint32", "uint8"], [module as `0x${string}`, entity, flags]);
  };

  const parseUint = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return BigInt(0);
    if (!/^[0-9]+$/.test(trimmed)) throw new Error("Value must be an integer");
    return BigInt(trimmed);
  };

  const parseTimestamp = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "now") return 0;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Invalid timestamp");
    return Math.floor(parsed);
  };

  const truncateAddress = (addr?: string) => {
    if (!addr) return "—";
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTimestamp = (value?: bigint | number) => {
    if (value === undefined || value === null) return "—";
    const num = typeof value === "bigint" ? Number(value) : value;
    if (!num) return "—";
    const date = new Date(num * 1000);
    return Number.isNaN(date.getTime()) ? String(num) : date.toLocaleString();
  };

  const formatBigInt = (value?: bigint | number) => {
    if (value === undefined || value === null) return "0";
    return typeof value === "bigint" ? value.toString() : String(value);
  };

  const handleCopy = async (value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      addToast({ title: "Copied", type: "success" });
    } catch (err) {
      console.error("Copy failed", err);
      addToast({ title: "Copy failed", type: "error" });
    }
  };

  const handleDeployTba = async () => {
    if (!diamondAddress) {
      addToast({ title: "Diamond address missing", type: "error" });
      return;
    }
    if (!selectedNft) {
      addToast({ title: "Select a Position NFT", type: "error" });
      return;
    }
    if (!isConnected || !address) {
      addToast({ title: "Connect wallet", type: "error" });
      return;
    }
    try {
      setIsDeploying(true);
      
      // Step 1: Deploy TBA
      const deployTxHash = await writeContractAsync({
        address: diamondAddress,
        abi: positionAgentTBAFacetAbi,
        functionName: "deployTBA",
        args: [BigInt(selectedNft)],
      });
      addToast({
        title: "Deploying TBA",
        description: "Waiting for confirmation…",
        type: "pending",
      });
      await publicClient?.waitForTransactionReceipt({ hash: deployTxHash });
      
      // Get TBA address
      const addr = await publicClient?.readContract({
        address: diamondAddress,
        abi: positionAgentViewFacetAbi,
        functionName: "getTBAAddress",
        args: [BigInt(selectedNft)],
      }) as `0x${string}` | undefined;
      
      if (!addr) {
        throw new Error("Failed to get TBA address");
      }
      
      // Step 2: Approve TBA to operate the Position NFT
      const positionNftAddress = process.env.NEXT_PUBLIC_POSITION_NFT_ADDRESS as `0x${string}`;
      if (!positionNftAddress) {
        throw new Error("Position NFT address not configured");
      }
      
      const approveTxHash = await writeContractAsync({
        address: positionNftAddress,
        abi: erc721Abi,
        functionName: "approve",
        args: [addr, BigInt(selectedNft)],
      });
      addToast({
        title: "Approving TBA",
        description: "Granting TBA permission to operate NFT…",
        type: "pending",
      });
      await publicClient?.waitForTransactionReceipt({ hash: approveTxHash });
      
      setTbaAddress(addr);
      setTbaDeployed(true);
      addToast({ title: "TBA deployed and approved", type: "success" });
    } catch (err) {
      console.error(err);
      addToast({ title: "Deploy failed", description: (err as any)?.message || "Transaction reverted", type: "error" });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleInstallSessionKey = async () => {
    if (!sessionKeyModule) {
      addToast({ title: "Session key module missing", type: "error" });
      return;
    }
    if (!tbaAddress || !tbaDeployed) {
      addToast({ title: "Deploy TBA first", type: "error" });
      return;
    }
    if (!isConnected || !address) {
      addToast({ title: "Connect wallet", type: "error" });
      return;
    }
    try {
      setIsInstalling(true);
      const entity = Number(entityId || 0);
      if (!Number.isFinite(entity) || entity < 0) {
        throw new Error("Invalid entity ID");
      }
      const validationConfig = packValidationConfig(sessionKeyModule, entity);
      const txHash = await writeContractAsync({
        address: tbaAddress,
        abi: erc6900AccountAbi,
        functionName: "installValidation",
        args: [validationConfig, [], "0x", []],
      });
      addToast({ title: "Installing session key module", type: "pending" });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      setSessionModuleInstalled(true);
      try {
        if (sessionModuleKey) {
          window.localStorage.setItem(sessionModuleKey, "1");
        }
      } catch {}
      addToast({ title: "Session key module installed", type: "success" });
    } catch (err) {
      console.error(err);
      addToast({ title: "Install failed", description: (err as any)?.message || "Transaction reverted", type: "error" });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleApplyAmmTemplate = async () => {
    if (!ammSkillModule) {
      addToast({ title: "AMM skill module missing", type: "error" });
      return;
    }
    if (!sessionKeyModule) {
      addToast({ title: "Session key module missing", type: "error" });
      return;
    }
    if (!tbaAddress || !tbaDeployed) {
      addToast({ title: "Deploy TBA first", type: "error" });
      return;
    }
    if (!sessionKey || !isAddress(sessionKey)) {
      addToast({ title: "Enter a valid session key address", type: "error" });
      return;
    }
    if (!diamondAddress) {
      addToast({ title: "Diamond address missing", type: "error" });
      return;
    }
    if (!publicClient || !writeContractAsync) {
      addToast({ title: "Wallet client missing", type: "error" });
      return;
    }

    try {
      setIsInstallingAmm(true);
      const entity = Number(entityId || 0);
      if (!Number.isFinite(entity) || entity < 0) {
        throw new Error("Invalid entity ID");
      }

      const maxReserve = parseUint(ammMaxReserve);
      const ttlSeconds = parseUint(ammTtlSeconds);
      const ttlNumber = ttlSeconds > BigInt(0) ? Number(ttlSeconds) : 0;

      // 1) Install AMM execution module on the TBA (if not already installed)
      let alreadyInstalled = false;
      try {
        await publicClient!.readContract({
          address: tbaAddress,
          abi: positionAgentAmmSkillModuleAbi,
          functionName: "getDiamond",
        });
        alreadyInstalled = true;
      } catch {
        // getDiamond reverts with unrecognised selector → not installed
      }

      if (!alreadyInstalled) {
        const manifest = await publicClient!.readContract({
          address: ammSkillModule,
          abi: positionAgentAmmSkillModuleAbi,
          functionName: "executionManifest",
        });

        const installTx = await writeContractAsync({
          address: tbaAddress,
          abi: erc6900AccountAbi,
          functionName: "installExecution",
          args: [ammSkillModule, manifest, "0x"],
        });
        addToast({ title: "Installing AMM skill module", type: "pending" });
        await publicClient!.waitForTransactionReceipt({ hash: installTx });
      }

      // 2) Configure AMM module
      const policy = {
        enabled: true,
        allowCancel: true,
        enforcePoolAllowlist: false,
        minDuration: 0,
        maxDuration: ttlNumber > 0 ? ttlNumber : 0,
        minFeeBps: 0,
        maxFeeBps: 0,
        minReserveA: BigInt(0),
        maxReserveA: maxReserve,
        minReserveB: BigInt(0),
        maxReserveB: maxReserve,
      };

      const setDiamondTx = await writeContractAsync({
        address: tbaAddress,
        abi: positionAgentAmmSkillModuleAbi,
        functionName: "setDiamond",
        args: [diamondAddress],
      });
      addToast({ title: "Configuring AMM skill", type: "pending" });
      await publicClient!.waitForTransactionReceipt({ hash: setDiamondTx });

      // Set auction policy
      const setPolicyTx = await writeContractAsync({
        address: tbaAddress,
        abi: positionAgentAmmSkillModuleAbi,
        functionName: "setAuctionPolicy",
        args: [policy],
      });
      await publicClient!.waitForTransactionReceipt({ hash: setPolicyTx });

      // Set roll policy (enable rolling yield to position)
      const rollPolicy = {
        enabled: true,
        enforcePoolAllowlist: false,
      };
      const setRollPolicyTx = await writeContractAsync({
        address: tbaAddress,
        abi: positionAgentAmmSkillModuleAbi,
        functionName: "setRollPolicy",
        args: [rollPolicy],
      });
      await publicClient!.waitForTransactionReceipt({ hash: setRollPolicyTx });

      // 3) Set session key policy for AMM module selectors
      const now = Math.floor(Date.now() / 1000);
      const validUntilValue = ttlNumber > 0 ? BigInt(now + ttlNumber) : BigInt(0);
      const txHash = await writeContractAsync({
        address: sessionKeyModule,
        abi: sessionKeyValidationModuleAbi,
        functionName: "setSessionKeyPolicy",
        args: [
          tbaAddress,
          entity,
          sessionKey,
          0,
          validUntilValue,
          BigInt(0),
          BigInt(0),
          [],
          AMM_ACTION_SELECTORS as `0x${string}`[],
          [],
        ],
      });
      addToast({ title: "Installing AMM session policy", type: "pending" });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });

      addToast({ title: "AMM skill template applied", type: "success" });
    } catch (err) {
      console.error(err);
      addToast({ title: "AMM template failed", description: (err as any)?.message || "Transaction reverted", type: "error" });
    } finally {
      setIsInstallingAmm(false);
    }
  };

  const handleCreateSessionKey = async () => {
    if (!sessionKeyModule) {
      addToast({ title: "Session key module missing", type: "error" });
      return;
    }
    if (!tbaAddress || !tbaDeployed) {
      addToast({ title: "Deploy TBA first", type: "error" });
      return;
    }
    if (!sessionKey || !isAddress(sessionKey)) {
      addToast({ title: "Enter a valid session key address", type: "error" });
      return;
    }
    if (!isConnected || !address) {
      addToast({ title: "Connect wallet", type: "error" });
      return;
    }

    try {
      setIsCreatingKey(true);
      const entity = Number(entityId || 0);
      if (!Number.isFinite(entity) || entity < 0) {
        throw new Error("Invalid entity ID");
      }

      const allowedTargets = allowedTargetsInput
        .split(",")
        .map((entry: any) => entry.trim())
        .filter(Boolean);

      const requiresTargets = selectors.some((selector: any) => EXECUTE_SELECTORS.includes(selector.toLowerCase()));
      if (requiresTargets && allowedTargets.length === 0) {
        throw new Error("Provide at least one allowed target for execute calls");
      }

      const invalidTarget = allowedTargets.find((t: any) => !isAddress(t));
      if (invalidTarget) {
        throw new Error(`Invalid target address: ${invalidTarget}`);
      }

      if (selectors.length === 0) {
        throw new Error("Select at least one action");
      }
      const invalidSelector = selectors.find((sel: any) => !/^0x[0-9a-fA-F]{8}$/.test(sel));
      if (invalidSelector) {
        throw new Error(`Invalid selector: ${invalidSelector}`);
      }

      const validAfter = parseTimestamp(validFrom);
      const validUntilValue = parseTimestamp(validUntil);
      if (validUntilValue && validAfter && validUntilValue < validAfter) {
        throw new Error("validUntil must be >= validAfter");
      }

      const maxValuePerCall = parseUint(valueLimit);
      const cumulativeValueLimit = parseUint(budget);

      const txHash = await writeContractAsync({
        address: sessionKeyModule,
        abi: sessionKeyValidationModuleAbi,
        functionName: "setSessionKeyPolicy",
        args: [
          tbaAddress,
          entity,
          sessionKey,
          validAfter,
          validUntilValue,
          maxValuePerCall,
          cumulativeValueLimit,
          allowedTargets as `0x${string}`[],
          selectors as `0x${string}`[],
          [],
        ],
      });

      addToast({ title: "Session key policy submitted", type: "pending" });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      addToast({ title: "Session key policy set", type: "success" });
      setTrackedKeys((prev: any) => (prev.includes(sessionKey) ? prev : [...prev, sessionKey]));
      setTrackedKeyInput("");
    } catch (err) {
      console.error(err);
      addToast({ title: "Session key failed", description: (err as any)?.message || "Transaction reverted", type: "error" });
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleTrackKey = () => {
    if (!trackedKeyInput || !isAddress(trackedKeyInput)) {
      addToast({ title: "Enter a valid address", type: "error" });
      return;
    }
    setTrackedKeys((prev: any) => (prev.includes(trackedKeyInput) ? prev : [...prev, trackedKeyInput]));
    setTrackedKeyInput("");
  };

  const handleRevokeKey = async (key: string) => {
    if (!sessionKeyModule || !tbaAddress) return;
    if (!isConnected || !address) {
      addToast({ title: "Connect wallet", type: "error" });
      return;
    }
    try {
      setIsRevoking(key);
      const entity = Number(entityId || 0);
      const txHash = await writeContractAsync({
        address: sessionKeyModule,
        abi: sessionKeyValidationModuleAbi,
        functionName: "revokeSessionKey",
        args: [tbaAddress, entity, key as `0x${string}`],
      });
      addToast({ title: "Revoking session key", type: "pending" });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      addToast({ title: "Session key revoked", type: "success" });
    } catch (err) {
      console.error(err);
      addToast({ title: "Revoke failed", description: (err as any)?.message || "Transaction reverted", type: "error" });
    } finally {
      setIsRevoking("");
    }
  };

  const handleRegisterAgent = async () => {
    if (!identityRegistry) {
      addToast({ title: "Identity registry missing", type: "error" });
      return;
    }
    if (!tbaAddress || !tbaDeployed) {
      addToast({ title: "Deploy TBA first", type: "error" });
      return;
    }
    if (!selectedNft) {
      addToast({ title: "Select a Position NFT", type: "error" });
      return;
    }
    if (!isConnected || !address) {
      addToast({ title: "Connect wallet", type: "error" });
      return;
    }

    try {
      setIsRegisteringAgent(true);

      const ownerAddress = await publicClient?.readContract({
        address: positionNFTAddress as `0x${string}`,
        abi: erc721Abi,
        functionName: "ownerOf",
        args: [BigInt(selectedNft)],
      });

      if (!ownerAddress || ownerAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error(`Wallet is not owner of Position #${selectedNft}`);
      }

      const registerCallData = encodeFunctionData({
        abi: erc8004RegistryAbi,
        functionName: "register",
        args: [],
      });

      const parseRegisteredAgentId = (receipt: any) => {
        if (!receipt) return null;
        for (const log of receipt.logs || []) {
          if (log.address?.toLowerCase() !== identityRegistry.toLowerCase()) continue;
          try {
            const decoded = decodeEventLog({
              abi: erc8004RegistryAbi,
              data: log.data,
              topics: log.topics,
            }) as { eventName: string; args?: any };
            if (decoded?.eventName === "Registered") {
              const owner = (decoded.args?.owner as string | undefined)?.toLowerCase?.() || "";
              if (owner && owner !== tbaAddress.toLowerCase()) continue;
              return decoded.args?.agentId as bigint;
            }
          } catch {
            // ignore non-matching logs
          }
        }
        return null;
      };

      const runRegister = async () => {
        const txHash = await writeContractAsync({
          address: tbaAddress,
          abi: erc6900AccountAbi,
          functionName: "execute",
          args: [identityRegistry, BigInt(0), registerCallData],
        });

        addToast({ title: "Registering agent", type: "pending" });
        const receipt = await publicClient?.waitForTransactionReceipt({ hash: txHash });
        return parseRegisteredAgentId(receipt);
      };

      let agentId = await runRegister();
      if (agentId === BigInt(0)) {
        // ERC-8004 registry starts at 0; retry to get a non-zero id for EqualFi
        agentId = await runRegister();
      }

      if (agentId === null || agentId === BigInt(0)) {
        throw new Error("Registry returned agentId 0; retry or reset registry");
      }

      const recordTx = await writeContractAsync({
        address: diamondAddress as `0x${string}`,
        abi: positionAgentRegistryFacetAbi,
        functionName: "recordAgentRegistration",
        args: [BigInt(selectedNft), agentId],
      });

      addToast({ title: "Recording agent", type: "pending" });
      await publicClient?.waitForTransactionReceipt({ hash: recordTx });
      setAgentId(agentId);
      addToast({ title: "Agent registered", type: "success" });
    } catch (err) {
      console.error(err);
      addToast({ title: "Register failed", description: (err as any)?.message || "Transaction reverted", type: "error" });
    } finally {
      setIsRegisteringAgent(false);
    }
  };

  return (
    <AppShell title="Position Agents">
      <div
        className="flex items-center justify-between gap-4 rounded-2xl border border-accent1/30 bg-accent1/5 px-5 py-3 text-sm font-mono text-accent1"
      >
        <a href="/skills/equalfi-amm.zip" download className="flex flex-col gap-1 hover:underline">
          <span>↓ Download OpenClaw AMM Agent Skill</span>
          <code className="text-xs text-accent1/60">curl -LO https://equalfi.org/skills/equalfi-amm.zip</code>
        </a>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            navigator.clipboard.writeText("curl -LO https://equalfi.org/skills/equalfi-amm.zip");
          }}
          className="shrink-0 p-1.5 rounded-lg hover:bg-accent1/20 transition-colors"
          title="Copy curl command"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>
      <div className="space-y-10">
        <section className="grid gap-6">
          <Card>
            <SectionHeader title="AGENT SETUP" subtitle="Position NFT binding" />
            <div className="mt-6 space-y-4">
              <Field label="Position NFT">
                <Select value={selectedNft} onChange={(e: any) => setSelectedNft(e.target.value)}>
                  <option value="">Select Position</option>
                  {positionOptions.map((entry: any) => (
                    <option key={entry.tokenId} value={String(entry.tokenId)}>
                      #{entry.tokenId} · {entry.poolCount || 0} pools
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-xs font-mono text-gray-400">
                Identity Registry: <span className="text-white">{identityRegistry || 'Not set'}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-xs font-mono text-gray-400">
                  TBA: <span className="text-white">{tbaDeployed ? "Deployed" : "Not Deployed"}</span>
                  {tbaAddress && (
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="truncate" title={tbaAddress}>
                        {truncateAddress(tbaAddress)}
                      </span>
                      <span
                        onClick={() => handleCopy(tbaAddress)}
                        className="cursor-pointer text-gray-500 hover:text-mint"
                        role="button"
                        tabIndex={0}
                        aria-label="Copy TBA address"
                        onKeyDown={(e: any) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCopy(tbaAddress);
                          }
                        }}
                      >
                        ⧉
                      </span>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-xs font-mono text-gray-400">
                  Agent ID: <span className="text-white">{agentId !== null ? agentId.toString() : "Not Registered"}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ActionButton disabled={isDeploying} onClick={handleDeployTba}>
                  {isDeploying ? "Deploying…" : "DEPLOY ERC-6551 TBA"}
                </ActionButton>
                <ActionButton disabled={isRegisteringAgent} onClick={handleRegisterAgent}>
                  {isRegisteringAgent ? "Registering…" : "REGISTER ERC-8004 AGENT"}
                </ActionButton>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 min-w-0">
          <Card>
            <SectionHeader title="SESSION KEYS" subtitle="Policy builder" />
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-xs font-mono text-gray-400">
                Need a session key? Run:
                <div className="mt-2 select-text text-xs font-mono text-white">
                  pnpm dlx @equalfi/ski
                </div>
                <div className="mt-1 text-[10px] text-gray-500">
                  Generates a local session EOA and stores it in your OS keychain.
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-xs font-mono text-gray-400">
                SessionKeyValidationModule:
                <div className="mt-1 text-[10px] text-gray-500">
                  {sessionKeyModule || "Not set"}
                </div>
                <div className="mt-1 text-[10px] text-gray-500">
                  Installed: {sessionModuleInstalled === null ? "Unknown" : sessionModuleInstalled ? "Yes" : "No"}
                </div>
              </div>
              <Field label="Validation Entity ID">
                <Input value={entityId} onChange={(e: any) => setEntityId(e.target.value)} />
              </Field>
              <ActionButton disabled={isInstalling || sessionModuleInstalled === true} onClick={handleInstallSessionKey}>
                {sessionModuleInstalled === true
                  ? "Session Key Module Installed"
                  : isInstalling
                    ? "Installing…"
                    : "Install Session Key Module"}
              </ActionButton>

              <Field label="Session Key Address">
                <Input
                  placeholder="0x..."
                  value={sessionKey}
                  onChange={(e: any) => setSessionKey(e.target.value)}
                />
              </Field>
              <Field label="Allowed Targets (comma-separated)">
                <Input
                  placeholder={diamondAddress || "0x..."}
                  value={allowedTargetsInput}
                  onChange={(e: any) => setAllowedTargetsInput(e.target.value)}
                />
              </Field>

              <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-xs font-mono text-gray-400">
                <div className="text-white">AMM Skill Template</div>
                <div className="mt-1 text-[10px] text-gray-500">
                  Two inputs only. We install the AMM module, set its policy, and then create a session-key policy with the required selectors.
                </div>
                <div className="mt-2 text-[10px] text-gray-500">
                  Module: {ammSkillModule || "Not set"}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="AMM Max Reserve (raw units)">
                  <Input value={ammMaxReserve} onChange={(e: any) => setAmmMaxReserve(e.target.value)} />
                </Field>
                <Field label="Session TTL (seconds)">
                  <Input value={ammTtlSeconds} onChange={(e: any) => setAmmTtlSeconds(e.target.value)} />
                </Field>
              </div>
              <ActionButton disabled={isInstallingAmm} onClick={handleApplyAmmTemplate}>
                {isInstallingAmm ? "Applying AMM Template…" : "Apply AMM Skill Template"}
              </ActionButton>
              <Field label="Valid From (unix seconds)">
                <Input
                  placeholder="0"
                  value={validFrom}
                  onChange={(e: any) => setValidFrom(e.target.value)}
                />
              </Field>
              <Field label="Valid Until (unix seconds)">
                <Input
                  placeholder="0"
                  value={validUntil}
                  onChange={(e: any) => setValidUntil(e.target.value)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Max Value Per Call (wei)">
                  <Input value={valueLimit} onChange={(e: any) => setValueLimit(e.target.value)} />
                </Field>
                <Field label="Cumulative Value Limit (wei)">
                  <Input value={budget} onChange={(e: any) => setBudget(e.target.value)} />
                </Field>
              </div>
              <Field label="Allowed Actions">
                <div className="grid gap-3">
                  {ACTION_PRESETS.map((preset: any) => (
                    <label key={preset.id} className="flex items-start gap-3 text-xs text-gray-400">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedActions.includes(preset.id)}
                        onChange={(e: any) => {
                          setSelectedActions((prev: any) =>
                            e.target.checked
                              ? [...prev, preset.id]
                              : prev.filter((item: any) => item !== preset.id),
                          );
                        }}
                      />
                      <div className="space-y-1">
                        <div className="text-white">{preset.label}</div>
                        <div className="text-[10px] text-gray-500">{preset.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

              <ActionButton disabled={isCreatingKey} onClick={handleCreateSessionKey}>
                {isCreatingKey ? "Creating…" : "Create Session Key"}
              </ActionButton>
            </div>
          </Card>

          <Card>
            <SectionHeader title="POLICY PREVIEW" subtitle="JSON draft" />
            <pre className="mt-6 text-xs text-gray-400 bg-black/60 border border-white/10 rounded-lg p-4 overflow-auto max-w-full break-all whitespace-pre-wrap">
{JSON.stringify(policyPreview, null, 2)}
            </pre>
          </Card>
        </section>

        <section>
          <div className="mb-4">
            <SectionHeader title="ACTIVE SESSION KEYS" subtitle="Tracked policies" />
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              placeholder="Track a session key address"
              value={trackedKeyInput}
              onChange={(e: any) => setTrackedKeyInput(e.target.value)}
            />
            <ActionButton onClick={handleTrackKey}>Track</ActionButton>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {trackedKeys.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs font-mono text-gray-400">
                No tracked session keys yet.
              </div>
            )}
            {trackedKeys.map((key: any) => {
              const policy = trackedPolicies[key];
              const now = Math.floor(Date.now() / 1000);
              const isActive = policy?.active && (!policy?.validUntil || Number(policy.validUntil) === 0 || Number(policy.validUntil) >= now);
              return (
                <div
                  key={key}
                  className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs font-mono text-gray-400"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white">{truncateAddress(key)}</span>
                    <span className="uppercase tracking-[0.2em] text-[10px]">
                      {policy?.error ? "Error" : isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div>Valid After: {formatTimestamp(policy?.validAfter)}</div>
                    <div>Valid Until: {formatTimestamp(policy?.validUntil)}</div>
                    <div>Max Value: {formatBigInt(policy?.maxValuePerCall)}</div>
                    <div>Cumulative Limit: {formatBigInt(policy?.cumulativeValueLimit)}</div>
                    <div>Used: {formatBigInt(policy?.cumulativeValueUsed)}</div>
                    <div>Selectors: {formatBigInt(policy?.selectorCount)}</div>
                  </div>
                  <div className="mt-4">
                    <ActionButton disabled={isRevoking === key} onClick={() => handleRevokeKey(key)}>
                      {isRevoking === key ? "Revoking…" : "Revoke"}
                    </ActionButton>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
