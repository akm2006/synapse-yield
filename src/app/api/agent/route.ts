import { NextResponse } from 'next/server';
import {
  encodeFunctionData,
  getAddress,
  parseEther,
  formatEther,
  createWalletClient,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad, bundlerClient, publicClient, BUNDLER_RPC_URL } from '@/lib/viemClients';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { synapseYieldAdapterAbi } from '@/lib/abi';
import { kintsuAddress, kintsuAbi, magmaAddress, magmaAbi, gMonAddress, gMonAbi } from '@/lib/protocolAbis';
import {
  createExecution,
  ExecutionMode,
  toMetaMaskSmartAccount,
  Implementation,
  getDeleGatorEnvironment,
} from '@metamask/delegation-toolkit';
import { DelegationManager } from '@metamask/delegation-toolkit/contracts';
import type { Delegation } from '@metamask/delegation-toolkit';

// ----------------- CONFIG -----------------
const ADAPTER_CONTRACT_ADDRESS = getAddress(
  '0x3ed79496b6b5f2aed1e2b8203df783bbe39e9002'
) as `0x${string}`;

// Minimal EntryPoint ABI for deposit/balance
const entryPointAbi = [
  {
    type: 'function',
    name: 'depositTo',
    stateMutability: 'payable',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint112' }],
  },
] as const;

// Rebalance threshold (5% = 0.05)
const REBALANCE_THRESHOLD = 0.05;

// Test amounts for rate calculations
const KINTSU_TEST_AMOUNT = parseEther('1000'); // 1000 sMON shares
const RATE_PRECISION = parseEther('1'); // For calculating precise rates

// Example signed delegation (replace with production data)
const signedDelegation: Delegation = {
  delegator: '0x4a402f781Cd83Ff77F4658C827d91FEc552619E2',
  delegate: '0xFE5AB50d48cf989616A4173083aF646d613fc857',
  authority: '0x442da5e7cef50064ca853508dc466d44de9632c1f69d5d49ab899cea95583926',
  caveats: [
    {
      enforcer: '0x7F20f61b1f09b08D970938F6fa563634d65c4EeB',
      terms:
        '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000003ed79496b6b5f2aed1e2b8203df783bbe39e9002',
      args: '0x',
    },
    {
      enforcer: '0x2C21fD0cB9DC8445Cb3fB0DC5e7bB0Aca0184285',
      terms:
        '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000003ed79496b6b5f2aed1e2b8203df783bbe39e90020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000131b89b1900000000000000000000000000000000000000000000000000000000',
      args: '0x',
    },
  ],
  salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
  signature:
    '0x00000000000000000000000069aa2f9fe1572f1b640e1bbc512f5c3a734fc77c0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000066000000000000000000000000000000000000000000000000000000000000005c44af63f0200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000055060806040526040516103f03803806103f08339810160408190526100229161025e565b61002c8282610033565b5050610341565b61003c82610091565b6040516001600160a01b038316907fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b905f90a280511561008557610080828261010c565b505050565b61008d61017f565b5050565b806001600160a01b03163b5f036100cb57604051634c9c8ce360e01b81526001600160a01b03821660048201526024015b60405180910390fd5b7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc80546001600160a01b0319166001600160a01b0392909216919091179055565b60605f80846001600160a01b0316846040516101289190610326565b5f60405180830381855af49150503d805f8114610160576040519150601f19603f3d011682016040523d82523d5f602084013e610165565b606091505b5090925090506101768583836101a0565b95945050505050565b341561019e5760405163b398979f60e01b815260040160405180910390fd5b565b6060826101b5576101b0826101ff565b6101f8565b81511580156101cc57506001600160a01b0384163b155b156101f557604051639996b31560e01b81526001600160a01b03851660048201526024016100c2565b50805b9392505050565b80511561020f5780518082602001fd5b604051630a12f52160e11b815260040160405180910390fd5b634e487b7160e01b5f52604160045260245ffd5b5f5b8381101561025657818101518382015260200161023e565b50505f910152565b5f806040838503121561026f575f80fd5b82516001600160a01b0381168114610285575f80fd5b60208401519092506001600160401b03808211156102a1575f80fd5b818501915085601f8301126102b4575f80fd5b8151818111156102c6576102c6610228565b604051601f8201601f19908116603f011681019083821181831017156102ee576102ee610228565b81604052828152886020848701011115610306575f80fd5b61031783602083016020880161023c565b80955050505050509250929050565b5f825161033781846020870161023c565b9190910192915050565b60a38061034d5f395ff3fe6080604052600a600c565b005b60186014601a565b6050565b565b5f604b7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc546001600160a01b031690565b905090565b365f80375f80365f845af43d5f803e8080156069573d5ff35b3d5ffdfea2646970667358221220fd2cc92935c943d341edacaf5318a0b9ab0185ce62ef72e95ab393ef358730c464736f6c6343000817003300000000000000000000000048dbe696a4d990079e039489ba2053b36e8ffec4000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e48ebf9533000000000000000000000000fe5ab50d48cf989616a4173083af646d613fc857000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000411b0978c77ca00feed3e9d57428618918e62e4b4ca7c46b8e31322bb81fe356c43e6f0410d12209f9e58791cd5cef1046cd01f4bd3ce8954d0d1f07e563f5e23d1c000000000000000000000000000000000000000000000000000000000000006492649264926492649264926492649264926492649264926492649264926492',
};

