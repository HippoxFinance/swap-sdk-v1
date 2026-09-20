// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Oracle module. Read helpers for HippoxOracleV1 and a write helper for
 * pushing a new observation.
 */
import { getContract, type Address, type Hash } from "viem";
import { hippoxSwapV1OracleAbi } from "../abis/oracle";
import type { HippoxSwapV1WriteContext } from "../types";
export class HippoxSwapV1Oracle {
    constructor(
        private readonly ctx: HippoxSwapV1WriteContext,
        public readonly address: Address
    ) { }
    private readContract() {
        return getContract({
            address: this.address,
            abi: hippoxSwapV1OracleAbi,
            client: this.ctx.publicClient,
        });
    }
    private writeContract() {
        if (!this.ctx.walletClient) {
            throw new Error("HippoxSwapV1Oracle: wallet client required");
        }
        return getContract({
            address: this.address,
            abi: hippoxSwapV1OracleAbi,
            client: {
                public: this.ctx.publicClient,
                wallet: this.ctx.walletClient,
            },
        });
    }
    async pair(): Promise<Address> {
        return (await this.readContract().read.pair()) as Address;
    }
    async minElapsedTime(): Promise<bigint> {
        return BigInt(await this.readContract().read.MIN_ELAPSED_TIME());
    }
    async observationsLength(): Promise<bigint> {
        return (await this.readContract().read.observationsLength()) as bigint;
    }
    async consult(
        tokenIn: Address,
        amountIn: bigint,
        secondsAgo: number
    ): Promise<bigint> {
        return (await this.readContract().read.consult([
            tokenIn,
            amountIn,
            secondsAgo,
        ])) as bigint;
    }
    async currentCumulatives(): Promise<{
        price0Cumulative: bigint;
        price1Cumulative: bigint;
        timestamp: bigint;
    }> {
        const result = await this.readContract().read.currentCumulatives();
        return {
            price0Cumulative: BigInt(result[0]),
            price1Cumulative: BigInt(result[1]),
            timestamp: BigInt(result[2]),
        };
    }
    async update(): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        return (await this.writeContract().write.update({
            account: wallet.account!,
            chain: wallet.chain,
        })) as Hash;
    }
}