import { pageMeta } from "@/lib/route-meta";
import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { queue } from "@/components/ui/Toast";
import { authApi, getStoredUser, persistUser } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => pageMeta('Sign in', 'Sign in to your Esportific organizer account.'),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = getStoredUser();
    const token = localStorage.getItem("token") || user?.token;
    if (token || user) throw redirect({ to: user?.role === "admin" ? "/admin" : "/" });
  },
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        { title: "Error", description: "Please enter both email and password.", variant: "error" },
        { timeout: 3000 },
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      queue.add(
        {
          title: "Validation Error",
          description: "Please enter a valid email address.",
          variant: "error",
        },
        { timeout: 3000 },
      );
      return;
    }

    setIsLoading(true);

    try {
      const data = await authApi.login({ email, password });
      if (data.role !== "organizer") {
        throw new Error("Use the admin login page for admin access.");
      }
      persistUser(data);

      queue.add(
        {
          title: "Welcome back!",
          description: `Logged in successfully as ${data.name}.`,
          variant: "success",
        },
        { timeout: 3000 },
      );

      navigate({ to: "/" });
    } catch (error) {
      console.error(error);
      queue.add(
        {
          title: "Authentication Failed",
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
    <div className="flex h-screen w-screen bg-white text-zinc-950 overflow-hidden select-none">
      {/* LEFT COLUMN - STRICT 50% WIDTH, FULL HEIGHT, CENTERING FORM */}
      <div className="flex w-full lg:w-1/2 h-full flex-col justify-center p-8 md:p-12 xl:p-16">
        {/* Form Area - perfectly centered inside remaining space, strictly non-scrollable */}
        <div className="w-full max-w-[400px] mx-auto shrink-0">
          <div className="text-left mb-6">
            <h1 className="text-[28px] font-bold text-zinc-950 tracking-tight leading-tight">
              Log In
            </h1>
            <p className="text-[12px] text-zinc-500 mt-1.5">
              Enter your email and password to access your account.
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-zinc-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sellostore@company.com"
                required
                className="h-[42px] w-full rounded-[10px] border border-zinc-200 bg-white px-3.5 text-[13.5px] text-zinc-955 outline-none transition-all placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-zinc-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-[42px] w-full rounded-[10px] border border-zinc-200 bg-white pl-3.5 pr-12 text-[13.5px] text-zinc-955 outline-none transition-all placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sessions stay active until the user explicitly logs out. */}
            <div className="flex justify-end text-[12.5px] pt-0.5">
              <a href="#" className="font-semibold text-black hover:underline">
                Forgot Your Password?
              </a>
            </div>

            {/* Submit Log In */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-[42px] w-full items-center justify-center rounded-[10px] bg-black text-[13.5px] font-bold text-white shadow-sm hover:bg-zinc-900 transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed mt-5 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Log In"
              )}
            </button>
          </form>

          {/* Register Redirect */}
          <div className="text-center mt-6">
            <p className="text-[12.5px] text-zinc-500">
              Don't Have An Account?{" "}
              <Link to="/signup" className="font-bold text-black hover:underline">
                Register Now.
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - STRICT 50% WIDTH, FULL HEIGHT IMAGE PLACEHOLDER (NO SCROLL, Swappable) */}
      <div className="hidden lg:block w-1/2 h-full overflow-hidden shrink-0 bg-zinc-900 relative">
        <img
          src="/Login/Image.png"
          alt="Esports Tournament Presentation"
          className="w-full h-full object-cover object-bottom select-none pointer-events-none"
        />
        {/* Premium Brand Logo Overlay */}
        <div className="absolute top-8 right-8 z-10">
          <img
            src="/Brand/new-logo.png"
            alt="Rangrove Logo"
            className="h-8 w-auto object-contain select-none pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
