"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  Footprints,
  Globe,
  LogIn,
  LogOut,
  MousePointerClick,
  TimerOff,
  UserRound,
} from "lucide-react";

type JourneyEvent = Record<string, any>;

interface UserJourneyTimelineProps {
  sessionId: string;
  events: JourneyEvent[];
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

function formatLabel(value: string | null | undefined) {
  return (value ?? "")
    .split(/[_-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const EVENT_ICON: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  session_timeout: TimerOff,
  page_view: Footprints,
  action: MousePointerClick,
};

const EVENT_STYLE: Record<string, string> = {
  login: "bg-emerald-100 text-emerald-700 border-emerald-300",
  logout: "bg-slate-100 text-slate-700 border-slate-300",
  session_timeout: "bg-amber-100 text-amber-700 border-amber-300",
  page_view: "bg-blue-100 text-blue-700 border-blue-300",
  action: "bg-violet-100 text-violet-700 border-violet-300",
};

export default function UserJourneyTimeline({ sessionId, events }: UserJourneyTimelineProps) {
  const first = events[0];
  const last = events[events.length - 1];

  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/audit/user-journeys"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to User Journeys
        </Link>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
            <Footprints size={26} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {first?.performed_by_name ?? "—"}&apos;s session
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Session #{sessionId} • {events.length} event{events.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      {/* CONTEXT */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <InfoCard
          icon={<UserRound size={18} />}
          title="User"
          value={first?.performed_by_name ?? "—"}
          description={first?.performed_by_id ? `ID ${first.performed_by_id}` : "—"}
        />
        <InfoCard
          icon={<Clock3 size={18} />}
          title="Session Window"
          value={formatDateTime(first?.occurred_at)}
          description={`Ended: ${formatDateTime(last?.event_type === "logout" || last?.event_type === "session_timeout" ? last?.occurred_at : undefined) || "Still active"}`}
        />
        <InfoCard
          icon={<Globe size={18} />}
          title="IP / Agent"
          value={first?.ip ?? "—"}
          description={first?.agent ?? "—"}
        />
      </div>

      {/* TIMELINE */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Chronological Timeline
        </h2>

        <ol className="mt-5 space-y-1">
          {events.map((event, index) => (
            <TimelineRow key={event.id} event={event} isLast={index === events.length - 1} />
          ))}
        </ol>
      </section>
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
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{value}</p>
      <p className="mt-1 break-words text-xs font-medium text-slate-500">{description}</p>
    </div>
  );
}

function TimelineRow({ event, isLast }: { event: JourneyEvent; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = EVENT_ICON[event.event_type] ?? MousePointerClick;
  const style = EVENT_STYLE[event.event_type] ?? "bg-slate-100 text-slate-700 border-slate-300";
  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;

  return (
    <li className="relative flex gap-4 pb-6">
      {!isLast && (
        <span className="absolute left-[15px] top-8 h-full w-px bg-slate-200" aria-hidden />
      )}

      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${style}`}
      >
        <Icon size={15} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">
            {event.description || formatLabel(event.event_type)}
          </p>
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${style}`}
          >
            {formatLabel(event.action || event.event_type)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
          <span>{formatDateTime(event.occurred_at)}</span>
          {event.method && event.route && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
              {event.method} /{event.route}
            </span>
          )}
          {hasMetadata && (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="font-semibold text-[#29478f] hover:underline"
            >
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}
        </div>

        {expanded && hasMetadata && (
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
        )}
      </div>
    </li>
  );
}
