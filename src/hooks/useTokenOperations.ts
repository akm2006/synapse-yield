// src/hooks/useTokenOperations.ts
'use client';
import { useCallback } from 'react';
import type { Address } from 'viem';
import { parseUnits } from 'viem';

interface PostJSONOptions {
  path: string;
  body: any;
}

export function useTokenOperations() {
  const postJSON = useCallback(async ({ path, body }: PostJSONOptions) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',  
      next: { revalidate: 0 },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return res.json();
    const text = await res.text();
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0,300)}...` };
  }, []);

  // --- Start of your changes ---
  // Update all operations to use delegation
  const stakeMagma = useCallback((amount: string, opId: string) =>
    postJSON({ path: '/api/delegate/execute', body: { operation: 'stake-magma', amount, opId } }),
    [postJSON]);

  const unstakeMagma = useCallback((amount: string, opId: string) =>
    postJSON({ path: '/api/delegate/execute', body: { operation: 'unstake-magma', amount, opId } }),
    [postJSON]);

  const stakeKintsu = useCallback((amount: string, receiver: Address, opId: string) =>
    postJSON({ path: '/api/delegate/execute', body: { operation: 'stake-kintsu', amount, receiver, opId } }),
    [postJSON]);
const executeRebalance = useCallback(async (
  fromProtocol: 'kintsu' | 'magma',
  toProtocol: 'kintsu' | 'magma', 
  amount: string,
  smartAccountAddress: Address,
  delegation: any
): Promise<any> => {
  if (!smartAccountAddress || !delegation) {
    throw new Error('Smart account and delegation required for rebalancing');
  }

  const response = await fetch('/api/delegate/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAddress: smartAccountAddress,
      operation: `${fromProtocol}-to-${toProtocol}-rebalance`,
      amount,
      delegation
    })
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Rebalance operation failed');
  }

  return result;
}, []);
  const unstakeKintsu = useCallback((
    amountIn: string,
    minOut: string,
    fee: number,
    recipient: Address,
    unwrap: boolean,
    deadlineSec: number,
    opId: string
  ) =>
    postJSON({
      path: '/api/delegate/execute',
      body: { operation: 'kintsu-instant-unstake', amountIn, minOut, fee, recipient, unwrap, deadlineSec, opId },
    }),
    [postJSON]);

  const requestUnlock = useCallback((amount: string, opId: string) =>
    postJSON({ path: '/api/delegate/execute', body: { operation: 'kintsu-request-unlock', amount, opId } }),
    [postJSON]);

  const redeemUnlock = useCallback((unlockIndex: string, receiver: Address, opId: string) =>
    postJSON({ path: '/api/delegate/execute', body: { operation: 'kintsu-redeem', unlockIndex, receiver, opId } }),
    [postJSON]);

  const directSwap = useCallback((
    fromToken: Address,
    toToken: Address,
    amountIn: string,
    minOut: string,
    fee: number,
    recipient: Address,
    deadlineSec: number,
    opId: string
  ) =>
    postJSON({
      path: '/api/delegate/execute',
      body: { 
        operation: 'direct-swap', 
        fromToken, 
        toToken, 
        amountIn, 
        minOut, 
        fee, 
        recipient, 
        deadline: Math.floor(Date.now() / 1000) + deadlineSec,
        opId 
      },
    }),
    [postJSON]);

  const wrapMon = useCallback(async (amount: string, opId: string) => {
    return postJSON({
      path: '/api/delegate/execute',
      body: { operation: 'wrap-mon', amount, opId }
    });
  }, [postJSON]);

  const unwrapWmon = useCallback(async (amount: string, opId: string) => {
    return postJSON({
      path: '/api/delegate/execute',
      body: { operation: 'unwrap-wmon', amount, opId }
    });
  }, [postJSON]);
  // --- End of your changes ---

  return {executeRebalance,
    stakeMagma,
    unstakeMagma,
    stakeKintsu,
    unstakeKintsu,
    requestUnlock,
    redeemUnlock,
    directSwap,
    wrapMon,
    unwrapWmon,
    postJSON,
  };
}
