
<h1 align="center">🚀 Synapse Yield</h1>

<p align="center">
  <strong>Maximize Your DeFi Yield on Monad with Automated Optimization & Enhanced Security</strong><br>
  <em>Built on the Monad Testnet using Account Abstraction (AA) and MetaMask Delegation Toolkit</em>
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-38B2AC?logo=tailwindcss&logoColor=white" /></a>
  <a href="https://pimlico.io/"><img src="https://img.shields.io/badge/Pimlico-9146FF?logo=ethereum&logoColor=white" /></a>
  <a href="https://metamask.io/"><img src="https://img.shields.io/badge/MetaMask-F6851B?logo=metamask&logoColor=white" /></a>
  <a href="https://monad.xyz/"><img src="https://img.shields.io/badge/Monad%20Testnet-4B0082?logo=polygon&logoColor=white" /></a>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&logoColor=white" /></a>
</p>

---

## 🧭 Overview

Synapse Yield is a decentralized application on the **Monad Testnet** that automates DeFi yield optimization using **Account Abstraction (AA)** and the **MetaMask Delegation Toolkit**.  
It lets users **stake, swap, and rebalance** across integrated protocols like **Kintsu** and **Magma**, either manually or automatically via a **keeper service**.

> 🔗 **Live Demo:** [Synapse-Yield](https://synapse-yield.vercel.app/)

---

## ✨ Key Features

- **Smart Account Management** — Create and manage a dedicated MetaMask Smart Account for all DeFi activity.
- **🛡️ Secure Delegation (Non-Custodial)** — Scoped permissions for backend automation without exposing private keys.
- **Staking & Unstaking** — Interact with **Kintsu (sMON)** and **Magma (gMON)** seamlessly via delegated transactions.
- **🔄 Token Swapping** — Swap between MON-family tokens using **PancakeSwap Universal Router**.
- **🤖 Automated Yield Optimization (Keeper)** — Vercel Cron-driven rebalancing towards high-APY protocols.
- **💸 Fund Management** — Deposit/withdraw MON-family tokens from Smart Accounts via **gas-sponsored** transactions.
- **📊 Activity Feed** — View live protocol activity (staking, swaps, rebalances) using **Envio Indexer**.
- **🔒 SIWE Authentication** — Secure sign-in with Ethereum, backed by server-managed sessions.
- **🎨 Polished UI/UX** — “Liquid Synapse” theme built with **Next.js**, **Tailwind**, and **Framer Motion**.

---

## 🛡️ Security Features & Delegation Scope

**Security Highlights:**

- ✅ **Non-Custodial:** Assets remain in user-controlled Smart Accounts.
- ✅ **Scoped Delegation:** Limits backend access to specific contracts & functions.
- ✅ **No Key Sharing:** Only signed authorizations are used—private keys never exposed.
- ✅ **Secure Storage:** Delegate key & session secrets stored server-side (never client-exposed).

**Delegation Scope (`createStakingDelegation`):**
- **Targets:** Kintsu, Magma, WMON, gMON, Permit2, PancakeSwap Router  
- **Allowed Functions:**  
  - `depositMon`, `withdrawMon`, `deposit`, `requestUnlock`, `redeem`  
  - ERC20 actions (`approve`, `transfer`, `transferFrom`)  
  - Permit2 approvals, `execute` (PancakeSwap), `deposit/withdraw` (WMON)
- **Allows:** Delegated staking/swapping under user consent  
- **Prevents:** Unauthorized transfers, calls outside scope

---

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|---------------|
| **Frontend** | Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion |
| **Blockchain** | Wagmi, Viem, RainbowKit |
| **AA & Delegation** | Permissionless.js, Pimlico, MetaMask Delegation Toolkit |
| **Backend** | Next.js API Routes, MongoDB, Mongoose |
| **Automation** | Node.js (Keeper Script), Vercel Cron Jobs |
| **Indexing & Data** | Envio, Apollo Client |
| **Authentication** | SIWE + Iron Session |

---

## ⚙️ Core Workflow

1. **Connect & Sign In:** User connects wallet and signs with SIWE.
2. **Smart Account Setup:** Derived MetaMask Smart Account via deterministic salt.
3. **Delegation:** User signs EIP-712 `Delegation` defining contract/function access.
4. **Action Execution:** Backend validates & constructs `UserOperations` → signed with delegate key → submitted to **Pimlico Bundler**.
5. **Transaction Execution:** Bundler sends transactions to Monad EntryPoint.
6. **Keeper Automation:** Scheduled rebalancing and yield optimization for opted-in users.

---

## 🗺️ App Structure

| Route | Description |
|--------|--------------|
| `/` | Landing Page — intro and feature overview |
| `/dashboard` | Smart Account + Delegation setup, portfolio summary |
| `/manage-funds` | Deposit & withdraw MON/WMON/sMON/gMON |
| `/stake` | Stake/unstake MON-family tokens |
| `/swap` | Swap MON-family tokens via PancakeSwap |
| `/yield-optimizer` | Trigger rebalances manually or automatically |
| `/activity` | View protocol & keeper activity feed |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm / pnpm / yarn
- Wallet with Monad Testnet configured (Chain ID: **10143**)

### Setup

```bash
git clone https://github.com/akm2006/synapse-yield.git
cd synapse-yield
npm install
````

### Environment Variables

Create `.env.local` in the project root:

```env
# Monad Testnet
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.monad.xyz/
NEXT_PUBLIC_CHAIN_ID=10143

# Pimlico
PIMLICO_API_KEY=YOUR_PIMLICO_API_KEY
NEXT_PUBLIC_PIMLICO_API_KEY=YOUR_PIMLICO_API_KEY
NEXT_PUBLIC_PIMLICO_BUNDLER_URL=https://api.pimlico.io/v2/10143/rpc?apikey=YOUR_PIMLICO_API_KEY

# WalletConnect
NEXT_PUBLIC_PROJECT_ID=YOUR_WALLETCONNECT_PROJECT_ID

# Backend
DELEGATE_PRIVATE_KEY=0x...
MONGODB_URI=mongodb+srv://...
SESSION_PASSWORD=YOUR_SECURE_IRON_SESSION_PASSWORD
CRON_SECRET=YOUR_SECURE_CRON_SECRET
```

Then run the dev server:

```bash
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

> ⚠️ **Security Note:** Keep secrets private. Use environment variables on Vercel or similar secure hosting.

---

## 🔮 Testnet → Mainnet Migration Guide

| Area             | Testnet                  | Mainnet                             | Notes                            |
| ---------------- | ------------------------ | ----------------------------------- | -------------------------------- |
| **Network**      | Monad Testnet (10143)    | Update to Mainnet RPC/Chain ID      | Modify in `src/lib/chain.ts`     |
| **Contracts**    | Testnet Deployments      | Verified Mainnet versions           | Update in `src/lib/contracts.ts` |
| **APY Logic**    | Simulated                | Real-time fetched from chain        | Needed for yield accuracy        |
| **Keeper Logic** | Simple ratio rebalancing | APY-aware smart allocation          | Core to mainnet ROI              |
| **Transactions** | Sequential UserOps       | Potential atomic bundling           | Improves UX                      |
| **Security**     | Dev keys                 | Harden, audit, restrict delegation  | Must-have for production         |
| **AA Infra**     | Pimlico Testnet          | Pimlico Mainnet                     | Evaluate paymaster cost          |
| **Indexer**      | Envio Testnet            | Mainnet endpoint                    | Adjust Apollo config             |
| **UI/UX**        | Basic                    | Add confirmations, slippage, gas UI | Mainnet trust requirement        |
| **Testing**      | Minimal                  | Add integration & e2e tests         | Prevent regressions              |

---

## 📜 License

Licensed under the **MIT License** — free to use, modify, and build upon.

---


<p align="center">
  <sub>Built on Monad using MetaMask Delegation Toolkit.</sub><br>
  <sub>© 2025 Synapse Yield</sub>
</p>
```


