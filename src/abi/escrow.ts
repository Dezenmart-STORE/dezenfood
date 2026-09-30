import { type Abi } from "viem";
import { getEscrowAddress } from "../config/chains";
import abiJson from "./dezenmartAbi.json";

export const ESCROW_ABI = abiJson as Abi;

/** Returns a typed contract config wagmi hooks can consume directly */
export function getEscrowContract(chainId: number) {
  return {
    address: getEscrowAddress(chainId) as `0x${string}`,
    abi: ESCROW_ABI,
    chainId,
  } as const;
}

// ERC20 minimal ABI for approve / allowance / balanceOf
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
