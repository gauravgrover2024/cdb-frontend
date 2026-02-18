import { useState } from 'react';
import { login } from '../../api/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success && res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        if (onLogin) onLogin(res.data);
      } else {
        setError('Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {loading && <LoadingSpinner fullPage text="Signing you in..." />}
      
      {/* Left Column: Visual Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
        {/* Animated background circles/elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 text-center space-y-8 max-w-lg">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-12 border border-white/20 shadow-2xl">
            <img 
              src={process.env.PUBLIC_URL + '/ACILLP.svg'} 
              alt="ACILLP Logo" 
              className="w-48 h-auto mx-auto logo-theme-aware"
            />
            <div className="mt-8 space-y-4">
              <h1 className="text-4xl font-bold text-white tracking-tight">AutoCredits India LLP</h1>
              <p className="text-white/80 text-lg font-light leading-relaxed">
                Empowering your dreams with seamless automotive financing solutions across India.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 pt-12 text-white/60">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white">50k+</div>
              <div className="text-xs uppercase tracking-widest font-semibold text-white/50">Happy Clients</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white">100+</div>
              <div className="text-xs uppercase tracking-widest font-semibold text-white/50">Bank Partners</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white">24h</div>
              <div className="text-xs uppercase tracking-widest font-semibold text-white/50">Quick Approval</div>
            </div>
          </div>
        </div>
        
        {/* Footer text */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-sm font-medium">
          © {new Date().getFullYear()} AutoCredits India LLP. All rights reserved.
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12 lg:p-24 bg-background">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-4">
            <div className="lg:hidden text-center mb-10">
                <img 
                  src={process.env.PUBLIC_URL + '/ACILLP.svg'} 
                  alt="ACILLP Logo" 
                  className="w-32 h-auto mx-auto logo-theme-aware"
                />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
              Welcome Back
            </h2>
            <p className="text-muted-foreground text-lg">
              Authorized personnel only. Please sign in to access the platform.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5 group">
              <label className="text-sm font-semibold text-muted-foreground group-focus-within:text-primary transition-colors">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-muted-foreground group-focus-within:text-primary transition-colors">
                  Password
                </label>
                <a href="#" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  className="w-full h-12 bg-muted/30 border border-border rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm font-medium animate-in fade-in slide-in-from-top-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:translate-y-[-1px] active:translate-y-[0px] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
            >
              Sign In to Dashboard
            </button>
          </form>

          <div className="text-center pt-8">
            <p className="text-muted-foreground font-medium">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-bold hover:underline transition-all underline-offset-4">
                Request access here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
