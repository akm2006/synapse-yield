// src/lib/agent/types.ts
import type { Address, Hex } from 'viem';

export type ProtocolName = 'Kintsu' | 'Magma';

export interface ProtocolMetrics {
  // Kintsu (ERC-4626 style vault metrics)
  kintsuExchangeRate: bigint;     // MON per sMON in wei terms
  kintsuTotalShares: bigint;      // sMON total supply or vault shares
  kintsuTotalAssets: bigint;      // MON total assets
  kintsuAPY: number;              // derived APY (percent)

  // Magma (placeholder APY; update when protocol exposes rate)
  magmaTVL: bigint;               // MON TVL (for visibility)
  magmaAPY: number;               // APY percent (placeholder until real formula)
}

export interface UserPosition {
  protocol: ProtocolName;
  amount: bigint;   // user’s LST balance (shares for Kintsu, gMON for Magma)
  shares?: bigint;  // optional shares for ERC-4626 style vaults
}

export interface DecisionResult {
  shouldRebalance: boolean;
  fromProtocol?: ProtocolName;
  toProtocol?: ProtocolName;
  improvementPct?: number;
  reason: string;
}

export interface GasLimits {
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
}

export interface FeeCaps {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export interface RedeemCall {
  to: Address;
  data: Hex;
}
