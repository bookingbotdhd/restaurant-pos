"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateStaff, type StaffMember } from "@/hooks/use-staff";
import { ApiError } from "@/lib/api";

// Roles whose PIN can approve a manager-gated action (discounts, voids).
// Mirrors MANAGER_ROLES in packages/types/src/permissions.ts; the server
// is the authority, this only decides where the button shows up.
const MANAGER_ROLE_NAMES = ["OWNER", "ADMINISTRATOR", "RESTAURANT_MANAGER"];

/** Whether this staff member can hold a manager-approval PIN. */
export function isManagerRole(member: StaffMember) {
  return MANAGER_ROLE_NAMES.includes(member.role.name);
}

/**
 * Set (or replace) a manager's PIN, for existing staff. The PIN is the
 * only way a manager can approve a discount or a void at the till — until
 * one is set here, the gate fails closed for them. Only the hash is stored;
 * the dialog never shows the current PIN (there is nothing to show).
 */
export function SetStaffPinDialog({ member }: { member: StaffMember }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const updateStaff = useUpdateStaff();

  const reset = () => {
    setPin("");
    setOpen(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStaff.mutate(
      { id: member.id, dto: { pin } },
      {
        onSuccess: () => {
          toast.success(`${member.name}'s PIN set`);
          reset();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not set the PIN"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground"
            aria-label={`Set manager PIN for ${member.name}`}
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Set PIN</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Set manager PIN for {member.name}</DialogTitle>
            <DialogDescription>
              This PIN approves discounts and voids at the till. Share it with{" "}
              {member.name} only, and never write it down where the till is.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-pin">New PIN</Label>
            <Input
              id="staff-pin"
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={reset}>
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={updateStaff.isPending || pin.length < 4}>
              {updateStaff.isPending ? "Saving…" : "Set PIN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
