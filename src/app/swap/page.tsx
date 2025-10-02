'use client';

import { useEffect, useRef, useState } from 'react';
import type { Address } from 'viem';
import { formatUnits, parseUnits, encodeFunctionData, encodeAbiParameters } from 'viem';
import { getAAClient, settleUserOperation } from '@/lib/aaClient';
import { CONTRACTS } from '@/lib/contracts';
import { emitLog, endLog } from '@/lib/logBus';
import { ensureTokenAllowancesAA } from '@/lib/ensureAllowancesAA';
import { magmaAbi, kintsuAbi, erc20Abi } from '@/lib/abis';
import { browserPublicClient } from '@/lib/smartAccountClient';

// Token addresses
const TOKENS = {
  MON: '0x0000000000000000000000000000000000000000' as Address,
  WMON: CONTRACTS.WMON,
  sMON: CONTRACTS.KINTSU,
  gMON: CONTRACTS.GMON,
};

// Token metadata for better UX
const TOKEN_INFO = {
  MON: { name: 'Monad', symbol: 'MON', icon: '🔷' },
  WMON: { name: 'Wrapped Monad', symbol: 'WMON', icon: '🔶' },
  sMON: { name: 'Staked Kintsu Monad', symbol: 'sMON', icon: '🥩' },
  gMON: { name: 'Staked Magma Monad', symbol: 'gMON', icon: '🏛️' },
};

// Universal Router ABI
const UNIVERSAL_ROUTER_ABI = [
  {
    type: 'function',
    name: 'execute',
    stateMutability: 'payable',
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

// WMON ABI for wrap/unwrap
const WMON_ABI = [
  { type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'wad', type: 'uint256' }], outputs: [] },
] as const;

// Universal Router Commands
const CMD_V3_SWAP_EXACT_IN = '0x00';
const CMD_WRAP_ETH = '0x0b';
const CMD_UNWRAP_WETH = '0x0c';

type SwapType = 'wrap' | 'unwrap' | 'swap' | 'stake-magma' | 'unstake-magma' | 'stake-kintsu' | 'unstake-smon' | 'swap-with-wrap' | 'swap-with-unwrap';

interface SwapPlan {
  type: SwapType;
  description: string;
  steps: string[];
}

interface Balances {
  native: string;
  wmon: string;
  smon: string;
  gmon: string;
}

