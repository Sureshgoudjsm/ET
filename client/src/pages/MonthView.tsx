import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarDays, CheckCircle2, Clock, ChevronLeft, ChevronRight, Banknote, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function MonthView() {
  const { user } = useAuth();
  const currentDate = new Date();
  const [mode, setMode] = useState<"month" | "range">("month");
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  });

  const [filterPerson, setFilterPerson] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [emiPayDialog, setEmiPayDialog] = useState<any | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: monthPayments, isLoading: isMonthLoading } = trpc.payment.getByMonth.useQuery(
    { year: parseInt(year), month: parseInt(month) },
    { enabled: !!user && mode === "month" }
  );

  const { data: allPayments, isLoading: isAllLoading } = trpc.payment.list.useQuery(
    undefined,
    { enabled: !!user && mode === "range" }
  );

  const { data: persons } = trpc.person.list.useQuery(undefined, { enabled: !!user });

  const isLoading = mode === "month" ? isMonthLoading : isAllLoading;

  const updateStatus = trpc.payment.updateStatus.useMutation({
    onMutate: (variables) => {
      setUpdatingId(variables.id);
    },
    onSuccess: (_, variables) => {
      const action = variables.status === "paid" ? "Marked as Paid ✓" : "Marked as Pending";
      toast.success(action);
      utils.payment.getByMonth.invalidate();
      utils.payment.list.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
      setUpdatingId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
      setUpdatingId(null);
    },
  });

  const handleToggleStatus = (payment: any) => {
    const newStatus = payment.status === "paid" ? "pending" : "paid";
    if (newStatus === "paid" && payment.emiId) {
      setEmiPayDialog(payment);
    } else {
      updateStatus.mutate({
        id: payment.id,
        status: newStatus,
        paidDate: newStatus === "paid" ? new Date() : undefined,
        paidBy: "user",
      });
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const m = parseInt(month);
    const y = parseInt(year);
    if (direction === "prev") {
      if (m === 1) { setMonth("12"); setYear((y - 1).toString()); }
      else setMonth((m - 1).toString());
    } else {
      if (m === 12) { setMonth("1"); setYear((y + 1).toString()); }
      else setMonth((m + 1).toString());
    }
  };

  const rawPayments = mode === "month" ? (monthPayments ?? []) : (allPayments ?? []);

  // Filter by custom range if in range mode
  const dateFilteredPayments = rawPayments.filter((p) => {
    if (mode === "month") return true;
    const due = new Date(p.dueDate);
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    return due >= start && due <= end;
  });

  // Filter by person, type, status dropdowns
  const filteredPayments = dateFilteredPayments.filter((p) => {
    if (filterPerson !== "all" && p.personId !== parseInt(filterPerson)) {
      return false;
    }
    if (filterType !== "all") {
      const isEMI = p.emiId !== null && p.emiId !== undefined;
      if (filterType === "emi" && !isEMI) return false;
      if (filterType === "loan" && isEMI) return false;
    }
    if (filterStatus !== "all" && p.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    if (!filteredPayments || filteredPayments.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = [
      "Person",
      "Amount (Rupees)",
      "Type",
      "Due Date",
      "Status",
      "Paid Date",
      "Paid By",
      "Notes"
    ];

    const rows = filteredPayments.map((payment) => {
      const personName = persons?.find((p) => p.id === payment.personId)?.name ?? "Unknown";
      const amountInRupees = (payment.amount / 100).toFixed(2);
      const transactionType = payment.emiId ? "EMI" : "Loan";
      const dueDateStr = payment.dueDate ? new Date(payment.dueDate).toLocaleDateString("en-IN") : "";
      const paidDateStr = payment.paidDate ? new Date(payment.paidDate).toLocaleDateString("en-IN") : "";
      const paidByStr = payment.status === "paid" ? (payment.paidBy === "user" ? "Me" : "Borrower") : "";
      
      return [
        personName,
        amountInRupees,
        transactionType,
        dueDateStr,
        payment.status,
        paidDateStr,
        paidByStr,
        payment.notes ?? ""
      ];
    });

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
    
    const selectedMonthObj = MONTHS.find((m) => m.value === parseInt(month));
    const filename = mode === "month"
      ? `transactions_${selectedMonthObj?.label || "month"}_${year}.csv`
      : `transactions_custom_range_${startDate}_to_${endDate}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file exported successfully!");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  const selectedMonth = MONTHS.find((m) => m.value === parseInt(month));
  const paidPayments = filteredPayments.filter((p) => p.status === "paid");
  const pendingPayments = filteredPayments.filter((p) => p.status === "pending");
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  // Generate year range (5 years back, 2 years forward)
  const yearRange = Array.from({ length: 8 }, (_, i) => currentDate.getFullYear() - 5 + i);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground number-display">Month View</h1>
          <p className="text-muted-foreground mt-1">
            {mode === "month" 
              ? "All transactions for a specific month"
              : "All transactions for a custom date range"
            }
          </p>
        </div>
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50">
          <Button
            variant={mode === "month" ? "secondary" : "ghost"}
            size="sm"
            className={`rounded-lg px-3 py-1.5 h-8 text-xs font-medium transition-all ${
              mode === "month"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("month")}
          >
            Month Selector
          </Button>
          <Button
            variant={mode === "range" ? "secondary" : "ghost"}
            size="sm"
            className={`rounded-lg px-3 py-1.5 h-8 text-xs font-medium transition-all ${
              mode === "range"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("range")}
          >
            Custom Date Range
          </Button>
        </div>
      </div>

      {/* Mode Controls */}
      {mode === "month" ? (
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            id="prev-month-btn"
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => navigateMonth("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex gap-2 flex-1">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger id="month-select" className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="year-select" className="w-28">
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

          <Button
            id="next-month-btn"
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => navigateMonth("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-4 flex-wrap bg-card/30 p-4 rounded-2xl border border-border/40">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
            <input
              type="date"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-muted-foreground">End Date</label>
            <input
              type="date"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-end gap-3 bg-card/40 p-4 rounded-2xl border border-border/50">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-semibold text-muted-foreground">Filter by Person</label>
          <Select value={filterPerson} onValueChange={setFilterPerson}>
            <SelectTrigger id="person-filter" className="h-9 bg-background">
              <SelectValue placeholder="All Persons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Persons</SelectItem>
              {persons?.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
          <label className="text-xs font-semibold text-muted-foreground">Transaction Type</label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger id="type-filter" className="h-9 bg-background">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="emi">EMI Payment</SelectItem>
              <SelectItem value="loan">Loan Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
          <label className="text-xs font-semibold text-muted-foreground">Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger id="status-filter" className="h-9 bg-background">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <Button
            id="clear-filters-btn"
            variant="ghost"
            size="sm"
            className="h-9 flex-1 sm:flex-none text-muted-foreground hover:text-foreground"
            onClick={() => {
              setFilterPerson("all");
              setFilterType("all");
              setFilterStatus("all");
            }}
            disabled={filterPerson === "all" && filterType === "all" && filterStatus === "all"}
          >
            Clear
          </Button>
          <Button
            id="export-csv-btn"
            variant="outline"
            size="sm"
            className="h-9 flex-1 sm:flex-none bg-background border-border hover:bg-accent flex items-center gap-1.5"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="stat-card-success border-0 animate-slide-up stagger-1">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                {mode === "month" ? `Paid in ${selectedMonth?.label || ""}` : "Paid (Selected Range)"}
              </p>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 number-display">
              {formatCurrency(totalPaid)}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              {paidPayments.length} payment{paidPayments.length !== 1 ? "s" : ""} completed
            </p>
          </CardContent>
        </Card>

        <Card className="stat-card-warning border-0 animate-slide-up stagger-2">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {mode === "month" ? `Pending in ${selectedMonth?.label || ""}` : "Pending (Selected Range)"}
              </p>
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 number-display">
              {formatCurrency(totalPending)}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {pendingPayments.length} payment{pendingPayments.length !== 1 ? "s" : ""} awaiting
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="card-premium border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between flex-wrap gap-2 text-base">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              <span>
                {mode === "month"
                  ? `Transactions — ${selectedMonth?.label ?? ""} ${year}`
                  : `Transactions — Custom Range`
                }
              </span>
            </div>
            {filteredPayments.length !== dateFilteredPayments.length && (
              <span className="text-xs font-normal text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full">
                Filtered: {filteredPayments.length} of {dateFilteredPayments.length}
              </span>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Click the status badge to toggle Paid / Pending</p>
        </CardHeader>
        <CardContent>
          {filteredPayments && filteredPayments.length > 0 ? (
            <div className="space-y-2">
              {filteredPayments.map((payment, idx) => {
                const person = persons?.find((p) => p.id === payment.personId);
                const isPaid = payment.status === "paid";
                const isUpdating = updatingId === payment.id;

                return (
                  <div
                    key={payment.id}
                    id={`payment-${payment.id}`}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 animate-slide-up stagger-${Math.min(idx + 1, 5)} ${
                      isPaid
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                        : "bg-background border-border hover:bg-accent/30"
                    }`}
                  >
                    {/* Status Toggle Button */}
                    <button
                      id={`toggle-status-${payment.id}`}
                      onClick={() => handleToggleStatus(payment)}
                      disabled={isUpdating}
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isUpdating ? "opacity-50 cursor-not-allowed" :
                        isPaid
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/10"
                      }`}
                      title={isPaid ? "Click to mark as Pending" : "Click to mark as Paid"}
                    >
                      {isUpdating ? (
                        <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : isPaid ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/50" />
                      )}
                    </button>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {person?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {payment.notes || (payment.emiId ? "EMI Payment" : "Loan")}
                        {isPaid && payment.emiId && (
                          <span className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            payment.paidBy === "user" 
                              ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}>
                            Paid by: {payment.paidBy === "user" ? "Me" : "Borrower"}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Due: {formatDate(payment.dueDate)}</span>
                        {payment.paidDate && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">
                            • Paid: {formatDate(payment.paidDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount + Status */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground number-display text-sm">
                        {formatCurrency(payment.amount)}
                      </p>
                      <span className={isPaid ? "badge-paid" : "badge-pending"}>
                        {isPaid ? "Paid" : "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                No matching transactions found
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* EMI PaidBy Selector Dialog */}
      <Dialog open={emiPayDialog !== null} onOpenChange={(open: boolean) => !open && setEmiPayDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Who paid this EMI?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select who completed the EMI payment for this month to correctly update ledger balances.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (emiPayDialog) {
                  updateStatus.mutate({
                    id: emiPayDialog.id,
                    status: "paid",
                    paidDate: new Date(),
                    paidBy: "user",
                  });
                  setEmiPayDialog(null);
                }
              }}
            >
              Paid by Me
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
              onClick={() => {
                if (emiPayDialog) {
                  updateStatus.mutate({
                    id: emiPayDialog.id,
                    status: "paid",
                    paidDate: new Date(),
                    paidBy: "borrower",
                  });
                  setEmiPayDialog(null);
                }
              }}
            >
              Paid by Borrower
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
