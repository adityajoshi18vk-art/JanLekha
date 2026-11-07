// Contract interaction service for JanLekha 2.0 on Arc Testnet.
// Reads and writes the eight registries in contracts/src. When no contract
// is deployed yet, every write helper returns a clearly labelled SIMULATED
// result and never invents a transaction hash. All demo payment references
// are SIM-ARC simulated references, never real transaction hashes.
// INR budgets and USDC settlement are separate concepts. USDC settlement
// amounts are ERC-20 base units with 6 decimals, so 1 USDC is 1,000,000 base
// units. The native gas token on Arc is also USDC, but with 18 decimals.
import { BrowserProvider, Contract, Interface, JsonRpcProvider, keccak256, toUtf8Bytes } from "ethers";
import type { Log, TransactionReceipt } from "ethers";
import { ARC_TESTNET, CONTRACT_ADDRESSES, areContractsDeployed, deployedContracts, explorerAddressUrl, explorerTxUrl, simulateArcPayment } from "./arc";
import type { RegistryName } from "./arc";

export { areContractsDeployed, deployedContracts, CONTRACT_ADDRESSES };
export type { RegistryName };

export interface ContractCallResult {
  mode: ContractMode;
  txHash: string | null;
  simulatedRef: string | null;
  explorerUrl: string | null;
  note: string;
}

export interface ParsedContractEvent {
  contract: string;
  event: string;
  args: Record<string, string>;
}

export type ContractMode = "live" | "simulated";

/// @notice Convert a frontend string id such as "proj-1" to the bytes32 id used on chain.
export function idToBytes32(id: string): string {
  return keccak256(toUtf8Bytes(id));
}

/// @notice Convert a document or invoice hash to bytes32. A 32 byte hex string
/// is used as is, anything else is hashed with keccak256.
export function hashToBytes32(hash: string): string {
  if (/^0x[0-9a-fA-F]{64}$/.test(hash)) return hash.toLowerCase();
  return keccak256(toUtf8Bytes(hash));
}

/// @notice Convert whole USDC to ERC-20 base units (6 decimals). 1 USDC is 1,000,000.
export function usdcToBaseUnits(usdc: number): bigint {
  return BigInt(Math.round(usdc * 1_000_000));
}

export function baseUnitsToUsdc(units: bigint): number {
  return Number(units) / 1_000_000;
}

function simulatedResult(action: string): ContractCallResult {
  const sim = simulateArcPayment(0);
  return {
    mode: "simulated",
    txHash: null,
    simulatedRef: sim.ref,
    explorerUrl: null,
    note:
      "SIMULATED: " + action + " was not sent on chain because no JanLekha contract is deployed yet. " +
      "Reference " + sim.ref + " is a demo reference, not a transaction hash. " + sim.note,
  };
}

function liveResult(txHash: string, note: string): ContractCallResult {
  return { mode: "live", txHash, simulatedRef: null, explorerUrl: explorerTxUrl(txHash), note };
}

export function getReadProvider(): JsonRpcProvider {
  return new JsonRpcProvider(ARC_TESTNET.rpc, ARC_TESTNET.chainId);
}

async function getSigner(): Promise<{ provider: BrowserProvider; address: string }> {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) throw new Error("No wallet found. Install a MetaMask compatible wallet to connect.");
  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== ARC_TESTNET.chainId) {
    throw new Error("Wallet is on chain " + Number(network.chainId) + ". Switch to Arc Testnet (5042002) first.");
  }
  return { provider, address: await signer.getAddress() };
}

const ROLE_REGISTRY_ABI = [
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function hasAnyRole(address account) view returns (bool)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "function FINANCE_ROLE() view returns (bytes32)",
  "function PROCUREMENT_ROLE() view returns (bytes32)",
  "function CONTRACTOR_ROLE() view returns (bytes32)",
  "function AUDITOR_ROLE() view returns (bytes32)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed grantedBy)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed revokedBy)",
] as const;

