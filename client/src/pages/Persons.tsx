import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit2, Trash2, User, Users, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Persons() {
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<{ id: number; name: string; notes: string } | null>(null);
  const [formData, setFormData] = useState({ name: "", notes: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: persons, isLoading: personsLoading } = trpc.person.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: balances, isLoading: balancesLoading } = trpc.balance.getAllBalances.useQuery(undefined, {
    enabled: !!user,
  });

  const createPerson = trpc.person.create.useMutation({
    onSuccess: () => {
      toast.success("Person added successfully");
      setIsAddOpen(false);
      setFormData({ name: "", notes: "" });
      utils.person.list.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add person");
    },
  });

  const updatePerson = trpc.person.update.useMutation({
    onSuccess: () => {
      toast.success("Person updated successfully");
      setEditPerson(null);
      utils.person.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update person");
    },
  });

  const deletePerson = trpc.person.delete.useMutation({
    onSuccess: () => {
      toast.success("Person deleted");
      setDeleteConfirm(null);
      utils.person.list.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete person");
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    createPerson.mutate({ name: formData.name.trim(), notes: formData.notes.trim() || undefined });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPerson || !editPerson.name.trim()) {
      toast.error("Name is required");
      return;
    }
    updatePerson.mutate({ id: editPerson.id, name: editPerson.name.trim(), notes: editPerson.notes.trim() || undefined });
  };

  const getBalance = (personId: number) => {
    return balances?.find((b) => b.personId === personId);
  };

  if (personsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground number-display">
            People
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage contacts involved in your EMIs and loans
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button id="add-person-btn" className="gap-2 btn-primary-glow">
              <Plus className="h-4 w-4" />
              Add Person
            </Button>
          </DialogTrigger>
          <DialogContent className="animate-scale-in">
            <DialogHeader>
              <DialogTitle>Add New Person</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-name">Full Name *</Label>
                <Input
                  id="add-name"
                  placeholder="e.g., Rahul Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-notes">Notes (Optional)</Label>
                <Textarea
                  id="add-notes"
                  placeholder="e.g., Brother-in-law, colleague..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createPerson.isPending}>
                  {createPerson.isPending ? "Adding..." : "Add Person"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editPerson} onOpenChange={(open) => !open && setEditPerson(null)}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={editPerson?.name || ""}
                onChange={(e) => editPerson && setEditPerson({ ...editPerson, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                value={editPerson?.notes || ""}
                onChange={(e) => editPerson && setEditPerson({ ...editPerson, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditPerson(null)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={updatePerson.isPending}>
                {updatePerson.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Person?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete the person and may affect related EMI and loan records. This action cannot be undone.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteConfirm && deletePerson.mutate({ id: deleteConfirm })}
              disabled={deletePerson.isPending}
            >
              {deletePerson.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Person Cards */}
      {persons && persons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {persons.map((person, idx) => {
            const balance = getBalance(person.id);
            const netBalance = balance?.netBalance ?? 0;
            const isLoading = balancesLoading;

            return (
              <Card
                key={person.id}
                id={`person-card-${person.id}`}
                className={`card-premium animate-slide-up stagger-${Math.min(idx + 1, 5)} border-0`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{person.name}</h3>
                        {person.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{person.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-accent"
                        onClick={() => setEditPerson({ id: person.id, name: person.name, notes: person.notes || "" })}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm(person.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className={`rounded-lg p-3 ${
                    isLoading ? "bg-muted" :
                    netBalance > 0 ? "stat-card-success" :
                    netBalance < 0 ? "stat-card-danger" :
                    "bg-muted"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isLoading ? (
                          <Skeleton className="h-4 w-4 rounded-full" />
                        ) : netBalance > 0 ? (
                          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : netBalance < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground">
                          {isLoading ? "Loading..." :
                           netBalance > 0 ? "They owe you" :
                           netBalance < 0 ? "You owe them" :
                           "Settled"}
                        </span>
                      </div>
                      {!isLoading && (
                        <span className={`font-bold number-display text-sm ${
                          netBalance > 0 ? "text-emerald-700 dark:text-emerald-300" :
                          netBalance < 0 ? "text-red-700 dark:text-red-300" :
                          "text-muted-foreground"
                        }`}>
                          {netBalance !== 0 && (netBalance > 0 ? "+" : "")}
                          {formatCurrency(Math.abs(netBalance))}
                        </span>
                      )}
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
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No people added yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                Add people to start tracking EMIs and loans. You need at least one person to create entries.
              </p>
              <Button id="add-first-person-btn" className="gap-2 btn-primary-glow" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Your First Person
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


