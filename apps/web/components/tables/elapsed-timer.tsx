"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Live "how long has this table been in its current state" badge — counts
 * up from `statusSince` (set server-side the moment a table's status last
 * changed, see Table.statusSince in schema.prisma). Ticks once a second so
 * the floor view and POS table picker read as live, and resets the moment
 * `since` changes — i.e. the moment the table's status changes and the
 * server hands back a new `statusSince` (floors refetch every 10s, and a
 * status change invalidates the query immediately).
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
    <span className={className} title={`Occupied for ${formatElapsed(elapsed)}`}>
      <Clock className="h-3 w-3" />
      {formatElapsed(elapsed)}
    </span>
  );
}
