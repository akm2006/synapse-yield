// src/components/SwapInterface.tsx
'use client';
import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import { useSSEStream } from '@/hooks/useSSEStream';
import { useTokenOperations } from '@/hooks/useTokenOperations';
import type { Balances } from '@/hooks/useBalances';
import { CONTRACTS } from '@/lib/contracts';
interface SwapInterfaceProps {
  smartAccountAddress: Address | null;
  balances: Balances;
  onLog: (msg: string) => void;  
  disabled?: boolean;
  onBalanceRefresh?: () => void;
  delegation?: any; // Add delegation prop
}

const TOKEN_INFO = {
  MON: { name: 'Monad', symbol: 'MON', icon: '🔷' },
  WMON: { name: 'Wrapped Monad', symbol: 'WMON', icon: '🔶' },
  sMON: { name: 'Staked Kintsu Monad', symbol: 'sMON', icon: '🥩' },
  gMON: { name: 'Staked Magma Monad', symbol: 'gMON', icon: '🏛️' },
};

type TokenKey = keyof typeof TOKEN_INFO;
interface SwapPlan {
  type: 'stake-magma' | 'unstake-magma' | 'stake-kintsu' | 'unstake-kintsu' | 'direct-swap';
  description: string;
  steps: string[];
  isOptimal?: boolean;
}

export default function SwapInterface({
  smartAccountAddress,
  balances,
  onLog,
  disabled = false,
  onBalanceRefresh,
  delegation // Add to destructuring
}: SwapInterfaceProps) {
  const [fromToken, setFromToken] = useState<TokenKey>('sMON');
  const [toToken, setToToken] = useState<TokenKey>('gMON');
  const [amount, setAmount] = useState('');
  const [swapPlan, setSwapPlan] = useState<SwapPlan | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const { generateOpId, openStream } = useSSEStream();
  const {
    stakeMagma, unstakeMagma, stakeKintsu, unstakeKintsu,
    directSwap, wrapMon, unwrapWmon
  } = useTokenOperations();

  const TOKEN_ADDRESSES: Record<TokenKey, Address> = {
    MON: '0x0000000000000000000000000000000000000000' as Address,
    WMON: CONTRACTS.WMON,
    sMON: CONTRACTS.KINTSU,
    gMON: CONTRACTS.GMON,
  };

  const getOptimalFee = (from: TokenKey, to: TokenKey): number => {
    if (
      (from === 'sMON' && to === 'gMON') ||
      (from === 'gMON' && to === 'sMON') ||
      (from === 'sMON' && to === 'WMON') ||
      (from === 'WMON' && to === 'sMON') ||
      (from === 'gMON' && to === 'WMON') ||
      (from === 'WMON' && to === 'gMON')
    ) return 500;
    return 2500;
  };

  const analyzeSwap = (): SwapPlan | null => {
    if (fromToken === toToken) return null;
    if (fromToken === 'MON' && toToken === 'gMON') return {type:'stake-magma',description:'Stake MON to gMON via Magma',steps:['Deposit MON','Receive gMON'],isOptimal:true};
    if (fromToken === 'gMON' && toToken === 'MON') return {type:'unstake-magma',description:'Unstake gMON to MON via Magma',steps:['Withdraw gMON','Receive MON'],isOptimal:true};
    if (fromToken === 'MON' && toToken === 'sMON') return {type:'stake-kintsu',description:'Stake MON to sMON via Kintsu',steps:['Deposit MON','Receive sMON'],isOptimal:true};
    if (fromToken === 'sMON' && toToken === 'MON') return {type:'unstake-kintsu',description:'Instant unstake sMON to MON via DEX',steps:['Swap sMON→WMON','Unwrap WMON'],isOptimal:true};
    if ((fromToken==='sMON'&&toToken==='gMON')||(fromToken==='gMON'&&toToken==='sMON')) {
      return {type:'direct-swap',description:`Direct swap ${fromToken} ↔ ${toToken}`,steps:['Single swap via PancakeSwap'],isOptimal:true};
    }
    if (fromToken==='MON'&&toToken==='WMON') return {type:'direct-swap',description:'Wrap MON to WMON',steps:['Wrap native MON'],isOptimal:true};
    if (fromToken==='WMON'&&toToken==='MON') return {type:'direct-swap',description:'Unwrap WMON to MON',steps:['Unwrap WMON'],isOptimal:true};
    return {type:'direct-swap',description:`Swap ${fromToken} to ${toToken}`,steps:[`Swap via PancakeSwap`],isOptimal:false};
  };

  // Near line 70, update the executeSwap function:
// --- Start of your changes ---
const executeSwap = async () => {
  if (!swapPlan || !amount || +amount <= 0 || !smartAccountAddress || !delegation) {
    return onLog('[ERROR] Invalid swap parameters or missing delegation');
  }

  setIsSwapping(true);
  const opId = generateOpId();
  openStream(opId, onLog);

  try {
    onLog(`[ACTION] ${swapPlan.description}`);
    let result;

    switch (swapPlan.type) {
      case 'stake-magma': 
        result = await fetch('/api/delegate/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: smartAccountAddress,
            operation: 'stake-magma',
            amount,
            delegation
          }),
        }).then(r => r.json());
        break;
        
      case 'unstake-magma': 
        result = await fetch('/api/delegate/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: smartAccountAddress,
            operation: 'unstake-magma',
            amount,
            delegation
          }),
        }).then(r => r.json());
        break;
        
      case 'stake-kintsu': 
        result = await fetch('/api/delegate/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: smartAccountAddress,
            operation: 'stake-kintsu',
            amount,
            receiver: smartAccountAddress,
            delegation
          }),
        }).then(r => r.json());
        break;
        
      case 'unstake-kintsu': {
        const inWei = BigInt(Math.floor(+amount * 1e18)).toString();
        const minOut = (BigInt(inWei) * 99n / 100n).toString();
        result = await fetch('/api/delegate/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: smartAccountAddress,
            operation: 'kintsu-instant-unstake',
            amountIn: inWei,
            minOut,
            fee: 2500,
            recipient: smartAccountAddress,
            unwrap: true,
            delegation
          }),
        }).then(r => r.json());
        break;
      }
      
      case 'direct-swap': {
        if (fromToken === 'MON' && toToken === 'WMON') {
          result = await fetch('/api/delegate/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userAddress: smartAccountAddress,
              operation: 'wrap-mon',
              amount,
              delegation
            }),
          }).then(r => r.json());
        } else if (fromToken === 'WMON' && toToken === 'MON') {
          result = await fetch('/api/delegate/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userAddress: smartAccountAddress,
              operation: 'unwrap-wmon',
              amount,
              delegation
            }),
          }).then(r => r.json());
        } else {
          const fromAddr = TOKEN_ADDRESSES[fromToken];
          const toAddr = TOKEN_ADDRESSES[toToken];
          const inWei = BigInt(Math.floor(+amount * 1e18)).toString();
          const minOut = (BigInt(inWei) * 95n / 100n).toString();
          const fee = getOptimalFee(fromToken, toToken);
          
          result = await fetch('/api/delegate/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userAddress: smartAccountAddress,
              operation: 'direct-swap',
              fromToken: fromAddr,
              toToken: toAddr,
              amountIn: inWei,
              minOut,
              fee,
              recipient: smartAccountAddress,
              deadline: Math.floor(Date.now() / 1000) + 1800,
              delegation
            }),
          }).then(r => r.json());
        }
        break;
      }
      
      default: 
        throw new Error(`Unknown type ${swapPlan.type}`);
    }

  if (!result.success) throw new Error(result.error);

