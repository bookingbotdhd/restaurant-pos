"use client";

import { LayoutGrid, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AddFloorDialog } from "@/components/tables/add-floor-dialog";
import { EditableTableTile } from "@/components/tables/editable-table-tile";
import { RenameFloorDialog } from "@/components/tables/rename-floor-dialog";
import { TableEditorDialog } from "@/components/tables/table-editor-dialog";
import { TableTile } from "@/components/tables/table-tile";
import { WaitlistPanel } from "@/components/tables/waitlist-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, TABLE_STATUS_TONE } from "@/components/ui/status-badge";
import { BranchNotice } from "@/components/layout/branch-notice";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTabs } from "@/components/ui/nav-picker";
import { TableRequestsBar } from "@/components/tables/table-requests-bar";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { useFloors, type RestaurantTable } from "@/hooks/use-tables";

export default function TablesPage() {
  const { branchId } = useBranch();
  const { data: me } = useCurrentUser();
  // tables.view is read-only (status updates stay available); layout edits need tables.manage.
  const canManage = hasPermission(me?.user, "tables.manage");
  const floorsQuery = useFloors(branchId);
  const { data: floors } = floorsQuery;
  const { isLoading: branchLoading } = useBranch();
  const isLoading = floorsQuery.isLoading || branchLoading;
  const [activeFloorId, setActiveFloorId] = useState<string | undefined>(undefined);
  const [editModeRequested, setEditMode] = useState(false);
  const editMode = canManage && editModeRequested;
  const [editorTable, setEditorTable] = useState<RestaurantTable | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // Forces a fresh mount of TableEditorDialog every time it's opened, so its
  // internal form state (number, bulk-mode toggle, etc.) never carries over
  // stale values from a previous open.
  const [editorKey, setEditorKey] = useState(0);

  // On phones the floor plan is shrunk to fit the screen instead of scrolling
  // sideways (view mode only — dragging needs real pixel coordinates).
  const cardRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      setAvailableWidth(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoading, floors?.length]);

  const activeFloor = floors?.find((f) => f.id === (activeFloorId ?? floors[0]?.id));
  const allTables = floors?.flatMap((f) => f.tables) ?? [];
  const availableTables = allTables.filter((t) => t.status === "AVAILABLE");

  const canvasWidth = activeFloor
    ? Math.max(600, ...activeFloor.tables.map((t) => t.posX + t.width + 40))
    : 600;
  const canvasHeight = activeFloor
    ? Math.max(320, ...activeFloor.tables.map((t) => t.posY + t.height + 40))
    : 320;

  const contentWidth = activeFloor
    ? Math.max(1, ...activeFloor.tables.map((t) => t.posX + t.width + 16))
    : canvasWidth;
  const fitScale =
    !editMode && availableWidth > 0 && availableWidth < contentWidth ? availableWidth / contentWidth : 1;

  const openAddTable = () => {
    setEditorTable(null);
    setEditorOpen(true);
    setEditorKey((k) => k + 1);
  };
  const openEditTable = (table: RestaurantTable) => {
    setEditorTable(table);
    setEditorOpen(true);
    setEditorKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <TableRequestsBar branchId={branchId} />
      <PageHeader
        title="Tables"
        description={
          editMode
            ? "Drag tables to match your floor — changes save automatically"
            : "Live floor status — tap a table to update it"
        }
        actions={
          canManage && floors && floors.length > 0 ? (
            <Button variant={editMode ? "default" : "outline"} onClick={() => setEditMode((v) => !v)}>
              <LayoutGrid className="h-4 w-4" />
              {editMode ? "Done editing" : "Edit floor plan"}
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : floorsQuery.isError && !floors ? (
        <QueryError
          error={floorsQuery.error}
          what="the tables"
          onRetry={() => void floorsQuery.refetch()}
          retrying={floorsQuery.isFetching}
        />
      ) : !branchId ? (
        <BranchNotice />
      ) : floors && floors.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2 [&_button]:max-sm:min-h-10">
              {(floors.length > 1 || editMode) && (
                <ResponsiveTabs
                  className="max-lg:w-full"
                  label="Floor"
                  value={activeFloorId ?? floors[0].id}
                  onChange={setActiveFloorId}
                  items={floors.map((f) => ({ id: f.id, label: f.name }))}
                />
              )}
              {editMode && (
                <>
                  <RenameFloorDialog
                    branchId={branchId}
                    floorId={activeFloor?.id ?? floors[0].id}
                    currentName={activeFloor?.name ?? floors[0].name}
                  />
                  <AddFloorDialog branchId={branchId} />
                  <Button variant="outline" size="sm" onClick={openAddTable}>
                    <Plus className="h-4 w-4" />
                    Add table
                  </Button>
                </>
              )}
            </div>

            <Card ref={cardRef} className="overflow-auto p-3 sm:p-6">
              <div
                className="relative"
                style={
                  fitScale < 1
                    ? { width: availableWidth, height: (canvasHeight - 40) * fitScale + 24 }
                    : { width: canvasWidth, height: canvasHeight, minWidth: "100%" }
                }
              >
                <div
                  className="absolute left-0 top-0 origin-top-left"
                  style={{ width: canvasWidth, height: canvasHeight, transform: fitScale < 1 ? `scale(${fitScale})` : undefined }}
                >
                {activeFloor?.tables.map((table) =>
                  editMode ? (
                    <EditableTableTile
                      key={table.id}
                      table={table}
                      branchId={branchId}
                      onEdit={() => openEditTable(table)}
                    />
                  ) : (
                    <TableTile
                      key={table.id}
                      table={table}
                      allTables={allTables}
                      branchId={branchId}
                      style={{
                        left: table.posX,
                        top: table.posY,
                        width: table.width,
                        height: table.height,
                      }}
                    />
                  ),
                )}
                {activeFloor?.tables.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No tables on this floor yet.
                  </p>
                )}
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Legend status="AVAILABLE" />
              <Legend status="OCCUPIED" />
              <Legend status="RESERVED" />
              <Legend status="CLEANING" />
              {/* Timer states, matching the ElapsedTimer thresholds on the tiles. */}
              <StatusBadge tone="warning">Seated 60+ min</StatusBadge>
              <StatusBadge tone="danger">Seated 2h+</StatusBadge>
            </div>
          </div>

          <WaitlistPanel branchId={branchId} availableTables={availableTables} />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <EmptyState
            icon={LayoutGrid}
            title="No floors yet"
            description={
              canManage
                ? "Add your first floor to start building the layout."
                : "Ask a manager to set up the floor plan."
            }
            action={canManage ? <AddFloorDialog branchId={branchId} /> : undefined}
          />
        </Card>
      )}

      {activeFloor && (
        <TableEditorDialog
          key={editorKey}
          branchId={branchId}
          floorId={activeFloor.id}
          table={editorTable}
          open={editorOpen}
          onOpenChange={setEditorOpen}
        />
      )}
    </div>
  );
}

function Legend({ status }: { status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING" }) {
  const labels: Record<typeof status, string> = {
    AVAILABLE: "Available",
    OCCUPIED: "Occupied",
    RESERVED: "Reserved",
    CLEANING: "Cleaning / out of service",
  };
  return <StatusBadge tone={TABLE_STATUS_TONE[status]}>{labels[status]}</StatusBadge>;
}
