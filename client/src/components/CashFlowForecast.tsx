import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, AlertTriangle, Info } from "lucide-react";

type Payment = { amount: number; dueDate: string | Date; status: string };
type Props = { payments: Payment[] };

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card shadow-lg px-4 py-3 text-sm min-w-[180px]">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          <span className="text-muted-foreground">Projected outflow</span>
        </div>
        <span className="font-bold">{formatCurrency((payload[0]?.value ?? 0) * 100)}</span>
      </div>
    </div>
  );
}

export default function CashFlowForecast({ payments }: Props) {
  const forecast = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const target = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const y = target.getFullYear(), m = target.getMonth();
      const outflow = Math.round(
        payments
          .filter(p => p.status === "pending" && (() => { const d = new Date(p.dueDate); return d.getFullYear() === y && d.getMonth() === m; })())
          .reduce((s, p) => s + p.amount / 100, 0)
      );
      return { month: `${MONTH_NAMES[m]} '${String(y).slice(2)}`, outflow };
    });
  }, [payments]);

  const avgOutflow = forecast.reduce((s, d) => s + d.outflow, 0) / 6;
  const highThreshold = avgOutflow * 1.4;
  const peak = forecast.reduce((max, d) => d.outflow > max.outflow ? d : max, forecast[0]);
  const hasData = forecast.some(d => d.outflow > 0);

  return (
    <Card className="card-premium border-0">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              6-Month Cash Flow Forecast
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Projected outflows from pending EMIs &amp; loans</p>
          </div>
          {hasData && peak.outflow > highThreshold && (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-3.5 w-3.5" />Heavy month: {peak.month}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center gap-2 h-40 text-muted-foreground">
            <Info className="h-8 w-8 opacity-40" />
            <p className="text-sm">No pending payments to forecast</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={forecast} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.55 0.25 265)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="oklch(0.55 0.25 265)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CustomTooltip />} />
                {highThreshold > 0 && (
                  <ReferenceLine y={highThreshold} stroke="oklch(0.72 0.18 75)" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{ value: "Avg +40%", position: "insideTopRight", fontSize: 10, fill: "oklch(0.72 0.18 75)" }} />
                )}
                <Area type="monotone" dataKey="outflow" stroke="oklch(0.55 0.25 265)" strokeWidth={2.5}
                  fill="url(#outflowGrad)" dot={{ fill: "oklch(0.55 0.25 265)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-muted-foreground mt-1 text-center">
              Avg monthly outflow: <span className="font-semibold text-foreground">{formatCurrency(Math.round(avgOutflow) * 100)}</span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
