import { pageMeta } from "@/lib/route-meta";
import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { queue } from "@/components/ui/Toast";
import { authApi, getStoredUser, persistUser } from "@/lib/api";

export const Route = createFileRoute("/admin/login")({
  head: () => pageMeta('Admin sign in', 'Sign in to the Esportific administration console.'),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = getStoredUser();
    const token = localStorage.getItem("token") || user?.token;
    if (token || user) throw redirect({ to: user?.role === "admin" ? "/admin" : "/" });
  },
  component: AdminLogin,
});

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = getStoredUser();
    const token = localStorage.getItem("token") || user?.token;
    if (token || user) {
      navigate({ to: user?.role === "admin" ? "/admin" : "/", replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      queue.add(
        {
          title: "Error",
          description: "Please enter both admin ID and password.",
          variant: "error",
        },
        { timeout: 3000 },
      );
      return;
    }

    setIsLoading(true);

    try {
      const data = await authApi.adminLogin({ email, password });
      persistUser(data);

      queue.add(
        {
          title: "Admin access granted",
          description: `Logged in successfully as ${data.name}.`,
          variant: "success",
        },
        { timeout: 3000 },
      );

      navigate({ to: "/admin" });
    } catch (error) {
      queue.add(
        {
          title: "Admin Authentication Failed",
          description:
            error instanceof Error
              ? error.message
              : "Could not connect to the authentication server.",
          variant: "error",
        },
        { timeout: 3000 },
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-zinc-950 select-none">
      <div className="flex h-[38px] shrink-0 items-center justify-center border-b border-[#eab308] bg-[#ffd400] px-4 text-center text-[13px] font-semibold text-[#111111]">
        You are entering the administrative environment.
      </div>

      <div className="flex min-h-0 flex-1 bg-white">
        <div className="flex h-full w-full flex-col justify-center p-8 md:p-12 lg:w-1/2 xl:p-16">
          <div className="mx-auto w-full max-w-[400px] shrink-0">
            <div className="mb-6 text-left">
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-zinc-950">
                Admin Log In
              </h1>
              <p className="mt-1.5 text-[12px] text-zinc-500">
                Enter your admin ID and password to access the admin panel.
              </p>
            </div>

            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-zinc-700">
                  Admin ID
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                  className="h-[42px] w-full rounded-[10px] border border-zinc-200 bg-white px-3.5 text-[13.5px] text-zinc-950 outline-none transition-all placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-zinc-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-[42px] w-full rounded-[10px] border border-zinc-200 bg-white pl-3.5 pr-12 text-[13.5px] text-zinc-950 outline-none transition-all placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 outline-none hover:text-zinc-900"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5 text-[12.5px]">
                <label className="flex cursor-pointer items-center gap-2 text-zinc-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-black focus:ring-black"
                  />
                  Remember Me
                </label>
                <a href="#" className="font-semibold text-black hover:underline">
                  Forgot Your Password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-5 flex h-[42px] w-full cursor-pointer items-center justify-center rounded-[10px] bg-black text-[13.5px] font-bold text-white shadow-sm transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Log In"
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="relative hidden h-full w-1/2 shrink-0 overflow-hidden bg-zinc-900 lg:block">
          <img
            src="/Login/Image.png"
            alt="Esports Tournament Presentation"
            className="h-full w-full select-none object-cover object-bottom pointer-events-none"
          />
          <div className="absolute right-8 top-8 z-10">
            <img
              src="/Brand/new-logo.png"
              alt="Rangrove Logo"
              className="h-8 w-auto select-none object-contain pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
