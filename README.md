<p align="center">
  <img src="./public/logo.png" alt="Synapse Yield Logo" width="140" />
</p>

<h1 align="center">Synapse Yield</h1>

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
  <a href="https://envio.dev/"><img src="https://img.shields.io/badge/Indexed_by-Envio-FF69B4?logo=graphql&logoColor=white" /></a>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel&logoColor=white" /></a>
</p>

---

## 🧭 Overview

Synapse Yield is a decentralized application on the **Monad Testnet** that automates DeFi yield optimization using **Account Abstraction (AA)** and the **MetaMask Delegation Toolkit**.

It provides a scalable, three-layer architecture designed for mass adoption by abstracting away all Web3 complexity. Users can stake, swap, and rebalance assets either manually or via a non-custodial, automated "AI Agent."

For the testnet, the platform is integrated with **Kintsu (sMON)** and **Magma (gMON)**, demonstrating a framework built to scale with additional protocols on mainnet.

> 🔗 **Live Demo:** [synapse-yield.vercel.app](https://synapse-yield.vercel.app/)

---

## 🔹 Architecture Overview

A tri-layer architecture designed for **scalability, transparency, and trust**:

### 1. Consumer Experience Layer (Mass Adoption)

- Built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, and **Framer Motion** for a sleek, production-grade UI.  
- Abstracts all Web3 complexity—users authenticate via **SIWE (Sign-In With Ethereum)** + **Iron Session**.  
- Upon login, a **MetaMask Smart Account (ERC-4337)** is automatically provisioned.  
- Powered by **Permissionless.js** and **Pimlico Paymaster** for **gas-sponsored, one-click actions** such as staking, swapping, and fund management.  

### 2. Automation Layer – “The AI Agent” (Core Innovation)

- Implements a **non-custodial keeper system** for autonomous portfolio management.  
- Users grant scoped access by signing a single **EIP-712 delegation** using the **MetaMask Delegation Toolkit**.  
- Delegations are tightly scoped to specific methods (`deposit`, `execute`, `redeem`) on **whitelisted DeFi protocols** (e.g., **PancakeSwap Router**, **Kintsu**, **Magma**).  
- The **keeper agent (`keeper.ts`)**, triggered via **FastCron**, queries users with `automationEnabled: true` from MongoDB, performs **on-chain multicalls**, and uses a **decision function (`determineRebalanceAction`)** to execute delegated swaps automatically.  
- The current demo performs a **50/50 asset rebalance**, while the mainnet version will integrate **adaptive yield strategies** using protocol APYs and market data.  

### 3. Trust & Transparency Layer (Powered by Envio)

- Since automation requires verifiability, Synapse Yield integrates an **Envio Indexer** as a **real-time trust layer**.  
- The Envio Indexer tracks and streams actions from integrated testnet protocols (**Kintsu**, **Magma**, etc.).  
- Data is queried via **Apollo Client (GraphQL)** to power the `/activity` feed.  
- The UI clearly differentiates **manual** vs. **automated** keeper actions, ensuring full user visibility and creating a **transparent bridge between autonomy and accountability**.  

---

## ✨ Key Features

- **Smart Account Management** — Automatically provisions a dedicated MetaMask Smart Account (ERC-4337).  
- **🛡️ Secure Delegation (Non-Custodial)** — Scoped EIP-712 delegation using MetaMask Delegation Toolkit.  
- **🤖 Automated Yield Optimization (Keeper)** — "AI Agent" autonomously rebalances portfolios (50/50 demo).  
- **💸 Gas-Sponsored Transactions** — One-click operations via Pimlico Paymaster.  
- **📊 Real-time Activity Feed** — Powered by Envio Indexer + Apollo GraphQL.  
- **🔒 SIWE Authentication** — Sign-In with Ethereum + Iron Session.  
- **🎨 Polished UI/UX** — “Liquid Synapse” theme using Next.js, Tailwind & Framer Motion.  

---

## 🛠️ Technology Stack

- **Core Blockchain:** Monad Testnet  
- **AA & Delegation:** MetaMask Delegation Toolkit, Permissionless.js, Pimlico  
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion  
- **Web3 Libraries:** Viem, Wagmi, RainbowKit  
- **Backend:** Next.js API Routes, MongoDB, Mongoose  
- **Automation:** FastCron + Node.js Keeper Script  
- **Authentication:** SIWE + Iron Session  
- **Data Indexing:** Envio (GraphQL, Apollo Client)  

---

## 📂 GitHub Repositories

- **Main App:** [github.com/akm2006/synapse-yield](https://github.com/akm2006/synapse-yield)  
- **Indexer:** [github.com/akm2006/synapse-indexer](https://github.com/akm2006/synapse-indexer)  

---

## 🛡️ Security Features & Delegation Scope

**Security Highlights:**

- ✅ Non-Custodial — Assets remain in user-controlled Smart Accounts.  
- ✅ Scoped Delegation — Access limited to approved contracts/functions.  
- ✅ No Key Sharing — Private keys never exposed.  
- ✅ Secure Storage — Delegate key & session secrets stored server-side.  

**Delegation Scope (`createStakingDelegation`):**

- **Targets:** Kintsu, Magma, WMON, gMON, Permit2, PancakeSwap Router  
- **Allowed Functions:**  
  - `depositMon`, `withdrawMon`, `deposit`, `requestUnlock`, `redeem`  
  - ERC20 actions (`approve`, `transfer`, `transferFrom`)  
  - Permit2 approvals, `execute` (PancakeSwap), `deposit/withdraw` (WMON)  
- **Allows:** Delegated staking/swapping under user consent  
- **Prevents:** Unauthorized transfers or calls outside scope  

---

## ⚙️ Core Workflow

1. **Connect & Sign In** — SIWE authentication.  
2. **Smart Account Setup** — MetaMask Smart Account (ERC-4337) provisioned.  
3. **Delegation** — EIP-712 `Delegation` signed.  
4. **Manual Action Execution** — Via Pimlico Bundler & Paymaster.  
5. **Automated Execution** — Keeper runs delegated UserOps via API.  
6. **Transaction Execution** — Bundler → Monad EntryPoint.  
7. **Data Indexing** — Envio Indexer updates `/activity` feed in real time.  

---

## 🗺️ App Structure

| Route | Description |
|-------|--------------|
| `/` | Landing Page — intro and overview |
| `/dashboard` | Smart Account + Delegation setup + Enable/disable automation |
| `/manage-funds` | Deposit & withdraw MON/WMON/sMON/gMON |
| `/stake` | Stake/unstake MON-family tokens |
| `/swap` | Swap MON-family tokens |
| `/yield-optimizer` | Analyze APY & Optimal Protocol + Manual Optimization |
| `/activity` | Real-time protocol & keeper activity feed |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)  
- npm / pnpm / yarn  
- Wallet with Monad Testnet (Chain ID: **10143**)  

### Setup

```bash
git clone https://github.com/akm2006/synapse-yield.git
cd synapse-yield
npm install
```

### Environment Variables

Create `.env.local`:

```bash
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

Then run:

```bash
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

> ⚠️ **Security Note:** Keep secrets private. Use environment variables on Vercel or similar secure hosting.

---

### 🔮 Testnet → Mainnet Migration Guide

| Area | Testnet | Mainnet | Notes |
|------|----------|----------|-------|
| Network | Monad Testnet (10143) | Mainnet RPC | Update in `chain.ts` |
| Contracts | Testnet (Kintsu, Magma) | Mainnet versions | Update in `contracts.ts` |
| APY Logic | Simulated | Real-time | Needed for accuracy |
| Keeper Logic | 50/50 Rebalancing | APY-aware | Core to ROI |
| Security | Dev keys | Audit & harden | Production-ready |
| AA Infra | Pimlico Testnet | Pimlico Mainnet | Cost review |
| Indexer | Envio Testnet | Mainnet endpoint | Apollo config |
| UI/UX | Basic | Add confirmations & gas UI | Mainnet polish |

---

## 📜 License

Licensed under the **MIT License** — free to use, modify, and build upon.

<p align="center">
  <sub>Built on Monad using MetaMask Delegation Toolkit.</sub><br>
  <sub>© 2025 Synapse Yield</sub>
</p>
