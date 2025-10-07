import { NextRequest, NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import { Hex, Address } from 'viem';
import { toMetaMaskSmartAccount, Implementation } from '@metamask/delegation-toolkit';
import { createPublicClient, http } from 'viem';
import { monadTestnet } from '@/lib/smartAccountClient';

// ✅ SECURE: Private key stored server-side only
const DELEGATE_PRIVATE_KEY = process.env.DELEGATE_PRIVATE_KEY as Hex;
if (!DELEGATE_PRIVATE_KEY) {
  throw new Error('DELEGATE_PRIVATE_KEY environment variable is required');
}

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress } = body;

    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 });
    }

    // Create delegate account from private key
    const account = privateKeyToAccount(DELEGATE_PRIVATE_KEY);
    
    const delegateSA = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [account.address as Address, [] as string[], [] as bigint[], [] as bigint[]],
      deploySalt: "0x" as Address,
      signer: { account },
    });

    return NextResponse.json({
      delegateAddress: delegateSA.address,
    });
  } catch (error) {
    console.error('Failed to get delegate info:', error);
    return NextResponse.json(
      { error: 'Failed to get delegate information' },
      { status: 500 }
    );
  }
}
