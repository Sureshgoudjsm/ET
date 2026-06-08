import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { User, Sun, Moon, DollarSign, Database, Settings as SettingsIcon, BellRing, Save, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Settings States
  const [currency, setCurrency] = useState(() => localStorage.getItem("preferred_currency") || "INR");
  const [defaultTab, setDefaultTab] = useState(() => localStorage.getItem("default_landing_tab") || "/");
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem("alert_email_enabled") !== "false");
  const [smsAlerts, setSmsAlerts] = useState(() => localStorage.getItem("alert_sms_enabled") === "true");

  const handleSaveSettings = () => {
    localStorage.setItem("preferred_currency", currency);
    localStorage.setItem("default_landing_tab", defaultTab);
    localStorage.setItem("alert_email_enabled", String(emailAlerts));
    localStorage.setItem("alert_sms_enabled", String(smsAlerts));
    toast.success("Settings saved successfully ✓");
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground number-display">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your application preferences and profile configurations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details Card */}
        <Card className="card-premium border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-primary" />
              User Profile
            </CardTitle>
            <CardDescription>Authenticated user details and credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl border border-border/40">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{user?.name || "Anonymous User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || "No email provided"}</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1.5 px-1 pt-2">
              <div className="flex justify-between">
                <span>Account Role:</span>
                <span className="font-medium text-foreground capitalize">{user?.role || "User"}</span>
              </div>
              <div className="flex justify-between">
                <span>Auth Identifier:</span>
                <span className="font-mono truncate max-w-[180px]">{user?.openId || "local-dev"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Mode Card */}
        <Card className="card-premium border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
              Appearance Mode
            </CardTitle>
            <CardDescription>Switch between dark and light aesthetics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/40">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">Dark Theme</span>
                <span className="text-xs text-muted-foreground">Adjust contrast for low-light environments</span>
              </div>
              <Switch 
                checked={theme === "dark"} 
                onCheckedChange={() => toggleTheme?.()} 
                disabled={!toggleTheme}
              />
            </div>
            {!toggleTheme && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                Theme switches are only switchable when the global provider is configured.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card className="card-premium border-0 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <SettingsIcon className="h-5 w-5 text-primary" />
              General Preferences
            </CardTitle>
            <CardDescription>Customize currency format and dashboard landing behaviors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currency-select" className="text-xs font-semibold text-muted-foreground">Display Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency-select" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">Indian Rupee (₹ INR)</SelectItem>
                    <SelectItem value="USD">US Dollar ($ USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="landing-select" className="text-xs font-semibold text-muted-foreground">Default Landing Page</Label>
                <Select value={defaultTab} onValueChange={setDefaultTab}>
                  <SelectTrigger id="landing-select" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="/">Dashboard</SelectItem>
                    <SelectItem value="/emi">EMI Tracker</SelectItem>
                    <SelectItem value="/month">Month View</SelectItem>
                    <SelectItem value="/persons">Persons List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 mt-2">
              <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
                <BellRing className="h-4 w-4" />
                Notification Subscriptions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/20">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">Email Notifications</span>
                    <span className="text-[10px] text-muted-foreground">Receive upcoming EMI reminders via email</span>
                  </div>
                  <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/20">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">SMS Notifications</span>
                    <span className="text-[10px] text-muted-foreground">Receive critical credit card bill alerts via SMS</span>
                  </div>
                  <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 mt-2">
              <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                <Database className="h-4 w-4" />
                Database Configuration
              </h3>
              <div className="p-3 bg-muted/30 rounded-xl border border-border/40 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" /> Active
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-medium text-foreground">
                    {window.location.hostname === "localhost" ? "In-Memory Fallback (memStore)" : "Production Vercel SQL / Fallback"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button onClick={handleSaveSettings} className="flex items-center gap-1.5 shadow-lg">
                <Save className="h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security & Privacy Card */}
        <Card className="card-premium border-0 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Security &amp; Privacy
            </CardTitle>
            <CardDescription>Data ownership, storage, and privacy guarantees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: "🔒", title: "Your data only", desc: "No data is shared with third parties or advertisers" },
                { icon: "🏦", title: "Account-scoped", desc: "All records are isolated to your Google account" },
                { icon: "📤", title: "Export anytime", desc: "Full JSON export available from the Export Data page" },
              ].map(item => (
                <div key={item.title} className="p-3 bg-muted/30 rounded-xl border border-border/40 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs font-semibold text-foreground">{item.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
