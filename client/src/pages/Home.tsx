import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import Dashboard from "./Dashboard";
import { TrendingUp, Wallet, Scale, BarChart3, CheckCircle } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "EMI Auto-Tracking",
    description: "Enter once, get monthly records generated automatically",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/50",
  },
  {
    icon: Wallet,
    title: "Loan Management",
    description: "Record money given or received with full history",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
  },
  {
    icon: Scale,
    title: "Running Balance",
    description: "See exactly who owes what at a glance",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/50",
  },
  {
    icon: BarChart3,
    title: "Year-wise Analytics",
    description: "Visualize annual financial trends with charts",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
  },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">₹</span>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading your finances...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-base">₹</span>
            </div>
            <span className="font-bold text-foreground text-lg tracking-tight">Expense Tracker</span>
          </div>
          <Button
            id="hero-signin-btn"
            onClick={() => (window.location.href = getLoginUrl())}
            className="btn-primary-glow"
          >
            Sign In
          </Button>
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-4xl mx-auto w-full">
          <div className="animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <CheckCircle className="h-4 w-4" />
              Replace your Excel sheet forever
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tight mb-4 leading-tight number-display">
              Smart Finance
              <span className="block text-primary">Tracker</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
              Track EMIs, loans, and payments with elegance. Auto-generate monthly records,
              view running balances, and get year-wise financial insights — all in one place.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
              <Button
                id="main-signin-btn"
                onClick={() => (window.location.href = getLoginUrl())}
                size="lg"
                className="btn-primary-glow text-base px-8"
              >
                Get Started — It's Free
              </Button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full animate-slide-up stagger-2">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className={`card-premium border-0 p-5 text-left flex items-start gap-4 animate-slide-up stagger-${idx + 2}`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${feature.bg}`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Currency note */}
          <p className="text-xs text-muted-foreground mt-8 flex items-center gap-1">
            <span className="font-semibold text-primary">₹</span>
            All amounts displayed in Indian Rupees
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold text-foreground number-display">
          Welcome back, {user?.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's your financial overview for today.
        </p>
      </div>
      <Dashboard />
    </div>
  );
}
