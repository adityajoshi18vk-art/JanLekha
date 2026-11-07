# JanLekha 2.0, Public Financial Transparency

JanLekha lets citizens track how government budgets are allocated, approved, released, and spent across departments, contractors, and projects. The public citizen portal needs no wallet. Six role workspaces cover the full government workflow. The blockchain layer targets Circle Arc Testnet.

## What is real, what is simulated, what is demo data

- **Demo data:** every budget, project, payment, tender, and audit figure in the app is realistic synthetic demonstration data. It is labelled DEMO DATA wherever it appears. It is not actual government expenditure.
- **Simulated settlement:** USDC payments in the demo are simulated. Their references look like `SIM-ARC-...` and are demo references, not transaction hashes. They do not resolve on the Arc explorer.
- **Real:** the Solidity contracts are real and tested with Foundry (18 tests, all passing). The wallet connection is real MetaMask compatible code against Arc Testnet, chain ID 5042002. The document verifier really computes SHA-256 in the browser. Nothing in the demo deploys to mainnet or moves real funds.
- **Financial model:** INR government budgets and USDC settlement demonstrations are separate concepts and are never mixed. Native USDC is the gas asset. ERC-20 USDC uses 6 decimals. The contracts enforce that distinction.

## How to run it

Prerequisites: Node.js 20 or later, npm.

```bash
cd janlekha
npm install
npm run dev
```

Open http://localhost:5173. The production build is:

```bash
npm run build
npm run preview
```

## Design decisions

- **Theme, hybrid:** light citizen portal, dark internal dashboards. Midnight navy `#080F1C`, surface cards `#111D2E`, cyan accent `#22D3EE`, verified green `#34D399`. Professional typography, clean spacing, responsive desktop, tablet, and mobile.
- **Scope:** all six role dashboards plus the public homepage, in one app with one design system and one shared data store. No duplicate pages or layouts.
- **Chain:** Arc Testnet first. Chain ID 5042002, RPC https://rpc.testnet.arc.io, Explorer https://explorer.testnet.arc.io. Mainnet chain ID 5042 is listed for reference only. Never deploy to mainnet from this repo without a separate review.
- **Citizen first:** citizens open JanLekha, search a department or project, see its budget, follow its expenditure, inspect invoices and milestones, and verify records on Arc. No wallet is required for any citizen feature.
- **Confidential data stays off chain:** personal data and private bid details are not published to the blockchain. Only information approved for public disclosure is recorded on chain.

## Routes

Public, no wallet required:

- `/` citizen portal, national totals, department spend, top projects, latest payments and audits
- `/money-flow` Where Did My Money Go, interactive Sankey from budget to departments, projects, contractors, and payments
- `/departments` and `/departments/:id`
- `/projects` and `/projects/:id`
- `/tenders` and `/tenders/:id`
- `/payments` payment history, INR and USDC shown separately
- `/documents` document registry
- `/verify` public document verifier, upload a file or paste a SHA-256 hash
- `/audits` public audit reports, with download as text or JSON
- `/map` geographic project explorer
- `/complaints` citizen complaints with status tracking

Role workspaces, sign in at `/login` (demo local only role selection, no password, no real account):

- `/app/admin` Government Administrator, departments, project registration, approvals
- `/app/finance` Finance Officer, allocations, payment initiation, authorisation queue
- `/app/procurement` Procurement Officer, tenders, bid evaluation, awards
- `/app/contractor` Project Manager / Contractor, bids, milestones, payment tracking
- `/app/auditor` Independent Auditor, risk flags, milestone verification, audit findings
- `/app/citizen` Citizen / Taxpayer workspace, followed projects, saved searches, complaints

## End to end workflows, all working in the demo

1. Government Administrator creates a department and a project.
2. Finance Officer creates and approves a budget allocation.
3. Procurement Officer publishes a tender.
4. Contractor submits a bid and is selected through the authorised procurement workflow.
5. Contractor submits project milestones and supporting evidence.
6. Independent Auditor verifies the milestone.
7. Finance Officer initiates and completes the simulated USDC payment workflow on Arc Testnet.
8. All events appear in the public citizen dashboard timeline.
9. A citizen opens the project and traces its complete financial history.
10. A citizen uploads a document and verifies its hash.

Demo state is stored in the browser localStorage and can be reset from the login page.

## Permissions

A centralised permission system lives in `src/lib/permissions.ts`. Server side enforcement is a production requirement and is noted in the app, the demo enforces permissions in the app layer only. Separation of duties is built in: payment initiation and payment authorisation are separate steps, contractors cannot verify their own work, auditors cannot change original financial records, and citizens are read only.

Known limitation, stated honestly: in this demo the Finance dashboard marks a newly initiated payment as Settled immediately, so it does not sit in the pending authorisation queue. The queue and the second authoriser rule are shown for the seeded pending payment, and a production backend must hold every payment until a second authoriser approves it.

## Auditor and risk monitor

The risk engine in `src/lib/risk.ts` checks budget variance, duplicate invoice hashes, payments over authorised limits, repeated payments to the same milestone, delayed milestones, and missing supporting documents. Every flag carries project, department, amount, reason, evidence, risk level, investigation status, auditor notes, and resolution history. Detection does not prove fraud. Flags are labelled Requires Investigation or Potential Discrepancy only.

## Contracts

Eight registries in `contracts/src`: RoleRegistry, BudgetRegistry, ProjectRegistry, ProcurementRegistry, MilestoneRegistry, PaymentRegistry, DocumentRegistry, AuditRegistry. See `docs/ARC-MIGRATION.md` for the migration report. There was no existing JanLekha repository and no Hedera code to remove, that is stated in the report.

```bash
cd contracts
forge install foundry-rs/forge-std
forge test
```

Forge 1.9.0 result, verified in this environment: **18 passed, 0 failed, 0 skipped.**

Deployment, testnet only:

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.io --broadcast
```

The deploy script reads `PRIVATE_KEY` only from the environment. Never hardcode a private key. No contract addresses are configured by default. Set them as `VITE_ARC_ROLE_REGISTRY_ADDRESS` and the matching `VITE_ARC_*_ADDRESS` variables in a local `.env` file to point the frontend at a deployment. Without them the frontend uses the simulated settlement path and says so.

## Tech stack

Vite, React, TypeScript, Tailwind CSS, React Router, Recharts, ethers, Foundry, Solidity 0.8.24. No backend server is required. The Sankey diagram and the India map are hand built SVG, no extra dependency.

## Project layout

- `src/pages` public pages, `src/pages/roles` the six workspaces
- `src/components` shared UI, Sankey, India map, charts, wallet connect
- `src/context/AppContext.tsx` shared demo state and all workflow actions
- `src/data/demoData.ts` seed data, clearly labelled synthetic
- `src/lib` formatting, Arc config, permissions, risk engine, contract service
- `contracts` Solidity registries, Foundry tests, deploy script
- `docs/ARC-MIGRATION.md` migration report
