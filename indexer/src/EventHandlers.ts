import { Magma, Kintsu, Pancake, Stake, Withdrawal, Swap, Protocol } from "generated";

// --- Constants ---

const KINTSU_CONTRACT_ADDRESS = "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c5".toLowerCase();
const PANCAKE_TOKEN0_ADDRESS = "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c5"; // sMON
const PANCAKE_TOKEN1_ADDRESS = "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3"; // GMON


// --- TVL Helper Function ---

async function updateTvl(protocolId: string, amount: bigint, isDeposit: boolean, context: any) {
  let protocol = await context.Protocol.get(protocolId);

  // If the protocol entity doesn't exist, create it
  if (!protocol) {
    protocol = {
      id: protocolId,
      tvl: BigInt(0),
    };
  }

  // Update the TVL
  if (isDeposit) {
    protocol.tvl = protocol.tvl + amount;
  } else {
    protocol.tvl = protocol.tvl - amount;
  }

  context.Protocol.set(protocol);
}


// --- Staking & Unstaking Handlers ---

Magma.Deposit.handler(async ({ event, context }) => {
  const newStake: Stake = {
    id: `${event.transaction.hash}-${event.logIndex}`,
    transactionHash: event.transaction.hash,
    user: event.params.depositor,
    protocol: "MAGMA",
    amount: event.params.amount,
  };
  context.Stake.set(newStake);

  // ADDED: Update the TVL for Magma
  await updateTvl("MAGMA", event.params.amount, true, context);
});

Magma.Withdraw.handler(async ({ event, context }) => {
  const newWithdrawal: Withdrawal = {
    id: `${event.transaction.hash}-${event.logIndex}`,
    transactionHash: event.transaction.hash,
    user: event.params.withdrawer,
    protocol: "MAGMA",
    amount: event.params.amount,
  };
  context.Withdrawal.set(newWithdrawal);

  // ADDED: Update the TVL for Magma
  await updateTvl("MAGMA", event.params.amount, false, context);
});

Kintsu.Transfer.handler(async ({ event, context }) => {
  const from = event.params.from.toLowerCase();
  const to = event.params.to.toLowerCase();

  if (to === KINTSU_CONTRACT_ADDRESS && from !== KINTSU_CONTRACT_ADDRESS) {
    const newStake: Stake = {
      id: `${event.transaction.hash}-${event.logIndex}`,
      transactionHash: event.transaction.hash,
      user: from,
      protocol: "KINTSU",
      amount: event.params.value,
    };
    context.Stake.set(newStake);

    // ADDED: Update the TVL for Kintsu
    await updateTvl("KINTSU", event.params.value, true, context);
  }
  else if (from === KINTSU_CONTRACT_ADDRESS && to !== KINTSU_CONTRACT_ADDRESS) {
    const newWithdrawal: Withdrawal = {
      id: `${event.transaction.hash}-${event.logIndex}`,
      transactionHash: event.transaction.hash,
      user: to,
      protocol: "KINTSU",
      amount: event.params.value,
    };
    context.Withdrawal.set(newWithdrawal);
    
    // ADDED: Update the TVL for Kintsu
    await updateTvl("KINTSU", event.params.value, false, context);
  }
});


// --- Swapping Handler ---

Pancake.Swap.handler(async ({ event, context }) => {
  let fromToken: string;
  let toToken: string;
  let fromAmount: bigint;
  let toAmount: bigint;

  if (event.params.amount0 > 0) {
    toToken = PANCAKE_TOKEN0_ADDRESS;
    toAmount = event.params.amount0;
    fromToken = PANCAKE_TOKEN1_ADDRESS;
    fromAmount = BigInt(Math.abs(Number(event.params.amount1)));
  } else {
    toToken = PANCAKE_TOKEN1_ADDRESS;
    toAmount = event.params.amount1;
    fromToken = PANCAKE_TOKEN0_ADDRESS;
    fromAmount = BigInt(Math.abs(Number(event.params.amount0)));
  }

  const newSwap: Swap = {
    id: `${event.transaction.hash}-${event.logIndex}`,
    transactionHash: event.transaction.hash,
    sender: event.params.sender,
    recipient: event.params.recipient,
    fromToken: fromToken,
    toToken: toToken,
    fromAmount: fromAmount,
    toAmount: toAmount,
  };
  context.Swap.set(newSwap);
});