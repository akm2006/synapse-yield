// src/lib/agent/userop.ts
import type { Address, Hex } from 'viem';
import type { GasLimits, FeeCaps, RedeemCall } from './types';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { http } from 'viem';
import { bundlerClient } from '@/lib/viemClients';
import { DELEGATION_ENV, PIMLICO_BUNDLER_URL } from './config';
import { DelegationManager } from '@metamask/delegation-toolkit/contracts';
import { createExecution, ExecutionMode } from '@metamask/delegation-toolkit';
import { encodeFunctionData } from 'viem';
import { ADAPTER_ABI, ADAPTER_CONTRACT_ADDRESS, SLIPPAGE_BPS, bpsToRatio } from './config';

export function buildRebalanceExecution(
  fromProtocol: string,
  toProtocol: string,
  minAmountOut: bigint,
) {
  const callData = encodeFunctionData({
    abi: ADAPTER_ABI,
    functionName: 'rebalance',
    args: [fromProtocol, toProtocol, minAmountOut],
  });

  return createExecution({
    target: ADAPTER_CONTRACT_ADDRESS,
    value: 0n,
    callData,
  });
}

export function encodeRedeemDelegations(
  signedDelegation: any,
  execution: ReturnType<typeof createExecution>
): RedeemCall {
  const redeemCalldata = DelegationManager.encode.redeemDelegations({
    delegations: [[signedDelegation]],
    modes: [ExecutionMode.SingleDefault],
    executions: [[execution]],
  });

  return {
    to: DELEGATION_ENV.DelegationManager as Address,
    data: redeemCalldata as Hex,
  };
}

export async function estimateGasAndFees(
  account: any, // MetaMask smart account from toolkit
  calls: RedeemCall[]
): Promise<{ limits: GasLimits; fees: FeeCaps }> {
  let callGasLimit = 1_200_000n;
  let verificationGasLimit = 700_000n;
  let preVerificationGas = 200_000n;

  try {
    const est = await bundlerClient.estimateUserOperationGas({
      account,
      calls,
    });
    callGasLimit = est.callGasLimit;
    verificationGasLimit = est.verificationGasLimit;
    preVerificationGas = est.preVerificationGas;
  } catch {
    // fallbacks remain
  }

  const pimlico = createPimlicoClient({ transport: http(PIMLICO_BUNDLER_URL) });
  const { fast } = await pimlico.getUserOperationGasPrice();
  const fees: FeeCaps = {
    maxFeePerGas: fast.maxFeePerGas,
    maxPriorityFeePerGas: fast.maxPriorityFeePerGas,
  };

  const limits: GasLimits = { callGasLimit, verificationGasLimit, preVerificationGas };
  return { limits, fees };
}

export async function sendUserOperation(
  account: any,
  calls: RedeemCall[],
  limits: GasLimits,
  fees: FeeCaps
) {
  const userOpHash = await bundlerClient.sendUserOperation({
    account,
    calls,
    ...limits,
    ...fees,
  });
  const { receipt } = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
  return { userOpHash, receipt };
}

// Helper to compute a minAmountOut with slippage tolerance
export function applySlippage(amount: bigint, slippageBps = SLIPPAGE_BPS): bigint {
  const ratio = 1 - bpsToRatio(slippageBps);
  const SCALE = 1_000_000n;
  const scaled = (amount * BigInt(Math.floor(ratio * Number(SCALE)))) / SCALE;
  return scaled < 0n ? 0n : scaled;
}
