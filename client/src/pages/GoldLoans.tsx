import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Edit2, Trash2, Gem, Coins, Calendar, FileText, Sparkles, User, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type GoldLoanFormData = {
  paidForPersonId: string;
  amount: string;
  date: string;
  notes: string;
};

const emptyForm: GoldLoanFormData = {
  paidForPersonId: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function GoldLoans() {
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editLog, setEditLog] = useState<{ id: number } & GoldLoanFormData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState<GoldLoanFormData>(emptyForm);
  const [personFilter, setPersonFilter] = useState<string>("all");

  const utils = trpc.useUtils();

  const { data: persons, isLoading: personsLoading } = trpc.person.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: goldLogs, isLoading: goldLoading } = trpc.goldLoan.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createGoldLoan = trpc.goldLoan.create.useMutation({
    onSuccess: () => {
      toast.success("Interest payment logged successfully");
      setIsAddOpen(false);
      setFormData(emptyForm);
      utils.goldLoan.list.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to log interest payment");
    },
  });

  const updateGoldLoan = trpc.goldLoan.update.useMutation({
    onSuccess: () => {
      toast.success("Log entry updated successfully");
      setEditLog(null);
      utils.goldLoan.list.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update entry");
    },
  });

  const deleteGoldLoan = trpc.goldLoan.delete.useMutation({
    onSuccess: () => {
      toast.success("Log entry deleted successfully");
      setDeleteConfirm(null);
      utils.goldLoan.list.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete entry");
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.paidForPersonId || !formData.amount || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }
    createGoldLoan.mutate({
      paidForPersonId: parseInt(formData.paidForPersonId),
      amount: Math.round(parseFloat(formData.amount) * 100),
      date: new Date(formData.date),
      notes: formData.notes || undefined,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLog || !editLog.amount || !editLog.date || !editLog.paidForPersonId) {
      toast.error("All required fields must be filled");
      return;
    }
    updateGoldLoan.mutate({
      id: editLog.id,
      paidForPersonId: parseInt(editLog.paidForPersonId),
      amount: Math.round(parseFloat(editLog.amount) * 100),
      date: new Date(editLog.date),
      notes: editLog.notes || undefined,
    });
  };

  const openEdit = (log: NonNullable<typeof goldLogs>[number]) => {
    setEditLog({
      id: log.id,
      paidForPersonId: log.paidForPersonId.toString(),
      amount: (log.amount / 100).toString(),
      date: new Date(log.date).toISOString().split("T")[0],
      notes: log.notes || "",
    });
  };

  if (goldLoading || personsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  // Calculations
  const totalInterestPaid = goldLogs?.reduce((sum, log) => sum + log.amount, 0) || 0;

  // Breakdown by person
  const breakdown: Record<number, { name: string; amount: number }> = {};
  goldLogs?.forEach((log) => {
    const person = persons?.find((p) => p.id === log.paidForPersonId);
    const name = person ? person.name : `Person #${log.paidForPersonId}`;
    if (!breakdown[log.paidForPersonId]) {
      breakdown[log.paidForPersonId] = { name, amount: 0 };
    }
    breakdown[log.paidForPersonId]!.amount += log.amount;
  });

  const filteredLogs = goldLogs?.filter((log) => {
    if (personFilter === "all") return true;
    return log.paidForPersonId.toString() === personFilter;
  }) || [];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Gem className="h-8 w-8 text-amber-500" />
            Gold Loan Interest
          </h1>
          <p className="text-muted-foreground mt-1">
            Track gold loan details and log monthly interest payments made for family members
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 shadow-lg text-white">
              <Plus className="h-4 w-4" />
              Log Interest Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="animate-scale-in">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Coins className="h-5 w-5" /> Log Gold Loan Interest
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Family Member *</Label>
                {persons && persons.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-3 text-sm text-amber-700 dark:text-amber-300">
                    No contacts found. Add Mother/Sister to the <strong>Persons</strong> page first.
                  </div>
                ) : (
                  <Select
                    value={formData.paidForPersonId}
                    onValueChange={(val) => setFormData({ ...formData, paidForPersonId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Who is this interest paid for?" />
                    </SelectTrigger>
                    <SelectContent>
                      {persons?.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Interest Amount (₹) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-8"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Payment Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="pl-9"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes / Details</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    placeholder="Enter details (e.g. 1% interest rate, weight details, bank name)"
                    className="pl-9 min-h-[80px]"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={createGoldLoan.isPending}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white"
              >
                {createGoldLoan.isPending ? "Logging..." : "Log Interest Payment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel overflow-hidden border-amber-200/50 dark:border-amber-900/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Interest Paid</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Coins className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 number-display">
              {formatCurrency(totalInterestPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cumulative interest across all gold loans</p>
          </CardContent>
        </Card>

        {/* Dynamic breakdown progress card */}
        <Card className="glass-panel col-span-2 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interest Paid By Family Member</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.keys(breakdown).length === 0 ? (
              <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                No interest breakdown available. Log a payment to see metrics.
              </div>
            ) : (
              Object.entries(breakdown).map(([id, info]) => {
                const percentage = totalInterestPaid > 0 ? (info.amount / totalInterestPaid) * 100 : 0;
                return (
                  <div key={id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {info.name}
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">{formatCurrency(info.amount)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Ledger */}
      <Card className="glass-panel border-border/40 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Interest Payment Ledger
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Filter by Contact:</Label>
            <Select value={personFilter} onValueChange={setPersonFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Persons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                {persons?.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
              <p>No interest payment records found matching selection.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Paid For</th>
                    <th className="py-3 px-4 text-left">Notes</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const person = persons?.find((p) => p.id === log.paidForPersonId);
                    return (
                      <tr key={log.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 text-left font-medium">
                          {formatDate(new Date(log.date))}
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <span className="inline-flex items-center gap-1.5 font-medium px-2 py-1 rounded-md bg-muted text-foreground text-xs">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {person ? person.name : `Contact #${log.paidForPersonId}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-left max-w-xs truncate text-muted-foreground">
                          {log.notes || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-foreground">
                          {formatCurrency(log.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(log)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteConfirm(log.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editLog !== null} onOpenChange={(open) => !open && setEditLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Interest Record</DialogTitle>
          </DialogHeader>
          {editLog && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Family Member *</Label>
                <Select
                  value={editLog.paidForPersonId}
                  onValueChange={(val) => setEditLog({ ...editLog, paidForPersonId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Who is this interest paid for?" />
                  </SelectTrigger>
                  <SelectContent>
                    {persons?.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Interest Amount (₹) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-8"
                    value={editLog.amount}
                    onChange={(e) => setEditLog({ ...editLog, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={editLog.date}
                  onChange={(e) => setEditLog({ ...editLog, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Notes / Details</Label>
                <Textarea
                  value={editLog.notes}
                  onChange={(e) => setEditLog({ ...editLog, notes: e.target.value })}
                />
              </div>

              <Button
                type="submit"
                disabled={updateGoldLoan.isPending}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white"
              >
                {updateGoldLoan.isPending ? "Saving..." : "Update Record"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              Confirm Delete
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this gold loan interest record? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteGoldLoan.isPending}
              onClick={() => deleteConfirm && deleteGoldLoan.mutate({ id: deleteConfirm })}
            >
              {deleteGoldLoan.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
