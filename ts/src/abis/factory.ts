// SPDX-License-Identifier: AGPL-3.0-only
/**
 * ABI for HippoxSwapFactoryV1.
 */
export const hippoxSwapV1FactoryAbi = [
    {
        type: "function",
        name: "owner",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "address" }],
    },
    {
        type: "function",
        name: "feeTo",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "address" }],
    },
    {
        type: "function",
        name: "protocolFeeNumerator",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
    {
        type: "function",
        name: "protocolFeeNumeratorPercen",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
    {
        type: "function",
        name: "getPair",
        stateMutability: "view",
        inputs: [
            { type: "address" },
            { type: "address" },
        ],
        outputs: [{ type: "address" }],
    },
    {
        type: "function",
        name: "allPairs",
        stateMutability: "view",
        inputs: [{ type: "uint256" }],
        outputs: [{ type: "address" }],
    },
    {
        type: "function",
        name: "allPairsLength",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
    {
        type: "function",
        name: "getPairsPaginated",
        stateMutability: "view",
        inputs: [
            { type: "uint256" },
            { type: "uint256" },
        ],
        outputs: [{ type: "address[]" }],
    },
    {
        type: "function",
        name: "getPairInfo",
        stateMutability: "view",
        inputs: [
            { type: "address" },
            { type: "address" },
        ],
        outputs: [
            { type: "address" },
            { type: "bytes" },
        ],
    },
    {
        type: "function",
        name: "createPair",
        stateMutability: "nonpayable",
        inputs: [
            { type: "address" },
            { type: "address" },
            { type: "address" },
        ],
        outputs: [{ type: "address" }],
    },
    {
        type: "function",
        name: "createPairWithHook",
        stateMutability: "nonpayable",
        inputs: [
            { type: "address" },
            { type: "address" },
            { type: "address" },
            { type: "address" },
        ],
        outputs: [{ type: "address" }],
    },
] as const;