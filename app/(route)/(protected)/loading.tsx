// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-8">
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .skeleton {
          position: relative;
          overflow: hidden;
          background-color: #EAEAE8;
        }
        .skeleton::before {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: shimmer 1.6s infinite;
        }
      `}</style>

      {/* Page title */}
      <div className="space-y-2">
        <div className="skeleton h-7 w-56 rounded-lg" />
        <div className="skeleton h-4 w-80 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-5 rounded-2xl border border-[#EBEBE9] bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="skeleton h-9 w-9 rounded-full" />
              <div className="skeleton h-4 w-12 rounded-md" />
            </div>
            <div className="skeleton h-3 w-20 rounded-md" />
            <div className="skeleton h-6 w-28 rounded-md" />
          </div>
        ))}
      </div>

      {/* Chart block */}
      <div className="p-5 rounded-2xl border border-[#EBEBE9] bg-white space-y-4">
        <div className="flex items-center justify-between">
          <div className="skeleton h-4 w-32 rounded-md" />
          <div className="skeleton h-4 w-16 rounded-md" />
        </div>
        <div className="skeleton h-56 w-full rounded-xl" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#EBEBE9] bg-white overflow-hidden">
        <div className="p-5 border-b border-[#EBEBE9]">
          <div className="skeleton h-4 w-40 rounded-md" />
        </div>
        <div className="divide-y divide-[#EBEBE9]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="skeleton h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-1/3 rounded-md" />
                <div className="skeleton h-3 w-1/4 rounded-md" />
              </div>
              <div className="skeleton h-3.5 w-16 rounded-md" />
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}