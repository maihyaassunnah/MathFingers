import React, { useState } from 'react';
import { MathFingerLogo } from './MathFingerLogo';
import { Shield, ArrowRight, UserCheck, AlertCircle, Key, ChevronDown, Check, Building } from 'lucide-react';
import { AdminUser, Branch } from '../types';

interface LoginManagerProps {
  onLogin: (user: AdminUser) => void;
  theme: 'light' | 'dark';
  adminUsers: AdminUser[];
  branches: Branch[];
}

export function LoginManager({ onLogin, theme, adminUsers = [], branches = [] }: LoginManagerProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);

  const isLight = theme === 'light';

  // Fallback default admins if none fetched yet
  const defaultAdmins: AdminUser[] = [
    { username: 'febrianti', name: 'Febrianti Dewi', role: 'super_admin', branch: 'Pusat', password: 'admin123' },
    { username: 'dewi', name: 'Dewi Safitri', role: 'branch_admin', branch: 'Pusat', password: 'dewi123' },
    { username: 'les_bandung', name: 'Les Privat Bandung', role: 'branch_admin', branch: 'Bandung', password: 'bdg123' }
  ];

  const activeAdmins = adminUsers.length > 0 ? adminUsers : defaultAdmins;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Silakan pilih salah satu akun terlebih dahulu.');
      return;
    }

    // Check password
    const correctPassword = selectedUser.password || 'admin123'; // fallback default
    if (passwordInput !== correctPassword) {
      setError('Kata sandi salah. Silakan coba lagi.');
      return;
    }

    setIsSuccess(true);
    setError(null);

    // Brief delayed transition for visual satisfaction
    setTimeout(() => {
      onLogin(selectedUser);
    }, 700);
  };

  const handleUserSelect = (user: AdminUser) => {
    setSelectedUser(user);
    setPasswordInput('');
    setError(null);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors duration-150 ${
      isLight ? 'bg-[#fdfbf7]' : 'bg-[#0f172a]'
    }`} id="login-container">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <MathFingerLogo size={42} showText={true} theme={theme} />
      </div>

      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className={`p-8 rounded-3xl border shadow-xl transition-all relative overflow-hidden ${
          isLight 
            ? 'bg-white border-slate-150 shadow-slate-100' 
            : 'bg-slate-900/90 border-slate-800 shadow-slate-950/20'
        }`} id="login-card">
          {/* Top subtle line/glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

          <div className="text-center mb-6">
            <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
              isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-950/40 text-emerald-400'
            }`} id="login-shield-icon">
              <Shield size={24} />
            </div>
            <h2 className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-850' : 'text-white'}`}>
              Portal Multi-Cabang
            </h2>
            <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Pilih akun administrator Anda untuk masuk ke dashboard cabang Anda secara aman.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            
            {/* Quick Select Buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Akun Administrator ({activeAdmins.length})
                </label>
                {activeAdmins.length > 2 && (
                  <button 
                    type="button" 
                    onClick={() => setShowAllUsers(!showAllUsers)}
                    className="text-[10px] font-bold text-emerald-500 hover:underline"
                  >
                    {showAllUsers ? 'Sembunyikan' : 'Lihat Semua'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-[190px] overflow-y-auto pr-1">
                {activeAdmins.slice(0, showAllUsers ? activeAdmins.length : 2).map((admin) => {
                  const isSelected = selectedUser?.username === admin.username;
                  const isSuper = admin.role === 'super_admin';
                  return (
                    <button
                      key={admin.username}
                      type="button"
                      id={`login-user-${admin.username}`}
                      onClick={() => handleUserSelect(admin)}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold scale-[1.01]'
                          : isLight
                            ? 'border-slate-100 hover:border-slate-200 bg-slate-50 text-slate-700'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950/30 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar initials fallback */}
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isSelected 
                            ? 'bg-emerald-500 text-white' 
                            : isLight 
                              ? 'bg-slate-200 text-slate-600' 
                              : 'bg-slate-800 text-slate-400'
                        }`}>
                          {admin.name.split(' ').slice(0,2).map(n => n[0]).join('')}
                        </span>
                        <div>
                          <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                            <span>{admin.name}</span>
                            {isSelected && <Check size={12} className="text-emerald-500" />}
                          </div>
                          <div className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-1">
                            <Building size={10} className="text-slate-500 shrink-0" />
                            <span>Cabang {admin.branch}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isSuper 
                          ? 'bg-indigo-500/10 text-indigo-500' 
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {isSuper ? 'Super Admin' : 'Admin'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Password input displays when user is selected */}
            {selectedUser && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Masukkan Kata Sandi
                  </label>
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    Sandi default: {selectedUser.password || `${selectedUser.username}123`}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    id="login-password-input"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="Masukkan sandi..."
                    disabled={isSuccess}
                    className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                      error 
                        ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                        : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500 focus:bg-white'
                          : 'bg-slate-950/40 border-slate-800 text-white focus:border-emerald-500 focus:bg-slate-950/80'
                    }`}
                  />
                  <Key size={14} className="absolute left-3.5 top-4.5 text-slate-400" />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-start gap-2.5 animate-shake" id="login-error-banner">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit-button"
              disabled={isSuccess || !selectedUser || !passwordInput}
              className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 ${
                isSuccess
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : (!selectedUser || !passwordInput)
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white shadow-lg hover:shadow-emerald-500/10'
              }`}
            >
              {isSuccess ? (
                <>
                  <UserCheck size={18} className="animate-pulse" />
                  <span>Autentikasi Berhasil...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

          </form>
        </div>

        {/* Footer Info */}
        <p className="text-[10px] text-slate-500 text-center mt-6 tracking-wide">
          Math Fingers Privat Tutor System &copy; {new Date().getFullYear()} • Keamanan Sesi Cabang Terisolasi
        </p>
      </div>
    </div>
  );
}
