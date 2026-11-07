import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINRCompact } from "../lib/format";

export const CHART_COLORS = ["#0891B2", "#22D3EE", "#0B1626", "#34D399", "#F59E0B", "#6366F1", "#EC4899", "#14B8A6"];

export interface MoneyBarDatum {
  name: string;
  Budget: number;
  Allocated: number;
  Released: number;
  Spent: number;
}

export function MoneyBarChart({ data }: { data: MoneyBarDatum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => formatINRCompact(v)} tick={{ fontSize: 12 }} width={70} />
          <Tooltip formatter={(v) => formatINRCompact(Number(v))} />
          <Legend />
          <Bar dataKey="Budget" fill="#0B1626" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Allocated" fill="#0891B2" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Released" fill="#22D3EE" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Spent" fill="#34D399" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface PieDatum {
  name: string;
  value: number;
}

export function SharePieChart({ data }: { data: PieDatum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={false}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatINRCompact(Number(v))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface LineDatum {
  label: string;
  Released: number;
  Spent: number;
}

export function FlowLineChart({ data }: { data: LineDatum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => formatINRCompact(v)} tick={{ fontSize: 12 }} width={70} />
          <Tooltip formatter={(v) => formatINRCompact(Number(v))} />
          <Legend />
          <Line type="monotone" dataKey="Released" stroke="#22D3EE" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Spent" stroke="#34D399" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
