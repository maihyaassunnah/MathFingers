import React, { useState, useEffect } from 'react';
import { WifiOff, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineIndicatorProps {
  theme?: string;
  className?: string;
}

export function OfflineIndicator({ theme = 'dark', className = '' }: OfflineIndicatorProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isLight = theme === 'light';

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`overflow-hidden ${className}`}
        >
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-md ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
          }`}>
            <div className={`p-2 rounded-lg shrink-0 ${
              isLight ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/10 text-amber-400'
            }`}>
              <WifiOff size={18} className="animate-pulse" />
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs uppercase tracking-wider">Mode Offline Aktif</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  <ShieldCheck size={11} />
                  <span>Data Tersimpan Lokal</span>
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                Koneksi internet Anda terputus. Jangan khawatir, semua data formulir Anda akan **tersimpan aman secara lokal di browser ini** dan otomatis disinkronkan ke cloud saat internet kembali stabil.
              </p>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-semibold opacity-75 shrink-0 self-end sm:self-center">
              <RefreshCw size={10} className="animate-spin" />
              <span>Auto-Save Aktif</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
