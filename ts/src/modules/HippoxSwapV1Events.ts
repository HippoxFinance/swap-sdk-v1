// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Events module. Subscribes to pair events.
 */
import { type Address } from "viem";
import { hippoxSwapV1PairAbi } from "../abis/pair";
import type {
    HippoxSwapV1BurnEvent,
    HippoxSwapV1MintEvent,
    HippoxSwapV1ReadContext,
    HippoxSwapV1SwapEvent,
} from "../types";
export class HippoxSwapV1Events {
    constructor(
        private readonly ctx: HippoxSwapV1ReadContext,
        public readonly pair: Address
    ) { }
    /**
     * Subscribes to Swap events. Returns an unsubscribe function.
     */
    watchSwap(
        onEvent: (event: HippoxSwapV1SwapEvent) => void,
        onError?: (error: Error) => void
    ): () => void {
        return this.ctx.publicClient.watchContractEvent({
            address: this.pair,
            abi: hippoxSwapV1PairAbi,
            eventName: "Swap",
            onLogs: (logs) => {
                for (const log of logs) {
                    const args = log.args as {
                        sender: Address;
                        amount0In: bigint;
                        amount1In: bigint;
                        amount0Out: bigint;
                        amount1Out: bigint;
                        to: Address;
                    };
                    onEvent({
                        sender: args.sender,
                        amount0In: args.amount0In,
                        amount1In: args.amount1In,
                        amount0Out: args.amount0Out,
                        amount1Out: args.amount1Out,
                        to: args.to,
                    });
                }
            },
            onError: (err) => onError?.(err as Error),
        });
    }
    /**
     * Subscribes to Mint events. Returns an unsubscribe function.
     */
    watchMint(
        onEvent: (event: HippoxSwapV1MintEvent) => void,
        onError?: (error: Error) => void
    ): () => void {
        return this.ctx.publicClient.watchContractEvent({
            address: this.pair,
            abi: hippoxSwapV1PairAbi,
            eventName: "Mint",
            onLogs: (logs) => {
                for (const log of logs) {
                    const args = log.args as {
                        sender: Address;
                        amount0: bigint;
                        amount1: bigint;
                    };
                    onEvent({
                        sender: args.sender,
                        amount0: args.amount0,
                        amount1: args.amount1,
                    });
                }
            },
            onError: (err) => onError?.(err as Error),
        });
    }
    /**
     * Subscribes to Burn events. Returns an unsubscribe function.
     */
    watchBurn(
        onEvent: (event: HippoxSwapV1BurnEvent) => void,
        onError?: (error: Error) => void
    ): () => void {
        return this.ctx.publicClient.watchContractEvent({
            address: this.pair,
            abi: hippoxSwapV1PairAbi,
            eventName: "Burn",
            onLogs: (logs) => {
                for (const log of logs) {
                    const args = log.args as {
                        sender: Address;
                        amount0: bigint;
                        amount1: bigint;
                        to: Address;
                    };
                    onEvent({
                        sender: args.sender,
                        amount0: args.amount0,
                        amount1: args.amount1,
                        to: args.to,
                    });
                }
            },
            onError: (err) => onError?.(err as Error),
        });
    }
}