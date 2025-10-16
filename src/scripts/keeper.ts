// src/scripts/keeper.ts
import 'dotenv/config';
import { createPublicClient, http, Hex, Address, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { Implementation, toMetaMaskSmartAccount } from '@metamask/delegation-toolkit';
import { monadTestnet, getServerPublicClient } from '@/lib/smartAccountClient';
import { CONTRACTS } from '@/lib/contracts';
import { kintsuAbi , gMonAbi} from '@/lib/abis';
import { determineRebalanceAction } from '@/utils/yieldOptimizer';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Activity from '@/models/Activity';
import { executeDelegatedOperation } from '@/lib/execution';

// This is the signer for the DELEGATE account, needed to derive the smart account address
const owner = privateKeyToAccount(process.env.DELEGATE_PRIVATE_KEY as Hex);

export async function runKeeper() {
  console.log('🤖 Keeper waking up...');
  await dbConnect();

  const usersToProcess = await User.find({
    automationEnabled: true,
    delegation: { $exists: true, $ne: null },
  }).lean();

  if (usersToProcess.length === 0) {
    console.log('🤖 No users with automation enabled. Going back to sleep.');
    return { processed: 0, rebalanced: 0 };
  }

  console.log(`🤖 Found ${usersToProcess.length} users to process.`);
  let rebalanceCount = 0;

  const publicClient = getServerPublicClient();

  for (const user of usersToProcess) {
    try {
      console.log(`🔍 Analyzing user's EOA: ${user.address}`);

      if (!user.delegation || !user.delegation.caveats) {
        console.warn(`⚠️  Skipping user ${user.address}: invalid delegation structure`);
        continue;
      }

      // --- START: DERIVE SMART ACCOUNT ADDRESS ---
      // This step is crucial. We derive the smart account address for the user,
      // just like the frontend does.
      const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [user.address as Address, [], [], []],
        deploySalt: (process.env.NEXT_PUBLIC_SMART_ACCOUNT_SALT || "0x0000000000000000000000000000000000000000000000000000000000000000") as Address,
        signer: { account: owner }, // A signer is required, even if just for derivation
      });
      const smartAccountAddress = smartAccount.address;
      console.log(`🤖 Derived Smart Account Address: ${smartAccountAddress}`);
      // --- END: DERIVE SMART ACCOUNT ADDRESS ---

      const [kintsuBalanceBigInt, magmaBalanceBigInt] =
        await publicClient.multicall({
          contracts: [
            {
              address: CONTRACTS.KINTSU,
              abi: kintsuAbi,
              functionName: 'balanceOf',
              args: [smartAccountAddress],
            },
            {
              address: CONTRACTS.GMON,
              abi: gMonAbi,
              functionName: 'balanceOf',
              args: [smartAccountAddress],
            },
          ],
          allowFailure: false,
        });

      const kintsuBalance = formatUnits(kintsuBalanceBigInt, 18);
      const magmaBalance = formatUnits(magmaBalanceBigInt, 18);

      console.log(`Fetched Balances - sMON: ${kintsuBalance}, gMON: ${magmaBalance}`);


      const rebalanceAction = determineRebalanceAction(
        kintsuBalance,
        magmaBalance
      );

      if (rebalanceAction.shouldRebalance && rebalanceAction.amount) {
        console.log(
          `⚖️  Rebalance needed for ${smartAccountAddress}: ${rebalanceAction.reason}`
        );

        const fromTokenSymbol =
          rebalanceAction.fromProtocol === 'kintsu' ? 'sMON' : 'gMON';
        const toTokenSymbol =
          rebalanceAction.toProtocol === 'kintsu' ? 'sMON' : 'gMON';
        const TOKEN_ADDRESSES: Record<string, Address> = {
          sMON: CONTRACTS.KINTSU,
          gMON: CONTRACTS.GMON,
        };

        const amountInWei = BigInt(
          Math.floor(parseFloat(rebalanceAction.amount) * 1e18)
        );

        const minOutAmount = (amountInWei * 95n) / 100n;

        const swapBody = {
          userAddress: smartAccountAddress, // Use smart account here
          operation: 'direct-swap',
          fromToken: TOKEN_ADDRESSES[fromTokenSymbol],
          toToken: TOKEN_ADDRESSES[toTokenSymbol],
          amountIn: amountInWei.toString(),
          minOut: minOutAmount.toString(),
          fee: 500,
          recipient: smartAccountAddress, // And here
          deadline: Math.floor(Date.now() / 1000) + 1800,
        };

        try {
          const result = await executeDelegatedOperation(
            user.delegation,
            swapBody,
            smartAccountAddress // And here
          );

          const txHash =
            result.operations?.[result.operations.length - 1]?.txHash ||
            result.operations?.[0]?.userOpHash ||
            'pending';

          console.log(
            `✅ Rebalance transaction sent for ${smartAccountAddress}. Tx: ${txHash}`
          );
          rebalanceCount++;

          await new Activity({
            userAddress: user.address, // Log against the EOA for user tracking
            transactionType: 'Rebalance',
            details: `Agent rebalanced ${parseFloat(rebalanceAction.amount).toFixed(4)} ${fromTokenSymbol} to ${toTokenSymbol}.`,
            txHash,
            isAutomated: true,
          }).save();
        } catch (execError) {
          console.error(
            `❌ Failed to execute rebalance for ${user.address}:`,
            execError
          );
          continue;
        }
      } else {
        console.log(
          `👌 Portfolio balanced for ${smartAccountAddress}. No action needed.`
        );
      }
    } catch (error) {
      console.error(`❌ Error processing user ${user.address}:`, error);
    }
  }

  console.log(
    `🤖 Keeper run finished. Processed ${usersToProcess.length} users, executed ${rebalanceCount} rebalances.`
  );
  return { processed: usersToProcess.length, rebalanced: rebalanceCount };
}

if (require.main === module) {
    runKeeper().catch(console.error);
}