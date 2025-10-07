// src/hooks/useTokenOperations.ts
'use client';
import { useCallback } from 'react';
import type { Address } from 'viem';
import { parseUnits } from 'viem';  // ← import parseUnits
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

  const stakeMagma = useCallback((amount: string, opId: string) =>
    postJSON({ path: '/api/delegate/execute', body: { amount, opId } }),
  [postJSON]);

  const unstakeMagma = useCallback((amount: string, opId: string) =>
    postJSON({ path: '/api/tx/magma/withdraw', body: { amount, opId } }),
  [postJSON]);

  const stakeKintsu = useCallback((amount: string, receiver: Address, opId: string) =>
    postJSON({ path: '/api/delegate/execute', body: { amount, receiver, opId } }),
  [postJSON]);

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
      body: { amountIn, minOut, fee, recipient, unwrap, deadlineSec, opId },
    }),
  [postJSON]);

  const requestUnlock = useCallback((amount: string, opId: string) =>
    postJSON({ path: '/api/tx/kintsu/requestUnlock', body: { amount, opId } }),
  [postJSON]);

  const redeemUnlock = useCallback((unlockIndex: string, receiver: Address, opId: string) =>
    postJSON({ path: '/api/tx/kintsu/redeem', body: { unlockIndex, receiver, opId } }),
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
      path: '/api/tx/swap/direct',
      body: { fromToken, toToken, amountIn, minOut, fee, recipient, deadlineSec, opId },
    }),
  [postJSON]);

const wrapMon = useCallback(async (amount: string, opId: string) => {
    // Convert decimal string to wei
    const amountInWei = parseUnits(amount, 18).toString();
    return postJSON({
      path: '/api/tx/wrap',
      body: { action: 'wrap', amount: amountInWei, opId }
    });
  }, [postJSON]);

  const unwrapWmon = useCallback(async (amount: string, opId: string) => {
    // Convert decimal string to wei
    const amountInWei = parseUnits(amount, 18).toString();
    return postJSON({
      path: '/api/tx/wrap',
      body: { action: 'unwrap', amount: amountInWei, opId }
    });
  }, [postJSON]);
  return {
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
