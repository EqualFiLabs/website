---
title: "The Lie"
date: "2026.02.05"
excerpt: "Why User Agency, AI and Deterministic Finance matter."
---

# The Lie We Were Sold

There's a story we've been told our whole lives. It goes like this: finance is complicated, risk is dangerous, and you need professionals to protect you from yourself. Banks, brokers, fund managers, lending platforms. They exist because you can't be trusted with your own money.

This story is a lie. A useful one, if you're sitting on the right side of it.

The financial system doesn't protect you. It positions itself between you and your wealth, takes a cut of every movement, and uses your deposits to make bets you never agreed to. When those bets pay off, the gains go to shareholders and bonuses. When they fail, you get bailouts funded by your taxes or, if you're lucky, a fraction of your deposits back after years in receivership.

This isn't a bug. It's the product.

---

## DeFi Was Supposed to Be Different

When I first encountered decentralized finance, I thought I was looking at the exit. Permissionless. Transparent. No intermediaries extracting rent just for existing.

But look at what we actually built.

Lending protocols that liquidate users during volatility, creating cascading failures that benefit liquidation bots over depositors. Oracle systems that concentrate power in whoever controls the price feed. Governance tokens that give whales control over parameters that determine whether you get liquidated. DEXs where every trade is a MEV extraction opportunity.

We removed the banker and replaced them with smart contracts that encode the same extractive patterns. The extraction just got faster and more automated.

The person depositing their savings into a lending protocol doesn't understand that they're the liquidity being farmed. The trader hitting a DEX doesn't realize they're the prey in a mempool hunting ground. The borrower watching their health factor doesn't know that the liquidation threshold was set to maximize protocol revenue, not protect them.

We told ourselves we were building financial freedom. We built a more efficient extraction machine.

---

## What If It Didn't Have to Be This Way?

Here's a question I couldn't stop asking: what if we just let users borrow what they deposit?

It sounds almost stupid when you say it out loud. You deposit ETH, you borrow ETH. Against yourself. No interest, because who would you pay interest to? No liquidation, because there's nothing to liquidate. Your collateral is the loan.

No oracle needed. No liquidation engine. No one sitting in the middle deciding when to take your collateral.

This isn't hypothetical. It works. And once you see it, you start asking harder questions.

Why do lending protocols charge interest on self-collateralized loans? Because they can. Because you've been told this is how lending works. Because no one offered you an alternative.

Why do positions get liquidated during volatility? Not to protect you. To protect the protocol's solvency. And to create profit opportunities for liquidators who pay fees to the protocol. Your liquidation is their revenue event.

Why do DEXs use designs that guarantee you'll get sandwiched? Because MEV extraction is the real business model. Your trade is the product being sold.

Every intermediary that inserts itself between you and your financial activity extracts rent for that position. The extraction is the point.

---

## Agency Is the Answer

The alternative isn't better intermediaries. It's no intermediaries.

User agency means you hold your assets, you set your terms, you make your decisions. No one can liquidate you because of an oracle price. No one can sandwich your trade because they saw it in a mempool. No one can change the rules after you've committed capital.

This sounds good until you hit the real objection: managing your own financial positions is hard. Evaluating counterparties, monitoring collateral ratios, rolling loans, exercising options at optimal times. This is why people hire fund managers. This is why they use banks. Not because they love paying fees but because the complexity is real.

And historically, this objection was valid. Managing sophisticated financial positions required either professional expertise or significant time investment. Most people have neither.

But that's changing.

---

## AI Changes the Game

Here's what I believe: within the next few years, AI agents will be capable of managing complex financial positions on behalf of their human counterparts.

Not the chatbots you're using today. Not "AI-powered" dashboards that are really just better UIs. Actual autonomous agents that can evaluate counterparties based on onchain history, execute strategies across multiple positions, monitor and adjust in real time, and do it 24 hours a day without fatigue or emotion.

The technology isn't fully there yet. Current agents are too brittle for high-stakes financial operations. They hallucinate. They miss edge cases. They can't reason reliably about adversarial environments.

But progress is happening faster than most people realize. The gap between "impressive demo" and "reliable enough to trust with money" is closing. And the infrastructure being built today will determine whether those agents serve users or serve platforms.

If agents operate on extractive infrastructure, they'll just automate the extraction. Faster liquidations. More efficient MEV. Better optimized fee harvesting.

But if agents operate on infrastructure designed for user agency, they become something else entirely. They become the great equalizer. Suddenly, sophisticated financial management isn't reserved for people with $100 million and a family office. It's available to anyone with a wallet and an agent.

---

## What This Requires

For this future to work, the infrastructure has to have certain properties.

**Deterministic settlement.** Agents need to reason about what states are possible. If an oracle can change their position unexpectedly, or a governance vote can alter parameters mid-strategy, they can't plan reliably. Settlement has to be predictable.

**No privileged operators.** If there's an admin key that can pause withdrawals or change fee structures, agents can't trust the system. Neither can users. The infrastructure has to be credibly neutral.

**Physical settlement.** Cash settlement requires oracles. Oracles require trust in operators. Physical settlement, where actual assets change hands at predetermined terms, removes that dependency.

**Progressive immutability.** Early-stage protocols need the ability to fix bugs. But mature infrastructure should ossify. The goal is systems that don't need ongoing management because there's nothing left to manage.

These aren't features. They're requirements. Without them, AI-augmented finance just becomes AI-augmented extraction.

---

## The Path From Here

I'm building this. Not because I think it'll make me rich, but because I believe it should exist.

The thesis is simple: finance doesn't have to be extractive. Intermediaries don't have to exist. Users can have agency over their own assets and positions. And AI will make it possible for ordinary people to exercise that agency without needing professional expertise.

We're early. The agents aren't ready. The infrastructure is still being built. The existing system has massive inertia and will fight to maintain its position.

But the direction is clear. Ethereum gives us credibly neutral settlement. Cryptography gives us self-custody. Smart contracts give us programmable agreements. And AI, soon, will give us the cognitive leverage to actually use all of it.

The lie we were sold is that we need to be protected from ourselves. The truth is that we needed to be protected from them.

That protection is being built now.

