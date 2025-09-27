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
export const REBALANCE_THRESHOLD_PCT = 5.0;

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
