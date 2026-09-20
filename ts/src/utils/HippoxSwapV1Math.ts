// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Math helpers shared by the SDK. Mirrors HippoxSwapLibraryV1 on-chain.
 */
/** Fee denominator used by the pair for AMM fees. */
export const HIPPOX_SWAP_V1_FEE_DENOMINATOR = 1000n;
/** Basis point denominator used by the pair for trading tax. */
export const HIPPOX_SWAP_V1_BPS_DENOMINATOR = 10000n;
/** Minimum liquidity locked in every pair. */
export const HIPPOX_SWAP_V1_MINIMUM_LIQUIDITY = 1000n;
export class HippoxSwapV1Math {
    /**
     * sortTokens returns the two token addresses in ascending order.
     */
    static sortTokens(tokenA: string, tokenB: string): [string, string] {
        if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
            throw new Error("HippoxSwapV1Math: identical addresses");
        }
        return tokenA.toLowerCase() < tokenB.toLowerCase()
            ? [tokenA, tokenB]
            : [tokenB, tokenA];
    }
    /**
     * quote returns the proportional amount of the second token given the first.
     */
    static quote(amountA: bigint, reserveA: bigint, reserveB: bigint): bigint {
        if (amountA <= 0n) throw new Error("HippoxSwapV1Math: insufficient amount");
        if (reserveA <= 0n || reserveB <= 0n) {
            throw new Error("HippoxSwapV1Math: insufficient liquidity");
        }
        return (amountA * reserveB) / reserveA;
    }
    /**
     * getAmountOut mirrors the pair's getAmountOut with tax and AMM fee.
     */
    static getAmountOut(
        amountIn: bigint,
        reserveIn: bigint,
        reserveOut: bigint,
        feeNumerator: bigint,
        taxBps: bigint
    ): bigint {
        if (amountIn <= 0n) {
            throw new Error("HippoxSwapV1Math: insufficient input amount");
        }
        if (reserveIn <= 0n || reserveOut <= 0n) {
            throw new Error("HippoxSwapV1Math: insufficient liquidity");
        }
        const tax = (amountIn * taxBps) / HIPPOX_SWAP_V1_BPS_DENOMINATOR;
        const effectiveIn = amountIn - tax;
        const amountInWithFee =
            effectiveIn * (HIPPOX_SWAP_V1_FEE_DENOMINATOR - feeNumerator);
        const numerator = amountInWithFee * reserveOut;
        const denominator =
            reserveIn * HIPPOX_SWAP_V1_FEE_DENOMINATOR + amountInWithFee;
        return numerator / denominator;
    }
    /**
     * getAmountIn mirrors the pair's inverse formula.
     */
    static getAmountIn(
        amountOut: bigint,
        reserveIn: bigint,
        reserveOut: bigint,
        feeNumerator: bigint,
        taxBps: bigint
    ): bigint {
        if (amountOut <= 0n) {
            throw new Error("HippoxSwapV1Math: insufficient output amount");
        }
        if (reserveIn <= 0n || reserveOut <= 0n) {
            throw new Error("HippoxSwapV1Math: insufficient liquidity");
        }
        const numerator =
            reserveIn * amountOut * HIPPOX_SWAP_V1_FEE_DENOMINATOR;
        const denominator =
            (reserveOut - amountOut) *
            (HIPPOX_SWAP_V1_FEE_DENOMINATOR - feeNumerator);
        const effectiveIn = numerator / denominator + 1n;
        return (
            (effectiveIn * HIPPOX_SWAP_V1_BPS_DENOMINATOR) /
            (HIPPOX_SWAP_V1_BPS_DENOMINATOR - taxBps) +
            1n
        );
    }
    /**
     * min returns the smaller of two bigints.
     */
    static min(a: bigint, b: bigint): bigint {
        return a < b ? a : b;
    }
    /**
     * max returns the larger of two bigints.
     */
    static max(a: bigint, b: bigint): bigint {
        return a > b ? a : b;
    }
}