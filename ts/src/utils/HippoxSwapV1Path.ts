// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Path helpers for multi-hop swaps.
 */
import type { Address } from "viem";
export class HippoxSwapV1Path {
    /**
     * Returns true if the path has at least two tokens.
     */
    static isValid(path: Address[]): boolean {
        return Array.isArray(path) && path.length >= 2;
    }
    /**
     * Returns the first token of the path.
     */
    static input(path: Address[]): Address {
        if (!HippoxSwapV1Path.isValid(path)) {
            throw new Error("HippoxSwapV1Path: invalid path");
        }
        return path[0];
    }
    /**
     * Returns the last token of the path.
     */
    static output(path: Address[]): Address {
        if (!HippoxSwapV1Path.isValid(path)) {
            throw new Error("HippoxSwapV1Path: invalid path");
        }
        return path[path.length - 1];
    }
    /**
     * Builds a two-token path.
     */
    static direct(tokenIn: Address, tokenOut: Address): Address[] {
        if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
            throw new Error("HippoxSwapV1Path: identical tokens");
        }
        return [tokenIn, tokenOut];
    }
    /**
     * Builds a three-token path through an intermediate token.
     */
    static via(
        tokenIn: Address,
        tokenMid: Address,
        tokenOut: Address
    ): Address[] {
        return [tokenIn, tokenMid, tokenOut];
    }
}