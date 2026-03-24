import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Loader, ArrowRight, Check, Shield } from 'lucide-react';
import { registerWithEmail, loginWithGoogle } from '../../api/firebaseAuth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const Signup = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (!form.name.trim()) {
      setError('Full name is required');
      return;
    }

    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!form.password) {
      setError('Password is required');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!form.role) {
      setError('Please select a role');
      return;
    }

    setLoading(true);
    try {
      const result = await registerWithEmail(form.name, form.email, form.password, form.role);
      
      if (result.success) {
        setSuccessMessage('Account created successfully! Redirecting to login...');
        setForm({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'staff',
        });
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      const errorMessage = 
        err.code === 'auth/email-already-in-use' ? 'Email is already registered' :
        err.code === 'auth/weak-password' ? 'Password is too weak. Use at least 6 characters.' :
        err.code === 'auth/invalid-email' ? 'Invalid email address' :
        err.message || 'Registration failed. Please try again.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const result = await loginWithGoogle();
      
      if (result.success) {
        await refreshUser();
        setSuccessMessage('Google signup successful! Redirecting...');
        setTimeout(() => navigate('/'), 800);
      }
    } catch (err) {
      if (err.isPending || err.status === 403) {
        setError('⏳ Your account is pending approval. The administrator will review your account soon. Please check back later.');
      } else {
        const errorMessage = 
          err.code === 'auth/popup-closed-by-user' ? 'Signup cancelled.' :
          err.code === 'auth/cancelled-popup-request' ? 'Please try again.' :
          err.message || 'Google signup failed. Please try again.';
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

        .animate-slide-in-left {
          animation: slideInLeft 0.6s ease-out 0.2s backwards;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.6s ease-out 0.2s backwards;
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }

        .transition-smooth {
          @apply transition-all duration-300 ease-out;
        }
      `}</style>

      {loading && <LoadingSpinner fullPage text="Creating your account..." />}

      <section
        className="w-full lg:w-[45%] min-h-[40vh] lg:min-h-screen flex flex-col bg-slate-950 relative overflow-hidden animate-slide-in-left"
      >
        {/* Animated Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.25),transparent_70%)]"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-teal-500/20 rounded-full blur-[100px] animate-pulse mix-blend-screen" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30 mix-blend-overlay"></div>

        <div className="relative z-10 flex flex-col flex-1 p-6 sm:p-8 lg:p-10 lg:py-6 overflow-y-auto">
          <div className="flex-shrink-0">
            <div className="h-9 w-auto font-black text-2xl text-white hover:text-indigo-300 transition-smooth cursor-pointer">
              AutoCredits
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center mt-8 lg:mt-0">
            <div className="space-y-4 max-w-md">
              <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/30 to-teal-500/20 border border-emerald-400/30 text-emerald-200 text-[10px] font-bold uppercase tracking-[0.2em]">
                ✨ Join Our Team
              </span>
              
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-[1.1] tracking-tight">
                Create Your <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Account</span>
              </h1>
              
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                Join our platform and start managing automotive loans with enterprise-grade tools and security.
              </p>
            </div>

            <ul className="mt-8 space-y-3">
              {[
                { icon: '✓', title: 'Instant Setup', desc: 'Get started in minutes' },
                { icon: '🔐', title: 'Bank-Grade Security', desc: 'Advanced data encryption' },
                { icon: '👥', title: '3 Role Levels', desc: 'Superadmin, Admin, Staff' },
              ].map((feature, i) => (
                <li key={i} className="flex items-center p-3 gap-4 group cursor-pointer rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-emerald-400/30 hover:shadow-[0_8px_32px_rgba(16,185,129,0.15)] transition-all duration-500 ease-out transform hover:-translate-y-1">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 group-hover:from-emerald-500/20 group-hover:to-teal-500/20 group-hover:border-emerald-400/50 text-lg shadow-lg transition-all duration-500">
                    {feature.icon}
                  </span>
                  <div>
                    <span className="text-white font-semibold text-sm group-hover:text-green-300 transition-smooth">{feature.title}</span>
                    <span className="text-slate-400 text-xs ml-1.5">— {feature.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-shrink-0 pt-8 border-t border-white/5 flex items-center justify-between text-slate-500 text-[10px] font-medium uppercase tracking-widest">
            <span>🔐 Secure Registration</span>
            <span>v1.0</span>
          </div>
        </div>
      </section>

      <div className="hidden lg:block w-px min-h-screen bg-gradient-to-b from-transparent via-slate-300 via-50% to-transparent shrink-0"></div>

      {/* Right Side - Signup Form */}
      <section
        className="w-full lg:w-[55%] min-h-[60vh] lg:min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] relative overflow-hidden animate-slide-in-right p-6 sm:p-8 lg:p-12 overflow-y-auto"
      >
        {/* Soft Ambient Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-100/40 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="lg:hidden absolute top-6 left-6 z-20">
          <div className="h-7 font-black text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">AC</div>
        </div>

        <div className="w-full max-w-[420px] z-10 bg-white/70 backdrop-blur-2xl p-6 sm:p-8 rounded-[2rem] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative my-auto">
          <div className="mb-5 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Sign up
            </h2>
            <p className="text-slate-500 font-medium mt-2 text-sm">
              Create your account and select your role to get started.
            </p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex gap-3 animate-fade-in">
              <Check size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 font-medium">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex gap-3 animate-fade-in">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name Input */}
            <div className="group">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                Full Name
              </label>
              <div className="relative mt-2">
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-smooth ${
                  focusedField === "name" ? "text-indigo-500 scale-110" : "text-slate-300"
                }`} />
                <input
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  className="w-full h-12 pl-12 pr-4 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-200/60 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:bg-white outline-none transition-smooth font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-50 hover:border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="group">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                Email Address
              </label>
              <div className="relative mt-2">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-smooth ${
                  focusedField === "email" ? "text-indigo-500 scale-110" : "text-slate-300"
                }`} />
                <input
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  className="w-full h-12 pl-12 pr-4 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-200/60 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:bg-white outline-none transition-smooth font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-50 hover:border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
              </div>
            </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password Input */}
            <div className="group">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                Password
              </label>
              <div className="relative mt-2">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-smooth ${
                  focusedField === "password" ? "text-indigo-500 scale-110" : "text-slate-300"
                }`} />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  className="w-full h-12 pl-12 pr-4 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-200/60 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:bg-white outline-none transition-smooth font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-50 hover:border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="group">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                Confirm Password
              </label>
              <div className="relative mt-2">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-smooth ${
                  focusedField === "confirmPassword" ? "text-indigo-500 scale-110" : "text-slate-300"
                }`} />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  className="w-full h-12 pl-12 pr-4 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-200/60 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:bg-white outline-none transition-smooth font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-50 hover:border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
              </div>
            </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block ml-1 flex items-center gap-2">
                <span>Requested Role</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 cursor-help" title="Role assignment requires superadmin approval">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
              </label>
              <div className="relative mt-2">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full h-12 pl-12 pr-4 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-200/60 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:bg-white outline-none transition-smooth font-medium text-slate-900 disabled:opacity-50 hover:border-slate-300 appearance-none cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                >
                  <option value="staff">Staff - Process loans & customer support</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !form.name || !form.email || !form.password || !form.confirmPassword}
                className="group inline-flex items-center justify-center gap-2 whitespace-nowrap w-full h-12 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 bg-[length:200%_auto] hover:bg-right text-white rounded-xl font-bold text-sm tracking-wide shadow-[0_8px_20px_-6px_rgba(16,185,129,0.6)] hover:shadow-[0_12px_24px_-8px_rgba(16,185,129,0.8)] transition-all duration-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-smooth" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            <span className="text-xs text-slate-400 font-semibold px-3">OR</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          </div>

          {/* Google Signup */}
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="group w-full h-12 bg-white/80 hover:bg-white border-2 border-slate-200/80 hover:border-slate-300 text-slate-800 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] backdrop-blur-sm"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-smooth" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative my-4">
            <div className="h-px bg-slate-200"></div>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-[13px] text-slate-600 font-medium">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-indigo-600 font-bold hover:text-indigo-700 transition-smooth hover:underline"
            >
              Sign in
            </a>
          </p>

          {/* Footer */}
          <p className="mt-6 text-center text-[10px] text-slate-400 font-medium leading-relaxed">
            By signing up you agree to our{" "}
            <a href="#" className="text-indigo-500 hover:underline transition-smooth">
              Privacy Policy
            </a>
            {" "}and{" "}
            <a href="#" className="text-indigo-500 hover:underline transition-smooth">
              Terms of Service
            </a>
            .
          </p>
        </div>

        <p className="mt-auto pt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest lg:hidden">
          AutoCredits © 2026
        </p>
      </section>
    </div>
  );
};

export default Signup;
