// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Local test for the HippoxSwap V1 SDK hook integration.
 *
 * Uses an already deployed hook at the HOOK constant. Does not deploy a
 * hook itself. Since Local_Deploy.s.sol pre-creates the tokenA/tokenB pair
 * without a hook, this test installs the hook on the existing pair via
 * pair.setHook(HOOK) and then exercises the hook callbacks.
 *
 * Note on the signer: the pair is created by Local_Deploy.s.sol with the
 * deployer as creator (createPair(..., deployer)). Pair.setHook is guarded
 * by onlyCreator, so this test must sign with the deployer key. That is
 * Anvil account 0 (0xf39F...2266).
 *
 * Note on MockToken balances: MockToken has no constructor mint. Its total
 * supply starts at zero and tokens must be minted explicitly via the public
 * mint(address,uint256) function. This test mints a working balance to the
 * signer before adding liquidity.
 *
 * Note on initialize hooks: because the pair already exists and was created
 * without a hook, beforeInitialize / afterInitialize will never fire here.
 * Only beforeModifyLiquidity / afterModifyLiquidity and beforeSwap /
 * afterSwap are expected to increment their counters.
 *
 * Exercises:
 *   - read hook metadata
 *   - mint test tokens to the signer
 *   - approve tokens to the router
 *   - install the hook on the existing pair via setHook
 *   - addLiquidity to fire beforeModifyLiquidity / afterModifyLiquidity
 *   - swap to fire beforeSwap / afterSwap
 *   - removeLiquidity to fire beforeModifyLiquidity / afterModifyLiquidity
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
/**
 * Private key used to sign write operations.
 *
 * This MUST be the deployer key (Anvil account 0), because Local_Deploy.s.sol
 * creates the pair with the deployer as creator, and Pair.setHook is guarded
 * by onlyCreator.
 */
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
/** Address of the deployed hook. Filled in from Local_Deploy.s.sol output. */
const HOOK: Address = "";
/** Amount approved to the router. */
const APPROVE_AMOUNT = parseEther("1000000");
/** Amount minted to the signer before the test. */
const MINT_AMOUNT = parseEther("10000");
/** Amount added as liquidity. */
const LIQUIDITY_A = parseEther("1000");
/** Amount added as liquidity. */
const LIQUIDITY_B = parseEther("1000");
/** Amount swapped in the hook test. */
const SWAP_IN = parseEther("1");
/** Minimal ABI for the MockHook counters. */
const MOCK_HOOK_ABI = [
    { type: "function", name: "beforeInitializeCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    { type: "function", name: "afterInitializeCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    { type: "function", name: "beforeModifyLiquidityCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    { type: "function", name: "afterModifyLiquidityCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    { type: "function", name: "beforeSwapCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    { type: "function", name: "afterSwapCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
    { type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;
/** Minimal ABI for MockToken's public mint. */
const MOCK_TOKEN_MINT_ABI = [
    {
        type: "function",
        name: "mint",
        stateMutability: "nonpayable",
        inputs: [
            { type: "address" },
            { type: "uint256" },
        ],
        outputs: [],
    },
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
    return BigInt(Math.floor(Date.now() / 1000) + 3600);
}
// Test runner
async function main() {
    log("HippoxSwap V1 SDK hook test");
    if (HOOK === "0x...") {
        throw new Error(
            "HOOK address is not set. Deploy a hook separately and fill in the HOOK constant."
        );
    }
    const userAccount = privateKeyToAccount(USER_PRIVATE_KEY);
    const publicClient = createPublicClient({
        chain: localChain,
        transport: http(RPC_URL),
    });
    const walletClient = createWalletClient({
        account: userAccount,
        chain: localChain,
        transport: http(RPC_URL),
    });
    const hookContract = getContract({
        address: HOOK,
        abi: MOCK_HOOK_ABI,
        client: publicClient,
    });
    // ---------------------------------------------------------------------------
    // Read: hook metadata
    // ---------------------------------------------------------------------------
    log("Hook: metadata");
    log("hook", short(HOOK));
    log("name", await hookContract.read.name());
    log("version", await hookContract.read.version());
    // ---------------------------------------------------------------------------
    // Mint test tokens to the signer
    //
    // MockToken has no constructor mint, so the signer starts with a zero
    // balance. Mint enough of both tokens to cover liquidity and swaps.
    // ---------------------------------------------------------------------------
    log("Minting test tokens to signer");
    const tokenAMint = getContract({
        address: TOKEN_A,
        abi: MOCK_TOKEN_MINT_ABI,
        client: { public: publicClient, wallet: walletClient },
    });
    const tokenBMint = getContract({
        address: TOKEN_B,
        abi: MOCK_TOKEN_MINT_ABI,
        client: { public: publicClient, wallet: walletClient },
    });
    const mintATx = await tokenAMint.write.mint([userAccount.address, MINT_AMOUNT], {
        account: userAccount,
        chain: localChain,
    });
    await publicClient.waitForTransactionReceipt({ hash: mintATx });
    log("mint A tx", short(mintATx));
    const mintBTx = await tokenBMint.write.mint([userAccount.address, MINT_AMOUNT], {
        account: userAccount,
        chain: localChain,
    });
    await publicClient.waitForTransactionReceipt({ hash: mintBTx });
    log("mint B tx", short(mintBTx));
    // ---------------------------------------------------------------------------
    // Instantiate the SDK client
    // ---------------------------------------------------------------------------
    const sdk = new HippoxSwapV1Client({
        mode: "privateKey",
        chain: localChain,
        transport: http(RPC_URL),
        privateKey: USER_PRIVATE_KEY,
        factory: FACTORY,
        router: ROUTER,
        weth: WETH,
    });
    // ---------------------------------------------------------------------------
    // Approve the router to spend the user's tokens
    // ---------------------------------------------------------------------------
    log("Approving router");
    const tokenA = sdk.erc20(TOKEN_A);
    const tokenB = sdk.erc20(TOKEN_B);
    log("balance A", formatEther(await tokenA.balanceOf(userAccount.address)));
    log("balance B", formatEther(await tokenB.balanceOf(userAccount.address)));
    const approveATx = await tokenA.approve(ROUTER, APPROVE_AMOUNT);
    await publicClient.waitForTransactionReceipt({ hash: approveATx });
    log("approve A tx", short(approveATx));
    const approveBTx = await tokenB.approve(ROUTER, APPROVE_AMOUNT);
    await publicClient.waitForTransactionReceipt({ hash: approveBTx });
    log("approve B tx", short(approveBTx));
    log(
        "allowance A",
        formatEther(await tokenA.allowance(userAccount.address, ROUTER))
    );
    log(
        "allowance B",
        formatEther(await tokenB.allowance(userAccount.address, ROUTER))
    );
    // ---------------------------------------------------------------------------
    // Ensure the pair exists and has liquidity, then install the hook
    // ---------------------------------------------------------------------------
    log("Ensuring pair has liquidity");
    const pair = await sdk.factory.getPair(TOKEN_A, TOKEN_B);
    log("pair", short(pair));
    const pairModule = sdk.pair(pair);
    const [r0Before, r1Before] = await pairModule.getReserves();
    log("reserve0 before", formatEther(r0Before));
    log("reserve1 before", formatEther(r1Before));
    if (r0Before === 0n || r1Before === 0n) {
        log("Pair is empty, adding initial liquidity");
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
    } else {
        log("Pair already has liquidity, skipping seed");
    }
    // ---------------------------------------------------------------------------
    // Install the hook on the existing pair via setHook
    // ---------------------------------------------------------------------------
    log("Installing hook on existing pair");
    const currentHook = await pairModule.hook();
    if (currentHook.toLowerCase() === HOOK.toLowerCase()) {
        log("Hook already installed", short(currentHook));
    } else {
        const setHookTx = await pairModule.setHook(HOOK);
        await publicClient.waitForTransactionReceipt({ hash: setHookTx });
        log("setHook tx", short(setHookTx));
    }
    const installedHook = await pairModule.hook();
    log("pair.hook", short(installedHook));
    // ---------------------------------------------------------------------------
    // Snapshot counters before the test
    // ---------------------------------------------------------------------------
    log("Hook: counters before");
    log("beforeInitializeCount", (await hookContract.read.beforeInitializeCount()).toString());
    log("afterInitializeCount", (await hookContract.read.afterInitializeCount()).toString());
    log("beforeModifyLiquidityCount", (await hookContract.read.beforeModifyLiquidityCount()).toString());
    log("afterModifyLiquidityCount", (await hookContract.read.afterModifyLiquidityCount()).toString());
    log("beforeSwapCount", (await hookContract.read.beforeSwapCount()).toString());
    log("afterSwapCount", (await hookContract.read.afterSwapCount()).toString());
    // ---------------------------------------------------------------------------
    // Add liquidity to fire beforeModifyLiquidity / afterModifyLiquidity
    // ---------------------------------------------------------------------------
    log("router.addLiquidity");
    const addTx = await sdk.router.addLiquidity({
        tokenA: TOKEN_A,
        tokenB: TOKEN_B,
        amountADesired: parseEther("10"),
        amountBDesired: parseEther("10"),
        amountAMin: 0n,
        amountBMin: 0n,
        to: userAccount.address,
        deadline: deadlineFromNow(),
    });
    await publicClient.waitForTransactionReceipt({ hash: addTx });
    log("addLiquidity tx", short(addTx));
    log("Hook: counters after addLiquidity");
    log("beforeModifyLiquidityCount", (await hookContract.read.beforeModifyLiquidityCount()).toString());
    log("afterModifyLiquidityCount", (await hookContract.read.afterModifyLiquidityCount()).toString());
    // ---------------------------------------------------------------------------
    // Trigger a swap to fire beforeSwap / afterSwap
    // ---------------------------------------------------------------------------
    log("router.swapExactTokensForTokens");
    const swapTx = await sdk.router.swapExactTokensForTokens({
        amountIn: SWAP_IN,
        amountOutMin: 0n,
        path: [TOKEN_A, TOKEN_B],
        to: userAccount.address,
        deadline: deadlineFromNow(),
    });
    await publicClient.waitForTransactionReceipt({ hash: swapTx });
    log("swap tx", short(swapTx));
    log("Hook: counters after swap");
    log("beforeSwapCount", (await hookContract.read.beforeSwapCount()).toString());
    log("afterSwapCount", (await hookContract.read.afterSwapCount()).toString());
    // ---------------------------------------------------------------------------
    // Remove liquidity to fire beforeModifyLiquidity / afterModifyLiquidity
    // ---------------------------------------------------------------------------
    log("router.removeLiquidity");
    const lpBalance = await sdk.erc20(pair).balanceOf(userAccount.address);
    log("LP balance", formatEther(lpBalance));
    const removeTx = await sdk.router.removeLiquidity({
        tokenA: TOKEN_A,
        tokenB: TOKEN_B,
        liquidity: lpBalance / 4n,
        amountAMin: 0n,
        amountBMin: 0n,
        to: userAccount.address,
        deadline: deadlineFromNow(),
    });
    await publicClient.waitForTransactionReceipt({ hash: removeTx });
    log("removeLiquidity tx", short(removeTx));
    log("Hook: counters after removeLiquidity");
    log("beforeModifyLiquidityCount", (await hookContract.read.beforeModifyLiquidityCount()).toString());
    log("afterModifyLiquidityCount", (await hookContract.read.afterModifyLiquidityCount()).toString());
    log("Done");
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});