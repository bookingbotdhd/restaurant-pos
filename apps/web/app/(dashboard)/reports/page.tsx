"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SchedulesPanel } from "@/components/reports/schedules-panel";

interface CatalogEntry {
  key: string;
  title: string;
  group: string;
}
interface ReportResult {
  key: string;
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function ReportsPage() {
  const { branchId } = useBranch();
  const { data: me } = useCurrentUser();
  const canExport = hasPermission(me?.user, "data.export");
  const [key, setKey] = useState("sales-daily");
  const [range, setRange] = useState(() => ({
    from: iso(new Date(Date.now() - 29 * 86_400_000)),
    to: iso(new Date()),
  }));

  const { data: catalog } = useQuery({
    queryKey: ["reports", "catalog"],
    queryFn: () => api.get<CatalogEntry[]>("/reports"),
  });
  const qs = `branchId=${branchId}&from=${range.from}&to=${range.to}`;
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", key, branchId, range.from, range.to],
    queryFn: () => api.get<ReportResult>(`/reports/${key}?${qs}`),
    enabled: !!branchId && range.from <= range.to,
    retry: false,
  });

  const groups = [...new Set(catalog?.map((c) => c.group))];

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <PageHeader
          title="Reports"
          description="Filter by date, print, export to Excel, PDF or CSV, or email on a schedule"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="flex flex-col gap-4 print:hidden" aria-label="Reports">
          {groups.map((g) => (
            <div key={g} className="flex flex-col gap-1">
              <p className="eyebrow px-3 pb-1">{g}</p>
              {catalog
                ?.filter((c) => c.group === g)
                .map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    aria-current={key === c.key ? "true" : undefined}
                    onClick={() => setKey(c.key)}
                    className={cn(
                      "min-h-11 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                      key === c.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-secondary",
                    )}
                  >
                    {c.title}
                  </button>
                ))}
            </div>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-wrap items-center gap-2 p-4 print:hidden">
            <Input type="date" className="w-40" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
            <Input type="date" className="w-40" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            {canExport &&
              (["xlsx", "pdf", "csv"] as const).map((f) => (
                <Button
                  key={f}
                  variant="outline"
                  size="sm"
                  render={<a href={`/api/v1/reports/${key}/export?${qs}&format=${f}`} />}
                >
                  <Download className="mr-2 h-4 w-4" /> {f === "xlsx" ? "Excel" : f.toUpperCase()}
                </Button>
              ))}
          </Card>

          <Card className="overflow-hidden p-6">
            <h2 className="mb-1 text-lg font-semibold text-foreground">{data?.title ?? catalog?.find((c) => c.key === key)?.title}</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {range.from} to {range.to}
            </p>
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : error ? (
              <p className="text-sm text-destructive">{error instanceof ApiError ? error.message : "Could not load report"}</p>
            ) : data && data.rows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {data.columns.map((c) => (
                      <TableHead key={c}>{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r, i) => (
                    <TableRow key={i}>
                      {r.map((cell, j) => (
                        <TableCell key={j} className="tabular-nums">
                          {cell ?? "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={FileText}
                title="No data for this period."
                description="Try a wider date range, or check that orders were recorded in this branch."
                className="py-10"
              />
            )}
          </Card>

          {canExport && (
            <SchedulesPanel
              branchId={branchId}
              reportKey={key}
              titles={Object.fromEntries((catalog ?? []).map((c) => [c.key, c.title]))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
