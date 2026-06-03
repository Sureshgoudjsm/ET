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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2, Coins, ArrowUpRight, ArrowDownLeft, Calendar, User, Info, CheckCircle2, CircleDollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ChittiFormData = {
  name: string;
  totalAmount: string;
  members: string;
  monthlyContribution: string;
  friendName: string;
  startDate: string;
  status: "active" | "completed";
};

type ContributionFormData = {
  chittiId: string;
  amount: string;
  date: string;
  type: "contribution" | "payout";
  notes: string;
};

const emptyChittiForm: ChittiFormData = {
  name: "",
  totalAmount: "",
  members: "20",
  monthlyContribution: "",
  friendName: "",
  startDate: new Date().toISOString().split("T")[0],
  status: "active",
};

const emptyContributionForm: ContributionFormData = {
  chittiId: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  type: "contribution",
  notes: "",
};

export default function ChittiSavings() {
  const { user } = useAuth();
  const [isChittiOpen, setIsChittiOpen] = useState(false);
  const [isContribOpen, setIsContribOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  const [chittiForm, setChittiForm] = useState<ChittiFormData>(emptyChittiForm);
  const [contribForm, setContribForm] = useState<ContributionFormData>(emptyContributionForm);
  const [selectedChittiId, setSelectedChittiId] = useState<string>("all");
  const [deleteChittiId, setDeleteChittiId] = useState<number | null>(null);
  const [deleteContribId, setDeleteContribId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: chittis, isLoading: chittisLoading } = trpc.chitti.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: contributions, isLoading: contribsLoading } = trpc.chitti.listContributions.useQuery(
    { chittiId: selectedChittiId !== "all" ? parseInt(selectedChittiId) : undefined },
    { enabled: !!user }
  );

  const createChitti = trpc.chitti.create.useMutation({
    onSuccess: () => {
      toast.success("Chitti group created successfully");
      setIsChittiOpen(false);
      setChittiForm(emptyChittiForm);
      utils.chitti.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create Chitti");
    },
  });

  const deleteChitti = trpc.chitti.delete.useMutation({
    onSuccess: () => {
      toast.success("Chitti group deleted");
      setDeleteChittiId(null);
      utils.chitti.list.invalidate();
      utils.chitti.listContributions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete Chitti");
    },
  });

  const createContribution = trpc.chitti.createContribution.useMutation({
    onSuccess: () => {
      toast.success("Transaction recorded successfully");
      setIsContribOpen(false);
      setContribForm(emptyContributionForm);
      utils.chitti.listContributions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record transaction");
    },
  });

  const deleteContribution = trpc.chitti.deleteContribution.useMutation({
    onSuccess: () => {
      toast.success("Transaction deleted");
      setDeleteContribId(null);
      utils.chitti.listContributions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete transaction");
    },
  });

  const handleChittiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chittiForm.name || !chittiForm.totalAmount || !chittiForm.members || !chittiForm.monthlyContribution || !chittiForm.friendName || !chittiForm.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createChitti.mutate({
      name: chittiForm.name,
      totalAmount: Math.round(parseFloat(chittiForm.totalAmount) * 100),
      members: parseInt(chittiForm.members),
      monthlyContribution: Math.round(parseFloat(chittiForm.monthlyContribution) * 100),
      friendName: chittiForm.friendName,
      startDate: new Date(chittiForm.startDate),
      status: chittiForm.status,
    });
  };

  const handleContribSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribForm.chittiId || !contribForm.amount || !contribForm.date) {
      toast.error("Please fill in all required fields");
      return;
    }
    createContribution.mutate({
      chittiId: parseInt(contribForm.chittiId),
      amount: Math.round(parseFloat(contribForm.amount) * 100),
      date: new Date(contribForm.date),
      type: contribForm.type,
      notes: contribForm.notes || undefined,
    });
  };

  if (chittisLoading || contribsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    );
  }

  // Calculate overall metrics
  const totalChittiValue = chittis?.reduce((sum, c) => sum + c.totalAmount, 0) || 0;
  
  // Calculate paid contribution sums
  const allContributions = contributions || [];
  const totalPaidIn = allContributions
    .filter(c => c.type === "contribution")
    .reduce((sum, c) => sum + c.amount, 0);

  const totalPaidOut = allContributions
    .filter(c => c.type === "payout")
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Coins className="h-8 w-8 text-yellow-500" />
            Chitti Savings
          </h1>
          <p className="text-muted-foreground mt-1">
            Meticulously log monthly chit fund contributions, bidding payouts, and group valuations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isChittiOpen} onOpenChange={setIsChittiOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/20 hover:bg-accent/40">
                <Plus className="h-4 w-4" /> Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="animate-scale-in">
              <DialogHeader>
                <DialogTitle>Create Chitti Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleChittiSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label>Group Name *</Label>
                  <Input
                    placeholder="e.g. Sravani 10 Lakh chit"
                    value={chittiForm.name}
                    onChange={(e) => setChittiForm({ ...chittiForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Total Chit Value (₹) *</Label>
                    <Input
                      type="number"
                      placeholder="1000000"
                      value={chittiForm.totalAmount}
                      onChange={(e) => setChittiForm({ ...chittiForm, totalAmount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Monthly Contribution (₹) *</Label>
                    <Input
                      type="number"
                      placeholder="50000"
                      value={chittiForm.monthlyContribution}
                      onChange={(e) => setChittiForm({ ...chittiForm, monthlyContribution: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Total Members *</Label>
                    <Input
                      type="number"
                      value={chittiForm.members}
                      onChange={(e) => setChittiForm({ ...chittiForm, members: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={chittiForm.startDate}
                      onChange={(e) => setChittiForm({ ...chittiForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Organized By (Friend Name) *</Label>
                  <Input
                    placeholder="Ramesh Rao"
                    value={chittiForm.friendName}
                    onChange={(e) => setChittiForm({ ...chittiForm, friendName: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" disabled={createChitti.isPending} className="w-full">
                  {createChitti.isPending ? "Creating..." : "Create Chitti Group"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isContribOpen} onOpenChange={setIsContribOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 shadow-md text-white">
                <Plus className="h-4 w-4" /> Log Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="animate-scale-in">
              <DialogHeader>
                <DialogTitle>Log Chit Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleContribSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Select Group *</Label>
                  {chittis && chittis.length === 0 ? (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-3 text-sm text-amber-700 dark:text-amber-300">
                      Create a Chitti Group first before logging payments.
                    </div>
                  ) : (
                    <Select
                      value={contribForm.chittiId}
                      onValueChange={(val) => setContribForm({ ...contribForm, chittiId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Group" />
                      </SelectTrigger>
                      <SelectContent>
                        {chittis?.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name} ({formatCurrency(c.totalAmount)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Transaction Type *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setContribForm({ ...contribForm, type: "contribution" })}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        contribForm.type === "contribution"
                          ? "bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                          : "bg-background border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4" /> Contribution Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => setContribForm({ ...contribForm, type: "payout" })}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        contribForm.type === "payout"
                          ? "bg-green-100 dark:bg-green-950/50 border-green-300 dark:border-green-800 text-green-700 dark:text-green-300"
                          : "bg-background border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <ArrowDownLeft className="h-4 w-4" /> Bid Payout Won
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Amount (₹) *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={contribForm.amount}
                      onChange={(e) => setContribForm({ ...contribForm, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={contribForm.date}
                      onChange={(e) => setContribForm({ ...contribForm, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Notes / Month Description</Label>
                  <Textarea
                    placeholder="e.g. Month 4 Contribution or Won the 4th Month bid with ₹1.5L discount"
                    value={contribForm.notes}
                    onChange={(e) => setContribForm({ ...contribForm, notes: e.target.value })}
                  />
                </div>

                <Button type="submit" disabled={createContribution.isPending} className="w-full">
                  {createContribution.isPending ? "Logging..." : "Log Transaction"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-panel border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Chitti Portfolios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold number-display">{formatCurrency(totalChittiValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Sum value of all chit schemes</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Savings Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 number-display">
              {formatCurrency(totalPaidIn)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total monthly contributions paid</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payouts Won</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 number-display">
              {formatCurrency(totalPaidOut)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lump sum payouts received</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/40 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 border-yellow-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold number-display text-foreground">
              {formatCurrency(totalPaidOut - totalPaidIn)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Payouts won minus savings paid in</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-2">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Chitti Groups</TabsTrigger>
            <TabsTrigger value="ledger">Savings Ledger</TabsTrigger>
          </TabsList>

          {activeTab === "ledger" && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Filter Group:</Label>
              <Select value={selectedChittiId} onValueChange={setSelectedChittiId}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {chittis?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="overview" className="mt-0">
          {chittis && chittis.length === 0 ? (
            <Card className="glass-panel py-16 text-center border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Info className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No Chitti Groups Found</h3>
                  <CardDescription className="max-w-sm mt-1">
                    Chitti is a popular savings scheme. Create a chitti group to start tracking contributions and bidding logs.
                  </CardDescription>
                </div>
                <Button onClick={() => setIsChittiOpen(true)} className="mt-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white">
                  Add New Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {chittis?.map((chit) => {
                const groupContribs = allContributions.filter(c => c.chittiId === chit.id);
                const invested = groupContribs.filter(c => c.type === "contribution").reduce((s, c) => s + c.amount, 0);
                const payouts = groupContribs.filter(c => c.type === "payout").reduce((s, c) => s + c.amount, 0);
                const progressMonths = groupContribs.filter(c => c.type === "contribution").length;
                const progressPercent = Math.min((progressMonths / chit.members) * 100, 100);

                return (
                  <Card key={chit.id} className="glass-panel overflow-hidden border-border/40 flex flex-col justify-between group">
                    <CardHeader className="pb-3 bg-muted/20 border-b relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl font-bold group-hover:text-amber-500 transition-colors">{chit.name}</CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" /> Organized by {chit.friendName}
                          </CardDescription>
                        </div>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                          chit.status === "active"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                            : "bg-green-500/10 border-green-500/20 text-green-500"
                        }`}>
                          {chit.status === "active" ? "Active" : "Completed"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="py-4 space-y-4 flex-1">
                      {/* Metric lines */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Total Fund Value</p>
                          <p className="font-bold text-foreground text-base number-display">{formatCurrency(chit.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Monthly Amount</p>
                          <p className="font-bold text-foreground text-base number-display">{formatCurrency(chit.monthlyContribution)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Contributions Logged</p>
                          <p className="font-semibold text-amber-600 dark:text-amber-400 text-sm number-display">{formatCurrency(invested)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Payouts Logged</p>
                          <p className="font-semibold text-green-600 dark:text-green-400 text-sm number-display">{formatCurrency(payouts)}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Cycle Progress ({progressMonths} / {chit.members} Months)</span>
                          <span className="text-foreground font-semibold">{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Dates / Members info */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Start: {formatDate(new Date(chit.startDate))}
                        </span>
                        <span>{chit.members} Members</span>
                      </div>
                    </CardContent>
                    <div className="px-6 py-3 bg-muted/10 border-t flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteChittiId(chit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-0">
          <Card className="glass-panel border-border/40 overflow-hidden">
            <CardContent className="p-0">
              {allContributions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No chit transactions logged yet. Click <strong>Log Transaction</strong> above to record savings contributions or bidding payouts.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                        <th className="py-3 px-4 text-left">Date</th>
                        <th className="py-3 px-4 text-left">Chitti Group</th>
                        <th className="py-3 px-4 text-left">Type</th>
                        <th className="py-3 px-4 text-left">Notes</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allContributions.map((c) => {
                        const chitGroup = chittis?.find((ch) => ch.id === c.chittiId);
                        const isContrib = c.type === "contribution";
                        return (
                          <tr key={c.id} className="border-b hover:bg-muted/10 transition-colors">
                            <td className="py-3.5 px-4 text-left">
                              {formatDate(new Date(c.date))}
                            </td>
                            <td className="py-3.5 px-4 text-left font-medium text-foreground">
                              {chitGroup ? chitGroup.name : `Chit Group #${c.chittiId}`}
                            </td>
                            <td className="py-3.5 px-4 text-left">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-xs border ${
                                isContrib
                                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                  : "bg-green-500/10 border-green-500/20 text-green-500"
                              }`}>
                                {isContrib ? (
                                  <>
                                    <ArrowUpRight className="h-3.5 w-3.5" /> Contribution
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownLeft className="h-3.5 w-3.5" /> Payout Received
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-left max-w-xs truncate text-muted-foreground">
                              {c.notes || "-"}
                            </td>
                            <td className={`py-3.5 px-4 text-right font-bold ${
                              isContrib ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                            }`}>
                              {isContrib ? "-" : "+"} {formatCurrency(c.amount)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteContribId(c.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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
        </TabsContent>
      </Tabs>

      {/* Delete Group Confirm */}
      <Dialog open={deleteChittiId !== null} onOpenChange={(open) => !open && setDeleteChittiId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              Delete Group
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this chitti group and all its contribution logs? This action is irreversible.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteChittiId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteChitti.isPending}
              onClick={() => deleteChittiId && deleteChitti.mutate({ id: deleteChittiId })}
            >
              {deleteChitti.isPending ? "Deleting..." : "Delete Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Confirm */}
      <Dialog open={deleteContribId !== null} onOpenChange={(open) => !open && setDeleteContribId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              Delete Transaction
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this contribution/payout record?
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteContribId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteContribution.isPending}
              onClick={() => deleteContribId && deleteContribution.mutate({ id: deleteContribId })}
            >
              {deleteContribution.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
