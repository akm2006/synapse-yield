<p align="center">
  <img src="./public/logo.png" alt="Synapse Yield Logo" width="140" />
</p>

<h1 align="center">Synapse Yield</h1>

<p align="center">
  <strong>Maximize Your DeFi Yield on Monad with Automated Optimization & Enhanced Security</strong><br>
  <em>Built on the Monad Testnet using Account Abstraction (ERC-4337) and MetaMask Delegations.</em>
</p>

---

## 📚 Table of Contents
- [Overview](#overview)
- [🎬 Video Demos](#-video-demos)
- [Architecture Overview](#architecture-overview)
- [🔗 Smart Contract Architecture](#-smart-contract-architecture)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Testnet → Mainnet Migration Guide](#-testnet--mainnet-migration-guide)
- [License](#license)

---

## Overview

**Synapse Yield** is a decentralized yield optimizer designed for the **Monad Testnet**.  
It automates yield rebalancing between protocols like **Kintsu** and **Magma** to maximize user returns — powered by **MetaMask Smart Accounts** and **Delegation Toolkit**.

Users maintain **full custody** of their assets while delegating yield optimization tasks to the backend “keeper,” executed through **scoped delegations** and **UserOperations** (ERC-4337).

---

## 🎬 Video Demos

### Demo Video & Pitch Video
 
| Watch the complete walkthrough demonstrating all features:| See the problem, solution, and live proof |
|----------------|--------------------------------|
| [![Demo Video](https://img.youtube.com/vi/LlatPV-aHzg/0.jpg)](https://www.youtube.com/watch?v=LlatPV-aHzg) | [![Pitch Video](https://img.youtube.com/vi/vG_VcmyNACw/0.jpg)](https://www.youtube.com/watch?v=vG_VcmyNACw) |

### Hackathon Submission
- [HackQuest Project Page](https://www.hackquest.io/projects/MetaMask-Smart-Accounts-x-Monad-Dev-Cook-Off-Synapse-Yield)

---

## Architecture Overview

### System Overview

Synapse Yield uses a **3-layer architecture**:

1. **Frontend (Next.js + RainbowKit):** User interface for connecting wallets, delegating permissions, and viewing yield insights.
2. **Backend (Node/Next API):** Runs the keeper logic, monitors protocol states, and triggers rebalances.
3. **Blockchain (Monad Testnet):** Executes yield operations via delegated smart accounts.

---

## 🔗 Smart Contract Architecture

**Important Note:** Synapse Yield does not deploy any custom smart contracts. Instead, it leverages existing, battle-tested DeFi protocols on the Monad Testnet.

### Protocol Integration Approach

Rather than introducing new smart contract risk, Synapse Yield acts as a **non-custodial orchestration layer** that:

- ✅ **Interacts with existing protocols:** Kintsu, Magma, PancakeSwap Router
- ✅ **Uses standard interfaces:** ERC-20, ERC-4337 (EntryPoint), Permit2
- ✅ **Leverages MetaMask Smart Accounts:** User's smart account is their identity
- ✅ **Executes via delegation:** Scoped permissions, not custom logic contracts

### Why This Matters

**Security Benefits:**
- No custom contract audit required (reduces attack surface)
- Relies on audited protocols (Kintsu, Magma, PancakeSwap)
- Smart Account security handled by MetaMask (ERC-4337 standard)
- Delegation permissions handled by MetaMask Delegation Toolkit

**Architecture Benefits:**
- Protocol-agnostic design (easy to add new protocols)
- No contract deployment/maintenance overhead
- Gas-efficient (no additional contract hops)
- Faster iteration and updates (backend logic only)

### How It Works

1. **User's Smart Account:** Created via MetaMask Delegation Toolkit (ERC-4337)
2. **Delegation:** User signs EIP-712 delegation granting keeper scoped permissions
3. **Keeper Service:** Backend monitors and executes transactions via delegation
4. **Protocol Interactions:** Direct calls to Kintsu, Magma, PancakeSwap contracts
5. **Bundler:** Pimlico bundles UserOperations and submits to Monad EntryPoint

### Integrated Contracts (Monad Testnet)

While Synapse Yield doesn't deploy custom contracts, it interacts with:

- **Kintsu Protocol:** Staking MON → sMON
- **Magma Protocol:** Staking MON → gMON  
- **PancakeSwap Router:** Token swapping (gMON ↔ sMON)
- **WMON:** Wrapped MON for DeFi compatibility
- **Permit2:** Gasless token approvals
- **ERC-4337 EntryPoint:** Smart account transaction execution

---

## Setup

```bash
git clone https://github.com/akm2006/synapse-yield.git
cd synapse-yield
npm install
```

### Environment Variables

Create a `.env.local` file:

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

## 🔮 Testnet → Mainnet Migration Guide

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