const BUDGET_REGISTRY_ABI = [
  "function approveAllocation(bytes32 id, bytes32 departmentId, bytes32 projectId, uint256 amountInr, uint256 amountUsdcBaseUnits)",
  "function releaseAllocation(bytes32 id)",
  "function authorizedLimitUsdc(bytes32 projectId) view returns (uint256)",
  "function totalAllocatedUsdc(bytes32 projectId) view returns (uint256)",
  "function getAllocation(bytes32 id) view returns (tuple(bytes32 id, bytes32 departmentId, bytes32 projectId, uint256 amountInr, uint256 amountUsdcBaseUnits, address approvedBy, uint256 approvedAt, bool released))",
  "event AllocationApproved(bytes32 indexed id, bytes32 indexed departmentId, bytes32 indexed projectId, uint256 amountInr, uint256 amountUsdcBaseUnits, address approvedBy)",
  "event AllocationReleased(bytes32 indexed id, bytes32 indexed projectId, address releasedBy)",
] as const;

const PROJECT_REGISTRY_ABI = [
  "function registerProject(bytes32 id, string name, bytes32 departmentId, address contractor, uint256 budgetInr)",
  "function updateStatus(bytes32 id, uint8 status)",
  "function getProject(bytes32 id) view returns (tuple(bytes32 id, string name, bytes32 departmentId, address contractor, uint256 budgetInr, uint8 status, uint256 registeredAt))",
  "function projectExists(bytes32 id) view returns (bool)",
  "function projectCount() view returns (uint256)",
  "function projectIdAt(uint256 index) view returns (bytes32)",
  "event ProjectRegistered(bytes32 indexed id, bytes32 indexed departmentId, address indexed contractor, string name, uint256 budgetInr)",
  "event ProjectStatusUpdated(bytes32 indexed id, uint8 status, address updatedBy)",
] as const;

const PROCUREMENT_REGISTRY_ABI = [
  "function publishTender(bytes32 id, bytes32 projectId, string title, uint256 valueInr, uint256 deadline)",
  "function submitBid(bytes32 tenderId, uint256 amountInr)",
  "function selectBid(bytes32 tenderId, address contractor)",
  "function getTender(bytes32 tenderId) view returns (tuple(bytes32 id, bytes32 projectId, string title, uint256 valueInr, uint256 deadline, bool open, address awardedTo, uint256 awardedAmountInr, uint256 publishedAt))",
  "function getBids(bytes32 tenderId) view returns (tuple(address contractor, uint256 amountInr, uint256 submittedAt)[])",
  "event TenderPublished(bytes32 indexed id, bytes32 indexed projectId, string title, uint256 valueInr, uint256 deadline)",
  "event BidSubmitted(bytes32 indexed tenderId, address indexed contractor, uint256 amountInr)",
  "event BidSelected(bytes32 indexed tenderId, address indexed contractor, uint256 amountInr)",
] as const;

const MILESTONE_REGISTRY_ABI = [
  "function setPaymentRegistry(address registry)",
  "function submitMilestone(bytes32 id, bytes32 projectId, uint256 amountInr, uint256 amountUsdcBaseUnits, bytes32 evidenceHash)",
  "function verifyMilestone(bytes32 id)",
  "function rejectMilestone(bytes32 id)",
  "function markPaid(bytes32 id)",
  "function getMilestone(bytes32 id) view returns (tuple(bytes32 id, bytes32 projectId, address submitter, uint256 amountInr, uint256 amountUsdcBaseUnits, bytes32 evidenceHash, uint8 status, address verifiedBy, uint256 submittedAt, uint256 verifiedAt))",
  "function paymentRegistry() view returns (address)",
  "event MilestoneSubmitted(bytes32 indexed id, bytes32 indexed projectId, address indexed submitter, uint256 amountInr, uint256 amountUsdcBaseUnits, bytes32 evidenceHash)",
  "event MilestoneVerified(bytes32 indexed id, address indexed verifiedBy)",
  "event MilestonePaid(bytes32 indexed id, address indexed markedBy)",
  "event MilestoneRejected(bytes32 indexed id, address indexed rejectedBy)",
  "event PaymentRegistrySet(address indexed paymentRegistry)",
] as const;

