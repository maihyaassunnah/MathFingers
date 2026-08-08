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
  Search, 
  Sun, 
  Moon, 
  Sparkles, 
  QrCode, 
  RefreshCw, 
  Wifi, 
  Lock, 
  Users, 
  Crown, 
  MapPin, 
  X,
  ChevronRight,
  ShieldCheck,
  HelpCircle
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
  
  // Filter & Search states
  const [activeTab, setActiveTab] = useState<'all' | 'pusat' | 'cabang'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

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
      }
    }
  }, [activeAdmins]);

  // Filter admins based on activeTab, searchQuery, and branch filter
  const filteredAdmins = useMemo(() => {
    const list = activeAdmins.filter(admin => {
      const matchesRoleTab = 
        activeTab === 'all' ? true :
        activeTab === 'pusat' ? admin.role === 'super_admin' || admin.branch === 'Pusat' :
        admin.role === 'branch_admin' && admin.branch !== 'Pusat';

      const matchesBranchFilter = 
        selectedBranchFilter === 'all' ? true : 
        admin.branch.toLowerCase() === selectedBranchFilter.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        admin.name.toLowerCase().includes(q) ||
        admin.username.toLowerCase().includes(q) ||
        admin.branch.toLowerCase().includes(q);

      return matchesRoleTab && matchesBranchFilter && matchesSearch;
    });

    // Always sort Super Admin / Pusat accounts to the top
    return [...list].sort((a, b) => {
      const aIsSuper = a.role === 'super_admin' || a.branch === 'Pusat';
      const bIsSuper = b.role === 'super_admin' || b.branch === 'Pusat';
      if (aIsSuper && !bIsSuper) return -1;
      if (!aIsSuper && bIsSuper) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [activeAdmins, activeTab, selectedBranchFilter, searchQuery]);

  // Counts for tabs
  const countPusat = useMemo(() => 
    activeAdmins.filter(a => a.role === 'super_admin' || a.branch === 'Pusat').length
  , [activeAdmins]);

  const countCabang = useMemo(() => 
    activeAdmins.filter(a => a.role === 'branch_admin' && a.branch !== 'Pusat').length
  , [activeAdmins]);

  // Unique branch names from admin list and branches list
  const availableBranches = useMemo(() => {
    const list = new Set<string>();
    activeAdmins.forEach(a => { if (a.branch) list.add(a.branch); });
    branches.forEach(b => { if (b.name) list.add(b.name); });
    return Array.from(list);
  }, [activeAdmins, branches]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Silakan pilih akun administrator terlebih dahulu.');
      return;
    }

    const correctPassword = selectedUser.password || 'admin123';
    if (passwordInput !== correctPassword) {
      setError('Kata sandi salah. Silakan periksa kembali.');
      return;
    }

    // Persist Remember Me preference in localStorage
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
    }, 600);
  };

  const handleUserSelect = (user: AdminUser) => {
    setSelectedUser(user);
    setPasswordInput('');
    setError(null);
  };

  const handleAutoFillDefaultPassword = () => {
    if (selectedUser) {
      setPasswordInput(selectedUser.password || 'admin123');
      setError(null);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between pt-12 sm:pt-6 pb-4 sm:pb-6 px-3.5 sm:px-6 md:p-8 transition-colors duration-300 relative overflow-x-hidden ${
      isLight ? 'bg-[#fcfbf7] math-pattern-light text-slate-800' : 'bg-[#0f172a] math-pattern-dark text-slate-100'
    }`}>
      
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-80 sm:w-96 h-80 sm:h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TOP NAVBAR */}
      <header className="max-w-2xl sm:max-w-6xl mx-auto w-full flex items-center justify-between gap-2 py-2.5 px-3.5 sm:px-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-xs z-10">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <MathFingerLogo size={32} showText={true} theme={theme} />
          
          {/* Mobile Right Quick Action Icons */}
          <div className="flex items-center gap-1.5 sm:hidden">
            {onOpenSelfAttendance && (
              <button
                type="button"
                onClick={onOpenSelfAttendance}
                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform"
                title="Presensi Mandiri Siswa"
              >
                <QrCode size={15} />
                <span className="text-[10px] font-bold">QR Siswa</span>
              </button>
            )}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform"
                title="Ganti Tema"
              >
                {isLight ? <Moon size={15} /> : <Sun size={15} />}
              </button>
            )}
          </div>
        </div>

        {/* Desktop Header Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Presensi Mandiri Button */}
          {onOpenSelfAttendance && (
            <button
              type="button"
              onClick={onOpenSelfAttendance}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs hover:scale-[1.02] active:scale-95"
            >
              <QrCode size={15} className="text-emerald-500" />
              <span>Presensi Mandiri Siswa</span>
            </button>
          )}

          {/* Live Cloud Status Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi size={13} className="text-emerald-500" />
            <span>Sistem Multi-Cabang Active</span>
          </div>

          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all hover:scale-105 active:scale-95"
              title={isLight ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
            >
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN LOGIN CONTAINER WITH FADE-IN-UP ANIMATION */}
      <main className="max-w-2xl mx-auto w-full my-4 sm:my-8 z-10">
        <motion.div 
          id="login-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={`p-5 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all duration-300 relative overflow-hidden backdrop-blur-2xl ${
            isLight 
              ? 'bg-white/80 border-white/80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)]' 
              : 'bg-slate-900/80 border-slate-700/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)]'
          }`}
        >
          {/* Subtle Top Glass Reflection Overlay */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/20 dark:from-white/5 to-transparent pointer-events-none" />

          {/* Top Gradient Ribbon Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-teal-500 to-emerald-500 shadow-sm" />

          {/* Header Portal Title */}
          <div className="text-center mb-5 sm:mb-6">
            <div className="flex justify-center mb-3 sm:mb-4">
              <MathFingerLogo size={46} showText={true} theme={theme} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider mb-2.5">
              <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
              <span>Portal Administrator Multi-Cabang</span>
            </div>
            
            <h2 className={`text-xl sm:text-3xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Masuk ke Dashboard
            </h2>
            <p className={`text-xs sm:text-sm mt-1 max-w-lg mx-auto leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Pilih akun administrator <strong className="text-indigo-500 font-bold">Pusat</strong> atau <strong className="text-emerald-500 font-bold">Cabang</strong> Anda untuk masuk.
            </p>
          </div>

          {/* SECTION 1: ACCOUNT SELECTION */}
          {!selectedUser ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3.5 sm:space-y-4"
            >
              {/* Category Segmented Control / Tabs */}
              <div className={`p-1 rounded-xl sm:rounded-2xl border flex items-center gap-1 ${
                isLight ? 'bg-slate-100/80 border-slate-200/80' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    activeTab === 'all'
                      ? isLight
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'bg-slate-800 text-white shadow-xs'
                      : isLight
                        ? 'text-slate-500 hover:text-slate-800'
                        : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users size={13} className="shrink-0" />
                  <span className="hidden sm:inline">Semua Akun</span>
                  <span className="inline sm:hidden">Semua</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-bold">
                    {activeAdmins.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pusat')}
                  className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    activeTab === 'pusat'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isLight
                        ? 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                        : 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-950/30'
                  }`}
                >
                  <Crown size={13} className={`shrink-0 ${activeTab === 'pusat' ? 'text-amber-300' : 'text-indigo-500'}`} />
                  <span className="hidden sm:inline">Kantor Pusat</span>
                  <span className="inline sm:hidden">Pusat</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'pusat' ? 'bg-indigo-500 text-white' : 'bg-indigo-500/10 text-indigo-500'
                  }`}>
                    {countPusat}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('cabang')}
                  className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    activeTab === 'cabang'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isLight
                        ? 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                        : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30'
                  }`}
                >
                  <Building size={13} className={`shrink-0 ${activeTab === 'cabang' ? 'text-emerald-200' : 'text-emerald-500'}`} />
                  <span className="hidden sm:inline">Admin Cabang</span>
                  <span className="inline sm:hidden">Cabang</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'cabang' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {countCabang}
                  </span>
                </button>
              </div>

              {/* Search & Branch Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama admin / cabang..."
                    className={`w-full pl-8 pr-8 py-2 sm:py-2.5 rounded-xl border text-xs font-medium outline-none transition focus:ring-2 focus:ring-emerald-500/20 ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-emerald-500' 
                        : 'bg-slate-950/50 border-slate-800 text-slate-200 focus:bg-slate-950 focus:border-emerald-500'
                    }`}
                  />
                  <Search size={13} className="absolute left-2.5 top-2.5 sm:top-3 text-slate-400" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div>
                  <select
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    className={`w-full px-2.5 py-2 sm:py-2.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer transition ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-emerald-500' 
                        : 'bg-slate-950/50 border-slate-800 text-slate-200 focus:bg-slate-950 focus:border-emerald-500'
                    }`}
                  >
                    <option value="all">Semua Cabang</option>
                    {availableBranches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] sm:max-h-[320px] overflow-y-auto pr-0.5">
                {filteredAdmins.length === 0 ? (
                  <div className="col-span-full py-6 text-center text-slate-400">
                    <AlertCircle size={24} className="mx-auto mb-1.5 opacity-50" />
                    <p className="text-xs font-semibold">Tidak ada akun administrator yang sesuai.</p>
                  </div>
                ) : (
                  filteredAdmins.map((admin) => {
                    const isSuper = admin.role === 'super_admin' || admin.branch === 'Pusat';
                    return (
                      <motion.button
                        key={admin.username}
                        type="button"
                        whileHover={{ scale: 1.01, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleUserSelect(admin)}
                        className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between gap-2.5 group relative overflow-hidden ${
                          isSuper
                            ? isLight
                              ? 'border-indigo-100 hover:border-indigo-400 bg-gradient-to-r from-indigo-50/60 via-purple-50/20 to-white text-slate-800 shadow-2xs hover:shadow-indigo-500/10'
                              : 'border-indigo-900/40 hover:border-indigo-500 bg-gradient-to-r from-indigo-950/30 via-slate-900 to-slate-900 text-slate-100 shadow-2xs hover:shadow-indigo-500/20'
                            : isLight
                              ? 'border-emerald-100 hover:border-emerald-400 bg-gradient-to-r from-emerald-50/60 via-teal-50/20 to-white text-slate-800 shadow-2xs hover:shadow-emerald-500/10'
                              : 'border-emerald-900/40 hover:border-emerald-500 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 text-slate-100 shadow-2xs hover:shadow-emerald-500/20'
                        }`}
                      >
                        {/* Profile Avatar & Info */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={getAdminAvatar(admin)}
                              alt={admin.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-xs group-hover:scale-105 transition-transform"
                            />
                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                              isSuper ? 'bg-indigo-500' : 'bg-emerald-500'
                            }`}>
                              {isSuper ? <Crown size={8} className="text-white" /> : <Building size={8} className="text-white" />}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-extrabold leading-tight truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {admin.name}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                              {isSuper ? (
                                <span className="inline-flex items-center gap-0.5 font-bold text-indigo-500 dark:text-indigo-400">
                                  <Shield size={10} />
                                  <span>Kantor Pusat</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                                  <MapPin size={10} />
                                  <span>Cabang {admin.branch}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Role Pill Badge */}
                        <div className="shrink-0 flex items-center gap-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider whitespace-nowrap ${
                            isSuper
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isSuper ? 'PUSAT' : admin.branch}
                          </span>
                          <ChevronRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          ) : (
            
            /* SECTION 2: PASSWORD ENTRY FOR SELECTED ACCOUNT */
            <motion.form 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleLoginSubmit} 
              className="space-y-4"
            >
              {/* Selected Profile Banner */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 ${
                selectedUser.role === 'super_admin'
                  ? 'bg-indigo-500/10 border-indigo-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={getAdminAvatar(selectedUser)}
                    alt={selectedUser.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-xs"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-black truncate text-slate-900 dark:text-white flex items-center gap-1">
                      <span>{selectedUser.name}</span>
                      <Check size={13} className="text-emerald-500 shrink-0" />
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedUser.role === 'super_admin' ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                          <Crown size={11} /> Super Admin Kantor Pusat
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Building size={11} /> Admin Cabang {selectedUser.branch}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setPasswordInput('');
                    setError(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <RefreshCw size={11} />
                  <span>Ganti</span>
                </button>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] sm:text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Kata Sandi Keamanan
                  </label>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password-input"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="Masukkan kata sandi..."
                    disabled={isSuccess}
                    autoFocus
                    className={`w-full pl-9 pr-10 py-3 rounded-xl border text-xs sm:text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                      error 
                        ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                        : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500 focus:bg-white'
                          : 'bg-slate-950/60 border-slate-800 text-white focus:border-emerald-500 focus:bg-slate-950'
                    }`}
                  />
                  <Key size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
                  
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all focus:outline-none"
                    title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Checkbox 'Ingat Saya' & Link 'Lupa Kata Sandi?' */}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      rememberMe 
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
                        : isLight 
                          ? 'border-slate-300 group-hover:border-emerald-500 bg-white' 
                          : 'border-slate-700 group-hover:border-emerald-500 bg-slate-950'
                    }`}>
                      <input 
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="sr-only"
                      />
                      {rememberMe && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Ingat Saya
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors cursor-pointer"
                  >
                    Lupa Kata Sandi?
                  </button>
                </div>
              </div>

              {/* Error Message Banner */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-start gap-2.5" 
                  id="login-error-banner"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed font-semibold">{error}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                id="login-submit-button"
                disabled={isSuccess || !passwordInput}
                className={`w-full py-3.5 rounded-xl sm:rounded-2xl font-extrabold text-xs sm:text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-98 shadow-md ${
                  isSuccess
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                    : !passwordInput
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                      : selectedUser.role === 'super_admin'
                        ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/20 hover:shadow-lg'
                        : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 hover:shadow-lg'
                }`}
              >
                {isSuccess ? (
                  <>
                    <UserCheck size={18} className="animate-pulse" />
                    <span>Autentikasi Berhasil, Memuat...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {selectedUser.role === 'super_admin' ? 'Masuk Dashboard Pusat' : `Masuk Cabang ${selectedUser.branch}`}
                    </span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </motion.form>
          )}

        </motion.div>

        {/* 3. FEATURE HIGHLIGHT BADGES AT BOTTOM */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-6">
          <div className={`p-3 rounded-xl border text-center ${
            isLight ? 'bg-white/70 border-slate-200/70' : 'bg-slate-900/50 border-slate-800/60'
          }`}>
            <Lock size={15} className="mx-auto text-indigo-500 mb-1" />
            <div className="text-xs font-bold">Sesi Terisolasi</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Akses data terpisah per cabang</div>
          </div>

          <div className={`p-3 rounded-xl border text-center ${
            isLight ? 'bg-white/70 border-slate-200/70' : 'bg-slate-900/50 border-slate-800/60'
          }`}>
            <Sparkles size={15} className="mx-auto text-amber-500 mb-1" />
            <div className="text-xs font-bold">Sinkron Cloud & Offline</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Data aman tersimpan otomatis</div>
          </div>

          <div className={`p-3 rounded-xl border text-center ${
            isLight ? 'bg-white/70 border-slate-200/70' : 'bg-slate-900/50 border-slate-800/60'
          }`}>
            <QrCode size={15} className="mx-auto text-emerald-500 mb-1" />
            <div className="text-xs font-bold">Presensi QR Mandiri</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Mode scan kartu tanpa login admin</div>
          </div>
        </div>
      </main>

      {/* 4. FOOTER WITH COPYRIGHT & CREATOR ATTRIBUTION */}
      <footer className="text-center py-4 z-10 space-y-1">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Math Fingers Privat Tutor System &copy; {new Date().getFullYear()} • Berhitung Cepat & Akurat Tanpa Alat
        </p>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <span>Developed by</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-extrabold">
            Wahyudin Hafiz
          </span>
        </p>
      </footer>

      {/* 5. FORGOT PASSWORD HELPER MODAL */}
      <AnimatePresence>
        {showForgotPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl relative ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="absolute top-4 right-4 p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0">
                  <HelpCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Bantuan Kata Sandi</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Petunjuk Pemulihan Akun Administrator</p>
                </div>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <p>
                  Untuk keamanan akun administrator, kata sandi dienkripsi. Jika Anda lupa kata sandi akun <strong>{selectedUser?.name || 'Administrator'}</strong>, Anda dapat mengisi sandi terdaftar secara otomatis atau menghubungi Super Admin.
                </p>

                <p>
                  Jika Anda mengalami kendala atau perlu menyetel ulang kata sandi, silakan hubungi <strong>Super Admin (Wahyudin Hafiz, S.Pd)</strong>.
                </p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                {selectedUser && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAutoFillDefaultPassword();
                      setShowForgotPasswordModal(false);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Check size={14} />
                    <span>Isi Sandi Terdaftar Otomatis</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-colors ${
                    isLight 
                      ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' 
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
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
