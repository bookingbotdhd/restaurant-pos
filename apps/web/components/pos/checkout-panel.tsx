"use client";

import { kitchenProgress, type PaymentMethodDto } from "@restroos/types";
import { ArrowLeft, CheckCircle2, ChefHat, Pause, Pencil, Play, Printer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StatusNote, useNoteToast } from "@/components/ui/status-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryError } from "@/components/ui/query-error";
import { OnlinePayment } from "@/components/pos/online-payment";
import { PaymentMethodButtons } from "@/components/pos/payment-method-buttons";
import { CustomerPicker } from "@/components/pos/customer-picker";
import type { Customer } from "@/hooks/use-customers";
import { lookupGiftCard } from "@/hooks/use-gift-cards";
import { CancelOrderDialog, useCanCancelOrders } from "@/components/orders/cancel-order-dialog";
import { ManagerPinDialog } from "@/components/auth/manager-pin-dialog";
import { EditBillDialog } from "@/components/orders/edit-bill-dialog";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import {
  useBillPreview,
  useCheckoutOrder,
  useHoldOrder,
  useOrder,
  useResumeOrder,
  type BillPreview,
  type CheckoutResult,
  type CreatedOrder,
} from "@/hooks/use-orders";
import { usePrintKot, usePrintOrderUsb, type PrintJobResult } from "@/hooks/use-print";
import { useDisplaySettings } from "@/hooks/use-settings";
import { api, ApiError } from "@/lib/api";
import { discountSummary, parseMoney, planSplitPayments } from "@/lib/bill";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { publishDisplay } from "@/lib/customer-display";
import { playPaymentReceived } from "@/lib/celebrate";
import { buildUpiUri } from "@/lib/upi";
import { QRCodeSVG } from "qrcode.react";
import { canPrintOnDevice } from "@/lib/device-print";
import { openKotPrint, openReceiptPrint } from "@/lib/print";
import { round2 } from "@/lib/pricing-preview";

const METHODS: PaymentMethodDto[] = ["CASH", "CARD", "UPI", "OTHER"];

const KITCHEN_LABEL: Record<string, string> = {
  NEW: "Waiting for the kitchen",
  ACCEPTED: "Kitchen accepted",
  PREPARING: "Being prepared",
  READY: "Ready to serve",
  SERVED: "Served",
};

