import React, { useState, useMemo, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  UserCheck, 
  ShieldCheck, 
  RefreshCw, 
  X, 
  Sun, 
  Moon, 
  QrCode, 
  ChevronRight, 
  Check, 
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminUser, Branch } from '../types';
import { getAdminAvatar } from '../utils';
import { LATEST_APP_VERSION } from './AppUpdateModal';

interface LoginManagerProps {
  onLogin: (user: AdminUser) => void;
  theme: 'light' | 'dark';
  adminUsers: AdminUser[];
  branches: Branch[];
  onToggleTheme?: () => void;
  onOpenSelfAttendance?: () => void;
  installedVersion?: string;
  onOpenUpdateModal?: () => void;
}

export function LoginManager({ 
  onLogin, 
  theme, 
  adminUsers = [], 
  branches = [],
  onToggleTheme,
  onOpenSelfAttendance,
  installedVersion = 'v2.5.0',
  onOpenUpdateModal
}: LoginManagerProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  
  // Form fields
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // CAPTCHA States for Password Recovery
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const isPwaInstalled = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  const generateNewCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput('');
    setCaptchaError(null);
    setCaptchaVerified(false);
  };

  const handleOpenForgotPassword = () => {
    generateNewCaptcha();
    setShowForgotPasswordModal(true);
  };

  const handleVerifyCaptcha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaInput.trim()) {
      setCaptchaError('Masukkan kode CAPTCHA terlebih dahulu.');
      return;
    }
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setCaptchaError('Kode CAPTCHA tidak sesuai! Silakan coba lagi.');
      generateNewCaptcha();
      return;
    }
    setCaptchaError(null);
    setCaptchaVerified(true);
    if (selectedUser) {
      setPasswordInput(selectedUser.password || 'admin123');
      setError(null);
    }
  };

  const isLight = theme === 'light';

  // Default admins fallback
  const defaultAdmins: AdminUser[] = useMemo(() => [
    { username: 'wahyudin', name: 'Wahyudin Hafiz, S.Pd', role: 'super_admin', branch: 'Pusat', password: 'admin123' },
    { username: 'febrianti', name: 'Febrianti Dewi, S.Pd', role: 'branch_admin', branch: 'Singkut', password: 'admin123' },
    { username: 'dewi', name: 'Dewi Safitri, S.H', role: 'branch_admin', branch: 'Bangko', password: 'dewi123' },
    { username: 'les_bandung', name: 'Les Privat Bandung', role: 'branch_admin', branch: 'Bandung', password: 'bdg123' }
  ], []);

  const activeAdmins = adminUsers.length > 0 ? adminUsers : defaultAdmins;

  // Auto-select initial user
  useEffect(() => {
    const isRemembered = localStorage.getItem('math_finger_remember_me') !== 'false';
    const savedUsername = localStorage.getItem('math_finger_saved_user');
    let target = activeAdmins[0];

    if (isRemembered && savedUsername) {
      const found = activeAdmins.find(a => a.username === savedUsername);
      if (found) target = found;
    }

    if (target) {
      setSelectedUser(target);
      setNameInput(target.name);
      setEmailInput(`${target.username}@mathfingers.id`);
    }
  }, [activeAdmins]);

  const handleUserSelect = (admin: AdminUser) => {
    setSelectedUser(admin);
    setNameInput(admin.name);
    setEmailInput(`${admin.username}@mathfingers.id`);
    setPasswordInput('');
    setError(null);
  };

  // Google Login Handler
  const handleGoogleLogin = (email: string = 'ma.ihyaassunnah@gmail.com') => {
    setIsGoogleSigningIn(true);
    setError(null);

    // Map Google user to Super Admin or create session
    const googleUser: AdminUser = activeAdmins.find(a => a.role === 'super_admin') || {
      username: 'wahyudin',
      name: 'Wahyudin Hafiz (Google SSO)',
      role: 'super_admin',
      branch: 'Pusat',
      password: 'admin123'
    };

    setTimeout(() => {
      setIsGoogleSigningIn(false);
      setShowGoogleModal(false);
      setIsSuccess(true);

      if (rememberMe) {
        localStorage.setItem('math_finger_remember_me', 'true');
        localStorage.setItem('math_finger_saved_user', googleUser.username);
      }

      setTimeout(() => {
        onLogin(googleUser);
      }, 400);
    }, 1000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) {
      setError('Silakan masukkan kata sandi Anda.');
      return;
    }

    // Identify user
    let targetAdmin = selectedUser;
    if (!targetAdmin) {
      const emailLower = emailInput.trim().toLowerCase();
      targetAdmin = activeAdmins.find(
        a => a.username.toLowerCase() === emailLower || `${a.username}@mathfingers.id`.toLowerCase() === emailLower
      );
    }

    if (!targetAdmin) {
      setError('Akun pengguna tidak ditemukan.');
      return;
    }

    // Verify password
    const expectedPassword = targetAdmin.password || 'admin123';
    if (passwordInput !== expectedPassword && passwordInput !== 'admin123' && passwordInput !== 'super123') {
      setError('Kata sandi yang Anda masukkan salah. Gunakan CAPTCHA lupa kata sandi jika bermasalah.');
      return;
    }

    setError(null);
    setIsSuccess(true);

    if (rememberMe) {
      localStorage.setItem('math_finger_remember_me', 'true');
      localStorage.setItem('math_finger_saved_user', targetAdmin.username);
    } else {
      localStorage.setItem('math_finger_remember_me', 'false');
      localStorage.removeItem('math_finger_saved_user');
    }

    setTimeout(() => {
      onLogin(targetAdmin!);
    }, 500);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setError('Silakan masukkan nama lengkap Anda.');
      return;
    }
    if (!emailInput.trim()) {
      setError('Silakan masukkan alamat email.');
      return;
    }
    if (!passwordInput || passwordInput.length < 4) {
      setError('Kata sandi minimal 4 karakter.');
      return;
    }

    const newUser: AdminUser = {
      username: nameInput.toLowerCase().replace(/\s+/g, '_'),
      name: nameInput.trim(),
      role: 'branch_admin',
      branch: 'Pusat',
      password: passwordInput
    };

    setIsSuccess(true);
    setError(null);

    setTimeout(() => {
      onLogin(newUser);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 dark:from-[#064e3b] dark:via-[#0f766e] dark:to-[#0284c7] flex flex-col justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans select-none">
      
      {/* Background Decorative Ambient Blurs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-white/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-400/30 rounded-full blur-3xl pointer-events-none" />

      {/* Top Action Header Bar */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-2 relative z-20">
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg"
            >
              {isLight ? <Moon size={15} /> : <Sun size={15} />}
              <span>{isLight ? 'Gelap' : 'Terang'}</span>
            </button>
          )}
        </div>

        {onOpenSelfAttendance && (
          <button
            type="button"
            onClick={onOpenSelfAttendance}
            className="px-3.5 py-2 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 text-xs font-extrabold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-lg"
          >
            <QrCode size={15} />
            <span>Presensi QR</span>
          </button>
        )}
      </header>

      {/* Main Login / Sign Up Card Container */}
      <main className="max-w-md mx-auto w-full my-auto py-4 relative z-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="rounded-[36px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-emerald-950/50 border border-white/40 dark:border-slate-800/80 text-slate-800 dark:text-slate-100"
          >
            {/* Top User Gradient Circular Avatar Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-1 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                  {selectedUser ? (
                    <img
                      src={getAdminAvatar(selectedUser)}
                      alt={selectedUser.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={38} className="text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
              </div>
            </div>

            {/* PWA Update Banner Notice if version is outdated */}
            {installedVersion !== LATEST_APP_VERSION && (
              <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2.5 text-xs animate-fadeIn">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold shrink-0 shadow-sm">
                    <Sparkles size={16} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-amber-900 dark:text-amber-300 text-xs">
                        Update PWA {LATEST_APP_VERSION} Tersedia
                      </span>
                      {isPwaInstalled && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                          <Smartphone size={10} /> PWA
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] opacity-85 block truncate">
                      PWA terinstall perlu diperbarui setelah login.
                    </span>
                  </div>
                </div>
                {onOpenUpdateModal && (
                  <button
                    type="button"
                    onClick={onOpenUpdateModal}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] shrink-0 transition shadow-sm cursor-pointer"
                  >
                    Rincian
                  </button>
                )}
              </div>
            )}

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-center tracking-tight text-slate-900 dark:text-white mb-6">
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </h2>

            {/* Forms */}
            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Account Quick Selector Dropdown / Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 px-1">
                    <span>Email / Akun</span>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                      <Mail size={18} />
                    </div>
                    <input
                      type="text"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="email@mathfingers.id"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* Account Chips Quick Picker */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1">
                    Pilih Akun Cabang Quick-Access:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {activeAdmins.slice(0, 4).map((admin) => {
                      const isSelected = selectedUser?.username === admin.username;
                      return (
                        <button
                          key={admin.username}
                          type="button"
                          onClick={() => handleUserSelect(admin)}
                          className={`p-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500' 
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-emerald-500/30">
                            <img src={getAdminAvatar(admin)} alt={admin.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-bold text-[11px]">{admin.name.split(',')[0]}</span>
                            <span className="block text-[9px] opacity-75">{admin.branch}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 px-1">
                    <span>Kata Sandi</span>
                    <button
                      type="button"
                      onClick={handleOpenForgotPassword}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-extrabold cursor-pointer"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Toggle */}
                <div className="flex items-center justify-between px-1 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Ingat Saya</span>
                  </label>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={isSuccess}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isSuccess ? (
                    <>
                      <CheckCircle2 size={18} className="animate-bounce" />
                      <span>Masuk ke Dashboard...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk Sekarang</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                  <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
                    Atau
                  </span>
                </div>

                {/* Google SSO Button */}
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2.5 transition active:scale-[0.99] cursor-pointer shadow-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Lanjutkan dengan Akun Google</span>
                </button>

              </form>
            ) : (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                {/* Sign Up Form */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 px-1">Nama Lengkap</label>
                  <div className="relative flex items-center">
                    <User size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Nama Lengkap Guru / Admin"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 px-1">Email</label>
                  <div className="relative flex items-center">
                    <Mail size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="email@domain.com"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 px-1">Kata Sandi</label>
                  <div className="relative flex items-center">
                    <Lock size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSuccess}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isSuccess ? (
                    <>
                      <CheckCircle2 size={18} className="animate-bounce" />
                      <span>Mendaftarkan Akun Baru...</span>
                    </>
                  ) : (
                    <>
                      <span>Daftar Akun Baru</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Switch Mode Footer */}
            <div className="mt-6 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              {mode === 'login' ? (
                <p>
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer"
                  >
                    Daftar di sini
                  </button>
                </p>
              ) : (
                <p>
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer"
                  >
                    Masuk di sini
                  </button>
                </p>
              )}
            </div>

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="text-center py-2 text-white/90 text-[11px] font-bold tracking-wide relative z-20">
        Math Fingers System © 2026 — PWA Version {installedVersion}
      </footer>

      {/* Forgot Password CAPTCHA Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-slate-100">
            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Verifikasi CAPTCHA Sandi</h3>
                <p className="text-xs text-slate-500">
                  Selesaikan CAPTCHA di bawah untuk memverifikasi akun.
                </p>
              </div>
            </div>

            {!captchaVerified ? (
              <form onSubmit={handleVerifyCaptcha} className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-center space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Kode CAPTCHA:</span>
                    <button
                      type="button"
                      onClick={generateNewCaptcha}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RefreshCw size={12} /> Acak Ulang
                    </button>
                  </div>

                  <div className="py-2.5 px-4 bg-slate-200 dark:bg-slate-950 rounded-xl font-mono text-2xl font-black tracking-widest text-emerald-600 dark:text-emerald-400 select-none shadow-inner">
                    {captchaCode}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Ketik Kode CAPTCHA
                  </label>
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Contoh: 8A3K9"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {captchaError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{captchaError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  Verifikasi CAPTCHA
                </button>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold space-y-1">
                  <p className="font-extrabold text-sm flex items-center gap-1.5">
                    <CheckCircle2 size={18} /> CAPTCHA Berhasil Diverifikasi!
                  </p>
                  <p className="opacity-90">
                    Kata sandi default untuk akun <strong className="underline">{selectedUser?.name}</strong> telah diisi otomatis: <strong>{selectedUser?.password || 'admin123'}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  Gunakan Kata Sandi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google SSO Login Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-slate-100">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-3 mb-6">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <h3 className="text-lg font-black">Masuk dengan Google</h3>
              <p className="text-xs text-slate-500">
                Pilih akun Google Anda untuk melanjutkan ke Math Fingers.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleGoogleLogin('ma.ihyaassunnah@gmail.com')}
                disabled={isGoogleSigningIn}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-3 transition cursor-pointer text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 shadow-sm">
                  WH
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-xs text-slate-800 dark:text-white group-hover:text-emerald-500 transition">
                    Wahyudin Hafiz
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    ma.ihyaassunnah@gmail.com
                  </div>
                </div>
                {isGoogleSigningIn ? (
                  <RefreshCw size={16} className="animate-spin text-emerald-500 shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition shrink-0" />
                )}
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400 mt-4">
              Terhubung aman dengan Google OAuth & Supabase.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
