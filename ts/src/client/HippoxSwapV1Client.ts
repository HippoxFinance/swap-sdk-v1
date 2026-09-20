// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Main SDK client for HippoxSwap V1.
 */
import {
    createPublicClient,
    createWalletClient,
    custom,
    http,
    type Address,
    type PublicClient,
    type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HippoxSwapV1Factory } from "../modules/HippoxSwapV1Factory";
import { HippoxSwapV1Pair } from "../modules/HippoxSwapV1Pair";
import { HippoxSwapV1Router } from "../modules/HippoxSwapV1Router";
import { HippoxSwapV1Oracle } from "../modules/HippoxSwapV1Oracle";
import { HippoxSwapV1Erc20 } from "../modules/HippoxSwapV1Erc20";
import { HippoxSwapV1Events } from "../modules/HippoxSwapV1Events";
import type {
    HippoxSwapV1Config,
    HippoxSwapV1ReadContext,
    HippoxSwapV1WriteContext,
} from "../types";
export class HippoxSwapV1Client {
    public readonly publicClient: PublicClient;
    public readonly walletClient?: WalletClient;
    public readonly factory: HippoxSwapV1Factory;
    public readonly router: HippoxSwapV1Router;
    private readonly readCtx: HippoxSwapV1ReadContext;
    private readonly writeCtx: HippoxSwapV1WriteContext;
    constructor(config: HippoxSwapV1Config) {
        this.publicClient = createPublicClient({
            chain: config.chain,
            transport: config.transport ?? http(),
        });
        if (config.mode === "privateKey") {
            const account = privateKeyToAccount(config.privateKey);
            this.walletClient = createWalletClient({
                account,
                chain: config.chain,
                transport: config.transport ?? http(),
            });
        } else if (config.mode === "browserWallet") {
            const provider = config.ethereum as Parameters<typeof custom>[0];
            this.walletClient = createWalletClient({
                chain: config.chain,
                transport: custom(provider),
            });
        }
        this.readCtx = {
            publicClient: this.publicClient,
            factory: config.factory,
            router: config.router,
            weth: config.weth,
            oracle: config.oracle,
        };
        this.writeCtx = {
            ...this.readCtx,
            walletClient: this.walletClient,
        };
        this.factory = new HippoxSwapV1Factory(this.readCtx);
        this.router = new HippoxSwapV1Router(this.writeCtx);
    }
    pair(pairAddress: Address): HippoxSwapV1Pair {
        return new HippoxSwapV1Pair(this.writeCtx, pairAddress);
    }
    oracle(oracleAddress?: Address): HippoxSwapV1Oracle {
        const address = oracleAddress ?? this.readCtx.oracle;
        if (!address) {
            throw new Error("HippoxSwapV1Client: no oracle address configured");
        }
        return new HippoxSwapV1Oracle(this.writeCtx, address);
    }
    erc20(tokenAddress: Address): HippoxSwapV1Erc20 {
        return new HippoxSwapV1Erc20(this.writeCtx, tokenAddress);
    }
    events(pairAddress: Address): HippoxSwapV1Events {
        return new HippoxSwapV1Events(this.readCtx, pairAddress);
    }
    get account(): Address | null {
        const account = this.walletClient?.account;
        if (!account) return null;
        return typeof account === "string" ? account : account.address;
    }
}