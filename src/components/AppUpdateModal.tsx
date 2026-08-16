import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Layers, 
  Building, 
  X, 
  ArrowRight, 
  TrendingUp,
  QrCode,
  Receipt,
  Check,
  AlertTriangle,
  Smartphone
} from 'lucide-react';
import { AdminUser } from '../types';

export const LATEST_APP_VERSION = 'v3.3.0';
export const APP_RELEASE_DATE = 'Agustus 2026';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser | null;
  theme: 'light' | 'dark';
  onUpdateSuccess?: () => void;
  isMandatory?: boolean;
  installedVersion?: string;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  theme,
  onUpdateSuccess,
  isMandatory = true,
  installedVersion = 'v2.5.0'
}) => {
  const [updateStatus, setUpdateStatus] = useState<'prompt' | 'updating' | 'success'>('prompt');
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Mempersiapkan berkas pembaruan...');

  const isLight = theme === 'light';

  // Detect standalone PWA mode
  const isPwaInstalled = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  useEffect(() => {
    if (isOpen) {
      setUpdateStatus('prompt');
      setProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartUpdate = () => {
    setUpdateStatus('updating');
    setProgress(10);
    setStatusText('Mengunduh paket PWA & modul komponen terbaru...');

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setTimeout(() => {
            setProgress(100);
            setStatusText('Memperbarui Service Worker Cache & melesetkan data lokal...');
            
            setTimeout(() => {
              // Save installed version for global, user-level, and branch-level keys
              localStorage.setItem('math_finggers_installed_version', LATEST_APP_VERSION);
              if (currentUser?.username) {
                localStorage.setItem(`math_finggers_installed_version_user_${currentUser.username}`, LATEST_APP_VERSION);
              }
              if (currentUser?.branch) {
                localStorage.setItem(`math_finggers_installed_version_branch_${currentUser.branch}`, LATEST_APP_VERSION);
              }
              localStorage.setItem('math_finggers_update_timestamp', new Date().toISOString());

              // Trigger Service Worker Cache Updates if SW is supported
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                  for (let registration of registrations) {
                    registration.update();
                  }
                }).catch((err) => console.warn('Service worker update call skipped:', err));
              }

              setUpdateStatus('success');
              if (onUpdateSuccess) onUpdateSuccess();
            }, 600);
          }, 300);
          return 90;
        }
        if (prev < 40) setStatusText('Memperbarui Service Worker cache, QR Scanner & komponen UI...');
        else if (prev < 70) setStatusText('Mengoptimalkan database offline & latensi jaringan...');
        else setStatusText('Memverifikasi integritas versi PWA cabang...');
        return prev + 15;
      });
    }, 250);
  };

  const branchName = currentUser?.role === 'branch_admin' ? currentUser.branch : (currentUser?.branch || 'Pusat');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (isMandatory && updateStatus !== 'success') {
          e.stopPropagation();
        }
      }}
    >
      <div 
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          isLight 
            ? 'bg-white border-slate-200 text-slate-800 shadow-emerald-950/10' 
            : 'bg-slate-900 border-emerald-500/30 text-slate-100 shadow-black/80'
        }`}
      >
        {/* Header decoration bar */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

        {/* Close Button */}
        {(!isMandatory || updateStatus === 'success') && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-full transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X size={16} />
          </button>
        )}

        {/* Modal Header Content */}
        <div className="pt-4 px-5 pb-3 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold tracking-wide border border-emerald-500/25">
              <Sparkles size={12} className="text-amber-400 animate-pulse" />
              <span>Update PWA</span>
            </span>
            
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
              {LATEST_APP_VERSION}
            </span>

            {isPwaInstalled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold">
                <Smartphone size={11} />
                <span>PWA Terinstall</span>
              </span>
            )}
          </div>

          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            Pembaruan Math Fingers {LATEST_APP_VERSION}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Akun: <strong className="text-slate-800 dark:text-slate-200">{currentUser?.name || 'Administrator'}</strong> ({branchName})
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {updateStatus === 'prompt' && (
            <>
              {/* Notice */}
              <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                isMandatory
                  ? isLight 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-900' 
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                  : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}>
                <AlertTriangle size={17} className="text-amber-500 shrink-0" />
                <p className="text-xs font-medium leading-tight">
                  Versi terpasang saat ini: <span className="font-extrabold">{installedVersion}</span>. Perbarui ke versi <strong>{LATEST_APP_VERSION}</strong> untuk menikmati perbaikan terbaru.
                </p>
              </div>

              {/* Changelog list */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <span>Pembaruan di Versi {LATEST_APP_VERSION}:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Dirilis {APP_RELEASE_DATE}</span>
                </h3>

                <div className="space-y-2 text-xs">
                  {/* Item 1 */}
                  <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
                  }`}>
                    <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 shrink-0 mt-0.5">
                      <QrCode size={15} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">
                        Opsi Presensi Izin & Catatan Pintasan
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Mendukung status Hadir / Izin / Alpa & tombol pintasan cepat (+Izin Makan, +Hadir Kembali, +Izin Sakit).
                      </p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
                  }`}>
                    <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-500 shrink-0 mt-0.5">
                      <ShieldCheck size={15} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">
                        Penyimpanan Foto Siswa Supabase
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Skrip otomatis penambahan kolom <code className="font-mono text-emerald-500">photoUrl</code> agar foto siswa tersimpan utuh di cloud.
                      </p>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
                  }`}>
                    <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-500 shrink-0 mt-0.5">
                      <Zap size={15} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">
                        Tampilan Desktop & Tablet Lebih Ringkas
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Optimalisasi antarmuka beranda yang lebih bersih, responsif, dan bebas gangguan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security info */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={13} />
                  Pembaruan aman, data siswa tetap utuh.
                </span>
                <span className="font-mono text-[10px]">~1.1 MB</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleStartUpdate}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 group cursor-pointer"
                >
                  <Download size={15} className="group-hover:translate-y-0.5 transition-transform" />
                  <span>Update PWA Sekarang</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                {!isMandatory && (
                  <button
                    onClick={onClose}
                    className={`py-3 px-3.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      isLight 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    Nanti
                  </button>
                )}
              </div>
            </>
          )}

          {updateStatus === 'updating' && (
            <div className="py-6 text-center space-y-4">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-3 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 animate-pulse">
                  <RefreshCw size={22} className="animate-spin" />
                </div>
              </div>

              <div className="space-y-1 max-w-xs mx-auto">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                  Memperbarui ke {LATEST_APP_VERSION}...
                </h3>
                <p className="text-xs text-slate-500 font-medium animate-pulse">
                  {statusText}
                </p>
              </div>

              {/* Progress bar */}
              <div className="max-w-xs mx-auto space-y-1.5">
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 shadow-xs"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 px-0.5">
                  <span>Proses</span>
                  <span className="font-extrabold text-emerald-500">{progress}%</span>
                </div>
              </div>
            </div>
          )}

          {updateStatus === 'success' && (
            <div className="py-4 text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500 text-emerald-500 flex items-center justify-center shadow-md">
                <CheckCircle2 size={32} className="animate-bounce" />
              </div>

              <div className="space-y-1 max-w-xs mx-auto">
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[11px] font-extrabold">
                  Pembaruan PWA Sukses 🎉
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Aplikasi Siap Digunakan!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  PWA Math Fingers resmi diperbarui ke versi <span className="font-extrabold text-amber-500">{LATEST_APP_VERSION}</span>.
                </p>
              </div>

              <button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="w-full max-w-xs py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                Buka PWA Versi {LATEST_APP_VERSION}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
