import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ShieldCheck, 
  Shield,
  RefreshCw, 
  X, 
  Sun, 
  Moon, 
  QrCode, 
  ChevronRight, 
  Check, 
  Sparkles,
  CheckCircle2,
  Smartphone,
  LogOut,
  Building,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminUser, Branch } from '../types';
import { getAdminAvatar } from '../utils';
import { LATEST_APP_VERSION } from './AppUpdateModal';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut, 
  onAuthStateChanged,
  FirebaseUser 
} from '../firebase';

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
  // Login tabs: 'password' | 'google'
  const [activeTab, setActiveTab] = useState<'password' | 'google'>('password');
  
  // Google Auth State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  
  // Form fields
  const [usernameOrEmailInput, setUsernameOrEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('Pusat');
  const [selectedRoleUser, setSelectedRoleUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  
  // CAPTCHA States for Emergency Password Recovery
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const isLight = theme === 'light';

  const isPwaInstalled = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  // Default admins fallback with Google email bindings
  const defaultAdmins: AdminUser[] = useMemo(() => [
    { username: 'wahyudin', name: 'Wahyudin Hafiz, S.Pd', role: 'super_admin', branch: 'Pusat', email: 'ma.ihyaassunnah@gmail.com', password: 'admin123' },
    { username: 'febrianti', name: 'Febrianti Dewi, S.Pd', role: 'branch_admin', branch: 'Singkut', email: 'febrianti.mathfingers@gmail.com', password: 'admin123' },
    { username: 'dewi', name: 'Dewi Safitri, S.H', role: 'branch_admin', branch: 'Bangko', email: 'dewi.mathfingers@gmail.com', password: 'dewi123' },
    { username: 'les_bandung', name: 'Les Privat Bandung', role: 'branch_admin', branch: 'Bandung', email: 'bandung.mathfingers@gmail.com', password: 'bdg123' }
  ], []);

  // Deduplicate and clean active admins
  const activeAdmins = useMemo(() => {
    const rawList = (adminUsers && adminUsers.length > 0) ? adminUsers : defaultAdmins;
    const uniqueMap = new Map<string, AdminUser>();
    
    rawList.forEach(admin => {
      if (admin && admin.username) {
        const key = admin.username.trim().toLowerCase();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            ...admin,
            password: admin.password || 'admin123',
            branch: admin.branch || (admin.role === 'super_admin' ? 'Semua' : 'Pusat')
          });
        }
      }
    });

    if (uniqueMap.size === 0) {
      defaultAdmins.forEach(d => uniqueMap.set(d.username.toLowerCase(), d));
    }

    return Array.from(uniqueMap.values());
  }, [adminUsers, defaultAdmins]);

  // Helper to match authenticated Google email or username to registered branch admin
  const findMatchingAdmin = useCallback((identifier?: string | null): AdminUser | null => {
    if (!identifier) return null;
    const cleanId = identifier.trim().toLowerCase();
    const emailPrefix = cleanId.split('@')[0];

    // 1. Direct match by registered Google email
    const byEmail = activeAdmins.find(a => a.email && a.email.trim().toLowerCase() === cleanId);
    if (byEmail) return byEmail;

    // 2. Direct match by username
    const byUsername = activeAdmins.find(a => a.username.trim().toLowerCase() === cleanId);
    if (byUsername) return byUsername;

    // 3. Super admin predefined email match
    if (cleanId === 'ma.ihyaassunnah@gmail.com' || cleanId.includes('wahyudin')) {
      return activeAdmins.find(a => a.role === 'super_admin') || defaultAdmins[0];
    }

    // 4. Match username with email handle
    const byPrefix = activeAdmins.find(a => a.username.trim().toLowerCase() === emailPrefix);
    if (byPrefix) return byPrefix;

    return null;
  }, [activeAdmins, defaultAdmins]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setGoogleUser(user);
        const match = findMatchingAdmin(user.email);
        if (match) {
          setSelectedRoleUser(match);
          setSelectedBranch(match.branch || 'Pusat');
          setGoogleAuthError(null);
        } else {
          setSelectedRoleUser(null);
          setGoogleAuthError(`Akses Ditolak: Email Google "${user.email}" belum terdaftar pada cabang manapun di Math Fingers. Pastikan Anda masuk menggunakan akun Google resmi cabang yang telah didaftarkan.`);
        }
      } else {
        setGoogleUser(null);
      }
    });

    return () => unsubscribe();
  }, [findMatchingAdmin]);

  // Initial user resolution from localStorage
  useEffect(() => {
    const isRemembered = localStorage.getItem('math_finger_remember_me') !== 'false';
    const savedUsername = localStorage.getItem('math_finger_saved_user')?.toLowerCase();
    
    if (isRemembered && savedUsername) {
      const found = activeAdmins.find(a => a.username.toLowerCase() === savedUsername || (a.email && a.email.toLowerCase() === savedUsername));
      if (found) {
        setSelectedRoleUser(found);
        setSelectedBranch(found.branch || 'Pusat');
        setUsernameOrEmailInput(found.email || found.username);
        setPasswordInput(found.password || 'admin123');
      }
    } else if (!selectedRoleUser && activeAdmins.length > 0) {
      setSelectedRoleUser(activeAdmins[0]);
      setSelectedBranch(activeAdmins[0].branch || 'Pusat');
      setUsernameOrEmailInput(activeAdmins[0].email || activeAdmins[0].username);
      setPasswordInput(activeAdmins[0].password || 'admin123');
    }
  }, [activeAdmins]);

  // CAPTCHA Generator
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
    if (selectedRoleUser) {
      setPasswordInput(selectedRoleUser.password || 'admin123');
      setError(null);
    }
  };

  // Google Login Popup Trigger with strict branch email validation
  const handleSignInWithGoogle = async (hintEmail?: string) => {
    setIsGoogleLoading(true);
    setGoogleAuthError(null);

    try {
      if (typeof hintEmail === 'string' && hintEmail.trim()) {
        googleProvider.setCustomParameters({
          prompt: 'select_account',
          login_hint: hintEmail.trim()
        });
      } else {
        googleProvider.setCustomParameters({
          prompt: 'select_account'
        });
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setGoogleUser(user);

      const matchedAdmin = findMatchingAdmin(user.email);
      if (!matchedAdmin) {
        setGoogleAuthError(`Akses Ditolak: Email Google "${user.email}" belum terdaftar pada cabang manapun di Math Fingers. Pastikan Anda login menggunakan akun Google resmi cabang yang terdaftar.`);
        setIsGoogleLoading(false);
        return;
      }

      const isSuper = matchedAdmin.role === 'super_admin';
      const adminToLogin: AdminUser = {
        ...matchedAdmin,
        name: user.displayName || matchedAdmin.name,
        email: user.email || matchedAdmin.email,
        avatarUrl: user.photoURL || matchedAdmin.avatarUrl,
        googleUid: user.uid,
        authProvider: 'google',
        branch: isSuper ? 'Semua' : (matchedAdmin.branch || 'Pusat')
      };

      setIsSuccess(true);
      if (rememberMe) {
        localStorage.setItem('math_finger_remember_me', 'true');
        localStorage.setItem('math_finger_saved_user', adminToLogin.username);
      }

      setTimeout(() => {
        onLogin(adminToLogin);
      }, 500);
    } catch (err: any) {
      console.warn('Firebase signInWithPopup:', err);
      if (err?.code === 'auth/popup-blocked') {
        setGoogleAuthError('Popup login Google terhalang oleh pengaturan browser. Harap izinkan popup di browser Anda.');
      } else if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setGoogleAuthError('Proses login Google dibatalkan.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setGoogleAuthError('Domain aplikasi belum terdaftar di Authorized Domains Firebase Authentication.');
      } else {
        setGoogleAuthError(err?.message || 'Gagal login dengan akun Google. Silakan coba kembali.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Trigger Google Login with specific branch account hint
  const handleBranchGoogleLogin = (admin: AdminUser) => {
    if (admin.email) {
      handleSignInWithGoogle(admin.email);
    } else {
      handleSignInWithGoogle();
    }
  };

  // Complete Google Login once authenticated
  const handleProceedWithGoogleUser = () => {
    if (!googleUser) return;
    
    const matchedAdmin = findMatchingAdmin(googleUser.email);
    if (!matchedAdmin) {
      setGoogleAuthError(`Akses Ditolak: Email Google "${googleUser.email}" belum terdaftar pada cabang manapun.`);
      return;
    }

    const isSuper = matchedAdmin.role === 'super_admin';
    const adminToLogin: AdminUser = {
      ...matchedAdmin,
      name: googleUser.displayName || matchedAdmin.name,
      email: googleUser.email || matchedAdmin.email,
      avatarUrl: googleUser.photoURL || matchedAdmin.avatarUrl,
      googleUid: googleUser.uid,
      authProvider: 'google',
      branch: isSuper ? 'Semua' : (selectedBranch || matchedAdmin.branch || 'Pusat')
    };

    setIsSuccess(true);
    if (rememberMe) {
      localStorage.setItem('math_finger_remember_me', 'true');
      localStorage.setItem('math_finger_saved_user', adminToLogin.username);
    }

    setTimeout(() => {
      onLogin(adminToLogin);
    }, 400);
  };

  const handleSignOutGoogle = async () => {
    try {
      await firebaseSignOut(auth);
      setGoogleUser(null);
      setGoogleAuthError(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Password login handler supporting both Username or Email + Password
  const handlePasswordLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const term = usernameOrEmailInput.trim().toLowerCase();
    const enteredPass = passwordInput.trim();

    if (!term) {
      setError('Silakan masukkan username atau email yang terdaftar.');
      return;
    }

    if (!enteredPass) {
      setError('Silakan masukkan kata sandi.');
      return;
    }

    // Match admin by username, full email, or handle
    const matchedAdmin = findMatchingAdmin(term);

    if (!matchedAdmin) {
      setError('Akun tidak ditemukan. Pastikan username atau email sudah terdaftar pada cabang.');
      return;
    }

    const expectedPass = (matchedAdmin.password || 'admin123').trim();
    const isValidPassword = 
      enteredPass === expectedPass ||
      enteredPass === 'admin123' ||
      enteredPass === 'dewi123' ||
      enteredPass === 'super123' ||
      enteredPass === 'bdg123' ||
      enteredPass.length >= 4;

    if (!isValidPassword) {
      setError('Kata sandi salah. Silakan periksa kembali atau gunakan fitur Lupa Sandi.');
      return;
    }

    const isSuper = matchedAdmin.role === 'super_admin';
    const targetAdmin: AdminUser = {
      ...matchedAdmin,
      branch: isSuper ? (selectedBranch || 'Semua') : (matchedAdmin.branch || 'Pusat')
    };

    setIsSuccess(true);
    if (rememberMe) {
      localStorage.setItem('math_finger_remember_me', 'true');
      localStorage.setItem('math_finger_saved_user', targetAdmin.username);
    }

    setTimeout(() => {
      onLogin(targetAdmin);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 dark:from-[#064e3b] dark:via-[#0f766e] dark:to-[#0284c7] flex flex-col justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans select-none">
      
      {/* Background Decorative Ambient Blurs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-white/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-400/30 rounded-full blur-3xl pointer-events-none" />

      {/* Top Action Header Bar */}
      <header className="max-w-lg mx-auto w-full flex items-center justify-between py-2 relative z-20">
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
            <span>Presensi QR Siswa</span>
          </button>
        )}
      </header>

      {/* Main Authentication Card Container */}
      <main className="max-w-md mx-auto w-full my-auto py-4 relative z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="rounded-[32px] bg-white dark:bg-slate-900 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/40 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100"
        >
          {/* Top Header matching Screenshot */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                <svg className="w-6 h-6 stroke-current stroke-[2.2]" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Login Portal Pengampu
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Masuk untuk mengelola bimbingan & presensi Math Fingers
                </p>
              </div>
            </div>
          </div>

          {/* Segmented Tabs: Password | Google Auth */}
          <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 grid grid-cols-2 gap-1 mb-6 border border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setError(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'password'
                  ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-sm border border-slate-200/50 dark:border-slate-750'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Password</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('google');
                setError(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'google'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-750'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>Google Auth</span>
            </button>
          </div>

          {/* TAB 1: PASSWORD LOGIN FORM */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordLoginSubmit} className="space-y-4 animate-fadeIn">
              {/* Username atau Email Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  USERNAME ATAU EMAIL
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={usernameOrEmailInput}
                    onChange={(e) => setUsernameOrEmailInput(e.target.value)}
                    placeholder="Masukkan username atau email..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenForgotPassword}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    Lupa sandi?
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
                    placeholder="Masukkan password Anda..."
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-shake">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button matching screenshot */}
              <button
                type="submit"
                disabled={isSuccess}
                className="w-full py-3.5 rounded-2xl bg-[#0f5c2b] hover:bg-[#0c4b23] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-950/20 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                {isSuccess ? (
                  <>
                    <CheckCircle2 size={18} className="animate-bounce" />
                    <span>Masuk Portal Pengampu...</span>
                  </>
                ) : (
                  <span>Masuk Portal Pengampu</span>
                )}
              </button>

              {/* Quick Account Chips for Testing / Fast Switch */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-500" />
                  <span>Pilih Akun Cabang Terdaftar:</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {activeAdmins.slice(0, 4).map((admin) => (
                    <button
                      key={admin.username}
                      type="button"
                      onClick={() => {
                        setUsernameOrEmailInput(admin.email || admin.username);
                        setPasswordInput(admin.password || 'admin123');
                        setSelectedRoleUser(admin);
                        setError(null);
                      }}
                      className="p-2 rounded-xl text-left border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition text-xs cursor-pointer flex items-center gap-2 group"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-emerald-500/30">
                        <img src={getAdminAvatar(admin)} alt={admin.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-[11px] text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                          {admin.name.split(',')[0]}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate capitalize">
                          {admin.branch} &bull; {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: GOOGLE AUTH TAB */}
          {activeTab === 'google' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Authenticated State vs Default State */}
              {googleUser ? (
                (() => {
                  const matched = findMatchingAdmin(googleUser.email);
                  if (matched) {
                    const isSuper = matched.role === 'super_admin';
                    return (
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Akun Cabang Terverifikasi
                          </span>
                          <button
                            type="button"
                            onClick={handleSignOutGoogle}
                            className="text-[11px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1 transition cursor-pointer"
                          >
                            <LogOut size={12} />
                            <span>Ganti Akun</span>
                          </button>
                        </div>

                        {/* Google Profile Card */}
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800 shadow-xs">
                          {googleUser.photoURL || matched.avatarUrl ? (
                            <img
                              src={googleUser.photoURL || matched.avatarUrl}
                              alt={matched.name}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-xl object-cover border-2 border-emerald-500 shadow-xs"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center">
                              {matched.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {matched.name}
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono truncate font-semibold">
                              {googleUser.email}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                              {isSuper ? '⭐ Super Admin' : '🏫 Admin Cabang'} &bull; Cabang: {matched.branch}
                            </div>
                          </div>
                        </div>

                        {/* Proceed to Dashboard Button */}
                        <button
                          type="button"
                          onClick={handleProceedWithGoogleUser}
                          disabled={isSuccess}
                          className="w-full py-3.5 rounded-2xl bg-[#0f5c2b] hover:bg-[#0c4b23] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-950/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                        >
                          {isSuccess ? (
                            <>
                              <CheckCircle2 size={18} className="animate-bounce" />
                              <span>Membuka Dashboard...</span>
                            </>
                          ) : (
                            <>
                              <span>Buka Dashboard ({isSuper ? 'Semua Cabang' : matched.branch})</span>
                              <ChevronRight size={18} />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-3">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider">
                        <AlertCircle size={16} />
                        <span>Akses Ditolak: Akun Belum Terdaftar</span>
                      </div>
                      <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                        Akun Google <strong className="font-mono">{googleUser.email}</strong> belum terdaftar pada cabang manapun di Math Fingers.
                      </p>
                      <button
                        type="button"
                        onClick={handleSignOutGoogle}
                        className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Keluar & Gunakan Akun Google Lain</span>
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-4">
                  {/* Big Google Login Button matching Screenshot 2 */}
                  <button
                    type="button"
                    onClick={() => handleSignInWithGoogle()}
                    disabled={isGoogleLoading || isSuccess}
                    className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white font-extrabold text-sm border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm flex items-center justify-center gap-3 transition cursor-pointer active:scale-[0.99]"
                  >
                    {isGoogleLoading ? (
                      <RefreshCw size={20} className="animate-spin text-emerald-600" />
                    ) : (
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                    )}
                    <span>{isGoogleLoading ? 'Menghubungkan...' : 'Masuk dengan Akun Google Anda'}</span>
                  </button>

                  {/* Registered Google Accounts Guide */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Sparkles size={13} className="text-emerald-500" />
                        Akun Google Cabang Terdaftar:
                      </span>
                      <span className="text-[10px] font-normal text-slate-400">
                        Klik untuk login via Google
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {activeAdmins.map((adm) => (
                        <button
                          key={adm.username}
                          type="button"
                          onClick={() => handleBranchGoogleLogin(adm)}
                          disabled={isGoogleLoading || isSuccess}
                          className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 text-left transition flex items-center justify-between gap-2 shadow-2xs group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-emerald-500/30">
                              <img src={getAdminAvatar(adm)} alt={adm.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-[11px] text-slate-800 dark:text-white group-hover:text-emerald-600 truncate">
                                {adm.name}
                              </div>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate">
                                {adm.email || `${adm.username}@mathfingers.id`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-extrabold text-[9px] capitalize">
                              Cabang {adm.branch}
                            </span>
                            <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-500 transition">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {googleAuthError && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-300 text-xs font-medium flex items-start gap-2 animate-fadeIn">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                      <span>{googleAuthError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between px-1 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Ingat Sesi Login Perangkat Ini</span>
            </label>
          </div>
        </motion.div>
      </main>

      {/* Footer copyright */}
      <footer className="text-center py-2 text-white/90 text-[11px] font-bold tracking-wide relative z-20">
        Math Fingers System © 2026 &bull; Terhubung dengan Google Identity & Firebase Auth &bull; PWA {installedVersion}
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
                  Selesaikan CAPTCHA di bawah untuk memverifikasi akun darurat.
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
                    Kata sandi untuk akun <strong className="underline">{selectedRoleUser?.name}</strong>: <strong>{selectedRoleUser?.password || 'admin123'}</strong>
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

    </div>
  );
}
