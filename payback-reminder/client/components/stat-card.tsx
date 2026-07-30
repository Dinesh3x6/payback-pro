import { LucideIcon } from "lucide-react";
import { cx } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "moss" | "amber" | "rust";
  sublabel?: string;
}

const TONE_STYLES: Record<string, string> = {
  default: "text-ink dark:text-paper",
  moss: "text-moss",
  amber: "text-amber",
  rust: "text-rust",
};

export function StatCard({ label, value, icon: Icon, tone = "default", sublabel }: StatCardProps) {
  return (
    <div className="stub-card p-5 pt-7">
      <div className="flex items-center justify-between">
        <span className="label-text mb-0">{label}</span>
        <Icon size={16} className={cx(TONE_STYLES[tone], "opacity-70")} />
      </div>
      <p className={cx("mt-2 text-3xl font-display font-semibold tabular", TONE_STYLES[tone])}>{value}</p>
      {sublabel && <p className="text-xs text-ink-muted mt-1">{sublabel}</p>}
    </div>
  );
}
