// SPDX-License-Identifier: AGPL-3.0-only
/**
 * WETH ABI. Includes deposit / withdraw on top of ERC20.
 */
import { hippoxSwapV1Erc20Abi } from "./erc20";
export const hippoxSwapV1WethAbi = [
    ...hippoxSwapV1Erc20Abi,
    { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
    {
        type: "function",
        name: "withdraw",
        stateMutability: "nonpayable",
        inputs: [{ type: "uint256" }],
        outputs: [],
    },
] as const;