// SPDX-License-Identifier: AGPL-3.0-only
/**
 * ABI for HippoxOracleV1.
 */
export const hippoxSwapV1OracleAbi = [
    { type: "function", name: "pair", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
    { type: "function", name: "MIN_ELAPSED_TIME", stateMutability: "view", inputs: [], outputs: [{ type: "uint40" }] },
    { type: "function", name: "observationsLength", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    { type: "function", name: "update", stateMutability: "nonpayable", inputs: [], outputs: [] },
    {
        type: "function",
        name: "consult",
        stateMutability: "view",
        inputs: [
            { type: "address" },
            { type: "uint256" },
            { type: "uint40" },
        ],
        outputs: [{ type: "uint256" }],
    },
    {
        type: "function",
        name: "currentCumulatives",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }, { type: "uint256" }, { type: "uint40" }],
    },
] as const;