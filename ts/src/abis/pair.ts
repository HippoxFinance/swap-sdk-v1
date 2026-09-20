// SPDX-License-Identifier: AGPL-3.0-only
/**
 * ABI for HippoxSwapPairV1.
 */

export const hippoxSwapV1PairAbi = [
    { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "factory", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "hook", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    {
        type: "function",
        name: "setHook",
        stateMutability: "nonpayable",
        inputs: [{ type: "address" }],
        outputs: [],
    },
    {
        type: "function",
        name: "getReserves",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint112" }, { type: "uint112" }],
    },
    {
        type: "function",
        name: "getPairInfo",
        stateMutability: "view",
        inputs: [],
        outputs: [
            {
                type: "tuple",
                components: [
                    { name: "token0", type: "address" },
                    { name: "token1", type: "address" },
                    { name: "reserve0", type: "uint112" },
                    { name: "reserve1", type: "uint112" },
                    { name: "feeNumerator", type: "uint256" },
                    { name: "feeDenominator", type: "uint256" },
                    { name: "maxFeeNumerator", type: "uint256" },
                    { name: "taxBps", type: "uint256" },
                    { name: "maxTaxBps", type: "uint256" },
                    { name: "bpsDenominator", type: "uint256" },
                    { name: "taxRecipient", type: "address" },
                    { name: "totalSupply", type: "uint256" },
                    { name: "creator", type: "address" },
                    { name: "admin", type: "address" },
                    { name: "minimumLiquidity", type: "uint256" },
                    { name: "hook", type: "address" },
                    { name: "protocolFeeNumerator", type: "uint256" },
                    { name: "feeTo", type: "address" },
                ],
            },
        ],
    },
    {
        type: "function",
        name: "getAmountOut",
        stateMutability: "view",
        inputs: [{ type: "uint256" }, { type: "address" }],
        outputs: [{ type: "uint256" }],
    },
    {
        type: "function",
        name: "getCumulativePrices",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }, { type: "uint256" }, { type: "uint40" }],
    },
    { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
    {
        type: "function",
        name: "burn",
        stateMutability: "nonpayable",
        inputs: [{ type: "address" }],
        outputs: [{ type: "uint256" }, { type: "uint256" }],
    },
    {
        type: "function",
        name: "swap",
        stateMutability: "nonpayable",
        inputs: [{ type: "uint256" }, { type: "uint256" }, { type: "address" }],
        outputs: [],
    },
    {
        type: "event",
        name: "Mint",
        inputs: [
            { indexed: true, name: "sender", type: "address" },
            { indexed: false, name: "amount0", type: "uint256" },
            { indexed: false, name: "amount1", type: "uint256" },
        ],
    },
    {
        type: "event",
        name: "Burn",
        inputs: [
            { indexed: true, name: "sender", type: "address" },
            { indexed: false, name: "amount0", type: "uint256" },
            { indexed: false, name: "amount1", type: "uint256" },
            { indexed: true, name: "to", type: "address" },
        ],
    },
    {
        type: "event",
        name: "Swap",
        inputs: [
            { indexed: true, name: "sender", type: "address" },
            { indexed: false, name: "amount0In", type: "uint256" },
            { indexed: false, name: "amount1In", type: "uint256" },
            { indexed: false, name: "amount0Out", type: "uint256" },
            { indexed: false, name: "amount1Out", type: "uint256" },
            { indexed: true, name: "to", type: "address" },
        ],
    },
    {
        type: "event",
        name: "Sync",
        inputs: [
            { indexed: false, name: "reserve0", type: "uint112" },
            { indexed: false, name: "reserve1", type: "uint112" },
        ],
    },
] as const;