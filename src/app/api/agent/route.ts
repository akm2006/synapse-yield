import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad } from '@/lib/viemClients';
// 1. Import the ABI
import { synapseYieldAdapterAbi } from '@/lib/abi'; 

// 2. Set the deployed contract address
const ADAPTER_CONTRACT_ADDRESS = '0x3ed79496b6b5f2aed1e2b8203df783bbe39e9002' as `0x${string}`;

export async function GET(request: Request) {
  console.log('Agent is running...');

  try {
    if (!process.env.AGENT_PRIVATE_KEY) {
      throw new Error("AGENT_PRIVATE_KEY is not set in .env.local");
    }
    
    const agentAccount = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);

    const agentClient = createWalletClient({
      account: agentAccount,
      chain: monad,
      transport: http(),
    });

    console.log('Scanning for best yields...');
    
    const needsRebalance = true; 
    if (needsRebalance) {
      console.log('Rebalance needed! Triggering transaction...');
      
      // 3. Uncomment this block to make the agent send a real transaction
      const txHash = await agentClient.writeContract({
        address: ADAPTER_CONTRACT_ADDRESS,
        abi: synapseYieldAdapterAbi,
        functionName: 'rebalance',
        args: ['Kintsu', 'Magma', 0], // Note: These are placeholder args for now
      });
      
      console.log('Rebalance transaction sent:', txHash);
    } else {
      console.log('No rebalance needed at this time.');
    }

    return NextResponse.json({ success: true, message: 'Agent ran successfully.' });

  } catch (error: any) {
    console.error('Agent error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}