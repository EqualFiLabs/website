---
title: "IDENTITY_AS_ASSET"
date: "2026.02.08"
excerpt: "Agent Wallet Core is a neutral, protocol-agnostic account layer for agents – a public good that Equalis also uses under the hood."
---

Most wallet systems today are either:

- tightly coupled to a specific protocol or product, or
- designed only for a single human at a time.

As we move into an "agentic" world – bots, services, DAOs, and human+AI hybrids acting onchain – we need accounts that treat **identity as a first-class asset**, without locking anyone into a particular protocol.

**Agent Wallet Core (AWC)** is our attempt at that: a small, composable account layer for agents that is:

- **protocol-agnostic** – works with any DeFi, NFT, or onchain system,
- **standards-based** – built on open Ethereum standards, not custom plumbing,
- **open-source and neutral** – no token, no rent extraction, and
- **dogfooded by us** – Equalis uses AWC, but AWC does not depend on Equalis.

The goal is simple: make it easy to give an agent a durable onchain identity and a safe way to act, without forcing you into our stack.

---

### Design Goals

1. **Protocol neutrality**  
   AWC does not assume Equalis, or any other specific protocol, is present. It exposes generic hooks and permissions that any application can integrate with. Equalis is just one consumer of these capabilities, not a special case.

2. **Stable identity**  
   Agents should have an identity that can persist over time, accrue history, and be inspected or audited when needed. In our reference implementation, that identity is represented as an ERC-721 agent record in an ERC-8004 `IdentityRegistry`, and usually bound 1:1 to a token-bound or smart account.

3. **Scoped permissions and safety**  
   Most of the risk in "agentic" systems comes from overpowered keys. AWC is built around the idea that:

   - permissions should be **granular** (e.g., specific contracts, methods, and limits),
   - delegation should be **time- and scope-bounded**, and
   - revocation should be straightforward.

   Using ERC-6900-style modular accounts and session keys, you can give an agent a budget or a role, not your entire wallet.

4. **Composability and reuse**  
   AWC is intended as a piece of infrastructure you can pick up and reuse in your own systems. If you are building an agent framework, an automation layer, or a smart account product, you should be able to:

   - plug in your own policy modules,
   - integrate with your preferred protocols,
   - and still benefit from a shared, battle-tested base.

---

### How It Works (High Level)

At a high level, an AWC-based setup looks like this:

1. **Identity**
   - An agent is represented by an ERC-721 record in an ERC-8004 Identity Registry (`agentId`).
   - That registry also stores an `agentWallet` metadata field pointing to the onchain account that holds assets and executes actions for that agent.
   - In Equalis, that `agentWallet` is typically a token-bound, ERC-6900 modular smart account.

2. **Modules / Permissions**
   - The `agentWallet` exposes a modular interface for authorization.
   - Policy modules define *who* (which keys, services, or other contracts) can do *what* (which methods, on which contracts, with what limits).
   - Session keys or scoped delegates can be created for specific tasks (e.g., "rebalance this position once a day within these bounds").

3. **Execution**
   - When an action is requested (by a human, an offchain agent, or another contract), it is checked against the active policies on the `agentWallet`.
   - If allowed, the transaction is executed through that account, so all activity is tied back to the agent’s identity (its ERC-8004 `agentId`).

The result: you can reason about an agent as a single, named identity with a clear policy surface and a dedicated balance sheet, instead of a tangle of ad-hoc keys and scripts.

---

### ERC-8004: Trustless Agents

ERC-8004 is a standard for **discovering and trusting agents onchain**. It defines three registries that can be deployed once per chain:

1. **Identity Registry**  
   An ERC-721 contract where each `agentId` is an NFT representing an agent. It stores:

   - `agentURI` – a pointer to the agent’s registration file (JSON) describing services, endpoints (web, MCP, A2A, ENS, DIDs, etc.), and supported trust models.
   - arbitrary on-chain metadata via `getMetadata` / `setMetadata`.
   - a reserved `agentWallet` key, which is the onchain address where the agent receives funds or executes from.

   The agent owner (NFT owner or approved operator) can:

   - update `agentURI` as the agent evolves,
   - change `agentWallet` by proving control of the new wallet using:
     - **EIP-712** signatures for EOAs / 7702-style delegated EOAs, or
     - **ERC-1271** for smart contract wallets.

   When the agent NFT is transferred, `agentWallet` is automatically cleared and must be re-verified by the new owner.

2. **Reputation Registry**  
   A contract where any client address can submit feedback about an `agentId`:

   - feedback is a signed `value` + `valueDecimals` (e.g., stars, uptime, success rate),
   - optional tags (`tag1`, `tag2`), endpoints, and an off-chain feedback URI + hash,
   - self-feedback from the agent owner or operators is explicitly disallowed.

   This lets others build on-chain and off-chain reputation systems around agents, using open data as a public good.

