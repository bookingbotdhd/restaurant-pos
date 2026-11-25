import {
  CalendarClock,
  Clock,
  Bike,
  Truck,
  Users,
  Landmark,
  BarChart3,
  Megaphone,
  Wrench,
  ChefHat,
  LayoutDashboard,
  ClipboardList,
  LayoutGrid,
  Package,
  Settings,
  ShoppingCart,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  /** Sidebar section. Service = used all shift; Manage = back office; Admin = rarely touched. */
  group?: "service" | "manage" | "admin";
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.sales.view", group: "service" },
  { labelKey: "nav.pos", href: "/pos", icon: ShoppingCart, permission: "orders.create", group: "service" },
  { labelKey: "nav.orders", href: "/orders", icon: ClipboardList, permission: "orders.create", group: "service" },
  { labelKey: "nav.tables", href: "/tables", icon: LayoutGrid, permission: "tables.view", group: "service" },
  {
    labelKey: "nav.reservations",
    href: "/reservations",
    icon: CalendarClock,
    permission: "reservations.manage",
    group: "service",
  },
  { labelKey: "nav.menu", href: "/menu", icon: UtensilsCrossed, permission: "menu.view", group: "manage" },
  { labelKey: "nav.kds", href: "/kds", icon: ChefHat, permission: "kds.manage", group: "service" },
  { labelKey: "nav.customers", href: "/customers", icon: UsersRound, permission: "customers.manage", group: "manage" },
  { labelKey: "nav.inventory", href: "/inventory", icon: Package, permission: "inventory.manage", group: "manage" },
  { labelKey: "nav.myDeliveries", href: "/my-deliveries", icon: Bike, permission: "delivery.rider", group: "service" },
  { labelKey: "nav.delivery", href: "/delivery", icon: Truck, permission: "delivery.manage", group: "service" },
  { labelKey: "nav.team", href: "/team", icon: Users, permission: "staff.manage", group: "manage" },
  { labelKey: "nav.accounting", href: "/accounting", icon: Landmark, permission: "accounting.manage", group: "admin" },
  { labelKey: "nav.reports", href: "/reports", icon: BarChart3, permission: "reports.access", group: "admin" },
  { labelKey: "nav.marketing", href: "/marketing", icon: Megaphone, permission: "marketing.manage", group: "manage" },
  { labelKey: "nav.operations", href: "/operations", icon: Wrench, permission: "operations.manage", group: "manage" },
  { labelKey: "nav.attendance", href: "/attendance", icon: Clock, group: "manage" },
  { labelKey: "nav.settings", href: "/settings", icon: Settings, permission: "settings.manage", group: "admin" },
];
