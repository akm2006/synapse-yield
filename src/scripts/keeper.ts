import 'dotenv/config';
import { createPublicClient, http, Hex, Address, formatUnits } from 'viem';
import { monadTestnet } from '@/lib/smartAccountClient';
import { CONTRACTS } from '@/lib/contracts';
import { kintsuAbi } from '@/lib/abis';
import { determineRebalanceAction } from '@/utils/yieldOptimizer';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Activity from '@/models/Activity';
import { executeDelegatedOperation } from '@/lib/execution';
const RPC = process.env.NEXT_PUBLIC_RPC_URL!;
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

  const publicClient =createPublicClient({
    chain: monadTestnet,
    transport: http("https://rpc.ankr.com/monad_testnet"),
  });

  for (const user of usersToProcess) {
    try {
      console.log(`🔍 Analyzing user: ${user.address}`);

      // ✅ Validate delegation structure
      if (!user.delegation || !user.delegation.caveat) {
        console.warn(
          `⚠️  Skipping user ${user.address}: invalid delegation structure`
        );
        continue;
      }

      const [kintsuBalanceBigInt, magmaBalanceBigInt] =
        await publicClient.multicall({
          contracts: [
            {
              address: CONTRACTS.KINTSU,
              abi: kintsuAbi,
              functionName: 'balanceOf',
              args: [user.address as Address],
            },
            {
              address: CONTRACTS.GMON,
              abi: kintsuAbi,
              functionName: 'balanceOf',
              args: [user.address as Address],
            },
          ],
          allowFailure: false,
        });

      const kintsuBalance = formatUnits(kintsuBalanceBigInt, 18);
      const magmaBalance = formatUnits(magmaBalanceBigInt, 18);

      const rebalanceAction = determineRebalanceAction(
        kintsuBalance,
        magmaBalance
      );

      if (rebalanceAction.shouldRebalance && rebalanceAction.amount) {
        console.log(
          `⚖️  Rebalance needed for ${user.address}: ${rebalanceAction.reason}`
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

        // ✅ Fixed: Use bigint for all arithmetic operations
        const minOutAmount = (amountInWei * 95n) / 100n;

        // ✅ Include 'operation' field in body
        const swapBody = {
          userAddress: user.address as Address,
          operation: 'direct-swap',
          fromToken: TOKEN_ADDRESSES[fromTokenSymbol],
          toToken: TOKEN_ADDRESSES[toTokenSymbol],
          amountIn: amountInWei.toString(),
          minOut: minOutAmount.toString(), // ✅ Now properly formatted as string
          fee: 500,
          recipient: user.address as Address,
          deadline: Math.floor(Date.now() / 1000) + 1800,
        };

        try {
          // ✅ Use correct function name and handle response correctly
          const result = await executeDelegatedOperation(
            user.delegation,
            swapBody,
            user.address as Address
          );

          // ✅ Extract txHash from operations array
          const txHash =
            result.operations?.[result.operations.length - 1]?.txHash ||
            result.operations?.[0]?.userOpHash ||
            'pending';

          console.log(
            `✅ Rebalance transaction sent for ${user.address}. Tx: ${txHash}`
          );
          rebalanceCount++;

          await new Activity({
            userAddress: user.address,
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
          `👌 Portfolio balanced for ${user.address}. No action needed.`
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