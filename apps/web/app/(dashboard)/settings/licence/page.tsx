"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import {
  useActivateLicence,
  useDeactivateLicence,
  useIssueLicence,
  useIssuedLicences,
  useLicenceStatus,
  useRevokeLicence,
  type LicenceIssued,
  type LicenceSummary,
} from "@/hooks/use-licence";
import { ApiError } from "@/lib/api";

const STATUS_LABEL: Record<LicenceSummary["status"], string> = {
  ISSUED: "Issued",
  ACTIVE: "Active",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
};

const STATUS_VARIANT: Record<LicenceSummary["status"], "outline" | "secondary" | "destructive"> = {
  ISSUED: "outline",
  ACTIVE: "secondary",
  REVOKED: "destructive",
  EXPIRED: "destructive",
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function LicencePage() {
  const { data } = useCurrentUser();
  const user = data?.user;
  const canManage = hasPermission(user, "settings.manage");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Restaurant, branch, and staff configuration</p>
      </div>

      <SettingsTabs />

      {canManage ? (
        <>
          <LicenceStatusCard />
          <IssueLicenceCard />
        </>
      ) : (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            Licence activation is managed by a restaurant administrator.
          </p>
        </Card>
      )}
    </div>
  );
}

function LicenceStatusCard() {
  const { data, isLoading } = useLicenceStatus();
  const activate = useActivateLicence();
  const deactivate = useDeactivateLicence();
  const [key, setKey] = useState("");
  const [instanceId, setInstanceId] = useState("");

  const active = data?.active ?? null;

  const onActivate = () => {
    if (!key.trim()) {
      toast.error("Enter the licence key the seller gave you");
      return;
    }
    activate.mutate(
      { key: key.trim(), instanceId: instanceId.trim() || undefined },
      {
        onSuccess: () => {
          setKey("");
          toast.success("Licence activated");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not activate licence"),
      },
    );
  };

  const onDeactivate = () => {
    if (!confirm("Deactivate this licence? The key can be activated again later, on this or another server.")) return;
    deactivate.mutate(undefined, {
      onSuccess: () => toast.success("Licence deactivated"),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not deactivate licence"),
    });
  };

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-[18px] font-medium text-foreground">Licence</h2>
        <p className="text-sm text-muted-foreground">
          Activate this restaurant with the licence key the seller issued you. One licence is active per
          restaurant at a time.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : active ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Active</Badge>
            <span className="font-mono text-sm text-foreground">…{active.lastFour}</span>
            <span className="text-sm text-muted-foreground">Plan: {active.plan}</span>
          </div>
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Activated</dt>
              <dd className="text-foreground">{formatDate(active.activatedAt)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Instance</dt>
              <dd className="text-foreground">{active.instanceId ?? "—"}</dd>
            </div>
            {active.expiresAt ? (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="text-foreground">{formatDate(active.expiresAt)}</dd>
              </div>
            ) : null}
          </dl>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={onDeactivate}
              disabled={deactivate.isPending}
            >
              Deactivate
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Deactivating releases the key — it can be activated again later, for example after moving to a new
            server. It does not cancel or revoke the key.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline">Not activated</Badge>
            <span className="text-sm text-muted-foreground">No licence is active for this restaurant.</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="licence-key">Licence key</Label>
              <Input
                id="licence-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="RS-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="licence-instance">Instance (optional)</Label>
              <Input
                id="licence-instance"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="e.g. main-server"
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <Button size="sm" onClick={onActivate} disabled={activate.isPending}>
              Activate
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            The key is checked for typos before it is sent — a mistyped key is rejected with a hint instead of
            activating the wrong key.
          </p>
        </div>
      )}
    </Card>
  );
}

function IssueLicenceCard() {
  const { data: issued, isLoading } = useIssuedLicences();
  const issue = useIssueLicence();
  const revoke = useRevokeLicence();
  const [plan, setPlan] = useState("STANDARD");
  const [issuedTo, setIssuedTo] = useState("");
  const [note, setNote] = useState("");
  const [newKey, setNewKey] = useState<LicenceIssued | null>(null);

  const onIssue = () => {
    issue.mutate(
      {
        plan: plan.trim() || undefined,
        issuedTo: issuedTo.trim() || undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (created) => {
          setNewKey(created);
          setIssuedTo("");
          setNote("");
          toast.success("Licence key issued");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not issue licence"),
      },
    );
  };

  const onRevoke = (licence: LicenceSummary) => {
    if (
      !confirm(
        `Revoke the key ending …${licence.lastFour}? This cannot be undone; an active licence using it stops being active.`,
      )
    )
      return;
    revoke.mutate(licence.id, {
      onSuccess: () => toast.success("Licence revoked"),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not revoke licence"),
    });
  };

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-[18px] font-medium text-foreground">Issue licence keys</h2>
        <p className="text-sm text-muted-foreground">
          For the seller: generate a key and hand it to a restaurant, which activates it above. The full key is
          shown once, right after issuing — copy it to the buyer then; it cannot be recovered afterwards.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="licence-plan">Plan</Label>
          <Input id="licence-plan" value={plan} onChange={(e) => setPlan(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="licence-issued-to">Issued to</Label>
          <Input
            id="licence-issued-to"
            value={issuedTo}
            onChange={(e) => setIssuedTo(e.target.value)}
            placeholder="Restaurant / buyer name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="licence-note">Note (optional)</Label>
          <Input id="licence-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div>
        <Button size="sm" onClick={onIssue} disabled={issue.isPending}>
          Issue key
        </Button>
      </div>

      {newKey ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">New key — copy it now, it will not be shown again</p>
          <code className="mt-1 block overflow-x-auto rounded bg-background/60 p-2 font-mono text-xs">
            {newKey.key}
          </code>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              void navigator.clipboard.writeText(newKey.key);
              toast.success("Key copied");
            }}
          >
            Copy key
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : issued && issued.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Issued to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issued.map((licence) => (
              <TableRow key={licence.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">…{licence.lastFour}</TableCell>
                <TableCell className="text-foreground">{licence.plan}</TableCell>
                <TableCell className="text-muted-foreground">{licence.issuedTo ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[licence.status]}>{STATUS_LABEL[licence.status]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(licence.issuedAt)}</TableCell>
                <TableCell className="text-right">
                  {licence.status === "REVOKED" || licence.status === "EXPIRED" ? (
                    <Badge variant="outline">—</Badge>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => onRevoke(licence)}>
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">No licence keys issued yet.</p>
      )}
    </Card>
  );
}
