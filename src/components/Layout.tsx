import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ROLE_LABELS, ROLE_ROUTES, type Role } from "../lib/permissions";
import { DemoBadge } from "./ui";
import WalletConnect from "./WalletConnect";

export function PublicLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/", label: "Home" }, { to: "/money-flow", label: "Where Did My Money Go" }, { to: "/departments", label: "Departments" },
    { to: "/projects", label: "Projects" }, { to: "/tenders", label: "Tenders" }, { to: "/payments", label: "Payments" },
    { to: "/documents", label: "Documents" }, { to: "/audits", label: "Audits" }, { to: "/map", label: "Map" }, { to: "/complaints", label: "Complaints" },
  ];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#080F1C] text-lg font-bold text-cyan-400">JL</span>
            <span><span className="block text-lg font-bold leading-none tracking-tight">JanLekha</span><span className="block text-[11px] font-medium text-slate-500">Public Financial Transparency</span></span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">{links.map((l) => <NavLink key={l.to} to={l.to} className={({ isActive }) => "rounded-lg px-3 py-2 text-sm font-medium " + (isActive ? "bg-cyan-50 text-cyan-700" : "text-slate-600 hover:bg-slate-100")}>{l.label}</NavLink>)}</nav>
          <div className="flex items-center gap-2">
            <DemoBadge />
            <button onClick={() => navigate("/login")} className="hidden rounded-lg bg-[#080F1C] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:block">Sign in as a role</button>
            <button onClick={() => setOpen(!open)} className="rounded-lg border px-3 py-2 text-sm lg:hidden" aria-label="Menu">Menu</button>
          </div>
        </div>
        {open ? <nav className="border-t px-4 py-3 lg:hidden">{links.map((l) => <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">{l.label}</NavLink>)}<button onClick={() => navigate("/login")} className="mt-2 w-full rounded-lg bg-[#080F1C] px-4 py-2 text-sm font-semibold text-white">Sign in as a role</button></nav> : null}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-slate-600 sm:px-6">
          <p><strong className="text-slate-900">JanLekha</strong> is a demonstration of public financial transparency. All figures on this site are realistic synthetic demo data, not actual government expenditure.</p>
          <div className="flex gap-4"><Link className="hover:text-cyan-700" to="/verify">Verify a document</Link><Link className="hover:text-cyan-700" to="/audits">Audit reports</Link><Link className="hover:text-cyan-700" to="/login">Role workspaces</Link></div>
        </div>
      </footer>
    </div>
  );
}

const WORKSPACE_NAV: Record<Role, { to: string; label: string }[]> = {
  GOVERNMENT_ADMIN: [{ to: "/app/admin", label: "Overview" }, { to: "/departments", label: "Departments" }, { to: "/projects", label: "Projects" }, { to: "/audits", label: "Audit reports" }, { to: "/", label: "Public portal" }],
  FINANCE_OFFICER: [{ to: "/app/finance", label: "Overview" }, { to: "/projects", label: "Projects" }, { to: "/payments", label: "Payments" }, { to: "/departments", label: "Departments" }, { to: "/", label: "Public portal" }],
  PROCUREMENT_OFFICER: [{ to: "/app/procurement", label: "Overview" }, { to: "/tenders", label: "Tenders" }, { to: "/projects", label: "Projects" }, { to: "/documents", label: "Documents" }, { to: "/", label: "Public portal" }],
  CONTRACTOR: [{ to: "/app/contractor", label: "Overview" }, { to: "/projects", label: "My projects" }, { to: "/tenders", label: "Tenders" }, { to: "/payments", label: "Payments" }, { to: "/", label: "Public portal" }],
  INDEPENDENT_AUDITOR: [{ to: "/app/auditor", label: "Overview" }, { to: "/audits", label: "Audit reports" }, { to: "/projects", label: "Projects" }, { to: "/documents", label: "Documents" }, { to: "/", label: "Public portal" }],
  CITIZEN: [{ to: "/app/citizen", label: "Overview" }, { to: "/projects", label: "Projects" }, { to: "/money-flow", label: "Where Did My Money Go" }, { to: "/verify", label: "Verify a document" }, { to: "/complaints", label: "Complaints" }, { to: "/", label: "Public portal" }],
};

export function WorkspaceLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const { role, setRole, notifications } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read && (n.role === role || n.role === "ALL")).length;
  const nav = WORKSPACE_NAV[role];
  return (
    <div className="min-h-screen bg-[#080F1C] text-slate-100 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0B1626] p-5 lg:flex">
        <Link to="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20 text-lg font-bold text-cyan-400">JL</span><span><span className="block text-lg font-bold leading-none">JanLekha</span><span className="block text-[11px] text-slate-400">Government workspace</span></span></Link>
        <div className="mt-6 rounded-xl bg-white/5 p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Signed in as</p><p className="mt-1 text-sm font-semibold text-white">{ROLE_LABELS[role]}</p><p className="text-xs text-slate-400">Demo role, local only. No real account.</p></div>
        <nav className="mt-6 space-y-1">{nav.map((l) => <NavLink key={l.to} to={l.to} className={({ isActive }) => "block rounded-lg px-3 py-2 text-sm font-medium " + (isActive ? "bg-cyan-400/15 text-cyan-300" : "text-slate-300 hover:bg-white/5")}>{l.label}</NavLink>)}</nav>
        <div className="mt-auto pt-6"><WalletConnect compact /><button onClick={() => navigate("/login")} className="mt-3 w-full rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/5">Switch role</button><button onClick={() => navigate("/")} className="mt-2 w-full rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white">Back to public portal</button></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080F1C]/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>{subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}</div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">{unread} unread notifications</span>
              <select value={role} onChange={(e) => { const r = e.target.value as Role; setRole(r); navigate(ROLE_ROUTES[r]); }} className="rounded-lg border border-white/15 bg-[#111D2E] px-3 py-2 text-sm text-white" aria-label="Switch role">
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <button onClick={() => setOpen(!open)} className="rounded-lg border border-white/15 px-3 py-2 text-sm lg:hidden">Menu</button>
            </div>
          </div>
          {open ? <nav className="mt-3 space-y-1 lg:hidden">{nav.map((l) => <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/5">{l.label}</NavLink>)}</nav> : null}
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
