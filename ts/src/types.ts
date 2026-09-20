// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Shared types for the HippoxSwap V1 SDK.
 */

import type {
    Address,
    Chain,
    Hash,
    PublicClient,
    WalletClient,
    Transport,
} from "viem";

/**
 * Connection mode for the SDK client.
 * - "public": read-only, no signer.
 * - "privateKey": sign with a local private key (Tauri, Node).
 * - "browserWallet": sign with an injected EIP-1193 provider (browser).
 */
export type HippoxSwapV1Mode = "public" | "privateKey" | "browserWallet";

/**
 * Base configuration shared by all modes.
 */
export interface HippoxSwapV1BaseConfig {
    chain: Chain;
    transport: Transport;
    factory: Address;
    router: Address;
    weth: Address;
    oracle?: Address;
}

/**
 * Read-only config. No signer.
 */
export interface HippoxSwapV1PublicConfig extends HippoxSwapV1BaseConfig {
    mode: "public";
}

/**
 * Local private key config. Used by Tauri and Node scripts.
 */
export interface HippoxSwapV1PrivateKeyConfig extends HippoxSwapV1BaseConfig {
    mode: "privateKey";
    privateKey: `0x${string}`;
}

/**
 * Browser wallet config. Uses an injected EIP-1193 provider.
 */
export interface HippoxSwapV1BrowserWalletConfig
    extends HippoxSwapV1BaseConfig {
    mode: "browserWallet";
    ethereum: unknown; // EIP-1193 provider, validated at runtime
}

/**
 * Union of all supported configs.
 */
export type HippoxSwapV1Config =
    | HippoxSwapV1PublicConfig
    | HippoxSwapV1PrivateKeyConfig
    | HippoxSwapV1BrowserWalletConfig;

/**
 * Aggregated snapshot of a pair's state.
 */
export interface HippoxSwapV1PairInfo {
    token0: Address;
    token1: Address;
    reserve0: bigint;
    reserve1: bigint;
    feeNumerator: bigint;
    feeDenominator: bigint;
    maxFeeNumerator: bigint;
    taxBps: bigint;
    maxTaxBps: bigint;
    bpsDenominator: bigint;
    taxRecipient: Address;
    totalSupply: bigint;
    creator: Address;
    admin: Address;
    minimumLiquidity: bigint;
    hook: Address;
    protocolFeeNumerator: bigint;
    feeTo: Address;
}

/**
 * Parameters for ERC20/ERC20 liquidity.
 */
export interface HippoxSwapV1AddLiquidityParams {
    tokenA: Address;
    tokenB: Address;
    amountADesired: bigint;
    amountBDesired: bigint;
    amountAMin: bigint;
    amountBMin: bigint;
    to: Address;
    deadline: bigint;
    hook?: Address;
}

/**
 * Parameters for ETH/token liquidity.
 */
export interface HippoxSwapV1AddLiquidityETHParams {
    token: Address;
    amountTokenDesired: bigint;
    amountTokenMin: bigint;
    amountETHMin: bigint;
    to: Address;
    deadline: bigint;
    value: bigint;
    hook?: Address;
}

/**
 * Parameters for removing ERC20/ERC20 liquidity.
 */
export interface HippoxSwapV1RemoveLiquidityParams {
    tokenA: Address;
    tokenB: Address;
    liquidity: bigint;
    amountAMin: bigint;
    amountBMin: bigint;
    to: Address;
    deadline: bigint;
}

/**
 * Parameters for removing ETH/token liquidity.
 */
export interface HippoxSwapV1RemoveLiquidityETHParams {
    token: Address;
    liquidity: bigint;
    amountTokenMin: bigint;
    amountETHMin: bigint;
    to: Address;
    deadline: bigint;
}

/**
 * Parameters for exact-in token to token swaps.
 */
export interface HippoxSwapV1SwapExactTokensParams {
    amountIn: bigint;
    amountOutMin: bigint;
    path: Address[];
    to: Address;
    deadline: bigint;
}

/**
 * Parameters for exact-out token to token swaps.
 */
export interface HippoxSwapV1SwapTokensForExactParams {
    amountOut: bigint;
    amountInMax: bigint;
    path: Address[];
    to: Address;
    deadline: bigint;
}

/**
 * Parameters for exact-in ETH to token swaps.
 */
export interface HippoxSwapV1SwapExactETHForTokensParams {
    amountOutMin: bigint;
    path: Address[];
    to: Address;
    deadline: bigint;
    value: bigint;
}

/**
 * Parameters for exact-in token to ETH swaps.
 */
export interface HippoxSwapV1SwapExactTokensForETHParams {
    amountIn: bigint;
    amountOutMin: bigint;
    path: Address[];
    to: Address;
    deadline: bigint;
}

/**
 * Event payload emitted by the pair Swap event.
 */
export interface HippoxSwapV1SwapEvent {
    sender: Address;
    amount0In: bigint;
    amount1In: bigint;
    amount0Out: bigint;
    amount1Out: bigint;
    to: Address;
}

/**
 * Event payload emitted by the pair Mint event.
 */
export interface HippoxSwapV1MintEvent {
    sender: Address;
    amount0: bigint;
    amount1: bigint;
}

/**
 * Event payload emitted by the pair Burn event.
 */
export interface HippoxSwapV1BurnEvent {
    sender: Address;
    amount0: bigint;
    amount1: bigint;
    to: Address;
}

/**
 * Generic read context. Used by modules to access the public client and config.
 */
export interface HippoxSwapV1ReadContext {
    publicClient: PublicClient;
    factory: Address;
    router: Address;
    weth: Address;
    oracle?: Address;
}

/**
 * Generic write context. Extends the read context with an optional wallet client.
 */
export interface HippoxSwapV1WriteContext extends HippoxSwapV1ReadContext {
    walletClient?: WalletClient;
}

/**
 * Result of a write call.
 */
export interface HippoxSwapV1TxResult {
    hash: Hash;
}