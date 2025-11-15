# **HypurrFi Bounty Hunt**

One-Click Leverage Loops, Yield Optimizers, and DCA hooks with HypurrFi Lending Markets

---

## **1\. Problem Statement**

HyperEVM traders want **leveraged spot exposure and stable cashflow** without manually juggling deposits, borrows, and health factors across markets. HypurrFi already provides pooled and isolated lending markets plus USDXL, a hybrid-backed synthetic dollar for clean leverage loops on Hyperliquid. But today, users still have to click through complex flows to build and maintain these loops themselves.

There is an opportunity to build a **strategy layer** on top of HypurrFi that turns these primitives (deposit, borrow, loop, deleverage) into a simple “one-click” product with safer defaults and clear risk controls.

---

## **2\. Goal / What to Build**

Build a **strategy vault or smart-contract system** that creates and manages **leveraged lending loops, yield optimization, or DCA hooks.** At a high level, your system should:

- Accept user deposits (e.g., HYPE, stHYPE, stablecoins)
- Use HypurrFi’s **pooled markets** to open a position
  - This can automatically Allocate to the highest yield asset
  - This can also be a one click leverage loop built on top of our Pooled markets.
- Track health factor and provide a way to **rebalance or deleverage** when risk gets too high
- Expose a simple interface (contract \+ optional frontend) so users can open, view, and close positions without understanding every underlying step.

You are free to design the exact strategy (e.g., levered HYPE long, USDXL farming, stable loops), as long as it is built **on top of HypurrFi’s markets and contracts.**

---

## **3\. Core Requirements (Acceptance Criteria)**

- **Vault / Strategy Contract**

  - A smart contract (e.g., ERC-4626/7540-style or custom) that:
    - Accepts at least one HypurrFi-listed asset as deposit (e.g., HYPE, stHYPE, USDT0, USDC, USDXL, etc.)
    - Mints a receipt token or otherwise tracks user shares in the strategy.

- **Integration with HypurrFi**

  - On deposit, the contract must interact with HypurrFi’s **Pool** (or relevant market contracts) to:
    - Supply collateral.
    - Borrow against that collateral.
    - Optionally re-supply borrowed assets to achieve your targets.

- **Health Factor & Risk Management**

  - The strategy must:
    - Track each user’s (or the vault’s) **health factor / risk level** using HypurrFi data.
    - Provide at least one function (e.g., `rebalance()`, `delever()`, or similar) that:
      - Repays part of the debt and/or withdraws collateral.  
        Moves the position back to a safer target parameter (e.g., target LTV / health factor).

- **Position Lifecycle**

  - Users must be able to:
    - Deposit into the strategy.
    - View their position or share (even if via a simple hardhat script/CLI or minimal UI).
    - Fully exit the strategy, unwinding the loop and withdrawing underlying assets (minus fees, if any).

- **Runs on HyperEVM**

  - The solution must be deployable and runnable on **HyperEVM** (testnet or mainnet), using the official HypurrFi contracts and addresses where appropriate.

- **Security & Safety Constraints**

  - The strategy must:

    - Restrict interactions to HypurrFi \+ whitelisted assets/contracts (no arbitrary call-outs to unknown protocols by default).
    - Gracefully handle obvious failure modes (e.g., reverting if leverage would push HF \< 1 at open or rebalance). [HypurrFi+1](https://docs.hypurr.fi/developers/smartcontracts/core/pool?utm_source=chatgpt.com)

---

## **4\. Deliverables**

What teams need to submit:

- **GitHub repo** (public or private with access granted to judges)
- **README** with:
  - High-level architecture & strategy explanation
  - Setup instructions (how to deploy, how to run basic flows)
  - Any assumptions or limitations
- **Short demo video (≤ 3 minutes)** showing:
  - A user depositing into the strategy.
  - The protocol opening or modifying the position.
  - Viewing position info.
  - Fully exiting the position.

If you add extra components (risk dashboards, analytics, Telegram/Discord bots, etc.), include them in the README.

---

## **5\. Bounty / Prize**

**Amount:** $5,000  
**Distribution:** 1st place: $2,500 | 2nd place: $1,500 | 3rd place: $1,000

---

## **6\. Judges**

- **Sponsor:** Kurt, HypurrFi
- **Mentor:** Jonathan, Coinfund

---

## **7\. Technical Notes / Helpful Links**

- HypurrFi Overview:
  - [https://docs.hypurr.fi/introduction/hypurrfi](https://docs.hypurr.fi/introduction/hypurrfi?utm_source=chatgpt.com)
- Developer Contract Addresses (HyperEVM mainnet):
  - [https://docs.hypurr.fi/developers/addresses HypurrFi](https://docs.hypurr.fi/developers/addresses?utm_source=chatgpt.com)
- Core Pool & Smart Contract Docs (supply/borrow/withdraw/flashloan/etc.):
  - [https://docs.hypurr.fi/developers/smartcontracts/core/pool HypurrFi](https://docs.hypurr.fi/developers/smartcontracts/core/pool?utm_source=chatgpt.com)
- Oracle / Price Feeds (for health factor calculations & risk):
  - [https://docs.hypurr.fi/primitives/oracle HypurrFi](https://docs.hypurr.fi/primitives/oracle?utm_source=chatgpt.com)

You may also inspect HypurrFi contracts directly in block explorers for ABI & function signatures.

---

## **8\. Stretch Goals (Optional Bonus Points)**

Not required, but extra credit if you:

- Integrate **USDXL** in a meaningful way (e.g., minting USDXL from collateral and looping or providing USDXL liquidity elsewhere).

- Integrate with other **HyperEVM-native protocols** to route extra yield, while keeping HypurrFi as the core leverage layer.

---

## **9\. Evaluation Criteria (How Judges Score)**

**Judges score on:**

- **Impact & Ecosystem Fit**
  - Does this make HypurrFi and HyperEVM more useful for real users?
- **Execution & User Experience**
  - Is it smooth to deposit, see what’s happening, and exit?
- **Technical Creativity & Design**
  - Is the strategy well-designed? Are risk controls thoughtful?
- **Completeness & Demo Quality**
  - Does it actually run end-to-end on HyperEVM and clearly demonstrate value?