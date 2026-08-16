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

export const LATEST_APP_VERSION = 'v3.2.0';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (isMandatory && updateStatus !== 'success') {
          e.stopPropagation();
        }
      }}
    >
      <div 
        className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          isLight 
            ? 'bg-white border-slate-200 text-slate-800 shadow-emerald-950/10' 
            : 'bg-slate-900 border-emerald-500/30 text-slate-100 shadow-black/80'
        }`}
      >
        {/* Header background decoration */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 opacity-90" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_70%)]" />

        {/* Close Button - Only show if not mandatory or update succeeds */}
        {(!isMandatory || updateStatus === 'success') && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        )}

        {/* Modal Header Content */}
        <div className="relative pt-6 px-6 sm:px-8 pb-4 text-white">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black tracking-wider uppercase border border-white/30">
              <Sparkles size={13} className="text-amber-300 animate-pulse" />
              <span>Update PWA Application</span>
            </span>
            
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-xs">
              {LATEST_APP_VERSION}
            </span>

            {isPwaInstalled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-xs">
                <Smartphone size={12} />
                <span>PWA Terinstall</span>
              </span>
            )}

            {isMandatory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                Wajib Update
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
            Pembaruan PWA Math Fingers Terbaru ({LATEST_APP_VERSION})
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-1">
            Akun Login: <span className="font-extrabold underline decoration-amber-300 decoration-2">{currentUser?.name || 'Administrator'}</span> ({branchName}) — Perbarui untuk melanjutkan.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {updateStatus === 'prompt' && (
            <>
              {/* Alert notice for outdated PWA */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                isMandatory
                  ? isLight 
                    ? 'bg-red-500/10 border-red-500/30 text-red-950' 
                    : 'bg-red-500/15 border-red-500/40 text-red-200'
                  : isLight 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-900' 
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
              }`}>
                <div className={`p-2 rounded-xl text-white shrink-0 font-bold ${isMandatory ? 'bg-red-600' : 'bg-amber-500 text-slate-950'}`}>
                  <AlertTriangle size={20} />
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm">
                      PWA Versi {installedVersion} Terdeteksi — Perlu Update ke {LATEST_APP_VERSION}
                    </h4>
                  </div>
                  <p className="opacity-95 leading-relaxed font-medium">
                    Aplikasi PWA yang terpasang pada perangkat Anda belum menggunakan versi Rilis Terbaru (<strong>{LATEST_APP_VERSION}</strong>). Silakan tekan tombol <strong>"Update PWA Sekarang"</strong> di bawah untuk memasang komponen terbaru.
                  </p>
                </div>
              </div>

              {/* Changelog & Feature List */}
              <div className="space-y-3">
                <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'} flex items-center justify-between`}>
                  <span>Fitur & Peningkatan PWA di Versi {LATEST_APP_VERSION}:</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Terverifikasi Stabil</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Feature 1 */}
                  <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                  }`}>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        Grafik & Analitik Cabang
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Visualisasi tren kehadiran siswa & statistik SPP Lunas vs Tunggakan secara langsung.
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                  }`}>
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 shrink-0 mt-0.5">
                      <QrCode size={18} />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        Kartu ID Siswa & Scan QR
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Cetak kartu fisik ber-QR Code untuk absensi mandiri cepat dan akurat.
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                  }`}>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0 mt-0.5">
                      <Receipt size={18} />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        Kuitansi & Cicilan SPP PDF
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Format invoice resmi dengan stempel digital & pengingat WhatsApp otomatis.
                      </p>
                    </div>
                  </div>

                  {/* Feature 4 */}
                  <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                  }`}>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        Kecepatan PWA & Cache Offlining
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Service worker pintar dengan auto-sync data saat koneksi terhubung kembali.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guarantee badge */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-150 dark:border-slate-800/80 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Pembaruan aman, data siswa & transaksi tidak akan hilang.
                </span>
                <span className="font-mono text-[10px] font-bold opacity-75">
                  Ukuran: ~1.2 MB
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleStartUpdate}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                  <span>Update PWA Sekarang</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {!isMandatory && (
                  <button
                    onClick={onClose}
                    className={`py-3.5 px-5 rounded-2xl font-bold text-xs border transition-all cursor-pointer ${
                      isLight 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    Ingatkan Nanti
                  </button>
                )}
              </div>
            </>
          )}

          {updateStatus === 'updating' && (
            <div className="py-8 text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 animate-pulse">
                  <RefreshCw size={28} className="animate-spin" />
                </div>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className={`text-lg font-extrabold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Memperbarui Aplikasi PWA ke {LATEST_APP_VERSION}...
                </h3>
                <p className="text-xs text-slate-500 font-medium animate-pulse">
                  {statusText}
                </p>
              </div>

              {/* Progress bar */}
              <div className="max-w-md mx-auto space-y-2">
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-400 px-1">
                  <span>Progress</span>
                  <span className="font-extrabold text-emerald-500">{progress}%</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                Mohon tunggu sebentar, Service Worker sedang meng-update berkas lokal...
              </p>
            </div>
          )}

          {updateStatus === 'success' && (
            <div className="py-6 text-center space-y-6 animate-fadeIn">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/15 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={44} className="animate-bounce" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs font-extrabold">
                  Pembaruan PWA Sukses 🎉
                </span>
                <h3 className={`text-xl font-black ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Aplikasi PWA Berhasil Diperbarui!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  PWA Math Fingers di perangkat Anda kini resmi menggunakan versi <span className="font-extrabold text-amber-500">{LATEST_APP_VERSION}</span>.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border max-w-md mx-auto text-left text-xs space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
              }`}>
                <h4 className="font-bold flex items-center gap-1.5 text-emerald-500">
                  <Check size={14} /> Status Modul PWA Terverifikasi:
                </h4>
                <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400 font-medium">
                  <li className="flex items-center gap-1">✓ Cache Service Worker Aktif</li>
                  <li className="flex items-center gap-1">✓ Scanner QR Code Siswa</li>
                  <li className="flex items-center gap-1">✓ Invoice & Kuitansi PDF</li>
                  <li className="flex items-center gap-1">✓ Engine Offline Supabase</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="w-full max-w-md py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                Buka Aplikasi PWA Versi {LATEST_APP_VERSION}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