// ----------------- TYPES -----------------
interface ProtocolMetrics {
  kintsuExchangeRate: bigint;
  kintsuTotalShares: bigint;
  kintsuTotalAssets: bigint;
  magmaTVL: bigint;
  kintsuAPY: number;
  magmaAPY: number;
}

interface UserPosition {
  protocol: 'Kintsu' | 'Magma';
  amount: bigint;
  shares?: bigint;
}

// ----------------- HELPERS -----------------
async function ensureEntryPointPrefund({
  walletClient,
  entryPointAddress,
  accountAddress,
  minDeposit = parseEther('0.01'),
  topUpAmount = parseEther('0.05'),
}: {
  walletClient: ReturnType<typeof createWalletClient>;
  entryPointAddress: `0x${string}`;
  accountAddress: `0x${string}`;
  minDeposit?: bigint;
  topUpAmount?: bigint;
}) {
  console.log('⛽ Checking EntryPoint deposit for SA:', accountAddress, 'at', entryPointAddress);
  const deposit: bigint = await publicClient.readContract({
    address: entryPointAddress,
    abi: entryPointAbi,
    functionName: 'balanceOf',
    args: [accountAddress],
  });
  console.log('• Current EP deposit:', formatEther(deposit), 'MON');

  if (deposit >= minDeposit) {
    console.log('• Deposit already sufficient, skipping top-up');
    return;
  }

  console.log('• Depositing to EntryPoint:', {
    toAccount: accountAddress,
    amount: formatEther(topUpAmount),
    entryPointAddress,
  });

  const txHash = await walletClient.writeContract({
    address: entryPointAddress,
    abi: entryPointAbi,
    functionName: 'depositTo',
    args: [accountAddress],
    value: topUpAmount,
    account: walletClient.account!,
    chain: monad,
  });

  console.log('• depositTo tx sent:', txHash);
}

