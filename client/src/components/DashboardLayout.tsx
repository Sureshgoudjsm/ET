import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, LogOut, PanelLeft, Wallet, TrendingUp, Calendar, BarChart3, 
  Users, Scale, CreditCard, Coins, Receipt, Gem, Settings, Bell, Download, ChevronRight 
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const groups = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Month View", path: "/month", icon: Calendar },
      { label: "Year View", path: "/year", icon: BarChart3 },
      { label: "Balance Tracker", path: "/balance", icon: Scale },
    ]
  },
  {
    id: "debt",
    label: "Debt & EMIs",
    icon: CreditCard,
    items: [
      { label: "EMI Tracker", path: "/emi", icon: TrendingUp },
      { label: "Loan Tracker", path: "/loans", icon: Wallet },
      { label: "Gold Loans", path: "/gold-loans", icon: Gem },
      { label: "CC Debt", path: "/credit-cards", icon: CreditCard },
    ]
  },
  {
    id: "savings",
    label: "Savings & Expenses",
    icon: Coins,
    items: [
      { label: "Chitti Savings", path: "/chittis", icon: Coins },
      { label: "General Expenses", path: "/expenses", icon: Receipt },
    ]
  },
  {
    id: "settings",
    label: "People & Settings",
    icon: Users,
    items: [
      { label: "Manage People", path: "/persons", icon: Users },
      { label: "Settings", path: "/settings", icon: Settings },
      { label: "Notifications", path: "/notifications", icon: Bell },
      { label: "Export Data", path: "/export", icon: Download },
    ]
  }
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const allMenuItems = groups.flatMap(group => group.items);
  const activeMenuItem = allMenuItems.find(item => item.path === location);
  const activeGroup = groups.find(group => group.items.some(item => item.path === location)) || groups[0];

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    debt: true,
    savings: true,
    settings: true,
  });

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  // Hide scrollbar utility for Webkit browsers in mobile sub-tab bar
  useEffect(() => {
    if (isMobile) {
      const style = document.createElement("style");
      style.innerHTML = `
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [isMobile]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      {!isMobile && (
        <div className="relative" ref={sidebarRef}>
          <Sidebar
            collapsible="icon"
            className="border-r-0"
            disableTransition={isResizing}
          >
            <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
              <div className="flex items-center gap-3 px-2 transition-all w-full">
                <button
                  onClick={toggleSidebar}
                  className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                  aria-label="Toggle navigation"
                >
                  <PanelLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                {!isCollapsed ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <span className="text-primary-foreground font-bold text-sm">₹</span>
                    </div>
                    <span className="font-semibold tracking-tight truncate text-sidebar-foreground">
                      Expense Tracker
                    </span>
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground font-bold text-sm">₹</span>
                  </div>
                )}
              </div>
            </SidebarHeader>

            <SidebarContent className="gap-0 py-2">
              {groups.map((group) => {
                const isGroupActive = group.items.some((item) => item.path === location);
                const isOpen = isCollapsed ? true : openGroups[group.id];

                return (
                  <Collapsible
                    key={group.id}
                    open={isOpen}
                    onOpenChange={(openState) => {
                      if (!isCollapsed) {
                        setOpenGroups((prev) => ({ ...prev, [group.id]: openState }));
                      }
                    }}
                    className="w-full"
                  >
                    <SidebarGroup className="py-1">
                      {!isCollapsed && (
                        <SidebarGroupLabel asChild>
                          <CollapsibleTrigger asChild>
                            <button
                              className={`flex w-full items-center justify-between text-xs font-semibold px-2 py-1.5 rounded-lg transition-all focus:outline-none ${
                                isGroupActive 
                                  ? "text-primary hover:bg-primary/5" 
                                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <group.icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{group.label}</span>
                              </div>
                              <ChevronRight className={`ml-auto h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                            </button>
                          </CollapsibleTrigger>
                        </SidebarGroupLabel>
                      )}
                      
                      <CollapsibleContent className="transition-all duration-200">
                        <SidebarGroupContent>
                          <SidebarMenu className={isCollapsed ? "" : "pl-2"}>
                            {group.items.map((item) => {
                              const isActive = location === item.path;
                              return (
                                <SidebarMenuItem key={item.path}>
                                  <SidebarMenuButton
                                    isActive={isActive}
                                    onClick={() => setLocation(item.path)}
                                    tooltip={item.label}
                                    className={`h-9 transition-all duration-150 font-normal rounded-lg ${
                                      isActive
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                        : "hover:bg-sidebar-accent text-sidebar-foreground"
                                    }`}
                                  >
                                    <item.icon
                                      className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}
                                    />
                                    <span className="font-medium text-sm">{item.label}</span>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </CollapsibleContent>
                    </SidebarGroup>
                  </Collapsible>
                );
              })}
            </SidebarContent>

            <SidebarFooter className="p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Avatar className="h-9 w-9 border shrink-0">
                      <AvatarFallback className="text-xs font-medium">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                      <p className="text-sm font-medium truncate leading-none">
                        {user?.name || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1.5">
                        {user?.email || "-"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </Sidebar>
          <div
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
            onMouseDown={() => {
              if (isCollapsed) return;
              setIsResizing(true);
            }}
            style={{ zIndex: 50 }}
          />
        </div>
      )}

      <SidebarInset>
        {isMobile ? (
          <>
            {/* Mobile Top Header */}
            <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">₹</span>
                </div>
                <span className="font-semibold tracking-tight text-foreground text-sm">
                  Expense Tracker
                </span>
              </div>
              
              {/* Quick links / Notification Status Icon */}
              <button 
                onClick={() => setLocation("/notifications")} 
                className="relative h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
              </button>
            </div>
            
            {/* Mobile Sub-tabs navigation */}
            {activeGroup && (
              <div 
                className="flex items-center gap-1.5 px-4 py-2 border-b overflow-x-auto scrollbar-none bg-background/50 backdrop-blur sticky top-14 z-30"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {activeGroup.items.map(item => {
                  const isActive = location === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => setLocation(item.path)}
                      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : null}

        <main className="flex-1 p-4 pb-24 md:pb-4">{children}</main>

        {/* Mobile Bottom Tab Bar */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border/60 flex justify-around items-center h-16 pb-safe">
            {groups.map((group) => {
              const isGroupActive = group.items.some((item) => item.path === location);
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    // Navigate to the first item in the group
                    setLocation(group.items[0].path);
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 flex-1 py-1 text-center transition-all ${
                    isGroupActive
                      ? "text-primary scale-105"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <group.icon className="h-5 w-5" />
                  <span className="text-[10px] font-semibold tracking-tight leading-none">
                    {group.label.split(" & ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </SidebarInset>
    </>
  );
}
