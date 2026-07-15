"use client";

import {
  useState,
  type ReactNode,
} from "react";

import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Hash,
  Shield,
  TrendingDown,
  TrendingUp,
  UserRound,
  XCircle,
} from "lucide-react";

type QuickDateRange =
  | "Today"
  | "Last Week"
  | "This Month";

type SelectedDateRange =
  | QuickDateRange
  | "Custom";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  change?: string;
  changeType?:
    | "increase"
    | "decrease";
  icon: ReactNode;
  iconStyle: string;
}

const dashboardStats: StatCardProps[] = [
  {
    title:
      "Total Transaction Volume",
    value: "₦12.5M",
    change: "+15%",
    changeType: "increase",
    description:
      "Total value of all transactions",
    icon: (
      <TrendingUp size={22} />
    ),
    iconStyle:
      "bg-[#29478f] text-white",
  },
  {
    title:
      "Total Transaction Count",
    value: "4,523",
    description:
      "Number of completed transactions",
    icon: <Hash size={23} />,
    iconStyle:
      "bg-slate-200 text-slate-500",
  },
  {
    title: "Success Rate",
    value: "94.2%",
    description:
      "Percentage of successful transactions",
    icon: (
      <TrendingUp size={22} />
    ),
    iconStyle:
      "bg-emerald-50 text-emerald-500",
  },
  {
    title: "Failure Rate",
    value: "5.8%",
    description:
      "Percentage of failed transactions",
    icon: (
      <TrendingDown size={22} />
    ),
    iconStyle:
      "bg-red-50 text-red-500",
  },
  {
    title: "Total Customers",
    value: "1,250",
    change: "+12%",
    changeType: "increase",
    description:
      "Total registered customers",
    icon: (
      <UserRound size={22} />
    ),
    iconStyle:
      "bg-[#29478f] text-white",
  },
  {
    title: "Pending Requests",
    value: "23",
    description:
      "Requests awaiting approval",
    icon: <Clock3 size={22} />,
    iconStyle:
      "bg-orange-50 text-orange-500",
  },
  {
    title: "Rejected Requests",
    value: "17",
    description:
      "Requests rejected by an administrator",
    icon: <XCircle size={22} />,
    iconStyle:
      "bg-red-50 text-red-500",
  },
  {
    title: "Active Accounts",
    value: "2,340",
    change: "+8%",
    changeType: "increase",
    description:
      "Currently active customer accounts",
    icon: <Activity size={22} />,
    iconStyle:
      "bg-emerald-50 text-emerald-500",
  },
  {
    title: "Total Accounts",
    value: "2,450",
    description:
      "All accounts created on BankPro",
    icon: (
      <CreditCard size={22} />
    ),
    iconStyle:
      "bg-[#29478f] text-white",
  },
  {
    title: "Inactive Accounts",
    value: "42",
    description:
      "Currently inactive accounts",
    icon: <Box size={21} />,
    iconStyle:
      "bg-slate-200 text-slate-500",
  },
  {
    title: "Loan Accounts",
    value: "350",
    description:
      "Active and inactive loan accounts",
    icon: (
      <FileText size={22} />
    ),
    iconStyle:
      "bg-[#29478f] text-white",
  },
  {
    title: "Blocked Accounts",
    value: "5",
    description:
      "Accounts blocked by an administrator",
    icon: <Shield size={22} />,
    iconStyle:
      "bg-red-50 text-red-500",
  },
  {
    title:
      "Pending Transactions",
    value: "12",
    description:
      "Transactions awaiting processing",
    icon: <Clock3 size={22} />,
    iconStyle:
      "bg-slate-200 text-slate-500",
  },
  {
    title:
      "Completed Transactions",
    value: "4,523",
    description:
      "Transactions successfully completed",
    icon: (
      <CheckCircle2 size={22} />
    ),
    iconStyle:
      "bg-emerald-50 text-emerald-500",
  },
  {
    title:
      "Failed Transactions",
    value: "278",
    description:
      "Transactions that failed processing",
    icon: (
      <AlertTriangle size={22} />
    ),
    iconStyle:
      "bg-red-50 text-red-500",
  },
];

