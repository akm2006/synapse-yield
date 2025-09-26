// src/lib/agent/entryPoint.ts
import type { Address } from 'viem';
import { parseEther, formatEther } from 'viem';
import { publicClient } from '@/lib/viemClients';

const entryPointAbi = [
  { type: 'function', name: 'depositTo', stateMutability: 'payable', inputs: [{ name: 'account', type: 'address' }], outputs: [] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint112' }] },
] as const;

export async function ensureEntryPointPrefund(
  walletClient: ReturnType<typeof import('viem').createWalletClient>,
  entryPoint: Address,
  account: Address,
  opts?: { minDeposit?: bigint; topUpAmount?: bigint; checkOnly?: boolean }
) {
  const minDeposit = opts?.minDeposit ?? parseEther('0.01');
  const topUpAmount = opts?.topUpAmount ?? parseEther('0.05');
  const checkOnly = !!opts?.checkOnly;

  const deposit = (await publicClient.readContract({
    address: entryPoint,
    abi: entryPointAbi,
    functionName: 'balanceOf',
    args: [account],
  })) as bigint;

  if (deposit >= minDeposit || checkOnly) {
    return { ok: true, deposit, toppedUp: false };
  }

  const txHash = await walletClient.writeContract({
    address: entryPoint,
    abi: entryPointAbi,
    functionName: 'depositTo',
    args: [account],
    value: topUpAmount,
    account: walletClient.account!,
    chain: walletClient.chain!,
  });

  return { ok: true, deposit, toppedUp: true, txHash };
}
