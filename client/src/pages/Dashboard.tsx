import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowUpRight, ArrowDownLeft, Scale, TrendingUp, TrendingDown,
  Minus, Plus, Wallet, CalendarDays, BarChart3, Users,
  CreditCard, Receipt, Gem, Coins, AlertTriangle, Lightbulb, Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import CashFlowForecast from "@/components/CashFlowForecast";
import WealthTrendChart from "@/components/WealthTrendChart";
import { AchievementBadges, type Achievement } from "@/components/MilestoneToast";
import { useMemo } from "react";

const CATEGORY_COLORS: Record<string, string> = {
  "Groceries": "#6366f1", "Food & Dining": "#ec4899", "Utilities": "#ef4444",
  "Transport": "#10b981", "Entertainment": "#f59e0b", "Shopping": "#8b5cf6",
  "Medical": "#06b6d4", "Other": "#6b7280",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: summary, isLoading: summaryLoading } = trpc.balance.getDashboardSummary.useQuery(undefined, { enabled: !!user });
  const { data: balances, isLoading: balancesLoading } = trpc.balance.getAllBalances.useQuery(undefined, { enabled: !!user });
  const { data: payments, isLoading: paymentsLoading } = trpc.payment.list.useQuery(undefined, { enabled: !!user });
  const { data: breakdownData } = trpc.expense.getBreakdown.useQuery(undefined, { enabled: !!user });

  const isLoading = summaryLoading || balancesLoading || paymentsLoading;

  const totalPaid = summary?.totalPaid ?? 0;
  const totalPending = summary?.totalPending ?? 0;
  const totalOutstanding = summary?.totalOutstanding ?? 0;
  const totalCreditCardDebt = (summary as any)?.totalCreditCardDebt ?? 0;
  const totalGeneralExpense = (summary as any)?.totalGeneralExpense ?? 0;
  const totalGoldLoanPaid = (summary as any)?.totalGoldLoanPaid ?? 0;
  const paidPercent = totalOutstanding > 0 ? Math.round((totalPaid / totalOutstanding) * 100) : 0;

  const sortedBalances = useMemo(() => [...(balances ?? [])].sort((a, b) => b.netBalance - a.netBalance), [balances]);

  // Smart alerts
  const alerts = useMemo(() => {
    const result: { type: "warning" | "info" | "danger"; message: string }[] = [];
    if (!payments || !summary) return result;

    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    const upcoming = payments.filter(p => {
      if (p.status !== "pending") return false;
      const d = new Date(p.dueDate);
      return d >= now && d <= nextWeek;
    });
    if (upcoming.length > 0) {
      const total = upcoming.reduce((s, p) => s + p.amount, 0);
      result.push({ type: "warning", message: `${upcoming.length} payment${upcoming.length > 1 ? "s" : ""} due this week totalling ${formatCurrency(total)}` });
    }

    const overdue = payments.filter(p => p.status === "pending" && new Date(p.dueDate) < now);
    if (overdue.length > 0) {
      result.push({ type: "danger", message: `${overdue.length} overdue payment${overdue.length > 1 ? "s" : ""} need your attention` });
    }

    if (totalCreditCardDebt > 0 && totalGeneralExpense > 0) {
      result.push({ type: "info", message: "Consider clearing high-interest CC debt before adding more expenses" });
    }

    return result;
  }, [payments, summary, totalCreditCardDebt, totalGeneralExpense]);

  // Achievements
  const achievements = useMemo<Achievement[]>(() => {
    const list: Achievement[] = [];
    if (paidPercent >= 50) list.push({ id: "halfway", icon: "🎯", label: "50% Cleared", earned: true });
    if (paidPercent >= 100) list.push({ id: "all_paid", icon: "🏆", label: "Fully Paid", earned: true });
    if (sortedBalances.length >= 3) list.push({ id: "tracking", icon: "📊", label: "Active Tracker", earned: true });
    if (totalGoldLoanPaid > 0) list.push({ id: "gold", icon: "🪙", label: "Gold Loan Payer", earned: true });
    return list;
  }, [paidPercent, sortedBalances, totalGoldLoanPaid]);

  // Spending donut data
  const donutData = useMemo(() =>
    (breakdownData ?? [])
      .map(b => ({ name: b.category, value: Math.round(b.amount / 100), color: CATEGORY_COLORS[b.category] ?? "#6b7280" }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    [breakdownData]
  );

  const quickActions = [
    { icon: TrendingUp, label: "Add EMI", path: "/emi", color: "bg-primary/10 text-primary hover:bg-primary/20" },
    { icon: Wallet, label: "Add Loan", path: "/loans", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" },
    { icon: CalendarDays, label: "Month View", path: "/month", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20" },
    { icon: Users, label: "Manage People", path: "/persons", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-16" />
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Smart Alert Banners */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                alert.type === "danger"
                  ? "bg-red-500/8 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400"
                  : alert.type === "warning"
                    ? "bg-amber-500/8 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400"
                    : "bg-indigo-500/8 border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400"
              }`}
            >
              {alert.type === "info" ? <Lightbulb className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Achievements Strip */}
      {achievements.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <AchievementBadges achievements={achievements} />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="stat-card-success border-0 animate-slide-up hover:scale-[1.02] transition-transform duration-200 cursor-pointer" onClick={() => setLocation("/month")}>
          <CardContent className="pt-5 pb-5 px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Total Paid</p>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 number-display truncate">{formatCurrency(totalPaid)}</p>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[10px] text-emerald-700 dark:text-emerald-300">
                <span>Progress</span><span>{paidPercent}%</span>
              </div>
              <div className="h-1 rounded-full bg-emerald-200 dark:bg-emerald-900/50 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${paidPercent}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-warning border-0 animate-slide-up hover:scale-[1.02] transition-transform duration-200 cursor-pointer" onClick={() => setLocation("/month")}>
          <CardContent className="pt-5 pb-5 px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Total Pending</p>
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Scale className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 number-display truncate">{formatCurrency(totalPending)}</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-4 truncate">Awaiting payments</p>
          </CardContent>
        </Card>

        <Card className="stat-card-primary border-0 bg-red-500/10 dark:bg-red-950/20 animate-slide-up hover:scale-[1.02] transition-transform duration-200 cursor-pointer" onClick={() => setLocation("/credit-cards")}>
          <CardContent className="pt-5 pb-5 px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-red-800 dark:text-red-300">CC Debt (Sunny)</p>
              <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400 number-display truncate">{formatCurrency(totalCreditCardDebt)}</p>
            <p className="text-[10px] text-red-500 mt-4 truncate">Compounding card dues</p>
          </CardContent>
        </Card>

        <Card className="stat-card-primary border-0 bg-indigo-500/10 dark:bg-indigo-950/20 animate-slide-up hover:scale-[1.02] transition-transform duration-200 cursor-pointer" onClick={() => setLocation("/expenses")}>
          <CardContent className="pt-5 pb-5 px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">General Expense</p>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 number-display truncate">{formatCurrency(totalGeneralExpense)}</p>
            <p className="text-[10px] text-indigo-500 mt-4 truncate">Daily categorizable logs</p>
          </CardContent>
        </Card>

        <Card className="stat-card-primary border-0 bg-amber-500/10 dark:bg-amber-950/20 animate-slide-up hover:scale-[1.02] transition-transform duration-200 cursor-pointer" onClick={() => setLocation("/gold-loans")}>
          <CardContent className="pt-5 pb-5 px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Gold Loan Paid</p>
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Gem className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 number-display truncate">{formatCurrency(totalGoldLoanPaid)}</p>
            <p className="text-[10px] text-amber-600 mt-4 truncate">Interest logs paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action, idx) => (
          <button
            key={action.path}
            id={`quick-action-${action.path.replace("/", "")}`}
            onClick={() => setLocation(action.path)}
            className={`flex items-center gap-2.5 p-3.5 rounded-xl transition-all duration-150 text-left font-medium text-sm animate-slide-up stagger-${idx + 1} ${action.color}`}
          >
            <action.icon className="h-4 w-4 shrink-0" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Cash Flow Forecast — Phase 1 */}
      {payments && <CashFlowForecast payments={payments} />}

      {/* Spending Donut + Running Balance — Phase 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Donut */}
        {donutData.length > 0 && (
          <Card className="card-premium border-0 lg:col-span-1 cursor-pointer" onClick={() => setLocation("/expenses")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-primary" />
                Spending Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground">All-time by category</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value">
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-1.5">
                {donutData.slice(0, 3).map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">₹{d.value.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Running Balance */}
        <Card className={`card-premium border-0 ${donutData.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="h-5 w-5 text-primary" />
                  Running Balances
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Person-wise balance summary</p>
              </div>
              <Button id="view-all-balances-btn" variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs" onClick={() => setLocation("/balance")}>
                View all →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sortedBalances && sortedBalances.length > 0 ? (
              <div className="space-y-2">
                {sortedBalances.slice(0, 5).map((balance, idx) => (
                  <div key={balance.personId} className={`flex items-center justify-between p-3.5 rounded-xl transition-colors hover:bg-accent/50 animate-slide-up stagger-${Math.min(idx + 1, 5)}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                        balance.netBalance > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : balance.netBalance < 0 ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        {balance.person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{balance.person.name}</p>
                        {balance.person.notes && <p className="text-xs text-muted-foreground">{balance.person.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm number-display ${balance.netBalance > 0 ? "text-emerald-600 dark:text-emerald-400" : balance.netBalance < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                        {balance.netBalance > 0 ? "+" : ""}{formatCurrency(balance.netBalance)}
                      </p>
                      <div className={`flex items-center gap-1 justify-end mt-0.5 ${balance.netBalance > 0 ? "text-emerald-500" : balance.netBalance < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                        {balance.netBalance > 0 ? <TrendingUp className="h-3 w-3" /> : balance.netBalance < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        <span className="text-xs">{balance.netBalance > 0 ? "They owe you" : balance.netBalance < 0 ? "You owe them" : "Settled"}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {sortedBalances.length > 5 && (
                  <button onClick={() => setLocation("/balance")} className="w-full text-center text-sm text-primary hover:text-primary/80 py-2 transition-colors">
                    +{sortedBalances.length - 5} more — View all balances →
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Scale className="h-7 w-7 text-primary" />
                </div>
                <p className="text-foreground font-medium mb-1">No transactions yet</p>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">Start by adding a person, then create an EMI or loan entry.</p>
                <Button id="dashboard-add-person-btn" className="gap-2 btn-primary-glow" onClick={() => setLocation("/persons")}>
                  <Plus className="h-4 w-4" />Add Your First Person
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Wealth Trend — Phase 2 */}
      {balances && payments && balances.length > 0 && (
        <WealthTrendChart balances={balances} payments={payments} />
      )}
    </div>
  );
}
