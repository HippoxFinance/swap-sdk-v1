// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Slippage helpers. All functions accept basis points (1 bps = 0.01%).
 */
export class HippoxSwapV1Slippage {
    /**
     * Applies slippage tolerance to an expected output amount and returns the
     * minimum acceptable output.
     */
    static minOut(amountOut: bigint, bps: bigint): bigint {
        if (bps < 0n || bps > 10000n) {
            throw new Error("HippoxSwapV1Slippage: bps out of range");
        }
        const factor = 10000n - bps;
        return (amountOut * factor) / 10000n;
    }
    /**
     * Applies slippage tolerance to an expected input amount and returns the
     * maximum acceptable input.
     */
    static maxIn(amountIn: bigint, bps: bigint): bigint {
        if (bps < 0n || bps > 10000n) {
            throw new Error("HippoxSwapV1Slippage: bps out of range");
        }
        const factor = 10000n + bps;
        return (amountIn * factor) / 10000n;
    }
    /**
     * Converts a percentage (e.g. 0.5) into basis points.
     */
    static percentToBps(percent: number): bigint {
        return BigInt(Math.round(percent * 100));
    }
}