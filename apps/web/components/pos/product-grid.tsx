"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTabs } from "@/components/ui/nav-picker";
import { useCategories, useMenuItems, type MenuItem } from "@/hooks/use-menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProductGrid({
  branchId,
  onSelect,
}: {
  branchId: string | null;
  onSelect: (item: MenuItem) => void;
}) {
  const { data: categories } = useCategories(branchId);
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { data: items, isLoading, isError, error, refetch, isFetching } = useMenuItems(branchId, activeCategoryId);

  const filtered = items?.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Search menu…"
          aria-label="Search menu"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 pl-10 text-base"
        />
      </div>

      {categories && categories.length > 0 && (
        <ResponsiveTabs
          mobileOnly
          className="lg:hidden"
          label="Category"
          value={activeCategoryId ?? "all"}
          onChange={(id) => setActiveCategoryId(id === "all" ? undefined : id)}
          desktopListClassName="justify-start lg:h-auto lg:flex-wrap"
          items={[{ id: "all", label: "All" }, ...categories.map((c) => ({ id: c.id, label: c.name, hint: `${c._count.items} items` }))]}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-5">
      {categories && categories.length > 0 && (
        <nav
          aria-label="Category"
          className="hidden w-52 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border pr-3 lg:flex xl:w-60"
        >
          {[{ id: undefined as string | undefined, name: "All", count: undefined as number | undefined }, ...categories.map((c) => ({ id: c.id as string | undefined, name: c.name, count: c._count.items as number | undefined }))].map((c) => {
            const active = c.id === activeCategoryId;
            return (
              <button
                key={c.id ?? "all"}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => setActiveCategoryId(c.id)}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                    : "font-medium text-foreground hover:bg-secondary",
                )}
              >
                <span className="min-w-0 [overflow-wrap:anywhere] leading-tight" title={c.name}>
                  {c.name}
                </span>
                {c.count !== undefined && (
                  <span className={cn("shrink-0 text-xs tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>
                    {c.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {isError && !items ? (
        <QueryError error={error} what="the menu" onRetry={() => void refetch()} retrying={isFetching} />
      ) : (
      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto pb-4 sm:grid-cols-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        {filtered?.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.name}
            onClick={() => onSelect(item)}
            className="flex min-h-28 min-w-0 flex-col items-start gap-2.5 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-[0.97] active:translate-y-0 lg:min-h-36 lg:justify-between lg:p-4"
          >
            {/* Indian veg / non-veg mark: a square outline with a filled dot. */}
            <span
              aria-label={item.isVeg ? "Vegetarian" : "Non-vegetarian"}
              className={cn(
                "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[4px] border-2 bg-card",
                item.isVeg ? "border-success" : "border-destructive",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  item.isVeg ? "bg-success" : "bg-destructive",
                )}
              />
            </span>
            <span className="line-clamp-3 w-full min-w-0 [overflow-wrap:anywhere] text-[15px] leading-snug font-medium text-foreground">
              {item.name}
            </span>
            <span className="flex w-full items-baseline justify-between gap-2">
              <span className="text-base font-bold tabular-nums text-foreground">
                {formatCurrency(item.price)}
              </span>
              {item.halfPrice != null && (
                <span className="hidden text-xs tabular-nums text-muted-foreground lg:inline">
                  Half {formatCurrency(item.halfPrice)}
                </span>
              )}
            </span>
          </button>
        ))}
        {filtered?.length === 0 && !isLoading && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            {search ? <>No items match &quot;{search}&quot;</> : "No items in this category yet"}
          </p>
        )}
      </div>
      )}
      </div>
      </div>
    </div>
  );
}
