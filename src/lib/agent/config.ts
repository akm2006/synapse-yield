// src/lib/agent/config.ts
import type { Address } from 'viem';
import { monad, BUNDLER_RPC_URL } from '@/lib/viemClients';
import { getDeleGatorEnvironment } from '@metamask/delegation-toolkit';
import { synapseYieldAdapterAbi } from '@/lib/abi';
import { kintsuAddress, magmaAddress, gMonAddress } from '@/lib/protocolAbis';

export const CHAIN = monad;

export const ADAPTER_CONTRACT_ADDRESS = '0x3ed79496b6b5f2aed1e2b8203df783bbe39e9002' as Address;

export const PROTOCOL_ADDRESSES = {
  KINTSU: kintsuAddress as Address,
  MAGMA: magmaAddress as Address,
  GMON: gMonAddress as Address,
} as const;

// Threshold in percent APY improvement required to rebalance (e.g., 5.0 = 5%)
export const REBALANCE_THRESHOLD_PCT = 1.0;

// Slippage tolerance in basis points (e.g., 50 = 0.5%)
export const SLIPPAGE_BPS = 50;

// EntryPoint address (leave empty for testnet safety)
export const ENTRYPOINT_ADDRESS = (process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || '') as Address;

// Agent private key must be set server-side
export const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY as `0x${string}`;

// Execution mode toggle
export const EXECUTE_MODE = process.env.AGENT_EXECUTE === 'true';

// Pimlico bundler RPC
export const PIMLICO_BUNDLER_URL = BUNDLER_RPC_URL;

// Delegation environment
export const DELEGATION_ENV = getDeleGatorEnvironment(CHAIN.id);

// Adapter ABI
export const ADAPTER_ABI = synapseYieldAdapterAbi;

// Helper: convert bps to ratio (e.g., 50 -> 0.005)
export const bpsToRatio = (bps: number) => Math.max(0, bps) / 10_000;
// Contract addresses on Monad testnet
export const CONTRACTS = {
  KINTSU_STAKED_MONAD: "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c5" as Address,
  MAGMA_STAKE_MANAGER: "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7" as Address,
  MAGMA_GMON_TOKEN: "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3" as Address,
} as const;

// Agent configuration
export const AGENT_CONFIG = {
  PRIVATE_KEY: process.env.AGENT_PRIVATE_KEY!,
  EOA_ADDRESS: "0xFE5AB50d48cf989616A4173083aF646d613fc857" as Address,
  SMART_ACCOUNT_ADDRESS: "0x4a402f781Cd83Ff77F4658C827d91FEc552619E2" as Address, // Update with actual
  REBALANCE_THRESHOLD_PCT: 0.5, // 0.5% improvement required
  EXECUTE_MODE: process.env.AGENT_EXECUTE === 'true',
} as const;

// Protocol configuration
export const PROTOCOL_CONFIG = {
  KINTSU_UNLOCK_WAIT_BLOCKS: 100, // Estimated blocks for unlock maturity
  MIN_REBALANCE_AMOUNT: BigInt(10000000000000000), // 0.01 MON minimum
  MAX_GAS_PRICE: BigInt(100000000000), // 100 gwei max
} as const;