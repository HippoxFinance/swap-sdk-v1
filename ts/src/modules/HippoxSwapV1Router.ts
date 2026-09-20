// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Router module. Read-only helpers for HippoxSwapRouterV1 plus write helpers
 * for liquidity and swaps. Write methods require a wallet client.
 */
import {
    getContract,
    type Address,
    type Hash,
} from "viem";
import { hippoxSwapV1RouterAbi } from "../abis/router";
import { hippoxSwapV1Erc20Abi } from "../abis/erc20";
import type {
    HippoxSwapV1AddLiquidityETHParams,
    HippoxSwapV1AddLiquidityParams,
    HippoxSwapV1RemoveLiquidityETHParams,
    HippoxSwapV1RemoveLiquidityParams,
    HippoxSwapV1SwapExactETHForTokensParams,
    HippoxSwapV1SwapExactTokensForETHParams,
    HippoxSwapV1SwapExactTokensParams,
    HippoxSwapV1SwapTokensForExactParams,
    HippoxSwapV1WriteContext,
} from "../types";
export class HippoxSwapV1Router {
    constructor(private readonly ctx: HippoxSwapV1WriteContext) { }
    private readContract() {
        return getContract({
            address: this.ctx.router,
            abi: hippoxSwapV1RouterAbi,
            client: this.ctx.publicClient,
        });
    }
    private writeContract() {
        if (!this.ctx.walletClient) {
            throw new Error("HippoxSwapV1Router: wallet client required");
        }
        return getContract({
            address: this.ctx.router,
            abi: hippoxSwapV1RouterAbi,
            client: {
                public: this.ctx.publicClient,
                wallet: this.ctx.walletClient,
            },
        });
    }
    /**
     * Ensures the router has at least `amount` allowance from `owner`.
     * Approves directly if needed.
     */
    private async _ensureAllowance(
        owner: Address,
        token: Address,
        amount: bigint
    ): Promise<void> {
        const wallet = this.ctx.walletClient!;
        const erc20 = getContract({
            address: token,
            abi: hippoxSwapV1Erc20Abi,
            client: {
                public: this.ctx.publicClient,
                wallet,
            },
        });
        const current = (await erc20.read.allowance([
            owner,
            this.ctx.router,
        ])) as bigint;
        if (current >= amount) return;
        const tx = await erc20.write.approve([this.ctx.router, amount], {
            account: wallet.account!,
            chain: wallet.chain,
        });
        await this.ctx.publicClient.waitForTransactionReceipt({ hash: tx });
    }
    // Reads
    async factory(): Promise<Address> {
        return (await this.readContract().read.factory()) as Address;
    }
    async weth(): Promise<Address> {
        return (await this.readContract().read.WETH()) as Address;
    }
    async quote(amountIn: bigint, path: Address[]): Promise<bigint[]> {
        return (await this.readContract().read.quote([
            amountIn,
            path,
        ])) as bigint[];
    }
    async quoteBatch(
        amountsIn: bigint[],
        paths: Address[][]
    ): Promise<bigint[][]> {
        return (await this.readContract().read.quoteBatch([
            amountsIn,
            paths,
        ])) as bigint[][];
    }
    // Liquidity writes
    async addLiquidity(params: HippoxSwapV1AddLiquidityParams): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const owner = wallet.account!.address as Address;
        await this._ensureAllowance(owner, params.tokenA, params.amountADesired);
        await this._ensureAllowance(owner, params.tokenB, params.amountBDesired);
        const contract = this.writeContract();
        return (await contract.write.addLiquidity(
            [
                params.tokenA,
                params.tokenB,
                params.amountADesired,
                params.amountBDesired,
                params.amountAMin,
                params.amountBMin,
                params.to,
                params.deadline,
            ],
            { account: wallet.account!, chain: wallet.chain }
        )) as Hash;
    }
    async addLiquidityWithHook(
        params: HippoxSwapV1AddLiquidityParams
    ): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const owner = wallet.account!.address as Address;
        if (!params.hook) {
            throw new Error("HippoxSwapV1Router: hook required");
        }
        await this._ensureAllowance(owner, params.tokenA, params.amountADesired);
        await this._ensureAllowance(owner, params.tokenB, params.amountBDesired);
        const contract = this.writeContract();
        return (await contract.write.addLiquidityWithHook(
            [
                params.tokenA,
                params.tokenB,
                params.amountADesired,
                params.amountBDesired,
                params.amountAMin,
                params.amountBMin,
                params.to,
                params.deadline,
                params.hook,
            ],
            { account: wallet.account!, chain: wallet.chain }
        )) as Hash;
    }
    async removeLiquidity(
        params: HippoxSwapV1RemoveLiquidityParams
    ): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const owner = wallet.account!.address as Address;
        const pairAddress = await this._pairFor(params.tokenA, params.tokenB);
        await this._ensureAllowance(owner, pairAddress, params.liquidity);
        const contract = this.writeContract();
        return (await contract.write.removeLiquidity(
            [
                params.tokenA,
                params.tokenB,
                params.liquidity,
                params.amountAMin,
                params.amountBMin,
                params.to,
                params.deadline,
            ],
            { account: wallet.account!, chain: wallet.chain }
        )) as Hash;
    }
    async addLiquidityETH(
        params: HippoxSwapV1AddLiquidityETHParams
    ): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const owner = wallet.account!.address as Address;
        await this._ensureAllowance(
            owner,
            params.token,
            params.amountTokenDesired
        );
        const contract = this.writeContract();
        return (await contract.write.addLiquidityETH(
            [
                params.token,
                params.amountTokenDesired,
                params.amountTokenMin,
                params.amountETHMin,
                params.to,
                params.deadline,
            ],
            {
                account: wallet.account!,
                chain: wallet.chain,
                value: params.value,
            }
        )) as Hash;
    }
    async addLiquidityETHWithHook(
        params: HippoxSwapV1AddLiquidityETHParams
    ): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const owner = wallet.account!.address as Address;
        if (!params.hook) {
            throw new Error("HippoxSwapV1Router: hook required");
        }
        await this._ensureAllowance(
            owner,
            params.token,
            params.amountTokenDesired
        );
        const contract = this.writeContract();
        return (await contract.write.addLiquidityETHWithHook(
            [
                params.token,
                params.amountTokenDesired,
                params.amountTokenMin,
                params.amountETHMin,
                params.to,
                params.deadline,
                params.hook,
            ],
            {
                account: wallet.account!,
                chain: wallet.chain,
                value: params.value,
            }
        )) as Hash;
    }
    async removeLiquidityETH(
        params: HippoxSwapV1RemoveLiquidityETHParams
    ): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const owner = wallet.account!.address as Address;
        const pairAddress = await this._pairFor(params.token, this.ctx.weth);
        await this._ensureAllowance(owner, pairAddress, params.liquidity);
        const contract = this.writeContract();
        return (await contract.write.removeLiquidityETH(
            [
                params.token,
                params.liquidity,
                params.amountTokenMin,
                params.amountETHMin,
                params.to,
                params.deadline,
            ],
            { account: wallet.account!, chain: wallet.chain }
        )) as Hash;
    }
    // Swap writes
    async swapExactTokensForTokens(
        params: HippoxSwapV1SwapExactTokensParams
    ): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const owner = wallet.account!.address as Address;
        await this._ensureAllowance(owner, params.path[0], params.amountIn);
        const contract = this.writeContract();
        return (await contract.write.swapExactTokensForTokens(
            [
                params.amountIn,
                params.amountOutMin,
                params.path,
                params.to,
                params.deadline,
            ],
            { account: wallet.account!, chain: wallet.chain }
        )) as Hash;
    }
    async swapTokensForExactTokens(
        params: HippoxSwapV1SwapTokensForExactParams
    ): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const owner = wallet.account!.address as Address;
        await this._ensureAllowance(owner, params.path[0], params.amountInMax);
        const contract = this.writeContract();
        return (await contract.write.swapTokensForExactTokens(
            [
                params.amountOut,
                params.amountInMax,
                params.path,
                params.to,
                params.deadline,
            ],
            { account: wallet.account!, chain: wallet.chain }
        )) as Hash;
    }
    async swapExactETHForTokens(
        params: HippoxSwapV1SwapExactETHForTokensParams
    ): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const contract = this.writeContract();
        return (await contract.write.swapExactETHForTokens(
            [params.amountOutMin, params.path, params.to, params.deadline],
            {
                account: wallet.account!,
                chain: wallet.chain,
                value: params.value,
            }
        )) as Hash;
    }
    async swapExactTokensForETH(
        params: HippoxSwapV1SwapExactTokensForETHParams
    ): Promise<Hash> {
        const wallet = this.ctx.walletClient!;
        const owner = wallet.account!.address as Address;
        await this._ensureAllowance(owner, params.path[0], params.amountIn);
        const contract = this.writeContract();
        return (await contract.write.swapExactTokensForETH(
            [
                params.amountIn,
                params.amountOutMin,
                params.path,
                params.to,
                params.deadline,
            ],
            { account: wallet.account!, chain: wallet.chain }
        )) as Hash;
    }
    // Internal helpers
    private async _pairFor(tokenA: Address, tokenB: Address): Promise<Address> {
        const factoryContract = getContract({
            address: this.ctx.factory,
            abi: [
                {
                    type: "function",
                    name: "getPair",
                    stateMutability: "view",
                    inputs: [{ type: "address" }, { type: "address" }],
                    outputs: [{ type: "address" }],
                },
            ] as const,
            client: this.ctx.publicClient,
        });
        return (await factoryContract.read.getPair([tokenA, tokenB])) as Address;
    }
}