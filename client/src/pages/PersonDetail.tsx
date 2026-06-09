import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  ArrowLeft, User, TrendingUp, TrendingDown, Minus, Calendar, Plus, 
  Trash2, Scale, AlertCircle, Wallet, CreditCard, ArrowUpRight, 
  ArrowDownLeft, Coins, Receipt, CheckCircle, Clock
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function PersonDetail({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const personId = parseInt(params.id, 10);

  // Dialog states
  const [isLendOpen, setIsLendOpen] = useState(false);
  const [isBorrowOpen, setIsBorrowOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);

  // Form states
  const [lendAmount, setLendAmount] = useState("");
  const [lendNotes, setLendNotes] = useState("");
  const [lendDate, setLendDate] = useState(new Date().toISOString().split("T")[0]);

  const [borrowAmount, setBorrowAmount] = useState("");
  const [borrowNotes, setBorrowNotes] = useState("");
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().split("T")[0]);

  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);

  const [repayAmount, setRepayAmount] = useState("");
  const [repayNotes, setRepayNotes] = useState("");
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split("T")[0]);

  const utils = trpc.useUtils();

  // Queries
  const { data: person, isLoading: personLoading } = trpc.person.list.useQuery(undefined, {
    enabled: !!user,
    select: (list) => list.find(p => p.id === personId)
  });

  const { data: balance, isLoading: balanceLoading } = trpc.balance.getPersonBalance.useQuery(
    { personId },
    { enabled: !!user && !isNaN(personId) }
  );

  const { data: history, isLoading: historyLoading } = trpc.person.getHistory.useQuery(
    { personId },
    { enabled: !!user && !isNaN(personId) }
  );

  // Mutations
  const createLoan = trpc.loan.create.useMutation({
    onSuccess: () => {
      toast.success("Transaction logged successfully");
      setIsLendOpen(false);
      setIsBorrowOpen(false);
      setIsRepaymentOpen(false);
      setLendAmount("");
      setLendNotes("");
      setBorrowAmount("");
      setBorrowNotes("");
      setRepayAmount("");
      setRepayNotes("");
      
      // Invalidate queries
      utils.person.getHistory.invalidate({ personId });
      utils.balance.getPersonBalance.invalidate({ personId });
      utils.balance.getAllBalances.invalidate();
      utils.balance.getDashboardSummary.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to log transaction");
    }
  });

  const createExpense = trpc.expense.create.useMutation({
    onSuccess: () => {
      toast.success("Proxy expense logged successfully");
      setIsExpenseOpen(false);
      setExpenseAmount("");
      setExpenseCategory("");
      setExpenseDesc("");
      
      utils.person.getHistory.invalidate({ personId });
      utils.balance.getPersonBalance.invalidate({ personId });
      utils.balance.getAllBalances.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.expense.list.invalidate();
      utils.expense.getBreakdown.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to log expense");
    }
  });

  const handleLendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lendAmount || !lendDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createLoan.mutate({
      personId,
      amount: Math.round(parseFloat(lendAmount) * 100),
      type: "given",
      date: new Date(lendDate),
      notes: lendNotes || undefined
    });
  };

  const handleBorrowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowAmount || !borrowDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createLoan.mutate({
      personId,
      amount: Math.round(parseFloat(borrowAmount) * 100),
      type: "received",
      date: new Date(borrowDate),
      notes: borrowNotes || undefined
    });
  };

  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayAmount || !repayDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const netVal = balance?.netBalance ?? 0;
    // If they owe us (netBalance > 0), they repaying us is a "received" loan (reduces net owed)
    // If we owe them (netBalance < 0), us repaying them is a "given" loan (reduces user owes)
    const type = netVal >= 0 ? "received" : "given";

    createLoan.mutate({
      personId,
      amount: Math.round(parseFloat(repayAmount) * 100),
      type,
      date: new Date(repayDate),
      notes: repayNotes || `Repayment/Settlement for ${person?.name}`
    });
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseCategory || !expenseDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createExpense.mutate({
      amount: Math.round(parseFloat(expenseAmount) * 100),
      category: expenseCategory,
      date: new Date(expenseDate),
      description: expenseDesc || undefined,
      isProxy: 1,
      personId
    });
  };

  const handleQuickSettle = () => {
    const netVal = balance?.netBalance ?? 0;
    if (netVal === 0) {
      toast.info("Balance is already settled!");
      return;
    }

    const absAmount = Math.abs(netVal) / 100;
    const type = netVal > 0 ? "received" : "given";
    const desc = netVal > 0 ? `Settlement payback received from ${person?.name}` : `Settlement payback paid to ${person?.name}`;

    if (confirm(`Are you sure you want to log a quick settlement of ${formatCurrency(Math.abs(netVal))}?`)) {
      createLoan.mutate({
        personId,
        amount: Math.abs(netVal),
        type,
        date: new Date(),
        notes: desc
      });
    }
  };

  if (personLoading || balanceLoading || historyLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 col-span-2" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="text-lg font-semibold">Person not found</h3>
        <Button onClick={() => setLocation("/persons")}>Back to People</Button>
      </div>
    );
  }

  const netBalance = balance?.netBalance ?? 0;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top Navigation & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 border rounded-lg shrink-0" 
            onClick={() => setLocation("/persons")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{person.name}</h1>
              {person.relationship && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {person.relationship}
                </span>
              )}
            </div>
            {person.notes && <p className="text-xs text-muted-foreground mt-0.5">{person.notes}</p>}
          </div>
        </div>
        
        {/* Quick actions bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsLendOpen(true)}>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" /> Lend Money
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsBorrowOpen(true)}>
            <ArrowDownLeft className="h-4 w-4 text-rose-500" /> Borrow Money
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsExpenseOpen(true)}>
            <Receipt className="h-4 w-4 text-indigo-500" /> Proxy Expense
          </Button>
          {netBalance !== 0 && (
            <Button size="sm" variant="outline" className="gap-1.5 hover:bg-emerald-500/10 hover:text-emerald-600" onClick={() => setIsRepaymentOpen(true)}>
              <Coins className="h-4 w-4 text-amber-500" /> Record Repayment
            </Button>
          )}
          {netBalance !== 0 && (
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md" onClick={handleQuickSettle}>
              <CheckCircle className="h-4 w-4" /> Quick Settle
            </Button>
          )}
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`col-span-2 border-0 overflow-hidden relative shadow-lg ${
          netBalance > 0 
            ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-l-4 border-emerald-500" 
            : netBalance < 0 
              ? "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-l-4 border-rose-500" 
              : "bg-gradient-to-br from-gray-500/10 to-slate-500/5 border-l-4 border-slate-500"
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Net Relationship Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-4xl font-extrabold tracking-tight number-display flex items-baseline gap-2">
              <span className={
                netBalance > 0 ? "text-emerald-700 dark:text-emerald-300" :
                netBalance < 0 ? "text-red-700 dark:text-red-300" :
                "text-muted-foreground"
              }>
                {netBalance !== 0 && (netBalance > 0 ? "+" : "-")}
                {formatCurrency(Math.abs(netBalance))}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground mt-2">
              {netBalance > 0 
                ? `${person.name} owes you this amount in total.` 
                : netBalance < 0 
                  ? `You owe ${person.name} this amount in total.` 
                  : "All debts are completely settled!"}
            </p>
          </CardContent>
        </Card>

        {/* Ledger Breakdown sidecard */}
        <Card className="glass-panel border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Balance Sheet Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">They owe you:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(balance?.totalOwedToMe ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-3.5">
              <span className="text-muted-foreground">You owe them:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(balance?.totalOwedByMe ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-sm">
              <span>Net Status:</span>
              <span className={
                netBalance > 0 ? "text-emerald-600" :
                netBalance < 0 ? "text-rose-600" :
                "text-muted-foreground"
              }>
                {netBalance > 0 ? "Receivable" : netBalance < 0 ? "Payable" : "Settled"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chronological Transaction Timeline / Audit Log */}
      <Card className="glass-panel border-border/40">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Audit History Ledger</CardTitle>
            <CardDescription>Comprehensive chronologically-sorted audit log of all monetary flows</CardDescription>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-muted text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {history?.length || 0} Transactions
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-6 text-center"><Skeleton className="h-20 w-full" /></div>
          ) : history && history.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center gap-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
              <p>No transactions logged for this person yet.</p>
            </div>
          ) : (
            <div className="relative border-l border-border/60 ml-6 mr-4 py-4 space-y-6">
              {history?.map((item, idx) => {
                // Determine styling and icons based on transaction type
                const isPositiveFlow = 
                  item.type === "loan_given" || 
                  item.type === "proxy_payment" || 
                  item.type === "cc_principal" ||
                  item.type === "cc_interest" ||
                  item.type === "cc_fee";

                const isRepayFlow = item.type === "repayment";

                return (
                  <div key={item.id} className="relative pl-6 animate-slide-up stagger-1">
                    {/* Timeline Node Point */}
                    <span className={`absolute -left-3 top-1.5 flex h-6 w-6 items-center justify-center rounded-full ring-8 ring-background ${
                      isRepayFlow ? "bg-emerald-500 text-white" :
                      item.type === "loan_received" ? "bg-rose-500 text-white" :
                      "bg-primary text-primary-foreground"
                    }`}>
                      {item.type.includes("cc") ? <CreditCard className="h-3 w-3" /> :
                       item.type.includes("loan") ? <Coins className="h-3 w-3" /> :
                       item.type === "repayment" ? <ArrowDownLeft className="h-3 w-3" /> :
                       <Receipt className="h-3 w-3" />}
                    </span>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-accent/20 border border-border/30 p-3 rounded-lg hover:bg-accent/40 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{item.description}</span>
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground border">
                            {item.reference}
                          </span>
                        </div>
                        {item.notes && <p className="text-xs text-muted-foreground italic">"{item.notes}"</p>}
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(new Date(item.date))}</span>
                        </div>
                      </div>

                      <div className="text-right sm:self-center shrink-0">
                        <span className={`font-bold number-display text-sm ${
                          isRepayFlow ? "text-emerald-600 dark:text-emerald-400" :
                          item.type === "loan_received" ? "text-rose-600 dark:text-rose-400" :
                          "text-foreground"
                        }`}>
                          {isRepayFlow ? "-" : ""}{formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lend Money Dialog */}
      <Dialog open={isLendOpen} onOpenChange={setIsLendOpen}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Lend Money to {person.name}</DialogTitle>
            <CardDescription>Log informal lending. This adds to the amount they owe you.</CardDescription>
          </DialogHeader>
          <form onSubmit={handleLendSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Lent Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={lendAmount}
                onChange={(e) => setLendAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Date Lent *</Label>
              <Input
                type="date"
                value={lendDate}
                onChange={(e) => setLendDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="e.g. Gave cash for weekly groceries / emergency..."
                value={lendNotes}
                onChange={(e) => setLendNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createLoan.isPending}>
              {createLoan.isPending ? "Logging..." : "Log Lending"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Borrow Money Dialog */}
      <Dialog open={isBorrowOpen} onOpenChange={setIsBorrowOpen}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Borrow Money from {person.name}</DialogTitle>
            <CardDescription>Log informal borrowing. This adds to the amount you owe them.</CardDescription>
          </DialogHeader>
          <form onSubmit={handleBorrowSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Borrowed Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="e.g. 10000"
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Date Borrowed *</Label>
              <Input
                type="date"
                value={borrowDate}
                onChange={(e) => setBorrowDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="e.g. Borrowed to cover bills / cash repayment later..."
                value={borrowNotes}
                onChange={(e) => setBorrowNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white" disabled={createLoan.isPending}>
              {createLoan.isPending ? "Logging..." : "Log Borrowing"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Proxy Expense Dialog */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Log Proxy Expense for {person.name}</DialogTitle>
            <CardDescription>Record an expense paid by you on behalf of {person.name}. This adds to what they owe you.</CardDescription>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select
                  value={expenseCategory}
                  onValueChange={setExpenseCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Groceries">Groceries</SelectItem>
                    <SelectItem value="Food & Dining">Food & Dining</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Transport">Transport</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Shopping">Shopping</SelectItem>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Description / Item Details</Label>
              <Textarea
                placeholder="e.g. Paid their portion of utility bill / dinner charge..."
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createExpense.isPending}>
              {createExpense.isPending ? "Logging..." : "Log Proxy Expense"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Repayment Dialog */}
      <Dialog open={isRepaymentOpen} onOpenChange={setIsRepaymentOpen}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Record Payment/Repayment</DialogTitle>
            <CardDescription>
              {netBalance > 0 
                ? `Log money returned by ${person.name} to reduce their debt to you.`
                : `Log repayment made by you to ${person.name} to reduce what you owe them.`
              }
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleRepaySubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="e.g. 2500"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input
                type="date"
                value={repayDate}
                onChange={(e) => setRepayDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="e.g. Settle partial balance via bank transfer..."
                value={repayNotes}
                onChange={(e) => setRepayNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white" disabled={createLoan.isPending}>
              {createLoan.isPending ? "Logging..." : "Log Repayment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
