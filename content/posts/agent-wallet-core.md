---
title: "IDENTITY_AS_ASSET"
date: "2026.02.08"
excerpt: "Agent Wallet Core is a neutral, protocol-agnostic account layer for agents – a public good that Equalis also uses under the hood."
---

# Agent Wallet Core: Onchain Authorization for Autonomous Agents

**A technical explainer on how we're approaching agent wallet safety**

---

## The Problem

AI agents are starting to operate onchain. They're trading, managing positions, executing strategies. But the infrastructure for how they hold and use assets hasn't caught up.

Today, most agents operate in one of two ways:

**Full private key access.** The agent controls an EOA with complete authority. It can do anything: transfer funds, sign arbitrary transactions, drain the wallet. If the agent is compromised, misconfigured, or just makes a mistake, there's no limit to the damage.

**No onchain access.** The agent can suggest actions, but a human must sign every transaction. This is safe but defeats the purpose. An agent that can't act autonomously isn't an autonomous agent.

Neither option is acceptable for agents managing meaningful value. We need something in between: agents that can act within defined bounds, with authorization that can be scoped, monitored, and revoked.

---

## Our Approach

Agent Wallet Core is a smart account framework designed for autonomous agents. It gives agents the ability to operate onchain with scoped authorization, while giving owners the ability to define and enforce policy.

The core idea: instead of giving an agent a private key, you give it a session key with a policy attached. The policy defines what the agent can do, for how long, with what budget. The smart account enforces the policy onchain. If the agent tries something outside its bounds, the transaction fails.

This isn't a new concept. Session keys and smart accounts have existed for a while. What we've built is a specific composition of existing standards that we think works well for the agent use case.

---

## How It Works

Agent Wallet Core composes seven Ethereum standards into a unified account architecture:

**ERC-6551 (Token Bound Accounts):** Every account is bound to an NFT. The NFT determines who owns the account. Transfer the NFT, transfer the account. No stored owner state, no admin keys. Ownership is always resolved live from the token.

**ERC-6900 (Modular Smart Contract Accounts):** All authorization logic lives in installable modules. The account itself makes no decisions about what's permitted. Validation modules determine whether a given action is allowed. Execution modules extend what the account can do. This makes the system extensible without modifying the core account contract.

**ERC-4337 (Account Abstraction):** The account participates in the standard UserOperation mempool. Bundlers submit operations to the EntryPoint. This enables gasless transactions, batched operations, and the session key flows that make agent operation practical.

**ERC-1271 (Signature Validation):** Smart contract signature verification. This allows the account to authenticate to offchain services, which becomes important for agents that need to interact with APIs.

**ERC-8128 (Signed HTTP Requests):** Agents can authenticate HTTP requests using their onchain identity. An agent runtime can call an indexer or analytics API and prove it controls a specific account. This bridges onchain identity to offchain services.

**ERC-8004 (Agent Identity):** Optional onchain identity registration. An account can register as a named agent with metadata, making it discoverable by other systems.

**ERC-6492 (Counterfactual Signatures):** Signature verification for accounts that haven't been deployed yet. An agent can prove it controls an account before that account exists onchain. This enables onboarding flows where authorization is configured before the account is deployed, and supports signature validation from smart contract owners that may themselves be undeployed.

These standards weren't designed to work together, but they compose cleanly. Each handles one concern. The account is the intersection point.

---

## The Authorization Model

The practical core of Agent Wallet Core is the session key system.

An owner installs a `SessionKeyValidationModule` on their account. They then create a session policy for a specific key, defining:

- **Time window:** When the session is valid (start time, end time)
- **Value limits:** Maximum value per transaction, cumulative budget
- **Target restrictions:** Which contracts the session key can call
- **Selector restrictions:** Which functions on those contracts are permitted
- **Per-target rules:** Fine-grained selector permissions per contract

When an agent submits a UserOperation signed with a session key, the module checks:

1. Is the policy active and within its time window?
2. Is the target contract in the allowed list?
3. Is the function selector permitted?
4. Is the value within the per-call and cumulative limits?

If any check fails, the transaction reverts. The agent cannot exceed its policy bounds at the protocol level.

Owners can revoke a specific session key at any time. They can also revoke all session keys for an account in a single transaction by incrementing an epoch counter. Revocation is immediate and onchain.

