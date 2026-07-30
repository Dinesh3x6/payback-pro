"use client";
import { cx } from "@/lib/utils";

export type ChannelName =
  | "EMAIL"
  | "WHATSAPP"
  | "SMS"
  | "TELEGRAM"
  | "PUSH"
  | "DESKTOP"
  | "IN_APP"
  | "DISCORD"
  | "SLACK"
  | "TEAMS"
  | "QR";

const CHANNELS: { name: ChannelName; label: string; live: boolean }[] = [
  { name: "EMAIL", label: "Email", live: true },
  { name: "WHATSAPP", label: "WhatsApp", live: true },
  { name: "SMS", label: "SMS", live: true },
  { name: "TELEGRAM", label: "Telegram", live: false },
  { name: "PUSH", label: "Push", live: false },
  { name: "DESKTOP", label: "Desktop", live: false },
  { name: "IN_APP", label: "In-App", live: false },
  { name: "DISCORD", label: "Discord", live: false },
  { name: "SLACK", label: "Slack", live: false },
  { name: "TEAMS", label: "MS Teams", live: false },
  { name: "QR", label: "QR Code", live: false },
];

export function ChannelSelector({
  selected,
  onChange,
}: {
  selected: ChannelName[];
  onChange: (channels: ChannelName[]) => void;
}) {
  function toggle(name: ChannelName) {
    onChange(selected.includes(name) ? selected.filter((c) => c !== name) : [...selected, name]);
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {CHANNELS.map((ch) => (
        <label
          key={ch.name}
          className={cx(
            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
            selected.includes(ch.name)
              ? "border-ink bg-paper-muted dark:border-paper dark:bg-ink-light"
              : "border-line dark:border-ink-light"
          )}
        >
          <input type="checkbox" checked={selected.includes(ch.name)} onChange={() => toggle(ch.name)} className="accent-ink dark:accent-paper" />
          {ch.label}
          {!ch.live && <span className="ml-auto text-[10px] text-ink-muted">stub</span>}
        </label>
      ))}
    </div>
  );
}