const PAYMENT_REGISTRY_ABI = [
  "function usdcToBaseUnits(uint256 wholeUsdc) view returns (uint256)",
  "function recordPayment(bytes32 id, bytes32 projectId, bytes32 milestoneId, address payee, uint256 amountUsdcBaseUnits, bytes32 invoiceHash)",
  "function totalPaidUsdc(bytes32 projectId) view returns (uint256)",
  "function remainingLimitUsdc(bytes32 projectId) view returns (uint256)",
  "function invoiceUsed(bytes32 invoiceHash) view returns (bool)",
  "function getPayment(bytes32 id) view returns (tuple(bytes32 id, bytes32 projectId, bytes32 milestoneId, address payee, uint256 amountUsdcBaseUnits, bytes32 invoiceHash, address recordedBy, uint256 recordedAt))",
  "function USDC_DECIMALS() view returns (uint8)",
  "function USDC_BASE_UNIT() view returns (uint256)",
  "event PaymentRecorded(bytes32 indexed id, bytes32 indexed projectId, bytes32 indexed milestoneId, address payee, uint256 amountUsdcBaseUnits, bytes32 invoiceHash, address recordedBy)",
] as const;

const DOCUMENT_REGISTRY_ABI = [
  "function registerDocument(bytes32 id, bytes32 projectId, bytes32 contentHash, string docType)",
  "function verifyDocument(bytes32 id)",
  "function getDocument(bytes32 id) view returns (tuple(bytes32 id, bytes32 projectId, bytes32 contentHash, string docType, address uploadedBy, uint256 uploadedAt, bool verified, address verifiedBy))",
  "function hashRegistered(bytes32 contentHash) view returns (bool)",
  "event DocumentRegistered(bytes32 indexed id, bytes32 indexed projectId, bytes32 indexed contentHash, string docType, address uploadedBy)",
  "event DocumentVerified(bytes32 indexed id, address indexed verifiedBy)",
] as const;

const AUDIT_REGISTRY_ABI = [
  "function raiseFlag(bytes32 id, bytes32 projectId, string reason, uint8 risk)",
  "function resolveFlag(bytes32 id, string resolutionNote)",
  "function publishReport(bytes32 id, bytes32 projectId, string title, uint256 findings)",
  "function getFlag(bytes32 id) view returns (tuple(bytes32 id, bytes32 projectId, string reason, uint8 risk, bool resolved, address raisedBy, address resolvedBy, uint256 raisedAt, uint256 resolvedAt, string resolutionNote))",
  "function getReport(bytes32 id) view returns (tuple(bytes32 id, bytes32 projectId, string title, uint256 findings, uint256 publishedAt, address auditor))",
  "event FlagRaised(bytes32 indexed id, bytes32 indexed projectId, string reason, uint8 risk, address raisedBy)",
  "event FlagResolved(bytes32 indexed id, address indexed resolvedBy, string resolutionNote)",
  "event ReportPublished(bytes32 indexed id, bytes32 indexed projectId, string title, uint256 findings, address auditor)",
] as const;

const ABIS: Record<RegistryName, readonly string[]> = {
  roleRegistry: ROLE_REGISTRY_ABI,
  budgetRegistry: BUDGET_REGISTRY_ABI,
  projectRegistry: PROJECT_REGISTRY_ABI,
  procurementRegistry: PROCUREMENT_REGISTRY_ABI,
  milestoneRegistry: MILESTONE_REGISTRY_ABI,
  paymentRegistry: PAYMENT_REGISTRY_ABI,
  documentRegistry: DOCUMENT_REGISTRY_ABI,
  auditRegistry: AUDIT_REGISTRY_ABI,
};

function readContract(name: RegistryName): Contract | null {
  const address = CONTRACT_ADDRESSES[name];
  if (!address) return null;
  return new Contract(address, ABIS[name], getReadProvider());
}

async function writeContract(name: RegistryName): Promise<Contract | null> {
  const address = CONTRACT_ADDRESSES[name];
  if (!address) return null;
  const { provider } = await getSigner();
  const signer = await provider.getSigner();
  return new Contract(address, ABIS[name], signer);
}

