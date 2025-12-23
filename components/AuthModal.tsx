import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Icons } from '../constants.js';
import { syncService } from '../services/sync.js';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  
  const { login, register, loading, error, clearError } = useAuth();

  useEffect(() => {
    // Load existing config if available
    const config = syncService.getConfig();
    if (config.provider === 'supabase' && config.settings.supabaseUrl && config.settings.supabaseKey) {
      setSupabaseUrl(config.settings.supabaseUrl);
      setSupabaseKey(config.settings.supabaseKey);
    } else {
      setShowConfig(true); // Auto-show if missing
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save Supabase config first
    if (supabaseUrl && supabaseKey) {
      syncService.saveConfig({
        provider: 'supabase',
        settings: { supabaseUrl, supabaseKey }
      });
    } else {
      // If config is missing, show error
      // But maybe let AuthContext throw "Supabase not configured"
    }

    try {
      if (isLogin) {
        await login(email, password);
        onClose();
      } else {
        await register(email, password);
        onClose();
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('check your email')) {
        setIsVerificationSent(true);
        clearError();
      }
    }
  };

  if (isVerificationSent) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-card">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icons.Mail className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Check your inbox
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">
              We've sent a verification link to <span className="text-slate-900 dark:text-white font-bold">{email}</span>. Please click the link to activate your account.
            </p>
            <button
              onClick={() => { setIsVerificationSent(false); setIsLogin(true); }}
              className="w-full py-4 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-card max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="p-8 relative">
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <Icons.X className="w-6 h-6" />
          </button>

          <div className="mb-6 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icons.User className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
              {isLogin ? 'Login to sync your memos' : 'Sign up to start syncing'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2">
                <Icons.AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email</label>
              <div className="relative">
                <Icons.Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
              <div className="relative">
                <Icons.Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Icons.Loader className="w-4 h-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700/50">
               <button 
                 type="button"
                 onClick={() => setShowConfig(!showConfig)}
                 className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 transition-colors w-full justify-center"
               >
                 <Icons.Settings className="w-3 h-3" />
                 <span>Server Configuration</span>
                 <Icons.ChevronDown className={`w-3 h-3 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
               </button>
               
               {showConfig && (
                 <div className="space-y-3 pt-1 animate-card bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Supabase URL</label>
                     <input
                       type="text"
                       value={supabaseUrl}
                       onChange={(e) => setSupabaseUrl(e.target.value)}
                       className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-none rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                       placeholder="https://xyz.supabase.co"
                       required
                     />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Anon Key</label>
                     <input
                       type="password"
                       value={supabaseKey}
                       onChange={(e) => setSupabaseKey(e.target.value)}
                       className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-none rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                       placeholder="Supabase API Key"
                       required
                     />
                   </div>
                 </div>
               )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); clearError(); }}
              className="text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
