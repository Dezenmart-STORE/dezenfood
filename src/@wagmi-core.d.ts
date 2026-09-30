declare module "@wagmi/core" {
  export function readContract(config: any, parameters: any): Promise<any>;
  export function simulateContract(config: any, parameters: any): Promise<any>;
  export function waitForTransactionReceipt(
    config: any,
    parameters: any
  ): Promise<any>;
  export function writeContract(config: any, parameters: any): Promise<any>;
  /** Returns the chain ID the connector is currently on (reads live state, not React). */
  export function getChainId(config: any): number;
}
