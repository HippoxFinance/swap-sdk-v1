// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Full local end-to-end test for the HippoxSwap V1 SDK.
 *
 * Exercises every public API exposed by the SDK against a local anvil chain.
 * The mock ERC20 tokens and the core contracts are deployed by
 * Local_Deploy.s.sol, so this test does not deploy anything itself.
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
import { HippoxSwapV1Math } from "../utils/HippoxSwapV1Math";
import { HippoxSwapV1Slippage } from "../utils/HippoxSwapV1Slippage";
import { HippoxSwapV1Path } from "../utils/HippoxSwapV1Path";
// Configuration
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
/** Amount of ETH added as liquidity in the ETH/token tests. */
const LIQUIDITY_ETH = parseEther("1");
/** Amount of token added as liquidity in the ETH/token tests. */
const LIQUIDITY_TOKEN_FOR_ETH = parseEther("1");
/** Amount of tokenA swapped in the token/token tests. */
const SWAP_IN_1 = parseEther("10");
/** Amount of tokenA swapped in the event listener test. */
const SWAP_IN_2 = parseEther("1");
/** Amount of ETH swapped in the ETH/token tests. */
const SWAP_ETH = parseEther("0.1");
/** Deadline offset in seconds from the current time. */
const DEADLINE_OFFSET_SECONDS = 3600;
/** Time to keep the event listeners running, in milliseconds. */
const EVENT_LISTEN_MS = 10000;
/** Slippage tolerance in basis points used by the helper tests. */
const SLIPPAGE_BPS = 50n;
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
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// Test sections
/**
 * Tests the pure helper classes: Math, Slippage, Path.
 * These do not touch the chain.
 */
function testHelpers() {
    log("Helpers: HippoxSwapV1Math");
    const [t0, t1] = HippoxSwapV1Math.sortTokens(
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000001"
    );
    log("sortTokens.0", t0);
    log("sortTokens.1", t1);
    log("quote(100, 1000, 2000)", HippoxSwapV1Math.quote(100n, 1000n, 2000n).toString());
    log("min(1, 2)", HippoxSwapV1Math.min(1n, 2n).toString());
    log("max(1, 2)", HippoxSwapV1Math.max(1n, 2n).toString());
    log(
        "getAmountOut(100, 1000, 1000, 3, 10)",
        HippoxSwapV1Math.getAmountOut(100n, 1000n, 1000n, 3n, 10n).toString()
    );
    log(
        "getAmountIn(100, 1000, 1000, 3, 10)",
        HippoxSwapV1Math.getAmountIn(100n, 1000n, 1000n, 3n, 10n).toString()
    );
    log("Helpers: HippoxSwapV1Slippage");
    log("minOut(1000, 50)", HippoxSwapV1Slippage.minOut(1000n, 50n).toString());
    log("maxIn(1000, 50)", HippoxSwapV1Slippage.maxIn(1000n, 50n).toString());
    log("percentToBps(0.5)", HippoxSwapV1Slippage.percentToBps(0.5).toString());
    log("Helpers: HippoxSwapV1Path");
    const direct = HippoxSwapV1Path.direct(
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002"
    );
    log("direct", direct);
    const via = HippoxSwapV1Path.via(
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000003"
    );
    log("via", via);
    log("input(via)", HippoxSwapV1Path.input(via));
    log("output(via)", HippoxSwapV1Path.output(via));
    log("isValid(via)", HippoxSwapV1Path.isValid(via));
}
/**
 * Runs the full SDK test flow.
 */
