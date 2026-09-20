// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Local end-to-end test for the HippoxSwap V1 SDK.
 *
 * Focused on exercising the SDK surface only. The mock ERC20 tokens are
 * deployed by Local_Deploy.s.sol, so this test does not deploy anything itself.
 *
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
// Network
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
// Accounts
// Anvil default accounts. Public test keys. Do not use on mainnet.
/** Private key used to mint mock tokens and fund the user. */
const DEPLOYER_PRIVATE_KEY =
  "" as const;
/** Private key used by the SDK client to add liquidity and swap. */
const USER_PRIVATE_KEY =
  "" as const;
// Deployed contract addresses
// Fill in after running Local_Deploy.s.sol.
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
/** Optional address of the deployed HippoxOracleV1, or undefined. */
const ORACLE: Address | undefined = undefined;
// Test amounts
/** Amount minted to the user for each mock token. */
const MINT_AMOUNT = parseEther("1000000");
/** Amount of tokenA added as liquidity. */
const LIQUIDITY_A = parseEther("1000");
/** Amount of tokenB added as liquidity. */
const LIQUIDITY_B = parseEther("1000");
/** Amount of tokenA swapped in the first swap. */
const SWAP_IN_1 = parseEther("10");
/** Amount of tokenA swapped in the second swap (event listener test). */
const SWAP_IN_2 = parseEther("1");
/** Deadline offset in seconds from the current time. */
const DEADLINE_OFFSET_SECONDS = 3600;
/** Time to keep the event listener running, in milliseconds. */
const EVENT_LISTEN_MS = 5000;
// Mock ERC20 ABI (read/write only)
/** Minimal ERC20 ABI used to interact with the mock tokens. */
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
// Test runner
async function main() {
  log("HippoxSwap V1 SDK local test");
  // Clients
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
  // Mint mock tokens to the user
  log("Minting mock tokens to user");
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
  await tokenAContract.write.mint(
    [userAccount.address, MINT_AMOUNT],
    { account: deployerAccount, chain: localChain }
  );
  await tokenBContract.write.mint(
    [userAccount.address, MINT_AMOUNT],
    { account: deployerAccount, chain: localChain }
  );
  // Instantiate the SDK client
  log("Instantiating SDK client");
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
  // Read factory state
  log("Reading factory state");
  log("factory.owner", short(await sdk.factory.owner()));
  log("factory.feeTo", short(await sdk.factory.feeTo()));
  log("factory.protocolFeeNumerator", (await sdk.factory.protocolFeeNumerator()).toString());
  log("factory.protocolFeeNumeratorPercen", (await sdk.factory.protocolFeeNumeratorPercen()).toString());
  log("factory.allPairsLength", (await sdk.factory.allPairsLength()).toString());
  // Add liquidity
  log("Adding liquidity");
  const deadline = deadlineFromNow();
  const addTx = await sdk.router.addLiquidity({
    tokenA: TOKEN_A,
    tokenB: TOKEN_B,
    amountADesired: LIQUIDITY_A,
    amountBDesired: LIQUIDITY_B,
    amountAMin: 0n,
    amountBMin: 0n,
    to: userAccount.address,
    deadline,
  });
  await publicClient.waitForTransactionReceipt({ hash: addTx });
  log("addLiquidity tx", short(addTx));
  // Read pair state
  log("Reading pair state");
  const pair = await sdk.factory.getPair(TOKEN_A, TOKEN_B);
  log("pair", short(pair));
  const pairModule = sdk.pair(pair);
  log("pair.token0", short(await pairModule.token0()));
  log("pair.token1", short(await pairModule.token1()));
  log("pair.factory", short(await pairModule.factory()));
  const [r0, r1] = await pairModule.getReserves();
  log("reserve0", formatEther(r0));
  log("reserve1", formatEther(r1));
  log("pair.getAmountOut", formatEther(await pairModule.getAmountOut(SWAP_IN_1, TOKEN_A)));
  const info = await sdk.factory.getPairInfo(TOKEN_A, TOKEN_B);
  if (info) {
    log("pairInfo.feeNumerator", info.feeNumerator.toString());
    log("pairInfo.taxBps", info.taxBps.toString());
    log("pairInfo.protocolFeeNumerator", info.protocolFeeNumerator.toString());
    log("pairInfo.feeTo", short(info.feeTo));
  }
  // Quote
  log("Quoting");
  const amounts = await sdk.router.quote(SWAP_IN_1, [TOKEN_A, TOKEN_B]);
  log("quote in", formatEther(amounts[0]));
  log("quote out", formatEther(amounts[amounts.length - 1]));
  const batch = await sdk.router.quoteBatch(
    [SWAP_IN_1, SWAP_IN_2],
    [[TOKEN_A, TOKEN_B], [TOKEN_A, TOKEN_B]]
  );
  log("quoteBatch[0].last", formatEther(batch[0][batch[0].length - 1]));
  log("quoteBatch[1].last", formatEther(batch[1][batch[1].length - 1]));
  // Swap exact in
  log("swapExactTokensForTokens");
  const beforeOut = await tokenBContract.read.balanceOf([userAccount.address]);
  const swapTx = await sdk.router.swapExactTokensForTokens({
    amountIn: SWAP_IN_1,
    amountOutMin: 0n,
    path: [TOKEN_A, TOKEN_B],
    to: userAccount.address,
    deadline,
  });
  await publicClient.waitForTransactionReceipt({ hash: swapTx });
  log("swap tx", short(swapTx));
  const afterOut = await tokenBContract.read.balanceOf([userAccount.address]);
  log("received tokenB", formatEther(afterOut - beforeOut));
  // Swap exact out
  log("swapTokensForExactTokens");
  const exactOut = parseEther("1");
  const beforeIn = await tokenAContract.read.balanceOf([userAccount.address]);
  const exactTx = await sdk.router.swapTokensForExactTokens({
    amountOut: exactOut,
    amountInMax: SWAP_IN_1,
    path: [TOKEN_A, TOKEN_B],
    to: userAccount.address,
    deadline,
  });
  await publicClient.waitForTransactionReceipt({ hash: exactTx });
  log("swapTokensForExactTokens tx", short(exactTx));
  const afterIn = await tokenAContract.read.balanceOf([userAccount.address]);
  log("spent tokenA", formatEther(beforeIn - afterIn));
  // Remove liquidity
  log("removeLiquidity");
  const lpBalance = await sdk.erc20(pair).balanceOf(userAccount.address);
  log("LP balance", formatEther(lpBalance));
  const removeTx = await sdk.router.removeLiquidity({
    tokenA: TOKEN_A,
    tokenB: TOKEN_B,
    liquidity: lpBalance / 2n,
    amountAMin: 0n,
    amountBMin: 0n,
    to: userAccount.address,
    deadline,
  });
  await publicClient.waitForTransactionReceipt({ hash: removeTx });
  log("removeLiquidity tx", short(removeTx));
  const [r0After, r1After] = await pairModule.getReserves();
  log("reserve0 after", formatEther(r0After));
  log("reserve1 after", formatEther(r1After));
  // Event watching smoke test
  log(`Watching Swap events for ${EVENT_LISTEN_MS / 1000} seconds`);
  const events = sdk.events(pair);
  const unwatch = events.watchSwap((event) => {
    log("Swap event", {
      sender: short(event.sender),
      amount0In: event.amount0In.toString(),
      amount1In: event.amount1In.toString(),
      amount0Out: event.amount0Out.toString(),
      amount1Out: event.amount1Out.toString(),
      to: short(event.to),
    });
  });
  const swapTx2 = await sdk.router.swapExactTokensForTokens({
    amountIn: SWAP_IN_2,
    amountOutMin: 0n,
    path: [TOKEN_A, TOKEN_B],
    to: userAccount.address,
    deadline,
  });
  await publicClient.waitForTransactionReceipt({ hash: swapTx2 });
  await new Promise((resolve) => setTimeout(resolve, EVENT_LISTEN_MS));
  unwatch();
  log("Done");
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});