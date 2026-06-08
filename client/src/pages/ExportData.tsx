import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileJson, AlertCircle, CheckCircle, Database } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ExportData() {
  const [isExporting, setIsExporting] = useState(false);
  const utils = trpc.useUtils();

  const handleExportData = async () => {
    setIsExporting(true);
    toast.info("Preparing bulk database export...");

    try {
      // Fetch all tables in parallel using the trpc query client
      const [
        persons,
        emis,
        loans,
        payments,
        chittis,
        expenses,
        creditCards,
        creditCardDebts,
        goldLoans
      ] = await Promise.all([
        utils.person.list.fetch().catch(() => []),
        utils.emi.list.fetch().catch(() => []),
        utils.loan.list.fetch().catch(() => []),
        utils.payment.list.fetch().catch(() => []),
        utils.chitti.list.fetch().catch(() => []),
        utils.expense.list.fetch().catch(() => []),
        utils.creditCard.list.fetch().catch(() => []),
        utils.creditCard.listDebts.fetch().catch(() => []),
        utils.goldLoan.list.fetch().catch(() => [])
      ]);

      const exportPayload = {
        meta: {
          appName: "Expense Tracker",
          exportTimestamp: new Date().toISOString(),
          version: "1.0.0"
        },
        data: {
          persons,
          emis,
          loans,
          payments,
          chittis,
          expenses,
          creditCards,
          creditCardDebts,
          goldLoans
        }
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `expense_tracker_backup_${new Date().toISOString().slice(0,10)}.json`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Consolidated database backup downloaded ✓");
    } catch (error: any) {
      console.error("Export failure:", error);
      toast.error(error.message || "Failed to compile export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground number-display">Export Data</h1>
        <p className="text-muted-foreground mt-1">Backup your ledger logs and transactions for safety and audits</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Bulk Export Control Panel - Left 2 Columns */}
        <div className="md:col-span-2 space-y-4">
          <Card className="card-premium border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" />
                Consolidated Database Export
              </CardTitle>
              <CardDescription>Compile all tables into a structured JSON backup payload</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="p-4 bg-muted/20 border border-border/40 rounded-xl space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Database className="h-4.5 w-4.5 text-primary" />
                  Backup Inclusions
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This process triggers parallel fetches to serialize all ledger logs. The downloaded file can be imported/audited offline and contains:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground list-disc list-inside pl-1">
                  <li>Tracked Contacts & People</li>
                  <li>EMI Schedules & Repayments</li>
                  <li>Loans Given & Received logs</li>
                  <li>Payments Audit Ledger</li>
                  <li>Chitti Savings Contributions</li>
                  <li>General Categorized Expenses</li>
                  <li>Credit Card bills and debts</li>
                  <li>Gold Loan Interest payments</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20 text-xs">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>
                  Exported backups contain sensitive ledger data. Store them in encrypted, trusted folders only.
                </p>
              </div>

              <div className="flex justify-end border-t border-border/50 pt-4">
                <Button
                  id="trigger-bulk-export-btn"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 shadow-lg min-w-[160px] justify-center"
                >
                  {isExporting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Compiling...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Export All Data (JSON)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Box - Right 1 Column */}
        <div className="space-y-4">
          <Card className="card-premium border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Backup Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3 text-muted-foreground pt-1">
              <p className="leading-relaxed">
                Backups conform to the standard schema layout. All financial columns (amounts) are exported in **paise** (integer format) to ensure zero precision loss during JSON representation and parsing.
              </p>
              <div className="p-3 bg-muted/20 border rounded-lg border-border/30">
                <span className="font-semibold text-foreground">Formula:</span>
                <p className="mt-1 text-[10px] text-mono">Rupees = Paise / 100</p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