// Metrics: Kintsu
async function fetchKintsuMetrics(): Promise<Partial<ProtocolMetrics>> {
  const metrics: Partial<ProtocolMetrics> = {};
  console.log('🔍 Fetching Kintsu metrics...');
  try {
    const totalShares = (await publicClient.readContract({
      address: kintsuAddress,
      abi: kintsuAbi,
      functionName: 'totalShares',
    })) as bigint;
    metrics.kintsuTotalShares = totalShares;
    console.log('• Kintsu.totalShares:', formatEther(totalShares), 'sMON');

    if (metrics.kintsuTotalShares && metrics.kintsuTotalShares > 0n) {
      const testShares =
        metrics.kintsuTotalShares > KINTSU_TEST_AMOUNT
          ? KINTSU_TEST_AMOUNT
          : metrics.kintsuTotalShares / 10n;

      const assetsForShares = (await publicClient.readContract({
        address: kintsuAddress,
        abi: kintsuAbi,
        functionName: 'convertToAssets',
        args: [testShares],
      })) as bigint;

      console.log('• convertToAssets(testShares):', formatEther(assetsForShares), 'MON');

      if (assetsForShares > 0n) {
        metrics.kintsuExchangeRate = (assetsForShares * RATE_PRECISION) / testShares;
        metrics.kintsuTotalAssets =
          (metrics.kintsuTotalShares * metrics.kintsuExchangeRate) / RATE_PRECISION;

        console.log('• Kintsu.exchangeRate:', formatEther(metrics.kintsuExchangeRate), 'MON per sMON');
        console.log('• Kintsu.totalAssets:', formatEther(metrics.kintsuTotalAssets), 'MON');
      }
    }

    if (!metrics.kintsuExchangeRate) {
      const testAssets = parseEther('1000');
      const sharesForAssets = (await publicClient.readContract({
        address: kintsuAddress,
        abi: kintsuAbi,
        functionName: 'previewDeposit',
        args: [testAssets],
      })) as bigint;

      console.log('• previewDeposit(1000 MON) -> shares:', formatEther(sharesForAssets), 'sMON');

      if (sharesForAssets > 0n) {
        metrics.kintsuExchangeRate = (testAssets * RATE_PRECISION) / sharesForAssets;
        console.log('• Kintsu.exchangeRate (from preview):', formatEther(metrics.kintsuExchangeRate));
      }
    }

    if (!metrics.kintsuExchangeRate && metrics.kintsuTotalShares === 0n) {
      metrics.kintsuExchangeRate = RATE_PRECISION;
      metrics.kintsuTotalAssets = 0n;
      console.log('• Kintsu appears empty, using 1:1 exchange rate');
    }
  } catch (e) {
    console.warn('⚠️ Failed to fetch some Kintsu metrics:', e);
  }
  return metrics;
}

// Metrics: Magma
async function fetchMagmaMetrics(): Promise<Partial<ProtocolMetrics>> {
  const metrics: Partial<ProtocolMetrics> = {};
  console.log('🔍 Fetching Magma metrics...');
  try {
    const tvl = (await publicClient.readContract({
      address: magmaAddress,
      abi: magmaAbi,
      functionName: 'calculateTVL',
    })) as bigint;
    metrics.magmaTVL = tvl;
    metrics.magmaAPY = 0; // placeholder
    console.log('• Magma.TVL:', formatEther(tvl), 'MON');
  } catch (e) {
    console.warn('⚠️ Failed to fetch Magma metrics:', e);
    metrics.magmaTVL = 0n;
  }
  return metrics;
}

function determineOptimalProtocol(metrics: ProtocolMetrics): 'Kintsu' | 'Magma' {
  const kintsuScore = metrics.kintsuExchangeRate || 0n;
  const magmaScore = metrics.magmaTVL || 0n;
  const choice = kintsuScore > magmaScore ? 'Kintsu' : 'Magma';
  console.log('🎯 Scoring -> choice:', choice, {
    kintsuScore: kintsuScore.toString(),
    magmaScore: magmaScore.toString(),
  });
  return choice;
}

function shouldRebalance(
  currentProtocol: 'Kintsu' | 'Magma',
  optimalProtocol: 'Kintsu' | 'Magma',
  metrics: ProtocolMetrics,
): boolean {
  if (currentProtocol === optimalProtocol) {
    console.log('✅ Already optimal; no rebalance needed');
    return false;
  }
  const kintsuRate = Number(formatEther(metrics.kintsuExchangeRate || 0n));
  const magmaRate = Number(formatEther(metrics.magmaTVL || 0n)) / 1e6; // rough normalize
  const difference = Math.abs(kintsuRate - magmaRate) / Math.max(kintsuRate, magmaRate || 1);
  const needed = difference > REBALANCE_THRESHOLD;
  console.log('🔎 Rebalance decision:', { kintsuRate, magmaRate, difference, needed });
  return needed;
}

