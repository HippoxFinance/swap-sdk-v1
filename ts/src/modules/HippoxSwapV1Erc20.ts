// SPDX-License-Identifier: AGPL-3.0-only
/**
 * ERC20 module. Read and write helpers for a specific token.
 */
import { getContract, maxUint256, type Address, type Hash } from "viem";
import { hippoxSwapV1Erc20Abi } from "../abis/erc20";
import type { HippoxSwapV1WriteContext } from "../types";
export class HippoxSwapV1Erc20 {
    constructor(
        private readonly ctx: HippoxSwapV1WriteContext,
        public readonly address: Address
    ) { }
    private readContract() {
        return getContract({
            address: this.address,
            abi: hippoxSwapV1Erc20Abi,
            client: this.ctx.publicClient,
        });
    }
    private writeContract() {
        if (!this.ctx.walletClient) {
            throw new Error("HippoxSwapV1Erc20: wallet client required");
        }
        return getContract({
            address: this.address,
            abi: hippoxSwapV1Erc20Abi,
            client: {
                public: this.ctx.publicClient,
                wallet: this.ctx.walletClient,
            },
        });
    }
    async name(): Promise<string> {
        return (await this.readContract().read.name()) as string;
    }
    async symbol(): Promise<string> {
        return (await this.readContract().read.symbol()) as string;
    }
    async decimals(): Promise<number> {
        return Number(await this.readContract().read.decimals());
    }
    async totalSupply(): Promise<bigint> {
        return (await this.readContract().read.totalSupply()) as bigint;
    }
    async balanceOf(owner: Address): Promise<bigint> {
        return (await this.readContract().read.balanceOf([owner])) as bigint;
    }
    async allowance(owner: Address, spender: Address): Promise<bigint> {
        return (await this.readContract().read.allowance([
            owner,
            spender,
        ])) as bigint;
    }
    /**
     * Approves the spender. Uses MaxUint256 when `infinite` is true.
     */
    async approve(
        spender: Address,
        amount?: bigint,
        infinite = false
    ): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const approveAmount = infinite ? maxUint256 : amount ?? 0n;
        return (await this.writeContract().write.approve(
            [spender, approveAmount],
            { account: wallet.account!, chain: wallet.chain }
        )) as Hash;
    }
    async transfer(to: Address, amount: bigint): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        return (await this.writeContract().write.transfer([to, amount], {
            account: wallet.account!,
            chain: wallet.chain,
        })) as Hash;
    }
}