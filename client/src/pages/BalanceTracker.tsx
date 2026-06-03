import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, Scale, User,
  ChevronDown, ChevronUp, Banknote, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { useState } from "react";

export default function BalanceTracker() {
  const { user } = useAuth();
  const [expandedPerson, setExpandedPerson] = useState<number | null>(null);

  const { data: balances, isLoading: balancesLoading } = trpc.balance.getAllBalances.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: summary, isLoading: summaryLoading } = trpc.balance.getDashboardSummary.useQuery(undefined, {
    enabled: !!user,
  });

  const isLoading = balancesLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  const totalTheyOweMe = balances?.reduce((sum, b) => b.netBalance > 0 ? sum + b.netBalance : sum, 0) ?? 0;
  const totalIOwe = balances?.reduce((sum, b) => b.netBalance < 0 ? sum + Math.abs(b.netBalance) : sum, 0) ?? 0;
  const netPosition = totalTheyOweMe - totalIOwe;

  const sortedBalances = [...(balances ?? [])].sort((a, b) => b.netBalance - a.netBalance);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground number-display">Balance Tracker</h1>
        <p className="text-muted-foreground mt-1">Running balance summary across all people</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* They owe me */}
        <Card className="stat-card-success border-0 animate-slide-up stagger-1">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Owed To You</p>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 number-display">
              {formatCurrency(totalTheyOweMe)}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              {balances?.filter(b => b.netBalance > 0).length ?? 0} people owe you
            </p>
          </CardContent>
        </Card>

        {/* I owe them */}
        <Card className="stat-card-danger border-0 animate-slide-up stagger-2">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">You Owe Others</p>
              <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100 number-display">
              {formatCurrency(totalIOwe)}
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              You owe {balances?.filter(b => b.netBalance < 0).length ?? 0} people
            </p>
          </CardContent>
        </Card>

        {/* Net Position */}
        <Card className={`border-0 animate-slide-up stagger-3 ${
          netPosition > 0 ? "stat-card-success" : netPosition < 0 ? "stat-card-danger" : "bg-muted"
        }`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <p className={`text-sm font-medium ${
                netPosition > 0 ? "text-emerald-800 dark:text-emerald-200" :
                netPosition < 0 ? "text-red-800 dark:text-red-200" :
                "text-muted-foreground"
              }`}>Net Position</p>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                netPosition > 0 ? "bg-emerald-500/20" : netPosition < 0 ? "bg-red-500/20" : "bg-muted"
              }`}>
                <Scale className={`h-4 w-4 ${
                  netPosition > 0 ? "text-emerald-600 dark:text-emerald-400" :
                  netPosition < 0 ? "text-red-600 dark:text-red-400" :
                  "text-muted-foreground"
                }`} />
              </div>
            </div>
            <p className={`text-2xl font-bold number-display ${
              netPosition > 0 ? "text-emerald-900 dark:text-emerald-100" :
              netPosition < 0 ? "text-red-900 dark:text-red-100" :
              "text-foreground"
            }`}>
              {netPosition > 0 ? "+" : ""}{formatCurrency(netPosition)}
            </p>
            <p className={`text-xs mt-1 ${
              netPosition > 0 ? "text-emerald-700 dark:text-emerald-300" :
              netPosition < 0 ? "text-red-700 dark:text-red-300" :
              "text-muted-foreground"
            }`}>
              {netPosition > 0 ? "Overall, you are owed more" :
               netPosition < 0 ? "Overall, you owe more" :
               "Perfectly balanced"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Person-wise Balances */}
      <Card className="card-premium border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Person-wise Breakdown
          </CardTitle>
          <p className="text-sm text-muted-foreground">Click on a person to see detailed balances</p>
        </CardHeader>
        <CardContent>
          {sortedBalances && sortedBalances.length > 0 ? (
            <div className="space-y-2">
              {sortedBalances.map((balance, idx) => {
                const isExpanded = expandedPerson === balance.personId;
                const netBalance = balance.netBalance;

                return (
                  <div
                    key={balance.personId}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      netBalance > 0
                        ? "border-emerald-200 dark:border-emerald-900/50"
                        : netBalance < 0
                          ? "border-red-200 dark:border-red-900/50"
                          : "border-border"
                    }`}
                  >
                    {/* Row Header */}
                    <button
                      id={`person-balance-${balance.personId}`}
                      className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left"
                      onClick={() => setExpandedPerson(isExpanded ? null : balance.personId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                          netBalance > 0 ? "bg-emerald-100 dark:bg-emerald-900/50" :
                          netBalance < 0 ? "bg-red-100 dark:bg-red-900/50" :
                          "bg-muted"
                        }`}>
                          <User className={`h-4 w-4 ${
                            netBalance > 0 ? "text-emerald-600 dark:text-emerald-400" :
                            netBalance < 0 ? "text-red-600 dark:text-red-400" :
                            "text-muted-foreground"
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{balance.person.name}</p>
                          {balance.person.notes && (
                            <p className="text-xs text-muted-foreground">{balance.person.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`font-bold text-sm number-display ${
                            netBalance > 0 ? "text-emerald-600 dark:text-emerald-400" :
                            netBalance < 0 ? "text-red-600 dark:text-red-400" :
                            "text-muted-foreground"
                          }`}>
                            {netBalance > 0 ? "+" : ""}{formatCurrency(netBalance)}
                          </p>
                          <div className={`flex items-center gap-1 justify-end mt-0.5 ${
                            netBalance > 0 ? "text-emerald-600 dark:text-emerald-400" :
                            netBalance < 0 ? "text-red-600 dark:text-red-400" :
                            "text-muted-foreground"
                          }`}>
                            {netBalance > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : netBalance < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            <span className="text-xs">
                              {netBalance > 0 ? "They owe you" :
                               netBalance < 0 ? "You owe them" :
                               "Settled"}
                            </span>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-border bg-muted/30">
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-900/50">
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mb-1">
                              Owed To You
                            </p>
                            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200 number-display">
                              {formatCurrency(balance.totalOwedToMe)}
                            </p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                              EMI payments + loans given
                            </p>
                          </div>
                          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 border border-red-200 dark:border-red-900/50">
                            <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-1">
                              You Owe
                            </p>
                            <p className="text-lg font-bold text-red-800 dark:text-red-200 number-display">
                              {formatCurrency(balance.totalOwedByMe)}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                              Loans received
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Scale className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No balances yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Add people and create EMI or loan entries to see running balances here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
