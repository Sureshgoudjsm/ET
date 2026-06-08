import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { Sparkles, X, Send, Loader2, CheckCircle, ArrowRight, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type ParsedEntry = {
  type: "expense" | "loan" | "payment" | null;
  amount: number | null;
  personName: string | null;
  category: string | null;
  date: string | null;
  notes: string | null;
  confidence: "high" | "medium" | "low";
  suggestion: string;
};

const PROMPTS = [
  "I gave Bilal ₹3000 for groceries today",
  "Mother's gold loan interest ₹1500 paid",
  "Sunny paid his CC bill ₹8000 this week",
  "Log ₹500 transport expense for yesterday",
];

export default function AICopilot({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedEntry | null>(null);
  const [step, setStep] = useState<"input" | "confirm">("input");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, setLocation] = useLocation();

  const parseEntry = trpc.ai.parseEntry.useMutation({
    onSuccess: (data) => {
      setParsed(data as ParsedEntry);
      setStep("confirm");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to parse entry — please try again");
    },
  });

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    parseEntry.mutate({ text });
  };

  const handleConfirm = () => {
    if (!parsed) return;
    // Navigate to the appropriate page so user can fill in the form with the parsed values
    if (parsed.type === "expense") {
      toast.success(`Navigate to General Expenses — ${parsed.amount ? formatCurrency(parsed.amount) : ""} ${parsed.category || ""}`);
      setLocation("/expenses");
    } else if (parsed.type === "loan") {
      toast.success(`Navigate to Loan Tracker — ${parsed.personName ? `for ${parsed.personName}` : ""}`);
      setLocation("/loans");
    } else {
      toast.success("Navigate to Month View to update payment status");
      setLocation("/month");
    }
    onClose();
  };

  const confidenceColor = {
    high: "text-emerald-600 dark:text-emerald-400",
    medium: "text-amber-600 dark:text-amber-400",
    low: "text-red-500",
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-end px-4 pb-4 md:px-6 md:pb-6 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto">
        {/* Panel */}
        <div className="bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-indigo-500/5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">AI Copilot</p>
                <p className="text-[10px] text-muted-foreground">Natural language entry</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {step === "input" ? (
              <>
                {/* Input area */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Describe the transaction in plain language
                  </label>
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="e.g. I gave Bilal ₹3000 for groceries today"
                    className="resize-none min-h-[70px] text-sm"
                    rows={3}
                  />
                </div>

                {/* Quick prompts */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Try these
                  </p>
                  <div className="flex flex-col gap-1">
                    {PROMPTS.map(p => (
                      <button
                        key={p}
                        onClick={() => setInput(p)}
                        className="text-left text-xs px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || parseEntry.isPending}
                  className="w-full gap-2"
                >
                  {parseEntry.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Parsing...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Parse Entry</>
                  )}
                </Button>
              </>
            ) : parsed ? (
              <>
                {/* Confirmation step */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">Parsed Result</p>
                    <span className={`text-[10px] font-bold uppercase ${confidenceColor[parsed.confidence]}`}>
                      {parsed.confidence} confidence
                    </span>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-xl border border-border/40 space-y-2 text-sm">
                    {parsed.type && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-semibold capitalize text-foreground">{parsed.type}</span>
                      </div>
                    )}
                    {parsed.amount !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-bold text-foreground number-display">{formatCurrency(parsed.amount)}</span>
                      </div>
                    )}
                    {parsed.personName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Person:</span>
                        <span className="font-semibold text-foreground">{parsed.personName}</span>
                      </div>
                    )}
                    {parsed.category && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-semibold text-foreground">{parsed.category}</span>
                      </div>
                    )}
                    {parsed.date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-semibold text-foreground">{parsed.date}</span>
                      </div>
                    )}
                    {parsed.notes && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Notes:</span>
                        <span className="text-foreground text-xs max-w-[55%] text-right">{parsed.notes}</span>
                      </div>
                    )}
                  </div>

                  {parsed.suggestion && (
                    <div className="p-2.5 bg-primary/5 border border-primary/15 rounded-lg text-xs text-primary/80">
                      💡 {parsed.suggestion}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setStep("input"); setParsed(null); }}>
                      Try again
                    </Button>
                    <Button size="sm" className="flex-1 gap-1.5" onClick={handleConfirm}>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Go to form
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
