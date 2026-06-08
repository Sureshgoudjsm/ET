import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Bell, CalendarDays, CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const { data: payments, isLoading: isPaymentsLoading } = trpc.payment.list.useQuery();
  const { data: persons } = trpc.person.list.useQuery();

  const isLoading = isPaymentsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Filter pending payments due in next 10 days (or all pending payments if dates are past)
  const pendingPayments = payments?.filter((p) => p.status === "pending") ?? [];
  
  // Sort by due date
  const activeAlerts = [...pendingPayments].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  // Filter recently paid payments for the activity timeline
  const recentlyPaid = payments
    ?.filter((p) => p.status === "paid" && p.paidDate)
    .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())
    .slice(0, 5) ?? [];

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground number-display">Notifications</h1>
        <p className="text-muted-foreground mt-1">Payment alerts, ledger audits, and system notifications</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Critical Alerts / Reminders - Left 2 Columns */}
        <div className="md:col-span-2 space-y-4">
          <Card className="card-premium border-0">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Due Payment Reminders
                </CardTitle>
                <CardDescription>Ledger records awaiting your clearance</CardDescription>
              </div>
              {activeAlerts.length > 0 && (
                <span className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 font-semibold px-2 py-0.5 rounded-full animate-pulse">
                  {activeAlerts.length} Action Needed
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAlerts.length > 0 ? (
                activeAlerts.map((alert) => {
                  const person = persons?.find((p) => p.id === alert.personId);
                  const isOverdue = new Date(alert.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

                  return (
                    <div
                      key={alert.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-3 transition-all ${
                        isOverdue
                          ? "bg-red-500/5 dark:bg-red-950/10 border-red-200 dark:border-red-900/40"
                          : "bg-background border-border hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isOverdue ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                        }`}>
                          {isOverdue ? <AlertTriangle className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {alert.emiId ? "EMI Contribution" : "Loan Repayment"} — {person?.name ?? "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {alert.notes || (alert.emiId ? "Monthly contribution" : "Personal loan due")}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={isOverdue ? "text-red-600 dark:text-red-400 font-medium animate-pulse" : "text-muted-foreground"}>
                              Due Date: {formatDate(alert.dueDate)} {isOverdue && "(Overdue)"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                        <div className="sm:text-right">
                          <p className="text-sm font-bold text-foreground number-display">{formatCurrency(alert.amount)}</p>
                          <span className="text-[10px] text-muted-foreground capitalize">Pending</span>
                        </div>
                        <button
                          onClick={() => setLocation("/month")}
                          className="h-8 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          Resolve
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">All Cleared!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No pending payments or upcoming EMIs found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed & Info - Right 1 Column */}
        <div className="space-y-4">
          <Card className="card-premium border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Clearance Activity
              </CardTitle>
              <CardDescription>Audits of recently settled payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {recentlyPaid.length > 0 ? (
                <div className="relative border-l border-border pl-4 space-y-4 text-xs">
                  {recentlyPaid.map((payment) => {
                    const person = persons?.find((p) => p.id === payment.personId);
                    return (
                      <div key={payment.id} className="relative">
                        <div className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-background" />
                        <p className="font-semibold text-foreground">
                          {person?.name ?? "Unknown"} paid {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {payment.notes || (payment.emiId ? "EMI contribution" : "Loan payment")}
                        </p>
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1">
                          Settled on {formatDate(payment.paidDate!)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">No recent settlement logs found</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-premium border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                System Checks
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground pt-1">
              <div className="flex justify-between">
                <span>Core Service:</span>
                <span className="text-emerald-500 font-semibold">Online</span>
              </div>
              <div className="flex justify-between">
                <span>Alert Engine:</span>
                <span className="text-emerald-500 font-semibold">Configured</span>
              </div>
              <div className="flex justify-between">
                <span>Cron Reminders:</span>
                <span className="text-muted-foreground">Local Only</span>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
