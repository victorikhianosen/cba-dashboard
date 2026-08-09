"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  Box,
  Building2,
  ChevronDown,
  Coins,
  CreditCard,
  FileCheck2,
  FileText,
  Footprints,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  PiggyBank,
  Settings,
  ShieldQuestion,
  Split,
  Vault as VaultIcon,
  Wallet,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/actions/auth.action";
import { getBrandingAction } from "@/actions/setting.action";
import { BRANDING_UPDATED_EVENT } from "@/lib/branding-events";
import { usePermissions } from "@/lib/permissions";

const DEFAULT_BRAND_NAME = "BankPro";
const DEFAULT_LOGO_SRC = "/logo.png";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface NavChild {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: string;
}

export interface MenuItem {
  name: string;
  href?: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  anyPermission?: string[];
  children?: NavChild[];
}

// `permission` / `anyPermission` gate visibility. Items with neither are
// always shown (no matching permission exists yet on the backend for them).
export const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Branch",
    href: "/branch",
    icon: Building2,
    permission: "view_branches",
  },
  {
    name: "Bank",
    href: "/bank",
    icon: Landmark,
  },
  {
    name: "Currency",
    href: "/currency",
    icon: Coins,
    permission: "view_currencies",
  },
  {
    name: "Account Officers",
    href: "/account-officer",
    icon: UserCog,
    permission: "view_account_officers",
  },
  {
    name: "Customer Mgt",
    icon: CreditCard,
    children: [
      {
        name: "Customer",
        href: "/customer-management/customer",
        icon: UserRound,
        permission: "view_customers",
      },
      {
        name: "Account",
        href: "/customer-management/account",
        icon: CreditCard,
      },
      {
        name: "Account Product",
        href: "/customer-management/account-product",
        icon: Box,
        permission: "view_account_products",
      },
      {
        name: "Liens",
        href: "/customer-management/liens",
        icon: ListChecks,
        permission: "view_liens",
      },
      {
        name: "Virtual Accounts",
        href: "/customer-management/virtual-accounts",
        icon: Wallet,
        permission: "view_virtual_accounts",
      },
      {
        name: "Statement Templates",
        href: "/settings/account-statement-templates",
        icon: FileText,
        permission: "view_account_statement_templates",
      },
    ],
  },
  {
    name: "Investment Management",
    icon: LineChart,
    children: [
      {
        name: "Investment",
        href: "/investment-management/investment",
        icon: PiggyBank,
        permission: "view_investments",
      },
      {
        name: "Investment Product",
        href: "/investment-management/investment-product",
        icon: Box,
        permission: "view_investment_products",
      },
      {
        name: "Partial Liquidations",
        href: "/investment-management/partial-liquidations",
        icon: Split,
        permission: "view_investments",
      },
      {
        name: "Letter Templates",
        href: "/settings/investment-letter-templates",
        icon: FileText,
        permission: "view_investment_letter_templates",
      },
    ],
  },
  {
    name: "Till Management",
    icon: Wallet,
    children: [
      {
        name: "My Teller",
        href: "/till-management/my-teller",
        icon: Wallet,
        permission: "operate_teller",
      },
      {
        name: "Tellers",
        href: "/till-management/teller",
        icon: Box,
        permission: "view_tellers",
      },
      {
        name: "Vaults",
        href: "/till-management/vault",
        icon: VaultIcon,
        permission: "view_vaults",
      },
      {
        name: "Reconciliation",
        href: "/till-management/reconciliation",
        icon: ListChecks,
        permission: "approve_cashier_variance",
      },
      {
        name: "Withdrawal Approvals",
        href: "/till-management/withdrawal-approvals",
        icon: ListChecks,
        permission: "approve_teller_withdrawal",
      },
    ],
  },
  {
    name: "Posting Management",
    icon: ArrowLeftRight,
    children: [
      {
        name: "Posting",
        href: "/postings",
        icon: ArrowLeftRight,
        permission: "view_postings",
      },
      {
        name: "Fund GL",
        href: "/postings/fund-gl",
        icon: BookOpen,
        permission: "view_fund_gls",
      },
    ],
  },
  {
    name: "Chart of Accounts",
    icon: FileText,
    children: [
      {
        name: "General Ledger Manager",
        href: "/chat-of-account/general_ledger",
        icon: BookOpen,
        permission: "view_general_ledgers",
      },
      {
        name: "Journal Entries",
        href: "/chat-of-account/journal-entries",
        icon: FileText,
        permission: "view_general_ledgers",
      },
      {
        name: "Transactions",
        href: "/chat-of-account/transactions",
        icon: ArrowLeftRight,
        permission: "view_general_ledgers",
      },
      {
        name: "Financial Transactions",
        href: "/chat-of-account/financial-transactions",
        icon: ArrowLeftRight,
        permission: "view_general_ledgers",
      },
    ],
  },
  {
    name: "User Mgt",
    icon: Users,
    children: [
      {
        name: "Users",
        href: "/user-management/user",
        icon: Users,
        permission: "view_users",
      },
      {
        name: "Roles",
        href: "/user-management/role",
        icon: ShieldQuestion,
        permission: "view_roles",
      },
      {
        name: "Permissions",
        href: "/user-management/permission",
        icon: KeyRound,
        permission: "view_permissions",
      },
    ],
  },
  {
    name: "Audit",
    icon: FileCheck2,
    children: [
      {
        name: "Audit Log",
        href: "/audit/audit-logs",
        icon: FileCheck2,
        permission: "view_audit_trails",
      },
      {
        name: "User Journeys",
        href: "/audit/user-journeys",
        icon: Footprints,
        permission: "view_user_journeys",
      },
    ],
  },
];

