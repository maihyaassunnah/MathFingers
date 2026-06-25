import React, { useState } from 'react';
import { MathFingerLogo } from './MathFingerLogo';
import { Shield, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';

interface LoginManagerProps {
  onLogin: (adminName: string) => void;
  theme: 'light' | 'dark';
}

export function LoginManager({ onLogin, theme }: LoginManagerProps) {
  const [inputName, setInputName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const isLight = theme === 'light';

  const admins = ['Febrianti Dewi', 'Dewi Safitri'];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameToValidate = (selectedPreset || inputName).trim();
    
    // Case-insensitive matching with authorized admins
    const matchedAdmin = admins.find(
      (admin) => admin.toLowerCase() === nameToValidate.toLowerCase()
    );

    if (matchedAdmin) {
      setIsSuccess(true);
      setError(null);
      // Brief delayed transition for visual satisfaction
      setTimeout(() => {
        onLogin(matchedAdmin);
      }, 700);
    } else {
      setError('Nama administrator tidak terdaftar. Periksa kembali ejaan nama Anda.');
    }
  };

  const handlePresetSelect = (name: string) => {
    setSelectedPreset(name);
    setInputName(name);
    setError(null);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors duration-150 ${
      isLight ? 'bg-[#fdfbf7]' : 'bg-[#0f172a]'
    }`}>
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <MathFingerLogo size={42} showText={true} theme={theme} />
      </div>

      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className={`p-8 rounded-3xl border shadow-xl transition-all relative overflow-hidden ${
          isLight 
            ? 'bg-white border-slate-150 shadow-slate-100' 
            : 'bg-slate-900/90 border-slate-800 shadow-slate-950/20'
        }`}>
          {/* Top subtle line/glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500" />

          <div className="text-center mb-8">
            <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-950/40 text-emerald-400'
            }`}>
              <Shield size={24} />
            </div>
            <h2 className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-850' : 'text-white'}`}>
              Autentikasi Admin
            </h2>
            <p className={`text-xs mt-1.5 leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Silakan masukkan atau pilih nama administrator Anda untuk mengakses sistem manajemen Math Fingers.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            
            {/* Quick Select Buttons */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Pilih Akun Administrator
              </label>
              <div className="grid grid-cols-2 gap-3">
                {admins.map((admin) => {
                  const isSelected = selectedPreset === admin;
                  return (
                    <button
                      key={admin}
                      type="button"
                      onClick={() => handlePresetSelect(admin)}
                      className={`p-3.5 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-2 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-bold scale-[1.02]'
                          : isLight
                            ? 'border-slate-100 hover:border-slate-200 bg-slate-50 text-slate-700'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950/30 text-slate-300'
                      }`}
                    >
                      {/* Avatar initials fallback */}
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                        isSelected 
                          ? 'bg-emerald-500 text-white' 
                          : isLight 
                            ? 'bg-slate-200 text-slate-600' 
                            : 'bg-slate-800 text-slate-400'
                      }`}>
                        {admin.split(' ').map(n => n[0]).join('')}
                      </span>
                      <span className="text-xs tracking-tight whitespace-nowrap">{admin}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center my-4">
              <div className={`flex-1 border-t ${isLight ? 'border-slate-100' : 'border-slate-800'}`} />
              <span className="mx-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">ATAU TULIS MANUAL</span>
              <div className={`flex-1 border-t ${isLight ? 'border-slate-100' : 'border-slate-800'}`} />
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Nama Administrator
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => {
                    setInputName(e.target.value);
                    setSelectedPreset(null);
                    setError(null);
                  }}
                  placeholder="Ketik nama lengkap Anda..."
                  disabled={isSuccess}
                  className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    error 
                      ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                      : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500 focus:bg-white'
                        : 'bg-slate-950/40 border-slate-800 text-white focus:border-emerald-500 focus:bg-slate-950/80'
                  }`}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-start gap-2.5 animate-shake">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSuccess || (!inputName.trim() && !selectedPreset)}
              className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 ${
                isSuccess
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : (!inputName.trim() && !selectedPreset)
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
          Math Fingers Privat Tutor System &copy; {new Date().getFullYear()} • Keamanan Sesi Lokal
        </p>
      </div>
    </div>
  );
}
