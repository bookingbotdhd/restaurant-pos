"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// A table sitting in one state for a long time needs attention: 60 minutes
// is "seated a while" (warning), 2 hours is overdue (danger). The same
// thresholds apply to a reservation held unseated — a table reserved for
// two hours without anyone sitting down is worth a look too. Tones come
// from the StatusBadge map, never a hand-picked colour class.
const ATTENTION_MINUTES = 60;
const OVERDUE_MINUTES = 120;

function timerTone(minutes: number): StatusTone {
  if (minutes >= OVERDUE_MINUTES) return "danger";
  if (minutes >= ATTENTION_MINUTES) return "warning";
  return "neutral";
}

/**
 * Live "how long has this table been in its current state" pill — counts
 * up from `statusSince` (set server-side the moment a table's status last
 * changed, see Table.statusSince in schema.prisma). Ticks once a second so
 * the floor view and POS table picker read as live, and resets the moment
 * `since` changes — i.e. the moment the table's status changes and the
 * server hands back a new `statusSince` (floors refetch every 10s, and a
 * status change invalidates the query immediately).
 *
 * Shaped like the KDS elapsed pill (rounded-full, tabular-nums) with the
 * tone carrying the threshold state — the time label is always there, so
 * the status is never colour alone.
 */
export function ElapsedTimer({ since, className }: { since: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // A new `since` means the status changed: restart from zero right away
  // instead of showing the old elapsed time until the next tick.
  useEffect(() => {
    setNow(Date.now());
  }, [since]);

  const elapsed = now - new Date(since).getTime();

  return (
    <StatusBadge tone={timerTone(elapsed / 60_000)} className={cn("tabular-nums", className)}>
      <Clock className="h-3 w-3" aria-hidden />
      {formatElapsed(elapsed)}
    </StatusBadge>
  );
}
