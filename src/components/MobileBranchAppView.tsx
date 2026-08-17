import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Student, 
  Attendance, 
  Invoice, 
  Grade, 
  AppSettings, 
  Branch, 
  AdminUser,
  ClassGroup,
  FinanceIncome,
  FinanceExpense,
  HeroSlide
} from '../types';
import { getAdminAvatar } from '../utils';
import { 
  MapPin, 
  Bell, 
  Search, 
  SlidersHorizontal, 
  ShieldCheck, 
  Zap, 
  Calendar, 
  Users, 
  Layers, 
  QrCode, 
  GraduationCap, 
  CheckSquare, 
  FileText, 
  History, 
  Receipt, 
  Wallet, 
  Award, 
  BookOpen, 
  TrendingUp, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown, 
  CreditCard,
  Sparkles,
  X,
  Sun,
  Moon,
  Building2,
  Globe,
  Check,
  Repeat
} from 'lucide-react';

interface MobileBranchAppViewProps {
  students: Student[];
  attendance: Attendance[];
  invoices: Invoice[];
  grades: Grade[];
  classes?: ClassGroup[];
  incomes?: FinanceIncome[];
  expenses?: FinanceExpense[];
  settings: AppSettings;
  theme?: string;
  isSuperAdmin?: boolean;
  branches?: Branch[];
  activeBranch?: string;
  currentUser?: AdminUser | null;
  onNavigate: (tab: string) => void;
  onOpenUpdateModal?: () => void;
  isUpdateAvailable?: boolean;
  onSelectBranch?: (branchName: string) => void;
  onToggleTheme?: () => void;
}

