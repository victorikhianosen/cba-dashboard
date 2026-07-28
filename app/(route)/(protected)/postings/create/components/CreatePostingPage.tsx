"use client";

import { useRef, useState, type FormEvent, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import { getAccountsAction } from "@/actions/account.action";
import { getGeneralLedgersAction } from "@/actions/general-ledger.action";
import { createPostingAction } from "@/actions/posting.action";
import { handleApiError } from "@/lib/errors";

type LookupOption = Record<string, any>;

type PostingTypeKey = "gl_to_gl" | "customer_to_gl" | "gl_to_customer" | "customer_to_customer";

const POSTING_TYPES: {
  key: PostingTypeKey;
  label: string;
  source: "account" | "general_ledger";
  destination: "account" | "general_ledger";
}[] = [
  { key: "gl_to_gl", label: "GL to GL", source: "general_ledger", destination: "general_ledger" },
  { key: "customer_to_gl", label: "Customer to GL", source: "account", destination: "general_ledger" },
  { key: "gl_to_customer", label: "GL to Customer", source: "general_ledger", destination: "account" },
  {
    key: "customer_to_customer",
    label: "Customer to Customer",
    source: "account",
    destination: "account",
  },
];

const TRANSACTION_TYPES = [
  "transfer",
  "deposit",
  "withdrawal",
  "fee",
  "interest",
  "reversal",
  "adjustment",
  "refund",
  "other",
];

function labelize(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Strips anything that isn't a letter, digit, space or basic punctuation, and
// collapses repeated whitespace — keeps free-text narration safe for the
// backend regardless of what a user pastes in.
function sanitizeRemark(value: string) {
  return value.replace(/[^A-Za-z0-9 .,\-_/()]/g, "").replace(/\s+/g, " ");
}

function formatBalance(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 });
}

// Renders a raw "5000.5" amount as "5,000.5" for display — the underlying
// state stays comma-free so Number(amount) and the API payload are unaffected.
function formatAmountDisplay(raw: string) {
  if (!raw) return "";
  const [intPart, decimalPart] = raw.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
}

