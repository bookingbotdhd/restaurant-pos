"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FORECAST_DAY_OPTIONS,
  useForecast,
  type ForecastConfidence,
  type SalesForecast,
} from "@/hooks/use-dashboard";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const compactNumber = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

const CONFIDENCE_LABEL: Record<ForecastConfidence, string> = {
  good: "Steady",
  low: "Rough guide",
  fallback: "Fallback",
  none: "No data",
};

function shortDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function weekdayShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { weekday: "short" });
}

// One continuous line: solid actuals for the last 14 days, dashed forecast
// after today. A null in the other series breaks that series' line, so the
// two never join into a misleading single slope.
function chartRows(forecast: SalesForecast) {
  return [
    ...forecast.recentActuals.map((d) => ({
      date: d.date,
      actual: d.sales,
      forecast: null as number | null,
    })),
    ...forecast.days.map((d) => ({
      date: d.date,
      actual: null as number | null,
      forecast: d.forecastSales,
    })),
  ];
}

export function ForecastWidget({ branchId }: { branchId: string | null }) {
  const [days, setDays] = useState<(typeof FORECAST_DAY_OPTIONS)[number]>(7);
  const { data, isLoading, isFetching, error, refetch } = useForecast(branchId, days);

  const hasForecast = !!data?.days.some((d) => d.forecastSales !== null);

  return (
    <Card className="flex flex-col gap-4 p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[18px] font-medium text-foreground">
            <TrendingUp className="h-[18px] w-[18px] text-muted-foreground" />
            Sales forecast — next {days} days
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Baseline forecast, not machine learning — it repeats the recent same-weekday pattern.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[11px] font-normal">
            Baseline forecast
          </Badge>
          <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="Forecast horizon">
            {FORECAST_DAY_OPTIONS.map((n) => (
              <Button
                key={n}
                variant={days === n ? "secondary" : "ghost"}
                size="sm"
                className="px-2.5 text-xs"
                onClick={() => setDays(n)}
              >
                {n} days
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-56 rounded-xl" />
      ) : error ? (
        <QueryError
          error={error}
          what="the forecast"
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : !data ? (
        <p className="py-4 text-sm text-muted-foreground">
          Pick a branch to see its forecast.
        </p>
      ) : !hasForecast ? (
        <EmptyState
          icon={TrendingUp}
          title="Not enough history yet"
          description="Forecasts appear after 14 days of sales."
        />
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartRows(data)} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDay}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v: number) => compactNumber.format(v)}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "actual" ? "Actual sales" : "Forecast sales",
                  ]}
                  labelFormatter={(label: string) =>
                    new Date(label).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })
                  }
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">—</span> Actual sales (last 14 days)
            {"  ·  "}
            <span className="font-medium text-foreground">- -</span> Forecast
          </p>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Forecast sales</TableHead>
                  <TableHead>Usual range</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.days.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell className="font-medium text-foreground">
                      {weekdayShort(d.date)}, {shortDay(d.date)}
                    </TableCell>
                    <TableCell className="tabular-nums text-foreground">
                      {d.forecastSales === null ? "—" : formatCurrency(d.forecastSales)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {d.lowSales === null || d.highSales === null
                        ? "—"
                        : `${formatCurrency(d.lowSales)} – ${formatCurrency(d.highSales)}`}
                    </TableCell>
                    <TableCell className="tabular-nums text-foreground">
                      {d.forecastOrders === null ? "—" : `~${d.forecastOrders}`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        title={d.basis}
                        className={cn(
                          "text-[11px] font-normal",
                          d.confidence === "good" && "bg-success/10 text-success",
                          (d.confidence === "low" || d.confidence === "fallback") &&
                            "bg-warning/10 text-warning",
                        )}
                      >
                        {CONFIDENCE_LABEL[d.confidence]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <p>{data.method}.</p>
            <p>{data.backtest.note}</p>
            <details>
              <summary className="cursor-pointer text-foreground">What this forecast can&apos;t do</summary>
              <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                {data.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </details>
          </div>
        </>
      )}
    </Card>
  );
}
