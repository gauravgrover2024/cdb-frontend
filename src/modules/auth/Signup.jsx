import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Loader, ArrowRight, Check, Shield } from 'lucide-react';
import { registerWithEmail } from '../../api/firebaseAuth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const Signup = () => {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen flex font-sans selection:bg-indigo-100 selection:text-indigo-900">
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

      {/* Left Side - Branding */}
      <section
        className="w-full lg:w-[45%] min-h-[40vh] lg:min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 relative overflow-hidden animate-slide-in-left"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(99,102,241,0.15),transparent)]"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col flex-1 p-8 sm:p-10 lg:p-14">
          <div className="flex-shrink-0">
            <div className="h-9 w-auto font-black text-2xl text-white hover:text-indigo-300 transition-smooth cursor-pointer">
              AutoCredits
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center mt-12 lg:mt-0">
            <div className="space-y-6 max-w-md">
              <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-green-500/30 to-emerald-500/20 border border-green-400/30 text-green-200 text-[10px] font-bold uppercase tracking-[0.2em]">
                ✨ Join Our Team
              </span>
              
              <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight">
                Create Your <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Account</span>
              </h1>
              
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                Join our platform and start managing automotive loans with enterprise-grade tools and security.
              </p>
            </div>

            <ul className="mt-12 space-y-4">
              {[
                { icon: '✓', title: 'Instant Setup', desc: 'Get started in minutes' },
                { icon: '🔐', title: 'Bank-Grade Security', desc: 'Firebase + JWT encryption' },
                { icon: '👥', title: '3 Role Levels', desc: 'Superadmin, Admin, Staff' },
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-4 group cursor-pointer">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:border-green-400/50 group-hover:bg-green-500/10 text-lg transition-smooth">
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
        className="w-full lg:w-[55%] min-h-[60vh] lg:min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#FAFAFC] to-slate-50 p-6 sm:p-8 lg:p-12 relative animate-slide-in-right overflow-y-auto"
      >
        <div className="lg:hidden absolute top-6 left-6">
          <div className="h-7 font-black text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AC</div>
        </div>

        <div className="w-full max-w-[450px] py-12 lg:py-0">
          <div className="mb-8 animate-fade-in">
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

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-smooth font-medium text-slate-900 placeholder:text-slate-300 disabled:opacity-50 hover:border-slate-300"
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
                  className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-smooth font-medium text-slate-900 placeholder:text-slate-300 disabled:opacity-50 hover:border-slate-300"
                />
              </div>
            </div>

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
                  className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-smooth font-medium text-slate-900 placeholder:text-slate-300 disabled:opacity-50 hover:border-slate-300"
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
                  className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-smooth font-medium text-slate-900 placeholder:text-slate-300 disabled:opacity-50 hover:border-slate-300"
                />
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
                  className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-smooth font-medium text-slate-900 disabled:opacity-50 hover:border-slate-300 appearance-none cursor-pointer"
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
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !form.name || !form.email || !form.password || !form.confirmPassword}
                className="group inline-flex items-center justify-center gap-2 whitespace-nowrap w-full h-14 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-smooth active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="relative bmy-6">
            <div className="h-px bg-slate-200 my-6"></div>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-sm text-slate-600 font-medium">
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