async function sendWrite(
  name: RegistryName,
  action: string,
  method: string,
  args: unknown[]
): Promise<ContractCallResult> {
  const contract = await writeContract(name);
  if (!contract) return simulatedResult(action);
  const tx = await (contract[method] as (...a: unknown[]) => Promise<{ hash: string; wait: () => Promise<TransactionReceipt> }>)(...args);
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error(action + " transaction failed on chain. Hash: " + tx.hash);
  return liveResult(tx.hash, action + " confirmed on Arc Testnet in block " + receipt.blockNumber + ".");
}

/// @notice Parse the logs of a receipt against every registry ABI and return
/// the decoded JanLekha events, so the UI can show what actually changed.
export function parseContractEvents(receipt: TransactionReceipt): ParsedContractEvent[] {
  const out: ParsedContractEvent[] = [];
  for (const [name, abi] of Object.entries(ABIS) as [RegistryName, readonly string[]][]) {
    const iface = new Interface(abi);
    for (const log of receipt.logs as Log[]) {
      try {
        const parsed = iface.parseLog(log);
        if (!parsed) continue;
        const args: Record<string, string> = {};
        for (const key of Object.keys(parsed.args)) {
          if (Number.isNaN(Number(key))) args[key] = String(parsed.args[key]);
        }
        out.push({ contract: name, event: parsed.name, args });
      } catch {
        // Log belongs to another contract, ignore it.
      }
    }
  }
  return out;
}

export function explorerUrlForAddress(address: string): string {
  return explorerAddressUrl(address);
}

// --- Read helpers. Each returns null when the contract is not deployed. ---

export interface MilestoneOnChain {
  id: string;
  projectId: string;
  submitter: string;
  amountInr: bigint;
  amountUsdcBaseUnits: bigint;
  evidenceHash: string;
  status: number;
  verifiedBy: string;
  submittedAt: bigint;
  verifiedAt: bigint;
}

export interface PaymentOnChain {
  id: string;
  projectId: string;
  milestoneId: string;
  payee: string;
  amountUsdcBaseUnits: bigint;
  invoiceHash: string;
  recordedBy: string;
  recordedAt: bigint;
}

export interface ProjectOnChain {
  id: string;
  name: string;
  departmentId: string;
  contractor: string;
  budgetInr: bigint;
  status: number;
  registeredAt: bigint;
}

export interface DocumentOnChain {
  id: string;
  projectId: string;
  contentHash: string;
  docType: string;
  uploadedBy: string;
  uploadedAt: bigint;
  verified: boolean;
  verifiedBy: string;
}

export interface FlagOnChain {
  id: string;
  projectId: string;
  reason: string;
  risk: number;
  resolved: boolean;
  raisedBy: string;
  resolvedBy: string;
  raisedAt: bigint;
  resolvedAt: bigint;
  resolutionNote: string;
}

export async function hasRole(role: string, account: string): Promise<boolean | null> {
  const contract = readContract("roleRegistry");
  if (!contract) return null;
  return (await contract.hasRole(role, account)) as boolean;
}

export async function authorizedLimitUsdc(projectId: string): Promise<bigint | null> {
  const contract = readContract("budgetRegistry");
  if (!contract) return null;
  return (await contract.authorizedLimitUsdc(idToBytes32(projectId))) as bigint;
}

export async function remainingLimitUsdc(projectId: string): Promise<bigint | null> {
  const contract = readContract("paymentRegistry");
  if (!contract) return null;
  return (await contract.remainingLimitUsdc(idToBytes32(projectId))) as bigint;
}

export async function totalPaidUsdc(projectId: string): Promise<bigint | null> {
  const contract = readContract("paymentRegistry");
  if (!contract) return null;
  return (await contract.totalPaidUsdc(idToBytes32(projectId))) as bigint;
}

export async function invoiceUsed(invoiceHash: string): Promise<boolean | null> {
  const contract = readContract("paymentRegistry");
  if (!contract) return null;
  return (await contract.invoiceUsed(hashToBytes32(invoiceHash))) as boolean;
}

export async function getMilestone(milestoneId: string): Promise<MilestoneOnChain | null> {
  const contract = readContract("milestoneRegistry");
  if (!contract) return null;
  const m = (await contract.getMilestone(idToBytes32(milestoneId))) as unknown as Record<string, unknown>;
  if (!m || (m.submittedAt as bigint) === 0n) return null;
  return {
    id: m.id as string,
    projectId: m.projectId as string,
    submitter: m.submitter as string,
    amountInr: m.amountInr as bigint,
    amountUsdcBaseUnits: m.amountUsdcBaseUnits as bigint,
    evidenceHash: m.evidenceHash as string,
    status: m.status as number,
    verifiedBy: m.verifiedBy as string,
    submittedAt: m.submittedAt as bigint,
    verifiedAt: m.verifiedAt as bigint,
  };
}

