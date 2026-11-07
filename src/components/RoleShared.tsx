import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useApp } from "../context/AppContext";
import { ROLE_LABELS, ROLE_ROUTES, type Role } from "../lib/permissions";
import type { NotificationItem, TxEvent } from "../data/demoData";
import { formatDate } from "../lib/format";
import { Badge, statusTone } from "./ui";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-[#111D2E] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none";

/** Dark card for workspace dashboards. WorkspaceLayout already supplies the navy background. */
export function DarkCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={"rounded-2xl border border-white/10 bg-[#0B1626] p-5 " + className}>{children}</section>
  );
}

export function DarkCardTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {sub ? <p className="mt-1 text-sm text-slate-400">{sub}</p> : null}
    </div>
  );
}

const statTones: Record<string, string> = {
  cyan: "text-cyan-400",
  green: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  white: "text-white",
};

export function DarkStat({
  label,
  value,
  sub,
  tone = "cyan",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "cyan" | "green" | "amber" | "red" | "white";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B1626] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={"mt-2 text-2xl font-bold tracking-tight " + statTones[tone]}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      required={props.required}
      min={props.min}
      step={props.step}
      className={inputCls}
    />
  );
}

export function SelectInput(props: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      required={props.required}
      className={inputCls}
    >
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TextAreaInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      required={props.required}
      rows={props.rows ?? 3}
      className={inputCls}
    />
  );
}

export function PrimaryButton(props: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#080F1C] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {props.children}
    </button>
  );
}

export function GhostButton(props: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {props.children}
    </button>
  );
}

export function SuccessNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300" role="status">
      {message}
    </div>
  );
}

export function DemoStrip({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
      <span className="font-semibold">DEMO DATA:</span> {text}
    </p>
  );
}

export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-200">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={"px-3 py-2.5 align-top " + className}>{children}</td>;
}

export function AccessDenied({ required }: { required: Role }) {
  const { role, setRole } = useApp();
  const navigate = useNavigate();
  const switchTo = () => {
    setRole(required);
    navigate(ROLE_ROUTES[required]);
  };
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-400/30 bg-[#0B1626] p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Access denied</p>
      <h2 className="mt-2 text-xl font-bold text-white">This workspace needs a different role</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Required role: <span className="font-semibold text-white">{ROLE_LABELS[required]}</span>
        <br />
        Current role: <span className="font-semibold text-white">{ROLE_LABELS[role]}</span>
        <br />
        Demo sign in is local only. Production must enforce this check server side, not only in the page.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <PrimaryButton onClick={switchTo}>Switch to {ROLE_LABELS[required]}</PrimaryButton>
        <GhostButton onClick={() => navigate("/login")}>Choose another role</GhostButton>
      </div>
    </div>
  );
}

export function ActivityTimeline({ events, limit = 8 }: { events: TxEvent[]; limit?: number }) {
  const shown = events.slice(0, limit);
  if (shown.length === 0) {
    return <p className="text-sm text-slate-400">No activity yet in this demo session.</p>;
  }
  return (
    <ol className="space-y-4">
      {shown.map((e) => (
        <li key={e.id} className="border-l-2 border-cyan-400/40 pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(e.type)}>{e.type}</Badge>
            <span className="text-xs text-slate-500">{formatDate(e.date)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-200">{e.description}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {e.actor} ({e.role})
            {e.txRef ? " | Ref: " + e.txRef : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function NotificationsPanel({ role, items }: { role: Role; items: NotificationItem[] }) {
  const { markNotificationRead } = useApp();
  const mine = items.filter((n) => n.role === role || n.role === "ALL");
  const unread = mine.filter((n) => !n.read).length;
  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">
        {unread} unread notification{unread === 1 ? "" : "s"} for {ROLE_LABELS[role]}.
      </p>
      {mine.length === 0 ? (
        <p className="text-sm text-slate-400">No notifications for this role.</p>
      ) : (
        <ul className="space-y-3">
          {mine.slice(0, 8).map((n) => (
            <li
              key={n.id}
              className={"rounded-xl border p-3 " + (n.read ? "border-white/5 bg-white/[0.02]" : "border-cyan-400/30 bg-cyan-400/5")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(n.date)}</p>
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.id)}
                    className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5"
                  >
                    Mark read
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-emerald-400">Read</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
