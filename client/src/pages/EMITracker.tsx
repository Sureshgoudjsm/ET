import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";
import { Plus, Edit2, Trash2, TrendingUp, CalendarDays, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type EMIFormData = {
  personId: string;
  amount: string;
  startDate: string;
  endDate: string;
  description: string;
};

const emptyForm: EMIFormData = {
  personId: "",
  amount: "",
  startDate: "",
  endDate: "",
  description: "",
};

export default function EMITracker() {
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editEMI, setEditEMI] = useState<{ id: number } & EMIFormData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState<EMIFormData>(emptyForm);

  const utils = trpc.useUtils();

  const { data: persons, isLoading: personsLoading } = trpc.person.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: emis, isLoading: emisLoading } = trpc.emi.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createEMI = trpc.emi.create.useMutation({
    onSuccess: () => {
      toast.success("EMI created — monthly records auto-generated");
      setIsAddOpen(false);
      setFormData(emptyForm);
      utils.emi.list.invalidate();
      utils.balance.getDashboardSummary.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create EMI");
    },
  });

  const updateEMI = trpc.emi.update.useMutation({
    onSuccess: () => {
      toast.success("EMI updated successfully");
      setEditEMI(null);
      utils.emi.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update EMI");
    },
  });

  const deleteEMI = trpc.emi.delete.useMutation({
    onSuccess: () => {
      toast.success("EMI deleted");
      setDeleteConfirm(null);
      utils.emi.list.invalidate();
      utils.balance.getDashboardSummary.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete EMI");
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personId || !formData.amount || !formData.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createEMI.mutate({
      personId: parseInt(formData.personId),
      amount: Math.round(parseFloat(formData.amount) * 100),
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      description: formData.description || undefined,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEMI || !editEMI.amount) {
      toast.error("Amount is required");
      return;
    }
    updateEMI.mutate({
      id: editEMI.id,
      amount: Math.round(parseFloat(editEMI.amount) * 100),
      endDate: editEMI.endDate ? new Date(editEMI.endDate) : undefined,
      description: editEMI.description || undefined,
    });
  };

  const openEdit = (emi: NonNullable<typeof emis>[number]) => {
    const person = persons?.find((p) => p.id === emi.personId);
    setEditEMI({
      id: emi.id,
      personId: emi.personId.toString(),
      amount: (emi.amount / 100).toString(),
      startDate: "",
      endDate: emi.endDate ? new Date(emi.endDate).toISOString().split("T")[0] : "",
      description: emi.description || "",
    });
  };

  if (emisLoading || personsLoading) {
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
          <h1 className="text-3xl font-bold text-foreground number-display">EMI Tracker</h1>
          <p className="text-muted-foreground mt-1">Recurring monthly payment entries</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button id="add-emi-btn" className="gap-2 btn-primary-glow">
              <Plus className="h-4 w-4" />
              Add EMI
            </Button>
          </DialogTrigger>
          <DialogContent className="animate-scale-in">
            <DialogHeader>
              <DialogTitle>Add New EMI</DialogTitle>
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
                    <SelectTrigger id="emi-person-select">
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
              <div className="space-y-1.5">
                <Label htmlFor="emi-amount">Monthly Amount (₹) *</Label>
                <Input
                  id="emi-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="20000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emi-start">Start Date *</Label>
                  <Input
                    id="emi-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emi-end">End Date (Optional)</Label>
                  <Input
                    id="emi-end"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emi-desc">Description (Optional)</Label>
                <Input
                  id="emi-desc"
                  placeholder="e.g., Home Loan, Vehicle Loan"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                💡 Monthly payment records will be <strong className="text-foreground">auto-generated</strong> from start date to end date (or today).
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setIsAddOpen(false); setFormData(emptyForm); }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createEMI.isPending}>
                  {createEMI.isPending ? "Creating..." : "Create EMI"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editEMI} onOpenChange={(open) => !open && setEditEMI(null)}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Edit EMI</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-emi-amount">Monthly Amount (₹) *</Label>
              <Input
                id="edit-emi-amount"
                type="number"
                step="0.01"
                min="1"
                value={editEMI?.amount || ""}
                onChange={(e) => editEMI && setEditEMI({ ...editEMI, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-emi-end">End Date (Optional)</Label>
              <Input
                id="edit-emi-end"
                type="date"
                value={editEMI?.endDate || ""}
                onChange={(e) => editEMI && setEditEMI({ ...editEMI, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-emi-desc">Description</Label>
              <Input
                id="edit-emi-desc"
                value={editEMI?.description || ""}
                onChange={(e) => editEMI && setEditEMI({ ...editEMI, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditEMI(null)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={updateEMI.isPending}>
                {updateEMI.isPending ? "Saving..." : "Save Changes"}
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
              Delete EMI?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete the EMI and all its auto-generated monthly payment records. This action cannot be undone.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteConfirm && deleteEMI.mutate({ id: deleteConfirm })}
              disabled={deleteEMI.isPending}
            >
              {deleteEMI.isPending ? "Deleting..." : "Delete EMI"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EMI Cards */}
      {emis && emis.length > 0 ? (
        <div className="space-y-3">
          {emis.map((emi, idx) => {
            const person = persons?.find((p) => p.id === emi.personId);
            return (
              <Card
                key={emi.id}
                id={`emi-card-${emi.id}`}
                className={`card-premium border-0 animate-slide-up stagger-${Math.min(idx + 1, 5)}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">
                            {person?.name ?? "Unknown"}
                          </h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            emi.isActive === 1
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {emi.isActive === 1 ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {emi.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{emi.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Monthly</span>
                            <span className="font-bold text-foreground number-display">{formatCurrency(emi.amount)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">from</span>
                            <span className="text-xs font-medium text-foreground">{formatMonthYear(emi.startDate)}</span>
                            {emi.endDate && (
                              <>
                                <span className="text-xs text-muted-foreground">to</span>
                                <span className="text-xs font-medium text-foreground">{formatMonthYear(emi.endDate)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Debt Payoff Progress Bar */}
                        {(() => {
                          const start = new Date(emi.startDate);
                          const end = emi.endDate ? new Date(emi.endDate) : new Date();
                          const now = new Date();
                          const totalMonths = Math.max(1,
                            (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
                          );
                          const paidMonths = Math.max(0, Math.min(totalMonths,
                            (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
                          ));
                          const pct = Math.round((paidMonths / totalMonths) * 100);
                          const isComplete = pct >= 100;
                          return (
                            <div className="mt-3 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">{isComplete ? "Fully cleared" : `${paidMonths}/${totalMonths} months paid`}</span>
                                <span className={`font-semibold ${isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                                  {isComplete ? <CheckCircle2 className="h-3.5 w-3.5 inline" /> : `${pct}%`}
                                </span>
                              </div>
                              <Progress
                                value={pct}
                                className={`h-1.5 rounded-full ${isComplete ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary"}`}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-accent"
                        onClick={() => openEdit(emi)}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm(emi.id)}
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
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No EMI entries yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                Add an EMI entry and monthly payment records will be auto-generated for you.
              </p>
              <Button id="add-first-emi-btn" className="gap-2 btn-primary-glow" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Your First EMI
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
