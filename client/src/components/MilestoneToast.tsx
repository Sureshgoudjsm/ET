import { useEffect, useRef } from "react";
import { CheckCircle, PartyPopper } from "lucide-react";
import { toast } from "sonner";

type MilestoneType =
  | "emi_complete"
  | "month_cleared"
  | "loan_paid"
  | "streak";

type MilestoneConfig = {
  icon: string;
  title: string;
  description: string;
  color: string;
};

const MILESTONES: Record<MilestoneType, MilestoneConfig> = {
  emi_complete: {
    icon: "🎉",
    title: "EMI Fully Cleared!",
    description: "Congratulations — this EMI is completely paid off!",
    color: "oklch(0.62 0.18 150)",
  },
  month_cleared: {
    icon: "🌟",
    title: "Month Zero-Pending!",
    description: "All payments cleared for this month. Outstanding!",
    color: "oklch(0.55 0.25 265)",
  },
  loan_paid: {
    icon: "💪",
    title: "Loan Settled!",
    description: "Full loan balance settled. Debt-free feels great!",
    color: "oklch(0.72 0.18 75)",
  },
  streak: {
    icon: "🔥",
    title: "7-Day Logging Streak!",
    description: "You've been logging expenses every day this week!",
    color: "oklch(0.65 0.22 50)",
  },
};

let confettiLoaded = false;
let confettiFn: ((opts: any) => void) | null = null;

async function launchConfetti(color: string) {
  if (!confettiLoaded) {
    try {
      const mod = await import("canvas-confetti");
      confettiFn = mod.default;
      confettiLoaded = true;
    } catch {
      return; // canvas-confetti not available, skip silently
    }
  }
  if (!confettiFn) return;
  confettiFn({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: [color, "#ffffff", "#ffd700"],
    disableForReducedMotion: true,
  });
}

export function triggerMilestone(type: MilestoneType) {
  const config = MILESTONES[type];
  launchConfetti(config.color);
  toast.custom(
    () => (
      <div className="flex items-center gap-3 bg-card border border-border/60 shadow-xl rounded-xl px-4 py-3 min-w-[280px]">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: `${config.color}20` }}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm">{config.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
        </div>
        <CheckCircle className="h-5 w-5 shrink-0" style={{ color: config.color }} />
      </div>
    ),
    { duration: 5000 }
  );
}

// Achievement badge component for Dashboard
export type Achievement = {
  id: string;
  icon: string;
  label: string;
  earned: boolean;
};

export function AchievementBadges({ achievements }: { achievements: Achievement[] }) {
  const earned = achievements.filter(a => a.earned);
  if (earned.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <PartyPopper className="h-4 w-4 text-primary shrink-0" />
      {earned.map(a => (
        <span
          key={a.id}
          title={a.label}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold"
        >
          <span>{a.icon}</span>
          <span className="hidden sm:inline">{a.label}</span>
        </span>
      ))}
    </div>
  );
}

// Streak component
export function ExpenseStreak({ days }: { days: number }) {
  if (days < 2) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
      <span className="text-base">🔥</span>
      <span>{days}-day logging streak</span>
    </div>
  );
}
