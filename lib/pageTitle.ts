import type { MenuItem } from "@/app/(route)/(protected)/Sidebar";

interface FlatItem {
  name: string;
  href: string;
}

function flatten(items: MenuItem[]): FlatItem[] {
  return items.flatMap((item) => [
    ...(item.href ? [{ name: item.name, href: item.href }] : []),
    ...(item.children ? flatten(item.children) : []),
  ]);
}

// Segments that follow a matched nav href get their own label instead of
// the generic "Details" (e.g. /customer-management/customer/5/edit → "Edit").
const SEGMENT_LABELS: Record<string, string> = {
  create: "Create",
  edit: "Edit",
};

// Turns the current pathname into a human title using the same nav items
// that drive the sidebar, so the navbar heading always tracks where the
// user actually is (e.g. "Customer", "Customer Details", "Customer Edit").
export function getPageTitle(pathname: string, items: MenuItem[]): string {
  const flat: FlatItem[] = [...flatten(items), { name: "Settings", href: "/settings" }];

  const matches = flat.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  if (matches.length === 0) return "Dashboard";

  const best = matches.reduce((longest, item) =>
    item.href.length > longest.href.length ? item : longest
  );

  const rest = pathname
    .slice(best.href.length)
    .split("/")
    .filter(Boolean);

  if (rest.length === 0) return best.name;

  const suffix = SEGMENT_LABELS[rest[0]] ?? "Details";

  return `${best.name} ${suffix}`;
}
