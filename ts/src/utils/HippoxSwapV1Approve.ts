// SPDX-License-Identifier: AGPL-3.0-only
/**
 * ERC20 approval helper. Ensures the spender has enough allowance and, if not,
 * sends an approve transaction with the requested amount.
 */
import {
    getContract,
    maxUint256,
    type Address,
    type Hash,
    type WalletClient,
    type PublicClient,
} from "viem";
import { hippoxSwapV1Erc20Abi } from "../abis/erc20";
export class HippoxSwapV1Approve {
    /**
     * Returns the current allowance for owner -> spender.
     */
    static async getAllowance(
        publicClient: PublicClient,
        token: Address,
        owner: Address,
        spender: Address
    ): Promise<bigint> {
        const contract = getContract({
            address: token,
            abi: hippoxSwapV1Erc20Abi,
            client: publicClient,
        });
        return (await contract.read.allowance([owner, spender])) as bigint;
    }
    /**
     * Ensures the spender has at least `amount` allowance. If not, sends an
     * approve transaction with `amount` (or MaxUint256 if `infinite` is true).
     * Returns the approve transaction hash if one was sent, otherwise null.
     */
    static async ensureAllowance(
        publicClient: PublicClient,
        walletClient: WalletClient,
        token: Address,
        owner: Address,
        spender: Address,
        amount: bigint,
        infinite = false
    ): Promise<Hash | null> {
        const current = await HippoxSwapV1Approve.getAllowance(
            publicClient,
            token,
            owner,
            spender
        );
        if (current >= amount) return null;
        const contract = getContract({
            address: token,
            abi: hippoxSwapV1Erc20Abi,
            client: { public: publicClient, wallet: walletClient },
        });
        const approveAmount = infinite ? maxUint256 : amount;
        const hash = (await contract.write.approve([spender, approveAmount], {
            account: walletClient.account!,
            chain: walletClient.chain,
        })) as Hash;
        return hash;
    }
}