# JanLekha 2.0: Arc Migration Report

## Summary

JanLekha 2.0 is a public financial transparency platform. This report documents
its blockchain layer on Arc Testnet (chain id 5042002) and the migration that
produced it.

## 1. What existed before

There was **no existing JanLekha repository and no Hedera dependencies to
remove**. JanLekha 2.0 was built fresh as a Vite, React, and TypeScript
application with a demo data layer in `src/data/demoData.ts` and a local state
layer in `src/context/AppContext.tsx`. Its payments were already labelled
SIM-ARC simulated references, and its chain configuration in `src/lib/arc.ts`
already pointed at Arc Testnet. This report therefore describes a
greenfield Arc build, not a migration of a live system.

## 2. What would have been removed in a real migration

If a prior Hedera based version had existed, a real migration would have
removed the following. None of these existed in this codebase, so nothing was
deleted. They are listed here so a reviewer can see the migration was
considered, not skipped.

1. Hedera SDK dependencies, such as `@hashgraph/sdk`, from `package.json`.
2. Hedera client setup code: `Client.forTestnet()` or `Client.forMainnet()`,
   operator account id and private key handling, and any Hedera mirror node
   REST calls.
3. Hedera consensus service (HCS) topic submission code used for audit logs,
   replaced by `AuditRegistry` events.
4. Hedera token service (HTS) transfer code, replaced by ERC-20 USDC
   settlement recorded in `PaymentRegistry`.
5. Hedera scheduled transactions, replaced by Finance approved allocations in
   `BudgetRegistry` followed by `PaymentRegistry.recordPayment`.
6. Hedera account ids (0.0.x) in the data model, replaced by EVM addresses.
7. Hedera transaction ids and mirror node explorer links, replaced by
   `https://explorer.testnet.arc.io/tx/<hash>`.
8. Any Hedera wallet connect code (HashPack or WalletConnect for Hedera),
   replaced by the standard EVM `window.ethereum` flow in `src/lib/arc.ts`
   and `src/components/WalletConnect.tsx`.

A search of the repository confirms no file mentions Hedera, Hashgraph, HCS,
HTS, or a 0.0.x account id.

## 3. Components replaced

| Before (demo only) | After (Arc) |
| --- | --- |
| `simulateArcPayment` in `src/lib/arc.ts` as the only payment path | Kept as the simulated fallback, plus `src/lib/contracts.ts` for real on chain writes when contracts are deployed |
| Local `initiatePayment` in `src/context/AppContext.tsx`, which only updated local state | Unchanged for the demo, the on chain equivalent is `PaymentRegistry.recordPayment`, which enforces the authorised limit and rejects duplicate invoice hashes |
| No access control on records | `RoleRegistry` with ADMIN, FINANCE, PROCUREMENT, CONTRACTOR, and AUDITOR roles, read by all seven other registries |
| No budget authority record | `BudgetRegistry.approveAllocation`, Finance only |
| No project identity on chain | `ProjectRegistry.registerProject`, Admin only |
| No tender record on chain | `ProcurementRegistry` publish, bid, and award flow |
| Milestone verification by name only | `MilestoneRegistry.verifyMilestone`, Auditor only, and never the submitter |
| No payment invariant | `PaymentRegistry` checks verified milestone, authorised limit, and duplicate invoice hash |
| No document integrity record | `DocumentRegistry` append only content hashes, Auditor verification only |
| No audit trail on chain | `AuditRegistry` flags and reports, append only |

## 4. Functionality retained

Everything the demo already did is retained unchanged.

- All pages, routes, roles, and demo data in `src/data/demoData.ts`.
- `initiatePayment` still returns a SIM-ARC reference, labelled simulated.
- `simulateArcPayment`, `connectWallet`, `switchToArcTestnet`, and all other
  existing exports of `src/lib/arc.ts` still work exactly as before.
- `WalletConnect` keeps its default export and its `compact` prop.
- Citizens still need no wallet. All public records are readable without
  connecting, and the wallet component says so.
- All demo figures remain synthetic and are labelled as such. No synthetic
  data is presented as real expenditure, and no synthetic transaction hash is
  invented.

## 5. Proposed Arc architecture

Eight Solidity 0.8.24 registries in `contracts/src`, deployed in this order.
`RoleRegistry` is deployed first, because every other registry reads roles
from it. `MilestoneRegistry.setPaymentRegistry` is called once after
deployment so a recorded payment can mark its milestone Paid.

```
RoleRegistry            roles for every account, Admin only grants and revokes
BudgetRegistry          Finance approved allocations and authorised limits
ProjectRegistry         project identity and status, Admin only
ProcurementRegistry     tenders, one bid per contractor, Procurement awards
MilestoneRegistry       submit (Contractor), verify (Auditor, never submitter), paid
PaymentRegistry         Finance only, limit and duplicate invoice checks
DocumentRegistry        append only content hashes, Auditor verifies
AuditRegistry           append only flags and reports, Auditor only
```

Events are emitted for every state change, so the public audit trail can be
rebuilt from logs alone. The frontend reads through `src/lib/contracts.ts`,
which parses receipt logs into decoded events with `parseContractEvents`.

Roles map to the demo roles as follows. GOVERNMENT_ADMIN maps to ADMIN_ROLE.
FINANCE_OFFICER maps to FINANCE_ROLE. PROCUREMENT_OFFICER maps to
PROCUREMENT_ROLE. CONTRACTOR maps to CONTRACTOR_ROLE. INDEPENDENT_AUDITOR
maps to AUDITOR_ROLE. CITIZEN holds no role and reads only.