---

## What This Enables

With this architecture, an agent can:

- Execute predefined strategies within budget limits
- Update positions on a schedule without human intervention
- Respond to market conditions in real time
- Authenticate to offchain services to gather data
- Operate 24/7 without exposing the owner's private key

And the owner retains:

- Full control over what the agent can do
- Ability to revoke access instantly
- Visibility into what the agent has done (all actions are onchain)
- Ownership transferability (transfer the NFT, transfer everything)

---

## Tradeoffs and Limitations

We think this is a good approach, but it's not the only approach and it has real tradeoffs.

**Pros:**

- *Onchain enforcement.* Policies are enforced by the smart contract, not by trusting the agent to respect limits. A compromised agent cannot exceed its policy.
- *Standard composition.* We're using existing, audited standards (ERC-4337, ERC-6551, etc.) rather than inventing new primitives. This reduces surface area for novel bugs.
- *Modularity.* The validation module system means new authorization patterns can be added without changing the core account. Different use cases can use different modules.
- *Transferable identity.* Because accounts are NFT-bound, entire agent setups can be transferred atomically. This is useful for selling strategies, transferring operations, or recovering from key compromise.
- *No admin keys.* The account has no privileged roles. Ownership is determined by the NFT. This removes a class of trust assumptions.
- *Counterfactual ready.* Accounts can validate signatures before deployment, enabling gasless onboarding and pre-configuration of agent policies.

**Cons:**

- *Complexity.* Seven standards is a lot of moving parts. Understanding how they interact requires significant context. This is a real barrier to adoption.
- *Gas overhead.* Modular validation and session key checks add gas cost compared to a simple EOA transaction. For high-frequency operations, this matters.
- *Not battle-tested.* This is new infrastructure. We've tested extensively, but it hasn't been through the crucible of mainnet adversarial conditions.

---

## Alternatives

We're not the only team thinking about this problem. Other approaches include:

**Multisig with agent as signer:** The agent is one key in a multisig. Requires human co-signing for actions. Safer but not autonomous.

**Offchain policy enforcement:** The agent checks its own permissions before acting. Simpler but relies on trusting the agent software.

**Trusted execution environments:** The agent runs in a TEE with restricted capabilities. Strong isolation but introduces hardware trust assumptions.

**Intent-based systems:** The agent expresses intents, a solver executes them. Shifts trust to the solver network.

Each approach has different trust assumptions and capability tradeoffs. We think onchain policy enforcement with modular smart accounts is a good balance of safety and capability, but reasonable people can disagree.

---

## Implementation Status

Agent Wallet Core is implemented and tested. The codebase includes:

- Core account contracts (`ERC721BoundMSCA`, `ResolverBoundMSCA`)
- Four validation modules (Owner, SessionKey, SIWA, ERC8128AA)
- Policy registry for session management
- ERC-8004 identity adapter
- ERC-6492 counterfactual signature support
- Comprehensive test suite including property-based fuzzing

The contracts are being deployed to Arbitrum Sepolia for public testing. We'll share the deployment addresses and a demo application when ready.

The code will be open source. We want this to be infrastructure that others can build on, audit, and improve.

---

## What's Next

In the near term:

- Public testnet deployment
- Demo application showing agent operation through AWC
- Documentation for integrators

Longer term, we're exploring:

- Paymaster integration for gasless agent operations
- Cross-chain account binding
- Richer policy primitives for complex authorization patterns
- Integration with agent frameworks and runtimes

If you're building agents that need onchain authorization, we'd like to hear from you. The problem space is large and we don't have all the answers.

---

## Conclusion

Agent wallet safety is going to be an increasingly important problem as autonomous agents handle more value onchain. The current options of full key access or no access aren't sufficient.

Agent Wallet Core is our attempt at a middle path: agents that can act autonomously within defined bounds, with onchain policy enforcement, revocable authorization, and transferable identity.

It's not the only solution and it won't be the last. But we think the approach is sound, the implementation is solid, and the problem is worth solving.

If you want to dig deeper, the architecture documentation covers the full technical design. If you want to try it, the testnet deployment is coming soon.

---

*Agent Wallet Core is developed by EqualFi Labs and released under MIT license.*