export async function getPayment(paymentId: string): Promise<PaymentOnChain | null> {
  const contract = readContract("paymentRegistry");
  if (!contract) return null;
  const p = (await contract.getPayment(idToBytes32(paymentId))) as unknown as Record<string, unknown>;
  if (!p || (p.recordedAt as bigint) === 0n) return null;
  return {
    id: p.id as string,
    projectId: p.projectId as string,
    milestoneId: p.milestoneId as string,
    payee: p.payee as string,
    amountUsdcBaseUnits: p.amountUsdcBaseUnits as bigint,
    invoiceHash: p.invoiceHash as string,
    recordedBy: p.recordedBy as string,
    recordedAt: p.recordedAt as bigint,
  };
}

export async function getProject(projectId: string): Promise<ProjectOnChain | null> {
  const contract = readContract("projectRegistry");
  if (!contract) return null;
  const p = (await contract.getProject(idToBytes32(projectId))) as unknown as Record<string, unknown>;
  if (!p || (p.registeredAt as bigint) === 0n) return null;
  return {
    id: p.id as string,
    name: p.name as string,
    departmentId: p.departmentId as string,
    contractor: p.contractor as string,
    budgetInr: p.budgetInr as bigint,
    status: p.status as number,
    registeredAt: p.registeredAt as bigint,
  };
}

export async function getDocument(documentId: string): Promise<DocumentOnChain | null> {
  const contract = readContract("documentRegistry");
  if (!contract) return null;
  const d = (await contract.getDocument(idToBytes32(documentId))) as unknown as Record<string, unknown>;
  if (!d || (d.uploadedAt as bigint) === 0n) return null;
  return {
    id: d.id as string,
    projectId: d.projectId as string,
    contentHash: d.contentHash as string,
    docType: d.docType as string,
    uploadedBy: d.uploadedBy as string,
    uploadedAt: d.uploadedAt as bigint,
    verified: d.verified as boolean,
    verifiedBy: d.verifiedBy as string,
  };
}

export async function getFlag(flagId: string): Promise<FlagOnChain | null> {
  const contract = readContract("auditRegistry");
  if (!contract) return null;
  const f = (await contract.getFlag(idToBytes32(flagId))) as unknown as Record<string, unknown>;
  if (!f || (f.raisedAt as bigint) === 0n) return null;
  return {
    id: f.id as string,
    projectId: f.projectId as string,
    reason: f.reason as string,
    risk: f.risk as number,
    resolved: f.resolved as boolean,
    raisedBy: f.raisedBy as string,
    resolvedBy: f.resolvedBy as string,
    raisedAt: f.raisedAt as bigint,
    resolvedAt: f.resolvedAt as bigint,
    resolutionNote: f.resolutionNote as string,
  };
}

// --- Write helpers. Each needs a connected wallet on Arc Testnet, and each
// falls back to a labelled SIMULATED result when its contract is not deployed. ---

export async function approveAllocation(
  allocationId: string,
  departmentId: string,
  projectId: string,
  amountInr: number,
  amountUsdc: number
): Promise<ContractCallResult> {
  return sendWrite("budgetRegistry", "Allocation approval", "approveAllocation", [
    idToBytes32(allocationId),
    idToBytes32(departmentId),
    idToBytes32(projectId),
    BigInt(Math.round(amountInr)),
    usdcToBaseUnits(amountUsdc),
  ]);
}

export async function registerProject(
  projectId: string,
  name: string,
  departmentId: string,
  contractor: string,
  budgetInr: number
): Promise<ContractCallResult> {
  return sendWrite("projectRegistry", "Project registration", "registerProject", [
    idToBytes32(projectId),
    name,
    idToBytes32(departmentId),
    contractor,
    BigInt(Math.round(budgetInr)),
  ]);
}

