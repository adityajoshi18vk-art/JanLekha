import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as seed from "../data/demoData";
import type { AuditFlag, AuditReport, Complaint, Contractor, Department, DocRecord, Milestone, NotificationItem, Payment, Project, Tender, TxEvent } from "../data/demoData";
import type { Role } from "../lib/permissions";
import { simulateArcPayment } from "../lib/arc";

export interface AppState {
  departments: Department[]; projects: Project[]; tenders: Tender[]; milestones: Milestone[]; contractors: Contractor[]; reports: AuditReport[];
  payments: Payment[]; documents: DocRecord[]; flags: AuditFlag[]; complaints: Complaint[];
  events: TxEvent[]; notifications: NotificationItem[];
  role: Role; setRole: (r: Role) => void;
  addDepartment: (d: Omit<Department, "id" | "allocatedInr" | "releasedInr" | "spentInr">) => void;
  addProject: (p: Omit<Project, "id" | "allocatedInr" | "releasedInr" | "spentInr" | "progress" | "status">) => void;
  createAllocation: (projectId: string, amountInr: number) => void;
  publishTender: (t: Omit<Tender, "id" | "bids" | "status">) => void;
  submitBid: (tenderId: string, contractorId: string, contractor: string, amountInr: number) => void;
  selectBid: (tenderId: string, bidId: string) => void;
  submitMilestone: (projectId: string, title: string, amountInr: number, dueDate: string) => void;
  verifyMilestone: (milestoneId: string, auditor: string) => void;
  initiatePayment: (projectId: string, milestoneId: string, amountInr: number, amountUsdc: number, payee: string) => string;
  addComplaint: (c: Omit<Complaint, "id" | "status" | "date" | "updates">) => void;
  resolveFlag: (flagId: string, note: string) => void;
  addDocument: (d: Omit<DocRecord, "id" | "verified">) => void;
  addReport: (r: Omit<AuditReport, "id" | "date" | "status">) => void;
  markNotificationRead: (id: string) => void;
  resetDemo: () => void;
  addEvent: (e: Omit<TxEvent, "id">) => void;
}
const Ctx = createContext<AppState | null>(null);
const KEY = "janlekha-demo-v1";
function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(KEY); if (!raw) return fallback; const parsed = JSON.parse(raw); return (parsed[key] as T) ?? fallback; } catch { return fallback; }
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => (localStorage.getItem("janlekha-role") as Role) || "CITIZEN");
  const [departments, setDepartments] = useState<Department[]>(() => load("departments", seed.departments));
  const contractors: Contractor[] = seed.contractors;
  const [reports, setReports] = useState<AuditReport[]>(() => load("reports", seed.reports));
  const [projects, setProjects] = useState<Project[]>(() => load("projects", seed.projects));
  const [tenders, setTenders] = useState<Tender[]>(() => load("tenders", seed.tenders));
  const [milestones, setMilestones] = useState<Milestone[]>(() => load("milestones", seed.milestones));
  const [payments, setPayments] = useState<Payment[]>(() => load("payments", seed.payments));
  const [documents, setDocuments] = useState<DocRecord[]>(() => load("documents", seed.documents));
  const [flags, setFlags] = useState<AuditFlag[]>(() => load("flags", seed.flags));
  const [complaints, setComplaints] = useState<Complaint[]>(() => load("complaints", seed.complaints));
  const [events, setEvents] = useState<TxEvent[]>(() => load("events", seed.events));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => load("notifications", seed.notifications));
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ departments, projects, tenders, milestones, payments, documents, flags, complaints, events, notifications, reports })); } catch { /* storage unavailable */ }
  }, [departments, projects, tenders, milestones, payments, documents, flags, complaints, events, notifications, reports]);
  const setRole = (r: Role) => { setRoleState(r); try { localStorage.setItem("janlekha-role", r); } catch { /* ignore */ } };
  const uid = (p: string) => p + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 9000 + 1000);
  const today = () => new Date().toISOString().slice(0, 10);
  const addEvent = (e: Omit<TxEvent, "id">) => setEvents((prev) => [{ ...e, id: uid("ev") }, ...prev]);
  const notify = (roleR: string, title: string, body: string) => setNotifications((prev) => [{ id: uid("nt"), role: roleR, title, body, date: today(), read: false }, ...prev]);
  const value: AppState = useMemo(() => ({
    departments, projects, tenders, milestones, payments, documents, flags, complaints, events, notifications, contractors, reports, role, setRole, addEvent,
    addDepartment: (d) => { const nd: Department = { ...d, id: uid("dept"), allocatedInr: 0, releasedInr: 0, spentInr: 0 }; setDepartments((p) => [...p, nd]); addEvent({ date: today(), type: "Department created", actor: "Government Administrator", role: "GOVERNMENT_ADMIN", description: "Department " + d.name + " created with budget.", projectId: "", txRef: "SIM-ARC-" + today() }); notify("GOVERNMENT_ADMIN", "Department created", d.name + " was added."); },
    addProject: (p) => { const np: Project = { ...p, id: uid("proj"), allocatedInr: 0, releasedInr: 0, spentInr: 0, progress: 0, status: "New" }; setProjects((prev) => [...prev, np]); addEvent({ date: today(), type: "Project registered", actor: "Government Administrator", role: "GOVERNMENT_ADMIN", description: "Project " + p.name + " registered.", projectId: np.id, txRef: "SIM-ARC-" + today() }); },
    createAllocation: (projectId, amountInr) => { setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, allocatedInr: p.allocatedInr + amountInr, releasedInr: p.releasedInr + amountInr } : p)); const pr = projects.find((p) => p.id === projectId); addEvent({ date: today(), type: "Budget allocated", actor: "Finance Officer", role: "FINANCE_OFFICER", description: "Allocation approved for " + (pr?.name ?? projectId) + ".", projectId, txRef: "SIM-ARC-" + today() }); notify("FINANCE_OFFICER", "Allocation approved", "Funds allocated for " + (pr?.name ?? projectId) + "."); },
    publishTender: (t) => { const nt: Tender = { ...t, id: uid("ten"), bids: [], status: "Open" }; setTenders((p) => [...p, nt]); addEvent({ date: today(), type: "Tender published", actor: "Procurement Officer", role: "PROCUREMENT_OFFICER", description: "Tender " + t.title + " published.", projectId: t.projectId, txRef: "SIM-ARC-" + today() }); },
    submitBid: (tenderId, contractorId, contractor, amountInr) => { setTenders((prev) => prev.map((t) => t.id === tenderId ? { ...t, bids: [...t.bids, { id: uid("bid"), contractorId, contractor, amountInr, status: "Submitted", submitted: today() }] } : t)); },
    selectBid: (tenderId, bidId) => { setTenders((prev) => prev.map((t) => t.id === tenderId ? { ...t, status: "Awarded", bids: t.bids.map((b) => ({ ...b, status: b.id === bidId ? "Selected" : "Not selected" })) } : t)); const t = tenders.find((x) => x.id === tenderId); const b = t?.bids.find((x) => x.id === bidId); addEvent({ date: today(), type: "Bid selected", actor: "Procurement Officer", role: "PROCUREMENT_OFFICER", description: "Bid selected for " + (t?.title ?? tenderId) + ": " + (b?.contractor ?? ""), projectId: t?.projectId ?? "", txRef: "SIM-ARC-" + today() }); },
    submitMilestone: (projectId, title, amountInr, dueDate) => { const pr = projects.find((p) => p.id === projectId); const nm: Milestone = { id: uid("ms"), projectId, project: pr?.name ?? projectId, title, amountInr, dueDate, status: "Submitted", evidenceHash: "", verifiedBy: "" }; setMilestones((p) => [...p, nm]); addEvent({ date: today(), type: "Milestone submitted", actor: "Contractor", role: "CONTRACTOR", description: "Milestone " + title + " submitted for " + (pr?.name ?? projectId) + ".", projectId, txRef: "SIM-ARC-" + today() }); notify("INDEPENDENT_AUDITOR", "Milestone awaiting verification", title + " was submitted."); },
    verifyMilestone: (milestoneId, auditor) => { setMilestones((prev) => prev.map((m) => m.id === milestoneId ? { ...m, status: "Verified", verifiedBy: auditor } : m)); const m = milestones.find((x) => x.id === milestoneId); addEvent({ date: today(), type: "Milestone verified", actor: auditor, role: "INDEPENDENT_AUDITOR", description: "Milestone " + (m?.title ?? milestoneId) + " verified.", projectId: m?.projectId ?? "", txRef: "SIM-ARC-" + today() }); notify("CONTRACTOR", "Milestone verified", (m?.title ?? "") + " was verified."); },
    initiatePayment: (projectId, milestoneId, amountInr, amountUsdc, payee) => { const sim = simulateArcPayment(amountUsdc); const pr = projects.find((p) => p.id === projectId); const np: Payment = { id: uid("pay"), projectId, project: pr?.name ?? projectId, milestoneId, payee, amountInr, amountUsdc, txRef: sim.ref, status: "Settled", date: today(), kind: "Milestone payment", simulated: true }; setPayments((p) => [np, ...p]); setMilestones((prev) => prev.map((m) => m.id === milestoneId ? { ...m, status: "Paid" } : m)); setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, spentInr: p.spentInr + amountInr } : p)); addEvent({ date: today(), type: "Payment settled", actor: "Finance Officer", role: "FINANCE_OFFICER", description: "Simulated USDC payment settled to " + payee + " for " + (pr?.name ?? projectId) + ".", projectId, txRef: sim.ref }); return sim.ref; },
    addComplaint: (c) => { const nc: Complaint = { ...c, id: uid("cmp"), status: "Submitted", date: today(), updates: [today() + ": Complaint received."] }; setComplaints((p) => [nc, ...p]); addEvent({ date: today(), type: "Complaint submitted", actor: c.citizen, role: "CITIZEN", description: "Complaint submitted for " + c.project + ": " + c.subject, projectId: c.projectId, txRef: "SIM-ARC-" + today() }); },
    resolveFlag: (flagId, note) => { const f = flags.find((x) => x.id === flagId); setFlags((prev) => prev.map((x) => x.id === flagId ? { ...x, status: "Resolved", notes: note, history: [...x.history, today() + ": " + note] } : x)); addEvent({ date: today(), type: "Audit flag resolved", actor: "Independent Auditor", role: "INDEPENDENT_AUDITOR", description: "Risk flag resolved for " + (f?.project ?? flagId) + ".", projectId: f?.projectId ?? "", txRef: "SIM-ARC-" + today() }); },
    addDocument: (d) => { const nd: DocRecord = { ...d, id: uid("doc"), verified: false }; setDocuments((p) => [nd, ...p]); },
    addReport: (r) => { const nr: AuditReport = { ...r, id: uid("rep"), date: today(), status: "Published" }; setReports((p) => [nr, ...p]); addEvent({ date: today(), type: "Audit report published", actor: r.auditor, role: "INDEPENDENT_AUDITOR", description: "Audit report published: " + r.title, projectId: r.projectId, txRef: "SIM-ARC-" + today() }); },
    markNotificationRead: (id) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n)),
    resetDemo: () => { setDepartments(seed.departments); setProjects(seed.projects); setTenders(seed.tenders); setMilestones(seed.milestones); setPayments(seed.payments); setDocuments(seed.documents); setFlags(seed.flags); setComplaints(seed.complaints); setEvents(seed.events); setNotifications(seed.notifications); setReports(seed.reports); try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [departments, projects, tenders, milestones, payments, documents, flags, complaints, events, notifications, reports, role]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useApp(): AppState { const v = useContext(Ctx); if (!v) throw new Error("useApp must be used inside AppProvider"); return v; }