async function getUserPosition(userAddress: `0x${string}`): Promise<UserPosition> {
  console.log('👤 Reading user position for SA:', userAddress);
  try {
    const kintsuBalance = (await publicClient.readContract({
      address: kintsuAddress,
      abi: kintsuAbi,
      functionName: 'balanceOf',
      args: [userAddress],
    })) as bigint;
    console.log('• Kintsu.balanceOf:', formatEther(kintsuBalance), 'sMON');
    if (kintsuBalance > 0n) {
      return { protocol: 'Kintsu', amount: kintsuBalance, shares: kintsuBalance };
    }
  } catch (e) {
    console.warn('⚠️ Kintsu.balanceOf failed:', e);
  }

  try {
    const magmaStake = (await publicClient.readContract({
      address: gMonAddress,
      abi: gMonAbi,
      functionName: 'balanceOf',
      args: [userAddress],
    })) as bigint;
    console.log('• Magma.gMON balanceOf:', formatEther(magmaStake), 'gMON');
    if (magmaStake > 0n) {
      return { protocol: 'Magma', amount: magmaStake };
    }
  } catch (e) {
    console.warn('⚠️ Magma.balanceOf failed:', e);
  }

  console.log('• No balances found; defaulting to Kintsu/0');
  return { protocol: 'Kintsu', amount: 0n };
}

