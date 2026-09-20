// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Minimal ERC20 ABI.
 */
export const hippoxSwapV1Erc20Abi = [
    { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
    { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
    { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
    { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{ type: "address" }],
        outputs: [{ type: "uint256" }],
    },
    {
        type: "function",
        name: "allowance",
        stateMutability: "view",
        inputs: [{ type: "address" }, { type: "address" }],
        outputs: [{ type: "uint256" }],
    },
    {
        type: "function",
        name: "approve",
        stateMutability: "nonpayable",
        inputs: [{ type: "address" }, { type: "uint256" }],
        outputs: [{ type: "bool" }],
    },
    {
        type: "function",
        name: "transfer",
        stateMutability: "nonpayable",
        inputs: [{ type: "address" }, { type: "uint256" }],
        outputs: [{ type: "bool" }],
    },
] as const;