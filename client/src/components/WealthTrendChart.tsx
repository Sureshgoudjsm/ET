import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { LineChart, TrendingUp } from "lucide-react";

type BalanceEntry = { personId: number; person: { name: string }; netBalance: number };
type Payment = { amount: number; dueDate: string | Date; status: string; personId?: number | null };

type Props = {
  balances: BalanceEntry[];
  payments: Payment[];
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const COLORS = [
  "oklch(0.55 0.25 265)",
  "oklch(0.62 0.18 150)",
  "oklch(0.72 0.18 75)",
  "oklch(0.55 0.22 310)",
  "oklch(0.65 0.20 20)",
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card shadow-lg px-4 py-3 text-sm min-w-[200px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground text-xs">{entry.name}</span>
          </div>
          <span className={`font-semibold text-xs ${entry.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
            {entry.value >= 0 ? "+" : ""}{formatCurrency(entry.value * 100)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function WealthTrendChart({ balances, payments }: Props) {
  // Build 6-month rolling net balance trend per person (top 3 by absolute balance)
  const top3 = [...balances]
    .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance))
    .slice(0, 3);

  const now = new Date();
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const target = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const y = target.getFullYear(), m = target.getMonth();
    const label = `${MONTH_NAMES[m]} '${String(y).slice(2)}`;

    const row: Record<string, number | string> = { month: label };
    for (const bal of top3) {
      // Cumulative paid from this person up to end of this month
      const paid = payments
        .filter(p => {
          const d = new Date(p.dueDate);
          return p.status === "paid" && p.personId === bal.personId
            && (d.getFullYear() < y || (d.getFullYear() === y && d.getMonth() <= m));
        })
        .reduce((s, p) => s + p.amount / 100, 0);
      row[bal.person.name] = Math.round(paid);
    }
    return row;
  });

  if (top3.length === 0) return null;

  return (
    <Card className="card-premium border-0">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Per-Person Cumulative Paid Trend
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-0.5">Rolling 6-month payment history by individual</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {top3.map((bal, i) => (
                <linearGradient key={bal.personId} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
            {top3.map((bal, i) => (
              <Area key={bal.personId} type="monotone" dataKey={bal.person.name}
                stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                fill={`url(#grad${i})`}
                dot={{ fill: COLORS[i % COLORS.length], strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