async function main() {
    log("HippoxSwap V1 SDK full local test");
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
    const userWallet = createWalletClient({
        account: userAccount,
        chain: localChain,
        transport: http(RPC_URL),
    });
    void userWallet;
    // Helpers (pure functions, no chain)
    testHelpers();
    // Mock tokens are deployed by Local_Deploy.s.sol
    log("Mock tokens");
    log("tokenA", short(TOKEN_A));
    log("tokenB", short(TOKEN_B));
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
    // Mint mock tokens to the user
    log("Minting mock tokens to user");
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
    log("sdk.account", sdk.account ? short(sdk.account) : "null");
    // Factory: reads
    log("Factory reads");
    log("factory.owner", short(await sdk.factory.owner()));
    log("factory.feeTo", short(await sdk.factory.feeTo()));
    log(
        "factory.protocolFeeNumerator",
        (await sdk.factory.protocolFeeNumerator()).toString()
    );
    log(
        "factory.protocolFeeNumeratorPercen",
        (await sdk.factory.protocolFeeNumeratorPercen()).toString()
    );
    const totalPairsBefore = await sdk.factory.allPairsLength();
    log("factory.allPairsLength", totalPairsBefore.toString());
    // Router: reads
    log("Router reads");
    log("router.factory", short(await sdk.router.factory()));
    log("router.weth", short(await sdk.router.weth()));
    // Add liquidity (ERC20/ERC20)
    log("router.addLiquidity");
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
    // Factory: pair lookup and pagination
    log("Factory pair lookup");
    const pair = await sdk.factory.getPair(TOKEN_A, TOKEN_B);
    log("getPair", short(pair));
    const totalPairs = await sdk.factory.allPairsLength();
    for (let i = 0n; i < totalPairs; i++) {
        log(`allPairs[${i}]`, short(await sdk.factory.allPairs(i)));
    }
    const page = await sdk.factory.getPairsPaginated(0n, 10n);
    log("getPairsPaginated(0, 10).length", page.length.toString());
    // Factory: pair info
    log("Factory pair info");
    const info = await sdk.factory.getPairInfo(TOKEN_A, TOKEN_B);
    if (info) {
        log("pairInfo.token0", short(info.token0));
        log("pairInfo.token1", short(info.token1));
        log("pairInfo.reserve0", formatEther(info.reserve0));
        log("pairInfo.reserve1", formatEther(info.reserve1));
        log("pairInfo.feeNumerator", info.feeNumerator.toString());
        log("pairInfo.taxBps", info.taxBps.toString());
        log("pairInfo.protocolFeeNumerator", info.protocolFeeNumerator.toString());
        log("pairInfo.feeTo", short(info.feeTo));
        log("pairInfo.totalSupply", formatEther(info.totalSupply));
        log("pairInfo.creator", short(info.creator));
        log("pairInfo.admin", short(info.admin));
        log("pairInfo.hook", short(info.hook));
    }
    // Pair: reads
    log("Pair reads");
    const pairModule = sdk.pair(pair);
    log("pair.token0", short(await pairModule.token0()));
    log("pair.token1", short(await pairModule.token1()));
    log("pair.factory", short(await pairModule.factory()));
    const [r0, r1] = await pairModule.getReserves();
    log("reserve0", formatEther(r0));
    log("reserve1", formatEther(r1));
    log(
        "pair.getAmountOut(10 A)",
        formatEther(await pairModule.getAmountOut(SWAP_IN_1, TOKEN_A))
    );
    const cumulative = await pairModule.getCumulativePrices();
    log("pair.price0Cumulative", cumulative.price0Cumulative.toString());
    log("pair.price1Cumulative", cumulative.price1Cumulative.toString());
    log("pair.timestamp", cumulative.timestamp.toString());
    // Router: quotes
    log("Router quotes");
    const amounts = await sdk.router.quote(SWAP_IN_1, [TOKEN_A, TOKEN_B]);
    log("quote in", formatEther(amounts[0]));
    log("quote out", formatEther(amounts[amounts.length - 1]));
    const batch = await sdk.router.quoteBatch(
        [SWAP_IN_1, SWAP_IN_2],
        [
            [TOKEN_A, TOKEN_B],
            [TOKEN_A, TOKEN_B],
        ]
    );
    log("quoteBatch[0].last", formatEther(batch[0][batch[0].length - 1]));
    log("quoteBatch[1].last", formatEther(batch[1][batch[1].length - 1]));
    // Router: ERC20 swap exact in
    log("router.swapExactTokensForTokens");
    const beforeB1 = await tokenBContract.read.balanceOf([userAccount.address]);
    const swapTx1 = await sdk.router.swapExactTokensForTokens({
        amountIn: SWAP_IN_1,
        amountOutMin: 0n,
        path: [TOKEN_A, TOKEN_B],
        to: userAccount.address,
        deadline,
    });
    await publicClient.waitForTransactionReceipt({ hash: swapTx1 });
    const afterB1 = await tokenBContract.read.balanceOf([userAccount.address]);
    log("received tokenB", formatEther(afterB1 - beforeB1));
    // Router: ERC20 swap exact out
    log("router.swapTokensForExactTokens");
    const beforeA2 = await tokenAContract.read.balanceOf([userAccount.address]);
    const swapTx2 = await sdk.router.swapTokensForExactTokens({
        amountOut: parseEther("1"),
        amountInMax: SWAP_IN_1,
        path: [TOKEN_A, TOKEN_B],
        to: userAccount.address,
        deadline,
    });
    await publicClient.waitForTransactionReceipt({ hash: swapTx2 });
    const afterA2 = await tokenAContract.read.balanceOf([userAccount.address]);
    log("spent tokenA", formatEther(beforeA2 - afterA2));
    // Router: ETH/token liquidity
    log("router.addLiquidityETH");
    const addEthTx = await sdk.router.addLiquidityETH({
        token: TOKEN_A,
        amountTokenDesired: LIQUIDITY_TOKEN_FOR_ETH,
        amountTokenMin: 0n,
        amountETHMin: 0n,
        to: userAccount.address,
        deadline,
        value: LIQUIDITY_ETH,
    });
    await publicClient.waitForTransactionReceipt({ hash: addEthTx });
    log("addLiquidityETH tx", short(addEthTx));
    const pairA_ETH = await sdk.factory.getPair(TOKEN_A, WETH);
    log("pairA/ETH", short(pairA_ETH));
    // Router: ETH -> token swap
    log("router.swapExactETHForTokens");
    const beforeA3 = await tokenAContract.read.balanceOf([userAccount.address]);
    const buyTx = await sdk.router.swapExactETHForTokens({
        amountOutMin: 0n,
        path: [WETH, TOKEN_A],
        to: userAccount.address,
        deadline,
        value: SWAP_ETH,
    });
    await publicClient.waitForTransactionReceipt({ hash: buyTx });
    const afterA3 = await tokenAContract.read.balanceOf([userAccount.address]);
    log("received tokenA", formatEther(afterA3 - beforeA3));
    // Router: token -> ETH swap
    log("router.swapExactTokensForETH");
    const beforeEth = await publicClient.getBalance({ address: userAccount.address });
    const sellTx = await sdk.router.swapExactTokensForETH({
        amountIn: parseEther("0.5"),
        amountOutMin: 0n,
        path: [TOKEN_A, WETH],
        to: userAccount.address,
        deadline,
    });
    await publicClient.waitForTransactionReceipt({ hash: sellTx });
    const afterEth = await publicClient.getBalance({ address: userAccount.address });
    log(
        "ETH balance delta (before gas)",
        formatEther(afterEth - beforeEth)
    );
    // Router: remove ETH/token liquidity
    log("router.removeLiquidityETH");
    const lpBalanceA_ETH = await sdk.erc20(pairA_ETH).balanceOf(userAccount.address);
    log("LP balance (A/ETH)", formatEther(lpBalanceA_ETH));
    const removeEthTx = await sdk.router.removeLiquidityETH({
        token: TOKEN_A,
        liquidity: lpBalanceA_ETH / 2n,
        amountTokenMin: 0n,
        amountETHMin: 0n,
        to: userAccount.address,
        deadline,
    });
    await publicClient.waitForTransactionReceipt({ hash: removeEthTx });
    log("removeLiquidityETH tx", short(removeEthTx));
    // Router: remove ERC20/ERC20 liquidity
    log("router.removeLiquidity");
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
    // ERC20 module: reads and writes
    log("ERC20 module");
    const tokenA_ = sdk.erc20(TOKEN_A);
    log("name", await tokenA_.name());
    log("symbol", await tokenA_.symbol());
    log("decimals", (await tokenA_.decimals()).toString());
    log("totalSupply", formatEther(await tokenA_.totalSupply()));
    log("balanceOf(user)", formatEther(await tokenA_.balanceOf(userAccount.address)));
    log(
        "allowance(user, router)",
        formatEther(await tokenA_.allowance(userAccount.address, ROUTER))
    );
    // Approve the router for a fixed amount and re-read the allowance.
    const approveTx = await tokenA_.approve(ROUTER, parseEther("100"));
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    log(
        "allowance after approve",
        formatEther(await tokenA_.allowance(userAccount.address, ROUTER))
    );
    // Transfer a small amount to the deployer and read it back.
    const transferTx = await tokenA_.transfer(
        deployerAccount.address,
        parseEther("1")
    );
    await publicClient.waitForTransactionReceipt({ hash: transferTx });
    log(
        "deployer balanceOf after transfer",
        formatEther(await tokenA_.balanceOf(deployerAccount.address))
    );
    // Oracle module (skipped when no oracle is configured)
    if (ORACLE) {
        log("Oracle module");
        const oracle = sdk.oracle(ORACLE);
        log("oracle.pair", short(await oracle.pair()));
        log("oracle.minElapsedTime", (await oracle.minElapsedTime()).toString());
        log(
            "oracle.observationsLength",
            (await oracle.observationsLength()).toString()
        );
        try {
            const updateTx = await oracle.update();
            await publicClient.waitForTransactionReceipt({ hash: updateTx });
            log("oracle.update tx", short(updateTx));
        } catch (err) {
            log("oracle.update reverted", (err as Error).message);
        }
        const cumulatives = await oracle.currentCumulatives();
        log("oracle.price0Cumulative", cumulatives.price0Cumulative.toString());
        log("oracle.price1Cumulative", cumulatives.price1Cumulative.toString());
        log("oracle.timestamp", cumulatives.timestamp.toString());
        if ((await oracle.observationsLength()) >= 2n) {
            try {
                const out = await oracle.consult(TOKEN_A, parseEther("1"), 1800);
                log("oracle.consult(A, 1, 1800)", formatEther(out));
            } catch (err) {
                log("oracle.consult reverted", (err as Error).message);
            }
        }
    } else {
        log("Oracle module skipped (no oracle configured)");
    }
    // Events module: Swap, Mint, Burn
    log(`Watching pair events for ${EVENT_LISTEN_MS}ms`);
    const events = sdk.events(pair);
    const unwatchSwap = events.watchSwap((event) => {
        log("Swap event", {
            sender: short(event.sender),
            amount0In: event.amount0In.toString(),
            amount1In: event.amount1In.toString(),
            amount0Out: event.amount0Out.toString(),
            amount1Out: event.amount1Out.toString(),
            to: short(event.to),
        });
    });
    const unwatchMint = events.watchMint((event) => {
        log("Mint event", {
            sender: short(event.sender),
            amount0: event.amount0.toString(),
            amount1: event.amount1.toString(),
        });
    });
    const unwatchBurn = events.watchBurn((event) => {
        log("Burn event", {
            sender: short(event.sender),
            amount0: event.amount0.toString(),
            amount1: event.amount1.toString(),
            to: short(event.to),
        });
    });
    // Give the event watchers a moment to establish the polling / subscription
    // before triggering any transactions. Without this, the first transaction
    // may be mined before the watcher starts listening and the event is missed.
    await sleep(1500);
    // Trigger a swap.
    const triggerSwapTx = await sdk.router.swapExactTokensForTokens({
        amountIn: SWAP_IN_2,
        amountOutMin: 0n,
        path: [TOKEN_A, TOKEN_B],
        to: userAccount.address,
        deadline,
    });
    await publicClient.waitForTransactionReceipt({ hash: triggerSwapTx });
    await sleep(1000);
    // Trigger a mint.
    const triggerMintTx = await sdk.router.addLiquidity({
        tokenA: TOKEN_A,
        tokenB: TOKEN_B,
        amountADesired: parseEther("10"),
        amountBDesired: parseEther("10"),
        amountAMin: 0n,
        amountBMin: 0n,
        to: userAccount.address,
        deadline,
    });
    await publicClient.waitForTransactionReceipt({ hash: triggerMintTx });
    await sleep(1000);
    // Trigger a burn.
    const lpForBurn = await sdk.erc20(pair).balanceOf(userAccount.address);
    const triggerBurnTx = await sdk.router.removeLiquidity({
        tokenA: TOKEN_A,
        tokenB: TOKEN_B,
        liquidity: lpForBurn / 4n,
        amountAMin: 0n,
        amountBMin: 0n,
        to: userAccount.address,
        deadline,
    });
    await publicClient.waitForTransactionReceipt({ hash: triggerBurnTx });
    await sleep(1000);
    unwatchSwap();
    unwatchMint();
    unwatchBurn();
    // Slippage helpers applied to a live quote
    log("Slippage helpers on live quote");
    const liveAmounts = await sdk.router.quote(SWAP_IN_1, [TOKEN_A, TOKEN_B]);
    const expectedOut = liveAmounts[liveAmounts.length - 1];
    const minOut = HippoxSwapV1Slippage.minOut(expectedOut, SLIPPAGE_BPS);
    log("expectedOut", formatEther(expectedOut));
    log("minOut (50 bps)", formatEther(minOut));
    log("Done");
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});