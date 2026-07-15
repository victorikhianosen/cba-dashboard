"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-toastify";
import { loginAction } from "@/actions/auth.action";

// 1. Define the validation schema with Zod
const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long"),
});

// Infer the form values type from the schema
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 2. Set up React Hook Form with Zod resolver
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
  setLoading(true);

  try {
    const response = await loginAction(data);

    if (
      response?.status === "success" &&
      response?.data?.two_factor_token
    ) {
      const twoFactorData = {
        requires_setup: response.data.requires_setup,
        qr_code: response.data.qr_code,
        secret: response.data.secret,
        two_factor_token: response.data.two_factor_token,
      };

      sessionStorage.setItem(
        "two_factor_data",
        JSON.stringify(twoFactorData)
      );

      toast.success(
        response.message || "Password verified successfully."
      );

      router.push("/verify-2fa");
      return;
    }

    toast.error(
      response?.message ||
        "Invalid credentials. Please try again."
    );
  } catch (error) {
    console.error("Login error:", error);

    toast.error(
      "A network error occurred. Please try again."
    );
  } finally {
    setLoading(false);
  }
}

  return (
    <>
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
        {/* LEFT PANEL */}
        <div
          className="
            hidden md:flex relative flex-col justify-between
            text-white p-10 bg-[#0b1426]
          "
        >
          {/* DARK BLUE OVERLAY */}
          <div className="absolute inset-0 bg-[#0b1426]/80" />

          {/* CONTENT */}
          <div className="relative z-10">
            <div className="text-sm font-medium tracking-wide opacity-80 uppercase">
              Corebanking Platform
            </div>

            <h2 className="mt-6 text-3xl font-semibold leading-tight">
              Centralize operations, drive efficiency, <br />
              and ensure control.
            </h2>

            <p className="mt-4 text-sm opacity-80 max-w-md">
              A modular, scalable, cloud-native platform to manage core accounts,
              global ledgers, and secure transactions with enterprise-grade data handling.
            </p>
          </div>

          <p className="relative z-10 text-xs opacity-60">
            © {new Date().getFullYear()} BankPro • Corebanking Platform
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex items-center justify-center bg-[#f5f7fb] px-4">
          <div className="w-full max-w-md">
            {/* MANUAL LOGO IMAGE */}
            <div className="text-center mb-8">
              <img
                src="/logo.png"
                alt="BanQ Pro Logo"
                className="mx-auto h-[150px] w-auto object-contain"
              />

              <p className="mt-4 text-sm text-slate-500">
                Sign in to your corebanking dashboard
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* USERNAME */}
              <div>
                <label className="text-lg font-medium text-slate-700">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="admin@rex.com"
                  {...register("username")}
                  className="mt-1 w-full rounded-lg border text-black border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#101d3d]"
                />

                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* PASSWORD */}
              <div>
                <label className="text-lg font-medium text-slate-700">
                  Password
                </label>

                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    className="w-full pr-12 text-black rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#101d3d]"
                  />

                  {/* MODERN EYE ICON TOGGLE */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 transition-colors" />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full cursor-pointer rounded-xl bg-[#101d3d] py-5 text-lg font-semibold mt-6 text-white hover:bg-[#0c1630] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? "Authenticating..." : "Login"}
              </button>
            </form>

            {/* FOOTER TEXT */}
            <p className="mt-6 text-center text-xs text-slate-500 cursor-pointer">
              Secure • Compliant • Reliable
            </p>
          </div>
        </div>
      </div>
    </>
  );
}