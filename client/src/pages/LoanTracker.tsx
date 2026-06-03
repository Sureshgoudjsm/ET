import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Edit2, Trash2, Wallet, ArrowUpRight, ArrowDownLeft, AlertCircle, CalendarDays } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type LoanFormData = {
  personId: string;
  amount: string;
  type: "given" | "received";
  date: string;
  notes: string;
};

const emptyForm: LoanFormData = {
  personId: "",
  amount: "",
  type: "given",
  date: "",
  notes: "",
};

export default function LoanTracker() {
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<{ id: number } & LoanFormData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState<LoanFormData>(emptyForm);

  const utils = trpc.useUtils();

  const { data: persons, isLoading: personsLoading } = trpc.person.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: loans, isLoading: loansLoading } = trpc.loan.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createLoan = trpc.loan.create.useMutation({
    onSuccess: () => {
      toast.success("Loan recorded successfully");
      setIsAddOpen(false);
      setFormData(emptyForm);
      utils.loan.list.invalidate();
      utils.balance.getAllBalances.invalidate();
      utils.balance.getDashboardSummary.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record loan");
    },
  });

  const updateLoan = trpc.loan.update.useMutation({
    onSuccess: () => {
      toast.success("Loan updated successfully");
      setEditLoan(null);
      utils.loan.list.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update loan");
    },
  });

  const deleteLoan = trpc.loan.delete.useMutation({
    onSuccess: () => {
      toast.success("Loan deleted");
      setDeleteConfirm(null);
      utils.loan.list.invalidate();
      utils.balance.getAllBalances.invalidate();
      utils.balance.getDashboardSummary.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete loan");
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personId || !formData.amount || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }
    createLoan.mutate({
      personId: parseInt(formData.personId),
      amount: Math.round(parseFloat(formData.amount) * 100),
      type: formData.type,
      date: new Date(formData.date),
      notes: formData.notes || undefined,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLoan || !editLoan.amount || !editLoan.date) {
      toast.error("Amount and date are required");
      return;
    }
    updateLoan.mutate({
      id: editLoan.id,
      amount: Math.round(parseFloat(editLoan.amount) * 100),
      date: new Date(editLoan.date),
      notes: editLoan.notes || undefined,
    });
  };

  const openEdit = (loan: NonNullable<typeof loans>[number]) => {
    setEditLoan({
      id: loan.id,
      personId: loan.personId.toString(),
      amount: (loan.amount / 100).toString(),
      type: loan.type,
      date: new Date(loan.date).toISOString().split("T")[0],
      notes: loan.notes || "",
    });
  };

  if (loansLoading || personsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground number-display">Loan Tracker</h1>
          <p className="text-muted-foreground mt-1">Money given to or received from people</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button id="add-loan-btn" className="gap-2 btn-primary-glow">
              <Plus className="h-4 w-4" />
              Add Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="animate-scale-in">
            <DialogHeader>
              <DialogTitle>Record Loan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Person *</Label>
                {persons && persons.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-3 text-sm text-amber-700 dark:text-amber-300">
                    No people added yet. Go to <strong>Persons</strong> page first to add a contact.
                  </div>
                ) : (
                  <Select
                    value={formData.personId}
                    onValueChange={(value) => setFormData({ ...formData, personId: value })}
                  >
                    <SelectTrigger id="loan-person-select">
                      <SelectValue placeholder="Select a person" />
                    </SelectTrigger>
                    <SelectContent>
                      {persons?.map((person) => (
                        <SelectItem key={person.id} value={person.id.toString()}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Type Toggle */}
              <div className="space-y-1.5">
                <Label>Transaction Type *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="loan-type-given"
                    onClick={() => setFormData({ ...formData, type: "given" })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                      formData.type === "given"
                        ? "bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300"
                        : "bg-background border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Money Given
                  </button>
                  <button
                    type="button"
                    id="loan-type-received"
                    onClick={() => setFormData({ ...formData, type: "received" })}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                      formData.type === "received"
                        ? "bg-emerald-100 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                        : "bg-background border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    Money Received
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loan-amount">Amount (₹) *</Label>
                <Input
                  id="loan-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="5000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loan-date">Date *</Label>
                <Input
                  id="loan-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loan-notes">Notes (Optional)</Label>
                <Textarea
                  id="loan-notes"
                  placeholder="e.g., For birthday gift, travel expense..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setIsAddOpen(false); setFormData(emptyForm); }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createLoan.isPending}>
                  {createLoan.isPending ? "Recording..." : "Record Loan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editLoan} onOpenChange={(open) => !open && setEditLoan(null)}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Edit Loan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-loan-amount">Amount (₹) *</Label>
              <Input
                id="edit-loan-amount"
                type="number"
                step="0.01"
                min="1"
                value={editLoan?.amount || ""}
                onChange={(e) => editLoan && setEditLoan({ ...editLoan, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-loan-date">Date *</Label>
              <Input
                id="edit-loan-date"
                type="date"
                value={editLoan?.date || ""}
                onChange={(e) => editLoan && setEditLoan({ ...editLoan, date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-loan-notes">Notes</Label>
              <Textarea
                id="edit-loan-notes"
                value={editLoan?.notes || ""}
                onChange={(e) => editLoan && setEditLoan({ ...editLoan, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditLoan(null)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={updateLoan.isPending}>
                {updateLoan.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Loan?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this loan record. This action cannot be undone.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteConfirm && deleteLoan.mutate({ id: deleteConfirm })}
              disabled={deleteLoan.isPending}
            >
              {deleteLoan.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loan Cards */}
      {loans && loans.length > 0 ? (
        <div className="space-y-3">
          {loans.map((loan, idx) => {
            const person = persons?.find((p) => p.id === loan.personId);
            const isGiven = loan.type === "given";
            return (
              <Card
                key={loan.id}
                id={`loan-card-${loan.id}`}
                className={`card-premium border-0 animate-slide-up stagger-${Math.min(idx + 1, 5)}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isGiven
                          ? "bg-red-100 dark:bg-red-950/50"
                          : "bg-emerald-100 dark:bg-emerald-950/50"
                      }`}>
                        {isGiven ? (
                          <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">
                            {person?.name ?? "Unknown"}
                          </h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isGiven
                              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          }`}>
                            {isGiven ? "Money Given" : "Money Received"}
                          </span>
                        </div>
                        {loan.notes && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{loan.notes}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <span className="font-bold text-foreground number-display">{formatCurrency(loan.amount)}</span>
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{formatDate(loan.date)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-accent"
                        onClick={() => openEdit(loan)}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm(loan.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="card-premium border-0">
          <CardContent className="pt-6">
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No loans recorded yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                Record money given to or received from friends to start tracking.
              </p>
              <Button id="add-first-loan-btn" className="gap-2 btn-primary-glow" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Record Your First Loan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
