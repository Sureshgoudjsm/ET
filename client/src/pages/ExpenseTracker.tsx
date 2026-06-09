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
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Edit2, Trash2, Receipt, Search, Filter, AlertCircle, ShoppingBag, Landmark, Settings, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

type ExpenseFormData = {
  amount: string;
  date: string;
  category: string;
  description: string;
  isProxy: number;
  personId: string;
};

const emptyForm: ExpenseFormData = {
  amount: "",
  date: new Date().toISOString().split("T")[0],
  category: "",
  description: "",
  isProxy: 0,
  personId: "",
};

const CATEGORIES = [
  { label: "Groceries", value: "Groceries", color: "#6366f1" },
  { label: "Food & Dining", value: "Food & Dining", color: "#ec4899" },
  { label: "Utilities", value: "Utilities", color: "#ef4444" },
  { label: "Transport", value: "Transport", color: "#10b981" },
  { label: "Entertainment", value: "Entertainment", color: "#f59e0b" },
  { label: "Shopping", value: "Shopping", color: "#8b5cf6" },
  { label: "Medical", value: "Medical", color: "#06b6d4" },
  { label: "Other", value: "Other", color: "#6b7280" }
];

export default function ExpenseTracker() {
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<{ id: number } & ExpenseFormData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(emptyForm);
  
  // Local filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Budget limit stored locally
  const [budgetLimit, setBudgetLimit] = useState(() => {
    const saved = localStorage.getItem("monthly_budget_limit");
    return saved ? parseInt(saved, 10) : 50000; // Default ₹50k
  });
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budgetLimit.toString());

  const utils = trpc.useUtils();

  const { data: expenses, isLoading: expensesLoading } = trpc.expense.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: breakdownData, isLoading: breakdownLoading } = trpc.expense.getBreakdown.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: persons } = trpc.person.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createExpense = trpc.expense.create.useMutation({
    onSuccess: () => {
      toast.success("Expense logged successfully");
      setIsAddOpen(false);
      setFormData(emptyForm);
      utils.expense.list.invalidate();
      utils.expense.getBreakdown.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to log expense");
    },
  });

  const updateExpense = trpc.expense.update.useMutation({
    onSuccess: () => {
      toast.success("Expense updated successfully");
      setEditExpense(null);
      utils.expense.list.invalidate();
      utils.expense.getBreakdown.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update expense");
    },
  });

  const deleteExpense = trpc.expense.delete.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      setDeleteConfirm(null);
      utils.expense.list.invalidate();
      utils.expense.getBreakdown.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete expense");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (formData.isProxy === 1 && !formData.personId) {
      toast.error("Please select a person for the proxy payment");
      return;
    }
    createExpense.mutate({
      amount: Math.round(parseFloat(formData.amount) * 100),
      category: formData.category,
      date: new Date(formData.date),
      description: formData.description || undefined,
      isProxy: formData.isProxy,
      personId: formData.isProxy === 1 ? parseInt(formData.personId) : null,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpense || !editExpense.amount || !editExpense.category || !editExpense.date) {
      toast.error("All required fields must be filled");
      return;
    }
    if (editExpense.isProxy === 1 && !editExpense.personId) {
      toast.error("Please select a person for the proxy payment");
      return;
    }
    updateExpense.mutate({
      id: editExpense.id,
      amount: Math.round(parseFloat(editExpense.amount) * 100),
      category: editExpense.category,
      date: new Date(editExpense.date),
      description: editExpense.description || undefined,
      isProxy: editExpense.isProxy,
      personId: editExpense.isProxy === 1 ? parseInt(editExpense.personId) : null,
    });
  };

  const openEdit = (exp: NonNullable<typeof expenses>[number]) => {
    setEditExpense({
      id: exp.id,
      amount: (exp.amount / 100).toString(),
      category: exp.category,
      date: new Date(exp.date).toISOString().split("T")[0],
      description: exp.description || "",
      isProxy: exp.isProxy ?? 0,
      personId: exp.personId?.toString() || "",
    });
  };

  const saveBudgetLimit = () => {
    const val = parseInt(budgetInput, 10);
    if (isNaN(val) || val <= 0) {
      toast.error("Invalid budget limit");
      return;
    }
    setBudgetLimit(val);
    localStorage.setItem("monthly_budget_limit", val.toString());
    setIsBudgetOpen(false);
    toast.success("Monthly budget limit updated");
  };

  if (expensesLoading || breakdownLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 col-span-2" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  // Monthly breakdown sums for current month
  const today = new Date();
  const currentMonthExpenses = expenses?.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }) || [];

  const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalInRupees = currentMonthTotal / 100;
  const budgetPercentage = Math.min((totalInRupees / budgetLimit) * 100, 100);

  // Filter expenses list
  const filteredExpenses = expenses?.filter(e => {
    const matchesSearch = e.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  // Chart data formatting
  const chartData = breakdownData?.map(b => {
    const cat = CATEGORIES.find(c => c.value === b.category) || { color: "#6b7280" };
    return {
      name: b.category,
      value: Math.round(b.amount / 100),
      color: cat.color
    };
  }).filter(item => item.value > 0) || [];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-8 w-8 text-primary" />
            General Expenses
          </h1>
          <p className="text-muted-foreground mt-1">
            Log, categorize, and keep a pulse on your day-to-day spending logs
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 btn-primary-glow">
              <Plus className="h-4 w-4" /> Log Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="animate-scale-in">
            <DialogHeader>
              <DialogTitle>Log Daily Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              {/* Proxy Expense Option */}
              <div className="space-y-3 border-t pt-3 border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Is this expense for you or someone else?</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.isProxy === 0 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, isProxy: 0, personId: "" })}
                    >
                      For Me
                    </Button>
                    <Button
                      type="button"
                      variant={formData.isProxy === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, isProxy: 1 })}
                    >
                      Someone Else
                    </Button>
                  </div>
                </div>

                {formData.isProxy === 1 && (
                  <div className="space-y-1 animate-fade-in">
                    <Label>Select Person *</Label>
                    <Select
                      value={formData.personId}
                      onValueChange={(val) => setFormData({ ...formData, personId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {persons?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} {p.relationship ? `(${p.relationship})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>Description / Item Details</Label>
                <Textarea
                  placeholder="e.g. Milk, eggs, and bread from store"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={createExpense.isPending} className="w-full">
                {createExpense.isPending ? "Logging..." : "Log Expense"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Monthly Budget card & Chart overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Budget limit card */}
        <Card className="glass-panel col-span-2 border-border/40 flex flex-col justify-between">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-indigo-500" /> Monthly Budget Tracker
              </CardTitle>
              <CardDescription>Target spending vs. actual expenses</CardDescription>
            </div>
            <Dialog open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Settings className="h-4.5 w-4.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Set Monthly Limit</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Label>Budget Limit (₹)</Label>
                  <Input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                  />
                  <Button onClick={saveBudgetLimit} className="w-full">
                    Save Budget Limit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex justify-between items-baseline">
              <div className="text-3xl font-extrabold tracking-tight number-display">
                {formatCurrency(currentMonthTotal)}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">spent this month</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Limit: <span className="font-semibold text-foreground">{formatCurrency(budgetLimit * 100)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Progress
                value={budgetPercentage}
                className={`h-3 rounded-full overflow-hidden ${
                  budgetPercentage >= 90
                    ? "bg-red-100 dark:bg-red-950/20 [&>div]:bg-red-500"
                    : budgetPercentage >= 75
                      ? "bg-amber-100 dark:bg-amber-950/20 [&>div]:bg-amber-500"
                      : "bg-indigo-100 dark:bg-indigo-950/20 [&>div]:bg-indigo-600"
                }`}
              />
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>{Math.round(budgetPercentage)}% consumed</span>
                {budgetPercentage >= 90 && (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Exceeding Budget Threshold!
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories Pie Chart card */}
        <Card className="glass-panel border-border/40 overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-44 p-0 relative flex items-center justify-center">
            {chartData.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center px-4 py-8">
                Log some categorized expenses to generate the graph breakdown.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and List */}
      <Card className="glass-panel border-border/40">
        <CardHeader className="pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <CardTitle className="text-lg font-semibold">Expense Log Ledger</CardTitle>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-[180px] sm:w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search description..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Filter select */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center gap-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
              <p>No expense logs match current selection criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Category</th>
                    <th className="py-3 px-4 text-left">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp) => {
                    const catColor = CATEGORIES.find(c => c.value === exp.category)?.color || "#6b7280";
                    return (
                      <tr key={exp.id} className="border-b hover:bg-muted/10 transition-colors">
                        <td className="py-3.5 px-4 text-left font-medium">
                          {formatDate(new Date(exp.date))}
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-semibold text-xs border"
                            style={{
                              backgroundColor: `${catColor}15`,
                              borderColor: `${catColor}25`,
                              color: catColor
                            }}
                          >
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-left max-w-xs truncate text-muted-foreground">
                          <div className="flex flex-col gap-1.5 py-1">
                            <span className="truncate">{exp.description || "-"}</span>
                            {exp.isProxy === 1 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full w-max">
                                <Users className="h-2.5 w-2.5" /> For {persons?.find(p => p.id === exp.personId)?.name || `Person #${exp.personId}`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-foreground">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(exp)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteConfirm(exp.id)}
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
      <Dialog open={editExpense !== null} onOpenChange={(open) => !open && setEditExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense Entry</DialogTitle>
          </DialogHeader>
          {editExpense && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editExpense.amount}
                    onChange={(e) => setEditExpense({ ...editExpense, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Category *</Label>
                  <Select
                    value={editExpense.category}
                    onValueChange={(val) => setEditExpense({ ...editExpense, category: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={editExpense.date}
                  onChange={(e) => setEditExpense({ ...editExpense, date: e.target.value })}
                  required
                />
              </div>

              {/* Proxy Expense Option */}
              <div className="space-y-3 border-t pt-3 border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Is this expense for you or someone else?</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={editExpense.isProxy === 0 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditExpense({ ...editExpense, isProxy: 0, personId: "" })}
                    >
                      For Me
                    </Button>
                    <Button
                      type="button"
                      variant={editExpense.isProxy === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditExpense({ ...editExpense, isProxy: 1 })}
                    >
                      Someone Else
                    </Button>
                  </div>
                </div>

                {editExpense.isProxy === 1 && (
                  <div className="space-y-1 animate-fade-in">
                    <Label>Select Person *</Label>
                    <Select
                      value={editExpense.personId}
                      onValueChange={(val) => setEditExpense({ ...editExpense, personId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {persons?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} {p.relationship ? `(${p.relationship})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>Description / Item Details</Label>
                <Textarea
                  value={editExpense.description}
                  onChange={(e) => setEditExpense({ ...editExpense, description: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={updateExpense.isPending} className="w-full">
                {updateExpense.isPending ? "Saving..." : "Update Record"}
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
            Are you sure you want to delete this expense record? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteExpense.isPending}
              onClick={() => deleteConfirm && deleteExpense.mutate({ id: deleteConfirm })}
            >
              {deleteExpense.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
