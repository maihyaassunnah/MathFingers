import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  CloudLightning, 
  ShieldCheck,
  Zap,
  Clock,
  ChevronDown
} from 'lucide-react';

interface HeaderSyncIndicatorProps {
  isSyncing: boolean;
  isOfflineFallback?: boolean;
  pingLatency: number | null;
  lastSyncedAt?: Date | null;
  onManualSync?: () => Promise<void> | void;
  theme?: 'light' | 'dark';
  className?: string;
  compact?: boolean;
}

export const HeaderSyncIndicator: React.FC<HeaderSyncIndicatorProps> = ({
  isSyncing,
  isOfflineFallback = false,
  pingLatency,
  lastSyncedAt,
  onManualSync,
  theme = 'dark',
  className = '',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeAgo, setTimeAgo] = useState<string>('Baru saja');
  const popoverRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';
  const isOnline = !isOfflineFallback && pingLatency !== null && typeof navigator !== 'undefined' ? navigator.onLine : false;

  // Format relative time for last sync
  useEffect(() => {
    const updateRelativeTime = () => {
      if (!lastSyncedAt) {
        setTimeAgo('Baru saja');
        return;
      }
      const seconds = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
      if (seconds < 10) {
        setTimeAgo('Baru saja');
      } else if (seconds < 60) {
        setTimeAgo(`${seconds} dtk lalu`);
      } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        setTimeAgo(`${mins} mnt lalu`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeAgo(`${hours} jam lalu`);
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 5000);
    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onManualSync && !isSyncing) {
      await onManualSync();
    }
  };

  // Latency rating
  const getLatencyRating = (ms: number | null) => {
    if (ms === null) return { label: 'Terputus', color: 'text-amber-500', pingBg: 'bg-amber-400', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    if (ms < 100) return { label: 'Sangat Baik', color: 'text-emerald-500', pingBg: 'bg-emerald-400', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    if (ms < 250) return { label: 'Cukup', color: 'text-amber-500', pingBg: 'bg-amber-400', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    return { label: 'Lambat', color: 'text-rose-500', pingBg: 'bg-rose-400', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
  };

  const rating = getLatencyRating(pingLatency);

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* 1. MAIN PILL BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer select-none shadow-xs ${
          isSyncing
            ? isLight
              ? 'bg-emerald-50/95 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/40 shadow-emerald-500/20'
              : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50 ring-2 ring-emerald-500/30 shadow-emerald-950/50'
            : !isOnline
              ? isLight
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70'
                : 'bg-amber-950/30 text-amber-300 border-amber-500/30 hover:bg-amber-950/50'
              : isLight
                ? 'bg-white/95 text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
        }`}
        title={
          isSyncing 
            ? 'Background Sync sedang aktif menyinkronkan data ke Supabase' 
            : !isOnline 
              ? 'Mode Offline Aktif - Data tersimpan aman secara lokal' 
              : `Supabase Terhubung - Latensi: ${pingLatency}ms (${rating.label})`
        }
      >
        {/* Pulsing Syncing State */}
        {isSyncing ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>

            <RefreshCw 
              size={13} 
              className="animate-spin text-emerald-500 shrink-0" 
            />

            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight animate-pulse">
                {compact ? 'Syncing...' : 'Syncing Supabase...'}
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                Live
              </span>
            </div>
          </>
        ) : !isOnline ? (
          /* Offline Fallback State */
          <>
            <CloudLightning size={14} className="text-amber-500 animate-pulse shrink-0" />
            <span className="font-extrabold text-amber-600 dark:text-amber-400 tracking-wide uppercase text-[11px]">
              {compact ? 'Lokal' : 'Lokal Safe'}
            </span>
          </>
        ) : (
          /* Online Idle State */
          <>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${rating.pingBg}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${rating.pingBg.replace('400', '500')}`}></span>
            </span>

            <Database size={13} className="text-emerald-500 shrink-0 opacity-90 group-hover:scale-110 transition-transform" />

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[11px] tracking-tight">
                {compact ? `${pingLatency}ms` : 'Supabase Live'}
              </span>
              {pingLatency !== null && !compact && (
                <span className="text-[10px] opacity-75 font-mono">
                  {pingLatency}ms
                </span>
              )}
            </div>
          </>
        )}

        <ChevronDown 
          size={12} 
          className={`opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* 2. INTERACTIVE POPOVER CARD */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl p-4 shadow-2xl border z-50 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60' 
                : 'bg-[#0b1120] border-slate-800 text-white shadow-black/80'
            }`}
          >
            {/* Header / Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${
                  isSyncing 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : isOnline 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-amber-500/10 text-amber-400'
                }`}>
                  <Database size={16} />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs">Background Sync Status</h4>
                  <p className="text-[10px] text-slate-400">Database Cloud Supabase</p>
                </div>
              </div>

              {isSyncing ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse flex items-center gap-1">
                  <RefreshCw size={10} className="animate-spin" />
                  Syncing
                </span>
              ) : isOnline ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <WifiOff size={11} />
                  Offline
                </span>
              )}
            </div>

            {/* Sync Status Details */}
            <div className="py-3 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/50">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-400" />
                  Latensi Realtime:
                </span>
                <span className="font-bold text-[11px] flex items-center gap-1 font-mono">
                  {pingLatency !== null ? `${pingLatency} ms` : '—'}
                  {pingLatency !== null && (
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${rating.badgeClass}`}>
                      {rating.label}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/50">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} className="text-sky-400" />
                  Terakhir Disinkron:
                </span>
                <span className="font-semibold text-[11px]">
                  {timeAgo}
                </span>
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-[11px] text-slate-600 dark:text-slate-300">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Background sync bekerja otomatis setiap penambahan, pengeditan, presensi, maupun pembayaran baru.
                </p>
              </div>
            </div>

            {/* Manual Sync Trigger Button */}
            <button
              type="button"
              onClick={handleSyncClick}
              disabled={isSyncing}
              className={`w-full mt-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98 ${
                isSyncing
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-transparent'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/30 shadow-emerald-600/20'
              }`}
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Menyinkronkan Data...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
