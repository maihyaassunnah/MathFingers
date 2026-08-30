import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Student, Attendance, Invoice, Grade, AppSettings, DashboardTask, Branch, AdminUser } from '../types';
import { formatRupiah, getAdminAvatar, getStudentUniqueCode } from '../utils';
import { MathFingerLogo } from './MathFingerLogo';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  Building, 
  Users, 
  Receipt, 
  Award, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  TrendingUp, 
  Database, 
  Settings, 
  Download, 
  MapPin, 
  Phone, 
  Layers, 
  CalendarDays, 
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Filter,
  CheckSquare,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface SuperAdminDashboardProps {
  students: Student[];
  attendance: Attendance[];
  invoices: Invoice[];
  grades: Grade[];
  settings: AppSettings;
  branches: Branch[];
  adminUsers: AdminUser[];
  activeBranch: string;
  onSelectBranch: (branchName: string) => void;
  onNavigate: (tab: string) => void;
  dashboardTasks: DashboardTask[];
  onAddDashboardTask: (text: string) => void;
  onToggleDashboardTask: (id: string) => void;
  onDeleteDashboardTask: (id: string) => void;
  theme?: 'light' | 'dark';
  currentUser?: AdminUser | null;
  onOpenUpdateModal?: () => void;
  isUpdateAvailable?: boolean;
}

