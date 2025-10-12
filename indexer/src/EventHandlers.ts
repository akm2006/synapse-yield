import { Magma, Kintsu, Pancake, Activity } from "generated";

// --- Constants ---
const KINTSU_CONTRACT_ADDRESS = "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c5".toLowerCase();
const SMON_ADDRESS = "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c5";
const GMON_ADDRESS = "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3";

// A map to get token names from their addresses
const tokenNameMap: Record<string, string> = {
  [SMON_ADDRESS.toLowerCase()]: "sMON",
  [GMON_ADDRESS.toLowerCase()]: "gMON",
};

// --- Handlers ---

Magma.Deposit.handler(async ({ event, context }) => {
  const activity: Activity = {
    id: `${event.transaction.hash}-${event.logIndex}`,
    transactionHash: event.transaction.hash,
    blockTimestamp: BigInt(event.block.timestamp),
    user: event.params.depositor,
    activityType: "Stake", 
    protocol: "MAGMA",
    amount: event.params.amount,
    fromToken: undefined, toToken: undefined, fromTokenName: undefined, toTokenName: undefined, fromAmount: undefined, toAmount: undefined,
  };
  context.Activity.set(activity);
});

Magma.Withdraw.handler(async ({ event, context }) => {
  const activity: Activity = {
    id: `${event.transaction.hash}-${event.logIndex}`,
    transactionHash: event.transaction.hash,
    blockTimestamp: BigInt(event.block.timestamp),
    user: event.params.withdrawer,
    activityType: "Unstake", 
    protocol: "MAGMA",
    amount: event.params.amount,
    fromToken: undefined, toToken: undefined, fromTokenName: undefined, toTokenName: undefined, fromAmount: undefined, toAmount: undefined,
  };
  context.Activity.set(activity);
});

Kintsu.Transfer.handler(async ({ event, context }) => {
  const from = event.params.from.toLowerCase();
  const to = event.params.to.toLowerCase();

  if (to === KINTSU_CONTRACT_ADDRESS && from !== KINTSU_CONTRACT_ADDRESS) {
    const activity: Activity = {
      id: `${event.transaction.hash}-${event.logIndex}`,
      transactionHash: event.transaction.hash,
      blockTimestamp: BigInt(event.block.timestamp),
      user: from,
      activityType: "Stake", // Renamed from "type"
      protocol: "KINTSU",
      amount: event.params.value,
      fromToken: undefined, toToken: undefined, fromTokenName: undefined, toTokenName: undefined, fromAmount: undefined, toAmount: undefined,
    };
    context.Activity.set(activity);
  } else if (from === KINTSU_CONTRACT_ADDRESS && to !== KINTSU_CONTRACT_ADDRESS) {
    const activity: Activity = {
      id: `${event.transaction.hash}-${event.logIndex}`,
      transactionHash: event.transaction.hash,
      blockTimestamp: BigInt(event.block.timestamp),
      user: to,
      activityType: "Unstake", // Renamed from "type"
      protocol: "KINTSU",
      amount: event.params.value,
      fromToken: undefined, toToken: undefined, fromTokenName: undefined, toTokenName: undefined, fromAmount: undefined, toAmount: undefined,
    };
    context.Activity.set(activity);
  }
});

Pancake.Swap.handler(async ({ event, context }) => {
  let fromToken: string, toToken: string, fromAmount: bigint, toAmount: bigint;
  
  // Based on your previous finding: sMON is token0, gMON is token1
  const TOKEN0 = SMON_ADDRESS;
  const TOKEN1 = GMON_ADDRESS;

  if (event.params.amount0 > 0) {
    toToken = TOKEN0;
    toAmount = event.params.amount0;
    fromToken = TOKEN1;
    fromAmount = BigInt(Math.abs(Number(event.params.amount1)));
  } else {
    toToken = TOKEN1;
    toAmount = event.params.amount1;
    fromToken = TOKEN0;
    fromAmount = BigInt(Math.abs(Number(event.params.amount0)));
  }

  const activity: Activity = {
    id: `${event.transaction.hash}-${event.logIndex}`,
    transactionHash: event.transaction.hash,
    blockTimestamp: BigInt(event.block.timestamp),
    user: event.params.recipient,
    activityType: "Swap", // Renamed from "type"
    protocol: "Pancake",
    amount: undefined,
    fromToken: fromToken,
    toToken: toToken,
    fromTokenName: tokenNameMap[fromToken.toLowerCase()] || "Unknown",
    toTokenName: tokenNameMap[toToken.toLowerCase()] || "Unknown",
    fromAmount: fromAmount,
    toAmount: toAmount,
  };
  context.Activity.set(activity);
});

