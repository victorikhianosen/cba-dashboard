"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ShieldCheck, Copy } from "lucide-react";
import { verifyTwoFactorAction } from "@/actions/auth.action";

interface TwoFactorData {
  requires_setup: boolean;
  qr_code: string | null;
  secret: string | null;
  two_factor_token: string;
}

export default function VerifyTwoFactorPage() {
  const router = useRouter();

  const [twoFactorData, setTwoFactorData] =
    useState<TwoFactorData | null>(null);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const storedData = sessionStorage.getItem(
      "two_factor_data"
    );

    if (!storedData) {
      toast.error(
        "Your verification session has expired. Please log in again."
      );

      router.replace("/login");
      return;
    }

    try {
      const parsedData: TwoFactorData =
        JSON.parse(storedData);

      if (!parsedData.two_factor_token) {
        throw new Error("Two-factor token is missing.");
      }

      setTwoFactorData(parsedData);
    } catch (error) {
      console.error(
        "Unable to read two-factor data:",
        error
      );

      sessionStorage.removeItem("two_factor_data");

      toast.error(
        "Invalid verification session. Please log in again."
      );

      router.replace("/login");
    } finally {
      setPageLoading(false);
    }
  }, [router]);

  async function handleVerify(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!twoFactorData) {
      return;
    }

    if (code.length !== 6) {
      toast.error(
        "Enter the 6-digit code from Google Authenticator."
      );

      return;
    }

    setLoading(true);

    try {
      const response = await verifyTwoFactorAction({
        code,
        two_factor_token:
          twoFactorData.two_factor_token,
      });

      if (
        response?.status === "success" &&
        response?.responseCode === "000"
      ) {
        // Remove temporary 2FA information
        sessionStorage.removeItem("two_factor_data");

        toast.success(
          response.message || "Login successful."
        );

        router.replace("/dashboard");
        return;
      }

      toast.error(
        response?.message ||
          "The verification code is invalid."
      );
    } catch (error) {
      console.error(
        "Two-factor verification error:",
        error
      );

      toast.error(
        "Unable to verify the code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copySecret() {
    if (!twoFactorData?.secret) {
      return;
    }

    await navigator.clipboard.writeText(
      twoFactorData.secret
    );

    toast.success("Secret key copied.");
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="flex items-center gap-3 text-slate-600">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#101d3d]" />

          Loading verification...
        </div>
      </div>
    );
  }

  if (!twoFactorData) {
    return null;
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* LEFT PANEL */}
      <div className="relative hidden flex-col justify-between bg-[#0b1426] p-10 text-white md:flex">
        <div className="absolute inset-0 bg-[#0b1426]/80" />

        <div className="relative z-10">
          <div className="text-sm font-medium uppercase tracking-wide opacity-80">
            Corebanking Platform
          </div>

          <h2 className="mt-6 text-3xl font-semibold leading-tight">
            Secure access to your
            <br />
            core banking platform.
          </h2>

          <p className="mt-4 max-w-md text-sm opacity-80">
            Two-factor authentication provides an
            additional layer of protection for your
            account and financial operations.
          </p>
        </div>

        <p className="relative z-10 text-xs opacity-60">
          © {new Date().getFullYear()} BankPro •
          Corebanking Platform
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex h-screen items-center justify-center overflow-y-auto bg-[#f5f7fb] px-4 py-4">
        <div className="w-full max-w-md">
          {/* LOGO */}
          <div className="mb-3 text-center">
            <img
              src="/logo.png"
              alt="BanQ Pro Logo"
              className="mx-auto h-16 w-auto object-contain"
            />

            <div className="mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#101d3d]/10">
              <ShieldCheck className="h-5 w-5 text-[#101d3d]" />
            </div>

            <h1 className="mt-2 text-lg font-semibold text-slate-800">
              {twoFactorData.requires_setup
                ? "Set Up Two-Factor Authentication"
                : "Two-Factor Authentication"}
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              {twoFactorData.requires_setup
                ? "Scan the QR code with Google Authenticator, then enter the generated code."
                : "Enter the verification code from your Google Authenticator app."}
            </p>
          </div>

          {/* QR CODE: FIRST LOGIN ONLY */}
          {twoFactorData.requires_setup &&
            twoFactorData.qr_code && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-center text-xs font-medium text-slate-700">
                  Scan this QR code
                </p>

                <div className="flex justify-center">
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <img
                      src={twoFactorData.qr_code}
                      alt="Google Authenticator QR Code"
                      className="h-30 w-30"
                    />
                  </div>
                </div>

                {/* SECRET */}
                {twoFactorData.secret && (
                  <div className="mt-2">
                    <p className="text-center text-[11px] text-slate-500">
                      Unable to scan? Enter this key
                      manually:
                    </p>

                    <div className="mt-1 flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-2">
                      <code className="flex-1 break-all text-center text-xs font-semibold tracking-wider text-slate-700">
                        {twoFactorData.secret}
                      </code>

                      <button
                        type="button"
                        onClick={copySecret}
                        title="Copy secret key"
                        className="rounded-md p-1.5 text-slate-500 transition hover:bg-white hover:text-[#101d3d]"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* VERIFICATION FORM */}
          <form
            onSubmit={handleVerify}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <label
              htmlFor="verification-code"
              className="text-sm font-medium text-slate-700"
            >
              Verification Code
            </label>

            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => {
                const value =
                  event.target.value.replace(
                    /\D/g,
                    ""
                  );

                setCode(value);
              }}
              placeholder="000000"
              autoFocus
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-xl font-semibold tracking-[0.5em] text-slate-800 outline-none transition focus:border-[#101d3d] focus:ring-1 focus:ring-[#101d3d]"
            />

            <p className="mt-1 text-center text-[11px] text-slate-500">
              Enter the current 6-digit code from
              Google Authenticator.
            </p>

            <button
              type="submit"
              disabled={
                loading ||
                code.length !== 6
              }
              className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#101d3d] py-2.5 text-base font-semibold text-white transition hover:bg-[#0c1630] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}

              {loading
                ? "Verifying..."
                : twoFactorData.requires_setup
                  ? "Complete Setup"
                  : "Verify and Login"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                sessionStorage.removeItem(
                  "two_factor_data"
                );

                router.replace("/login");
              }}
              className="mt-2 w-full cursor-pointer text-xs font-medium text-slate-500 transition hover:text-[#101d3d]"
            >
              Return to login
            </button>
          </form>

          <p className="mt-3 text-center text-[11px] text-slate-500">
            Secure • Compliant • Reliable
          </p>
        </div>
      </div>
    </div>
  );
}