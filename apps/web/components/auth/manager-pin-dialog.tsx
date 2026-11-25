"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVerifyManagerPin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

/**
 * Manager-PIN confirmation gate for a till action (discount, void). The
 * manager types their own PIN — the cashier never learns it, and the PIN
 * is never stored or passed on: a successful check returns a 5-minute
 * approval token, and only that token travels with the gated request.
 * The server re-checks the token (role, restaurant, expiry) before the
 * action executes, so this dialog alone never authorises anything.
 */
export function ManagerPinDialog({
  open,
  onOpenChange,
  actionLabel,
  description,
  onApproved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the approval is for, e.g. "Apply this discount" / "Void this order". */
  actionLabel: string;
  description?: string;
  /** Called with the approval token (and who approved) once the PIN checks out. */
  onApproved: (approvalToken: string, managerName: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const verify = useVerifyManagerPin();

  const close = () => {
    setPin("");
    setError(null);
    onOpenChange(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    verify.mutate(
      { pin: pin.trim() },
      {
        onSuccess: (approval) => {
          const token = approval.approvalToken;
          const name = approval.manager.name;
          close();
          onApproved(token, name);
        },
        onError: (err) =>
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not check the PIN. Try again.",
          ),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              Manager approval needed
            </DialogTitle>
            <DialogDescription>
              {description ??
                `${actionLabel} needs a manager. Ask a manager to enter their PIN — your session stays signed in.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="manager-pin">Manager PIN</Label>
            <Input
              id="manager-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              minLength={4}
              maxLength={8}
              required
              autoFocus
              placeholder="4–8 digits"
            />
            <p className="text-[11px] text-muted-foreground">
              Only an owner, administrator or restaurant manager PIN works here. A
              manager without a PIN set cannot approve — set one under Settings →
              Staff.
            </p>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={verify.isPending || pin.trim().length < 4}>
              {verify.isPending ? "Checking…" : actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
