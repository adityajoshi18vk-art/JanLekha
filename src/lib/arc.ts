export const ARC_TESTNET = {
  name: "Arc Testnet",
  chainId: 5042002,
  chainIdHex: "0x4CF6AA",
  rpc: "https://rpc.testnet.arc.io",
  explorer: "https://explorer.testnet.arc.io",
  currency: "USDC",
  currencyDecimals: 18,
};
export const ARC_MAINNET = {
  name: "Arc Mainnet",
  chainId: 5042,
  rpc: "https://rpc.mainnet.arc.io",
  explorer: "https://explorer.arc.io",
  currency: "USDC",
  currencyDecimals: 18,
};
export function explorerTxUrl(hash: string): string {
  return ARC_TESTNET.explorer + "/tx/" + hash;
}
export function explorerAddressUrl(addr: string): string {
  return ARC_TESTNET.explorer + "/address/" + addr;
}
export function usdcToBaseUnits(usdc: number): bigint {
  return BigInt(Math.round(usdc * 1_000_000));
}
export function baseUnitsToUsdc(units: bigint): number {
  return Number(units) / 1_000_000;
}
export interface WalletState { address: string | null; chainId: number | null; connected: boolean; error?: string }
export async function connectWallet(): Promise<WalletState> {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) return { address: null, chainId: null, connected: false, error: "No wallet found. Install a MetaMask compatible wallet to connect." };
  try {
    const { BrowserProvider } = await import("ethers");
    const provider = new BrowserProvider(eth as never);
    const accounts = await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();
    return { address: accounts[0] ?? null, chainId: Number(network.chainId), connected: true };
  } catch (e) {
    return { address: null, chainId: null, connected: false, error: e instanceof Error ? e.message : "Wallet connection failed." };
  }
}
export async function switchToArcTestnet(): Promise<{ ok: boolean; error?: string }> {
  const eth = (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } }).ethereum;
  if (!eth) return { ok: false, error: "No wallet found." };
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_TESTNET.chainIdHex }] });
    return { ok: true };
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err.code === 4902) {
      try {
        await eth.request({ method: "wallet_addEthereumChain", params: [{ chainId: ARC_TESTNET.chainIdHex, chainName: ARC_TESTNET.name, rpcUrls: [ARC_TESTNET.rpc], blockExplorerUrls: [ARC_TESTNET.explorer], nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 } }] });
        return { ok: true };
      } catch (e2) { return { ok: false, error: e2 instanceof Error ? e2.message : "Could not add Arc Testnet." }; }
    }
    return { ok: false, error: e instanceof Error ? e.message : "Could not switch network." };
  }
}
export function simulateArcPayment(amountUsdc: number): { ref: string; explorerUrl: string; note: string } {
  const ref = "SIM-ARC-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 9000 + 1000);
  return { ref, explorerUrl: ARC_TESTNET.explorer, note: "Simulated USDC settlement demonstration on Arc Testnet. This is not a real on chain transaction and " + ref + " is a demo reference, not a transaction hash. Amount " + amountUsdc.toFixed(2) + " USDC (ERC-20, 6 decimals) is shown separately from INR budget records." };
}

// --- JanLekha registry contract addresses (Arc Testnet) ---
// Set these in the frontend .env after running contracts/script/Deploy.s.sol.
// All are empty by default, which means the app runs in SIMULATED demo mode
// and src/lib/contracts.ts never fakes a transaction hash.
export const CONTRACT_ADDRESSES = {
  roleRegistry: (import.meta.env.VITE_ARC_ROLE_REGISTRY_ADDRESS as string | undefined) ?? "",
  budgetRegistry: (import.meta.env.VITE_ARC_BUDGET_REGISTRY_ADDRESS as string | undefined) ?? "",
  projectRegistry: (import.meta.env.VITE_ARC_PROJECT_REGISTRY_ADDRESS as string | undefined) ?? "",
  procurementRegistry: (import.meta.env.VITE_ARC_PROCUREMENT_REGISTRY_ADDRESS as string | undefined) ?? "",
  milestoneRegistry: (import.meta.env.VITE_ARC_MILESTONE_REGISTRY_ADDRESS as string | undefined) ?? "",
  paymentRegistry: (import.meta.env.VITE_ARC_PAYMENT_REGISTRY_ADDRESS as string | undefined) ?? "",
  documentRegistry: (import.meta.env.VITE_ARC_DOCUMENT_REGISTRY_ADDRESS as string | undefined) ?? "",
  auditRegistry: (import.meta.env.VITE_ARC_AUDIT_REGISTRY_ADDRESS as string | undefined) ?? "",
} as const;
export type RegistryName = keyof typeof CONTRACT_ADDRESSES;
/// @notice True only when every registry address is configured, meaning the
/// contracts are deployed and the frontend can write to Arc Testnet.
export function areContractsDeployed(): boolean {
  return Object.values(CONTRACT_ADDRESSES).every((addr) => addr !== "");
}
/// @notice Names of the registries that have an address configured.
export function deployedContracts(): RegistryName[] {
  return (Object.keys(CONTRACT_ADDRESSES) as RegistryName[]).filter(
    (name) => CONTRACT_ADDRESSES[name] !== ""
  );
}
