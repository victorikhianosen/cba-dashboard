import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  FileClock,
  Globe,
  Laptop,
  UserRound,
} from "lucide-react";

type AuditLog = Record<string, any>;

interface AuditLogDetailProps {
  log: AuditLog;
}

const actionStyles: Record<string, string> = {
  created: "bg-green-100 text-green-800 border border-green-300",
  updated: "bg-amber-100 text-amber-800 border border-amber-300",
  status_updated: "bg-amber-100 text-amber-800 border border-amber-300",
  deleted: "bg-red-100 text-red-800 border border-red-300",
  login: "bg-blue-100 text-blue-800 border border-blue-300",
  logout: "bg-slate-100 text-slate-700 border border-slate-300",
};

// Turns "two_factor_challenge_issued" into "Two Factor Challenge Issued".
function formatActionLabel(action: string) {
  return (action ?? "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AuditLogDetail({ log }: AuditLogDetailProps) {
  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/audit/audit-logs"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Audit Logs
        </Link>

        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
            <FileClock size={26} />
          </div>

          <div>
            <h1 className="text-xl font-bold leading-relaxed text-slate-900">
              {log.description}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                  actionStyles[log.action] ||
                  "bg-slate-100 text-slate-700 border border-slate-300"
                }`}
              >
                {log.action ? formatActionLabel(log.action) : "—"}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                {log.module?.replace(/_/g, " ") ?? "—"}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                <Clock3 size={12} />
                {log.created_at
                  ? new Date(log.created_at).toLocaleString()
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEXT */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <InfoCard
          icon={<UserRound size={18} />}
          title="Performed By"
          value={log.performed_by_name ?? "System"}
          description={
            log.performed_by_type
              ? `${log.performed_by_type}${
                  log.performed_by_id ? ` • ID ${log.performed_by_id}` : ""
                }`
              : "—"
          }
        />

        <InfoCard
          icon={<Globe size={18} />}
          title="IP Address"
          value={log.ip ?? "—"}
          description={log.channel ? `Channel: ${log.channel}` : "—"}
        />

        <InfoCard
          icon={<Laptop size={18} />}
          title="Agent"
          value={log.agent ?? "—"}
          description="User agent / source"
        />
      </div>

      {/* CHANGES */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChangeCard title="Before Change" data={log.before_change} />
        <ChangeCard title="After Change" data={log.after_change} />
      </div>
    </>
  );
}

function InfoCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
    </div>
  );
}

function ChangeCard({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <p className="text-sm font-bold text-slate-900">{title}</p>
      </div>
      <div className="max-h-[420px] overflow-auto p-4">
        {data ? (
          <pre className="whitespace-pre-wrap break-words text-xs text-slate-700">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <p className="text-sm font-medium text-slate-400">No data.</p>
        )}
      </div>
    </div>
  );
}
