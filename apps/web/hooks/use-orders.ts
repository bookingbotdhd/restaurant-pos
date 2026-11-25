"use client";

import type {
  AddOrderItemsDto,
  CheckoutDto,
  CreateOrderDto,
  KotStatusDto,
  RefundDto,
  UpdateOrderDto,
} from "@restroos/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@/hooks/use-customers";
import { api } from "@/lib/api";

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  tipAmount: string;
  serviceChargeAmount?: string;
  bogoDiscountAmount?: string;
  loyaltyPointsRedeemed: number;
  loyaltyDiscountAmount: string;
  totalAmount: string;
  deliveryFee?: string;
  status: string;
  payments?: { method: string; amount: string; tendered?: string | null; changeGiven?: string | null }[];
}

/** What a checkout call answers with: the order plus where its settlement stands. */
export interface CheckoutResult extends CreatedOrder {
  settlement: {
    amountDue: number;
    amountPaid: number;
    balanceDue: number;
    changeDue: number;
    fullyPaid: boolean;
  };
}

export function useCreateOrder(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOrderDto) => api.post<CreatedOrder>(`/orders?branchId=${branchId}`, dto),
    onSuccess: () => {
      // Without refreshing the per-table open-bill cache, going Table 1 -> 2 ->
      // 1 showed Table 1 as having no order and the next send opened a duplicate.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["floors", branchId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary", branchId] });
    },
  });
}

/** The bill as the server prices it right now; never saves anything. */
export interface BillPreview {
  locked: boolean;
  status: string;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: number | null;
  couponCode: string | null;
  promotionName: string | null;
  taxAmount: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  bogoDiscountAmount: number;
  loyaltyPointsRedeemed: number;
  loyaltyDiscountAmount: number;
  tipAmount: number;
  deliveryFee: number;
  totalDue: number;
  amountPaid: number;
  balanceDue: number;
}

export type BillAdjustments = Pick<
  CheckoutDto,
  "discountPercent" | "discountFlat" | "tipAmount" | "loyaltyPointsToRedeem" | "couponCode" | "customerId" | "serviceChargePercent" | "applyBogo"
>;

export function useBillPreview(branchId: string | null, orderId: string, adj: BillAdjustments, enabled = true) {
  // `customerId` only matters at checkout; the server prices from the order.
  const { customerId: _customerId, ...priced } = adj;
  void _customerId;
  return useQuery({
    queryKey: ["orders", "bill", branchId, orderId, priced],
    queryFn: () => api.post<BillPreview>(`/orders/${orderId}/bill-preview?branchId=${branchId}`, priced),
    enabled: !!branchId && enabled,
    retry: false,
    // Keep the last figures on screen while a changed discount is repriced.
    placeholderData: (previous) => previous,
  });
}

export function useCheckoutOrder(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, dto }: { orderId: string; dto: CheckoutDto }) =>
      api.post<CheckoutResult>(`/orders/${orderId}/checkout?branchId=${branchId}`, dto),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["floors", branchId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary", branchId] });
    },
  });
}

/** What sending a bill on WhatsApp answers with. */
export interface SendBillWhatsappResult {
  ok: boolean;
  provider: string;
  /** Recipient phone, digits only. */
  to: string;
  messageId?: string | null;
}

/**
 * Send one bill on WhatsApp. Staff opt-in only, one bill at a time — there
 * is no bulk or automatic send. With the default noop provider the server
 * answers 400 "not set up" (see docs/WHATSAPP-BILL.md); the error surfaces
 * as a toast, nothing is pretended sent.
 */
export function useSendBillWhatsapp(branchId: string | null) {
  return useMutation({
    mutationFn: ({ orderId, phone }: { orderId: string; phone?: string }) =>
      api.post<SendBillWhatsappResult>(
        `/orders/${orderId}/send-bill-whatsapp?branchId=${branchId}`,
        phone ? { phone } : {},
      ),
  });
}

export interface OpenOrder {
  id: string;
  orderNumber: string;
  type: string;
  tableId: string | null;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  tipAmount: string;
  loyaltyPointsRedeemed: number;
  loyaltyDiscountAmount: string;
  totalAmount: string;
  status: string;
  customer: Customer | null;
}

