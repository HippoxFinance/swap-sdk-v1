// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Local test for the HippoxSwap V1 SDK oracle module.
 *
 * Exercises the oracle API surface:
 *   - read: pair, minElapsedTime, observationsLength, currentCumulatives
 *   - write: update
 *   - read: consult
 *
 * The oracle is deployed by Local_Deploy.s.sol and bound to the tokenA/tokenB
 * pair, which is also created by Local_Deploy.s.sol. This test seeds that
 * pair with liquidity itself so it does not depend on the deploy script.
 */
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  formatEther,
  getContract,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HippoxSwapV1Client } from "../client/HippoxSwapV1Client";
// Configuration
/** RPC endpoint of the local anvil chain. */
const RPC_URL = "http://127.0.0.1:8545";
/** Chain ID of the local anvil chain. */
const CHAIN_ID = 31337;
/** Human readable name of the local chain. */
const CHAIN_NAME = "Local Anvil";
/** Native currency metadata of the local chain. */
const NATIVE_CURRENCY = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
} as const;
/** Private key of the deployer / token minter (anvil account 0). */
const DEPLOYER_PRIVATE_KEY =
  "" as const;
/** Private key used to sign write operations (anvil account 1). */
const USER_PRIVATE_KEY =
  "" as const;
/** Address of the deployed HippoxSwapFactoryV1. */
const FACTORY: Address = "";
/** Address of the deployed HippoxSwapRouterV1. */
const ROUTER: Address = "";
/** Address of the deployed WETH contract. */
const WETH: Address = "";
/** Address of the first deployed MockToken. */
const TOKEN_A: Address = "";
/** Address of the second deployed MockToken. */
const TOKEN_B: Address = "";
/** Address of the deployed HippoxOracleV1. Fill in after deployment. */
const ORACLE: Address = "";
/** Amount minted to the user for each mock token. */
const MINT_AMOUNT = parseEther("1000000");
/** Amount added as initial liquidity. */
const LIQUIDITY_A = parseEther("1000");
/** Amount added as initial liquidity. */
const LIQUIDITY_B = parseEther("1000");
/** Amount swapped in each test swap, to trigger an oracle update. */
const SWAP_IN = parseEther("1");
/** Minimum secondsAgo accepted by the oracle's consult. */
const MIN_ELAPSED_TIME = 1800;
/** Deadline offset in seconds from the current time. */
const DEADLINE_OFFSET_SECONDS = 3600;
/** Minimal ERC20 ABI used to mint and read balances. */
const MOCK_ERC20_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
// Chain definition
const localChain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_NAME,
  nativeCurrency: NATIVE_CURRENCY,
  rpcUrls: { default: { http: [RPC_URL] } },
  testnet: true,
});
// Helpers
function log(title: string, value?: unknown) {
  if (value === undefined) {
    console.log(`\n=== ${title} ===`);
  } else {
    console.log(`${title}:`, value);
  }
}
function short(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
function deadlineFromNow(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + DEADLINE_OFFSET_SECONDS);
}
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// Test runner
async function main() {
  log("HippoxSwap V1 SDK oracle test");
  const deployerAccount = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  const userAccount = privateKeyToAccount(USER_PRIVATE_KEY);
  const publicClient = createPublicClient({
    chain: localChain,
    transport: http(RPC_URL),
  });
  const deployerWallet = createWalletClient({
    account: deployerAccount,
    chain: localChain,
    transport: http(RPC_URL),
  });
  // ---------------------------------------------------------------------------
  // Seed liquidity: mint to the user and add liquidity if the pair is empty.
  // ---------------------------------------------------------------------------
  log("Seeding liquidity");
  const tokenAContract = getContract({
    address: TOKEN_A,
    abi: MOCK_ERC20_ABI,
    client: { wallet: deployerWallet, public: publicClient },
  });
  const tokenBContract = getContract({
    address: TOKEN_B,
    abi: MOCK_ERC20_ABI,
    client: { wallet: deployerWallet, public: publicClient },
  });
  // Mint to the user so they can swap.
  await tokenAContract.write.mint(
    [userAccount.address, MINT_AMOUNT],
    { account: deployerAccount, chain: localChain }
  );
  await tokenBContract.write.mint(
    [userAccount.address, MINT_AMOUNT],
    { account: deployerAccount, chain: localChain }
  );
  // Build the SDK client first so we can check the pair and add liquidity.
  const sdk = new HippoxSwapV1Client({
    mode: "privateKey",
    chain: localChain,
    transport: http(RPC_URL),
    privateKey: USER_PRIVATE_KEY,
    factory: FACTORY,
    router: ROUTER,
    weth: WETH,
    oracle: ORACLE,
  });
  const pairAddress = await sdk.factory.getPair(TOKEN_A, TOKEN_B);
  log("pair", short(pairAddress));
  const pairModule = sdk.pair(pairAddress);
  const [reserve0Before, reserve1Before] = await pairModule.getReserves();
  log("reserve0 before", formatEther(reserve0Before));
  log("reserve1 before", formatEther(reserve1Before));
  if (reserve0Before === 0n || reserve1Before === 0n) {
    log("Pair is empty, adding initial liquidity");
    // The SDK already approves tokens to the router inside addLiquidity.
    const addTx = await sdk.router.addLiquidity({
      tokenA: TOKEN_A,
      tokenB: TOKEN_B,
      amountADesired: LIQUIDITY_A,
      amountBDesired: LIQUIDITY_B,
      amountAMin: 0n,
      amountBMin: 0n,
      to: userAccount.address,
      deadline: deadlineFromNow(),
    });
    await publicClient.waitForTransactionReceipt({ hash: addTx });
    log("addLiquidity tx", short(addTx));
    const [r0, r1] = await pairModule.getReserves();
    log("reserve0 after seed", formatEther(r0));
    log("reserve1 after seed", formatEther(r1));
  } else {
    log("Pair already has liquidity, skipping seed");
  }
  // ---------------------------------------------------------------------------
  // Oracle: configuration
  // ---------------------------------------------------------------------------
  const oracle = sdk.oracle(ORACLE);
  log("Oracle: configuration");
  const oraclePair = await oracle.pair();
  log("oracle.pair", short(oraclePair));
  const minElapsed = await oracle.minElapsedTime();
  log("oracle.minElapsedTime", minElapsed.toString());
  // ---------------------------------------------------------------------------
  // Oracle: cumulatives before any update
  // ---------------------------------------------------------------------------
  log("Oracle: cumulatives before update");
  const before = await oracle.currentCumulatives();
  log("price0Cumulative", before.price0Cumulative.toString());
  log("price1Cumulative", before.price1Cumulative.toString());
  log("timestamp", before.timestamp.toString());
  const lengthBefore = await oracle.observationsLength();
  log("observationsLength", lengthBefore.toString());
  // ---------------------------------------------------------------------------
  // Trigger swaps to advance the pair's cumulative prices
  // ---------------------------------------------------------------------------
  log("Triggering swaps to advance the pair oracle");
  const cumulativeBefore = await pairModule.getCumulativePrices();
  log(
    "pair.price0Cumulative before",
    cumulativeBefore.price0Cumulative.toString()
  );
  // Advance time so the pair accumulates a non-zero elapsed window.
  await sleep(2000);
  const swapTx = await sdk.router.swapExactTokensForTokens({
    amountIn: SWAP_IN,
    amountOutMin: 0n,
    path: [TOKEN_A, TOKEN_B],
    to: userAccount.address,
    deadline: deadlineFromNow(),
  });
  await publicClient.waitForTransactionReceipt({ hash: swapTx });
  log("swap tx", short(swapTx));
  const cumulativeAfter = await pairModule.getCumulativePrices();
  log(
    "pair.price0Cumulative after",
    cumulativeAfter.price0Cumulative.toString()
  );
  // ---------------------------------------------------------------------------
  // Write: push a new observation
  // ---------------------------------------------------------------------------
  log("Oracle: update");
  try {
    const updateTx = await oracle.update();
    await publicClient.waitForTransactionReceipt({ hash: updateTx });
    log("oracle.update tx", short(updateTx));
  } catch (err) {
    log("oracle.update reverted", (err as Error).message);
  }
  const lengthAfter = await oracle.observationsLength();
  log("observationsLength after update", lengthAfter.toString());
  // ---------------------------------------------------------------------------
  // Write: second observation after more swaps and time
  // ---------------------------------------------------------------------------
  log("Oracle: second observation");
  await sleep(2000);
  const swapTx2 = await sdk.router.swapExactTokensForTokens({
    amountIn: SWAP_IN,
    amountOutMin: 0n,
    path: [TOKEN_A, TOKEN_B],
    to: userAccount.address,
    deadline: deadlineFromNow(),
  });
  await publicClient.waitForTransactionReceipt({ hash: swapTx2 });
  log("swap2 tx", short(swapTx2));
  try {
    const updateTx2 = await oracle.update();
    await publicClient.waitForTransactionReceipt({ hash: updateTx2 });
    log("oracle.update2 tx", short(updateTx2));
  } catch (err) {
    log("oracle.update2 reverted", (err as Error).message);
  }
  const lengthFinal = await oracle.observationsLength();
  log("observationsLength final", lengthFinal.toString());
  // ---------------------------------------------------------------------------
  // Read: consult
  // ---------------------------------------------------------------------------
  log("Oracle: consult");
  if (lengthFinal >= 2n) {
    try {
      const out = await oracle.consult(TOKEN_A, SWAP_IN, MIN_ELAPSED_TIME);
      log("consult(A, amount, secondsAgo)", formatEther(out));
    } catch (err) {
      log("oracle.consult reverted", (err as Error).message);
    }
    try {
      const out = await oracle.consult(TOKEN_B, SWAP_IN, MIN_ELAPSED_TIME);
      log("consult(B, amount, secondsAgo)", formatEther(out));
    } catch (err) {
      log("oracle.consult(B) reverted", (err as Error).message);
    }
  } else {
    log("Not enough observations to run consult");
  }
  // ---------------------------------------------------------------------------
  // Read: current cumulatives after updates
  // ---------------------------------------------------------------------------
  log("Oracle: cumulatives after updates");
  const after = await oracle.currentCumulatives();
  log("price0Cumulative", after.price0Cumulative.toString());
  log("price1Cumulative", after.price1Cumulative.toString());
  log("timestamp", after.timestamp.toString());
  log("Done");
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});