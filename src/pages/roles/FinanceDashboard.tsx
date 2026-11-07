import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { WorkspaceLayout } from "../../components/Layout";
import { useApp } from "../../context/AppContext";
import { can, canAuthorisePayment } from "../../lib/permissions";
import { totals } from "../../data/demoData";
import { formatINR, formatUSDC, formatDate } from "../../lib/format";
import { ARC_TESTNET, explorerTxUrl } from "../../lib/arc";
import { Badge, statusTone } from "../../components/ui";
import {
  AccessDenied,
  DarkCard,
  DarkCardTitle,
  DarkStat,
  DataTable,
  DemoStrip,
  Field,
  NotificationsPanel,
  PrimaryButton,
  SelectInput,
  SuccessNote,
  Td,
  TextInput,
} from "../../components/RoleShared";

const CR = 10000000;

export default function FinanceDashboard() {
  const { role, projects, milestones, payments, notifications, createAllocation, initiatePayment } = useApp();

  const [allocProject, setAllocProject] = useState(projects[0]?.id ?? "");
  const [allocCr, setAllocCr] = useState("");
  const [allocMsg, setAllocMsg] = useState<string | null>(null);

  const [payMilestone, setPayMilestone] = useState("");
  const [payInrCr, setPayInrCr] = useState("");
  const [payUsdc, setPayUsdc] = useState("");
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [lastRef, setLastRef] = useState<string | null>(null);

  if (role !== "FINANCE_OFFICER") {
    return (
      <WorkspaceLayout title="Finance Officer" subtitle="Finance workspace">
        <AccessDenied required="FINANCE_OFFICER" />
      </WorkspaceLayout>
    );
  }

  const t = totals();
  const verified = milestones.filter((m) => m.status === "Verified");
  const pendingAuth = payments.filter((p) => p.status === "Pending authorisation");
  const settled = payments.filter((p) => p.status === "Settled");
  const selectedMilestone = verified.find((m) => m.id === payMilestone);
  const selectedProject = selectedMilestone ? projects.find((p) => p.id === selectedMilestone.projectId) : undefined;
  const canInitiate = can(role, "initiate_payment");
  const canApprove = can(role, "approve_budget");
  const selfAuthorise = canAuthorisePayment(role, "FINANCE_OFFICER");

  const submitAllocation = (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(allocCr) * CR;
    const project = projects.find((p) => p.id === allocProject);
    if (!project || !(amount > 0)) {
      setAllocMsg("Pick a project and enter an amount above zero.");
      return;
    }
    createAllocation(project.id, amount);
    setAllocMsg(
      "Allocation of " + formatINR(amount) + " approved and released for " + project.name + ". Demo data only.",
    );
    setAllocCr("");
  };

  const submitPayment = (e: FormEvent) => {
    e.preventDefault();
    const milestone = verified.find((m) => m.id === payMilestone);
    const amountInr = Number(payInrCr) * CR;
    const amountUsdc = Number(payUsdc);
    if (!milestone || !selectedProject || !(amountInr > 0) || !(amountUsdc > 0)) {
      setPayMsg("Pick a verified milestone and enter an INR amount and a USDC amount above zero.");
      return;
    }
    const ref = initiatePayment(selectedProject.id, milestone.id, amountInr, amountUsdc, selectedProject.contractor);
    setLastRef(ref);
    setPayMsg(
      "Simulated payment initiated for " + milestone.title + ". Reference " + ref + " is a demo reference, not a real transaction hash.",
    );
    setPayInrCr("");
    setPayUsdc("");
  };

  return (
    <WorkspaceLayout title="Finance Officer" subtitle="Allocations, releases, and simulated USDC payments. All figures are demo data.">
      <div className="space-y-6">
        <DemoStrip text="All figures on this page are realistic synthetic demonstration data. This is not actual government expenditure. USDC amounts are simulated, and no real money moves." />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DarkStat label="Allocated (demo)" value={formatINR(t.totalAllocated)} sub={"of " + formatINR(t.totalBudget) + " budgeted"} />
          <DarkStat label="Released (demo)" value={formatINR(t.totalReleased)} sub={formatINR(t.unreleased) + " allocated but not released"} tone="green" />
          <DarkStat label="Spent (demo)" value={formatINR(t.totalSpent)} sub={settled.length + " settled payments on record"} />
          <DarkStat label="Pending authorisation (demo)" value={String(pendingAuth.length)} sub={verified.length + " verified milestones ready to pay"} tone={pendingAuth.length > 0 ? "amber" : "green"} />
        </div>

        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
          <h2 className="text-base font-semibold text-amber-200">Separation of duties: initiation is not authorisation</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-100/90">
            A Finance Officer can initiate a payment, but cannot authorise a payment they initiated. In production, a
            second authoriser must approve the payment before it settles. This demo records initiated payments and holds
            them in the pending authorisation queue below. The check in code is canAuthorisePayment(role, initiatorRole),
            and for this role it returns {selfAuthorise ? "true" : "false"} when the initiator is also a Finance Officer.
          </p>
          <p className="mt-2 text-sm text-amber-100/90">
            Permission check: initiate payment {canInitiate ? "allowed" : "not allowed"}, approve budget{" "}
            {canApprove ? "allowed" : "not allowed"}, authorise own payment{" "}
            {can(role, "authorise_payment") ? "allowed" : "not allowed in this demo role"}.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DarkCard>
            <DarkCardTitle title="Approve an allocation" sub="Workflow 2. Uses createAllocation. The amount is added to the project allocated and released totals." />
            {canApprove ? (
              <form onSubmit={submitAllocation} className="space-y-3">
                <Field label="Project">
                  <SelectInput
                    value={allocProject}
                    onChange={setAllocProject}
                    options={projects.map((p) => ({ value: p.id, label: p.name + " (" + formatINR(p.budgetInr) + ")" }))}
                  />
                </Field>
                <Field label="Amount (Rs Cr)" hint="Entered in crore, stored in rupees.">
                  <TextInput type="number" min="0" step="1" value={allocCr} onChange={setAllocCr} placeholder="e.g. 25" required />
                </Field>
                <PrimaryButton type="submit">Approve allocation</PrimaryButton>
                <SuccessNote message={allocMsg} />
              </form>
            ) : (
              <p className="text-sm text-slate-400">Your role cannot approve budgets.</p>
            )}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-white">Allocations by project</h3>
              <DataTable headers={["Project", "Budget", "Allocated", "Released"]}>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <Td><span className="font-semibold text-white">{p.name}</span></Td>
                    <Td>{formatINR(p.budgetInr)}</Td>
                    <Td>{formatINR(p.allocatedInr)}</Td>
                    <Td>{formatINR(p.releasedInr)}</Td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </DarkCard>

          <DarkCard>
            <DarkCardTitle title="Initiate a simulated USDC payment" sub="Workflow 7. Only Verified milestones can be paid. Uses initiatePayment, which returns a SIM-ARC reference." />
            {verified.length === 0 ? (
              <p className="text-sm text-slate-400">No verified milestones are waiting for payment right now.</p>
            ) : canInitiate ? (
              <form onSubmit={submitPayment} className="space-y-3">
                <Field label="Verified milestone">
                  <SelectInput
                    value={payMilestone}
                    onChange={setPayMilestone}
                    options={[
                      { value: "", label: "Choose a verified milestone" },
                      ...verified.map((m) => ({ value: m.id, label: m.title + " | " + m.project })),
                    ]}
                  />
                </Field>
                {selectedMilestone && selectedProject ? (
                  <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                    Payee: <span className="font-semibold text-white">{selectedProject.contractor}</span>
                    <br />
                    Milestone amount on record: {formatINR(selectedMilestone.amountInr)}, due {formatDate(selectedMilestone.dueDate)}.
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Amount (Rs Cr)" hint="INR budget record.">
                    <TextInput type="number" min="0" step="0.01" value={payInrCr} onChange={setPayInrCr} placeholder="e.g. 84" required />
                  </Field>
                  <Field label="Amount (USDC)" hint="Simulated USDC on Arc Testnet.">
                    <TextInput type="number" min="0" step="0.01" value={payUsdc} onChange={setPayUsdc} placeholder="e.g. 960000" required />
                  </Field>
                </div>
                <PrimaryButton type="submit">Initiate simulated payment</PrimaryButton>
                <SuccessNote message={payMsg} />
                {lastRef ? (
                  <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm">
                    <p className="font-semibold text-cyan-300">Simulated payment reference: {lastRef}</p>
                    <p className="mt-1 text-slate-300">
                      This is a demo reference, not a real transaction hash. No real USDC moved.
                    </p>
                    <a
                      href={explorerTxUrl(lastRef)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block font-medium text-cyan-300 hover:underline"
                    >
                      Open in Arc Testnet explorer ({ARC_TESTNET.explorer})
                    </a>
                    <p className="mt-1 text-xs text-slate-400">
                      The explorer link opens the Arc Testnet explorer. A simulated reference will not resolve to a real
                      on chain transaction there.
                    </p>
                  </div>
                ) : null}
              </form>
            ) : (
              <p className="text-sm text-slate-400">Your role cannot initiate payments.</p>
            )}
          </DarkCard>
        </div>

        <DarkCard>
          <DarkCardTitle title="Pending authorisation queue" sub="Payments that need a second authoriser. The Finance Officer who initiated them cannot authorise them." />
          {pendingAuth.length === 0 ? (
            <p className="text-sm text-slate-400">No payments are pending authorisation.</p>
          ) : (
            <DataTable headers={["Project", "Payee", "INR amount", "USDC amount", "Reference", "Status", "Authorise"]}>
              {pendingAuth.map((p) => (
                <tr key={p.id}>
                  <Td><span className="font-semibold text-white">{p.project}</span></Td>
                  <Td>{p.payee}</Td>
                  <Td>{formatINR(p.amountInr)}</Td>
                  <Td>{formatUSDC(p.amountUsdc)}</Td>
                  <Td><span className="break-all text-xs">{p.txRef}</span></Td>
                  <Td><Badge tone={statusTone(p.status)}>{p.status}</Badge></Td>
                  <Td>
                    <span className="text-xs text-slate-400">
                      Blocked: the initiator cannot authorise. A second authoriser is required in production.
                    </span>
                  </Td>
                </tr>
              ))}
            </DataTable>
          )}
        </DarkCard>

        <DarkCard>
          <DarkCardTitle title="Payments" sub="Settled and pending payments. Every reference starting SIM-ARC is simulated, not a real transaction hash." />
          <DataTable headers={["Date", "Project", "Payee", "INR amount", "USDC amount", "Reference", "Status"]}>
            {payments.map((p) => (
              <tr key={p.id}>
                <Td>{formatDate(p.date)}</Td>
                <Td><span className="font-semibold text-white">{p.project}</span></Td>
                <Td>{p.payee}</Td>
                <Td>{formatINR(p.amountInr)}</Td>
                <Td>{formatUSDC(p.amountUsdc)}</Td>
                <Td>
                  <span className="break-all text-xs">{p.txRef}</span>
                  <span className="block text-xs text-amber-300">Simulated</span>
                </Td>
                <Td><Badge tone={statusTone(p.status)}>{p.status}</Badge></Td>
              </tr>
            ))}
          </DataTable>
          <div className="mt-4">
            <Link to="/payments" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5">Open public payments page</Link>
          </div>
        </DarkCard>

        <DarkCard>
          <DarkCardTitle title="Notifications" sub="For the Finance Officer role." />
          <NotificationsPanel role="FINANCE_OFFICER" items={notifications} />
        </DarkCard>
      </div>
    </WorkspaceLayout>
  );
}
