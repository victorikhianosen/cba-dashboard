import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#f7f9fc] px-4 py-16">
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
          The page you&apos;re looking for doesn&apos;t exist or has been
          moved.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173673] px-6 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