// Strips whatever the user typed (commas included) back down to a plain
// numeric string with at most one decimal point.
function parseAmountInput(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const [intPart, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${intPart}.${rest.join("")}` : intPart;
}

export default function CreatePostingPage() {
  const router = useRouter();

  const [postingType, setPostingType] = useState<PostingTypeKey>("customer_to_customer");
  const [submitting, setSubmitting] = useState(false);

  const [sourceGl, setSourceGl] = useState<LookupOption | null>(null);
  const [destinationGl, setDestinationGl] = useState<LookupOption | null>(null);
  const [sourceAccount, setSourceAccount] = useState<LookupOption | null>(null);
  const [destinationAccount, setDestinationAccount] = useState<LookupOption | null>(null);

  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [remarks, setRemarks] = useState("");

  const type = POSTING_TYPES.find((t) => t.key === postingType)!;

  const source = type.source === "account" ? sourceAccount : sourceGl;
  const destination = type.destination === "account" ? destinationAccount : destinationGl;

  const sourceCurrency = source?.currency_code;
  const destinationCurrency = destination?.currency_code;
  const currencyMismatch = !!sourceCurrency && !!destinationCurrency && sourceCurrency !== destinationCurrency;

  const sourceBalance = Number(type.source === "account" ? source?.available_balance : source?.balance);
  const insufficientBalance = !!source && !!amount && Number(amount) > sourceBalance;

  // Only possible when source and destination are the same kind of party
  // (GL to GL or Customer to Customer) — the other two combos can never
  // collide since the types themselves differ.
  const selfPosting = type.source === type.destination && !!source && !!destination && source.id === destination.id;

  // The submit button only appears once every requirement is actually met —
  // no disabled button to stare at, no guessing what's still missing.
  const isReady =
    !!source &&
    !!destination &&
    !selfPosting &&
    !currencyMismatch &&
    !!amount &&
    Number(amount) > 0 &&
    !insufficientBalance &&
    !!remarks.trim();

  function resetParties() {
    setSourceGl(null);
    setDestinationGl(null);
    setSourceAccount(null);
    setDestinationAccount(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!source || !destination) {
      toast.error("Select both a source and a destination.");
      return;
    }

    if (selfPosting) {
      toast.error("Source and destination can't be the same account or GL.");
      return;
    }

    if (currencyMismatch) {
      toast.error("Source and destination currencies don't match.");
      return;
    }

    if (insufficientBalance) {
      toast.error("Amount exceeds the source's available balance.");
      return;
    }

    if (!remarks.trim()) {
      toast.error("Remarks are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        source_type: type.source,
        source_id: source.id,
        destination_type: type.destination,
        destination_id: destination.id,
        amount,
        remarks: sanitizeRemark(remarks),
      };

      if (transactionType) payload.transaction_type = transactionType;

      const result: any = await createPostingAction(payload);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to create posting.");
        return;
      }

      toast.success(result.message || "Posting created successfully.");

      resetParties();
      setAmount("");
      setTransactionType("");
      setRemarks("");
      setPostingType("customer_to_customer");

      router.push("/postings");
      router.refresh();
    } catch (error) {
      console.error("Failed to create posting:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/postings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Postings
        </Link>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
            <ArrowLeftRight size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Posting</h1>
            <p className="mt-1 text-sm text-slate-600">
              Move money between GL accounts and/or customer accounts — pending approval by a
              second admin before it posts.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <Section title="Posting Type">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {POSTING_TYPES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setPostingType(option.key);
                  resetParties();
                }}
                className={`rounded-xl border-2 p-4 text-left text-sm font-semibold transition ${
                  postingType === option.key
                    ? "border-[#173673] bg-blue-50 text-[#173673]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Source & Destination">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {type.source === "general_ledger" ? (
              <GlPicker label="Source GL" selected={sourceGl} onSelect={setSourceGl} />
            ) : (
              <AccountPicker
                label="Source Account"
                selected={sourceAccount}
                onSelect={setSourceAccount}
              />
            )}

            {type.destination === "general_ledger" ? (
              <GlPicker label="Destination GL" selected={destinationGl} onSelect={setDestinationGl} />
            ) : (
              <AccountPicker
                label="Destination Account"
                selected={destinationAccount}
                onSelect={setDestinationAccount}
              />
            )}
          </div>

          {selfPosting && (
            <p className="text-xs font-semibold text-red-600">
              Source and destination can&apos;t be the same account or GL.
            </p>
          )}

          {!selfPosting && sourceCurrency && destinationCurrency && (
            <p
              className={`text-xs font-semibold ${
                currencyMismatch ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {currencyMismatch
                ? `Currency mismatch: source is ${sourceCurrency}, destination is ${destinationCurrency} — postings must be same-currency.`
                : `Currency: ${sourceCurrency}`}
            </p>
          )}
        </Section>

        <Section title="Amount">
          <Input
            label="Amount"
            type="text"
            inputMode="decimal"
            value={formatAmountDisplay(amount)}
            onChange={(e) => setAmount(parseAmountInput(e.target.value))}
            required
          />
          {insufficientBalance && (
            <p className="text-xs font-semibold text-red-600">
              Amount exceeds the source&apos;s available balance (₦{formatBalance(sourceBalance)}).
            </p>
          )}
        </Section>

        <Section title="Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Transaction Type"
              required={false}
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
            >
              <option value="">—</option>
              {TRANSACTION_TYPES.map((option) => (
                <option key={option} value={option}>
                  {labelize(option)}
                </option>
              ))}
            </Select>

            <label className="block">
              <span className="block font-bold text-sm text-slate-800">Remarks</span>
              <textarea
                required
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(sanitizeRemark(e.target.value))}
                placeholder="Narration for this posting..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
              />
            </label>
          </div>
        </Section>

        <div className="flex justify-end gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/postings"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </Link>
          {isReady && (
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:opacity-50 transition shadow-sm"
            >
              {submitting ? "Please wait..." : "Create Posting"}
            </button>
          )}
        </div>
      </form>
    </>
  );
}

const SEARCH_DEBOUNCE_MS = 300;

// Type 2+ characters of a GL's name or code — it searches server-side as you
// type (debounced), so this scales to however many GLs exist without ever
// loading them all up front.
function GlPicker({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: LookupOption | null;
  onSelect: (gl: LookupOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setQuery(value);
    setResults([]);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const result: any = await getGeneralLedgersAction(1, value.trim());
        setResults(result?.status === "success" ? (result.data ?? []) : []);
      } catch (error) {
        console.error("GL search failed:", error);
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  }

  if (selected) {
    return (
      <div>
        <span className="block font-bold text-sm text-slate-800">{label}</span>
        <div className="mt-2 flex items-start justify-between rounded-xl border border-[#29478f] bg-blue-50 p-3">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {selected.gl_code} — {labelize(selected.name)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              Balance: ₦{formatBalance(selected.balance)} {selected.currency_code}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <div className="relative mt-2">
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search by GL name or code..."
          className="w-full rounded-xl border border-slate-300 bg-white p-3 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
        />
        {loading && (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
          />
        )}
      </div>

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-1.5 text-xs font-semibold text-red-600">No matching GL found.</p>
      )}

      {results.length > 0 && (
        <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2">
          {results.map((gl) => (
            <button
              key={gl.id}
              type="button"
              onClick={() => {
                onSelect(gl);
                setQuery("");
                setResults([]);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 transition"
            >
              <span>
                <span className="font-bold text-slate-900">{gl.gl_code}</span>{" "}
                <span className="text-slate-500">— {labelize(gl.name)}</span>
              </span>
              <span className="text-xs text-slate-500">{gl.currency_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ACCOUNT_NUMBER_LENGTH = 10;

// Type a 10-digit account number — it looks itself up as soon as the last
// digit lands, no search button needed.
function AccountPicker({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: LookupOption | null;
  onSelect: (account: LookupOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function handleLookup(accountNumber: string) {
    setLoading(true);
    setNotFound(false);
    try {
      const result: any = await getAccountsAction(1, accountNumber);
      const match = (result?.data ?? []).find(
        (account: LookupOption) => account.account_number === accountNumber
      );

      if (match) {
        onSelect(match);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error("Account lookup failed:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, ACCOUNT_NUMBER_LENGTH);
    setQuery(digits);
    setNotFound(false);

    if (digits.length === ACCOUNT_NUMBER_LENGTH) {
      handleLookup(digits);
    }
  }

  if (selected) {
    return (
      <div>
        <span className="block font-bold text-sm text-slate-800">{label}</span>
        <div className="mt-2 flex items-start justify-between rounded-xl border border-[#29478f] bg-blue-50 p-3">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {selected.account_number} — {selected.account_name}
            </p>
            <p className="text-xs text-slate-500">
              {selected.customer?.cif_number} • {selected.customer?.full_name}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              Balance: ₦{formatBalance(selected.available_balance)} {selected.currency_code}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <div className="relative mt-2">
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          inputMode="numeric"
          placeholder="Enter 10-digit account number..."
          className="w-full rounded-xl border border-slate-300 bg-white p-3 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
        />
        {loading && (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
          />
        )}
      </div>
      {notFound && !loading && (
        <p className="mt-1.5 text-xs font-semibold text-red-600">No account found with that number.</p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Input({
  label,
  required = true,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <input
        required={required}
        {...rest}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
      />
    </label>
  );
}

function Select({
  label,
  children,
  required = true,
  ...rest
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <select
        required={required}
        {...rest}
        className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
      >
        {children}
      </select>
    </label>
  );
}
