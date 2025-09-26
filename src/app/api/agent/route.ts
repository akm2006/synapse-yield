// src/app/api/agent/route.ts
import { NextResponse } from "next/server";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  CHAIN,
  DELEGATION_ENV,
  ENTRYPOINT_ADDRESS,
  REBALANCE_THRESHOLD_PCT,
  AGENT_PRIVATE_KEY,
} from "@/lib/agent/config";
import { publicClient } from "@/lib/viemClients";
import {
  toMetaMaskSmartAccount,
  Implementation,
} from "@metamask/delegation-toolkit";
import { getAllMetrics } from "@/lib/agent/metrics";
import { getUserPosition } from "@/lib/agent/positions";
import {
  determineOptimalProtocol,
  shouldRebalance,
} from "@/lib/agent/decisions";
import { ensureEntryPointPrefund } from "@/lib/agent/entryPoint";
import {
  applySlippage,
  buildRebalanceExecution,
  encodeRedeemDelegations,
  estimateGasAndFees,
  sendUserOperation,
} from "@/lib/agent/userop";
import type { Address } from "viem";
// Import the project’s existing signedDelegation; keep it in a single place (e.g., config or a db)
import type { Delegation } from "@metamask/delegation-toolkit";
// TODO: move to persistence in Phase 3.5
import { signedDelegation } from "@/lib/signedDelegation"; // create this file by moving your existing object here
import { toJSONSafe } from "@/lib/agent/serialize";
const json = (v: any, init?: ResponseInit) =>
  NextResponse.json(toJSONSafe(v), init);

export async function GET() {
  try {
    if (!AGENT_PRIVATE_KEY) {
      throw new Error("AGENT_PRIVATE_KEY is not set in environment");
    }

    // 1) Agent EOA and wallet client
    const agentEOA = privateKeyToAccount(AGENT_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account: agentEOA,
      chain: CHAIN,
      transport: http(),
    });

    // 2) Agent Smart Account (MetaMask hybrid)
    const agentSA = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      signer: { account: agentEOA },
      environment: DELEGATION_ENV,
      deployParams: [agentEOA.address, [], [], []],
      deploySalt: "0x",
    });

    // 3) Metrics + Position
    const [metrics, position] = await Promise.all([
      getAllMetrics(),
      getUserPosition(agentSA.address as Address),
    ]);

    // If no current position, skip for now (Phase 3.5 can initiate deposits)
    if (!position) {
      return json({
        success: true,
        message: "No current position; nothing to rebalance",
        metrics,
      });
    }

    // 4) Decide optimal target and whether to rebalance
    const optimal = determineOptimalProtocol(metrics);
    const decision = shouldRebalance(
      position.protocol,
      optimal,
      metrics,
      REBALANCE_THRESHOLD_PCT
    );

    if (
      !decision.shouldRebalance ||
      !decision.fromProtocol ||
      !decision.toProtocol
    ) {
      return json({
        success: true,
        message: decision.reason,
        decision,
        metrics,
        position,
      });
    }

    // 5) Prefund EntryPoint (optional)
    if (ENTRYPOINT_ADDRESS) {
      await ensureEntryPointPrefund(
        walletClient,
        ENTRYPOINT_ADDRESS,
        agentSA.address as Address,
        {
          minDeposit: undefined,
          topUpAmount: undefined,
          checkOnly: false,
        }
      );
    }

    // 6) Build calldata and calls
    // For demo: set minAmountOut conservatively to 0; replace with preview-based minOut + slippage when protocols allow exact pathing
    const minAmountOut = 0n; // or applySlippage(expectedOut)
    const execution = buildRebalanceExecution(
      decision.fromProtocol,
      decision.toProtocol,
      minAmountOut
    );
    const redeemCall = encodeRedeemDelegations(
      signedDelegation as Delegation,
      execution
    );
    const calls = [redeemCall];

    // 7) Gas limits + fees, then send UserOperation
    const { limits, fees } = await estimateGasAndFees(agentSA, calls);
    const { userOpHash, receipt } = await sendUserOperation(
      agentSA,
      calls,
      limits,
      fees
    );

    return json({
      success: true,
      message: `Rebalanced from ${decision.fromProtocol} to ${decision.toProtocol}`,
      decision,
      metrics,
      position,
      userOpHash,
      txHash: receipt.transactionHash,
    });
  } catch (error: any) {
    return json(
      { success: false, error: error.message ?? String(error) },
      { status: 500 }
    );
  }
}
