import { useState } from 'react';
import { signup } from '../../api/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';

const Signup = ({ onSignup }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('All fields are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await signup(form.name, form.email, form.password, form.role);
      if (res.success && res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        if (onSignup) onSignup(res.data);
      } else {
        setError('Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      {loading && <LoadingSpinner fullPage text="Creating your account..." />}
      
      {/* Left Column: Visual Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
        {/* Decorative elements */}
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white/5 blur-3xl" />
        
        <div className="relative z-10 text-center space-y-8 max-w-lg">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-12 border border-white/20 shadow-2xl transition-all hover:scale-[1.01] duration-500">
            <img 
              src={process.env.PUBLIC_URL + '/ACILLP.svg'} 
              alt="ACILLP Logo" 
              className="w-48 h-auto mx-auto logo-theme-aware"
            />
            <div className="mt-10 space-y-4">
              <h1 className="text-4xl font-bold text-white tracking-tight">Join the Network</h1>
              <p className="text-white/80 text-lg font-light leading-relaxed">
                Connect with India's largest automotive financing platform and streamline your workflow.
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-12 pt-8">
            <div className="text-center group cursor-default">
              <div className="text-3xl font-bold text-white group-hover:scale-110 transition-transform">98%</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-white/50 mt-1">Uptime</div>
            </div>
            <div className="text-center group cursor-default">
              <div className="text-3xl font-bold text-white group-hover:scale-110 transition-transform">Instant</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-white/50 mt-1">Setup</div>
            </div>
            <div className="text-center group cursor-default">
              <div className="text-3xl font-bold text-white group-hover:scale-110 transition-transform">256-bit</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-white/50 mt-1">Secure</div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-xs font-medium">
          Powered by Advanced Cloud Infrastructure
        </div>
      </div>

      {/* Right Column: Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12 lg:p-10 bg-background overflow-y-auto no-scrollbar">
        <div className="w-full max-w-md space-y-8 py-12 lg:py-0">
          <div className="space-y-3">
            <div className="lg:hidden text-center mb-10">
                <img 
                  src={process.env.PUBLIC_URL + '/ACILLP.svg'} 
                  alt="ACILLP Logo" 
                  className="w-28 h-auto mx-auto logo-theme-aware"
                />
            </div>
            <h2 className="text-3xl font-black text-foreground tracking-tight sm:text-4xl">
              Create Account
            </h2>
            <p className="text-muted-foreground font-medium text-lg leading-relaxed">
              Register your profile to start managing automotive loans and payouts.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5 group">
              <label className="text-sm font-bold text-muted-foreground/80 group-focus-within:text-primary transition-colors">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-foreground font-medium"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-1.5 group">
              <label className="text-sm font-bold text-muted-foreground/80 group-focus-within:text-primary transition-colors">
                Work Email
              </label>
              <input
                type="email"
                name="email"
                className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-foreground font-medium"
                placeholder="john@autocredits.in"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-1.5 group">
              <label className="text-sm font-bold text-muted-foreground/80 group-focus-within:text-primary transition-colors">
                Password
              </label>
              <input
                type="password"
                name="password"
                className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-foreground font-medium"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-1.5 group">
              <label className="text-sm font-bold text-muted-foreground/80 flex items-center gap-2">
                Requested Role
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </label>
              <select
                name="role"
                className="w-full h-12 bg-muted/20 border border-border rounded-xl px-4 focus:outline-none cursor-not-allowed text-muted-foreground font-semibold appearance-none"
                value={form.role}
                disabled
              >
                <option value="user">Standard User</option>
                <option value="admin">Administrator</option>
              </select>
              <p className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">
                * Roles are subject to approval by Global Administrator
              </p>
            </div>

            {error && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-[13px] font-bold flex items-center gap-3 animate-in zoom-in-95">
                <div className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary text-primary-foreground font-black text-lg rounded-xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 mt-4"
            >
              Initialize My Account
            </button>
          </form>

          <p className="text-center text-muted-foreground font-semibold pt-10">
            Already have an identity?{' '}
            <Link to="/login" className="text-primary font-black hover:underline underline-offset-8 transition-all">
              Sign in back
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
