import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { reports as seedReports, type AuditFlag } from "../../data/demoData";
import { WorkspaceLayout } from "../../components/Layout";
import RiskFlagCard from "../../components/RiskFlagCard";
import { Badge, Card, DemoBadge, DemoNotice, StatCard, statusTone } from "../../components/ui";
import { formatDate, formatINR, shortHash } from "../../lib/format";
import { can } from "../../lib/permissions";
import { computeRiskFlags, countByRisk } from "../../lib/risk";

interface LocalFinding {
  title: string;
  project: string;
  findings: number;
  summary: string;
  date: string;
}

export default function AuditorDashboard() {
  const { flags, milestones, projects, payments, documents, events, notifications, role, verifyMilestone, resolveFlag, addEvent, markNotificationRead } = useApp();
  const isAuditor = can(role, "verify_milestone");

  const [deptFilter, setDeptFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolveMsg, setResolveMsg] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [pubTitle, setPubTitle] = useState("");
  const [pubProjectId, setPubProjectId] = useState(projects[0]?.id ?? "");
  const [pubFindings, setPubFindings] = useState("1");
  const [pubSummary, setPubSummary] = useState("");
  const [pubMsg, setPubMsg] = useState("");
  const [localFindings, setLocalFindings] = useState<LocalFinding[]>([]);

  const openFlags = flags.filter((f) => f.status !== "Resolved");
  const criticalFlags = flags.filter((f) => f.risk === "Critical" && f.status !== "Resolved");
  const verifiedMilestones = milestones.filter((m) => m.status === "Verified" || m.status === "Paid");
  const publishedCount = seedReports.length + localFindings.length;

  const computed = useMemo(
    () => computeRiskFlags({ projects, milestones, payments, documents }),
    [projects, milestones, payments, documents],
  );
  const computedByRisk = countByRisk(computed);

  const departments = useMemo(() => Array.from(new Set(flags.map((f) => f.department))), [flags]);

  const filteredFlags = flags.filter((f) => {
    if (deptFilter !== "All" && f.department !== deptFilter) return false;
    if (riskFilter !== "All" && f.risk !== riskFilter) return false;
    if (statusFilter !== "All" && f.status !== statusFilter) return false;
    if (search && !(f.project + " " + f.reason + " " + f.evidence).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedFlag: AuditFlag | undefined = flags.find((f) => f.id === selectedId);
  const queue = milestones.filter((m) => m.status === "Submitted");
  const auditorNotes = notifications.filter((n) => n.role === "INDEPENDENT_AUDITOR");
  const auditEvents = events.filter((e) => e.role === "INDEPENDENT_AUDITOR").slice(0, 5);

  function handleResolve() {
    if (!selectedFlag) return;
    if (!isAuditor) { setResolveMsg("Only the Independent Auditor role can resolve a flag."); return; }
    if (!resolveNote.trim()) { setResolveMsg("Write a resolution note first, so the history shows what was checked."); return; }
    resolveFlag(selectedFlag.id, resolveNote.trim());
    setResolveMsg("Flag marked resolved. The note was added to its resolution history.");
    setResolveNote("");
  }

  function handleVerify(milestoneId: string, title: string) {
    if (!isAuditor) { setVerifyMsg("Only the Independent Auditor role can verify a milestone."); return; }
    verifyMilestone(milestoneId, "Independent Auditor");
    setVerifyMsg("Milestone verified: " + title + ". The verification now appears as an event in the citizen timeline.");
  }

  function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuditor) { setPubMsg("Only the Independent Auditor role can publish findings."); return; }
    if (!pubTitle.trim() || !pubSummary.trim()) { setPubMsg("Give the finding a title and a summary."); return; }
    const project = projects.find((p) => p.id === pubProjectId);
    const today = new Date().toISOString().slice(0, 10);
    const count = Math.max(1, Number(pubFindings) || 1);
    addEvent({
      date: today,
      type: "Audit report published",
      actor: "Independent Auditor",
      role: "INDEPENDENT_AUDITOR",
      description: pubTitle.trim() + ". " + count + " finding(s). " + pubSummary.trim(),
      projectId: pubProjectId,
      txRef: "SIM-ARC-" + today,
    });
    setLocalFindings((prev) => [
      { title: pubTitle.trim(), project: project?.name ?? pubProjectId, findings: count, summary: pubSummary.trim(), date: today },
      ...prev,
    ]);
    setPubMsg("Finding published. It now appears in the citizen timeline and on the public Audits page under recently published findings.");
    setPubTitle("");
    setPubSummary("");
    setPubFindings("1");
  }

  return (
    <WorkspaceLayout title="Independent Auditor" subtitle="Verify work, investigate risk flags, and publish findings. All figures are demo data.">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <DemoBadge />
        <span className="text-xs text-slate-400">Auditors can verify milestones, resolve flags, and publish findings. Auditors cannot change original financial records.</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open flags" value={String(openFlags.length)} sub="Stored flags awaiting review" tone="red" />
        <StatCard label="Critical flags" value={String(criticalFlags.length)} sub="Highest risk level, open" tone="red" />
        <StatCard label="Verified milestones" value={String(verifiedMilestones.length)} sub={"Of " + milestones.length + " milestones in demo data"} tone="green" />
        <StatCard label="Published reports" value={String(publishedCount)} sub={seedReports.length + " seeded reports, " + localFindings.length + " published this session"} tone="cyan" />
      </div>

      {!isAuditor ? (
        <Card className="mt-6 border-amber-300 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">Read only for this role.</p>
          <p className="mt-1 text-sm text-slate-700">You are signed in as {role}. Verification, flag resolution, and publishing need the Independent Auditor role. Switch role from the header to act as the auditor.</p>
        </Card>
      ) : null}

      <Card className="mt-6 border-cyan-200 bg-cyan-50 p-5">
        <h2 className="text-base font-semibold text-slate-900">Read only scope: original financial records cannot be changed here</h2>
        <p className="mt-1 text-sm text-slate-700">
          An auditor verifies work and records findings. This workspace has no edit controls for budgets, allocations, or payments, and no payment can be initiated from here.
          If a record looks wrong, raise or update a flag and publish a finding. Detection does not prove wrongdoing. Every flag is labelled Requires Investigation or Potential Discrepancy.
        </p>
      </Card>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white">Live risk scan</h2>
        <p className="mt-1 text-sm text-slate-400">
          Computed now from the current demo records. {computed.length} flags found: {computedByRisk.Critical} Critical, {computedByRisk.High} High, {computedByRisk.Medium} Medium, {computedByRisk.Low} Low.
          This scan can overlap the stored flags below, because stored flags were raised by earlier scans. A scan result is a prompt for investigation, not a verdict.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {computed.map((f) => (
            <RiskFlagCard key={f.id} flag={f} compact />
          ))}
          {computed.length === 0 ? <p className="text-sm text-slate-400">No risk flags from the live scan.</p> : null}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white">Risk flags</h2>
        <p className="mt-1 text-sm text-slate-400">Stored flags with investigation status, notes, and history. Select a flag to see its detail and resolve it.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Department</span>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option>All</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Risk</span>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option>All</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option>All</option><option>Open</option><option>Under Review</option><option>Resolved</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Project, reason, or evidence" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-400">{filteredFlags.length} of {flags.length} flags shown. All amounts are demo data.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            {filteredFlags.map((f) => (
              <RiskFlagCard key={f.id} flag={f} onSelect={(flag) => setSelectedId(flag.id)} selected={selectedId === f.id} />
            ))}
            {filteredFlags.length === 0 ? (
              <Card className="p-6 text-center"><p className="text-sm text-slate-600">No flags match these filters. Try clearing a filter.</p></Card>
            ) : null}
          </div>
          <div>
            {selectedFlag ? (
              <Card className="p-5 xl:sticky xl:top-24">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={selectedFlag.risk === "Critical" || selectedFlag.risk === "High" ? "red" : selectedFlag.risk === "Medium" ? "amber" : "slate"}>{selectedFlag.risk} risk</Badge>
                  <Badge tone={statusTone(selectedFlag.status)}>{selectedFlag.status}</Badge>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{selectedFlag.reason}</h3>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Project</dt><dd className="text-right font-medium text-slate-900"><Link to={"/projects/" + selectedFlag.projectId} className="text-cyan-700 hover:underline">{selectedFlag.project}</Link></dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Department</dt><dd className="text-right text-slate-900">{selectedFlag.department}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Amount</dt><dd className="text-right font-medium text-slate-900">{selectedFlag.amountInr > 0 ? formatINR(selectedFlag.amountInr) + " (demo data)" : "Not applicable to this record"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Investigation status</dt><dd className="text-right text-slate-900">{selectedFlag.status}</dd></div>
                </dl>
                <div className="mt-4 border-t border-slate-100 pt-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence</p>
                  <p className="mt-1 break-words text-slate-700">{selectedFlag.evidence}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Auditor notes</p>
                  <p className="mt-1 text-slate-700">{selectedFlag.notes || "No notes yet."}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Resolution history</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                    {selectedFlag.history.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
                {selectedFlag.status !== "Resolved" ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleResolve(); }}
                    className="mt-4 border-t border-slate-100 pt-4"
                  >
                    <label htmlFor="resolve-note" className="text-sm font-medium text-slate-900">Resolution note</label>
                    <textarea id="resolve-note" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={3} placeholder="What was checked, and what was found?" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    <button type="submit" disabled={!isAuditor} className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                      Mark resolved
                    </button>
                    {resolveMsg ? <p className="mt-2 text-sm text-emerald-700">{resolveMsg}</p> : null}
                  </form>
                ) : (
                  <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">This flag is resolved.</p>
                )}
              </Card>
            ) : (
              <Card className="p-6">
                <p className="text-sm text-slate-600">Select a flag on the left to see its project, department, amount, reason, evidence, risk level, investigation status, notes, and resolution history.</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white">Milestone verification queue</h2>
        <p className="mt-1 text-sm text-slate-400">
          {queue.length} milestone(s) submitted and awaiting verification. A contractor cannot verify their own work: verification is independent, only the Independent Auditor role can verify, and the submitting contractor is never the verifier.
          Verifying a milestone adds a public event, so it appears in the citizen timeline.
        </p>
        {verifyMsg ? <p className="mt-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{verifyMsg}</p> : null}
        <div className="mt-4 space-y-3">
          {queue.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{m.title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    <Link to={"/projects/" + m.projectId} className="text-cyan-700 hover:underline">{m.project}</Link>
                    {" . " + formatINR(m.amountInr) + " (demo data) . Due " + formatDate(m.dueDate)}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">Evidence hash: {m.evidenceHash ? shortHash(m.evidenceHash) : "None attached"}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Badge tone={statusTone(m.status)}>{m.status}</Badge>
                  <button type="button" onClick={() => handleVerify(m.id, m.title)} disabled={!isAuditor} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50">
                    Verify milestone
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {queue.length === 0 ? <Card className="p-6 text-center"><p className="text-sm text-slate-600">No milestones are waiting for verification.</p></Card> : null}
        </div>
        <p className="mt-3 text-sm text-slate-400">{verifiedMilestones.length} milestones already verified or paid in demo data.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-900">Publish audit findings</h2>
          <p className="mt-1 text-sm text-slate-600">
            Publishing adds a public event to the citizen timeline and lists the finding on the public Audits page. It does not edit any original financial record.
          </p>
          <form onSubmit={handlePublish} className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-900">Finding title</span>
              <input value={pubTitle} onChange={(e) => setPubTitle(e.target.value)} placeholder="For example: Delayed drainage milestone, Kanpur" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-900">Related project</span>
              <select value={pubProjectId} onChange={(e) => setPubProjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-900">Number of findings</span>
              <input type="number" min={1} value={pubFindings} onChange={(e) => setPubFindings(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-900">Summary</span>
              <textarea value={pubSummary} onChange={(e) => setPubSummary(e.target.value)} rows={4} placeholder="What was found, and what needs investigation. Use Requires Investigation or Potential Discrepancy, never a conclusion of wrongdoing." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
            </label>
            <button type="submit" disabled={!isAuditor} className="rounded-lg bg-[#080F1C] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              Publish finding
            </button>
            {pubMsg ? <p className="text-sm text-emerald-700">{pubMsg}</p> : null}
          </form>
          {localFindings.length > 0 ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-900">Published this session</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {localFindings.map((f, i) => (
                  <li key={i}><strong>{f.title}</strong> ({f.findings} finding(s), {formatDate(f.date)})<br /><span className="text-slate-600">{f.project}. {f.summary}</span></li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-900">Auditor notifications</h2>
            <ul className="mt-3 space-y-3">
              {auditorNotes.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-sm"><strong className="text-slate-900">{n.title}</strong><br /><span className="text-slate-600">{n.body}</span><br /><span className="text-xs text-slate-500">{formatDate(n.date)}</span></span>
                  {n.read ? <Badge tone="green">Read</Badge> : <button type="button" onClick={() => markNotificationRead(n.id)} className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white">Mark read</button>}
                </li>
              ))}
              {auditorNotes.length === 0 ? <li className="text-sm text-slate-600">No auditor notifications.</li> : null}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-900">Recent auditor events</h2>
            <p className="mt-1 text-sm text-slate-600">These events also appear in the citizen timeline, so the public can trace what the auditor did.</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {auditEvents.map((e) => (
                <li key={e.id}><strong>{e.type}</strong> . {e.description} <span className="text-slate-500">({formatDate(e.date)})</span></li>
              ))}
              {auditEvents.length === 0 ? <li className="text-sm text-slate-600">No auditor events yet.</li> : null}
            </ul>
            <DemoNotice />
          </Card>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
