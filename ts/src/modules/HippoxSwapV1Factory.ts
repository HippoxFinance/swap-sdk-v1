// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Factory module. Read-only helpers for HippoxSwapFactoryV1.
 */
import { getContract, type Address } from "viem";
import { hippoxSwapV1FactoryAbi } from "../abis/factory";
import { hippoxSwapV1PairAbi } from "../abis/pair";
import type { HippoxSwapV1PairInfo, HippoxSwapV1ReadContext } from "../types";
export class HippoxSwapV1Factory {
    constructor(private readonly ctx: HippoxSwapV1ReadContext) { }
    private contract() {
        return getContract({
            address: this.ctx.factory,
            abi: hippoxSwapV1FactoryAbi,
            client: this.ctx.publicClient,
        });
    }
    async getPair(tokenA: Address, tokenB: Address): Promise<Address> {
        return (await this.contract().read.getPair([tokenA, tokenB])) as Address;
    }
    async allPairsLength(): Promise<bigint> {
        return (await this.contract().read.allPairsLength()) as bigint;
    }
    async allPairs(index: bigint): Promise<Address> {
        return (await this.contract().read.allPairs([index])) as Address;
    }
    async getPairsPaginated(offset: bigint, limit: bigint): Promise<Address[]> {
        return (await this.contract().read.getPairsPaginated([
            offset,
            limit,
        ])) as Address[];
    }
    async owner(): Promise<Address> {
        return (await this.contract().read.owner()) as Address;
    }
    async feeTo(): Promise<Address> {
        return (await this.contract().read.feeTo()) as Address;
    }
    async protocolFeeNumerator(): Promise<bigint> {
        return (await this.contract().read.protocolFeeNumerator()) as bigint;
    }
    async protocolFeeNumeratorPercen(): Promise<bigint> {
        return (await this.contract().read.protocolFeeNumeratorPercen()) as bigint;
    }
    async getPairInfo(
        tokenA: Address,
        tokenB: Address
    ): Promise<HippoxSwapV1PairInfo | null> {
        const pair = await this.getPair(tokenA, tokenB);
        if (pair === "0x0000000000000000000000000000000000000000") return null;
        const pairContract = getContract({
            address: pair,
            abi: hippoxSwapV1PairAbi,
            client: this.ctx.publicClient,
        });
        const info = await pairContract.read.getPairInfo();
        return {
            token0: info.token0 as Address,
            token1: info.token1 as Address,
            reserve0: BigInt(info.reserve0),
            reserve1: BigInt(info.reserve1),
            feeNumerator: BigInt(info.feeNumerator),
            feeDenominator: BigInt(info.feeDenominator),
            maxFeeNumerator: BigInt(info.maxFeeNumerator),
            taxBps: BigInt(info.taxBps),
            maxTaxBps: BigInt(info.maxTaxBps),
            bpsDenominator: BigInt(info.bpsDenominator),
            taxRecipient: info.taxRecipient as Address,
            totalSupply: BigInt(info.totalSupply),
            creator: info.creator as Address,
            admin: info.admin as Address,
            minimumLiquidity: BigInt(info.minimumLiquidity),
            hook: info.hook as Address,
            protocolFeeNumerator: BigInt(info.protocolFeeNumerator),
            feeTo: info.feeTo as Address,
        };
    }
}