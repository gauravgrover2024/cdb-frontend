import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader,
  ArrowRight,
  Check,
} from "lucide-react";
import { loginWithEmail, loginWithGoogle } from "../../api/firebaseAuth";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Load saved email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithEmail(email, password);

      if (result.success) {
        // Save email if remember me is checked
        if (rememberMe) {
          localStorage.setItem("savedEmail", email);
        } else {
          localStorage.removeItem("savedEmail");
        }

        // Refresh user with timeout to prevent hanging
        try {
          const refreshPromise = refreshUser();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Refresh timeout")), 5000),
          );
          await Promise.race([refreshPromise, timeoutPromise]);
        } catch (refreshErr) {
          console.warn(
            "User refresh failed/timeout, proceeding anyway:",
            refreshErr.message,
          );
          // Don't fail login if refresh times out or fails - token is already valid
        }

        setSuccessMessage("Login successful! Redirecting...");
        setEmail("");
        setPassword("");
        setTimeout(() => navigate("/"), 800);
      }
    } catch (err) {
      // Check for pending account first
      if (err.isPending || err.status === 403) {
        setError(
          "⏳ Your account is pending approval. The administrator will review your account soon. Please check back later.",
        );
      } else {
        const errorMessage =
          err.code === "auth/user-not-found"
            ? "No account found with this email. Please sign up."
            : err.code === "auth/wrong-password"
              ? "Incorrect password. Please try again."
              : err.code === "auth/invalid-email"
                ? "Invalid email format."
                : err.code === "auth/invalid-api-key"
                  ? "Configuration error. Please contact support."
                  : err.code === "auth/too-many-requests"
                    ? "Too many login attempts. Please try later."
                    : err.message || "Login failed. Please try again.";

        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const result = await loginWithGoogle();

      if (result.success) {
        localStorage.removeItem("savedEmail");

        // Refresh user with timeout to prevent hanging
        try {
          const refreshPromise = refreshUser();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Refresh timeout")), 5000),
          );
          await Promise.race([refreshPromise, timeoutPromise]);
        } catch (refreshErr) {
          console.warn(
            "User refresh failed/timeout, proceeding anyway:",
            refreshErr.message,
          );
          // Don't fail login if refresh times out or fails - token is already valid
        }

        setSuccessMessage("Google login successful! Redirecting...");
        setTimeout(() => navigate("/"), 800);
      }
    } catch (err) {
      // Check for pending account first
      if (err.isPending || err.status === 403) {
        setError(
          "⏳ Your account is pending approval. The administrator will review your account soon. Please check back later.",
        );
      } else {
        const errorMessage =
          err.code === "auth/popup-closed-by-user"
            ? "Login cancelled."
            : err.code === "auth/cancelled-popup-request"
              ? "Please try again."
              : err.message || "Google login failed. Please try again.";
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-soft {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-slide-in-left {
          animation: slideInLeft 0.6s ease-out 0.2s backwards;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.6s ease-out 0.2s backwards;
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }

        .input-focus {
          @apply focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10;
        }

        .transition-smooth {
          @apply transition-all duration-300 ease-out;
        }
      `}</style>

      {loading && <LoadingSpinner fullPage text="Signing you in..." />}

      {/* Left Side - Branding (Hidden on mobile) */}
      <section
        aria-label="Brand and product overview"
        className="w-full lg:w-[45%] min-h-[40vh] lg:min-h-screen flex flex-col bg-slate-950 relative overflow-hidden animate-slide-in-left"
      >
        {/* Animated Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.25),transparent_70%)]"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse mix-blend-screen"></div>
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse mix-blend-screen"
          style={{ animationDelay: "1s" }}
        ></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30 mix-blend-overlay"></div>

        <div className="relative z-10 flex flex-col flex-1 p-6 sm:p-8 lg:p-10 lg:py-8 overflow-y-auto">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="h-9 w-auto font-black text-2xl text-white hover:text-indigo-300 transition-smooth cursor-pointer">
              AutoCredits
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-center mt-12 lg:mt-0">
            <div className="space-y-4 max-w-md">
              <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/30 to-purple-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-indigo-400/50 transition-smooth">
                ✨ Financial Gateway
              </span>

              <h1 className="text-3xl sm:text-4xl font-black text-white leading-[1.1] tracking-tight">
                Automotive{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Finance.
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                Seamless loan management, vehicle financing, and customer
                relations — all in one platform.
              </p>
            </div>

            {/* Features */}
            <ul className="mt-8 space-y-3">
              {[
                {
                  icon: "⚡",
                  title: "Real-time processing",
                  desc: "Instant approvals & updates",
                },
                {
                  icon: "👥",
                  title: "Multi-role support",
                  desc: "Admin, Staff & Superadmin access",
                },
                {
                  icon: "🔒",
                  title: "Enterprise security",
                  desc: "Advanced data encryption",
                },
              ].map((feature, i) => (
                <li
                  key={i}
                  className="flex items-center p-3 gap-4 group cursor-pointer rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-indigo-400/30 hover:shadow-[0_8px_32px_rgba(99,102,241,0.15)] transition-all duration-500 ease-out transform hover:-translate-y-1"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 group-hover:from-indigo-500/20 group-hover:to-purple-500/20 group-hover:border-indigo-400/50 text-lg shadow-lg transition-all duration-500">
                    {feature.icon}
                  </span>
                  <div>
                    <span className="text-white font-semibold text-sm group-hover:text-indigo-300 transition-smooth">
                      {feature.title}
                    </span>
                    <span className="text-slate-400 text-xs ml-1.5">
                      — {feature.desc}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 pt-8 border-t border-white/5 flex items-center justify-between text-slate-500 text-[10px] font-medium uppercase tracking-widest">
            <span>🔐 Secure Access</span>
            <span>v1.0 Beta</span>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div
        aria-hidden="true"
        className="hidden lg:block w-px min-h-screen bg-gradient-to-b from-transparent via-slate-300 via-50% to-transparent shrink-0"
      ></div>

      {/* Right Side - Login Form */}
      <section
        aria-label="Sign in"
        className="w-full lg:w-[55%] min-h-[60vh] lg:min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6 sm:p-8 lg:p-12 relative overflow-hidden animate-slide-in-right"
      >
        {/* Soft Ambient Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-6 left-6 z-20">
          <div className="h-7 font-black text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            AC
          </div>
        </div>

        {/* Glassmorphic Form Container */}
        <div className="w-full max-w-[420px] z-10 bg-white/70 backdrop-blur-2xl p-6 sm:p-8 rounded-[2rem] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative my-auto">
          {/* Header */}
          <div className="mb-6 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Sign in
            </h2>
            <p className="text-slate-500 font-medium mt-2 text-sm">
              Welcome back! Enter your credentials to access your dashboard.
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex gap-3 animate-fade-in">
              <Check
                size={18}
                className="text-emerald-600 flex-shrink-0 mt-0.5"
              />
              <p className="text-sm text-emerald-700 font-medium">
                {successMessage}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex gap-3 animate-fade-in">
              <AlertCircle
                size={18}
                className="text-red-600 flex-shrink-0 mt-0.5"
              />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email Input */}
            <div className="group">
              <label
                htmlFor="email"
                className={`text-[11px] font-bold uppercase tracking-widest transition-smooth ${
                  focusedField === "email" || email
                    ? "text-indigo-600"
                    : "text-slate-400"
                } ml-1`}
              >
                Email Address
              </label>
              <div className="relative mt-2">
                <Mail
                  className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-smooth ${
                    focusedField === "email"
                      ? "text-indigo-500 scale-110"
                      : "text-slate-300"
                  }`}
                />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  className="w-full h-12 pl-12 pr-4 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-200/60 rounded-xl input-focus outline-none transition-smooth font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-50 hover:border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="group">
              <div className="flex justify-between items-center ml-1">
                <label
                  htmlFor="password"
                  className={`text-[11px] font-bold uppercase tracking-widest transition-smooth ${
                    focusedField === "password" || password
                      ? "text-indigo-600"
                      : "text-slate-400"
                  }`}
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-600 transition-smooth hover:underline"
                >
                  Forgot?
                </a>
              </div>
              <div className="relative mt-2">
                <Lock
                  className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-smooth ${
                    focusedField === "password"
                      ? "text-indigo-500 scale-110"
                      : "text-slate-300"
                  }`}
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  className="w-full h-12 pl-12 pr-12 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-200/60 rounded-xl input-focus outline-none transition-smooth font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-50 hover:border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-smooth disabled:opacity-50 hover:scale-110"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-3 pt-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded cursor-pointer accent-indigo-500"
              />
              <label
                htmlFor="remember"
                className="text-sm text-slate-600 cursor-pointer font-medium hover:text-slate-800 transition-smooth"
              >
                Remember me
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="group inline-flex items-center justify-center gap-2 whitespace-nowrap w-full h-12 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-[length:200%_auto] hover:bg-right text-white rounded-xl font-bold text-sm tracking-wide shadow-[0_8px_20px_-6px_rgba(99,102,241,0.6)] hover:shadow-[0_12px_24px_-8px_rgba(99,102,241,0.8)] transition-all duration-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-smooth"
                    />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            <span className="text-xs text-slate-400 font-semibold px-3">
              OR
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="group w-full h-12 bg-white/80 hover:bg-white border-2 border-slate-200/80 hover:border-slate-300 text-slate-800 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] backdrop-blur-sm"
          >
            <svg
              className="w-5 h-5 group-hover:scale-110 transition-smooth"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="h-px bg-slate-200"></div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[10px] text-slate-400 font-medium leading-relaxed">
            By signing in you agree to our{" "}
            <a
              href="#"
              className="text-indigo-500 hover:underline transition-smooth"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="text-indigo-500 hover:underline transition-smooth"
            >
              Terms of Service
            </a>
            .
          </p>
        </div>

        {/* Mobile Footer */}
        <p className="mt-auto pt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest lg:hidden">
          AutoCredits © 2026
        </p>
      </section>
    </div>
  );
};

export default LoginPage;
