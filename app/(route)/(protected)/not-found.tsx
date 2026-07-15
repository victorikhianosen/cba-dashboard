import Link from "next/link";
import { ShieldAlert, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-74px-3rem)] items-center justify-center">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <ShieldAlert size={36} />
        </div>

        <p className="mt-6 text-6xl font-extrabold tracking-tight text-slate-900">
          404
        </p>

        <h1 className="mt-3 text-xl font-bold text-slate-900">
          Page Not Found
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This page doesn&apos;t exist, or you don&apos;t have permission to
          view it. If you think this is a mistake, contact your
          administrator.
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173673] px-6 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <LayoutDashboard size={17} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