const ops = result.operations ?? [];

if (ops.length === 0) {
  onLog(`[WARN] No operations returned`);
} else if (ops.length === 1) {
  const op = ops[0];
  if (op.userOpHash) onLog(`[UO] ${op.userOpHash}`);
  if (op.txHash) onLog(`[TX] ${op.txHash}`);
} else {
  onLog(`[INFO] Batched ${ops.length} operations`);
  ops.forEach(
    (op: { userOpHash?: string; txHash?: string; target?: string }, i: number) => {
      onLog(`[OP-${i + 1}] target: ${op.target}, userOpHash: ${op.userOpHash}, txHash: ${op.txHash}`);
    }
  );


}

    
    onLog(`[SUCCESS] ${swapPlan.description}`);
    setTimeout(() => onBalanceRefresh?.(), 2000);
  } catch (e: any) {
    onLog(`[ERROR] ${swapPlan.description} failed: ${e.message || e}`);
  } finally {
    setIsSwapping(false);
  }
};
// --- End of your changes ---


  const getMaxBalance = () => {
    switch(fromToken){
      case 'MON': return balances.native;
      case 'sMON': return balances.kintsu;
      case 'gMON': return balances.magma;
      case 'WMON': return balances.wmon||'0';
      default: return '0';
    }
  };

  useEffect(()=>{setSwapPlan(analyzeSwap())},[fromToken,toToken]);

  if(!smartAccountAddress){
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Token Swap</h3>
        <p className="text-gray-400">Create Smart Account first</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Smart Account Swap</h3>
        <p className="text-sm text-gray-400">Seamless staking & swapping</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">From</label>
          <select value={fromToken} onChange={e=>setFromToken(e.target.value as TokenKey)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
            {Object.entries(TOKEN_INFO).map(([k,info])=>(
              <option key={k} value={k}>{info.icon} {info.symbol}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-center">
          <button type="button" onClick={()=>{
            const t=fromToken; setFromToken(toToken); setToToken(t);
          }} disabled={disabled||isSwapping}
            className="bg-purple-600 p-2 rounded-full">
            <svg className="w-4 h-4 text-white rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
          </button>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">To</label>
          <select value={toToken} onChange={e=>setToToken(e.target.value as TokenKey)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
            {Object.entries(TOKEN_INFO).map(([k,info])=>(
              <option key={k} value={k}>{info.icon} {info.symbol}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-300">Amount</label>
            <button onClick={()=>setAmount(getMaxBalance())}
              className="text-sm text-purple-400">Max: {parseFloat(getMaxBalance()).toFixed(4)}</button>
          </div>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
            step="0.001" min="0" max={getMaxBalance()}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"/>
        </div>
        {swapPlan && amount && +amount>0 && (
          <div className={`p-4 rounded-lg ${swapPlan.isOptimal?'bg-green-900/20 border border-green-700':'bg-gray-700'}`}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-white">{swapPlan.description}</h4>
              {swapPlan.isOptimal && <span className="text-xs bg-green-600 px-2 py-1 rounded">⚡ Optimal</span>}
            </div>
            <div className="space-y-2">
              {swapPlan.steps.map((s,i)=>(
                <div key={i} className="flex items-start text-sm text-gray-300">
                  <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">{i+1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={executeSwap}
          disabled={!swapPlan||!amount||+amount<=0||disabled||isSwapping}
          className="w-full bg-purple-600 py-3 text-white rounded-lg disabled:bg-gray-600">
          {isSwapping?'Swapping...':swapPlan?.description||'Select tokens'}
        </button>
      </div>
    </div>
  );
}