export async function publishTender(
  tenderId: string,
  projectId: string,
  title: string,
  valueInr: number,
  deadlineUnix: number
): Promise<ContractCallResult> {
  return sendWrite("procurementRegistry", "Tender publication", "publishTender", [
    idToBytes32(tenderId),
    idToBytes32(projectId),
    title,
    BigInt(Math.round(valueInr)),
    BigInt(deadlineUnix),
  ]);
}

export async function submitBid(tenderId: string, amountInr: number): Promise<ContractCallResult> {
  return sendWrite("procurementRegistry", "Bid submission", "submitBid", [
    idToBytes32(tenderId),
    BigInt(Math.round(amountInr)),
  ]);
}

export async function selectBid(tenderId: string, contractor: string): Promise<ContractCallResult> {
  return sendWrite("procurementRegistry", "Bid selection", "selectBid", [
    idToBytes32(tenderId),
    contractor,
  ]);
}

export async function submitMilestone(
  milestoneId: string,
  projectId: string,
  amountInr: number,
  amountUsdc: number,
  evidenceHash: string
): Promise<ContractCallResult> {
  return sendWrite("milestoneRegistry", "Milestone submission", "submitMilestone", [
    idToBytes32(milestoneId),
    idToBytes32(projectId),
    BigInt(Math.round(amountInr)),
    usdcToBaseUnits(amountUsdc),
    hashToBytes32(evidenceHash),
  ]);
}

export async function verifyMilestone(milestoneId: string): Promise<ContractCallResult> {
  return sendWrite("milestoneRegistry", "Milestone verification", "verifyMilestone", [
    idToBytes32(milestoneId),
  ]);
}

export async function rejectMilestone(milestoneId: string): Promise<ContractCallResult> {
  return sendWrite("milestoneRegistry", "Milestone rejection", "rejectMilestone", [
    idToBytes32(milestoneId),
  ]);
}

export async function recordPayment(
  paymentId: string,
  projectId: string,
  milestoneId: string,
  payee: string,
  amountUsdc: number,
  invoiceHash: string
): Promise<ContractCallResult> {
  return sendWrite("paymentRegistry", "Payment recording", "recordPayment", [
    idToBytes32(paymentId),
    idToBytes32(projectId),
    idToBytes32(milestoneId),
    payee,
    usdcToBaseUnits(amountUsdc),
    hashToBytes32(invoiceHash),
  ]);
}

export async function registerDocument(
  documentId: string,
  projectId: string,
  contentHash: string,
  docType: string
): Promise<ContractCallResult> {
  return sendWrite("documentRegistry", "Document registration", "registerDocument", [
    idToBytes32(documentId),
    idToBytes32(projectId),
    hashToBytes32(contentHash),
    docType,
  ]);
}

export async function verifyDocument(documentId: string): Promise<ContractCallResult> {
  return sendWrite("documentRegistry", "Document verification", "verifyDocument", [
    idToBytes32(documentId),
  ]);
}

export async function raiseFlag(
  flagId: string,
  projectId: string,
  reason: string,
  risk: number
): Promise<ContractCallResult> {
  return sendWrite("auditRegistry", "Audit flag", "raiseFlag", [
    idToBytes32(flagId),
    idToBytes32(projectId),
    reason,
    risk,
  ]);
}

export async function resolveFlag(flagId: string, resolutionNote: string): Promise<ContractCallResult> {
  return sendWrite("auditRegistry", "Flag resolution", "resolveFlag", [
    idToBytes32(flagId),
    resolutionNote,
  ]);
}

export async function publishReport(
  reportId: string,
  projectId: string,
  title: string,
  findings: number
): Promise<ContractCallResult> {
  return sendWrite("auditRegistry", "Audit report publication", "publishReport", [
    idToBytes32(reportId),
    idToBytes32(projectId),
    title,
    findings,
  ]);
}

export async function grantRole(role: string, account: string): Promise<ContractCallResult> {
  return sendWrite("roleRegistry", "Role grant", "grantRole", [role, account]);
}

export async function revokeRole(role: string, account: string): Promise<ContractCallResult> {
  return sendWrite("roleRegistry", "Role revocation", "revokeRole", [role, account]);
}