function isActiveHref(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const [loggingOut, setLoggingOut] = useState(false);

  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);
  const [logoSrc, setLogoSrc] = useState(DEFAULT_LOGO_SRC);

  useEffect(() => {
    let cancelled = false;

    async function loadBranding() {
      const result: any = await getBrandingAction();
      if (cancelled || result?.status !== "success" || !result?.data) return;

      // Fall back to the default whenever a field comes back empty (e.g. the logo was
      // never uploaded) rather than only ever overwriting — otherwise a save that clears
      // a field wouldn't be reflected here without a full reload.
      setBrandName(result.data.name || DEFAULT_BRAND_NAME);
      setLogoSrc(result.data.logo_url || DEFAULT_LOGO_SRC);
    }

    loadBranding();
    window.addEventListener(BRANDING_UPDATED_EVENT, loadBranding);

    return () => {
      cancelled = true;
      window.removeEventListener(BRANDING_UPDATED_EVENT, loadBranding);
    };
  }, []);

  function isItemVisible(item: {
    permission?: string;
    anyPermission?: string[];
  }) {
    if (item.permission) return hasPermission(item.permission);
    if (item.anyPermission) return hasAnyPermission(item.anyPermission);
    return true;
  }

  const visibleMenuItems = menuItems
    .filter(isItemVisible)
    .map((item) =>
      item.children
        ? { ...item, children: item.children.filter(isItemVisible) }
        : item,
    )
    .filter((item) => !item.children || item.children.length > 0);

  const activeGroupName = visibleMenuItems.find((item) =>
    item.children?.some((child) => isActiveHref(pathname, child.href)),
  )?.name;

  const [openGroup, setOpenGroup] = useState<string | null>(
    activeGroupName ?? null,
  );

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAction();
    onClose();
    router.replace("/login");
    router.refresh();

    setLoggingOut(false);
  }

  function isActive(href: string) {
    return isActiveHref(pathname, href);
  }

  return (
    <>
      {/* MOBILE OVERLAY */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col bg-[#101f42] text-white transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* BANKPRO BRAND */}
        <div className="flex h-[90px] items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex min-w-0 items-center gap-3"
          >
            {/* LOGO */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
              {/* Plain <img>, not next/image — logoSrc can be an external storage URL
                  (S3/etc.) once an admin uploads one via Settings, and next/image would
                  need that host allow-listed in next.config to optimize it. */}
              <img
                src={logoSrc}
                alt={`${brandName} Logo`}
                className="h-full w-full object-contain"
              />
            </div>

            {/* BRAND NAME */}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-white">
                {brandName}
              </h2>

              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                Core Banking Platform
              </p>
            </div>
          </Link>

          {/* MOBILE CLOSE BUTTON */}
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-5">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;

            if (item.children) {
              const groupActive = item.children.some((child) =>
                isActive(child.href),
              );
              const expanded = openGroup === item.name;

              return (
                <div key={item.name}>
                  <button
                    type="button"
                    onClick={() => setOpenGroup(expanded ? null : item.name)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm transition ${
                      groupActive
                        ? "bg-[#29447d] font-medium text-white shadow-sm"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={19} strokeWidth={groupActive ? 2.3 : 2} />
                      <span>{item.name}</span>
                    </span>

                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expanded && (
                    <div className="mt-1 space-y-1 pl-4">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isActive(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition ${
                              childActive
                                ? "bg-[#29447d] font-medium text-white shadow-sm"
                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <ChildIcon
                              size={17}
                              strokeWidth={childActive ? 2.3 : 2}
                            />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = isActive(item.href!);

            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={onClose}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  active
                    ? "bg-[#29447d] font-medium text-white shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.3 : 2} />

                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="border-t border-white/10 p-2">
          {/* SETTINGS */}
          <Link
            href="/settings"
            onClick={onClose}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
              isActive("/settings")
                ? "bg-[#29447d] font-medium text-white"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Settings size={19} />

            <span>Settings</span>
          </Link>

          {/* LOGOUT */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={19} />

            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
