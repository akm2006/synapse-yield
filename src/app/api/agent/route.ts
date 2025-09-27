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
  EXECUTE_MODE,
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
  buildRebalanceExecution,
  encodeRedeemDelegations,
  estimateGasAndFees,
  sendUserOperation,
} from "@/lib/agent/userop";
import { toJSONSafe } from "@/lib/agent/serialize";
import type { Address } from "viem";
import type { Delegation } from "@metamask/delegation-toolkit";

// Placeholder signed delegation; replace in Phase 3.5
import { signedDelegation } from "@/lib/signedDelegation";

// BigInt-safe JSON helper
const json = (v: any, init?: ResponseInit) =>
  NextResponse.json(toJSONSafe(v), init);

export async function GET() {
  try {
    console.log("🚀 Agent route start - executeMode=", EXECUTE_MODE);

    if (!AGENT_PRIVATE_KEY) {
      throw new Error("AGENT_PRIVATE_KEY is not set");
    }

    // 1) Agent EOA + wallet client
    const agentEOA = privateKeyToAccount(AGENT_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account: agentEOA,
      chain: CHAIN,
      transport: http(),
    });

    console.log("👤 Agent EOA:", agentEOA.address);

    // 2) Agent Smart Account
    const agentSA = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      signer: { account: agentEOA },
      environment: DELEGATION_ENV,
      deployParams: [agentEOA.address, [], [], []],
      deploySalt: "0x",
    });

    console.log("🤖 Agent Smart Account (SA):", agentSA.address);

    // 3) Log both Smart Account and personal wallet sMON balances
    const personalAddress = "YOUR_WALLET_ADDRESS" as Address;
    const [saBal, eoaBal] = await Promise.all([
      getUserPosition(agentSA.address as Address),
      getUserPosition(personalAddress),
    ]);
    console.log("SA position:", saBal);
    console.log("EOA position:", eoaBal);

    // 4) Fetch metrics + SA position
    const [metrics, position] = await Promise.all([
      getAllMetrics(),
      getUserPosition(agentSA.address as Address),
    ]);

    console.log("📊 Metrics:", metrics);

    // 5) No position -> early return
    if (!position) {
      return json({
        success: true,
        message: "No current position in SA; nothing to rebalance",
        metrics,
        saPosition: saBal,
        eoaPosition: eoaBal,
        agentAddress: agentSA.address,
        executeMode: EXECUTE_MODE,
      });
    }

    console.log("🏷 Current SA position:", position);

    // 6) Decision making
    const optimal = determineOptimalProtocol(metrics);
    const decision = shouldRebalance(
      position.protocol,
      optimal,
      metrics,
      REBALANCE_THRESHOLD_PCT
    );

    console.log("🎯 Optimal protocol:", optimal);
    console.log("🔄 Decision result:", decision);

    // 7) Simulation mode guard
    if (!EXECUTE_MODE) {
      const { fromProtocol, toProtocol, reason } = decision;
      const message =
        fromProtocol === toProtocol
          ? reason
          : `Simulation: would rebalance from ${fromProtocol} to ${toProtocol}`;
      return json({
        success: true,
        message,
        decision,
        metrics,
        position,
        agentAddress: agentSA.address,
        executeMode: EXECUTE_MODE,
        simulated: true,
      });
    }

    // 8) EntryPoint prefund if configured
    // if (ENTRYPOINT_ADDRESS) {
    //   console.log("⛽ Prefunding EntryPoint...");
    //   await ensureEntryPointPrefund(
    //     walletClient,
    //     ENTRYPOINT_ADDRESS,
    //     agentSA.address as Address,
    //     { checkOnly: false }
    //   );
    // }

    // 9) Build and send UserOperation
    const minAmountOut = 0n;
    const execution = buildRebalanceExecution(
      decision.fromProtocol!,
      decision.toProtocol!,
      minAmountOut
    );
    const redeemCall = encodeRedeemDelegations(
      signedDelegation as Delegation,
      execution
    );
    const calls = [redeemCall];
    console.log("🔧 Execution calls built");

    const { limits, fees } = await estimateGasAndFees(agentSA, calls);
    console.log("⛽ Gas limits:", limits, "Fees:", fees);

    const { userOpHash, receipt } = await sendUserOperation(
      agentSA,
      calls,
      limits,
      fees
    );
    console.log("✅ UserOpHash:", userOpHash);
    console.log("📄 TxHash:", receipt.transactionHash);

    return json({
      success: true,
      message: `Rebalanced from ${decision.fromProtocol} to ${decision.toProtocol}`,
      decision,
      metrics,
      position,
      userOpHash,
      txHash: receipt.transactionHash,
      agentAddress: agentSA.address,
      executeMode: EXECUTE_MODE,
    });
  } catch (error: any) {
    console.error("❌ Agent error:", error);
    return json(
      {
        success: false,
        error: error.message ?? String(error),
        executeMode: EXECUTE_MODE,
      },
      { status: 500 }
    );
  }
}
