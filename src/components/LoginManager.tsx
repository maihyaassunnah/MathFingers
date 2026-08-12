import React, { useState, useMemo, useEffect } from 'react';
import { MathFingerLogo } from './MathFingerLogo';
import { 
  Shield, 
  ArrowRight, 
  UserCheck, 
  AlertCircle, 
  Key, 
  Check, 
  Building, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  QrCode, 
  RefreshCw, 
  Lock, 
  Users, 
  Crown, 
  MapPin, 
  X,
  ShieldCheck,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminUser, Branch } from '../types';
import { getAdminAvatar } from '../utils';

interface LoginManagerProps {
  onLogin: (user: AdminUser) => void;
  theme: 'light' | 'dark';
  adminUsers: AdminUser[];
  branches: Branch[];
  onToggleTheme?: () => void;
  onOpenSelfAttendance?: () => void;
}

export function LoginManager({ 
  onLogin, 
  theme, 
  adminUsers = [], 
  branches = [],
  onToggleTheme,
  onOpenSelfAttendance
}: LoginManagerProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('math_finger_remember_me') !== 'false';
  });
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const isLight = theme === 'light';

  // Default admins fallback if empty list
  const defaultAdmins: AdminUser[] = useMemo(() => [
    { username: 'wahyudin', name: 'Wahyudin Hafiz, S.Pd', role: 'super_admin', branch: 'Pusat', password: 'admin123' },
    { username: 'febrianti', name: 'Febrianti Dewi, S.Pd', role: 'branch_admin', branch: 'Singkut', password: 'admin123' },
    { username: 'dewi', name: 'Dewi Safitri, S.H', role: 'branch_admin', branch: 'Bangko', password: 'dewi123' },
    { username: 'les_bandung', name: 'Les Privat Bandung', role: 'branch_admin', branch: 'Bandung', password: 'bdg123' }
  ], []);

  const activeAdmins = adminUsers.length > 0 ? adminUsers : defaultAdmins;

  // Auto-select saved user if rememberMe is enabled
  useEffect(() => {
    const isRemembered = localStorage.getItem('math_finger_remember_me') !== 'false';
    const savedUsername = localStorage.getItem('math_finger_saved_user');
    if (isRemembered && savedUsername && !selectedUser) {
      const found = activeAdmins.find(a => a.username === savedUsername);
      if (found) {
        setSelectedUser(found);
      } else if (activeAdmins.length > 0) {
        setSelectedUser(activeAdmins[0]);
      }
    } else if (!selectedUser && activeAdmins.length > 0) {
      setSelectedUser(activeAdmins[0]);
    }
  }, [activeAdmins]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Silakan pilih akun administrator.');
      return;
    }

    const correctPassword = selectedUser.password || 'admin123';
    if (passwordInput !== correctPassword) {
      setError('Kata sandi salah. Silakan periksa kembali.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('math_finger_remember_me', 'true');
      localStorage.setItem('math_finger_saved_user', selectedUser.username);
    } else {
      localStorage.setItem('math_finger_remember_me', 'false');
      localStorage.removeItem('math_finger_saved_user');
    }

    setIsSuccess(true);
    setError(null);

    setTimeout(() => {
      onLogin(selectedUser);
    }, 500);
  };

  const handleAutoFillDefaultPassword = () => {
    if (selectedUser) {
      setPasswordInput(selectedUser.password || 'admin123');
      setError(null);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 md:p-8 transition-colors duration-300 relative overflow-x-hidden ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0b1320] text-slate-100'
    }`}>
      
      {/* Sleek Top Header Actions */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                isLight 
                  ? 'bg-white border-slate-200 text-slate-700 shadow-xs' 
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {isLight ? <Moon size={15} /> : <Sun size={15} />}
              <span className="text-[11px]">{isLight ? 'Gelap' : 'Terang'}</span>
            </button>
          )}
        </div>

        {onOpenSelfAttendance && (
          <button
            type="button"
            onClick={onOpenSelfAttendance}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
          >
            <QrCode size={14} />
            <span>Presensi QR</span>
          </button>
        )}
      </header>

      {/* Main Login Card - Instagram/Meta Mobile Style */}
      <main className="max-w-md mx-auto w-full my-auto py-6">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
            isLight 
              ? 'bg-white border-slate-200 shadow-xl shadow-slate-200/60' 
              : 'bg-slate-900/90 border-slate-800 shadow-2xl shadow-emerald-950/20'
          }`}
        >
          {/* Instagram-style Centered Logo at Top */}
          <div className="flex flex-col items-center justify-center text-center mb-7">
            <div className="mb-3">
              <MathFingerLogo size={64} showText={false} theme={theme} />
            </div>
            
            <h1 className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Math Finger
            </h1>
            <p className={`text-xs font-semibold mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Portal Masuk Administrator
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Input 1: Account Selector Dropdown (Instagram Outline Input Style) */}
            <div className="space-y-1">
              <label className={`block text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Pilih Akun Administrator
              </label>
              <div className="relative">
                <select
                  value={selectedUser?.username || ''}
                  onChange={(e) => {
                    const found = activeAdmins.find(a => a.username === e.target.value);
                    if (found) {
                      setSelectedUser(found);
                      setPasswordInput('');
                      setError(null);
                    }
                  }}
                  className={`w-full pl-3.5 pr-10 py-3.5 rounded-xl border text-xs sm:text-sm font-semibold outline-none appearance-none cursor-pointer transition ${
                    isLight 
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white' 
                      : 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500 focus:bg-slate-900'
                  }`}
                >
                  {activeAdmins.map((admin) => {
                    const isSuper = admin.role === 'super_admin' || admin.branch === 'Pusat';
                    return (
                      <option key={admin.username} value={admin.username}>
                        {admin.name} ({isSuper ? 'Pusat' : `Cabang ${admin.branch}`})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Selected Account Info Tag */}
            {selectedUser && (
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                selectedUser.role === 'super_admin'
                  ? isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-indigo-950/40 border-indigo-900/60 text-indigo-200'
                  : isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/40 border-emerald-900/60 text-emerald-200'
              }`}>
                <div className="flex items-center gap-2 truncate">
                  <img
                    src={getAdminAvatar(selectedUser)}
                    alt={selectedUser.name}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-lg object-cover shrink-0"
                  />
                  <span className="font-bold truncate">{selectedUser.name}</span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white/60 dark:bg-slate-800/80 shrink-0">
                  {selectedUser.role === 'super_admin' ? 'PUSAT' : selectedUser.branch}
                </span>
              </div>
            )}

            {/* Input 2: Password Input (Instagram Outline Input Style) */}
            <div className="space-y-1">
              <label className={`block text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Kata Sandi
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="Kata sandi"
                  disabled={isSuccess}
                  className={`w-full pl-3.5 pr-10 py-3.5 rounded-xl border text-xs sm:text-sm font-semibold outline-none transition ${
                    error 
                      ? 'border-red-500 bg-red-500/5' 
                      : isLight 
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white' 
                        : 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500 focus:bg-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Action Button (Solid Emerald) */}
            <button
              type="submit"
              disabled={isSuccess || !passwordInput}
              className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
                isSuccess
                  ? 'bg-emerald-500 text-white'
                  : !passwordInput
                    ? isLight ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              {isSuccess ? (
                <>
                  <UserCheck size={18} className="animate-pulse" />
                  <span>Memuat Dashboard...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>

            {/* Centered Secondary Link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className={`text-xs font-semibold hover:underline cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                Lupa kata sandi?
              </button>
            </div>
          </form>

          {/* Keunggulan: Tampilkan Secara Ringkas Dalam Satu Baris Saja */}
          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-x-auto no-scrollbar">
              <span>🔒 Sesi Terisolasi</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>✨ Sync Cloud & Offline</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>📱 QR Mandiri</span>
            </div>
          </div>

        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center py-2 max-w-md mx-auto w-full">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-500">
          Math Finger Privat Tutor System &copy; {new Date().getFullYear()}
        </p>
      </footer>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-xs w-full p-5 rounded-2xl border shadow-xl relative ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <HelpCircle size={20} className="text-emerald-500" />
                <h3 className="text-sm font-extrabold">Bantuan Kata Sandi</h3>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Jika Anda lupa kata sandi untuk <strong>{selectedUser?.name || 'akun ini'}</strong>, Anda dapat mengisi sandi terdaftar secara otomatis.
              </p>

              <div className="space-y-2">
                {selectedUser && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoFillDefaultPassword();
                      setShowForgotPasswordModal(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                  >
                    Isi Sandi Terdaftar Otomatis
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className={`w-full py-2 rounded-xl border text-xs font-semibold ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
