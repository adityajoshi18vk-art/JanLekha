import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicLayout } from "../components/Layout";
import { useApp } from "../context/AppContext";
import { PERMISSIONS, ROLE_LABELS, ROLE_ROUTES, type Permission, type Role } from "../lib/permissions";
import { DemoNotice } from "../components/ui";

const PERM_LABELS: Record<Permission, string> = {
  manage_departments: "Manage departments",
  create_project: "Register projects",
  approve_budget: "Approve budgets",
  release_funds: "Release funds",
  initiate_payment: "Initiate payments",
  authorise_payment: "Authorise payments",
  publish_tender: "Publish tenders",
  evaluate_bids: "Evaluate bids",
  submit_bid: "Submit bids",
  submit_milestone: "Submit milestones",
  verify_milestone: "Verify milestones",
  publish_audit: "Publish audit reports",
  edit_records: "Edit records",
  view_public: "View public records",
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  GOVERNMENT_ADMIN: "Creates departments and registers projects, and oversees platform activity across departments.",
  FINANCE_OFFICER: "Approves budget allocations, releases funds, and initiates simulated USDC payments for verified milestones.",
  PROCUREMENT_OFFICER: "Publishes tenders, receives bids, evaluates them, and awards contracts to the selected bidder.",
  CONTRACTOR: "Bids on open tenders, delivers awarded projects, submits milestones, and tracks payments.",
  INDEPENDENT_AUDITOR: "Verifies milestones, raises and resolves audit flags, and publishes audit reports.",
  CITIZEN: "Follows projects, checks documents, reads audit reports, and files complaints. Read only.",
};

const ROLES: Role[] = [
  "GOVERNMENT_ADMIN",
  "FINANCE_OFFICER",
  "PROCUREMENT_OFFICER",
  "CONTRACTOR",
  "INDEPENDENT_AUDITOR",
  "CITIZEN",
];

export default function Login() {
  const { setRole, resetDemo } = useApp();
  const navigate = useNavigate();
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const signIn = (r: Role) => {
    setRole(r);
    navigate(ROLE_ROUTES[r]);
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Sign in as a role</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Pick a role to enter its workspace. There is no password, no real account, and nothing leaves this browser.
          This is demo local only sign in, for showing how each role works in JanLekha.
        </p>
        <div className="mt-4">
          <DemoNotice />
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-bold text-amber-900">Demo authentication, read this before signing in</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            <li>Clicking a role card signs you in instantly. No password is asked, and no identity is checked.</li>
            <li>Your role is stored only in this browser, and the role switcher in any workspace can change it.</li>
            <li>Production must enforce role based access control server side, on every request, not only by hiding pages or buttons. A client side role check is a demo convenience, never a security control.</li>
            <li>All figures shown after sign in are demo data, not actual government expenditure.</li>
          </ul>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <article key={r} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">{ROLE_LABELS[r]}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{ROLE_DESCRIPTIONS[r]}</p>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Can do in this demo</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {PERMISSIONS[r].map((p) => (
                    <li key={p} className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-800">
                      {PERM_LABELS[p]}
                    </li>
                  ))}
                </ul>
                {r === "FINANCE_OFFICER" ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Cannot authorise a payment it initiated. A second authoriser is required in production.
                  </p>
                ) : null}
                {r === "CONTRACTOR" ? (
                  <p className="mt-2 text-xs text-slate-500">Cannot verify its own milestones. Verification is auditor only.</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => signIn(r)}
                className="mt-5 w-full rounded-lg bg-[#080F1C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Sign in as {ROLE_LABELS[r]}
              </button>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900">Start the demo again from the seed data</h2>
            <p className="mt-1 text-sm text-slate-600">
              Reset clears every change made in this browser, including departments, projects, tenders, bids, milestones,
              and payments created during the demo, and restores the original demo data.
            </p>
            {resetMsg ? <p className="mt-2 text-sm font-medium text-emerald-700">{resetMsg}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => {
              resetDemo();
              setResetMsg("Demo data reset. All demo changes in this browser were cleared.");
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset demo data
          </button>
          <Link to="/" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
            Back to public portal
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
