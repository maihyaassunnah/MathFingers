import React, { useState } from 'react';
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
  FinanceExpense
} from '../types';
import { formatRupiah, getAdminAvatar } from '../utils';
import { 
  MapPin, 
  Bell, 
  Search, 
  SlidersHorizontal, 
  CheckCircle2, 
  Clock, 
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
  Building, 
  Database, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  Star, 
  Phone, 
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  CreditCard,
  Plus
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
  isUpdateAvailable = false
}: MobileBranchAppViewProps) {
  const isLight = theme === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllServices, setShowAllServices] = useState(false);
  const [activePromoIndex, setActivePromoIndex] = useState(0);

  // Derive location / branch info
  const branchName = currentUser?.role === 'branch_admin' 
    ? currentUser.branch 
    : (activeBranch && activeBranch !== 'all' ? activeBranch : 'Pusat (Jawa Barat)');
  
  const branchObj = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase());
  const branchAddress = branchObj?.address || 'Jl. Raya Math Fingers No. 221B, Indonesia';

  // Stats calculation
  const activeStudents = students.filter(s => s.status === 'active');
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysAttendance = attendance.filter(a => a.date === todayStr);
  const presentCount = todaysAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = todaysAttendance.length > 0 
    ? Math.round((presentCount / todaysAttendance.length) * 100) 
    : 0;

  const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid');
  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  const avgGrade = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length)
    : 85;

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

  // Recommended Operations (Cards like "Recommended for you" in reference image)
  const recommendedCards = [
    {
      id: 'rec-attendance',
      badge: 'Utama Hari Ini',
      title: 'Presensi Cepat QR Siswa',
      rating: '4.9 (1.2k)',
      duration: '5 menit',
      verified: 'Terverifikasi Instan',
      price: `${todaysAttendance.length} Siswa`,
      originalPrice: `${activeStudents.length} Total`,
      btnText: 'Scan Sekarang',
      actionTab: 'qr_cards',
      image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'rec-spp',
      badge: 'Penagihan',
      title: 'Kuitansi & Tagihan SPP',
      rating: '4.8 (850)',
      duration: 'Real-time',
      verified: 'Auto WhatsApp Slip',
      price: formatRupiah(settings.defaultSppAmount || 250000),
      originalPrice: 'Reguler',
      btnText: 'Kelola SPP',
      actionTab: 'spp',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'rec-grades',
      badge: 'Akademik',
      title: 'Input Nilai Kuis Jaritmatika',
      rating: '5.0 (920)',
      duration: '10 menit',
      verified: 'Kalkulasi Otomatis',
      price: `Rata-rata ${avgGrade}`,
      originalPrice: 'Target 90+',
      btnText: 'Beri Nilai',
      actionTab: 'grades',
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'rec-students',
      badge: 'Registrasi',
      title: 'Pendaftaran Siswa Baru',
      rating: '4.9 (500+)',
      duration: '3 menit',
      verified: 'Buku Induk Cabang',
      price: `${activeStudents.length} Terdaftar`,
      originalPrice: 'Aktif',
      btnText: 'Tambah Siswa',
      actionTab: 'students',
      image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=600',
    }
  ];

  // Promotional Banner details configurable by Super Admin
  const promoTitle = settings.mobileHeroTitle || 'Bimbingan Cepat & Akurat?';
  const promoSubtitle = settings.mobileHeroSubtitle || 'Sistem Jaritmatika Math Fingers siap mendampingi presensi, kuis, dan administrasi cabang Anda.';
  const promoBadge = settings.mobileHeroBadgeText || '⚡ Operasional Cabang Siap 100%';
  const promoPrimaryBtn = settings.mobileHeroPrimaryBtnText || 'Catat Absen';
  const promoSecondaryBtn = settings.mobileHeroSecondaryBtnText || 'Tagihan SPP';

  return (
    <div id="mobile-branch-app-view" className="space-y-4 max-w-md mx-auto pb-6">
      
      {/* 1. TOP BAR: Location Dropdown + Notification + Cart / Sync Status */}
      <div className="flex items-center justify-between gap-2 pt-1 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MapPin size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className={`text-xs font-black truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Cabang {branchName}
              </span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </div>
            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
              {branchAddress}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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
            className="p-0.5 rounded-full border border-emerald-500/30 overflow-hidden shrink-0"
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

      {/* 2. SEARCH BAR WITH FILTER ICON */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari menu, layanan, siswa, atau modul..."
          className={`w-full pl-10 pr-11 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none transition ${
            isLight 
              ? 'bg-white border-slate-200/90 text-slate-800 focus:border-emerald-500 shadow-xs' 
              : 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500'
          }`}
        />
        {searchQuery ? (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        ) : (
          <button 
            type="button"
            onClick={() => setShowAllServices(!showAllServices)}
            className={`absolute right-2.5 top-2 p-1.5 rounded-xl border transition ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Filter Tampilan Menu"
          >
            <SlidersHorizontal size={14} />
          </button>
        )}
      </div>

      {/* 3. HERO PROMOTIONAL BANNER (Like AC Repair in Reference Image) */}
      <div className={`relative overflow-hidden rounded-3xl border shadow-md transition-all ${
        isLight 
          ? 'bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white border-emerald-800/40' 
          : 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white border-emerald-500/20'
      }`}>
        {/* Background Overlay image with soft fade */}
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url(${settings.mobileHeroBannerUrl || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800'})`
          }}
        />

        <div className="relative z-10 p-5 space-y-3">
          <div className="space-y-1 max-w-[70%]">
            <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
              {promoTitle}
            </h2>
            <p className="text-[11px] text-emerald-100/90 leading-relaxed font-medium">
              {promoSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300">
            <Zap size={12} className="text-amber-400" />
            <span>{promoBadge}</span>
          </div>

          {/* Quick Action Pill Buttons in Hero */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onNavigate(settings.mobileHeroPrimaryBtnAction || 'attendance')}
              className="px-3.5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Zap size={13} className="fill-current" />
              <span>{promoPrimaryBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate(settings.mobileHeroSecondaryBtnAction || 'spp')}
              className="px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-md font-bold text-xs flex items-center gap-1.5 border border-white/20 transition"
            >
              <Calendar size={13} />
              <span>{promoSecondaryBtn}</span>
            </button>
          </div>
        </div>

        {/* Floating Right Hero Avatar/Illustration */}
        <div className="absolute right-2 bottom-0 w-28 h-32 pointer-events-none opacity-90 hidden xs:block">
          <img 
            src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=300"
            alt="Teacher Avatar"
            className="w-full h-full object-cover object-top rounded-tl-3xl mask-gradient-to-b"
          />
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-1.5 pt-0.5">
        <span className="w-4 h-1.5 rounded-full bg-emerald-500 transition-all" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
      </div>

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

      {/* 5. RECOMMENDED FOR YOU (Horizontal Scroll or Compact Bento Cards like Reference) */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-sm font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {settings.mobileRecommendedTitle || 'Rekomendasi Aksi Cepat'}
          </h3>
          <span className="text-xs font-bold text-slate-400">
            Real-time
          </span>
        </div>

        {/* Horizontal Card Carousel / Stack */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          {recommendedCards.map((card) => (
            <div
              key={card.id}
              className={`rounded-3xl border overflow-hidden transition-all shadow-xs flex flex-col justify-between ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="relative h-28 w-full bg-slate-100 dark:bg-slate-800">
                <img 
                  src={card.image} 
                  alt={card.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white font-extrabold text-[9px] uppercase tracking-wider">
                  {card.badge}
                </span>
              </div>

              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className={`font-extrabold text-xs leading-snug line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {card.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star size={11} className="fill-amber-400" />
                      {card.rating}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock size={11} />
                      {card.duration}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    <ShieldCheck size={12} />
                    <span>{card.verified}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {card.price}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      {card.originalPrice}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate(card.actionTab)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[11px] transition shadow-xs"
                  >
                    {card.btnText}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. TRUST & OPERATIONAL BADGES (4 Columns at bottom) */}
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

    </div>
  );
}
