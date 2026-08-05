import Link from "next/link";
import { FileText } from "lucide-react";
import { getCurrentUserCached } from "@/lib/current-user";

// Simple card-list landing page — add a new SummaryLinkCard here whenever a new
// settings section is built (matches how other list-of-sections pages in this
// app are structured), each gated by its own permission so a link never
// appears for someone who couldn't open the page anyway.
export default async function SettingsPage() {
  const currentUser = await getCurrentUserCached();
  const permissions: string[] = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];

  const sections = [
    {
      name: "Investment Letter Templates",
      description: "Manage the letterhead and signatories used on printed investment letters.",
      href: "/settings/investment-letter-templates",
      icon: FileText,
      permission: "view_investment_letter_templates",
    },
    {
      name: "Account Statement Templates",
      description: "Manage the header used on statements of account.",
      href: "/settings/account-statement-templates",
      icon: FileText,
      permission: "view_account_statement_templates",
    },
  ].filter((section) => permissions.includes(section.permission));

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Application-wide configuration.</p>
      </div>

      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#29478f] hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
              <section.icon size={20} />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-900">{section.name}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{section.description}</p>
          </Link>
        ))}

        {sections.length === 0 && (
          <p className="text-sm font-medium text-slate-500">
            No settings sections are available to your role yet.
          </p>
        )}
      </section>
    </>
  );
}