export function MobileBranchAppView({
  students = [],
  attendance = [],
  invoices = [],
  grades = [],
  classes = [],
  incomes = [],
  expenses = [],
  settings,
  theme = 'light',
  isSuperAdmin = false,
  branches = [],
  activeBranch = 'all',
  currentUser = null,
  onNavigate,
  onOpenUpdateModal,
  isUpdateAvailable = false,
  onSelectBranch,
  onToggleTheme
}: MobileBranchAppViewProps) {
  const isLight = theme === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [switchToast, setSwitchToast] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Super Admin branch switching capability check
  const canSwitchBranch = isSuperAdmin || currentUser?.role === 'super_admin' || currentUser?.username === 'wahyudin' || !currentUser;

  // Derive all unique branch names across database branches, students, classes, and default fallback
  const allBranchNames = Array.from(
    new Set([
      'Singkut',
      'bangko',
      'Pusat',
      'Bandung',
      ...branches.map(b => b.name),
      ...students.map(s => s.branch).filter((b): b is string => Boolean(b && b.trim())),
      ...classes.map(c => c.branch).filter((b): b is string => Boolean(b && b.trim()))
    ])
  ).filter((name): name is string => Boolean(name && name.trim() && name.toLowerCase() !== 'all' && name.toLowerCase() !== 'semua'));

  const handleSelectBranchOption = (selectedName: string) => {
    if (onSelectBranch) {
      onSelectBranch(selectedName);
    }
    setIsBranchModalOpen(false);
    const label = selectedName === 'all' ? 'Akun Super Admin (Semua Cabang)' : `Cabang ${selectedName}`;
    setSwitchToast(`Berhasil beralih ke ${label}`);
    setTimeout(() => setSwitchToast(null), 3000);
  };

  // Derive location / branch info
  const branchName = currentUser?.role === 'branch_admin' 
    ? currentUser.branch 
    : (activeBranch && activeBranch !== 'all' ? activeBranch : 'Singkut');
  
  const branchObj = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase());
  const branchAddress = branchObj?.address || 'Depan Ponpes Ihya\' As-Sunnah Singkut, Jambi';

  // 12 Primary and Secondary Services Grid
  const primaryServices = [
    { id: 'attendance', name: 'Presensi Siswa', sub: 'Absen Harian & QR', icon: CheckSquare, color: 'text-emerald-600', bg: isLight ? 'bg-emerald-50' : 'bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
    { id: 'students', name: 'Data Siswa', sub: 'Buku Induk & Foto', icon: Users, color: 'text-sky-600', bg: isLight ? 'bg-sky-50' : 'bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800' },
    { id: 'spp', name: 'Tagihan SPP', sub: 'Kuitansi & Bayar', icon: Receipt, color: 'text-rose-600', bg: isLight ? 'bg-rose-50' : 'bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800' },
    { id: 'grades', name: 'Input Nilai', sub: 'Kuis & Evaluasi', icon: Award, color: 'text-amber-600', bg: isLight ? 'bg-amber-50' : 'bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800' },
    { id: 'classes', name: 'Jadwal Kelas', sub: 'Kelompok Bimbingan', icon: Layers, color: 'text-indigo-600', bg: isLight ? 'bg-indigo-50' : 'bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800' },
    { id: 'qr_cards', name: 'Kartu QR', sub: 'Cetak ID Member', icon: QrCode, color: 'text-teal-600', bg: isLight ? 'bg-teal-50' : 'bg-teal-950/40', border: 'border-teal-200 dark:border-teal-800' },
    { id: 'notes', name: 'Jurnal Guru', sub: 'Catatan Pengajar', icon: FileText, color: 'text-purple-600', bg: isLight ? 'bg-purple-50' : 'bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800' },
    { id: 'report', name: 'Rapor Siswa', sub: 'Perkembangan Anak', icon: TrendingUp, color: 'text-emerald-700', bg: isLight ? 'bg-emerald-50' : 'bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
  ];

  const extendedServices = [
    ...(canSwitchBranch ? [
      { id: 'branches_mgmt', name: 'Kelola Cabang', sub: 'Multi-Cabang & Admin', icon: Building2, color: 'text-teal-600', bg: isLight ? 'bg-teal-50' : 'bg-teal-950/40', border: 'border-teal-200 dark:border-teal-800' },
      { id: 'supabase_sql', name: 'SQL Supabase', sub: 'Editor Database', icon: Globe, color: 'text-sky-600', bg: isLight ? 'bg-sky-50' : 'bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800' },
    ] : []),
    { id: 'finance', name: 'Keuangan Cabang', sub: 'Pemasukan & Biaya', icon: Wallet, color: 'text-amber-600', bg: isLight ? 'bg-amber-50' : 'bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800' },
    { id: 'alumni', name: 'Alumni Lulus', sub: 'Arsip Sertifikat', icon: GraduationCap, color: 'text-blue-600', bg: isLight ? 'bg-blue-50' : 'bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800' },
    { id: 'simulator', name: 'Materi & Modul', sub: 'Kurikulum Resmi', icon: BookOpen, color: 'text-pink-600', bg: isLight ? 'bg-pink-50' : 'bg-pink-950/40', border: 'border-pink-200 dark:border-pink-800' },
    { id: 'journal_history', name: 'Riwayat Jurnal', sub: 'Arsip Mengajar', icon: History, color: 'text-cyan-600', bg: isLight ? 'bg-cyan-50' : 'bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800' },
    { id: 'spp_history', name: 'Riwayat SPP', sub: 'Log Transaksi', icon: History, color: 'text-orange-600', bg: isLight ? 'bg-orange-50' : 'bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800' },
    { id: 'settings', name: 'Pengaturan Cabang', sub: 'Rekening & TTD', icon: Settings, color: 'text-slate-600', bg: isLight ? 'bg-slate-100' : 'bg-slate-800', border: 'border-slate-300 dark:border-slate-700' },
  ];

  const allDisplayServices = showAllServices 
    ? [...primaryServices, ...extendedServices] 
    : primaryServices;

  // Filter search
  const filteredServices = searchQuery.trim()
    ? [...primaryServices, ...extendedServices].filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.sub.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allDisplayServices;

  // Gradient and visual customization resolver
  const resolveSlideGradient = (slide?: HeroSlide) => {
    if (!slide) {
      return {
        background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
        borderColor: '#064e3b88',
        intensity: 85,
        bannerOpacity: 30
      };
    }

    const preset = slide.gradientPreset || 'emerald';
    let start = slide.gradientStartColor || '#064e3b';
    let end = slide.gradientEndColor || '#022c22';

    if (preset === 'forest') {
      start = '#052e16';
      end = '#064e3b';
    } else if (preset === 'lime') {
      start = '#14532d';
      end = '#365314';
    } else if (preset === 'teal') {
      start = '#134e4a';
      end = '#083344';
    } else if (preset === 'dark') {
      start = '#022c22';
      end = '#0f172a';
    } else if (preset === 'emerald') {
      start = '#064e3b';
      end = '#022c22';
    }

    const intensity = slide.gradientIntensity !== undefined ? slide.gradientIntensity : 85;
    const bannerOpacity = slide.bannerOpacity !== undefined ? slide.bannerOpacity : 30;

    return {
      background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
      borderColor: `${start}88`,
      intensity,
      bannerOpacity
    };
  };

  // Carousel Slides (Up to 3 slides configured by Super Admin)
  const defaultSlides: HeroSlide[] = [
    {
      id: 'slide-1',
      title: settings.mobileHeroTitle || 'Bimbingan Cepat & Akurat?',
      subtitle: settings.mobileHeroSubtitle || 'Sistem Jaritmatika Math Fingers siap mendampingi presensi, kuis, dan administrasi cabang Anda.',
      badgeText: settings.mobileHeroBadgeText || '⚡ Operasional Cabang Siap 100%',
      bannerUrl: settings.mobileHeroBannerUrl || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800',
      primaryBtnText: settings.mobileHeroPrimaryBtnText || 'Catat Absen',
      primaryBtnAction: settings.mobileHeroPrimaryBtnAction || 'attendance',
      secondaryBtnText: settings.mobileHeroSecondaryBtnText || 'Tagihan SPP',
      secondaryBtnAction: settings.mobileHeroSecondaryBtnAction || 'spp',
      enabled: true
    },
    {
      id: 'slide-2',
      title: 'Presensi & Evaluasi Refleks',
      subtitle: 'Pantau kehadiran barcode QR dan kalkulasi skor kuis refleks berhitung siswa secara instan & akurat.',
      badgeText: '🎯 Presensi QR & Skor Instan',
      bannerUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800',
      primaryBtnText: 'Scan Kartu QR',
      primaryBtnAction: 'qr_cards',
      secondaryBtnText: 'Input Nilai',
      secondaryBtnAction: 'grades',
      enabled: true
    },
    {
      id: 'slide-3',
      title: 'Kelola SPP & Kuitansi Digital',
      subtitle: 'Terbitkan kuitansi resmi PDF berstempel dan kirim notifikasi tagihan SPP otomatis ke WhatsApp wali murid.',
      badgeText: '💳 Slip & Kuitansi Otomatis',
      bannerUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
      primaryBtnText: 'Kelola SPP',
      primaryBtnAction: 'spp',
      secondaryBtnText: 'Data Siswa',
      secondaryBtnAction: 'students',
      enabled: true
    }
  ];

  // Resolve slides: Prefer settings.heroSlides if configured, filter enabled ones, max 3
  const configuredSlides = settings.heroSlides && settings.heroSlides.length > 0
    ? settings.heroSlides.filter(s => s.enabled !== false).slice(0, 3)
    : [];

  const activeSlides: HeroSlide[] = configuredSlides.length > 0 ? configuredSlides : defaultSlides;

  // Auto-Slide Timer (Rotates every 4.5 seconds when not paused)
  useEffect(() => {
    if (activeSlides.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setSlideDirection('right');
      setActiveSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [activeSlides.length, isPaused]);

  // Keep index within bounds if activeSlides count changes
  useEffect(() => {
    if (activeSlideIndex >= activeSlides.length) {
      setActiveSlideIndex(0);
    }
  }, [activeSlides.length, activeSlideIndex]);

  const handleNextSlide = () => {
    setSlideDirection('right');
    setActiveSlideIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const handlePrevSlide = () => {
    setSlideDirection('left');
    setActiveSlideIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const currentSlide = activeSlides[activeSlideIndex] || activeSlides[0] || defaultSlides[0];

  return (
    <div id="mobile-branch-app-view" className="space-y-4 max-w-md mx-auto pb-6">
      
      {/* Toast Feedback Banner */}
      <AnimatePresence>
        {switchToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold shadow-lg flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} />
              <span>{switchToast}</span>
            </div>
            <button type="button" onClick={() => setSwitchToast(null)} className="p-0.5 text-white/80 hover:text-white">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP BAR: Location Dropdown + Action Icons (Theme Toggle NEXT TO Search, Bell, Profile Avatar) */}
      <div className="flex items-center justify-between gap-2 pt-1 px-1">
        {/* Left: Upgraded Professional Location Icon Badge & Branch Switcher Name */}
        <button
          type="button"
          onClick={() => {
            if (canSwitchBranch) {
              setIsBranchModalOpen(true);
            }
          }}
          disabled={!canSwitchBranch}
          className={`flex items-center gap-2.5 min-w-0 p-1 -ml-1 rounded-2xl transition text-left group ${
            canSwitchBranch
              ? isLight
                ? 'hover:bg-emerald-50/80 active:bg-emerald-100/60 cursor-pointer'
                : 'hover:bg-slate-800/80 active:bg-slate-800 cursor-pointer'
              : 'cursor-default'
          }`}
          title={canSwitchBranch ? 'Klik untuk Beralih Akun Cabang (Khusus Super Admin)' : `Cabang Aktif: ${branchName}`}
        >
          {/* Upgraded Professional Location Pin Icon Badge */}
          <div className="relative shrink-0">
            <div className="w-[38px] h-[38px] rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20 dark:ring-emerald-400/30 group-hover:scale-105 transition-transform">
              <MapPin size={19} className="drop-shadow-xs stroke-[2.2]" />
            </div>
            {canSwitchBranch ? (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black ring-2 ring-white dark:ring-slate-900 shadow-xs" title="Super Admin Switcher">
                <Repeat size={10} className="stroke-[3]" />
              </span>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className={`text-xs font-black truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Cabang {branchName}
              </span>
              {canSwitchBranch ? (
                <span className="p-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center shrink-0">
                  <ChevronDown size={14} className="stroke-[2.5]" />
                </span>
              ) : (
                <ChevronDown size={14} className="text-slate-400 shrink-0 opacity-40" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[145px] sm:max-w-[200px]">
              {branchAddress}
            </p>
          </div>
        </button>

        {/* Right: Action Buttons Group (Light/Dark Mode Toggle NEXT TO Search icon) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Light/Dark Mode Toggle Icon Button - Positioned right next to Search */}
          <button 
            type="button"
            onClick={onToggleTheme}
            className={`relative p-2 rounded-full border transition ${
              isLight 
                ? 'bg-white border-slate-200 text-amber-500 hover:text-amber-600 hover:bg-slate-50 shadow-xs' 
                : 'bg-slate-800 border-slate-700 text-amber-400 hover:text-amber-300 hover:bg-slate-750'
            }`}
            title={isLight ? 'Aktifkan Mode Gelap' : 'Aktifkan Mode Terang'}
          >
            {isLight ? <Moon size={17} /> : <Sun size={17} />}
          </button>

          {/* Search Icon Button */}
          <button 
            type="button"
            onClick={() => {
              const nextState = !isSearchOpen;
              setIsSearchOpen(nextState);
              if (nextState) {
                setTimeout(() => searchInputRef.current?.focus(), 80);
              }
            }}
            className={`relative p-2 rounded-full border transition ${
              isSearchOpen || searchQuery
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : isLight 
                  ? 'bg-white border-slate-200 text-slate-700 hover:text-emerald-600 shadow-xs' 
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:text-emerald-400'
            }`}
            title="Cari Menu, Siswa & Layanan"
          >
            <Search size={17} />
          </button>

          {/* Notification Bell / Update badge */}
          <button 
            type="button"
            onClick={onOpenUpdateModal}
            className={`relative p-2 rounded-full border transition ${
              isLight ? 'bg-white border-slate-200 text-slate-700 shadow-xs' : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
            title="Pemberitahuan & Versi Aplikasi"
          >
            <Bell size={17} />
            {isUpdateAvailable && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          {/* Quick Account / Branch Profile Avatar */}
          <button 
            type="button"
            onClick={() => onNavigate('settings')}
            className="p-0.5 rounded-full border border-emerald-500/30 overflow-hidden shrink-0 hover:scale-105 transition"
            title="Pengaturan Akun & Cabang"
          >
            <img 
              src={getAdminAvatar(currentUser || { username: 'branch' })} 
              alt={currentUser?.name || 'Admin'}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover"
            />
          </button>
        </div>
      </div>

      {/* 2. EXPANDABLE SEARCH BAR WITH FILTER & CLEAR BUTTON */}
      <AnimatePresence>
        {(isSearchOpen || searchQuery) && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="relative pt-0.5">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
              <input 
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu, layanan, siswa, atau modul..."
                className={`w-full pl-10 pr-20 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none transition ${
                  isLight 
                    ? 'bg-white border-slate-200/90 text-slate-800 focus:border-emerald-500 shadow-xs' 
                    : 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500'
                }`}
              />
              <div className="absolute right-2.5 top-2 flex items-center gap-1">
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                    title="Bersihkan teks"
                  >
                    ✕
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setShowAllServices(!showAllServices)}
                  className={`p-1.5 rounded-xl border transition ${
                    showAllServices
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                  title="Filter Tampilan Semua Menu"
                >
                  <SlidersHorizontal size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className={`p-1.5 rounded-xl border transition ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Tutup Pencarian"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. HERO PROMOTIONAL BANNER CAROUSEL (Maksimal 3 Slide Otomatis) */}
      {(() => {
        const slideGrad = resolveSlideGradient(currentSlide);

        return (
          <div 
            className="relative group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            <div 
              className="relative overflow-hidden rounded-3xl border shadow-md transition-all duration-500 min-h-[178px] text-white"
              style={{
                background: slideGrad.background,
                borderColor: slideGrad.borderColor
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentSlide.id || activeSlideIndex}
                  initial={{ opacity: 0, x: slideDirection === 'right' ? 40 : -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: slideDirection === 'right' ? -40 : 40 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="relative w-full h-full"
                >
                  {/* Background Overlay image with custom opacity from device gallery or preset */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center pointer-events-none mix-blend-overlay transition-all duration-500"
                    style={{
                      backgroundImage: `url(${currentSlide.bannerUrl || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800'})`,
                      opacity: slideGrad.bannerOpacity / 100
                    }}
                  />

                  {/* Gradient Darkness/Intensity adjustment overlay */}
                  <div 
                    className="absolute inset-0 pointer-events-none transition-all duration-500"
                    style={{
                      background: `rgba(0,0,0,${Math.max(0, (1 - (slideGrad.intensity / 100)) * 0.6)})`
                    }}
                  />

                  <div className="relative z-10 p-5 space-y-3">
                    <div className="space-y-1 max-w-[74%]">
                      <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
                        {currentSlide.title}
                      </h2>
                      <p className="text-[11px] text-emerald-100/90 leading-relaxed font-medium line-clamp-2">
                        {currentSlide.subtitle}
                      </p>
                    </div>

                    {currentSlide.badgeText && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300">
                        <Zap size={12} className="text-amber-400" />
                        <span>{currentSlide.badgeText}</span>
                      </div>
                    )}

                    {/* Quick Action Pill Buttons in Hero */}
                    <div className="flex items-center gap-2 pt-0.5">
                      {currentSlide.primaryBtnText && (
                        <button
                          type="button"
                          onClick={() => onNavigate(currentSlide.primaryBtnAction || 'attendance')}
                          className="px-3.5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition"
                        >
                          <Zap size={13} className="fill-current" />
                          <span>{currentSlide.primaryBtnText}</span>
                        </button>
                      )}

                      {currentSlide.secondaryBtnText && (
                        <button
                          type="button"
                          onClick={() => onNavigate(currentSlide.secondaryBtnAction || 'spp')}
                          className="px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-md font-bold text-xs flex items-center gap-1.5 border border-white/20 transition"
                        >
                          <Calendar size={13} />
                          <span>{currentSlide.secondaryBtnText}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Floating Right Hero Avatar/Illustration */}
                  <div className="absolute right-2 bottom-0 w-28 h-32 pointer-events-none opacity-90 hidden xs:block">
                    <img 
                      src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=300"
                      alt="Teacher Avatar"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top rounded-tl-3xl mask-gradient-to-b"
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Prev/Next arrows on hover or desktop */}
              {activeSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/40 hover:bg-slate-950/70 text-white backdrop-blur-md transition opacity-0 group-hover:opacity-100 z-20"
                    title="Slide Sebelumnya"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSlide}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/40 hover:bg-slate-950/70 text-white backdrop-blur-md transition opacity-0 group-hover:opacity-100 z-20"
                    title="Slide Selanjutnya"
                  >
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
            </div>

            {/* Carousel Pagination Dots */}
            {activeSlides.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {activeSlides.map((slide, idx) => (
                  <button
                    key={slide.id || idx}
                    type="button"
                    onClick={() => {
                      setSlideDirection(idx > activeSlideIndex ? 'right' : 'left');
                      setActiveSlideIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeSlideIndex === idx
                        ? 'w-6 bg-emerald-500'
                        : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                    }`}
                    title={`Buka Slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* 4. POPULAR SERVICES GRID (4x2 / 4x4 Grid with clean icons & titles) */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-sm font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {settings.mobilePopularServicesTitle || 'Layanan Populer Cabang'}
          </h3>
          <button
            type="button"
            onClick={() => setShowAllServices(!showAllServices)}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
          >
            <span>{showAllServices ? 'Tutup' : 'Lihat Semua'}</span>
            <ChevronRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {filteredServices.map((service) => {
            const Icon = service.icon;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onNavigate(service.id)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 text-center group ${
                  isLight 
                    ? 'bg-white border-slate-200/90 hover:border-emerald-400 hover:shadow-sm' 
                    : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5 border transition-transform group-hover:scale-110 ${service.bg} ${service.border}`}>
                  <Icon size={20} className={service.color} />
                </div>
                <span className={`text-[11px] font-bold leading-tight line-clamp-1 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  {service.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. TRUST & OPERATIONAL BADGES (4 Columns at bottom) */}
      <div className={`p-4 rounded-3xl border grid grid-cols-4 gap-2 text-center ${
        isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className="flex flex-col items-center space-y-1">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={16} />
          </div>
          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
            Data Terlindungi
          </span>
        </div>

        <div className="flex flex-col items-center space-y-1">
          <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center">
            <CreditCard size={16} />
          </div>
          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
            SPP Transparan
          </span>
        </div>

        <div className="flex flex-col items-center space-y-1">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Zap size={16} />
          </div>
          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
            Presensi QR
          </span>
        </div>

        <div className="flex flex-col items-center space-y-1">
          <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <MapPin size={16} />
          </div>
          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
            Multi-Cabang
          </span>
        </div>
      </div>

      {/* 6. SUPER ADMIN BRANCH SWITCHER MODAL */}
      <AnimatePresence>
        {isBranchModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4"
            onClick={() => setIsBranchModalOpen(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className={`w-full max-w-md rounded-3xl p-5 shadow-2xl border ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3 mb-3 dark:border-slate-800 border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-bold tracking-tight">Beralih Akun Cabang</h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold border border-amber-500/20">
                        Super Admin
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pilih cabang atau kembali ke Super Admin
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Branch Options List */}
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {/* Option 1: Kembali ke Akun Super Admin (Semua Cabang) */}
                <button
                  type="button"
                  onClick={() => handleSelectBranchOption('all')}
                  className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between ${
                    activeBranch === 'all'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-xs'
                      : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 ${
                      activeBranch === 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      <Globe size={16} />
                    </div>
                    <span className="font-bold text-sm">Super Admin (Semua Cabang)</span>
                  </div>
                  {activeBranch === 'all' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check size={13} className="stroke-[3]" />
                    </span>
                  )}
                </button>

                {/* Individual Branch Accounts */}
                {allBranchNames.map((name) => {
                  const isSelected = activeBranch.toLowerCase() === name.toLowerCase();

                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectBranchOption(name)}
                      className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-xs'
                          : isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          <MapPin size={16} />
                        </div>
                        <span className="font-bold text-sm truncate">Cabang {name}</span>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Check size={13} className="stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer Note */}
              <div className="mt-4 pt-3 border-t dark:border-slate-800 border-slate-100 text-center">
                <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Memilih cabang akan menyaring seluruh data siswa, SPP, dan absensi</span>
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