/** Re-evaluates a value after the user has stopped changing it for `ms`. */
function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function CheckoutPanel({
  order: orderSnapshot,
  branchId,
  initialCustomer = null,
  onDone,
}: {
  order: CreatedOrder;
  branchId: string | null;
  initialCustomer?: Customer | null;
  onDone: () => void;
}) {
  // The order passed in is a snapshot from when it was sent; the live copy
  // carries edits (removed lines, new totals), payments already taken, the
  // kitchen's progress, and a cancel/pay by someone else.
  const { data: live } = useOrder(branchId, orderSnapshot.id);
  const order: CreatedOrder = live
    ? {
        ...orderSnapshot,
        subtotal: live.subtotal,
        taxAmount: live.taxAmount,
        totalAmount: live.totalAmount,
        status: live.status,
      }
    : orderSnapshot;
  // Split payment: one line per payment (cash + card + UPI, ...). A blank
  // amount means "whatever is still due at that line", so a single blank
  // line is the old pay-the-whole-balance flow.
  interface SplitLine {
    id: number;
    method: PaymentMethodDto;
    amountText: string;
  }
  const [splitLines, setSplitLines] = useState<SplitLine[]>([
    { id: 1, method: "CASH", amountText: "" },
  ]);
  const nextSplitLineId = useRef(2);
  // Service charge override for this bill (blank = restaurant default) and
  // the BOGO opt-out; both stop mattering once the first payment locks the bill.
  const [serviceChargeText, setServiceChargeText] = useState("");
  const [bogoOff, setBogoOff] = useState(false);
  // The cashier enters either a percentage or a fixed cash amount; the server
  // prices both the same way (and enforces the cap and the reason rule).
  const [discountMode, setDiscountMode] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [discountValue, setDiscountValue] = useState("0");
  const [discountReason, setDiscountReason] = useState("");
  const [tipAmount, setTipAmount] = useState("0");
  const [pointsToRedeem, setPointsToRedeem] = useState("0");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [checkingGiftCard, setCheckingGiftCard] = useState(false);
  const [splitCount, setSplitCount] = useState("1");
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const checkout = useCheckoutOrder(branchId);
  const hold = useHoldOrder(branchId);
  const resume = useResumeOrder(branchId);
  const { note, clear: clearNote, toast } = useNoteToast();
  const canCancelRole = useCanCancelOrders();
  const { data: me } = useCurrentUser();
  const canEditRole = hasPermission(me?.user, "orders.edit");
  const canDiscount = hasPermission(me?.user, "discounts.apply");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // Manager-PIN approval for a discounted checkout. Held only for the exact
  // discount it was given for: change the discount and it is dropped, so a
  // bigger discount cannot ride on an approval meant for a smaller one.
  const [pinOpen, setPinOpen] = useState(false);
  const [approval, setApproval] = useState<{
    token: string;
    managerName: string;
    discountKey: string;
  } | null>(null);
  const phone = canPrintOnDevice();
  const printUsb = usePrintOrderUsb(branchId);
  const printKot = usePrintKot(branchId);
  const onPrinted = (r: PrintJobResult) =>
    r.unsupportedChars?.length
      ? toast.warning(`Sent, but ${r.unsupportedChars.join(" ")} cannot be printed by this printer's code page. Use browser print for the full text.`)
      : toast.success("Sent to the thermal printer");
  // First print sends only tickets not yet printed. If they already went out
  // (e.g. a double tap or retry) the server refuses to print a duplicate and we
  // offer an explicit, REPRINT-stamped copy instead.
  const printKotNow = (reprint: boolean) =>
    printKot.mutate(
      { orderId: order.id, reprint },
      {
        onSuccess: (r) => {
          onPrinted(r);
          if (reprint) toast.success("Reprint sent — marked REPRINT on paper");
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === "ALREADY_PRINTED") {
            toast.info("The kitchen ticket was already printed", {
              action: { label: "Print a REPRINT", onClick: () => printKotNow(true) },
            });
            return;
          }
          toast.error(err instanceof Error ? err.message : "Could not print to the kitchen printer");
        },
      },
    );
  const [completed, setCompleted] = useState<CheckoutResult | null>(null);
  const { data: settings } = useDisplaySettings(branchId);

  // What the guest has typed in, as numbers. Once a payment has been taken the
  // server locks the figures, so these stop mattering (and are not sent).
  const adjustments = useMemo(
    () => ({
      ...(discountMode === "PERCENT"
        ? { discountPercent: Math.min(Number(discountValue) || 0, 100) }
        : { discountFlat: Number(discountValue) || 0 }),
      tipAmount: Number(tipAmount) || 0,
      loyaltyPointsToRedeem: Math.max(0, Math.floor(Number(pointsToRedeem) || 0)),
      couponCode: appliedCoupon || undefined,
      // Blank = the restaurant default from Settings; 0 switches it off
      // for this bill. Unchecking BOGO opts this bill out of the offer.
      ...(serviceChargeText.trim() !== ""
        ? { serviceChargePercent: Math.min(Math.max(Number(serviceChargeText) || 0, 0), 100) }
        : {}),
      ...(bogoOff ? { applyBogo: false } : {}),
    }),
    [discountMode, discountValue, tipAmount, pointsToRedeem, appliedCoupon, serviceChargeText, bogoOff],
  );
  const settled = useDebounced(adjustments);
  // `settled` is a percent-or-flat union, so narrow before reading it.
  const settledDiscountPercent = "discountPercent" in settled ? settled.discountPercent : 0;
  const settledDiscountFlat = "discountFlat" in settled ? settled.discountFlat : 0;
  // What a discount approval covers: percent, flat amount and coupon, as
  // one key. Change any of them and the held approval no longer matches,
  // so the next checkout asks for a fresh PIN.
  const discountKey = useMemo(
    () =>
      JSON.stringify({
        p: settledDiscountPercent,
        f: settledDiscountFlat,
        c: settled.couponCode ?? "",
      }),
    [settledDiscountPercent, settledDiscountFlat, settled.couponCode],
  );
  const hasDiscount =
    settledDiscountPercent > 0 || settledDiscountFlat > 0 || !!settled.couponCode;
  // Once any payment is on the bill the server fixes its figures and refuses
  // further adjustments, so none are sent from then on.
  const hasPayments = (live?.payments.length ?? 0) > 0;

  // The server prices the bill: this is the single source for the figures on
  // screen, on the printed bill, and at checkout.
  const billQuery = useBillPreview(
    branchId,
    order.id,
    hasPayments ? {} : settled,
    order.status === "OPEN",
  );
  const bill: BillPreview | undefined = billQuery.data;
  const locked = (bill?.locked ?? false) || hasPayments;
  const repricing = adjustments !== settled;

  // A coupon is checked when applied, so the bill above only ever sees a valid
  // code (or none) and never drops the happy-hour discount on an error.
  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return setAppliedCoupon("");
    try {
      // Validate this code on its own before adopting it.
      await api.post(`/orders/${order.id}/bill-preview?branchId=${branchId}`, { couponCode: code });
      setAppliedCoupon(code);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not apply coupon");
    }
  };

  const balance = bill?.balanceDue ?? 0;
  const giftCardApplied = giftCardBalance !== null ? round2(Math.min(giftCardBalance, balance)) : 0;
  const remainingDue = round2(balance - giftCardApplied);
  // The split plan, in line order: blank = "the rest of the balance here".
  const plan = planSplitPayments({
    remaining: remainingDue,
    lines: splitLines.map((l) => ({
      method: l.method,
      entered: parseMoney(l.amountText),
    })),
  });
  const split = Math.max(1, Math.floor(Number(splitCount) || 1));

  const updateSplitLine = (id: number, patch: Partial<Omit<SplitLine, "id">>) =>
    setSplitLines((lines) => lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addSplitLine = () => {
    const id = nextSplitLineId.current;
    nextSplitLineId.current += 1;
    setSplitLines((lines) => [...lines, { id, method: "CASH", amountText: "" }]);
  };
  const removeSplitLine = (id: number) =>
    setSplitLines((lines) => (lines.length > 1 ? lines.filter((l) => l.id !== id) : lines));
  // One line per guest, each an equal share (the last line takes the
  // rounding remainder). The first line keeps its method; the rest pay cash.
  const splitEqually = () => {
    if (!bill || remainingDue <= 0) return;
    const share = round2(remainingDue / split);
    const firstMethod = splitLines[0]?.method ?? "CASH";
    const lines: SplitLine[] = Array.from({ length: split }, (_, i) => ({
      id: nextSplitLineId.current + i,
      method: i === 0 ? firstMethod : "CASH",
      amountText: String(
        i === split - 1 ? round2(remainingDue - share * (split - 1)) : share,
      ),
    }));
    nextSplitLineId.current += split;
    setSplitLines(lines);
  };

  const checkGiftCard = async () => {
    if (!giftCardCode) return;
    setCheckingGiftCard(true);
    try {
      const card = await lookupGiftCard(branchId, giftCardCode);
      if (!card) {
        toast.error("No gift card found with that code");
        setGiftCardBalance(null);
        return;
      }
      setGiftCardBalance(Number(card.balance));
    } finally {
      setCheckingGiftCard(false);
    }
  };

  // What the QR asks the guest to pay: the amount on the first UPI split line.
  const upiLine = plan.lines.find((l) => l.method === "UPI" && l.applied > 0);
  const upiAmount = upiLine ? upiLine.applied : remainingDue;
  const upiVpa = settings?.restaurant.upiVpa;
  const upiName = settings?.restaurant.upiPayeeName || settings?.restaurant.name;
  const upiUri =
    !upiLine || !upiVpa || !(upiAmount > 0)
      ? null
      : buildUpiUri({
          vpa: upiVpa,
          name: upiName,
          amount: upiAmount,
          note: `Order ${order.id.slice(-6).toUpperCase()}`,
          ref: order.id,
        });

  // Mirror the QR to the customer-facing screen while UPI is selected, and
  // clear it again if the cashier switches method.
  useEffect(() => {
    if (completed) return;
    if (upiUri) {
      publishDisplay({ kind: "upi", total: upiAmount, uri: upiUri, payee: upiName || "" });
    }
  }, [upiUri, upiAmount, upiName, completed]);

  // One id per distinct attempt: a retry after a dropped connection (same
  // payload) reuses it, so the server records the payment once.
  const attempt = useRef<{ key: string; id: string } | null>(null);
  const requestIdFor = (payload: unknown) => {
    const key = JSON.stringify(payload);
    if (attempt.current?.key !== key) {
      attempt.current = { key, id: crypto.randomUUID() };
    }
    return attempt.current.id;
  };

  const runCheckout = (managerApprovalToken?: string) => {
    if (!bill || repricing) return;
    // The split lines, in order; the server re-validates that they cover
    // the balance exactly (see settlePayments).
    const payments = plan.payable.map((p) => ({
      method: p.method,
      amount: p.applied,
      ...(p.tendered ? { tendered: p.tendered } : {}),
    }));
    const dto = {
      customerId: customer?.id,
      ...(locked ? {} : settled),
      ...(!locked && Number(discountValue) > 0 && discountReason.trim()
        ? { discountReason: discountReason.trim() }
        : {}),
      giftCardCode: giftCardBalance !== null ? giftCardCode : undefined,
      payments,
      allowPartial: plan.partial || undefined,
      ...(managerApprovalToken ? { managerApprovalToken } : {}),
    };
    checkout.mutate(
      { orderId: order.id, dto: { ...dto, requestId: requestIdFor(dto) } },
      {
        onSuccess: (result) => {
          attempt.current = null;
          setApproval(null);
          const id = nextSplitLineId.current;
          nextSplitLineId.current += 1;
          setSplitLines([{ id, method: "CASH", amountText: "" }]);
          if (result.settlement.fullyPaid) {
            setCompleted(result);
            publishDisplay({
              kind: "paid",
              total: Number(result.totalAmount),
              method:
                plan.payable.length > 1
                  ? "Split payment"
                  : plan.payable[0]?.method,
            });
            playPaymentReceived(formatCurrency(result.totalAmount));
            toast.success("Payment recorded");
          } else {
            toast.success(
              `Part payment of ${formatCurrency(result.settlement.amountPaid)} recorded — ${formatCurrency(result.settlement.balanceDue)} still due`,
            );
          }
        },
        onError: (err) => {
          // A refused approval (expired, or the approver lost the role)
          // must not be retried silently — drop it so the next press asks
          // for a fresh PIN instead of failing with the same token.
          if (err instanceof ApiError && err.status === 403) setApproval(null);
          toast.error(err instanceof ApiError ? err.message : "Checkout failed");
        },
      },
    );
  };

  // Park the bill: the table is freed and the order waits in the held list
  // until resumed. Items, totals and any part-payment are kept as they were.
  const handleHold = () => {
    hold.mutate(order.id, {
      onSuccess: () => {
        toast.success(`Order #${order.orderNumber} held — its table is free again`);
        onDone();
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Could not hold order"),
    });
  };

  const handleCheckout = () => {
    if (!bill || repricing) return;
    // A manual discount or coupon needs a manager at the till first: ask
    // for the PIN and only then run the checkout with the approval it
    // returns. A plain checkout (or a locked bill, whose figures are
    // already fixed) never asks. The server re-checks the approval.
    if (!locked && hasDiscount && (!approval || approval.discountKey !== discountKey)) {
      setPinOpen(true);
      return;
    }
    runCheckout(approval?.discountKey === discountKey ? approval.token : undefined);
  };

  const printBill = () => branchId && openReceiptPrint(order.id, branchId, locked ? {} : settled);
  const printBillThermal = () =>
    printUsb.mutate(
      { orderId: order.id, adjustments: locked ? {} : settled },
      {
        onSuccess: onPrinted,
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Could not print to the thermal printer"),
      },
    );

  if (completed) {
    const { settlement } = completed;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <StatusNote note={note} onClear={clearNote} className="w-full text-left" />
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-9 w-9 text-success" />
        </span>
        <p className="text-lg font-semibold text-foreground">
          Order #{order.orderNumber} paid
        </p>
        <p className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
          {formatCurrency(completed.totalAmount)}
        </p>
        {settlement.changeDue > 0 && (
          <p className="rounded-lg bg-success/10 px-4 py-2 text-lg font-semibold tabular-nums text-success">
            Change due {formatCurrency(settlement.changeDue)}
          </p>
        )}
        {Number(completed.loyaltyDiscountAmount) > 0 && (
          <p className="text-xs text-muted-foreground">
            {completed.loyaltyPointsRedeemed} points redeemed
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={() => branchId && openReceiptPrint(completed.id, branchId)}
          >
            {phone ? "Print / Save PDF" : "Print receipt (browser)"}
          </Button>
          <Button
            variant="outline"
            className="h-11"
            disabled={printUsb.isPending}
            onClick={() =>
              printUsb.mutate({ orderId: completed.id, drawer: completed.payments?.some((p) => p.method === "CASH") }, {
                onSuccess: onPrinted,
                onError: (err) =>
                  toast.error(err instanceof Error ? err.message : "Could not print to the thermal printer"),
              })
            }
          >
            {printUsb.isPending ? "Printing…" : phone ? "Bluetooth receipt" : "Thermal receipt"}
          </Button>
          <Button className="h-11" onClick={onDone}>New order</Button>
        </div>
      </div>
    );
  }

  // Someone else (another terminal) already closed this bill.
  if (order.status === "CANCELLED" || (order.status === "PAID" && !completed)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <StatusNote note={note} onClear={clearNote} className="w-full text-left" />
        <p className="text-sm font-medium text-foreground">
          Order #{order.orderNumber} was {order.status === "CANCELLED" ? "cancelled" : "already paid"}
        </p>
        <p className="text-xs text-muted-foreground">
          {order.status === "CANCELLED"
            ? "The kitchen tickets were withdrawn and the table is free again. The order stays in History."
            : "Nothing more to do here."}
        </p>
        <Button className="h-11" onClick={onDone}>Done</Button>
      </div>
    );
  }

  // Held from this or another terminal: nothing can be billed or paid until
  // it is resumed. Resuming re-opens the bill (the live order refetches to
  // OPEN and this panel returns to the checkout view).
  if (order.status === "ON_HOLD") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <StatusNote note={note} onClear={clearNote} className="w-full text-left" />
        <p className="text-sm font-medium text-foreground">Order #{order.orderNumber} is on hold</p>
        <p className="text-xs text-muted-foreground">
          Its table is free again and the kitchen tickets are parked. Resume it to keep serving or bill it.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {canEditRole && (
            <Button
              className="h-11"
              disabled={resume.isPending}
              onClick={() =>
                resume.mutate(order.id, {
                  onSuccess: () => toast.success(`Order #${order.orderNumber} resumed`),
                  onError: (err) =>
                    toast.error(err instanceof Error ? err.message : "Could not resume order"),
                })
              }
            >
              <Play className="h-4 w-4" />
              {resume.isPending ? "Resuming…" : "Resume order"}
            </Button>
          )}
          <Button variant="outline" className="h-11" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  const kitchen = live ? kitchenProgress(live.kots.map((k) => k.status)) : null;
  const paidSoFar = live?.payments ?? [];
  const partialLabel = `Record partial payment · ${formatCurrency(plan.totalApplied)}`;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto">
      <StatusNote note={note} onClear={clearNote} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 shrink-0 text-muted-foreground"
          onClick={onDone}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          {canEditRole && !locked && (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit bill
            </Button>
          )}
          {canCancelRole && !locked && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              Cancel order
            </Button>
          )}
          {canEditRole && (
            <Button type="button" variant="outline" size="sm" disabled={hold.isPending} onClick={handleHold}>
              <Pause className="h-4 w-4" />
              {hold.isPending ? "Holding…" : "Hold order"}
            </Button>
          )}
        </div>
        <CancelOrderDialog
          branchId={branchId}
          orderId={order.id}
          orderNumber={order.orderNumber}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
        <ManagerPinDialog
          open={pinOpen}
          onOpenChange={setPinOpen}
          actionLabel="Approve discount"
          description="This bill has a discount or coupon, so a manager needs to approve it. Ask a manager to enter their PIN — your session stays signed in."
          onApproved={(token, managerName) => {
            setApproval({ token, managerName, discountKey });
            runCheckout(token);
          }}
        />
        <EditBillDialog branchId={branchId} orderId={order.id} open={editOpen} onOpenChange={setEditOpen} />
      </div>

      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">Order #{order.orderNumber}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Sent to kitchen</p>
            {kitchen && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <ChefHat className="h-3.5 w-3.5" aria-hidden />
                {KITCHEN_LABEL[kitchen]}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => branchId && openKotPrint(order.id, branchId)}
          >
            <Printer className="h-4 w-4" />
            {phone ? "KOT / PDF" : "KOT (browser)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={printKot.isPending}
            onClick={() => printKotNow(false)}
          >
            <Printer className="h-4 w-4" />
            {printKot.isPending ? "Printing…" : phone ? "KOT (Bluetooth)" : "KOT (thermal)"}
          </Button>
          </div>
        </div>
        {!locked && (
          <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            No need to pay right now — tap <span className="font-medium text-foreground">Back</span> to
            help another table and come bill this one later from here or the Tables page.
          </p>
        )}
      </div>

      {paidSoFar.length > 0 && (
        <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Payments so far</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-sm">
            {paidSoFar.map((p) => (
              <li key={p.id} className="flex justify-between tabular-nums">
                <span>{p.method}</span>
                <span>{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">
            Discount, tip and points are locked until this bill is settled.
          </p>
        </div>
      )}

      <CustomerPicker branchId={branchId} customer={customer} onSelect={setCustomer} />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="discount">Discount</Label>
            <div role="group" aria-label="Discount type" className="flex overflow-hidden rounded-lg border border-border text-xs">
              {(["PERCENT", "FLAT"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={discountMode === m}
                  disabled={locked || !canDiscount}
                  onClick={() => {
                    setDiscountMode(m);
                    setDiscountValue("0");
                  }}
                  className={cn(
                    "min-h-10 px-3 font-medium transition-colors disabled:opacity-50",
                    discountMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {m === "PERCENT" ? "%" : "₹ Cash"}
                </button>
              ))}
            </div>
          </div>
          <Input
            id="discount"
            type="number"
            min="0"
            max={discountMode === "PERCENT" ? 100 : undefined}
            inputMode="decimal"
            className="h-11"
            value={discountValue}
            disabled={locked || !canDiscount}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
          {canDiscount && !locked && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Discount presets">
              {(discountMode === "PERCENT" ? [5, 10, 15, 20] : [10, 20, 50, 100]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDiscountValue(String(v))}
                  className="min-h-10 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {discountMode === "PERCENT" ? `${v}%` : `₹${v}`}
                </button>
              ))}
            </div>
          )}
          {!canDiscount && (
            <p className="text-[11px] text-muted-foreground">Your role cannot apply discounts.</p>
          )}
          {canDiscount && !locked && Number(discountValue) > 0 && (
            <Input
              aria-label="Discount reason"
              placeholder="Reason for discount"
              maxLength={200}
              className="h-9 text-sm"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
            />
          )}
          {approval && approval.discountKey === discountKey && !locked && hasDiscount && (
            <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
              Discount approved by {approval.managerName} — manager PIN checked.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tip">Tip</Label>
          <Input
            id="tip"
            type="number"
            min="0"
            className="h-11"
            value={tipAmount}
            disabled={locked}
            onChange={(e) => setTipAmount(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="service-charge">Service charge (%)</Label>
          <Input
            id="service-charge"
            type="number"
            min="0"
            max="100"
            inputMode="decimal"
            className="h-11"
            value={serviceChargeText}
            disabled={locked}
            onChange={(e) => setServiceChargeText(e.target.value)}
            placeholder={bill ? String(bill.serviceChargePercent) : "0"}
          />
          <p className="text-[11px] text-muted-foreground">
            Blank uses the restaurant default ({settings?.restaurant.serviceChargePercent ?? 0}%).
            Charged on the bill after discounts.
          </p>
        </div>
        {settings?.restaurant.bogoEnabled && (
          <div className="flex flex-col gap-2">
            <Label>BOGO offer</Label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={!bogoOff}
                disabled={locked}
                onChange={(e) => setBogoOff(!e.target.checked)}
              />
              Buy {settings.restaurant.bogoBuyQty}, get {settings.restaurant.bogoGetQty} cheapest free
            </label>
            {bill && bill.bogoDiscountAmount > 0 && (
              <p className="text-[11px] text-success">
                BOGO applied — {formatCurrency(bill.bogoDiscountAmount)} free, inside the discount.
              </p>
            )}
          </div>
        )}
      </div>

      {customer && customer.loyaltyPoints > 0 && !locked && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="points">Redeem loyalty points</Label>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() =>
                setPointsToRedeem(String(Math.min(customer.loyaltyPoints, Math.floor(bill?.totalDue ?? 0))))
              }
            >
              Max ({customer.loyaltyPoints} available)
            </button>
          </div>
          <Input
            id="points"
            type="number"
            min="0"
            max={customer.loyaltyPoints}
            className="h-11"
            value={pointsToRedeem}
            onChange={(e) => setPointsToRedeem(e.target.value)}
          />
        </div>
      )}

      {canDiscount && !locked && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="coupon">Coupon code (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="coupon"
              className="h-11"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="e.g. SAVE10"
            />
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={!couponInput.trim() && !appliedCoupon}
              onClick={applyCoupon}
            >
              Apply
            </Button>
          </div>
        </div>
      )}

      {!locked && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="gift-card">Gift card code (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="gift-card"
              className="h-11"
              value={giftCardCode}
              onChange={(e) => {
                setGiftCardCode(e.target.value);
                setGiftCardBalance(null);
              }}
              placeholder="e.g. 8A7B629E8EEA"
            />
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={!giftCardCode || checkingGiftCard}
              onClick={checkGiftCard}
            >
              {checkingGiftCard ? "…" : "Check"}
            </Button>
          </div>
          {giftCardBalance !== null && (
            <p className="text-xs text-success">
              Balance {formatCurrency(giftCardBalance)} — applying {formatCurrency(giftCardApplied)}
            </p>
          )}
        </div>
      )}

      {billQuery.isError && !bill ? (
        <QueryError
          error={billQuery.error}
          what="the bill"
          onRetry={() => void billQuery.refetch()}
          retrying={billQuery.isFetching}
        />
      ) : (
        <>
          {remainingDue > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label>Payments — split across methods if needed</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSplitLine}
                  disabled={splitLines.length >= 8}
                >
                  + Add payment
                </Button>
              </div>
              {splitLines.map((line, i) => (
                <div key={line.id} className="flex flex-col gap-2 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Payment {i + 1}
                      {plan.lines[i] && plan.lines[i].applied > 0 && (
                        <> · {formatCurrency(plan.lines[i].applied)} applied</>
                      )}
                    </span>
                    {splitLines.length > 1 && (
                      <button
                        type="button"
                        className="text-xs font-medium text-destructive hover:underline"
                        onClick={() => removeSplitLine(line.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <PaymentMethodButtons
                    methods={METHODS}
                    value={line.method}
                    onChange={(m) => updateSplitLine(line.id, { method: m })}
                    label={`Payment ${i + 1} method`}
                  />
                  <Input
                    aria-label={`Payment ${i + 1} amount`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    className="h-12 text-lg tabular-nums"
                    value={line.amountText}
                    placeholder={
                      plan.lines[i] ? String(plan.lines[i].applied) : String(remainingDue)
                    }
                    onChange={(e) => updateSplitLine(line.id, { amountText: e.target.value })}
                  />
                  {plan.lines[i] && plan.lines[i].change > 0 && (
                    <p className="rounded-lg bg-success/10 px-3 py-2 text-base font-semibold tabular-nums text-success" role="status">
                      Change due {formatCurrency(plan.lines[i].change)}
                    </p>
                  )}
                </div>
              ))}
              {plan.valid && plan.partial && (
                <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning" role="status">
                  Part payment — {formatCurrency(plan.balanceAfter)} will stay due and the table stays open.
                </p>
              )}
              {plan.clamped && (
                <p className="text-xs text-muted-foreground" role="status">
                  A card / UPI line above the balance was cut back to it; only cash can be over-tendered.
                </p>
              )}
              {!plan.valid && splitLines.some((l) => l.amountText.trim() !== "") && (
                <p className="text-xs text-destructive" role="status">
                  Check the payment amounts — each one must be more than zero.
                </p>
              )}
            </div>
          )}

          {upiLine && remainingDue > 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-5 shadow-sm">
              {upiUri ? (
                <>
                  <QRCodeSVG value={upiUri} size={176} level="M" marginSize={1} />
                  <p className="text-xs font-medium text-[#17251d]">
                    Scan with any UPI app · {formatCurrency(upiAmount)} pre-filled
                  </p>
                  <p className="text-[11px] text-neutral-500">Also shown on the customer display</p>
                </>
              ) : (
                <p className="text-center text-xs text-neutral-600">
                  No UPI id set yet. <Link href="/settings" className="font-medium underline">Add your UPI id in Settings → Restaurant</Link> to show a payment QR here.
                </p>
              )}
            </div>
          )}

          {remainingDue > 0 && <OnlinePayment orderId={order.id} branchId={branchId} />}

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <Label htmlFor="split" className="text-xs text-muted-foreground">
              Split equally between
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="split"
                type="number"
                min="1"
                value={splitCount}
                onChange={(e) => setSplitCount(e.target.value)}
                className="h-11 w-20 text-center"
              />
              <span className="text-xs text-muted-foreground">guests</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!bill || remainingDue <= 0}
                onClick={splitEqually}
              >
                Split equally
              </Button>
            </div>
          </div>
          {split > 1 && bill && (
            <p className="-mt-2 text-center text-xs text-muted-foreground">
              {formatCurrency(round2(balance / split))} each — “Split equally” fills one payment line per guest.
            </p>
          )}
        </>
      )}

      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
        <BillSummary bill={bill} giftCardApplied={giftCardApplied} pending={repricing || billQuery.isFetching} />

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={!bill}
            onClick={printBill}
            title="Prints the bill for the guest. Nothing is charged and the table stays open."
          >
            <Printer className="h-4 w-4" />
            {phone ? "Print / Save PDF" : "Print bill"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={!bill || printUsb.isPending}
            onClick={printBillThermal}
            title="Prints the bill on the thermal printer. Nothing is charged and the cash drawer stays shut."
          >
            <Printer className="h-4 w-4" />
            {printUsb.isPending ? "Printing…" : phone ? "Print bill (Bluetooth)" : "Print bill (thermal)"}
          </Button>
        </div>

      </div>

      {/* Pinned to the bottom of the scrolling panel on phones, so billing is always one tap away. */}
      <div className="sticky bottom-0 z-10 -mx-1 bg-card px-1 pb-1 pt-2 max-lg:border-t max-lg:border-border max-lg:shadow-[0_-8px_12px_-10px_rgba(0,0,0,0.25)]">
        <Button
          className="h-12 w-full text-base"
          disabled={checkout.isPending || !bill || repricing || !plan.valid}
          onClick={handleCheckout}
        >
          {checkout.isPending
            ? "Processing…"
            : plan.partial
              ? partialLabel
              : plan.change > 0
                ? `Complete payment · change ${formatCurrency(plan.change)}`
                : bill
                  ? `Complete payment · ${formatCurrency(bill.totalDue)}`
                  : "Complete payment"}
        </Button>
      </div>
    </div>
  );
}

// The settlement summary: every figure on the printed bill, in the same order.
function BillSummary({
  bill,
  giftCardApplied,
  pending,
}: {
  bill: BillPreview | undefined;
  giftCardApplied: number;
  pending: boolean;
}) {
  if (!bill) {
    return <p className="text-sm text-muted-foreground">Pricing the bill…</p>;
  }
  const source = bill.couponCode
    ? `coupon ${bill.couponCode}`
    : bill.promotionName
      ? bill.promotionName
      : bill.discountType === "FIXED"
        ? "flat discount"
        : null;
  return (
    <div className={pending ? "opacity-70" : undefined} aria-busy={pending}>
      <dl className="flex flex-col gap-1 text-sm">
        <Row label="Subtotal" value={formatCurrency(bill.subtotal)} />
        {bill.discountAmount > 0 && (
          <Row
            label={`Discount${source ? ` (${source})` : ""}${bill.bogoDiscountAmount > 0 ? ` · BOGO ${formatCurrency(bill.bogoDiscountAmount)} free` : ""}`}
            value={`− ${discountSummary(bill.discountPercent, bill.discountAmount, formatCurrency)}`}
            accent
          />
        )}
        <Row label="Tax (included)" value={formatCurrency(bill.taxAmount)} muted />
        {bill.loyaltyDiscountAmount > 0 && (
          <Row
            label={`Loyalty (${bill.loyaltyPointsRedeemed} pts)`}
            value={`− ${formatCurrency(bill.loyaltyDiscountAmount)}`}
            accent
          />
        )}
        {bill.serviceChargeAmount > 0 && (
          <Row
            label={`Service charge (${bill.serviceChargePercent}%)`}
            value={formatCurrency(bill.serviceChargeAmount)}
          />
        )}
        {bill.tipAmount > 0 && <Row label="Tip" value={formatCurrency(bill.tipAmount)} />}
        {bill.deliveryFee > 0 && <Row label="Delivery fee" value={formatCurrency(bill.deliveryFee)} />}
      </dl>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm font-semibold text-foreground">Total due</span>
        <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{formatCurrency(bill.totalDue)}</span>
      </div>
      {bill.amountPaid > 0 && (
        <dl className="mt-1 flex flex-col gap-1 text-sm">
          <Row label="Paid so far" value={formatCurrency(bill.amountPaid)} />
        </dl>
      )}
      {giftCardApplied > 0 && <Row label="Gift card" value={`− ${formatCurrency(giftCardApplied)}`} accent />}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Balance due</span>
        <span className="text-xl font-bold tabular-nums text-foreground">
          {formatCurrency(Math.max(round2(bill.balanceDue - giftCardApplied), 0))}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={muted ? "text-xs text-muted-foreground" : "text-muted-foreground"}>{label}</dt>
      <dd className={`tabular-nums ${accent ? "text-success" : muted ? "text-xs text-muted-foreground" : "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}
