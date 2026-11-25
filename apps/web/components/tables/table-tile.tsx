"use client";

import type { TableStatusDto } from "@restroos/types";
import { ClipboardList, Merge, Plus, QrCode, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateTableStatus, type RestaurantTable } from "@/hooks/use-tables";
import { cn } from "@/lib/utils";
import { BillTableDialog } from "./bill-table-dialog";
import { ElapsedTimer } from "./elapsed-timer";
import { MergeTableDialog } from "./merge-table-dialog";
import { TableQrDialog } from "./table-qr-dialog";
import { TableShapeIcon } from "./table-shape-icon";

import { TABLE_STATUS_LABEL } from "@/components/ui/status-badge";

const STATUS_STYLES: Record<TableStatusDto, string> = {
  AVAILABLE: "border-success/40 bg-success/10 text-success hover:border-success/60",
  OCCUPIED: "border-primary/40 bg-primary/10 text-primary hover:border-primary/60",
  RESERVED: "border-warning/40 bg-warning/10 text-warning hover:border-warning/60",
  CLEANING: "border-border bg-muted text-muted-foreground hover:border-muted-foreground/40",
  OUT_OF_SERVICE: "border-border bg-muted text-muted-foreground opacity-60",
};

const STATUS_LABEL: Record<TableStatusDto, string> = TABLE_STATUS_LABEL;

export function TableTile({
  table,
  allTables,
  branchId,
  style,
}: {
  table: RestaurantTable;
  allTables: RestaurantTable[];
  branchId: string | null;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const updateStatus = useUpdateTableStatus(branchId);
  const [qrOpen, setQrOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          style={style}
          className={cn(
            "absolute flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 text-xs font-medium shadow-sm transition-all hover:scale-[1.03] hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            STATUS_STYLES[table.status],
          )}
        >
          <TableShapeIcon shape={table.shape} capacity={table.capacity} className="h-6 w-6" />
          <span className="text-base leading-tight font-bold">{table.name ?? `T${table.number}`}</span>
          <span className="flex items-center gap-1 text-[11px] font-medium opacity-80">
            <Users className="h-3 w-3" />
            {table.capacity} guests
          </span>
          <span className="text-[11px] font-semibold tracking-wide uppercase opacity-90">
            {STATUS_LABEL[table.status]}
          </span>
          {(table.status === "OCCUPIED" || table.status === "RESERVED") && (
            <ElapsedTimer since={table.statusSince} className="flex items-center gap-1 text-xs font-semibold tabular-nums opacity-90" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {STATUS_LABEL[table.status]} · {table.capacity} guests
          </div>
          {(Object.keys(STATUS_LABEL) as TableStatusDto[]).map((status) => (
            <DropdownMenuItem
              key={status}
              disabled={status === table.status}
              onClick={() => updateStatus.mutate({ id: table.id, status })}
            >
              {STATUS_LABEL[status]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4" />
            View QR code
          </DropdownMenuItem>
          {(table.status === "AVAILABLE" || table.status === "RESERVED") && (
            <DropdownMenuItem onClick={() => router.push(`/pos?tableId=${table.id}`)}>
              <Plus className="h-4 w-4" />
              New order
            </DropdownMenuItem>
          )}
          {table.status === "OCCUPIED" && (
            <>
              <DropdownMenuItem onClick={() => router.push(`/pos?tableId=${table.id}`)}>
                <Plus className="h-4 w-4" />
                Add another round
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBillOpen(true)}>
                <ClipboardList className="h-4 w-4" />
                Bill this table
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMergeOpen(true)}>
                <Merge className="h-4 w-4" />
                Merge another table&apos;s bill here
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TableQrDialog table={table} branchId={branchId} open={qrOpen} onOpenChange={setQrOpen} />
      <MergeTableDialog
        branchId={branchId}
        table={table}
        allTables={allTables}
        open={mergeOpen}
        onOpenChange={setMergeOpen}
      />
      <BillTableDialog branchId={branchId} table={table} open={billOpen} onOpenChange={setBillOpen} />
    </>
  );
}
