// src/app/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { CONTRACTS } from '@/lib/contracts';
import { erc20Abi, permit2Abi } from '@/lib/abis';
import { browserPublicClient } from '@/lib/smartAccountClient';
import type { Address } from 'viem';
import { formatUnits, parseUnits, encodeFunctionData, maxUint256 } from 'viem';
import SmartAccountManager from './components/SmartAccountManager';
import TokenTransfer from './components/TokenTransfer';
import { getAAClient, settleUserOperation } from '@/lib/aaClient';

const PERMIT2 = CONTRACTS.PERMIT2 as Address;
const UNIVERSAL_ROUTER = CONTRACTS.PANCAKESWAP as Address;

export default function Home() {
  const [balances, setBalances] = useState({ native: '0', kintsu: '0', magma: '0' });
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const unwatchRef = useRef<null | (() => void)>(null);
  const lastBlockRef = useRef(0n);

  // Manual amounts for actions
  const [amt, setAmt] = useState({
    magmaStake: '0.01',
    magmaUnstake: '0.01',
    kintsuStake: '0.02',
    kintsuUnstake: '0.01',
  });

  function log(msg: string) {
    setLogs((prev) => [...prev, msg]);
    console.log(msg);
  }

  async function postJSON(path: string, body: any) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      next: { revalidate: 0 },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    const text = await res.text();
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 300)}...` };
  }

  // Generate operation ID
  function generateOpId() {
    return (crypto as any)?.randomUUID?.() ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // SSE stream helper
  function openSSEStream(opId: string) {
    const es = new EventSource(`/api/logs/stream?id=${opId}`);
    es.addEventListener('log', (ev: MessageEvent) => {
      try {
        const { msg } = JSON.parse(ev.data);
        log(`[STREAM] ${msg}`);
      } catch {
        log('[STREAM] <malformed log event>');
      }
    });
    es.addEventListener('done', () => {
      log('[STREAM] stream closed');
      es.close();
    });
    es.onerror = () => {
      log('[STREAM] stream error');
      es.close();
    };
  }

  // Fetch balances (silent=true suppresses logs/loading to avoid UI jitter)
  async function fetchBalances(silent: boolean = false) {
    if (!smartAccountAddress) {
      setBalances({ native: '0', kintsu: '0', magma: '0' });
      return;
    }
    if (loading && !silent) return;
    if (!silent) setLoading(true);
    
    try {
      if (!silent) log(`[INFO] Fetching balances for Smart Account ${smartAccountAddress}`);
      
      // Multicall for ERC-20 balances
      let sMonRaw = 0n;
      let gMonRaw = 0n;
      try {
        const tokenReads = await browserPublicClient.multicall({
          contracts: [
            {
              address: CONTRACTS.KINTSU as Address,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [smartAccountAddress],
            },
            {
              address: CONTRACTS.GMON as Address,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [smartAccountAddress],
            },
          ],
        });
        sMonRaw = tokenReads[0]?.status === 'success' ? (tokenReads[0].result as bigint) : 0n;
        gMonRaw = tokenReads[1]?.status === 'success' ? (tokenReads[1].result as bigint) : 0n;
      } catch {
        // Fallback single reads
        sMonRaw = (await browserPublicClient.readContract({
          address: CONTRACTS.KINTSU as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [smartAccountAddress],
        })) as bigint;
        gMonRaw = (await browserPublicClient.readContract({
          address: CONTRACTS.GMON as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [smartAccountAddress],
        })) as bigint;
      }

      // Native MON
      const nativeRaw = await browserPublicClient.getBalance({ address: smartAccountAddress });

      const next = {
        native: formatUnits(nativeRaw, 18),
        kintsu: formatUnits(sMonRaw, 18),
        magma: formatUnits(gMonRaw, 18),
      };

      const changed =
        next.native !== balances.native ||
        next.kintsu !== balances.kintsu ||
        next.magma !== balances.magma;

      if (changed || !silent) {
        setBalances(next);
        if (!silent) {
          log(`[INFO] Balances: MON=${next.native} sMON=${next.kintsu} gMON=${next.magma}`);
        }
      }
    } catch (err: any) {
      if (!silent) log(`[ERROR] fetchBalances error: ${err.message || err}`);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Check sMON approvals
  async function checkSmonApprovals() {
    if (!smartAccountAddress) return log('[ERROR] Smart Account not ready');
    
    try {
      const token = CONTRACTS.KINTSU as Address;
      const needed = BigInt(Math.floor(+amt.kintsuUnstake * 1e18));

      log(`[CHECK] Checking sMON approvals for ${amt.kintsuUnstake} sMON`);

      const erc20Allowance = (await browserPublicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [smartAccountAddress, PERMIT2],
      })) as bigint;

      let pAmount = 0n;
      let pExp = 0;
      try {
        const res = (await browserPublicClient.readContract({
          address: PERMIT2,
          abi: permit2Abi,
          functionName: 'allowance',
          args: [smartAccountAddress, token, UNIVERSAL_ROUTER],
        })) as [bigint, number, number];
        pAmount = res[0];
        pExp = res[1];
      } catch {
        // treat as zero
      }

      const now = Math.floor(Date.now() / 1000);
      const okErc20 = erc20Allowance >= needed;
      const okPermit2 = pAmount >= needed && (pExp === 0 || pExp > now);

      log(`[CHECK] ERC20 allowance to Permit2: current=${erc20Allowance.toString()} needed=${needed.toString()} ok=${okErc20}`);
      log(`[CHECK] Permit2 allowance to Router: current=${pAmount.toString()} exp=${pExp} ok=${okPermit2}`);
    } catch (e: any) {
      log(`[ERROR] checkSmonApprovals: ${e?.message || e}`);
    }
  }

  // Approve sMON (batched AA transaction)
  async function approveSmon() {
    if (!smartAccountAddress) return log('[ERROR] Smart Account not ready');
    
    try {
      log('[ACTION] Approving sMON (ERC20→Permit2 + Permit2→Router) via AA batch');

      const token = CONTRACTS.KINTSU as Address;
      const MAX_UINT160 = (1n << 160n) - 1n;
      const expiration: number = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      // Build both approval calls
      const erc20ApprovalData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [PERMIT2, maxUint256],
      });

      const permit2ApprovalData = encodeFunctionData({
        abi: permit2Abi,
        functionName: 'approve',
        args: [token, UNIVERSAL_ROUTER, MAX_UINT160, expiration],
      });

      const { client } = await getAAClient();
      const userOpHash = await client.sendUserOperation({
        calls: [
          { to: token, data: erc20ApprovalData },
          { to: PERMIT2, data: permit2ApprovalData },
        ],
      });

      log(`[UO] Approval batch submitted: ${userOpHash}`);
      const settled = await settleUserOperation(userOpHash);
      log(`[TX] Approval batch confirmed: ${settled.transactionHash} at block ${settled.blockNumber}`);
    } catch (e: any) {
      log(`[ERROR] approveSmon: ${e?.message || e}`);
    }
  }

  // Smart Account actions with SSE logging
  async function stakeMagma(amount: string) {
    if (!smartAccountAddress) return log('[ERROR] Smart Account not ready');
    
    const opId = generateOpId();
    openSSEStream(opId);
    
    log(`[ACTION] Stake Magma (Smart Account): ${amount}`);
    const json = await postJSON('/api/tx/magma/stake', { amount, opId });
    
    if (!json.ok) return log(`[ERROR] stakeMagma: ${json.error}`);
    if (json.userOpHash) log(`[UO] userOpHash: ${json.userOpHash}`);
    if (json.transactionHash) log(`[TX] transactionHash: ${json.transactionHash}`);
    if (json.blockNumber) log(`[TX] included at block: ${json.blockNumber}`);
    
    await fetchBalances(false);
  }

  async function unstakeMagma(amount: string) {
    if (!smartAccountAddress) return log('[ERROR] Smart Account not ready');
    
    const opId = generateOpId();
    openSSEStream(opId);
    
    log(`[ACTION] Unstake Magma (Smart Account): ${amount}`);
    const json = await postJSON('/api/tx/magma/withdraw', { amount, opId });
    
    if (!json.ok) return log(`[ERROR] unstakeMagma: ${json.error}`);
    if (json.userOpHash) log(`[UO] userOpHash: ${json.userOpHash}`);
    if (json.transactionHash) log(`[TX] transactionHash: ${json.transactionHash}`);
    if (json.blockNumber) log(`[TX] included at block: ${json.blockNumber}`);
    
    await fetchBalances(false);
  }

  async function stakeKintsu(amount: string) {
    if (!smartAccountAddress) return log('[ERROR] Smart Account not ready');
    
    const opId = generateOpId();
    openSSEStream(opId);
    
    log(`[ACTION] Stake Kintsu (Smart Account): ${amount}`);
    const json = await postJSON('/api/tx/kintsu/deposit', {
      amount,
      receiver: smartAccountAddress,
      opId,
    });
    
    if (!json.ok) return log(`[ERROR] stakeKintsu: ${json.error}`);
    if (json.userOpHash) log(`[UO] userOpHash: ${json.userOpHash}`);
    if (json.transactionHash) log(`[TX] transactionHash: ${json.transactionHash}`);
    if (json.blockNumber) log(`[TX] included at block: ${json.blockNumber}`);
    
    await fetchBalances(false);
  }

  async function unstakeKintsu(amount: string) {
    if (!smartAccountAddress) return log('[ERROR] Smart Account not ready');
    
    try {
      const amountInWei = BigInt(Math.floor(+amount * 1e18)).toString();
      const minOutWei = (BigInt(amountInWei) * 99n) / 100n + '';
      const fee = 2500;

      const opId = generateOpId();
      openSSEStream(opId);

      log(`[ACTION] Kintsu Instant Unstake via Pancake (Smart Account): ${amount}`);
      const json = await postJSON('/api/tx/kintsu/unstake', {
        amountIn: amountInWei,
        minOut: minOutWei,
        fee,
        recipient: smartAccountAddress,
        unwrap: true,
        deadlineSec: 1800,
        opId,
      });

      if (!json.ok) return log(`[ERROR] Unstake Kintsu: ${json.error}`);
      if (json.userOpHash) log(`[UO] userOpHash: ${json.userOpHash}`);
      if (json.transactionHash) log(`[TX] transactionHash: ${json.transactionHash}`);
      if (json.blockNumber) log(`[TX] included at block: ${json.blockNumber}`);
      if (json.batchedCalls) log(`[INFO] Batched ${json.batchedCalls} calls in one UserOperation`);
      
      await fetchBalances(false);
    } catch (err: any) {
      log(`[ERROR] Unstake Kintsu flow: ${err.message || err}`);
    }
  }

  async function requestUnlock(amount: string) {
    if (!smartAccountAddress) return log('[ERROR] Smart Account not ready');
    
    const opId = generateOpId();
    openSSEStream(opId);
    
    log(`[ACTION] Request Unlock Kintsu: ${amount}`);
    const json = await postJSON('/api/tx/kintsu/requestUnlock', { amount, opId });
    
    if (!json.ok) return log(`[ERROR] requestUnlock: ${json.error}`);
    if (json.userOpHash) log(`[UO] userOpHash: ${json.userOpHash}`);
    if (json.transactionHash) log(`[TX] transactionHash: ${json.transactionHash}`);
    if (json.blockNumber) log(`[TX] included at block: ${json.blockNumber}`);
    
    await fetchBalances(false);
  }

  async function redeemUnlock(unlockIndex: string) {
    if (!smartAccountAddress) return log('[ERROR] Smart Account not ready');
    
    const opId = generateOpId();
    openSSEStream(opId);
    
    log(`[ACTION] Redeem Unlock Index: ${unlockIndex}`);
    const json = await postJSON('/api/tx/kintsu/redeem', { 
      unlockIndex, 
      receiver: smartAccountAddress,
      opId 
    });
    
    if (!json.ok) return log(`[ERROR] redeem: ${json.error}`);
    if (json.userOpHash) log(`[UO] userOpHash: ${json.userOpHash}`);
    if (json.transactionHash) log(`[TX] transactionHash: ${json.transactionHash}`);
    if (json.blockNumber) log(`[TX] included at block: ${json.blockNumber}`);
    
    await fetchBalances(false);
  }

  async function rebalance() {
    if (!smartAccountAddress) return log('[ERROR] Smart Account not ready');
    
    setLoading(true);
    log('[ACTION] Starting rebalance');
    
    try {
      if (parseFloat(balances.kintsu) > 0.0001) {
        log('[INFO] Rebalancing from Kintsu → Magma');
        await unstakeKintsu(balances.kintsu);
        await stakeMagma(balances.kintsu);
      } else if (parseFloat(balances.magma) > 0.0001) {
        log('[INFO] Rebalancing from Magma → Kintsu');
        await unstakeMagma(balances.magma);
        await stakeKintsu(balances.magma);
      } else {
        log('[INFO] No funds to rebalance');
      }
    } catch (err: any) {
      log(`[ERROR] Rebalance error: ${err.message || err}`);
    } finally {
      await fetchBalances(false);
      setLoading(false);
    }
  }

  // Ensure Monad Chain
  async function ensureMonadChain() {
    const eth = (window as any).ethereum;
    const monadHex = '0x279f'; // 10143
    const chainId = await eth.request({ method: 'eth_chainId' });
    
    if (chainId !== monadHex) {
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: monadHex }],
        });
      } catch {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: monadHex,
            chainName: 'Monad Testnet',
            nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
            rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL!],
            blockExplorerUrls: ['https://testnet.monadexplorer.com'],
          }],
        });
      }
    }
  }

  // Fund Smart Account via connected wallet
  async function fundSmartAccount() {
    if (!smartAccountAddress) return log('[ERROR] Smart Account not ready');
    
    try {
      const eth = (window as any).ethereum;
      if (!eth) return log('[ERROR] No wallet provider found');
      
      await ensureMonadChain();
      const [from] = await eth.request({ method: 'eth_requestAccounts' });
      if (!from) return log('[ERROR] No EOA account connected');
      
      const valueHex = parseUnits(fundAmount || '0', 18).toString(16);
      if (valueHex === '0') return log('[ERROR] Enter a positive amount');
      
      log(`[ACTION] Fund Smart Account: ${fundAmount} MON from ${from}`);
      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: smartAccountAddress,
          value: '0x' + valueHex,
        }],
      });
      
      log(`[TX] fund transactionHash: ${txHash}`);
      await new Promise(r => setTimeout(r, 1200));
      await fetchBalances(false);
    } catch (err: any) {
      log(`[ERROR] Fund Smart Account: ${err?.message || err}`);
    }
  }

  // Initialize watcher once smart account is ready
  useEffect(() => {
    if (!smartAccountAddress) return;
    
    // First fetch (logged)
    fetchBalances(false);
    
    try {
      const unwatch = browserPublicClient.watchBlockNumber({
        poll: true,
        pollingInterval: 3000,
        onBlockNumber: async (bn) => {
          if (bn !== lastBlockRef.current) {
            lastBlockRef.current = bn;
            await fetchBalances(true); // silent refresh
          }
        },
        onError: (e) => log(`[WARN] watchBlockNumber error: ${e?.message || e}`),
      });
      unwatchRef.current = unwatch;
    } catch (e: any) {
      log('[WARN] watchBlockNumber unsupported');
    }

    return () => {
      if (unwatchRef.current) unwatchRef.current();
    };
  }, [smartAccountAddress]);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Phase 2: Smart Account Dashboard</h1>

      <SmartAccountManager
        onSmartAccountReady={setSmartAccountAddress}
        onLog={log}
      />

      {smartAccountAddress && (
        <>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Smart Account Balances:</h2>
            {loading ? (
              <p>Loading balances…</p>
            ) : (
              <ul className="space-y-1 text-lg">
                <li>MON: <b>{balances.native}</b></li>
                <li>sMON: <b>{balances.kintsu}</b></li>
                <li>gMON: <b>{balances.magma}</b></li>
              </ul>
            )}
            <button
              className="mt-2 px-3 py-2 bg-gray-700 text-white rounded"
              onClick={() => fetchBalances(false)}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh Balances'}
            </button>
          </section>

          <TokenTransfer
            smartAccountAddress={smartAccountAddress}
            balances={balances}
            onLog={log}
            disabled={loading}
          />

          {/* Fund Smart Account */}
          <section className="mb-6 p-4 border rounded">
            <h2 className="text-xl font-semibold mb-2">Fund Smart Account</h2>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.001"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="Amount MON"
                className="flex-1 p-2 border rounded"
              />
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={fundSmartAccount}
                disabled={loading}
              >
                Fund via EOA
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              This will prompt the connected wallet to send MON to the smart account address.
            </p>
          </section>

          {/* Staking Actions */}
          <section className="mb-6 space-y-3">
            <h2 className="text-xl font-semibold mb-2">Staking Actions:</h2>

            <div className="space-y-2">
              <label className="block text-sm">Stake MON → gMON (amount)</label>
              <input
                className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
                value={amt.magmaStake}
                onChange={(e) => setAmt((s) => ({ ...s, magmaStake: e.target.value }))}
              />
              <button
                className="w-full px-4 py-3 bg-blue-600 text-white rounded shadow"
                onClick={() => stakeMagma(amt.magmaStake)}
                disabled={loading}
              >
                Stake Magma
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm">Unstake gMON → MON (amount)</label>
              <input
                className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
                value={amt.magmaUnstake}
                onChange={(e) => setAmt((s) => ({ ...s, magmaUnstake: e.target.value }))}
              />
              <button
                className="w-full px-4 py-3 bg-blue-600 text-white rounded shadow"
                onClick={() => unstakeMagma(amt.magmaUnstake)}
                disabled={loading}
              >
                Unstake Magma
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm">Stake MON → sMON (amount)</label>
              <input
                className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
                value={amt.kintsuStake}
                onChange={(e) => setAmt((s) => ({ ...s, kintsuStake: e.target.value }))}
              />
              <button
                className="w-full px-4 py-3 bg-green-600 text-white rounded shadow"
                onClick={() => stakeKintsu(amt.kintsuStake)}
                disabled={loading}
              >
                Stake Kintsu
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm">Instant Unstake sMON → MON (amount)</label>
              <input
                className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
                value={amt.kintsuUnstake}
                onChange={(e) => setAmt((s) => ({ ...s, kintsuUnstake: e.target.value }))}
              />
              <button
                className="w-full px-4 py-3 bg-green-600 text-white rounded shadow"
                onClick={() => unstakeKintsu(amt.kintsuUnstake)}
                disabled={loading}
              >
                Instant Unstake Kintsu
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm">Request Unlock sMON (amount)</label>
              <input
                className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
                value={amt.kintsuUnstake}
                onChange={(e) => setAmt((s) => ({ ...s, kintsuUnstake: e.target.value }))}
              />
              <button
                className="w-full px-4 py-3 bg-yellow-600 text-white rounded shadow"
                onClick={() => requestUnlock(amt.kintsuUnstake)}
                disabled={loading}
              >
                Request Unlock
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm">Redeem Unlock Index</label>
              <input
                className="w-full px-3 py-2 border rounded bg-gray-800 text-white"
                placeholder="0"
              />
              <button
                className="w-full px-4 py-3 bg-yellow-600 text-white rounded shadow"
                onClick={() => redeemUnlock('0')}
                disabled={loading}
              >
                Redeem Unlock
              </button>
            </div>
          </section>

          {/* sMON Approvals */}
          <section className="mb-6 space-y-2">
            <h2 className="text-xl font-semibold mb-2">sMON Approvals (AA)</h2>
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-3 bg-purple-700 text-white rounded shadow"
                onClick={checkSmonApprovals}
                disabled={loading}
              >
                Check sMON Approvals
              </button>
              <button
                className="flex-1 px-4 py-3 bg-purple-700 text-white rounded shadow"
                onClick={approveSmon}
                disabled={loading}
              >
                Approve sMON (Batch AA)
              </button>
            </div>
            <p className="text-xs text-gray-300">
              Checks ERC20→Permit2 and Permit2→Router allowances; approval creates both in one batched UserOperation.
            </p>
          </section>

          <section className="mb-6">
            <button
              className="w-full px-6 py-4 bg-indigo-700 text-white rounded-lg font-semibold text-lg"
              onClick={rebalance}
              disabled={loading}
            >
              {loading ? 'Rebalancing…' : 'Rebalance All Funds'}
            </button>
          </section>
        </>
      )}

      {/* Logs */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Logs:</h2>
        <div className="bg-gray-600 p-3 rounded h-72 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="italic text-gray-300">No logs yet. Actions will be logged here.</p>
          ) : (
            logs.map((log, idx) => <div key={idx}>{log}</div>)
          )}
        </div>
      </section>
    </main>
  );
}
