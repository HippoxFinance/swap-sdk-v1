// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Pair module. Read helpers for a specific HippoxSwapPairV1, plus write
 * helpers that require a wallet client (e.g. setHook).
 */
import { getContract, type Address, type Hash } from "viem";
import { hippoxSwapV1PairAbi } from "../abis/pair";
import type { HippoxSwapV1WriteContext } from "../types";
export class HippoxSwapV1Pair {
    constructor(
        private readonly ctx: HippoxSwapV1WriteContext,
        public readonly address: Address
    ) { }
    private readContract() {
        return getContract({
            address: this.address,
            abi: hippoxSwapV1PairAbi,
            client: this.ctx.publicClient,
        });
    }
    private writeContract() {
        if (!this.ctx.walletClient) {
            throw new Error("HippoxSwapV1Pair: wallet client required");
        }
        return getContract({
            address: this.address,
            abi: hippoxSwapV1PairAbi,
            client: {
                public: this.ctx.publicClient,
                wallet: this.ctx.walletClient,
            },
        });
    }
    async token0(): Promise<Address> {
        return (await this.readContract().read.token0()) as Address;
    }
    async token1(): Promise<Address> {
        return (await this.readContract().read.token1()) as Address;
    }
    async factory(): Promise<Address> {
        return (await this.readContract().read.factory()) as Address;
    }
    async hook(): Promise<Address> {
        return (await this.readContract().read.hook()) as Address;
    }
    async getReserves(): Promise<[bigint, bigint]> {
        const reserves = await this.readContract().read.getReserves();
        return [BigInt(reserves[0]), BigInt(reserves[1])];
    }
    /**
     * Local single-pool quote including AMM fee and trading tax.
     */
    async getAmountOut(amountIn: bigint, tokenIn: Address): Promise<bigint> {
        return (await this.readContract().read.getAmountOut([
            amountIn,
            tokenIn,
        ])) as bigint;
    }
    /**
     * Returns the cumulative prices and last update timestamp.
     */
    async getCumulativePrices(): Promise<{
        price0Cumulative: bigint;
        price1Cumulative: bigint;
        timestamp: bigint;
    }> {
        const result = await this.readContract().read.getCumulativePrices();
        return {
            price0Cumulative: BigInt(result[0]),
            price1Cumulative: BigInt(result[1]),
            timestamp: BigInt(result[2]),
        };
    }
    /**
     * Sets or clears the hook. Only the pair's creator can call this.
     * Passing address(0) disables the hook.
     */
    async setHook(hook: Address): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        return (await this.writeContract().write.setHook([hook], {
            account: wallet.account!,
            chain: wallet.chain,
        })) as Hash;
    }
}