## 6. Network configuration

Arc Testnet, chain id 5042002 (hex 0x4CF6AA).

- RPC: https://rpc.testnet.arc.io
- Explorer: https://explorer.testnet.arc.io
- Native currency: USDC, 18 decimals, used for gas.
- Arc Mainnet, chain id 5042, is defined in `src/lib/arc.ts` for reference
  but is not used by the demo.

## 7. USDC native gas vs ERC-20 USDC, 6 decimals

This distinction is the most common source of errors in the codebase, so it
is stated plainly.

- **Native gas token:** USDC with 18 decimals. This is what pays for gas on
  Arc. A wallet balance of 1 native USDC is 1,000,000,000,000,000,000 base
  units. `ARC_TESTNET.currencyDecimals` is 18 for this reason.
- **Settlement token:** ERC-20 USDC with 6 decimals. This is what settles
  milestone payments. A payment of 1 USDC is 1,000,000 base units.
  `PaymentRegistry.USDC_DECIMALS` is 6 and `USDC_BASE_UNIT` is 1,000,000.
  `usdcToBaseUnits` in both `src/lib/arc.ts` and `src/lib/contracts.ts`
  multiplies by 1,000,000, never by 1e18.

Never convert a settlement amount with 18 decimals, and never pay a gas
amount with 6 decimals. The two tokens share a symbol and a name, but they
are different balances.

## 8. INR budgets vs USDC settlement

INR budgets and USDC settlement are separate concepts, kept apart in both the
contracts and the frontend.

- INR figures are planning and reporting figures: department budgets,
  project budgets, tender values, and milestone amounts in whole rupees.
  They live in `BudgetRegistry` and `ProjectRegistry` as `amountInr` and
  `budgetInr`.
- USDC figures are settlement figures: the amount actually transferred to a
  payee on Arc, in ERC-20 base units with 6 decimals. They live in
  `BudgetRegistry` as `amountUsdcBaseUnits` and in `PaymentRegistry` as
  `amountUsdcBaseUnits`.
- There is no exchange rate in any contract. Converting an INR budget to a
  USDC settlement amount is a Finance decision made off chain and recorded
  as two separate numbers in the same allocation. The demo data already
  follows this split, with `amountInr` and `amountUsdc` side by side.

## 9. Deployment steps for Arc Testnet

Prerequisites: Foundry installed (`forge --version`), and a deployer wallet
with testnet USDC for gas. The deployer key is read only from the
`PRIVATE_KEY` environment variable and is never hardcoded.

```bash
cd contracts
forge build
forge test
PRIVATE_KEY=<deployer key, never committed> forge script script/Deploy.s.sol \
  --rpc-url https://rpc.testnet.arc.io --broadcast
```

The script prints all eight contract addresses. Copy them into the frontend
`.env` as `VITE_ARC_ROLE_REGISTRY_ADDRESS`, `VITE_ARC_BUDGET_REGISTRY_ADDRESS`,
`VITE_ARC_PROJECT_REGISTRY_ADDRESS`, `VITE_ARC_PROCUREMENT_REGISTRY_ADDRESS`,
`VITE_ARC_MILESTONE_REGISTRY_ADDRESS`, `VITE_ARC_PAYMENT_REGISTRY_ADDRESS`,
`VITE_ARC_DOCUMENT_REGISTRY_ADDRESS`, and `VITE_ARC_AUDIT_REGISTRY_ADDRESS`.
Then restart the dev server. `areContractsDeployed()` in `src/lib/arc.ts`
returns true only when all eight are set.

After deployment, grant roles from the deployer (first ADMIN) account:

- FINANCE_ROLE to the Finance Officer wallet.
- PROCUREMENT_ROLE to the Procurement Officer wallet.
- CONTRACTOR_ROLE to each contractor wallet.
- AUDITOR_ROLE to each auditor wallet.

Consider revoking the deployer ADMIN role once a dedicated admin account
holds it.

## 10. What is simulated in the demo

Until the contracts are deployed and the eight `VITE_ARC_*_ADDRESS` variables
are set, the app runs in simulated mode.

- `areContractsDeployed()` returns false and `WalletConnect` shows
  "Not deployed, simulated mode".
- Every write helper in `src/lib/contracts.ts` returns a result with
  `mode: "simulated"`, `txHash: null`, and a `simulatedRef` starting with
  `SIM-ARC-`, plus a note stating it was not sent on chain.
- `initiatePayment` in `src/context/AppContext.tsx` still returns a SIM-ARC
  reference from `simulateArcPayment`.
- All figures in `src/data/demoData.ts` are synthetic demonstration data, not
  actual government expenditure, as stated by `DEMO_NOTICE`.
- Read helpers in `src/lib/contracts.ts` return null when their contract is
  not deployed, so the UI falls back to demo data instead of inventing an
  on chain record.

When the contracts are deployed, write helpers require a connected wallet on
Arc Testnet (chain 5042002), wait for the receipt, check its status, and
return the real transaction hash with an explorer link. Nothing in simulated
mode is ever presented as a real transaction.

## 11. Tests

`contracts/test/JanLekha.t.sol` runs 18 Foundry tests. The required cases
are covered: only admin can grant roles, only finance can approve
allocations, contractor cannot verify own milestone, auditor cannot edit
original records, payment cannot exceed authorised limit, duplicate invoice
hash is rejected, and USDC 6 decimal handling is correct. Additional tests
cover the end to end allocation to payment flow, the tender bid and award
flow, and milestone double verification. Run with `forge test` in
`contracts/`. At the time of writing, all 18 tests pass.
