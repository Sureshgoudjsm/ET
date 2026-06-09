import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import EMITracker from "./pages/EMITracker";
import LoanTracker from "./pages/LoanTracker";
import MonthView from "./pages/MonthView";
import YearView from "./pages/YearView";
import BalanceTracker from "./pages/BalanceTracker";
import Persons from "./pages/Persons";
import PersonDetail from "./pages/PersonDetail";
import GoldLoans from "./pages/GoldLoans";
import CreditCardDebt from "./pages/CreditCardDebt";
import ChittiSavings from "./pages/ChittiSavings";
import ExpenseTracker from "./pages/ExpenseTracker";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import ExportData from "./pages/ExportData";
import DashboardLayout from "./components/DashboardLayout";
import { useAuth } from "./_core/hooks/useAuth";

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <span className="text-primary-foreground font-bold">₹</span>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/emi" component={EMITracker} />
          <Route path="/loans" component={LoanTracker} />
          <Route path="/gold-loans" component={GoldLoans} />
          <Route path="/credit-cards" component={CreditCardDebt} />
          <Route path="/chittis" component={ChittiSavings} />
          <Route path="/expenses" component={ExpenseTracker} />
          <Route path="/month" component={MonthView} />
          <Route path="/year" component={YearView} />
          <Route path="/balance" component={BalanceTracker} />
          <Route path="/persons" component={Persons} />
          <Route path="/persons/:id" component={PersonDetail} />
          <Route path="/settings" component={Settings} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/export" component={ExportData} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