export type OrderChannel = "STAFF" | "ONLINE";
export type AcceptanceStatus = "NOT_REQUIRED" | "PENDING" | "ACCEPTED" | "REJECTED";

// Shape of GET /orders/:id (the order row with its relations).
export interface OrderDetail {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  channel: OrderChannel;
  acceptance: AcceptanceStatus;
  tableId: string | null;
  guestName: string | null;
  guestCount: number | null;
  deliveryAddress?: string | null;
  deliveryPincode?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryPlace?: string | null;
  notes: string | null;
  cancelReason: string | null;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  tipAmount: string;
  serviceChargeAmount?: string;
  bogoDiscountAmount?: string;
  totalAmount: string;
  createdAt: string;
  billedAt: string | null;
  heldAt: string | null;
  table: { id: string; name: string | null; number: string } | null;
  customer: Customer | null;
  items: {
    id: string;
    menuItemId: string;
    nameSnapshot: string;
    quantity: number;
    unitPriceSnapshot: string;
    lineTotal: string;
    kitchenNote: string | null;
    modifiers: { id: string; nameSnapshot: string; priceAdjSnapshot: string }[];
  }[];
  kots: {
    id: string;
    status: KotStatusDto;
    printedCount: number;
    rejectReason: string | null;
    items: { orderItemId: string; status: string }[];
  }[];
  cancelSource: "STAFF" | "CUSTOMER" | "KITCHEN_REJECTED" | "ONLINE_DECLINED" | null;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: string | null;
  loyaltyPointsRedeemed: number;
  loyaltyDiscountAmount: string;
  deliveryFee?: string;
  payments: {
    id: string;
    method: string;
    amount: string;
    tendered: string | null;
    changeGiven: string | null;
    createdAt: string;
  }[];
}

export function useOrder(branchId: string | null, orderId: string | null) {
  return useQuery({
    queryKey: ["orders", "detail", branchId, orderId],
    queryFn: () => api.get<OrderDetail>(`/orders/${orderId}?branchId=${branchId}`),
    enabled: !!branchId && !!orderId,
  });
}

export interface ManagedOrder {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  channel: OrderChannel;
  acceptance: AcceptanceStatus;
  guestName: string | null;
  deliveryAddress?: string | null;
  deliveryPincode?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryPlace?: string | null;
  totalAmount: string;
  createdAt: string;
  table: { id: string; name: string | null; number: number } | null;
  customer: Customer | null;
  items: { id: string; nameSnapshot: string; quantity: number }[];
}

export type OrderTab = "pending" | "active" | "history";

export function useManagedOrders(
  branchId: string | null,
  tab: OrderTab,
  channel?: OrderChannel,
  type?: string,
) {
  return useQuery({
    queryKey: ["orders", "manage", branchId, tab, channel ?? "", type ?? ""],
    queryFn: () => {
      const q = new URLSearchParams({ branchId: branchId ?? "", tab });
      if (channel) q.set("channel", channel);
      if (type) q.set("type", type);
      return api.get<ManagedOrder[]>(`/orders/manage?${q.toString()}`);
    },
    enabled: !!branchId,
    refetchInterval: 10_000,
  });
}