3. **Validation Registry**  
   A contract where an agent owner can request validation from a specific validator address:

   - requests identify an `agentId`, a `validatorAddress`, a `requestURI`, and a `requestHash` (commitment to the payload),
   - validators respond with a `response` (0–100), optional `responseURI` and `responseHash`, and a `tag`.

   This is meant for higher-stakes checks: stake-secured re-execution, zkML verification, TEEs, or external auditors.

Together, these three registries give every agent a portable identity, a public reputation surface, and a way to plug into independent validation systems.

---

### How Equalis Uses ERC-8004

Equalis uses ERC-8004 as the **registry layer** for agents, and Agent Wallet Core as the **account + policy layer**.

Concretely:

1. **Identity and Wallet Binding**

   - We deploy an `IdentityRegistryUpgradeable` contract that implements the ERC-8004 Identity Registry.
   - When an agent registers via `register(...)`, the registry:
     - mints an ERC-721 `agentId` NFT to the caller,
     - sets `agentWallet` metadata to `msg.sender` (the wallet that called `register`).
   - In our AWC flow, `msg.sender` is usually a **token-bound modular smart account** (MSCA) rather than a bare EOA.

   This is exercised end-to-end in `PositionMSCAForkIntegration.t.sol`:

   - we create a 6551 account for a `Position` NFT,
   - that account calls `IdentityRegistry.register("ipfs://...")` via `IERC6900Account.execute`,
   - the Identity Registry mints an `agentId` owned by the account and records the account as `agentWallet`.

2. **Agent as Asset + Account**

   In this setup:

   - The **agent identity** is the ERC-721 `agentId` in the Identity Registry.
   - The **agent wallet** is the 6551/6900 MSCA address stored in `agentWallet`.
   - Control flows from the **human/NFT owner → MSCA → agentId + agentWallet**.

   Because `setAgentWallet` supports both EOAs (EIP-712) and contract wallets (ERC-1271), we can:

   - rotate the agent’s wallet to a new smart account,
   - migrate to different account standards (e.g., 4337-style) in the future,
   - or even point lower-stakes agents at EOAs when appropriate.

3. **Reputation and Validation (Pluggable)**

   - The **Reputation Registry** lets users and other agents attach feedback to our agents’ `agentId`s, with on-chain filters by tags and reviewer sets.
   - The **Validation Registry** lets us (or third parties) request formal validation of an agent’s behavior from independent validators.

   Equalis itself does not enforce a specific reputation or validation provider. Instead, we:

   - treat these registries as open data surfaces,
   - expect multiple scoring/validation providers to emerge,
   - and let integrators choose how much weight to give each trust signal.

---

### Relationship to Equalis

Equalis uses Agent Wallet Core for its own agents and automations, and anchors those agents in an ERC-8004 Identity Registry, but AWC is **not** tied to Equalis-specific logic:

- You can use AWC with other lending protocols, DEXs, yield strategies, or custom contracts.
- You can register your agents in ERC-8004 and still point their `agentWallet` at a completely different stack.
- If Equalis disappeared, AWC and the ERC-8004 registries would remain valid, open-source components for the ecosystem.

We view AWC + ERC-8004 support as a **public good**:

- The contracts are MIT-licensed so others can adopt, fork, and extend them.
- There is no separate token or fee mechanism attached to the registries themselves.
- Our incentive to maintain them is straightforward: we rely on them for our own infrastructure, and we benefit when others help improve them.

---

### Who Might Use AWC?

A few concrete examples:

- **Protocol teams** that want safer, more expressive smart accounts for their users without building their own wallet stack.
- **Agent platforms** that need a consistent, onchain representation of agents, with clear permission boundaries and neutral registry infrastructure.
- **Funds or DAOs** that want to delegate limited powers to automated strategies or external managers while keeping full-account keys offline.
- **Developers experimenting with AI or offchain agents** who want a clean, auditable way for those agents to act onchain and be discovered in 8004-compatible explorers.

If any of those describe you, you should be able to pick up AWC and our ERC-8004 implementation as neutral building blocks – with Equalis as one optional integration point, not the center of gravity.

---

### Closing

Agent Wallet Core is intentionally modest in scope: it does not try to define what agents should do, or which protocols they should use. It focuses on a narrower question:

> How do we give agents a durable, auditable, and safe onchain identity that anyone can build on?

ERC-8004 complements that by standardizing how agents are **discovered and trusted** across the wider ecosystem.

Everything else – strategy, risk, economics – is left to the systems that plug into these layers. That’s by design.
