import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader,
  Check,
  ChevronRight,
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
        if (rememberMe) {
          localStorage.setItem("savedEmail", email);
        } else {
          localStorage.removeItem("savedEmail");
        }

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
        }

        setSuccessMessage("Login successful! Redirecting...");
        setEmail("");
        setPassword("");
        setTimeout(() => navigate("/"), 800);
      }
    } catch (err) {
      if (err.isPending || err.status === 403) {
        setError(
          "Your account is pending approval. The administrator will review your account soon.",
        );
      } else {
        const errorMessage =
          err.code === "auth/user-not-found"
            ? "No account found with this email."
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
        }

        setSuccessMessage("Google login successful! Redirecting...");
        setTimeout(() => navigate("/"), 800);
      }
    } catch (err) {
      if (err.isPending || err.status === 403) {
        setError(
          "Your account is pending approval. The administrator will review your account soon.",
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
    <div className="min-h-screen flex font-sans antialiased">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .anim-fade-up   { animation: fadeUp  0.55s cubic-bezier(.22,.68,0,1.2) both; }
        .anim-fade-in   { animation: fadeIn  0.4s ease both; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-150 { animation-delay: 0.15s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-250 { animation-delay: 0.25s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-350 { animation-delay: 0.35s; }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #f59e0b 0%,
            #fbbf24 30%,
            #fffbeb 50%,
            #fbbf24 70%,
            #f59e0b 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .ring-spin {
          animation: rotateSlow 18s linear infinite;
        }
        .input-field {
          width: 100%;
          height: 48px;
          padding: 0 16px 0 44px;
          background: #1e293b;
          border: 1.5px solid #334155;
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .input-field::placeholder { color: #475569; }
        .input-field:hover  { border-color: #475569; background: #243042; }
        .input-field:focus  { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.12); background: #243042; }
        .input-field:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary {
          width: 100%;
          height: 48px;
          border-radius: 10px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #0f172a;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.02em;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 20px rgba(245,158,11,0.35);
          transition: all 0.2s;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(245,158,11,0.5);
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-google {
          width: 100%;
          height: 44px;
          border-radius: 10px;
          background: transparent;
          border: 1.5px solid #334155;
          color: #cbd5e1;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
        }
        .btn-google:hover:not(:disabled) {
          border-color: #475569;
          background: #1e293b;
          color: #f1f5f9;
        }
        .btn-google:disabled { opacity: 0.4; cursor: not-allowed; }
        .stat-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 20px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
        }
      `}</style>

      {loading && <LoadingSpinner fullPage text="Signing you in..." />}

      {/* ── LEFT PANEL ── */}
      <section
        aria-label="Brand panel"
        className="hidden lg:flex lg:w-[48%] xl:w-[52%] flex-col relative overflow-hidden"
        style={{ background: "#080e1a" }}
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Ambient glow */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute bottom-[-15%] right-[-15%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          {/* Logo */}
          <div className="anim-fade-up">
            <img
              src="/acillp-logo-dark.svg"
              alt="AutoCredits India LLP"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <div className="anim-fade-up delay-100">
              <span
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] mb-6 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  color: "#f59e0b",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-400"
                  style={{ boxShadow: "0 0 6px #f59e0b" }}
                />
                Automotive Finance Platform
              </span>
            </div>

            <h1
              className="anim-fade-up delay-150 text-4xl xl:text-5xl font-black leading-[1.05] tracking-tight text-white mb-5"
            >
              Drive deals,
              <br />
              <span className="shimmer-text">faster.</span>
            </h1>

            <p className="anim-fade-up delay-200 text-slate-400 text-base xl:text-lg leading-relaxed mb-10">
              End-to-end loan management, insurance, and vehicle financing
              for modern automotive dealerships.
            </p>

            {/* Feature list */}
            <ul className="anim-fade-up delay-250 space-y-3">
              {[
                { label: "Loan origination & tracking", icon: "📋" },
                { label: "Insurance case management", icon: "🛡️" },
                { label: "Real-time disbursement reports", icon: "📊" },
                { label: "Multi-role access control", icon: "🔐" },
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-sm text-slate-300"
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs"
                    style={{
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Stats row */}
          <div className="anim-fade-up delay-300 grid grid-cols-3 gap-3">
            {[
              { value: "10K+", label: "Loans processed" },
              { value: "99.9%", label: "Uptime" },
              { value: "< 2s", label: "Avg. approval" },
            ].map((s, i) => (
              <div key={i} className="stat-badge">
                <span className="text-amber-400 font-black text-lg leading-none mb-0.5">
                  {s.value}
                </span>
                <span className="text-slate-500 text-[10px] font-medium text-center leading-tight">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical separator */}
        <div
          className="absolute right-0 top-[10%] bottom-[10%] w-px"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(245,158,11,0.15) 30%, rgba(245,158,11,0.15) 70%, transparent)",
          }}
        />
      </section>

      {/* ── RIGHT PANEL ── */}
      <section
        aria-label="Sign in"
        className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "#0d1525" }}
      >
        {/* Subtle ambient top glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-[280px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6">
          <img
            src="/acillp-logo-dark.svg"
            alt="AutoCredits India LLP"
            className="h-8 w-auto object-contain"
          />
        </div>

        {/* Form card */}
        <div className="w-full max-w-[400px] px-6 py-4 z-10">

          {/* Header */}
          <div className="mb-8 anim-fade-up">
            <h2 className="text-3xl font-black text-white tracking-tight mb-1.5">
              Welcome back
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              Sign in to your AutoCredits workspace
            </p>
          </div>

          {/* Success */}
          {successMessage && (
            <div
              className="mb-5 p-3.5 rounded-xl flex gap-3 items-start anim-fade-in"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-300 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mb-5 p-3.5 rounded-xl flex gap-3 items-start anim-fade-in"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email */}
            <div className="anim-fade-up delay-100">
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-widest mb-2"
                style={{ color: focusedField === "email" || email ? "#f59e0b" : "#475569" }}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: focusedField === "email" ? "#f59e0b" : "#475569" }}
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
                  className="input-field"
                />
              </div>
            </div>

            {/* Password */}
            <div className="anim-fade-up delay-150">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: focusedField === "password" || password ? "#f59e0b" : "#475569" }}
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-[10px] font-semibold uppercase tracking-wider transition-colors"
                  style={{ color: "#f59e0b" }}
                  onMouseEnter={(e) => (e.target.style.color = "#fbbf24")}
                  onMouseLeave={(e) => (e.target.style.color = "#f59e0b")}
                >
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: focusedField === "password" ? "#f59e0b" : "#475569" }}
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
                  className="input-field"
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors disabled:opacity-40"
                  style={{ color: "#475569" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="anim-fade-up delay-200 flex items-center gap-2.5 pt-1">
              <div className="relative flex-shrink-0">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="sr-only"
                />
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={rememberMe}
                  onClick={() => !loading && setRememberMe(!rememberMe)}
                  disabled={loading}
                  className="w-4 h-4 rounded flex items-center justify-center transition-all disabled:opacity-50"
                  style={{
                    background: rememberMe ? "#f59e0b" : "transparent",
                    border: `1.5px solid ${rememberMe ? "#f59e0b" : "#334155"}`,
                  }}
                >
                  {rememberMe && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <label
                htmlFor="remember"
                onClick={() => !loading && setRememberMe(!rememberMe)}
                className="text-sm font-medium cursor-pointer select-none"
                style={{ color: "#64748b" }}
              >
                Remember me
              </label>
            </div>

            {/* Submit */}
            <div className="anim-fade-up delay-250 pt-2">
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <Loader size={15} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="anim-fade-up delay-300 flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "#1e293b" }} />
            <span
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "#334155" }}
            >
              or
            </span>
            <div className="flex-1 h-px" style={{ background: "#1e293b" }} />
          </div>

          {/* Google */}
          <div className="anim-fade-up delay-350">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn-google"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
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
          </div>

          {/* Footer note */}
          <p className="mt-8 text-center text-[10px] font-medium leading-relaxed" style={{ color: "#334155" }}>
            By signing in you agree to our{" "}
            <a href="#" style={{ color: "#f59e0b" }} className="hover:underline">
              Privacy Policy
            </a>{" "}
            &amp;{" "}
            <a href="#" style={{ color: "#f59e0b" }} className="hover:underline">
              Terms of Service
            </a>
          </p>
        </div>

        {/* Bottom label */}
        <div className="absolute bottom-6 flex items-center gap-2 opacity-20">
          <img
            src="/acillp-logo-dark.svg"
            alt=""
            aria-hidden="true"
            className="h-5 w-auto object-contain"
          />
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