export function useAcceptOrder(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => api.post(`/orders/${orderId}/accept?branchId=${branchId}`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["kds", "tickets", branchId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRejectOrder(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      api.post(`/orders/${orderId}/reject?branchId=${branchId}`, { reason }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["kds"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useOpenOrders(branchId: string | null) {
  return useQuery({
    queryKey: ["orders", "open", branchId],
    queryFn: () => api.get<OpenOrder[]>(`/orders?branchId=${branchId}`),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });
}

export function useOpenOrdersForTable(branchId: string | null, tableId: string | null) {
  return useQuery({
    queryKey: ["orders", "open", branchId, "table", tableId],
    queryFn: () => api.get<OpenOrder[]>(`/orders?branchId=${branchId}&tableId=${tableId}`),
    enabled: !!branchId && !!tableId,
    // A table's bills change from other terminals; never trust a cached list.
    staleTime: 0,
    refetchOnMount: "always",
  });
}

/** A parked order: an open bill plus when it was held and its table (if any). */
export interface HeldOrder extends OpenOrder {
  heldAt: string | null;
  createdAt: string;
  table: { id: string; name: string | null; number: string } | null;
  items: { id: string; nameSnapshot: string; quantity: number }[];
}

export function useHeldOrders(branchId: string | null) {
  return useQuery({
    queryKey: ["orders", "held", branchId],
    queryFn: () => api.get<HeldOrder[]>(`/orders/held?branchId=${branchId}`),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });
}

export function useHoldOrder(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api.post<CreatedOrder>(`/orders/${orderId}/hold?branchId=${branchId}`),
    onSuccess: () => invalidateBillViews(queryClient, branchId),
  });
}

export function useResumeOrder(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api.post<OrderDetail>(`/orders/${orderId}/resume?branchId=${branchId}`),
    onSuccess: () => invalidateBillViews(queryClient, branchId),
  });
}

export function useAddOrderItems(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, dto }: { orderId: string; dto: AddOrderItemsDto }) =>
      api.post<CreatedOrder>(`/orders/${orderId}/items?branchId=${branchId}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["floors", branchId] });
    },
  });
}

export function useMergeOrder(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetOrderId, sourceOrderId }: { targetOrderId: string; sourceOrderId: string }) =>
      api.post(`/orders/${targetOrderId}/merge?branchId=${branchId}`, { sourceOrderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floors", branchId] });
      queryClient.invalidateQueries({ queryKey: ["orders", "open", branchId] });
    },
  });
}

// Everything a changed bill can touch on screen: lists, the table map, the
// kitchen screen, dashboard figures.
function invalidateBillViews(queryClient: ReturnType<typeof useQueryClient>, branchId: string | null) {
  queryClient.invalidateQueries({ queryKey: ["orders"] });
  queryClient.invalidateQueries({ queryKey: ["floors", branchId] });
  queryClient.invalidateQueries({ queryKey: ["kds"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useCancelOrder(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      reason,
      source,
      confirmStarted,
      managerApprovalToken,
    }: {
      orderId: string;
      reason: string;
      source?: "STAFF" | "CUSTOMER";
      confirmStarted?: boolean;
      // Manager-PIN approval token — the server refuses the void without it.
      managerApprovalToken?: string;
    }) =>
      api.post<CreatedOrder>(`/orders/${orderId}/cancel?branchId=${branchId}`, {
        reason,
        source,
        confirmStarted,
        managerApprovalToken,
      }),
    onSuccess: () => invalidateBillViews(queryClient, branchId),
  });
}

export function useUpdateOrder(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, dto }: { orderId: string; dto: UpdateOrderDto }) =>
      api.patch<OrderDetail>(`/orders/${orderId}?branchId=${branchId}`, dto),
    onSuccess: () => invalidateBillViews(queryClient, branchId),
  });
}

export function useUpdateOrderItem(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, itemId, quantity }: { orderId: string; itemId: string; quantity: number }) =>
      api.patch<OrderDetail>(`/orders/${orderId}/items/${itemId}?branchId=${branchId}`, { quantity }),
    onSuccess: () => invalidateBillViews(queryClient, branchId),
  });
}

export function useRemoveOrderItem(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, itemId, reason }: { orderId: string; itemId: string; reason: string }) =>
      api.post<OrderDetail>(`/orders/${orderId}/items/${itemId}/remove?branchId=${branchId}`, { reason }),
    onSuccess: () => invalidateBillViews(queryClient, branchId),
  });
}

export function useRefundOrder(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, dto }: { orderId: string; dto: RefundDto }) =>
      api.post(`/orders/${orderId}/refund?branchId=${branchId}`, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard", "summary", branchId] }),
  });
}

export function useDeleteOrders(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { orderIds: string[]; password: string }) =>
      api.post<{ deleted: number }>(`/orders/delete-bulk?branchId=${branchId}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