const quickDateRanges: QuickDateRange[] = [
  "Today",
  "Last Week",
  "This Month",
];

function formatDate(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const today = new Date();

  const firstDay =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

  const lastDay =
    new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );

  return {
    startDate:
      formatDate(firstDay),

    endDate:
      formatDate(lastDay),
  };
}

function StatCard({
  title,
  value,
  description,
  change,
  changeType,
  icon,
  iconStyle,
}: StatCardProps) {
  return (
    <article className="relative min-h-[145px] rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* ICON */}
      <div
        className={`absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-xl ${iconStyle}`}
      >
        {icon}
      </div>

      {/* CARD CONTENT */}
      <div className="pr-14">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </h2>

          {change && (
            <span
              className={`text-xs font-semibold ${
                changeType ===
                "decrease"
                  ? "text-red-500"
                  : "text-emerald-500"
              }`}
            >
              {change}
            </span>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {description}
        </p>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const initialDateRange =
    getCurrentMonthRange();

  const [
    selectedRange,
    setSelectedRange,
  ] =
    useState<SelectedDateRange>(
      "This Month"
    );

  const [
    startDate,
    setStartDate,
  ] = useState(
    initialDateRange.startDate
  );

  const [
    endDate,
    setEndDate,
  ] = useState(
    initialDateRange.endDate
  );

  function handleDateRange(
    range: QuickDateRange
  ) {
    const today = new Date();

    setSelectedRange(range);

    if (range === "Today") {
      const formattedToday =
        formatDate(today);

      setStartDate(
        formattedToday
      );

      setEndDate(
        formattedToday
      );

      return;
    }

    if (
      range === "Last Week"
    ) {
      const start =
        new Date(today);

      start.setDate(
        today.getDate() - 7
      );

      setStartDate(
        formatDate(start)
      );

      setEndDate(
        formatDate(today)
      );

      return;
    }

    const currentMonth =
      getCurrentMonthRange();

    setStartDate(
      currentMonth.startDate
    );

    setEndDate(
      currentMonth.endDate
    );
  }

  return (
    <>
      {/* PAGE TITLE */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Core banking overview and
          recent activity
        </p>
      </div>

      {/* DATE FILTERS */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        {/* QUICK DATE BUTTONS */}
        <div className="flex flex-wrap gap-2">
          {quickDateRanges.map(
            (range) => (
              <button
                key={range}
                type="button"
                onClick={() =>
                  handleDateRange(
                    range
                  )
                }
                className={`h-[42px] cursor-pointer rounded-lg border px-4 text-sm font-medium transition ${
                  selectedRange ===
                  range
                    ? "border-[#29478f] bg-[#29478f] text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#29478f] hover:text-[#29478f]"
                }`}
              >
                {range}
              </button>
            )
          )}
        </div>

        {/* START DATE */}
        <div>
          <label
            htmlFor="start-date"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Start Date
          </label>

          <input
            id="start-date"
            type="date"
            value={startDate}
            max={endDate}
            onChange={(event) => {
              setStartDate(
                event.target.value
              );

              setSelectedRange(
                "Custom"
              );
            }}
            className="h-[42px] cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#29478f] focus:ring-2 focus:ring-[#29478f]/10"
          />
        </div>

        {/* END DATE */}
        <div>
          <label
            htmlFor="end-date"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            End Date
          </label>

          <input
            id="end-date"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => {
              setEndDate(
                event.target.value
              );

              setSelectedRange(
                "Custom"
              );
            }}
            className="h-[42px] cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#29478f] focus:ring-2 focus:ring-[#29478f]/10"
          />
        </div>
      </div>

      {/* DASHBOARD CARDS */}
      <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map(
          (stat) => (
            <StatCard
              key={stat.title}
              {...stat}
            />
          )
        )}
      </section>
    </>
  );
}