export function SuperAdminDashboard({
  students = [],
  attendance = [],
  invoices = [],
  grades = [],
  settings,
  branches = [],
  adminUsers = [],
  activeBranch = 'all',
  onSelectBranch,
  onNavigate,
  dashboardTasks = [],
  onAddDashboardTask,
  onToggleDashboardTask,
  onDeleteDashboardTask,
  theme = 'dark',
  currentUser,
  onOpenUpdateModal,
  isUpdateAvailable = false
}: SuperAdminDashboardProps) {
  const isLight = theme === 'light';
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedMetricBranch, setSelectedMetricBranch] = useState<string>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  // Super Admin display name
  const superAdminName = currentUser?.name || 'Wahyudin Hafiz, S.Pd';

  // Available unique branches list (including 'Pusat' fallback if empty)
  const branchList = branches.length > 0 ? branches : [
    { id: 'b-1', name: 'Pusat', address: 'Kantor Pusat Math Fingers', phone: '081234567890', createdAt: Date.now() }
  ];

  // Filter dataset based on selectedMetricBranch if not 'all', otherwise use global data
  const effectiveStudents = selectedMetricBranch === 'all' 
    ? students 
    : students.filter(s => (s.branch || 'Pusat') === selectedMetricBranch);

  const effectiveAttendance = selectedMetricBranch === 'all'
    ? attendance
    : attendance.filter(a => (a.branch || 'Pusat') === selectedMetricBranch);

  const effectiveInvoices = selectedMetricBranch === 'all'
    ? invoices
    : invoices.filter(i => (i.branch || 'Pusat') === selectedMetricBranch);

  const effectiveGrades = selectedMetricBranch === 'all'
    ? grades
    : grades.filter(g => (g.branch || 'Pusat') === selectedMetricBranch);

  // Core KPIs Calculation
  const activeStudents = effectiveStudents.filter(s => s.status === 'active');
  const alumniStudents = effectiveStudents.filter(s => s.status === 'alumni');

  // Attendance Today
  const todaysAttendance = effectiveAttendance.filter(a => a.date === todayStr);
  const presentCount = todaysAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = todaysAttendance.length > 0 
    ? Math.round((presentCount / todaysAttendance.length) * 100) 
    : 0;

  // Invoices & Financials
  const paidInvoices = effectiveInvoices.filter(i => i.status === 'paid');
  const unpaidInvoices = effectiveInvoices.filter(i => i.status === 'unpaid');
  const totalPaidAmount = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalUnpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalSppTarget = totalPaidAmount + totalUnpaidAmount;
  const sppCollectionRate = totalSppTarget > 0 ? Math.round((totalPaidAmount / totalSppTarget) * 100) : 100;

  // Average Quiz Score
  const avgScore = effectiveGrades.length > 0
    ? Math.round(effectiveGrades.reduce((sum, g) => sum + (g.score || 0), 0) / effectiveGrades.length)
    : 0;

  // Branch detailed breakdown cards
  const branchBreakdown = branchList.map((branch) => {
    const bStudents = students.filter(s => (s.branch || 'Pusat') === branch.name);
    const bActive = bStudents.filter(s => s.status === 'active');
    const bAlumni = bStudents.filter(s => s.status === 'alumni');
    const bGrades = grades.filter(g => (g.branch || 'Pusat') === branch.name);
    const bAvg = bGrades.length > 0 
      ? Math.round(bGrades.reduce((sum, g) => sum + (g.score || 0), 0) / bGrades.length) 
      : 0;

    const bAttendanceToday = attendance.filter(a => (a.branch || 'Pusat') === branch.name && a.date === todayStr);
    const bPresentToday = bAttendanceToday.filter(a => a.status === 'present').length;
    const bAttRate = bAttendanceToday.length > 0 ? Math.round((bPresentToday / bAttendanceToday.length) * 100) : null;

    const bInvoices = invoices.filter(i => (i.branch || 'Pusat') === branch.name);
    const bPaid = bInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const bUnpaid = bInvoices.filter(i => i.status === 'unpaid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const bUnpaidCount = bInvoices.filter(i => i.status === 'unpaid').length;

    // Assigned branch admin & assistants
    const assignedAdmins = adminUsers.filter(u => u.branch === branch.name && (u.role === 'branch_admin' || u.role === 'branch_assistant'));

    return {
      id: branch.id,
      name: branch.name,
      address: branch.address || 'Alamat belum diatur',
      phone: branch.phone || '-',
      activeCount: bActive.length,
      alumniCount: bAlumni.length,
      avgScore: bAvg,
      attendanceRate: bAttRate,
      paidAmount: bPaid,
      unpaidAmount: bUnpaid,
      unpaidCount: bUnpaidCount,
      admins: assignedAdmins
    };
  });

  // Chart Data: SPP Income per Branch
  const sppChartData = branchBreakdown.map(b => ({
    name: b.name,
    Lunas: b.paidAmount,
    Tunggakan: b.unpaidAmount
  }));

  // Chart Data: Students & Scores per Branch
  const branchStudentChartData = branchBreakdown.map(b => ({
    name: b.name,
    SiswaAktif: b.activeCount,
    RataNilai: b.avgScore
  }));

  // Chart Data: Weekly Attendance Trend (past 6 weeks)
  const getWeeklyAttendanceData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      
      const startOfWeek = new Date(d);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      
      const startStr = startOfWeek.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];
      
      const weekAttendance = effectiveAttendance.filter(a => a.date >= startStr && a.date <= endStr);
      const hadir = weekAttendance.filter(a => a.status === 'present').length;
      const izin = weekAttendance.filter(a => a.status === 'permission').length;
      const absen = weekAttendance.filter(a => a.status === 'absent').length;
      
      const weekLabel = `Pekan ${6 - i} (${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1})`;
      
      data.push({
        weekLabel,
        Hadir: hadir,
        Izin: izin,
        Absen: absen,
        Total: hadir + izin + absen
      });
    }
    return data;
  };

  const weeklyAttendanceData = getWeeklyAttendanceData();

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    onAddDashboardTask(newTaskText.trim());
    setNewTaskText('');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">

      {/* 1. UPDATE BANNER (If available) */}
      {isUpdateAvailable && (
        <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg ${
          isLight 
            ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-300 text-slate-900' 
            : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-black shrink-0 shadow-sm animate-bounce">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base">Pembaruan PWA v3.3.0 Tersedia untuk Super Admin!</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">Terbaru</span>
              </div>
              <p className="text-xs opacity-90 mt-0.5">
                Perbarui sistem untuk menikmati fitur presensi izin, penyimpanan foto cloud, dan optimalisasi dashboard cabang.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenUpdateModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={14} />
            <span>Update Sekarang</span>
          </button>
        </div>
      )}

      {/* 2. COMMAND CENTER HERO (WAHYUDIN HAFIZ - SUPER ADMIN) */}
      <div className={`relative overflow-hidden rounded-3xl border shadow-xl transition-all duration-300 ${
        isLight 
          ? 'bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white border-emerald-700/50 shadow-emerald-950/20' 
          : 'bg-gradient-to-br from-[#064e3b] via-[#0f172a] to-[#020617] text-white border-emerald-500/30 shadow-black/80'
      } p-6 sm:p-8 backdrop-blur-md`}>
        {/* Background glow decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Top Badge Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 backdrop-blur-md text-emerald-300 text-xs font-black tracking-wider uppercase border border-emerald-400/30 shadow-xs">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Pusat Kendali Super Admin</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/15">
                <CalendarDays size={13} className="text-emerald-300" />
                <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
                {branchList.length} Cabang Aktif
              </span>
            </div>

            {/* Title & Name */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-sm flex items-center gap-3">
                <span>{superAdminName}</span>
                <span className="text-amber-400 text-2xl">👑</span>
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium leading-relaxed mt-1">
                Panel eksekutif pusat untuk mengelola data cabang, akun admin cabang, keuangan SPP global, serta memantau perkembangan seluruh siswa Math Fingers.
              </p>
            </div>

            {/* Quick Branch Focus Selector Filter Bar */}
            <div className="pt-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5 mb-2">
                <Filter size={12} />
                <span>Fokus Tampilan Data Cabang:</span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMetricBranch('all');
                    onSelectBranch('all');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedMetricBranch === 'all'
                      ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/30 scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  <Building size={13} />
                  <span>🌐 Semua Cabang (Pusat)</span>
                </button>

                {branchList.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelectedMetricBranch(b.name);
                      onSelectBranch(b.name);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedMetricBranch === b.name
                        ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/30 scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    }`}
                  >
                    <MapPin size={13} className={selectedMetricBranch === b.name ? 'text-slate-950' : 'text-emerald-300'} />
                    <span>{b.name}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => onNavigate('branches_mgmt')}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 border border-emerald-400/40 text-xs font-extrabold flex items-center gap-1 transition cursor-pointer"
                  title="Tambah / Kelola Cabang"
                >
                  <Plus size={13} />
                  <span>Kelola Cabang</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Logo & Quick Status Card */}
          <div className="w-full lg:w-auto shrink-0 flex flex-col items-center sm:items-end justify-center">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg text-center flex flex-col items-center">
              <div className="p-2.5 rounded-2xl bg-white text-slate-900 shadow-md mb-2">
                <MathFingerLogo size={36} textSize="sm" theme="light" />
              </div>
              <span className="text-[11px] font-extrabold text-emerald-200">Sistem Pusat Math Fingers</span>
              <span className="text-[10px] text-white/70">Multi-Cabang Cloud Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE QUICK ACTIONS (SUPER ADMIN SHORTCUTS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'} flex items-center gap-2`}>
            <Sparkles size={14} className="text-emerald-500" />
            <span>Pusat Kendali Cepat Super Admin</span>
          </h3>
          <span className="text-[11px] text-slate-400">Akses langsung fitur esensial</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: Kelola Cabang & Admin */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('branches_mgmt')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
              isLight 
                ? 'bg-white hover:bg-emerald-50/70 border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md' 
                : 'bg-slate-900 hover:bg-emerald-950/30 border-slate-800 hover:border-emerald-500/50 shadow-xs hover:shadow-emerald-950/40'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <Building size={20} />
            </div>
            <div>
              <h4 className={`text-xs font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>Cabang & Admin</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Tambah & atur cabang</p>
            </div>
          </motion.div>

          {/* Action 2: Database Siswa Multi-Cabang */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('students')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
              isLight 
                ? 'bg-white hover:bg-teal-50/70 border-slate-200 hover:border-teal-400 shadow-xs hover:shadow-md' 
                : 'bg-slate-900 hover:bg-teal-950/30 border-slate-800 hover:border-teal-500/50 shadow-xs hover:shadow-teal-950/40'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <div>
              <h4 className={`text-xs font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>Data Siswa</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Semua data siswa</p>
            </div>
          </motion.div>

          {/* Action 3: Rekap Keuangan & SPP */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('spp_history')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
              isLight 
                ? 'bg-white hover:bg-amber-50/70 border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-md' 
                : 'bg-slate-900 hover:bg-amber-950/30 border-slate-800 hover:border-amber-500/50 shadow-xs hover:shadow-amber-950/40'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <Receipt size={20} />
            </div>
            <div>
              <h4 className={`text-xs font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>Rekap SPP Global</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Arus kas & tunggakan</p>
            </div>
          </motion.div>

          {/* Action 4: Supabase SQL Editor */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('supabase_sql')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
              isLight 
                ? 'bg-white hover:bg-sky-50/70 border-slate-200 hover:border-sky-400 shadow-xs hover:shadow-md' 
                : 'bg-slate-900 hover:bg-sky-950/30 border-slate-800 hover:border-sky-500/50 shadow-xs hover:shadow-sky-950/40'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <Database size={20} />
            </div>
            <div>
              <h4 className={`text-xs font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>SQL Supabase</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Editor cloud database</p>
            </div>
          </motion.div>

          {/* Action 5: Cetak Rapor & Laporan */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('report')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
              isLight 
                ? 'bg-white hover:bg-indigo-50/70 border-slate-200 hover:border-indigo-400 shadow-xs hover:shadow-md' 
                : 'bg-slate-900 hover:bg-indigo-950/30 border-slate-800 hover:border-indigo-500/50 shadow-xs hover:shadow-indigo-950/40'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <TrendingUp size={20} />
            </div>
            <div>
              <h4 className={`text-xs font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>Rapor & Nilai</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Evaluasi & cetak PDF</p>
            </div>
          </motion.div>

          {/* Action 6: Pengaturan & Kurikulum */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('settings')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
              isLight 
                ? 'bg-white hover:bg-rose-50/70 border-slate-200 hover:border-rose-400 shadow-xs hover:shadow-md' 
                : 'bg-slate-900 hover:bg-rose-950/30 border-slate-800 hover:border-rose-500/50 shadow-xs hover:shadow-rose-950/40'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <Settings size={20} />
            </div>
            <div>
              <h4 className={`text-xs font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>Pengaturan</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Biaya SPP & kurikulum</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 4. EXECUTIVE STATS BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Cabang Aktif */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('branches_mgmt')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 group ${
            isLight ? 'bg-white border-slate-200 hover:border-emerald-400 shadow-sm' : 'bg-slate-900 border-slate-800 hover:border-emerald-500 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Cabang Terdaftar</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{branchList.length}</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Cabang</span>
          </div>
          <div className={`flex items-center justify-between text-[11px] mt-2 pt-2 border-t ${isLight ? 'text-slate-600 border-slate-100' : 'text-slate-400 border-slate-800/80'}`}>
            <span>{adminUsers.filter(u => u.role === 'branch_admin' || u.role === 'branch_assistant').length} Admin & Asisten</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">Kelola <ChevronRight size={12} /></span>
          </div>
        </motion.div>

        {/* Stat 2: Total Siswa Multi-Cabang */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('students')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 group ${
            isLight ? 'bg-white border-slate-200 hover:border-teal-400 shadow-sm' : 'bg-slate-900 border-slate-800 hover:border-teal-500 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {selectedMetricBranch === 'all' ? 'Total Siswa Aktif' : `Siswa (${selectedMetricBranch})`}
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeStudents.length}</span>
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Siswa Aktif</span>
          </div>
          <div className={`flex items-center justify-between text-[11px] mt-2 pt-2 border-t ${isLight ? 'text-slate-600 border-slate-100' : 'text-slate-400 border-slate-800/80'}`}>
            <span>{alumniStudents.length} Alumni Lulus</span>
            <span className="font-semibold">{effectiveStudents.length} Total</span>
          </div>
        </motion.div>

        {/* Stat 3: Keuangan SPP Global */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('spp_history')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 group ${
            isLight ? 'bg-white border-slate-200 hover:border-amber-400 shadow-sm' : 'bg-slate-900 border-slate-800 hover:border-amber-500 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {selectedMetricBranch === 'all' ? 'SPP Terkumpul' : `SPP (${selectedMetricBranch})`}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
              {formatRupiah(totalPaidAmount)}
            </span>
          </div>
          <div className={`flex items-center justify-between text-[11px] mt-2 pt-2 border-t ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
            <span className="text-rose-600 dark:text-rose-400 font-bold truncate">Tunggakan: {formatRupiah(totalUnpaidAmount)}</span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{sppCollectionRate}%</span>
          </div>
        </motion.div>

        {/* Stat 4: Evaluasi Skor & Kehadiran */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('report')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 group ${
            isLight ? 'bg-white border-slate-200 hover:border-sky-400 shadow-sm' : 'bg-slate-900 border-slate-800 hover:border-sky-500 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Rata-Rata Kuis & Presensi</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{avgScore}</span>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">/ 100</span>
          </div>
          <div className={`flex items-center justify-between text-[11px] mt-2 pt-2 border-t ${isLight ? 'text-slate-600 border-slate-100' : 'text-slate-400 border-slate-800/80'}`}>
            <span>Presensi Hari Ini: <strong className="text-emerald-600 dark:text-emerald-400">{attendanceRate}%</strong></span>
            <span>{presentCount} Hadir</span>
          </div>
        </motion.div>
      </div>

      {/* 5. MULTI-BRANCH OPERATIONS HUB (GRID OF ALL BRANCHES) */}
      <div className={`p-6 rounded-3xl border shadow-sm space-y-5 backdrop-blur-md ${
        isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/70 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Building size={22} />
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Hub Manajemen Seluruh Cabang Bimbingan
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Pilih cabang untuk memfokuskan data atau mengelola operasional cabang secara spesifik
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => onNavigate('branches_mgmt')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Tambah Cabang Baru</span>
            </button>
          </div>
        </div>

        {/* Branch Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branchBreakdown.map((b) => {
            const isCurrentlySelected = selectedMetricBranch === b.name;

            return (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                  isCurrentlySelected
                    ? isLight
                      ? 'bg-emerald-50/70 border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-emerald-950/25 border-emerald-500/60 shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-500/30'
                    : isLight
                      ? 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                      : 'bg-slate-950/40 hover:bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-md'
                }`}
              >
                {/* Branch top tag */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className={`font-black text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Cabang {b.name}
                        </h4>
                      </div>
                      <p className={`text-[11px] flex items-center gap-1 mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        <MapPin size={11} className="shrink-0 text-emerald-500" />
                        <span className="truncate">{b.address}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedMetricBranch(b.name);
                        onSelectBranch(b.name);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer shrink-0 ${
                        isCurrentlySelected
                          ? 'bg-emerald-500 text-slate-950'
                          : isLight 
                            ? 'bg-slate-200 text-slate-700 hover:bg-emerald-500 hover:text-slate-950' 
                            : 'bg-slate-800 text-slate-300 hover:bg-emerald-500 hover:text-slate-950'
                      }`}
                    >
                      {isCurrentlySelected ? 'Fokus Aktif' : 'Fokuskan'}
                    </button>
                  </div>

                  {/* Branch Admin Assignment */}
                  <div className={`p-2.5 rounded-xl border mb-3.5 flex items-center justify-between ${
                    isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCheck size={14} className="text-emerald-500 shrink-0" />
                      <span className={`text-[11px] shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Admin:</span>
                      <span className={`text-[11px] font-bold truncate ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        {b.admins.length > 0 ? b.admins.map(a => a.name).join(', ') : 'Belum Ditugaskan'}
                      </span>
                    </div>
                    {b.admins.length === 0 && (
                      <button
                        onClick={() => onNavigate('branches_mgmt')}
                        className="text-[10px] font-extrabold text-amber-500 hover:underline cursor-pointer"
                      >
                        + Tugaskan
                      </button>
                    )}
                  </div>

                  {/* 4 Stats Mini Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs mb-4">
                    <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <span className={`text-[10px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Siswa Aktif</span>
                      <span className={`font-extrabold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {b.activeCount} <span className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({b.alumniCount} alumni)</span>
                      </span>
                    </div>

                    <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <span className={`text-[10px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Rata-Rata Kuis</span>
                      <span className="font-extrabold text-sm text-sky-600 dark:text-sky-400">
                        {b.avgScore} <span className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>/ 100</span>
                      </span>
                    </div>

                    <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <span className={`text-[10px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Presensi Hari Ini</span>
                      <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                        {b.attendanceRate !== null ? `${b.attendanceRate}%` : 'Belum Absen'}
                      </span>
                    </div>

                    <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <span className={`text-[10px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Tunggakan SPP</span>
                      <span className={`font-extrabold text-xs block truncate ${b.unpaidAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {b.unpaidAmount > 0 ? formatRupiah(b.unpaidAmount) : 'Lunas'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions for This Branch */}
                <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <button
                    onClick={() => {
                      onSelectBranch(b.name);
                      onNavigate('students');
                    }}
                    className={`py-2 px-2 rounded-xl hover:bg-emerald-600 hover:text-white text-[11px] font-extrabold transition text-center cursor-pointer ${
                      isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Buka Siswa Cabang
                  </button>

                  <button
                    onClick={() => {
                      onSelectBranch(b.name);
                      onNavigate('spp');
                    }}
                    className={`py-2 px-2 rounded-xl hover:bg-emerald-600 hover:text-white text-[11px] font-extrabold transition text-center cursor-pointer ${
                      isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Buka SPP Cabang
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. COMPARATIVE ANALYTICS (RECHARTS FOR MULTI-BRANCH) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Perbandingan Siswa & Performa Nilai per Cabang */}
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 backdrop-blur-md ${
          isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2">
              <Users className="text-teal-500" size={18} />
              <div>
                <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Perbandingan Siswa & Nilai per Cabang
                </h4>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total siswa aktif dan rata-rata skor per cabang</p>
              </div>
            </div>
          </div>

          <div className="w-full h-[280px]">
            {branchStudentChartData.length === 0 ? (
              <div className={`h-full flex items-center justify-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchStudentChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className={`p-3 rounded-xl border shadow-lg ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} text-xs font-semibold space-y-1`}>
                            <p className="font-extrabold mb-1">Cabang {label}</p>
                            {payload.map((p: any) => (
                              <p key={p.name} style={{ color: p.color }}>
                                {p.name === 'SiswaAktif' ? 'Siswa Aktif' : 'Rata-Rata Nilai'}: <span className="font-bold">{p.value}</span>
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Bar dataKey="SiswaAktif" name="Siswa Aktif" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="RataNilai" name="Rata Nilai Kuis" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Realisasi SPP per Cabang (Lunas vs Tunggakan) */}
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 backdrop-blur-md ${
          isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2">
              <Receipt className="text-emerald-500" size={18} />
              <div>
                <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Realisasi SPP Lunas vs Tunggakan
                </h4>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total penerimaan SPP dan sisa piutang per cabang</p>
              </div>
            </div>
          </div>

          <div className="w-full h-[280px]">
            {sppChartData.length === 0 ? (
              <div className={`h-full flex items-center justify-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sppChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className={`p-3 rounded-xl border shadow-lg ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} text-xs font-semibold space-y-1`}>
                            <p className="font-extrabold mb-1">Cabang {label}</p>
                            {payload.map((p: any) => (
                              <p key={p.name} style={{ color: p.color }}>
                                {p.name}: <span className="font-bold">{formatRupiah(p.value)}</span>
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Bar dataKey="Lunas" name="Lunas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Tunggakan" name="Tunggakan" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 7. ROSTER ADMIN CABANG & AGENDA STRATEGIS SUPER ADMIN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Daftar Admin Cabang Bertugas */}
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm lg:col-span-2 space-y-4 backdrop-blur-md ${
          isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2">
              <UserCheck className="text-emerald-500" size={18} />
              <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Roster Petugas & Admin Cabang Aktif
              </h4>
            </div>
            <button
              onClick={() => onNavigate('branches_mgmt')}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              + Kelola Akun Admin
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
            {adminUsers.length === 0 ? (
              <p className={`text-xs italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Belum ada akun admin terdaftar.</p>
            ) : (
              adminUsers.map((admin) => {
                const avatar = getAdminAvatar(admin);

                return (
                  <div
                    key={admin.username}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={avatar}
                        alt={admin.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-emerald-500/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {admin.name}
                          </h5>
                          {admin.role === 'super_admin' ? (
                            <span className="text-[9px] font-black px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded">Pusat</span>
                          ) : admin.role === 'branch_assistant' ? (
                            <span className="text-[9px] font-black px-1.5 py-0.2 bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 rounded">Asisten</span>
                          ) : null}
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          @{admin.username} • <span className="font-bold text-emerald-600 dark:text-emerald-400">Cabang {admin.branch}</span>
                        </p>
                      </div>
                    </div>

                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Aktif" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Agenda & Tugas Strategis Super Admin */}
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 backdrop-blur-md ${
          isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-center gap-2">
              <CheckSquare className="text-indigo-500" size={18} />
              <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Agenda Pusat & Ekspansi
              </h4>
            </div>
          </div>

          {/* Quick Task Creator */}
          <form onSubmit={handleAddTask} className="flex gap-1.5">
            <input
              type="text"
              placeholder="Catat agenda pusat..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              className={`flex-1 px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/50 border-slate-800 text-white'
              }`}
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
            >
              <Plus size={14} />
            </button>
          </form>

          {/* Task List */}
          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
            {dashboardTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">Belum ada agenda dicatat.</p>
            ) : (
              dashboardTasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    t.completed
                      ? 'opacity-60 bg-slate-100/10 border-slate-800/40'
                      : isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'
                  }`}
                >
                  <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => onToggleDashboardTask(t.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className={`truncate font-semibold ${
                      t.completed ? 'line-through text-slate-400' : isLight ? 'text-slate-800' : 'text-slate-200'
                    }`}>
                      {t.text}
                    </span>
                  </label>
                  <button
                    onClick={() => onDeleteDashboardTask(t.id)}
                    className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
