// src/lib/ensureAllowancesAA.ts
import type { Address } from 'viem';
import { encodeFunctionData, maxUint256, parseAbi } from 'viem';
import { aaPublic } from '@/lib/aaClient';
import { erc20Abi, permit2Abi } from '@/lib/abis'; // Now erc20Abi includes allowance
import { CONTRACTS } from '@/lib/contracts';
import { getAAClient } from '@/lib/aaClient';
import { emitLog } from '@/lib/logBus';

// Use enhanced ERC20 ABI that includes allowance function
const erc20AbiWithAllowance = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

export type ApprovalDetail = {
  token: Address;
  spender: Address;
  type: 'erc20' | 'permit2';
  exists: boolean;
  current: string;
  needed: string;
  expiration?: number;
  isExpired?: boolean;
  needsAction: boolean;
  callData?: `0x${string}`;
  message: string;
};

export type EnsureAllowancesResult = {
  erc20: ApprovalDetail;
  permit2: ApprovalDetail;
  requiredCalls: Array<{ to: Address; data: `0x${string}`; value?: bigint }>;
};

// uint160 max for Permit2 amount  
const MAX_UINT160 = (1n << 160n) - 1n; // type(uint160).max

export async function ensureTokenAllowancesAA(
  token: Address,
  amountNeeded: bigint,
  opts?: { opId?: string; smartAccountAddress?: Address }
): Promise<EnsureAllowancesResult> {
  const { client } = await getAAClient();
  const smartAccountAddress = opts?.smartAccountAddress || client.account.address;
  const { PANCAKESWAP: UNIVERSAL_ROUTER, PERMIT2 } = CONTRACTS;
  const now = Math.floor(Date.now() / 1000);
  const opId = opts?.opId;
  const log = (m: string) => (opId ? emitLog(opId, m) : console.log(m));

  log(`Starting AA allowance checks token=${token} needed=${amountNeeded.toString()}`);

  // 1) Check ERC20 allowance (smartAccount -> PERMIT2)
  const currentErc20 = (await aaPublic.readContract({
    address: token,
    abi: erc20AbiWithAllowance, // Use the enhanced ABI
    functionName: 'allowance',
    args: [smartAccountAddress, PERMIT2],
  })) as bigint;

  log(`ERC20 allowance (smartAccount -> Permit2) current=${currentErc20.toString()}`);

  // 2) Check Permit2 allowance (smartAccount, token, spender=Universal Router)
  let pAmount = 0n;
  let pExpire = 0;
  try {
    const res = (await aaPublic.readContract({
      address: PERMIT2,
      abi: permit2Abi,
      functionName: 'allowance',
      args: [smartAccountAddress, token, UNIVERSAL_ROUTER],
    })) as [bigint, number, number]; // amount(uint160), expiration(uint48), nonce(uint48)
    pAmount = res[0];
    pExpire = res[1];
    log(`Permit2 allowance current=${pAmount.toString()} exp=${pExpire}`);
  } catch {
    log('Permit2 allowance read failed; assuming zero');
  }

  const erc20Exists = currentErc20 >= amountNeeded;
  const permit2Expired = pExpire > 0 && pExpire <= now;
  const permit2Exists = pAmount >= amountNeeded && !permit2Expired;

  const erc20: ApprovalDetail = {
    token,
    spender: PERMIT2,
    type: 'erc20',
    exists: erc20Exists,
    current: currentErc20.toString(),
    needed: amountNeeded.toString(),
    needsAction: !erc20Exists,
    message: erc20Exists
      ? 'ERC20 approval to Permit2 exists and is sufficient.'
      : 'ERC20 approval to Permit2 missing or insufficient; will include in batch.',
  };

  const permit2: ApprovalDetail = {
    token,
    spender: UNIVERSAL_ROUTER,
    type: 'permit2',
    exists: permit2Exists,
    current: pAmount.toString(),
    needed: amountNeeded.toString(),
    expiration: pExpire || undefined,
    isExpired: permit2Expired || undefined,
    needsAction: !permit2Exists || permit2Expired,
    message: permit2Exists
      ? 'Permit2 approval to Universal Router exists and is valid.'
      : permit2Expired
      ? 'Permit2 approval expired; will include in batch.'
      : 'Permit2 approval missing or insufficient; will include in batch.',
  };

  // 3) Build required calls for batch execution
  const requiredCalls: Array<{ to: Address; data: `0x${string}`; value?: bigint }> = [];

  // Add ERC20 approval call if needed
  if (!erc20Exists) {
    const erc20CallData = encodeFunctionData({
      abi: erc20AbiWithAllowance, // Use the enhanced ABI
      functionName: 'approve',
      args: [PERMIT2, maxUint256],
    });
    requiredCalls.push({ to: token, data: erc20CallData });
    erc20.callData = erc20CallData;
    log('Will include ERC20 approve(token -> Permit2) in batch');
  }

  // Add Permit2 approval call if needed/expired
  if (!permit2Exists || permit2Expired) {
    const expiration: number = now + 365 * 24 * 60 * 60; // 1 year
    const permit2CallData = encodeFunctionData({
      abi: permit2Abi,
      functionName: 'approve',
      args: [token, UNIVERSAL_ROUTER, MAX_UINT160, expiration],
    });
    requiredCalls.push({ to: PERMIT2, data: permit2CallData });
    permit2.callData = permit2CallData;
    permit2.expiration = expiration;
    permit2.isExpired = false;
    log(`Will include Permit2 approve(token -> Router) in batch exp=${expiration}`);
  }

  log(`AA allowance check complete. Required calls: ${requiredCalls.length}`);
  return { erc20, permit2, requiredCalls };
}
