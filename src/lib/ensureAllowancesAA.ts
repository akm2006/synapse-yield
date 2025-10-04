// src/lib/ensureAllowancesAA.ts
import type { Address } from 'viem';
import { encodeFunctionData, maxUint256, parseAbi } from 'viem';
import { aaPublic } from '@/lib/aaClient';
import { erc20Abi, permit2Abi } from '@/lib/abis';
import { CONTRACTS } from '@/lib/contracts';
import { getAAClient } from '@/lib/aaClient';
import { emitLog } from '@/lib/logBus';

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

const MAX_UINT160 = (1n << 160n) - 1n;
const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000' as Address;

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

  if (token.toLowerCase() === NATIVE_TOKEN) {
    log('Native token detected - skipping allowance checks');
    return {
      erc20: {
        token,
        spender: PERMIT2,
        type: 'erc20',
        exists: true,
        current: 'N/A',
        needed: amountNeeded.toString(),
        needsAction: false,
        message: 'Native token - no approval needed',
      },
      permit2: {
        token,
        spender: UNIVERSAL_ROUTER,
        type: 'permit2',
        exists: true,
        current: 'N/A',
        needed: amountNeeded.toString(),
        needsAction: false,
        message: 'Native token - no approval needed',
      },
      requiredCalls: [],
    };
  }

  log(`Starting AA allowance checks token=${token} needed=${amountNeeded}`);
  const currentErc20 = (await aaPublic.readContract({
    address: token,
    abi: erc20AbiWithAllowance,
    functionName: 'allowance',
    args: [smartAccountAddress, PERMIT2],
  })) as bigint;

  log(`ERC20 allowance current=${currentErc20}`);
  let pAmount = 0n, pExpire = 0;
  try {
    const res = (await aaPublic.readContract({
      address: PERMIT2,
      abi: permit2Abi,
      functionName: 'allowance',
      args: [smartAccountAddress, token, UNIVERSAL_ROUTER],
    })) as [bigint, number, number];
    pAmount = res[0];
    pExpire = res[1];
    log(`Permit2 allowance current=${pAmount} exp=${pExpire}`);
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
      ? 'ERC20 approval to Permit2 exists.'
      : 'ERC20 approval missing; will include.',
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
      ? 'Permit2 approval exists.'
      : permit2Expired
      ? 'Permit2 expired; will include.'
      : 'Permit2 missing; will include.',
  };

  const requiredCalls: Array<{ to: Address; data: `0x${string}`; value?: bigint }> = [];

  if (!erc20Exists) {
    const erc20CallData = encodeFunctionData({
      abi: erc20AbiWithAllowance,
      functionName: 'approve',
      args: [PERMIT2, maxUint256],
    });
    requiredCalls.push({ to: token, data: erc20CallData });
    erc20.callData = erc20CallData;
    log('Including ERC20 approve in batch');
  }

  if (!permit2Exists || permit2Expired) {
    const expiration = now + 365 * 24 * 60 * 60;
    const permit2CallData = encodeFunctionData({
      abi: permit2Abi,
      functionName: 'approve',
      args: [token, UNIVERSAL_ROUTER, MAX_UINT160, expiration],
    });
    requiredCalls.push({ to: PERMIT2, data: permit2CallData });
    permit2.callData = permit2CallData;
    permit2.expiration = expiration;
    permit2.isExpired = false;
    log(`Including Permit2 approve in batch exp=${expiration}`);
  }

  log(`Allowance check complete. Calls: ${requiredCalls.length}`);
  return { erc20, permit2, requiredCalls };
}
