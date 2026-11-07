import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { WorkspaceLayout } from "../../components/Layout";
import { useApp } from "../../context/AppContext";
import { can } from "../../lib/permissions";
import { contractors, totals } from "../../data/demoData";
import { formatINR, formatDate } from "../../lib/format";
import { Badge, statusTone } from "../../components/ui";
import {
  AccessDenied,
  ActivityTimeline,
  DarkCard,
  DarkCardTitle,
  DarkStat,
  DataTable,
  DemoStrip,
  Field,
  GhostButton,
  NotificationsPanel,
  PrimaryButton,
  SelectInput,
  SuccessNote,
  Td,
  TextAreaInput,
  TextInput,
} from "../../components/RoleShared";

const CR = 10000000;

export default function AdminDashboard() {
  const { role, departments, projects, tenders, milestones, flags, payments, events, notifications, addDepartment, addProject, resetDemo } =
    useApp();
  const [deptMsg, setDeptMsg] = useState<string | null>(null);
  const [projMsg, setProjMsg] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptHead, setDeptHead] = useState("");
  const [deptState, setDeptState] = useState("");
  const [deptBudgetCr, setDeptBudgetCr] = useState("");

  const [projName, setProjName] = useState("");
  const [projDept, setProjDept] = useState(departments[0]?.id ?? "");
  const [projLocation, setProjLocation] = useState("");
  const [projState, setProjState] = useState("");
  const [projBudgetCr, setProjBudgetCr] = useState("");
  const [projContractor, setProjContractor] = useState(contractors[0]?.id ?? "");
  const [projTender, setProjTender] = useState("");
  const [projStart, setProjStart] = useState("");
  const [projEnd, setProjEnd] = useState("");
  const [projDesc, setProjDesc] = useState("");

  if (role !== "GOVERNMENT_ADMIN") {
    return (
      <WorkspaceLayout title="Government Administrator" subtitle="Admin workspace">
        <AccessDenied required="GOVERNMENT_ADMIN" />
      </WorkspaceLayout>
    );
  }

  const t = totals();
  const openFlags = flags.filter((f) => f.status !== "Resolved");
  const pendingPayments = payments.filter((p) => p.status === "Pending authorisation");
  const submittedMilestones = milestones.filter((m) => m.status === "Submitted");
  const approvalRequests = [
    ...openFlags.map((f) => ({ kind: "Audit flag", title: f.project, detail: f.reason, meta: f.risk + " risk, " + formatINR(f.amountInr) })),
    ...pendingPayments.map((p) => ({ kind: "Payment authorisation", title: p.project, detail: "Payment to " + p.payee + " awaits a second authoriser.", meta: formatINR(p.amountInr) + ", " + p.status })),
    ...submittedMilestones.map((m) => ({ kind: "Milestone submitted", title: m.project, detail: m.title + " is with the auditor for verification.", meta: formatINR(m.amountInr) + ", due " + formatDate(m.dueDate) })),
  ];

  const submitDept = (e: FormEvent) => {
    e.preventDefault();
    const budget = Number(deptBudgetCr) * CR;
    if (!deptName.trim() || !deptCode.trim() || !deptHead.trim() || !deptState.trim() || !(budget > 0)) {
      setDeptMsg("Fill in every field, and enter a budget above zero.");
      return;
    }
    addDepartment({ name: deptName.trim(), code: deptCode.trim().toUpperCase(), budgetInr: budget, head: deptHead.trim(), state: deptState.trim() });
    setDeptMsg("Department " + deptName.trim() + " created with a budget of " + formatINR(budget) + ". Demo data only.");
    setDeptName("");
    setDeptCode("");
    setDeptHead("");
    setDeptState("");
    setDeptBudgetCr("");
  };

  const submitProject = (e: FormEvent) => {
    e.preventDefault();
    const dept = departments.find((d) => d.id === projDept);
    const con = contractors.find((c) => c.id === projContractor);
    const budget = Number(projBudgetCr) * CR;
    if (!dept || !con || !projName.trim() || !projLocation.trim() || !projState.trim() || !(budget > 0) || !projStart || !projEnd) {
      setProjMsg("Fill in every field, pick a department and a contractor, and enter a budget above zero.");
      return;
    }
    addProject({
      name: projName.trim(),
      departmentId: dept.id,
      department: dept.name,
      location: projLocation.trim(),
      state: projState.trim(),
      budgetInr: budget,
      contractorId: con.id,
      contractor: con.name,
      tenderId: projTender.trim() || "to be tendered",
      description: projDesc.trim() || "Registered by the Government Administrator in the demo workspace.",
      startDate: projStart,
      endDate: projEnd,
    });
    setProjMsg("Project " + projName.trim() + " registered under " + dept.name + " with a budget of " + formatINR(budget) + ". Demo data only.");
    setProjName("");
    setProjLocation("");
    setProjState("");
    setProjBudgetCr("");
    setProjTender("");
    setProjStart("");
    setProjEnd("");
    setProjDesc("");
  };

  return (
    <WorkspaceLayout title="Government Administrator" subtitle="Departments, projects, approvals, and platform activity. All figures are demo data.">
      <div className="space-y-6">
        <DemoStrip text="All figures on this page are realistic synthetic demonstration data. This is not actual government expenditure." />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DarkStat label="Total budget (demo)" value={formatINR(t.totalBudget)} sub={departments.length + " departments"} />
          <DarkStat label="Allocated (demo)" value={formatINR(t.totalAllocated)} sub={formatINR(t.totalReleased) + " released"} tone="green" />
          <DarkStat label="Spent (demo)" value={formatINR(t.totalSpent)} sub={projects.length + " projects on record"} />
          <DarkStat label="Open audit flags (demo)" value={String(openFlags.length)} sub={pendingPayments.length + " payments pending authorisation"} tone={openFlags.length > 0 ? "amber" : "green"} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DarkCard>
            <DarkCardTitle title="Add a department" sub="Workflow 1. Uses addDepartment. Allocated, released, and spent start at zero." />
            {can(role, "manage_departments") ? (
              <form onSubmit={submitDept} className="space-y-3">
                <Field label="Department name"><TextInput value={deptName} onChange={setDeptName} placeholder="e.g. Health and Family Welfare" required /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Code"><TextInput value={deptCode} onChange={setDeptCode} placeholder="e.g. HFW" required /></Field>
                  <Field label="Head"><TextInput value={deptHead} onChange={setDeptHead} placeholder="e.g. Dr. Meera Nair" required /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="State"><TextInput value={deptState} onChange={setDeptState} placeholder="e.g. Karnataka" required /></Field>
                  <Field label="Budget (Rs Cr)" hint="Entered in crore, stored in rupees."><TextInput type="number" min="0" step="1" value={deptBudgetCr} onChange={setDeptBudgetCr} placeholder="e.g. 500" required /></Field>
                </div>
                <PrimaryButton type="submit">Create department</PrimaryButton>
                <SuccessNote message={deptMsg} />
              </form>
            ) : (
              <p className="text-sm text-slate-400">Your role cannot manage departments.</p>
            )}
          </DarkCard>

          <DarkCard>
            <DarkCardTitle title="Register a project" sub="Workflow 1. Uses addProject. The project starts as New, with zero allocation and zero progress." />
            {can(role, "create_project") ? (
              <form onSubmit={submitProject} className="space-y-3">
                <Field label="Project name"><TextInput value={projName} onChange={setProjName} placeholder="e.g. District Hospital Modernisation, Mysuru" required /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Department">
                    <SelectInput value={projDept} onChange={setProjDept} options={departments.map((d) => ({ value: d.id, label: d.name }))} />
                  </Field>
                  <Field label="Contractor">
                    <SelectInput value={projContractor} onChange={setProjContractor} options={contractors.map((c) => ({ value: c.id, label: c.name }))} />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Location"><TextInput value={projLocation} onChange={setProjLocation} placeholder="e.g. Mysuru, Karnataka" required /></Field>
                  <Field label="State"><TextInput value={projState} onChange={setProjState} placeholder="e.g. Karnataka" required /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Budget (Rs Cr)"><TextInput type="number" min="0" step="1" value={projBudgetCr} onChange={setProjBudgetCr} placeholder="e.g. 120" required /></Field>
                  <Field label="Tender reference (optional)"><TextInput value={projTender} onChange={setProjTender} placeholder="e.g. ten-9, or leave blank" /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Start date"><TextInput type="date" value={projStart} onChange={setProjStart} required /></Field>
                  <Field label="End date"><TextInput type="date" value={projEnd} onChange={setProjEnd} required /></Field>
                </div>
                <Field label="Description"><TextAreaInput value={projDesc} onChange={setProjDesc} placeholder="What this project delivers." /></Field>
                <PrimaryButton type="submit">Register project</PrimaryButton>
                <SuccessNote message={projMsg} />
              </form>
            ) : (
              <p className="text-sm text-slate-400">Your role cannot register projects.</p>
            )}
          </DarkCard>
        </div>

        <DarkCard>
          <DarkCardTitle title="Departments" sub="Budget, allocation, release, and spend. All figures are demo data." />
          <DataTable headers={["Department", "Head", "Budget", "Allocated", "Released", "Spent", "Utilisation"]}>
            {departments.map((d) => (
              <tr key={d.id}>
                <Td><span className="font-semibold text-white">{d.name}</span><span className="block text-xs text-slate-500">{d.code} | {d.state}</span></Td>
                <Td>{d.head}</Td>
                <Td>{formatINR(d.budgetInr)}</Td>
                <Td>{formatINR(d.allocatedInr)}</Td>
                <Td>{formatINR(d.releasedInr)}</Td>
                <Td>{formatINR(d.spentInr)}</Td>
                <Td>{d.budgetInr > 0 ? Math.round((d.spentInr / d.budgetInr) * 100) + "%" : "0%"}</Td>
              </tr>
            ))}
          </DataTable>
        </DarkCard>

        <DarkCard>
          <DarkCardTitle title="Projects" sub="Newest registrations appear first in the demo list. All figures are demo data." />
          <DataTable headers={["Project", "Department", "Budget", "Allocated", "Progress", "Status"]}>
            {projects.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link to={"/projects/" + p.id} className="font-semibold text-cyan-300 hover:underline">{p.name}</Link>
                  <span className="block text-xs text-slate-500">{p.location} | {p.contractor}</span>
                </Td>
                <Td>{p.department}</Td>
                <Td>{formatINR(p.budgetInr)}</Td>
                <Td>{formatINR(p.allocatedInr)}</Td>
                <Td>{p.progress}%</Td>
                <Td><Badge tone={statusTone(p.status)}>{p.status}</Badge></Td>
              </tr>
            ))}
          </DataTable>
        </DarkCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <DarkCard>
            <DarkCardTitle title="Approval requests" sub="Open audit flags, payments awaiting a second authoriser, and milestones awaiting verification." />
            {approvalRequests.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing is waiting for approval.</p>
            ) : (
              <ul className="space-y-3">
                {approvalRequests.map((a, i) => (
                  <li key={i} className="rounded-xl border border-white/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{a.kind}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{a.title}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{a.detail}</p>
                    <p className="mt-1 text-xs text-slate-500">{a.meta}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/audits" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#080F1C] hover:bg-cyan-400">Open audit reports</Link>
              <Link to="/payments" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5">Open payments</Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Tenders on record: {tenders.length}. The admin approves the work, the Finance Officer authorises payments,
              and the auditor verifies milestones. No single role does all three.
            </p>
          </DarkCard>

          <DarkCard>
            <DarkCardTitle title="Notifications" sub="For the Government Administrator role." />
            <NotificationsPanel role="GOVERNMENT_ADMIN" items={notifications} />
          </DarkCard>
        </div>

        <DarkCard>
          <DarkCardTitle title="Platform activity" sub="Latest events across all roles, newest first. References starting SIM-ARC are demo references, not transaction hashes." />
          <ActivityTimeline events={events} limit={10} />
        </DarkCard>

        <DarkCard>
          <DarkCardTitle title="Demo controls" sub="These affect only this browser." />
          <div className="flex flex-wrap items-center gap-3">
            <GhostButton
              onClick={() => {
                resetDemo();
                setResetMsg("Demo data reset. All demo changes in this browser were cleared.");
              }}
            >
              Reset demo data
            </GhostButton>
            <Link to="/" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5">Back to public portal</Link>
          </div>
          {resetMsg ? <p className="mt-3 text-sm font-medium text-emerald-400">{resetMsg}</p> : null}
        </DarkCard>
      </div>
    </WorkspaceLayout>
  );
}
