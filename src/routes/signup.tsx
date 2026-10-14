import { pageMeta } from "@/lib/route-meta";
import { useState, useEffect } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { queue } from "@/components/ui/Toast";
import { authApi, getStoredUser, persistUser } from "@/lib/api";

export const Route = createFileRoute("/signup")({
  head: () => pageMeta('Create account', 'Create an Esportific account to organize esports tournaments.'),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = getStoredUser();
    const token = localStorage.getItem("token") || user?.token;
    if (token || user) throw redirect({ to: user?.role === "admin" ? "/admin" : "/" });
  },
  component: Signup,
});

function Signup() {
  // Signup state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verification states
  const [showVerification, setShowVerification] = useState(false);
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const user = getStoredUser();
    const token = localStorage.getItem("token") || user?.token;
    if (token || user) {
      navigate({ to: user?.role === "admin" ? "/admin" : "/", replace: true });
    }
  }, [navigate]);

  // Resend code countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const getPasswordStrength = (pass: string) => {
    if (!pass)
      return { score: 0, label: "", colorClass: "bg-transparent", textClass: "text-zinc-400" };

    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;

    const hasNumbers = /\d/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    const hasMixed = /[A-Z]/.test(pass) && /[a-z]/.test(pass);

    if (hasNumbers || hasSpecial || hasMixed) {
      if (pass.length >= 8) score += 1;
    }

    const finalScore = Math.min(score, 3);

    if (finalScore === 1) {
      return {
        score: 1,
        label: "Weak",
        colorClass: "bg-rose-500 w-1/3",
        textClass: "text-rose-500",
      };
    } else if (finalScore === 2) {
      return {
        score: 2,
        label: "Medium",
        colorClass: "bg-amber-500 w-2/3",
        textClass: "text-amber-600",
      };
    } else if (finalScore === 3) {
      return {
        score: 3,
        label: "Strong",
        colorClass: "bg-emerald-500 w-full",
        textClass: "text-emerald-600 font-semibold",
      };
    }

    return {
      score: 1,
      label: "Too Short",
      colorClass: "bg-rose-500 w-1/3",
      textClass: "text-rose-500",
    };
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      queue.add(
        { title: "Error", description: "Please populate all fields.", variant: "error" },
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

    if (password.length < 6) {
      queue.add(
        {
          title: "Validation Error",
          description: "Password must be at least 6 characters.",
          variant: "error",
        },
        { timeout: 3000 },
      );
      return;
    }

    setIsLoading(true);

    // Call actual backend API to send email verification code
    try {
      await authApi.sendOtp(email);
      queue.add(
        {
          title: "Verification Code Sent",
          description: `A 6-digit code has been sent to ${email}.`,
          variant: "success",
        },
        { timeout: 3500 },
      );

      setShowVerification(true);
      setResendTimer(30);
      setOtp(new Array(6).fill(""));
    } catch (err) {
      console.error(err);
      queue.add(
        {
          title: "Error",
          description:
            err instanceof Error ? err.message : "Could not connect to the verification server.",
          variant: "error",
        },
        { timeout: 3000 },
      );
    } finally {
      setIsLoading(false);
    }
  };

  // OTP focus shifting logic
  const handleOtpChange = (value: string, index: number) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          const newOtp = [...otp];
          newOtp[index - 1] = "";
          setOtp(newOtp);
        }
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim();

    if (!/^\d+$/.test(pastedText)) return;

    const digits = pastedText.split("").slice(0, 6);
    const newOtp = [...otp];

    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });

    setOtp(newOtp);

    const focusIndex = Math.min(digits.length - 1, 5);
    const lastInput = document.getElementById(`otp-${focusIndex}`) as HTMLInputElement;
    if (lastInput) {
      lastInput.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");

    if (code.length !== 6) {
      queue.add(
        {
          title: "Invalid Code",
          description: "Please enter the full 6-digit code.",
          variant: "error",
        },
        { timeout: 3000 },
      );
      return;
    }

    setIsVerifying(true);

    try {
      // Complete registration with backend API now that code is verified!
      const data = await authApi.register({ name, email, password, otp: code });
      persistUser(data);

      queue.add(
        {
          title: "Account Verified & Created!",
          description: `Welcome ${data.name}! Your workspace is ready.`,
          variant: "success",
        },
        { timeout: 3000 },
      );

      navigate({ to: "/" });
    } catch (error) {
      console.error(error);
      queue.add(
        {
          title: "Incorrect Code",
          description:
            error instanceof Error
              ? error.message
              : "Could not connect to the registration server.",
          variant: "error",
        },
        { timeout: 3000 },
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await authApi.sendOtp(email);
      setResendTimer(30);
      queue.add(
        {
          title: "Verification Code Sent",
          description: `A new 6-digit code has been sent to ${email}.`,
          variant: "success",
        },
        { timeout: 3000 },
      );
    } catch (err) {
      console.error(err);
      queue.add(
        {
          title: "Error",
          description:
            err instanceof Error ? err.message : "Could not connect to the verification server.",
          variant: "error",
        },
        { timeout: 3000 },
      );
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white text-zinc-955 text-zinc-950 overflow-hidden select-none">
      {/* LEFT COLUMN - STRICT 50% WIDTH, FULL HEIGHT, CENTERING FORM */}
      <div className="flex w-full lg:w-1/2 h-full flex-col justify-center p-8 md:p-12 xl:p-16">
        {/* Dynamic Verification Screen / Standard Sign Up Form */}
        {showVerification ? (
          <div className="w-full max-w-[400px] mx-auto shrink-0">
            <button
              type="button"
              onClick={() => setShowVerification(false)}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-500 hover:text-black mb-6 group cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to Sign Up
            </button>

            <div className="text-left mb-6">
              <h1 className="text-[28px] font-bold text-zinc-955 text-zinc-950 tracking-tight leading-tight">
                Verify Email
              </h1>
              <p className="text-[12.5px] text-zinc-500 mt-2 leading-relaxed">
                We sent a 6-digit verification code to{" "}
                <span className="font-semibold text-zinc-900">{email}</span>. Enter the code to
                activate your account.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} noValidate className="space-y-6">
              <div className="flex justify-between gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onPaste={handleOtpPaste}
                    className="w-[48px] h-[52px] rounded-[10px] border border-zinc-200 bg-white text-center text-[20px] font-bold text-zinc-955 text-zinc-950 outline-none transition-all focus:border-black focus:ring-1 focus:ring-black focus:bg-zinc-50/50"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isVerifying || otp.some((d) => !d)}
                className="flex h-[42px] w-full items-center justify-center rounded-[10px] bg-black text-[13.5px] font-bold text-white shadow-sm hover:bg-zinc-900 transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed cursor-pointer"
              >
                {isVerifying ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Verify & Create Account"
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <p className="text-[12.5px] text-zinc-500">
                Didn't receive the code?{" "}
                {resendTimer > 0 ? (
                  <span className="font-medium text-zinc-400">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="font-bold text-black hover:underline cursor-pointer"
                  >
                    Resend Code
                  </button>
                )}
              </p>
            </div>
          </div>
        ) : (
          /* Form Area - centered, tight padding for perfect non-scroll layout */
          <div className="w-full max-w-[400px] mx-auto shrink-0">
            <div className="text-left mb-5">
              <h1 className="text-[28px] font-bold text-zinc-950 tracking-tight leading-tight">
                Sign Up
              </h1>
              <p className="text-[12px] text-zinc-500 mt-1.5">
                Get your unique organizer ID instantly and host premium tournaments.
              </p>
            </div>

            <form onSubmit={handleSignup} noValidate className="space-y-3.5">
              {/* Full Name Input */}
              <div>
                <label className="mb-1 block text-[12.5px] font-medium text-zinc-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  required
                  className="h-[40px] w-full rounded-[10px] border border-zinc-200 bg-white px-3.5 text-[13.5px] text-zinc-955 outline-none transition-all placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Email Input */}
              <div>
                <label className="mb-1 block text-[12.5px] font-medium text-zinc-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  required
                  className="h-[40px] w-full rounded-[10px] border border-zinc-200 bg-white px-3.5 text-[13.5px] text-zinc-955 outline-none transition-all placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="mb-1 block text-[12.5px] font-medium text-zinc-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a strong password"
                    required
                    className="h-[40px] w-full rounded-[10px] border border-zinc-200 bg-white pl-3.5 pr-12 text-[13.5px] text-zinc-955 outline-none transition-all placeholder:text-zinc-400 focus:border-black focus:ring-1 focus:ring-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-955 outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Dynamic Sliding Password Strength Bar */}
                <div
                  className={`transition-all duration-300 ease-out overflow-hidden ${
                    password.length > 0
                      ? "max-h-[45px] opacity-100 mt-2"
                      : "max-h-0 opacity-0 mt-0 pointer-events-none"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-zinc-500">Password Strength</span>
                    <span
                      className={`font-semibold transition-colors duration-200 ${getPasswordStrength(password).textClass}`}
                    >
                      {getPasswordStrength(password).label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-350 ease-out ${getPasswordStrength(password).colorClass}`}
                    />
                  </div>
                </div>
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-[40px] w-full items-center justify-center rounded-[10px] bg-black text-[13.5px] font-bold text-white shadow-sm hover:bg-zinc-900 transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed mt-4 cursor-pointer"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Sign Up"
                )}
              </button>
            </form>

            {/* Terms & Conditions Note */}
            <p className="text-[11px] text-zinc-400 mt-3 text-center leading-normal">
              By creating an account, you agree to our{" "}
              <a href="#" className="font-semibold text-black hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="font-semibold text-black hover:underline">
                Privacy Policy
              </a>
              .
            </p>

            {/* Social Sep */}
            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-150" />
              </div>
              <span className="relative bg-white px-4 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Or Register With
              </span>
            </div>

            {/* Social Signups - Google Only & Full Width */}
            <div className="w-full">
              <button
                type="button"
                className="flex h-[40px] w-full items-center justify-center gap-2.5 rounded-[10px] border border-zinc-200 bg-white text-[13.5px] font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                Sign up with Google
              </button>
            </div>

            {/* Login Redirect */}
            <div className="text-center mt-5">
              <p className="text-[12.5px] text-zinc-500">
                Already have an organizer account?{" "}
                <Link to="/login" className="font-bold text-black hover:underline">
                  Sign In.
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN - STRICT 50% WIDTH, FULL HEIGHT IMAGE PLACEHOLDER (NO SCROLL, Swappable) */}
      <div className="hidden lg:block w-1/2 h-full overflow-hidden shrink-0 bg-zinc-900 relative">
        <img
          src="/Sign up/Image.png"
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