export default function SwapPage() {
  const [fromToken, setFromToken] = useState<keyof typeof TOKENS>('sMON');
  const [toToken, setToToken] = useState<keyof typeof TOKENS>('gMON');
  const [amount, setAmount] = useState<string>('');
  const [swapPlan, setSwapPlan] = useState<SwapPlan | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [swapping, setSwapping] = useState<boolean>(false);
  const [balances, setBalances] = useState<Balances>({ native: '0', wmon: '0', smon: '0', gmon: '0' });
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);
  const [loadingBalances, setLoadingBalances] = useState<boolean>(false);
  const opIdRef = useRef<string | null>(null);

  function log(msg: string) {
    setLogs((prev) => [...prev, msg]);
    console.log(msg);
  }

  function newOpId(): string {
    return crypto.randomUUID();
  }

  function openStream(opId: string) {
    const es = new EventSource(`/api/logs/stream?id=${opId}`);
    es.addEventListener('log', (ev: MessageEvent) => {
      const { msg } = JSON.parse(ev.data as string);
      log(`[STREAM] ${msg}`);
    });
    es.addEventListener('done', () => es.close());
    es.onerror = () => es.close();
  }

  // Get smart account address
  async function getSmartAccountAddress() {
    try {
      const { client } = await getAAClient();
      const address = client.account.address;
      setSmartAccountAddress(address);
      return address;
    } catch (error) {
      console.error('Failed to get smart account address:', error);
      return null;
    }
  }

  // Fetch balances using individual calls (no multicall)
  async function fetchBalances() {
    if (!smartAccountAddress) return;

    setLoadingBalances(true);
    try {
      // Get native MON balance
      const nativeBalance = await browserPublicClient.getBalance({ address: smartAccountAddress });

      // Get ERC-20 balances individually
      const [wmonBalance, smonBalance, gmonBalance] = await Promise.all([
        browserPublicClient.readContract({
          address: CONTRACTS.WMON,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [smartAccountAddress],
        }).catch(() => 0n),
        
        browserPublicClient.readContract({
          address: CONTRACTS.KINTSU,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [smartAccountAddress],
        }).catch(() => 0n),
        
        browserPublicClient.readContract({
          address: CONTRACTS.GMON,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [smartAccountAddress],
        }).catch(() => 0n),
      ]);

      setBalances({
        native: formatUnits(nativeBalance, 18),
        wmon: formatUnits(wmonBalance as bigint, 18),
        smon: formatUnits(smonBalance as bigint, 18),
        gmon: formatUnits(gmonBalance as bigint, 18),
      });
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      // Set default balances on error
      setBalances({ native: '0', wmon: '0', smon: '0', gmon: '0' });
    } finally {
      setLoadingBalances(false);
    }
  }

  // Initialize smart account and fetch balances
  useEffect(() => {
    async function init() {
      const address = await getSmartAccountAddress();
      if (address) {
        await fetchBalances();
      }
    }
    init();
  }, []);

  // Refresh balances when smart account address changes
  useEffect(() => {
    if (smartAccountAddress) {
      fetchBalances();
    }
  }, [smartAccountAddress]);

  // Determine what type of swap this is
  function analyzeSwap(): SwapPlan | null {
    if (fromToken === toToken) return null;

    // Direct staking operations
    if (fromToken === 'MON' && toToken === 'gMON') {
      return {
        type: 'stake-magma',
        description: 'Stake MON to gMON via Magma',
        steps: ['Deposit MON into Magma contract', 'Receive gMON tokens'],
      };
    }
    
    if (fromToken === 'gMON' && toToken === 'MON') {
      return {
        type: 'unstake-magma',
        description: 'Unstake gMON to MON via Magma',
        steps: ['Withdraw gMON from Magma contract', 'Receive MON tokens'],
      };
    }

    if (fromToken === 'MON' && toToken === 'sMON') {
      return {
        type: 'stake-kintsu',
        description: 'Stake MON to sMON via Kintsu',
        steps: ['Deposit MON into Kintsu contract', 'Receive sMON tokens'],
      };
    }

    // sMON → MON: Convert to WMON first, then unwrap
    if (fromToken === 'sMON' && toToken === 'MON') {
      return {
        type: 'unstake-smon',
        description: 'Unstake sMON to MON via WMON',
        steps: ['Swap sMON to WMON via DEX', 'Unwrap WMON to MON'],
      };
    }

    // Direct wrap/unwrap
    if (fromToken === 'MON' && toToken === 'WMON') {
      return {
        type: 'wrap',
        description: 'Wrap MON to WMON (1:1)',
        steps: ['Deposit MON into WMON contract'],
      };
    }
    
    if (fromToken === 'WMON' && toToken === 'MON') {
      return {
        type: 'unwrap',
        description: 'Unwrap WMON to MON (1:1)',
        steps: ['Withdraw MON from WMON contract'],
      };
    }

    // MON to other ERC-20 (need to wrap first, then swap)
    if (fromToken === 'MON' && !['WMON', 'sMON', 'gMON'].includes(toToken)) {
      return {
        type: 'swap-with-wrap',
        description: `Wrap MON and swap to ${toToken}`,
        steps: [
          'Wrap MON to WMON via Universal Router',
          `Swap WMON to ${toToken} via DEX`,
        ],
      };
    }

    // Other ERC-20 to MON (swap first, then unwrap)
    if (!['MON', 'sMON', 'gMON'].includes(fromToken) && toToken === 'MON') {
      return {
        type: 'swap-with-unwrap',
        description: `Swap ${fromToken} to WMON and unwrap to MON`,
        steps: [
          `Swap ${fromToken} to WMON via DEX`,
          'Unwrap WMON to MON via Universal Router',
        ],
      };
    }

    // Direct ERC-20 to ERC-20 swap
    return {
      type: 'swap',
      description: `Swap ${fromToken} to ${toToken}`,
      steps: [`Swap ${fromToken} to ${toToken} via DEX`],
    };
  }

  // Create V3 path encoding
  function encodeV3Path(tokenA: Address, tokenB: Address, fee: number): `0x${string}` {
    const feeHex = fee.toString(16).padStart(6, '0');
    return `0x${tokenA.slice(2)}${feeHex}${tokenB.slice(2)}` as `0x${string}`;
  }

  // Get optimal fee tier based on token pair
  function getOptimalFee(from: keyof typeof TOKENS, to: keyof typeof TOKENS): number {
    if ((from === 'sMON' && to === 'gMON') || (from === 'gMON' && to === 'sMON')) {
      return 500; // 0.05%
    }
    if (from === 'WMON' || to === 'WMON') {
      return 2500; // 0.25%
    }
    return 2500; // 0.25%
  }

  // Execute the swap with proper handling for different scenarios
  async function executeSwap() {
    if (!swapPlan || !amount || +amount <= 0) {
      return log('[ERROR] Invalid swap parameters');
    }
    
    setSwapping(true);
    const opId = newOpId();
    opIdRef.current = opId;
    openStream(opId);

    try {
      log(`[ACTION] Starting ${swapPlan.description}`);
      
      const { client } = await getAAClient();
      const smartAccountAddress = client.account.address;
      const amountIn = parseUnits(amount, 18);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

      const calls: Array<{ to: Address; data: `0x${string}`; value?: bigint }> = [];

      switch (swapPlan.type) {
        case 'stake-magma':
          // MON → gMON via Magma staking
          log('[ACTION] Staking MON to Magma');
          const magmaStakeCalldata = encodeFunctionData({
            abi: magmaAbi,
            functionName: 'depositMon',
            args: [],
          });
          calls.push({
            to: CONTRACTS.MAGMA_STAKE,
            data: magmaStakeCalldata,
            value: amountIn,
          });
          break;

        case 'unstake-magma':
          // gMON → MON via Magma unstaking
          log('[ACTION] Unstaking gMON from Magma');
          const magmaUnstakeCalldata = encodeFunctionData({
            abi: magmaAbi,
            functionName: 'withdrawMon',
            args: [amountIn],
          });
          calls.push({
            to: CONTRACTS.MAGMA_STAKE,
            data: magmaUnstakeCalldata,
          });
          break;

        case 'stake-kintsu':
          // MON → sMON via Kintsu staking
          log('[ACTION] Staking MON to Kintsu');
          const kintsuStakeCalldata = encodeFunctionData({
            abi: kintsuAbi,
            functionName: 'deposit',
            args: [amountIn, smartAccountAddress],
          });
          calls.push({
            to: CONTRACTS.KINTSU,
            data: kintsuStakeCalldata,
            value: amountIn,
          });
          break;

       case 'unstake-smon':
  // sMON → MON via sMON→WMON→MON (two separate calls)
  log('[ACTION] Converting sMON to WMON, then unwrapping to MON');
  
  // Step 1: Check sMON approvals for the swap
  const smonApprovals = await ensureTokenAllowancesAA(CONTRACTS.KINTSU, amountIn, { 
    opId, 
    smartAccountAddress 
  });
  calls.push(...smonApprovals.requiredCalls);

  // Step 2: Swap sMON to WMON via Universal Router
  const smonToWmonFee = getOptimalFee('sMON', 'WMON');
  const smonToWmonPath = encodeV3Path(CONTRACTS.KINTSU, CONTRACTS.WMON, smonToWmonFee);
  const minWmonOut = (amountIn * 95n) / 100n; // 5% slippage

  const swapSmonParams = encodeAbiParameters(
    [
      { name: 'recipient', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMinimum', type: 'uint256' },
      { name: 'path', type: 'bytes' },
      { name: 'payerIsUser', type: 'bool' },
    ],
    [smartAccountAddress, amountIn, minWmonOut, smonToWmonPath, true] // Smart account receives WMON
  );

  const swapSmonCalldata = encodeFunctionData({
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: [CMD_V3_SWAP_EXACT_IN, [swapSmonParams], deadline],
  });

  calls.push({
    to: CONTRACTS.PANCAKESWAP,
    data: swapSmonCalldata,
  });

  // Step 3: Unwrap WMON to MON (withdraw all WMON balance)
  // Since we don't know exact amount received, we'll withdraw the minimum expected
  const unwrapWmonCalldata = encodeFunctionData({
    abi: WMON_ABI,
    functionName: 'withdraw',
    args: [minWmonOut],
  });

  calls.push({
    to: CONTRACTS.WMON,
    data: unwrapWmonCalldata,
  });
  break;


        case 'unwrap':
          // WMON → MON unwrap
          log('[ACTION] Checking WMON approval and unwrapping');
          const unwrapApprovals = await ensureTokenAllowancesAA(CONTRACTS.WMON, amountIn, { 
            opId, 
            smartAccountAddress 
          });
          calls.push(...unwrapApprovals.requiredCalls);
          
          const unwrapCalldata = encodeFunctionData({
            abi: WMON_ABI,
            functionName: 'withdraw',
            args: [amountIn],
          });
          calls.push({
            to: CONTRACTS.WMON,
            data: unwrapCalldata,
          });
          break;

        case 'swap':
          // Direct ERC-20 to ERC-20 swap
          log('[ACTION] Preparing token swap');
          
          const tokenApprovals = await ensureTokenAllowancesAA(TOKENS[fromToken], amountIn, { 
            opId, 
            smartAccountAddress 
          });
          calls.push(...tokenApprovals.requiredCalls);

          const fee = getOptimalFee(fromToken, toToken);
          const path = encodeV3Path(TOKENS[fromToken], TOKENS[toToken], fee);
          const minAmountOut = (amountIn * 95n) / 100n;

          const swapParams = encodeAbiParameters(
            [
              { name: 'recipient', type: 'address' },
              { name: 'amountIn', type: 'uint256' },
              { name: 'amountOutMinimum', type: 'uint256' },
              { name: 'path', type: 'bytes' },
              { name: 'payerIsUser', type: 'bool' },
            ],
            [smartAccountAddress, amountIn, minAmountOut, path, true]
          );

          const swapCalldata = encodeFunctionData({
            abi: UNIVERSAL_ROUTER_ABI,
            functionName: 'execute',
            args: [CMD_V3_SWAP_EXACT_IN, [swapParams], deadline],
          });

          calls.push({
            to: CONTRACTS.PANCAKESWAP,
            data: swapCalldata,
          });
          break;

        case 'swap-with-wrap':
          // MON → other tokens via wrap + swap
          log('[ACTION] Wrapping MON and swapping via Universal Router');
          
          const fee1 = getOptimalFee('WMON', toToken);
          const wrapSwapPath = encodeV3Path(CONTRACTS.WMON, TOKENS[toToken], fee1);
          const minOut1 = (amountIn * 95n) / 100n;

          const wrapSwapCommands = `${CMD_WRAP_ETH}${CMD_V3_SWAP_EXACT_IN}` as `0x${string}`;
          
          const wrapParams = encodeAbiParameters(
            [{ name: 'recipient', type: 'address' }, { name: 'amountMin', type: 'uint256' }],
            [smartAccountAddress, amountIn]
          );

          const swapAfterWrapParams = encodeAbiParameters(
            [
              { name: 'recipient', type: 'address' },
              { name: 'amountIn', type: 'uint256' },
              { name: 'amountOutMinimum', type: 'uint256' },
              { name: 'path', type: 'bytes' },
              { name: 'payerIsUser', type: 'bool' },
            ],
            [smartAccountAddress, amountIn, minOut1, wrapSwapPath, false]
          );

          const wrapSwapCalldata = encodeFunctionData({
            abi: UNIVERSAL_ROUTER_ABI,
            functionName: 'execute',
            args: [wrapSwapCommands, [wrapParams, swapAfterWrapParams], deadline],
          });

          calls.push({
            to: CONTRACTS.PANCAKESWAP,
            data: wrapSwapCalldata,
            value: amountIn,
          });
          break;

        case 'swap-with-unwrap':
          // Other tokens → MON via swap + unwrap
          log('[ACTION] Swapping to WMON and unwrapping via Universal Router');
          
          const swapUnwrapApprovals = await ensureTokenAllowancesAA(TOKENS[fromToken], amountIn, { 
            opId, 
            smartAccountAddress 
          });
          calls.push(...swapUnwrapApprovals.requiredCalls);

          const fee2 = getOptimalFee(fromToken, 'WMON');
          const swapToWmonPath = encodeV3Path(TOKENS[fromToken], CONTRACTS.WMON, fee2);
          const minOut2 = (amountIn * 95n) / 100n;

          const swapUnwrapCommands = `${CMD_V3_SWAP_EXACT_IN}${CMD_UNWRAP_WETH}` as `0x${string}`;

          const swapToWmonParams = encodeAbiParameters(
            [
              { name: 'recipient', type: 'address' },
              { name: 'amountIn', type: 'uint256' },
              { name: 'amountOutMinimum', type: 'uint256' },
              { name: 'path', type: 'bytes' },
              { name: 'payerIsUser', type: 'bool' },
            ],
            [CONTRACTS.PANCAKESWAP, amountIn, minOut2, swapToWmonPath, true]
          );

          const unwrapAfterSwapParams = encodeAbiParameters(
            [{ name: 'recipient', type: 'address' }, { name: 'amountMin', type: 'uint256' }],
            [smartAccountAddress, minOut2]
          );

          const swapUnwrapCalldata = encodeFunctionData({
            abi: UNIVERSAL_ROUTER_ABI,
            functionName: 'execute',
            args: [swapUnwrapCommands, [swapToWmonParams, unwrapAfterSwapParams], deadline],
          });

          calls.push({
            to: CONTRACTS.PANCAKESWAP,
            data: swapUnwrapCalldata,
          });
          break;
      }

      log(`[ACTION] Executing ${calls.length} calls via UserOperation`);
      
      const userOpHash = await client.sendUserOperation({ calls });
      log(`[UO] UserOp Hash: ${userOpHash}`);
      
      const settled = await settleUserOperation(userOpHash);
      log(`[TX] Transaction: ${settled.transactionHash}`);
      log(`[TX] Block: ${settled.blockNumber}`);
      log(`[SUCCESS] ${swapPlan.description} completed!`);
      
      // Refresh balances after successful transaction
      setTimeout(() => {
        fetchBalances();
      }, 2000);
      
      if (opIdRef.current) endLog(opIdRef.current);
    } catch (e: any) {
      log(`[ERROR] Swap failed: ${e.message || e}`);
      if (e.cause) log(`[ERROR] Cause: ${e.cause}`);
      if (e.details) log(`[ERROR] Details: ${e.details}`);
      if (opIdRef.current) endLog(opIdRef.current);
    } finally {
      setSwapping(false);
    }
  }

  // Update swap plan when tokens change
  useEffect(() => {
    setSwapPlan(analyzeSwap());
  }, [fromToken, toToken]);

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Balance Section */}
        {smartAccountAddress && (
          <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Your Balances</h2>
              <p className="text-green-100 text-sm">{smartAccountAddress.slice(0, 6)}...{smartAccountAddress.slice(-4)}</p>
            </div>
            <div className="p-6">
              {loadingBalances ? (
                <div className="flex items-center justify-center py-4">
                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-2 text-gray-400">Loading balances...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(TOKEN_INFO).map(([key, info]) => {
                    const balance = key === 'MON' ? balances.native : 
                                   key === 'WMON' ? balances.wmon :
                                   key === 'sMON' ? balances.smon : balances.gmon;
                    return (
                      <div key={key} className="bg-gray-750 p-3 rounded-lg border border-gray-600">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{info.icon}</span>
                          <div>
                            <p className="text-xs text-gray-400">{info.symbol}</p>
                            <p className="text-white font-mono text-sm">
                              {parseFloat(balance).toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                onClick={fetchBalances}
                disabled={loadingBalances}
                className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                🔄 Refresh Balances
              </button>
            </div>
          </div>
        )}

        {/* Main Swap Card */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
            <h1 className="text-xl font-bold text-white">Smart Account Swap</h1>
            <p className="text-purple-100 text-sm">Seamless staking & token swapping</p>
          </div>

          {/* Swap Interface */}
          <div className="p-6 space-y-4">
            {/* From Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">From</label>
              <div className="relative">
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value as keyof typeof TOKENS)}
                  className="w-full p-3 pr-10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-700 text-white"
                >
                  {Object.entries(TOKEN_INFO).map(([key, info]) => (
                    <option key={key} value={key} className="bg-gray-700">
                      {info.icon} {info.name} ({info.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const temp = fromToken;
                  setFromToken(toToken);
                  setToToken(temp);
                }}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-all duration-200 transform hover:scale-105 border border-gray-600"
                title="Swap tokens"
              >
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">To</label>
              <div className="relative">
                <select
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value as keyof typeof TOKENS)}
                  className="w-full p-3 pr-10 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-700 text-white"
                >
                  {Object.entries(TOKEN_INFO).map(([key, info]) => (
                    <option key={key} value={key} className="bg-gray-700">
                      {info.icon} {info.name} ({info.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300">Amount</label>
                <button
                  onClick={() => {
                    const balance = fromToken === 'MON' ? balances.native : 
                                   fromToken === 'WMON' ? balances.wmon :
                                   fromToken === 'sMON' ? balances.smon : balances.gmon;
                    setAmount(balance);
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Max: {fromToken === 'MON' ? balances.native : 
                        fromToken === 'WMON' ? balances.wmon :
                        fromToken === 'sMON' ? balances.smon : balances.gmon}
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.001"
                min="0"
                className="w-full p-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                placeholder="0.0"
              />
            </div>

            {/* Swap Plan Display */}
            {swapPlan && amount && +amount > 0 && (
              <div className="p-4 bg-gray-750 border border-purple-500/30 rounded-lg">
                <h3 className="font-medium text-purple-300 mb-2">{swapPlan.description}</h3>
                <div className="space-y-1">
                  {swapPlan.steps.map((step, i) => (
                    <div key={i} className="flex items-center text-sm text-gray-300">
                      <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs mr-2">
                        {i + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={executeSwap}
              disabled={swapping || !swapPlan || !amount || +amount <= 0 || fromToken === toToken}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100"
            >
              {swapping ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : (
                `Execute ${swapPlan?.type.includes('stake') ? 'Stake' : swapPlan?.type === 'wrap' ? 'Wrap' : swapPlan?.type === 'unwrap' ? 'Unwrap' : 'Swap'}`
              )}
            </button>
          </div>
        </div>

        {/* Logs Section */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="px-6 py-4 bg-gray-750 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-100">Transaction Logs</h2>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="text-sm text-gray-400 hover:text-gray-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="bg-black rounded-lg p-4 h-48 overflow-y-auto font-mono text-sm border border-gray-700">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">Logs will appear here...</p>
              ) : (
                logs.map((line, i) => (
                  <div key={i} className="mb-1 text-green-400 break-words">
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