export async function GET() {
  try {
    console.log('🚀 Agent route start');
    if (!process.env.AGENT_PRIVATE_KEY) {
      throw new Error('❌ AGENT_PRIVATE_KEY is not set in .env.local');
    }

    // 1) Fetch metrics in parallel
    const [kintsuMetrics, magmaMetrics] = await Promise.all([fetchKintsuMetrics(), fetchMagmaMetrics()]);
    console.log('📈 Metrics fetched:', {
      kintsu: {
        exchangeRate: kintsuMetrics.kintsuExchangeRate ? formatEther(kintsuMetrics.kintsuExchangeRate) : '0',
        totalShares: kintsuMetrics.kintsuTotalShares ? formatEther(kintsuMetrics.kintsuTotalShares) : '0',
        totalAssets: kintsuMetrics.kintsuTotalAssets ? formatEther(kintsuMetrics.kintsuTotalAssets) : '0',
      },
      magma: { tvl: magmaMetrics.magmaTVL ? formatEther(magmaMetrics.magmaTVL) : '0' },
    });

    const combinedMetrics: ProtocolMetrics = {
      kintsuExchangeRate: kintsuMetrics.kintsuExchangeRate || 0n,
      kintsuTotalShares: kintsuMetrics.kintsuTotalShares || 0n,
      kintsuTotalAssets: kintsuMetrics.kintsuTotalAssets || 0n,
      magmaTVL: magmaMetrics.magmaTVL || 0n,
      kintsuAPY: kintsuMetrics.kintsuAPY || 0,
      magmaAPY: magmaMetrics.magmaAPY || 0,
    };

    if (combinedMetrics.kintsuExchangeRate === 0n && combinedMetrics.magmaTVL === 0n) {
      console.log('⚠️ No liquidity data available from protocols, exiting early');
      return NextResponse.json({
        success: true,
        message: 'No liquidity data available. No action taken.',
        metrics: combinedMetrics,
      });
    }

    // 2) EOA + wallet client for EntryPoint deposits
    const agentAccount = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
    console.log('👤 Agent EOA:', agentAccount.address);
    const walletClient = createWalletClient({
      account: agentAccount,
      chain: monad,
      transport: http(),
    });

    // 3) Smart account with signer and environment
    const environment = getDeleGatorEnvironment(monad.id);
    console.log('🌐 Delegation environment:', environment);

    // Resolve EntryPoint with preference: env var > environment.DelegationToolkit
    const rawEntryPoint =  environment.EntryPoint as `0x${string}`;
    const ENTRY_POINT_ADDRESS = getAddress(rawEntryPoint);
    console.log('🔗 Using EntryPoint (checksummed):', ENTRY_POINT_ADDRESS);

    const agentSmartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [agentAccount.address, [], [], []],
      deploySalt: '0x',
      signer: { account: agentAccount },
    });
    console.log('🤖 Smart Account address:', agentSmartAccount.address);

    // 4) Position and optimal target
    const userPosition = await getUserPosition(agentSmartAccount.address);
    console.log('👤 Current position:', userPosition);
    const optimalProtocol = determineOptimalProtocol(combinedMetrics);
    console.log('🎯 Optimal protocol:', optimalProtocol);
    const needsRebalance = shouldRebalance(userPosition.protocol, optimalProtocol, combinedMetrics);
    console.log('🔄 Needs rebalance?', needsRebalance);

    if (!needsRebalance) {
      console.log('✅ No rebalancing action performed');
      return NextResponse.json({
        success: true,
        message: 'No rebalancing needed. Current position is optimal.',
        currentProtocol: userPosition.protocol,
        optimalProtocol,
        metrics: combinedMetrics,
      });
    }

    // 5) Prefund EntryPoint deposit
    await ensureEntryPointPrefund({
      walletClient,
      entryPointAddress: ENTRY_POINT_ADDRESS,
      accountAddress: agentSmartAccount.address,
      minDeposit: parseEther('0.01'),
      topUpAmount: parseEther('0.05'),
    });

    // 6) Build delegation execution
    console.log('🧱 Building execution calldata for rebalance');
    const execution = createExecution({
      target: ADAPTER_CONTRACT_ADDRESS,
      value: 0n,
      callData: encodeFunctionData({
        abi: synapseYieldAdapterAbi,
        functionName: 'rebalance',
        args: [userPosition.protocol, optimalProtocol, userPosition.amount],
      }),
    });
    console.log('• Execution:', execution);

    console.log('🧾 Encoding redeemDelegations');
    const redeemCalldata = DelegationManager.encode.redeemDelegations({
      delegations: [[signedDelegation]],
      modes: [ExecutionMode.SingleDefault],
      executions: [[execution]],
    });
    console.log('• redeemDelegations calldata length:', redeemCalldata.length);

    const calls = [{ to: environment.DelegationManager as `0x${string}`, data: redeemCalldata }];
    console.log('📞 Calls prepared:', calls);

    // 7) Estimate AA gas via same bundler used for submission
    let callGasLimit = 1_200_000n;
    let verificationGasLimit = 700_000n;
    let preVerificationGas = 2_000_000n;

    console.log('⛽ Estimating AA gas with bundler…');
    try {
      const est = await bundlerClient.estimateUserOperationGas({
        account: agentSmartAccount,
        calls,
      });
      callGasLimit = est.callGasLimit;
      verificationGasLimit = est.verificationGasLimit;
      preVerificationGas = est.preVerificationGas;
      console.log('• Gas estimates:', {
        callGasLimit: callGasLimit.toString(),
        verificationGasLimit: verificationGasLimit.toString(),
        preVerificationGas: preVerificationGas.toString(),
      });
    } catch (err: any) {
      console.warn('⚠️ Bundler gas estimation failed, using conservative fallbacks:', err?.message || err);
    }

    // 8) Gas prices from same stack (Pimlico with bundler URL)
    console.log('⚡ Fetching gas price quotes from Pimlico…');
    const pimlico = createPimlicoClient({ transport: http(BUNDLER_RPC_URL) });
    const { fast: pimlicoFees } = await pimlico.getUserOperationGasPrice();
    console.log('• Pimlico fees:', {
      maxFeePerGas: pimlicoFees.maxFeePerGas.toString(),
      maxPriorityFeePerGas: pimlicoFees.maxPriorityFeePerGas.toString(),
    });

    // 9) Send UserOperation
    console.log('📤 Sending UserOperation…');
    const userOpHash = await bundlerClient.sendUserOperation({
      account: agentSmartAccount,
      calls,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      ...pimlicoFees,
    });
    console.log('✅ UserOperation sent:', userOpHash);

    // 10) Wait for inclusion
    console.log('⏳ Waiting for UserOperation receipt…');
    const { receipt } = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
    console.log('🎉 Included tx hash:', receipt.transactionHash);

    return NextResponse.json({
      success: true,
      message: `Successfully rebalanced from ${userPosition.protocol} to ${optimalProtocol}`,
      rebalance: {
        from: userPosition.protocol,
        to: optimalProtocol,
        amount: formatEther(userPosition.amount),
      },
      transaction: {
        userOpHash,
        txHash: receipt.transactionHash,
      },
      metrics: combinedMetrics,
    });
  } catch (error: any) {
    console.error('❌ Agent handler error:', error?.message || error, error?.stack);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? String(error),
        stack: error?.stack,
      },
      { status: 500 },
    );
  }
}
