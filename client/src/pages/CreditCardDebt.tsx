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
import { Plus, Trash2, CreditCard, TrendingUp, AlertCircle, Printer, Calendar, User, FileText, BarChart3, Receipt, Scale, Landmark, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type CardFormData = {
  name: string;
  cardLimit: string;
  interestRate: string; // annual percent, e.g. 42%
  lateFee: string;
};

type DebtFormData = {
  creditCardId: string;
  personId: string;
  amount: string;
  interestRate: string;
  lateFee: string;
  date: string;
  notes: string;
};

type StatementFormData = {
  creditCardId: string;
  totalStatementBalance: string;
  interestCharged: string;
  feesCharged: string;
  date: string;
};

type CCRepaymentFormData = {
  debtId: string;
  amount: string;
  date: string;
  notes: string;
};

const emptyCardForm: CardFormData = {
  name: "",
  cardLimit: "",
  interestRate: "42",
  lateFee: "500",
};

const emptyDebtForm: DebtFormData = {
  creditCardId: "",
  personId: "",
  amount: "",
  interestRate: "42",
  lateFee: "500",
  date: new Date().toISOString().split("T")[0],
  notes: "",
};

const emptyStatementForm: StatementFormData = {
  creditCardId: "",
  totalStatementBalance: "",
  interestCharged: "0",
  feesCharged: "0",
  date: new Date().toISOString().split("T")[0],
};

const emptyRepaymentForm: CCRepaymentFormData = {
  debtId: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function CreditCardDebt() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("cards");
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [isDebtOpen, setIsDebtOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);

  const [cardForm, setCardForm] = useState<CardFormData>(emptyCardForm);
  const [debtForm, setDebtForm] = useState<DebtFormData>(emptyDebtForm);
  const [statementForm, setStatementForm] = useState<StatementFormData>(emptyStatementForm);
  const [repaymentForm, setRepaymentForm] = useState<CCRepaymentFormData>(emptyRepaymentForm);
  const [selectedDebtId, setSelectedDebtId] = useState<number | null>(null);
  
  // Dialog state for confirm delete
  const [deleteCardId, setDeleteCardId] = useState<number | null>(null);
  const [deleteDebtId, setDeleteDebtId] = useState<number | null>(null);
  
  // Print preview state
  const [printDebtId, setPrintDebtId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: cards, isLoading: cardsLoading } = trpc.creditCard.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: debts, isLoading: debtsLoading } = trpc.creditCard.listDebts.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: persons } = trpc.person.list.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch ledger for selected debt
  const currentSelectedDebtId = selectedDebtId ?? debts?.[0]?.id ?? 0;
  const { data: ledger, isLoading: ledgerLoading } = trpc.creditCard.getLedger.useQuery(
    { debtId: currentSelectedDebtId },
    { enabled: !!user && currentSelectedDebtId > 0 }
  );

  const createCard = trpc.creditCard.create.useMutation({
    onSuccess: () => {
      toast.success("Credit card added successfully");
      setIsCardOpen(false);
      setCardForm(emptyCardForm);
      utils.creditCard.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add credit card");
    },
  });

  const deleteCard = trpc.creditCard.delete.useMutation({
    onSuccess: () => {
      toast.success("Credit card deleted");
      setDeleteCardId(null);
      utils.creditCard.list.invalidate();
      utils.creditCard.listDebts.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete credit card");
    },
  });

  const createDebt = trpc.creditCard.createDebt.useMutation({
    onSuccess: () => {
      toast.success("Debt allocation added successfully");
      setIsDebtOpen(false);
      setDebtForm(emptyDebtForm);
      utils.creditCard.listDebts.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to log debt allocation");
    },
  });

  const deleteDebt = trpc.creditCard.deleteDebt.useMutation({
    onSuccess: () => {
      toast.success("Debt record deleted");
      setDeleteDebtId(null);
      utils.creditCard.listDebts.invalidate();
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete debt record");
    },
  });

  const applyStatement = trpc.creditCard.applyStatement.useMutation({
    onSuccess: () => {
      toast.success("Statement charges applied and distributed proportionally!");
      setIsStatementOpen(false);
      setStatementForm(emptyStatementForm);
      utils.creditCard.listDebts.invalidate();
      if (currentSelectedDebtId > 0) {
        utils.creditCard.getLedger.invalidate({ debtId: currentSelectedDebtId });
      }
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to distribute statement charges");
    },
  });

  const recordCCRepayment = trpc.creditCard.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Repayment recorded successfully against CC debt allocation!");
      setIsRepaymentOpen(false);
      setRepaymentForm(emptyRepaymentForm);
      utils.creditCard.listDebts.invalidate();
      if (currentSelectedDebtId > 0) {
        utils.creditCard.getLedger.invalidate({ debtId: currentSelectedDebtId });
      }
      utils.balance.getDashboardSummary.invalidate();
      utils.balance.getAllBalances.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record CC repayment");
    },
  });

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.name || !cardForm.cardLimit || !cardForm.interestRate || !cardForm.lateFee) {
      toast.error("Please fill in all required fields");
      return;
    }
    createCard.mutate({
      name: cardForm.name,
      cardLimit: Math.round(parseFloat(cardForm.cardLimit) * 100),
      interestRate: Math.round(parseFloat(cardForm.interestRate) * 100), // convert 42% to 4200 bps
      lateFee: Math.round(parseFloat(cardForm.lateFee) * 100),
    });
  };

  const handleDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtForm.creditCardId || !debtForm.personId || !debtForm.amount || !debtForm.interestRate || !debtForm.lateFee || !debtForm.date) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    const person = persons?.find(p => p.id.toString() === debtForm.personId);
    
    createDebt.mutate({
      creditCardId: parseInt(debtForm.creditCardId),
      personId: parseInt(debtForm.personId),
      borrowerName: person?.name || "Borrower",
      amount: Math.round(parseFloat(debtForm.amount) * 100),
      interestRate: Math.round(parseFloat(debtForm.interestRate) * 100),
      lateFee: Math.round(parseFloat(debtForm.lateFee) * 100),
      date: new Date(debtForm.date),
      notes: debtForm.notes || undefined,
    });
  };

  const handleStatementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementForm.creditCardId || !statementForm.totalStatementBalance || !statementForm.date) {
      toast.error("Please fill in all required fields");
      return;
    }
    applyStatement.mutate({
      creditCardId: parseInt(statementForm.creditCardId),
      totalStatementBalance: Math.round(parseFloat(statementForm.totalStatementBalance) * 100),
      interestCharged: Math.round(parseFloat(statementForm.interestCharged || "0") * 100),
      feesCharged: Math.round(parseFloat(statementForm.feesCharged || "0") * 100),
      date: new Date(statementForm.date),
    });
  };

  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentForm.debtId || !repaymentForm.amount || !repaymentForm.date) {
      toast.error("Please fill in all required fields");
      return;
    }
    recordCCRepayment.mutate({
      debtId: parseInt(repaymentForm.debtId),
      amount: Math.round(parseFloat(repaymentForm.amount) * 100),
      date: new Date(repaymentForm.date),
      notes: repaymentForm.notes || undefined,
    });
  };

  const handleCardSelectForDebt = (cardId: string) => {
    const card = cards?.find(c => c.id.toString() === cardId);
    if (card) {
      setDebtForm({
        ...debtForm,
        creditCardId: cardId,
        interestRate: (card.interestRate / 100).toString(),
        lateFee: (card.lateFee / 100).toString(),
      });
    } else {
      setDebtForm({ ...debtForm, creditCardId: cardId });
    }
  };

  const handleCardSelectForStatement = (cardId: string) => {
    setStatementForm({ ...statementForm, creditCardId: cardId });
  };

  const openRepaymentModalForDebt = (debtId: number) => {
    setRepaymentForm({
      debtId: debtId.toString(),
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setIsRepaymentOpen(true);
  };

  if (cardsLoading || debtsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-44" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Calculate total outstanding cc debt
  const totalCcDebt = debts?.reduce((sum, d) => sum + d.amount, 0) || 0;
  
  // Calculate Compounding projection data for selected or first debt
  const selectedDebt = debts?.find(d => d.id === currentSelectedDebtId);
  const generateCompoundingData = (debt: any) => {
    if (!debt) return [];
    const monthlyRate = (debt.interestRate / 10000) / 12; // basis points to monthly decimal
    const lateFeeVal = debt.lateFee / 100; // paise to rupees
    const initialPrincipal = debt.amount / 100; // paise to rupees
    
    const data = [];
    let currentBalance = initialPrincipal;
    
    // Day 0
    data.push({
      month: "Initial",
      Balance: Math.round(currentBalance),
      InterestPaid: 0,
    });

    for (let m = 1; m <= 12; m++) {
      const interest = currentBalance * monthlyRate;
      currentBalance = currentBalance + interest + lateFeeVal;
      data.push({
        month: `Month ${m}`,
        Balance: Math.round(currentBalance),
        Interest: Math.round(interest),
      });
    }
    return data;
  };

  const chartData = generateCompoundingData(selectedDebt);

  // Trigger Print layout
  const handlePrint = (debtId: number) => {
    setPrintDebtId(debtId);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const printRecord = debts?.find(d => d.id === printDebtId);
  const printCard = cards?.find(c => c.id === printRecord?.creditCardId);
  const printPerson = persons?.find(p => p.id === printRecord?.personId);

  return (
    <div className="space-y-6 animate-slide-up print:p-0 print:m-0">
      {/* Print Statement View Override */}
      {printRecord && printCard && (
        <div className="hidden print:block bg-white text-black p-8 max-w-4xl mx-auto space-y-6 border border-gray-300 rounded-lg">
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">TRANSACTION DEBT LEDGER</h1>
              <p className="text-sm text-gray-500 mt-1">Proof of Financial Borrowing and Compounding Projections</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold">Date Generated:</p>
              <p>{new Date().toLocaleDateString()}</p>
              <p className="mt-2 text-xs text-gray-400">Reference: CC-DEBT-{printRecord.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2">
              <h3 className="font-bold text-gray-700 border-b pb-1">BORROWER DETAILS</h3>
              <p><span className="font-semibold text-gray-500">Name:</span> {printPerson?.name || printRecord.borrowerName}</p>
              {printPerson?.relationship && <p><span className="font-semibold text-gray-500">Relationship:</span> {printPerson.relationship}</p>}
              <p><span className="font-semibold text-gray-500">Lender:</span> Personal Account / Expense Tracker</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-gray-700 border-b pb-1">CARD DETAILS</h3>
              <p><span className="font-semibold text-gray-500">Credit Card:</span> {printCard.name}</p>
              <p><span className="font-semibold text-gray-500">Interest Rate:</span> {printRecord.interestRate / 100}% Annually</p>
              <p><span className="font-semibold text-gray-500">Late Fee Charge:</span> {formatCurrency(printRecord.lateFee)}/Month</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden mt-6">
            <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-700 border-b flex justify-between">
              <span>Original Transaction Summary</span>
              <span>Logged Date: {formatDate(new Date(printRecord.date))}</span>
            </div>
            <div className="p-4 grid grid-cols-3 text-center divide-x">
              <div>
                <p className="text-xs text-gray-500">Net Outstanding Debt</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(printRecord.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Interest Growth (Annual)</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{printRecord.interestRate / 100}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Repayment Status</p>
                <p className="text-xl font-bold text-red-600 mt-1">{printRecord.amount > 0 ? "PENDING" : "SETTLED"}</p>
              </div>
            </div>
          </div>

          {printRecord.notes && (
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <span className="font-bold text-gray-700 block mb-1">Transaction Notes:</span>
              <p className="text-gray-600 italic">"{printRecord.notes}"</p>
            </div>
          )}

          {/* Statement Compounding Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-700 border-b pb-1 text-sm">12-MONTH COMPOUNDED BALANCE PROJECTIONS</h3>
            <p className="text-xs text-gray-500">The table illustrates how the outstanding amount compounds with late fees if left unpaid:</p>
            <table className="w-full text-xs text-left border mt-2">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-2 font-bold text-gray-700">Period</th>
                  <th className="p-2 font-bold text-gray-700 text-right">Proportionate Balance</th>
                  <th className="p-2 font-bold text-gray-700 text-right">Accumulated Interest Growth</th>
                </tr>
              </thead>
              <tbody>
                {generateCompoundingData(printRecord).map((row, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 font-medium">{row.month}</td>
                    <td className="p-2 text-right font-bold">{formatCurrency(row.Balance * 100)}</td>
                    <td className="p-2 text-right text-gray-500">
                      {idx === 0 ? "₹0.00" : formatCurrency((row.Balance - (printRecord.amount / 100)) * 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t pt-12 mt-12 text-center text-xs text-gray-400 space-y-2">
            <p>This document acts as verified financial proof generated directly from the Expense Tracker application.</p>
            <p className="font-semibold text-gray-600">Borrower Signature: _________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date: _______________</p>
          </div>
          
          <Button onClick={() => setPrintDebtId(null)} className="print:hidden mt-4 w-full" variant="outline">
            Close Print Preview
          </Button>
        </div>
      )}

      {/* Screen layout */}
      <div className="print:hidden space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-rose-500" />
              Credit Card Debt Allocator
            </h1>
            <p className="text-muted-foreground mt-1">
              Assign CC balance to specific people, run auto-inflation statement logic, and track payments in a ledger
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Run Proportional Interest Statement Button */}
            <Button 
              variant="outline" 
              className="gap-2 border-indigo-500/20 hover:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400"
              onClick={() => setIsStatementOpen(true)}
            >
              <Landmark className="h-4 w-4" /> Apply Statement
            </Button>

            <Dialog open={isCardOpen} onOpenChange={setIsCardOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/20 hover:bg-accent/40">
                  <Plus className="h-4 w-4" /> Add Credit Card
                </Button>
              </DialogTrigger>
              <DialogContent className="animate-scale-in">
                <DialogHeader>
                  <DialogTitle>Add Credit Card</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCardSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Card Name *</Label>
                    <Input
                      placeholder="e.g. SBI Card Prime"
                      value={cardForm.name}
                      onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Card Limit (₹) *</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 300000"
                      value={cardForm.cardLimit}
                      onChange={(e) => setCardForm({ ...cardForm, cardLimit: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Interest Rate (Annual %)*</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 42"
                        value={cardForm.interestRate}
                        onChange={(e) => setCardForm({ ...cardForm, interestRate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Late Fee (₹) *</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 500"
                        value={cardForm.lateFee}
                        onChange={(e) => setCardForm({ ...cardForm, lateFee: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={createCard.isPending} className="w-full">
                    {createCard.isPending ? "Adding..." : "Add Credit Card"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isDebtOpen} onOpenChange={setIsDebtOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-md text-white">
                  <Plus className="h-4 w-4" /> Assign Balance
                </Button>
              </DialogTrigger>
              <DialogContent className="animate-scale-in">
                <DialogHeader>
                  <DialogTitle>Assign CC Balance to Person</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleDebtSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Select Credit Card *</Label>
                    {cards && cards.length === 0 ? (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-3 text-sm text-amber-700 dark:text-amber-300">
                        Please add a Credit Card first before assigning balances.
                      </div>
                    ) : (
                      <Select
                        value={debtForm.creditCardId}
                        onValueChange={handleCardSelectForDebt}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select card" />
                        </SelectTrigger>
                        <SelectContent>
                          {cards?.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label>Assign To Person *</Label>
                    <Select
                      value={debtForm.personId}
                      onValueChange={(val) => setDebtForm({ ...debtForm, personId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {persons?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} {p.relationship ? `(${p.relationship})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Amount Assigned (₹) *</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 35000"
                      value={debtForm.amount}
                      onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Interest Rate (Annual %)*</Label>
                      <Input
                        type="number"
                        value={debtForm.interestRate}
                        onChange={(e) => setDebtForm({ ...debtForm, interestRate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Late Fee (₹) *</Label>
                      <Input
                        type="number"
                        value={debtForm.lateFee}
                        onChange={(e) => setDebtForm({ ...debtForm, lateFee: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={debtForm.date}
                      onChange={(e) => setDebtForm({ ...debtForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Notes / Description</Label>
                    <Textarea
                      placeholder="e.g. Assigned portion of SBI Card for brother's mobile purchase"
                      value={debtForm.notes}
                      onChange={(e) => setDebtForm({ ...debtForm, notes: e.target.value })}
                    />
                  </div>
                  <Button type="submit" disabled={createDebt.isPending} className="w-full">
                    {createDebt.isPending ? "Assigning..." : "Assign Balance"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dashboard summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-panel border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Credit Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold number-display">{cards?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Cards registered under account</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border/40 bg-gradient-to-br from-rose-500/5 to-red-500/5 border-rose-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Allocated Debt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400 number-display">
                {formatCurrency(totalCcDebt)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total balances assigned to other individuals</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Highest Card APR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold number-display text-foreground">
                {cards && cards.length > 0 ? `${Math.max(...cards.map(c => c.interestRate)) / 100}%` : "0%"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Maximum annual interest rate penalty</p>
            </CardContent>
          </Card>
        </div>

        {/* Compounding Projections Visualizer */}
        {debts && debts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-panel col-span-2 border-border/40 overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-rose-500 animate-pulse" /> Compounding Growth Curve Projections
                  </CardTitle>
                  <CardDescription>
                    Visualizing how {selectedDebt ? (persons?.find(p => p.id === selectedDebt.personId)?.name || selectedDebt.borrowerName) : ""}'s {selectedDebt ? formatCurrency(selectedDebt.amount) : ""} debt compounds monthly if left unpaid
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Selected Debt:</Label>
                  <Select
                    value={currentSelectedDebtId.toString()}
                    onValueChange={(val) => setSelectedDebtId(parseInt(val))}
                  >
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Select Debt line" />
                    </SelectTrigger>
                    <SelectContent>
                      {debts.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {persons?.find(p => p.id === d.personId)?.name || d.borrowerName} - {formatCurrency(d.amount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Balance"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-panel border-border/40">
              <CardHeader>
                <CardTitle className="text-base font-bold">Compounding Mechanics</CardTitle>
                <CardDescription>Debt growth calculation summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedDebt ? (
                  <>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-xs text-muted-foreground">Outstanding principal:</span>
                      <span className="text-sm font-bold">{formatCurrency(selectedDebt.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-xs text-muted-foreground">Annual Interest rate:</span>
                      <span className="text-sm font-bold text-rose-500">{selectedDebt.interestRate / 100}%</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-xs text-muted-foreground">Monthly Late Fee:</span>
                      <span className="text-sm font-bold text-rose-500">{formatCurrency(selectedDebt.lateFee)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-xs text-muted-foreground">Projected 6 months:</span>
                      <span className="text-sm font-extrabold text-foreground">
                        {chartData[6] ? formatCurrency(chartData[6].Balance * 100) : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between pb-2 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Projected 12 months:</span>
                      <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                        {chartData[12] ? formatCurrency(chartData[12].Balance * 100) : "-"}
                      </span>
                    </div>
                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3 text-xs text-amber-600 dark:text-amber-400 flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p>
                        Debt accumulates interest. Run statement charging options monthly to distribute actual incurred costs.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Add borrowing records to project compounding metrics.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="cards">Registered Cards</TabsTrigger>
            <TabsTrigger value="debts">Debt Allocations</TabsTrigger>
            {selectedDebt && <TabsTrigger value="ledger">Ledger Audit Trail</TabsTrigger>}
          </TabsList>

          <TabsContent value="cards" className="mt-0">
            {cards && cards.length === 0 ? (
              <Card className="glass-panel py-16 text-center border-dashed">
                <CardContent className="flex flex-col items-center justify-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No Credit Cards Added</h3>
                    <CardDescription className="max-w-sm mt-1">
                      Add your credit cards to begin linking debt lines.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCardOpen(true)} className="mt-2">
                    Add Credit Card
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards?.map((card) => {
                  const cardDebts = debts?.filter(d => d.creditCardId === card.id) || [];
                  const activeCardDebt = cardDebts.reduce((sum, d) => sum + d.amount, 0);

                  return (
                    <Card key={card.id} className="glass-panel border-border/40 overflow-hidden relative group">
                      <CardHeader className="bg-muted/20 border-b pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg font-bold group-hover:text-rose-500 transition-colors">
                              {card.name}
                            </CardTitle>
                            <CardDescription>Limit: {formatCurrency(card.cardLimit)}</CardDescription>
                          </div>
                          <CreditCard className="h-6 w-6 text-muted-foreground/60" />
                        </div>
                      </CardHeader>
                      <CardContent className="py-4 space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Assigned Debt:</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(activeCardDebt)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3 text-muted-foreground">
                          <div>APR: <span className="font-semibold text-foreground">{card.interestRate / 100}%</span></div>
                          <div>Late Fee: <span className="font-semibold text-foreground">{formatCurrency(card.lateFee)}</span></div>
                        </div>
                      </CardContent>
                      <div className="px-6 py-3 bg-muted/10 border-t flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteCardId(card.id)}
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

          <TabsContent value="debts" className="mt-0">
            <Card className="glass-panel border-border/40 overflow-hidden">
              <CardContent className="p-0">
                {debts && debts.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    No borrowing debt lines logged. Click <strong>Assign Balance</strong> to record credit card transactions.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                          <th className="py-3 px-4 text-left">Date</th>
                          <th className="py-3 px-4 text-left">Credit Card</th>
                          <th className="py-3 px-4 text-left">Borrower</th>
                          <th className="py-3 px-4 text-left">Reason / Notes</th>
                          <th className="py-3 px-4 text-right">Net Owed Balance</th>
                          <th className="py-3 px-4 text-center">Record Repayment</th>
                          <th className="py-3 px-4 text-center">Receipt Proof</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debts?.map((debt) => {
                          const card = cards?.find(c => c.id === debt.creditCardId);
                          const person = persons?.find(p => p.id === debt.personId);
                          return (
                            <tr key={debt.id} className="border-b hover:bg-muted/10 transition-colors">
                              <td className="py-3.5 px-4 text-left font-medium">
                                {formatDate(new Date(debt.date))}
                              </td>
                              <td className="py-3.5 px-4 text-left font-medium text-foreground">
                                {card ? card.name : `Card #${debt.creditCardId}`}
                              </td>
                              <td className="py-3.5 px-4 text-left">
                                <span className="font-semibold text-foreground">
                                  {person?.name || debt.borrowerName}
                                </span>
                                {person?.relationship && (
                                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                                    {person.relationship}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-left max-w-xs truncate text-muted-foreground">
                                {debt.notes || "-"}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                                {formatCurrency(debt.amount)}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs hover:bg-emerald-500/10 hover:text-emerald-600"
                                  onClick={() => openRepaymentModalForDebt(debt.id)}
                                >
                                  Record Payback
                                </Button>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-xs"
                                  onClick={() => handlePrint(debt.id)}
                                >
                                  <Printer className="h-3 w-3" /> Ledger Proof
                                </Button>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteDebtId(debt.id)}
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

          {selectedDebt && (
            <TabsContent value="ledger" className="mt-0">
              <Card className="glass-panel border-border/40 overflow-hidden">
                <CardHeader className="pb-2 flex justify-between items-center flex-row">
                  <div>
                    <CardTitle className="text-base font-bold">Ledger Transactions</CardTitle>
                    <CardDescription>
                      Complete audit history for debt allocation of {formatCurrency(selectedDebt.amount)} on {cards?.find(c => c.id === selectedDebt.creditCardId)?.name}
                    </CardDescription>
                  </div>
                  <Button 
                    className="gap-1.5" 
                    size="sm"
                    onClick={() => openRepaymentModalForDebt(selectedDebt.id)}
                  >
                    <Receipt className="h-3.5 w-3.5" /> Add Repayment
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {ledgerLoading ? (
                    <div className="p-8 text-center"><Skeleton className="h-20 w-full" /></div>
                  ) : ledger && ledger.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">No ledger items recorded.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                            <th className="py-3 px-4 text-left">Date</th>
                            <th className="py-3 px-4 text-left">Type</th>
                            <th className="py-3 px-4 text-left">Description</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledger?.map((tx) => (
                            <tr key={tx.id} className="border-b hover:bg-muted/10 transition-colors">
                              <td className="py-3 px-4 text-left font-medium">
                                {formatDate(new Date(tx.date))}
                              </td>
                              <td className="py-3 px-4 text-left">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  tx.type === "principal" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                                  tx.type === "interest" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
                                  tx.type === "fee" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300" :
                                  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                }`}>
                                  {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-left text-muted-foreground">
                                {tx.notes || "-"}
                              </td>
                              <td className={`py-3 px-4 text-right font-bold ${
                                tx.type === "payment" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                              }`}>
                                {tx.type === "payment" ? "-" : ""}{formatCurrency(tx.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Proportional CC Statement Charges distributor Dialog */}
      <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-500" /> Apply Monthly Card Statement
            </DialogTitle>
            <CardDescription>
              Calculate and apply proportional interest & late fees to all borrowers carrying balances on this card.
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleStatementSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Select Credit Card *</Label>
              <Select
                value={statementForm.creditCardId}
                onValueChange={handleCardSelectForStatement}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select card" />
                </SelectTrigger>
                <SelectContent>
                  {cards?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Total CC Statement Balance (₹) *</Label>
              <Input
                type="number"
                placeholder="e.g. 150000"
                value={statementForm.totalStatementBalance}
                onChange={(e) => setStatementForm({ ...statementForm, totalStatementBalance: e.target.value })}
                required
              />
              <span className="text-[10px] text-muted-foreground block">
                Total balance printed on the credit card statement (includes everyone's dues).
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Total Card Interest Charged (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={statementForm.interestCharged}
                  onChange={(e) => setStatementForm({ ...statementForm, interestCharged: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Total Card Fees Charged (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={statementForm.feesCharged}
                  onChange={(e) => setStatementForm({ ...statementForm, feesCharged: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Statement Date *</Label>
              <Input
                type="date"
                value={statementForm.date}
                onChange={(e) => setStatementForm({ ...statementForm, date: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={applyStatement.isPending}>
              {applyStatement.isPending ? "Calculating & Applying..." : "Distribute Charges Proproportionally"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Repayment Dialog */}
      <Dialog open={isRepaymentOpen} onOpenChange={setIsRepaymentOpen}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Record CC Debt Repayment</DialogTitle>
            <CardDescription>Log a payment returned by the borrower to settle their card debt.</CardDescription>
          </DialogHeader>
          <form onSubmit={handleRepaymentSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Debt Allocation *</Label>
              <Select
                value={repaymentForm.debtId}
                onValueChange={(val) => setRepaymentForm({ ...repaymentForm, debtId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select borrowing line" />
                </SelectTrigger>
                <SelectContent>
                  {debts?.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {persons?.find(p => p.id === d.personId)?.name || d.borrowerName} ({formatCurrency(d.amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Payment Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={repaymentForm.amount}
                onChange={(e) => setRepaymentForm({ ...repaymentForm, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Date Received *</Label>
              <Input
                type="date"
                value={repaymentForm.date}
                onChange={(e) => setRepaymentForm({ ...repaymentForm, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Repayment Notes (Optional)</Label>
              <Textarea
                placeholder="e.g. Sunny returned cash or bank transfer reference..."
                value={repaymentForm.notes}
                onChange={(e) => setRepaymentForm({ ...repaymentForm, notes: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={recordCCRepayment.isPending}>
              {recordCCRepayment.isPending ? "Logging..." : "Log Repayment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Card Confirm */}
      <Dialog open={deleteCardId !== null} onOpenChange={(open) => !open && setDeleteCardId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              Delete Card
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this credit card and all its linked borrowings? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteCardId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteCard.isPending}
              onClick={() => deleteCardId && deleteCard.mutate({ id: deleteCardId })}
            >
              {deleteCard.isPending ? "Deleting..." : "Delete Card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Debt Confirm */}
      <Dialog open={deleteDebtId !== null} onOpenChange={(open) => !open && setDeleteDebtId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              Delete Record
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this borrowing debt log?
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteDebtId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteDebt.isPending}
              onClick={() => deleteDebtId && deleteDebt.mutate({ id: deleteDebtId })}
            >
              {deleteDebt.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
