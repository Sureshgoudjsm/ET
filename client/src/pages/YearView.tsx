import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { TrendingUp, CheckCircle2, Clock, BarChart3, Download } from "lucide-react";
import { toast } from "sonner";

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Custom tooltip for the chart
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
          <span className="font-medium text-foreground">
            {formatCurrency(entry.value * 100)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function YearView() {
  const { user } = useAuth();
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear().toString());

  const { data: breakdown, isLoading } = trpc.balance.getMonthlyBreakdown.useQuery(
    { year: parseInt(year) },
    { enabled: !!user }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // breakdown values are stored in paise, divide by 100 for rupees display in chart
  const chartData = MONTHS_SHORT.map((month, index) => {
    const monthData = breakdown?.[index + 1];
    return {
      month,
      paid: (monthData?.paid ?? 0) / 100,    // in rupees for chart
      pending: (monthData?.pending ?? 0) / 100,
    };
  });

  // totals in paise (as stored), then format with formatCurrency which expects paise
  const totalPaid = Object.values(breakdown ?? {}).reduce((sum, m) => sum + (m.paid ?? 0), 0);
  const totalPending = Object.values(breakdown ?? {}).reduce((sum, m) => sum + (m.pending ?? 0), 0);
  const totalTracked = totalPaid + totalPending;
  const paidPercent = totalTracked > 0 ? Math.round((totalPaid / totalTracked) * 100) : 0;

  // year range
  const yearRange = Array.from({ length: 8 }, (_, i) => currentDate.getFullYear() - 5 + i);

  const handleExportCSV = () => {
    if (!breakdown) {
      toast.error("No breakdown data available to export");
      return;
    }

    const headers = [
      "Month",
      "Paid Amount (Rupees)",
      "Pending Amount (Rupees)",
      "Total Amount (Rupees)"
    ];

    const rows = MONTHS_FULL.map((monthName, index) => {
      const monthData = breakdown[index + 1];
      const paid = ((monthData?.paid ?? 0) / 100).toFixed(2);
      const pending = ((monthData?.pending ?? 0) / 100).toFixed(2);
      const total = (((monthData?.paid ?? 0) + (monthData?.pending ?? 0)) / 100).toFixed(2);

      return [
        monthName,
        paid,
        pending,
        total
      ];
    });

    // Add annual total row at the end
    const totalPaidRupees = (totalPaid / 100).toFixed(2);
    const totalPendingRupees = (totalPending / 100).toFixed(2);
    const totalTrackedRupees = (totalTracked / 100).toFixed(2);
    
    rows.push([
      "Annual Total",
      totalPaidRupees,
      totalPendingRupees,
      totalTrackedRupees
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => {
            const strValue = String(value).replace(/"/g, '""');
            return strValue.includes(",") || strValue.includes("\n") || strValue.includes('"')
              ? `"${strValue}"`
              : strValue;
          })
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `annual_breakdown_${year}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file exported successfully!");
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground number-display">Year View</h1>
          <p className="text-muted-foreground mt-1">Annual financial trends and breakdown</p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger id="year-select" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearRange.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card-success border-0 animate-slide-up stagger-1">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Total Paid in {year}</p>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 number-display">
              {formatCurrency(totalPaid)}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-emerald-200 dark:bg-emerald-900/50 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">{paidPercent}% of total</p>
          </CardContent>
        </Card>

        <Card className="stat-card-warning border-0 animate-slide-up stagger-2">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Total Pending in {year}</p>
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 number-display">
              {formatCurrency(totalPending)}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-amber-200 dark:bg-amber-900/50 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${100 - paidPercent}%` }}
              />
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{100 - paidPercent}% of total</p>
          </CardContent>
        </Card>

        <Card className="stat-card-primary border-0 animate-slide-up stagger-3">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Total Tracked in {year}</p>
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 number-display">
              {formatCurrency(totalTracked)}
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-3">
              Across all EMIs and loans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="card-premium border-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Monthly Breakdown — {year}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Paid vs Pending amounts per month</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} barGap={4} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent)", radius: 4 }} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
              />
              <Bar dataKey="paid" name="Paid" fill="oklch(0.62 0.18 150)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="oklch(0.72 0.18 75)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Details Table */}
      <Card className="card-premium border-0">
        <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Monthly Breakdown Table</CardTitle>
          </div>
          <Button
            id="export-year-csv-btn"
            variant="outline"
            size="sm"
            className="h-9 bg-background border-border hover:bg-accent flex items-center gap-1.5 animate-fade-in"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Month</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Paid</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Pending</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS_FULL.map((monthName, index) => {
                  const monthData = breakdown?.[index + 1];
                  const paid = monthData?.paid ?? 0;         // in paise
                  const pending = monthData?.pending ?? 0;    // in paise
                  const total = paid + pending;
                  const hasData = total > 0;
                  const currentMonth = currentDate.getMonth();
                  const isCurrentMonth = parseInt(year) === currentDate.getFullYear() && index === currentMonth;

                  return (
                    <tr
                      key={index}
                      className={`border-b border-border transition-colors ${
                        isCurrentMonth ? "bg-primary/5" : hasData ? "hover:bg-accent/50" : "opacity-50"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isCurrentMonth ? "text-primary" : "text-foreground"}`}>
                            {monthName}
                          </span>
                          {isCurrentMonth && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                              Current
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`font-medium number-display ${hasData && paid > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                          {formatCurrency(paid)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`font-medium number-display ${hasData && pending > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                          {formatCurrency(pending)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`font-semibold number-display ${hasData ? "text-foreground" : "text-muted-foreground"}`}>
                          {formatCurrency(total)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="py-3 px-4 font-bold text-foreground">Annual Total</td>
                  <td className="text-right py-3 px-4 font-bold number-display text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalPaid)}
                  </td>
                  <td className="text-right py-3 px-4 font-bold number-display text-amber-600 dark:text-amber-400">
                    {formatCurrency(totalPending)}
                  </td>
                  <td className="text-right py-3 px-4 font-bold number-display text-foreground">
                    {formatCurrency(totalTracked)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
