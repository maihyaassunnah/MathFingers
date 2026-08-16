import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Attendance, Invoice, Grade, AppSettings, DashboardTask, Branch, AdminUser } from '../types';
import { formatRupiah, getWhatsAppLink, getStudentUniqueCode } from '../utils';
import { MathFingerLogo } from './MathFingerLogo';
import { MobileBranchAppView } from './MobileBranchAppView';
import { useMediaQuery } from '../hooks/useMediaQuery';
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
  Home,
  Users, 
  Layers,
  QrCode,
  GraduationCap,
  CheckSquare, 
  Receipt, 
  Award, 
  BookOpen, 
  Clock, 
  AlertTriangle, 
  Play, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Send,
  CalendarDays,
  Building,
  TrendingUp,
  FileText,
  History,
  Wallet,
  Database,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';

interface DashboardOverviewProps {
  students: Student[];
  attendance: Attendance[];
  invoices: Invoice[];
  grades: Grade[];
  settings: AppSettings;
  dashboardTasks: DashboardTask[];
  onAddDashboardTask: (text: string) => void;
  onToggleDashboardTask: (id: string) => void;
  onDeleteDashboardTask: (id: string) => void;
  onNavigate: (tab: string) => void;
  theme?: string;
  isSuperAdmin?: boolean;
  branches?: Branch[];
  activeBranch?: string;
  allStudents?: Student[];
  allAttendance?: Attendance[];
  allInvoices?: Invoice[];
  allGrades?: Grade[];
  currentUser?: AdminUser | null;
  onOpenUpdateModal?: () => void;
  isUpdateAvailable?: boolean;
  onSelectBranch?: (branchName: string) => void;
  onToggleTheme?: () => void;
}

export function DashboardOverview({ 
  students, 
  attendance, 
  invoices, 
  grades, 
  settings,
  dashboardTasks,
  onAddDashboardTask,
  onToggleDashboardTask,
  onDeleteDashboardTask,
  onNavigate, 
  theme = 'dark',
  isSuperAdmin = false,
  branches = [],
  activeBranch = 'all',
  allStudents = [],
  allAttendance = [],
  allInvoices = [],
  allGrades = [],
  currentUser = null,
  onOpenUpdateModal,
  isUpdateAvailable = false,
  onSelectBranch,
  onToggleTheme
}: DashboardOverviewProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [newTaskText, setNewTaskText] = useState('');

  // When on mobile view, render the dedicated Mobile Branch App experience with configurable elements
  if (!isDesktop) {
    return (
      <MobileBranchAppView
        students={students}
        attendance={attendance}
        invoices={invoices}
        grades={grades}
        settings={settings}
        theme={theme}
        isSuperAdmin={isSuperAdmin}
        branches={branches}
        activeBranch={activeBranch}
        currentUser={currentUser}
        onNavigate={onNavigate}
        onOpenUpdateModal={onOpenUpdateModal}
        isUpdateAvailable={isUpdateAvailable}
        onSelectBranch={onSelectBranch}
        onToggleTheme={onToggleTheme}
      />
    );
  }

  // Get active admin from prop, or fallback to localStorage if null/undefined
  const getActiveUser = () => {
    if (currentUser) return currentUser;
    const savedObj = localStorage.getItem('math_finggers_current_user_obj');
    if (savedObj) {
      try {
        const parsed = JSON.parse(savedObj);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return null;
  };

  const activeUser = getActiveUser();

  const resolveAdminName = () => {
    if (!activeUser) return 'Wahyudin Hafiz, S.Pd';
    const nameLower = activeUser.name.toLowerCase();
    const usernameLower = (activeUser.username || '').toLowerCase();
    
    // Check specific username or name keywords first
    if (usernameLower.includes('febrianti') || nameLower.includes('febrianti')) {
      return 'Febrianti Dewi, S.Pd';
    }
    if (usernameLower.includes('dewi') || nameLower.includes('dewi') || nameLower.includes('safitri')) {
      return 'Dewi Safitri, S.H';
    }
    if (usernameLower.includes('wahyudin') || nameLower.includes('wahyudin') || nameLower.includes('hafiz') || activeUser.role === 'super_admin') {
      return 'Wahyudin Hafiz, S.Pd';
    }
    return activeUser.name;
  };

  const activeAdminName = resolveAdminName();

  const resolveAdminRole = () => {
    if (!activeUser) return 'Super Admin';
    const name = activeAdminName.toLowerCase();
    if (name.includes('wahyudin')) {
      return 'Super Admin';
    }
    return `Admin Cabang (${activeUser.branch || 'Pusat'})`;
  };

  const activeAdminRoleText = resolveAdminRole();

  const activeStudents = students.filter(s => s.status === 'active');
  const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid');
  
  // Calculate attendance rate for today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysAttendance = attendance.filter(a => a.date === todayStr);
  
  const attendanceRate = todaysAttendance.length > 0
    ? Math.round((todaysAttendance.filter(a => a.status === 'present').length / todaysAttendance.length) * 100)
    : 100;

  // Average class accuracy score
  const avgClassScore = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length)
    : 0;

  // Unpaid SPP total value
  const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Recent grades list limit 3
  const recentGrades = grades.slice(0, 3);

  const isLight = theme === 'light';
  const isBranchAdmin = currentUser?.role === 'branch_admin' || activeUser?.role === 'branch_admin';

  // Calculate per-branch statistics for super admins
  const targetBranches = (activeBranch && activeBranch !== 'all')
    ? branches.filter(br => br.name === activeBranch)
    : branches;
  const displayBranches = targetBranches.length > 0 ? targetBranches : branches;

  const branchStats = displayBranches.map(branch => {
    const studentsSource = allStudents.length > 0 ? allStudents : students;
    const gradesSource = allGrades.length > 0 ? allGrades : grades;
    const attendanceSource = allAttendance.length > 0 ? allAttendance : attendance;
    const invoicesSource = allInvoices.length > 0 ? allInvoices : invoices;

    const actualBranchNames = branches.map(br => br.name);
    const isPusatMissing = !actualBranchNames.includes('Pusat');

    const getAssignedBranch = (recordBranch: string | undefined | null) => {
      const b = recordBranch || 'Pusat';
      if (isPusatMissing && (b === 'Pusat' || !actualBranchNames.includes(b))) {
        return branches[0]?.name || 'Pusat';
      }
      return b;
    };

    const branchStudents = studentsSource.filter(s => getAssignedBranch(s.branch) === branch.name);
    const activeCount = branchStudents.filter(s => s.status === 'active').length;
    const alumniCount = branchStudents.filter(s => s.status === 'alumni').length;

    const branchGrades = gradesSource.filter(g => getAssignedBranch(g.branch) === branch.name);
    const avgScore = branchGrades.length > 0
      ? Math.round(branchGrades.reduce((sum, g) => sum + g.score, 0) / branchGrades.length)
      : 0;

    const todayAttendance = attendanceSource.filter(a => a.date === todayStr && getAssignedBranch(a.branch) === branch.name);
    const attendanceRate = todayAttendance.length > 0
      ? Math.round((todayAttendance.filter(a => a.status === 'present').length / todayAttendance.length) * 100)
      : null;

    const branchInvoices = invoicesSource.filter(i => getAssignedBranch(i.branch) === branch.name && i.status === 'unpaid');
    const unpaidAmount = branchInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    return {
      name: branch.name,
      totalStudents: branchStudents.length,
      activeCount,
      alumniCount,
      avgScore,
      attendanceRate,
      unpaidCount: branchInvoices.length,
      unpaidAmount
    };
  });

  // Sesi Belajar Hari Ini (Attendance status of active students)
  const learningSessions = activeStudents.map(student => {
    const record = todaysAttendance.find(a => a.studentId === student.id);
    return {
      student,
      marked: !!record,
      status: record?.status,
      notes: record?.notes
    };
  });

  // SPP Invoices due today or overdue
  const dueInvoices = unpaidInvoices.filter(inv => {
    return inv.dueDate <= todayStr;
  });

  // Helper to group by week for Attendance Trends
  const getWeeklyAttendanceData = () => {
    const attendanceSource = (activeBranch && activeBranch !== 'all')
      ? attendance
      : (allAttendance.length > 0 ? allAttendance : attendance);
    if (attendanceSource.length === 0) return [];

    const now = new Date();
    const weeksData = [];
    
    for (let i = 5; i >= 0; i--) {
      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - (now.getDay() || 7) + 1 - (i * 7));
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const startStr = startOfWeek.toISOString().slice(0, 10);
      const endStr = endOfWeek.toISOString().slice(0, 10);

      const weeklyRecords = attendanceSource.filter(a => a.date >= startStr && a.date <= endStr);
      const present = weeklyRecords.filter(a => a.status === 'present').length;
      const permission = weeklyRecords.filter(a => a.status === 'permission').length;
      const absent = weeklyRecords.filter(a => a.status === 'absent').length;

      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      const label = `${startOfWeek.toLocaleDateString('id-ID', options)} - ${endOfWeek.toLocaleDateString('id-ID', options)}`;

      weeksData.push({
        weekLabel: label,
        'Hadir': present,
        'Izin': permission,
        'Absen': absent,
        'Total': weeklyRecords.length
      });
    }
    return weeksData;
  };

  const getSppIncomeData = () => {
    const invoicesSource = (activeBranch && activeBranch !== 'all')
      ? invoices
      : (allInvoices.length > 0 ? allInvoices : invoices);
    const actualBranchNames = branches.map(br => br.name);
    const isPusatMissing = !actualBranchNames.includes('Pusat');

    const getAssignedBranch = (recordBranch: string | undefined | null) => {
      const b = recordBranch || 'Pusat';
      if (isPusatMissing && (b === 'Pusat' || !actualBranchNames.includes(b))) {
        return branches[0]?.name || 'Pusat';
      }
      return b;
    };

    return displayBranches.map(branch => {
      const branchInvoices = invoicesSource.filter(i => getAssignedBranch(i.branch) === branch.name && (i.category === 'spp' || !i.category));
      
      let totalPaid = 0;
      let totalUnpaid = 0;

      branchInvoices.forEach(inv => {
        if (inv.status === 'paid') {
          totalPaid += inv.amount;
        } else if (inv.status === 'partially_paid') {
          const paid = inv.amountPaid || 0;
          totalPaid += paid;
          totalUnpaid += Math.max(0, inv.amount - paid);
        } else {
          totalUnpaid += inv.amount;
        }
      });

      return {
        name: branch.name,
        'Lunas': totalPaid,
        'Tunggakan': totalUnpaid,
        'Total': totalPaid + totalUnpaid
      };
    });
  };

  const getBranchSppMonthlyData = () => {
    const invoicesSource = invoices;
    if (invoicesSource.length === 0) return [];

    const monthNamesId = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const now = new Date();
    const resultData = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthNamesId[d.getMonth()];
      const year = d.getFullYear();
      const label = `${monthName.slice(0, 3)} ${year}`;

      const matchedInvoices = invoicesSource.filter(inv => {
        if (inv.month) {
          const mLower = inv.month.toLowerCase();
          return mLower.includes(monthName.toLowerCase()) || mLower.includes(monthName.slice(0, 3).toLowerCase());
        }
        return inv.dueDate && inv.dueDate.startsWith(`${year}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      });

      let lunas = 0;
      let tunggakan = 0;

      matchedInvoices.forEach(inv => {
        if (inv.status === 'paid') {
          lunas += inv.amount;
        } else if (inv.status === 'partially_paid') {
          const paid = inv.amountPaid || 0;
          lunas += paid;
          tunggakan += Math.max(0, inv.amount - paid);
        } else {
          tunggakan += inv.amount;
        }
      });

      resultData.push({
        name: label,
        'Lunas': lunas,
        'Tunggakan': tunggakan,
        'Total': lunas + tunggakan
      });
    }

    const hasMonthlyData = resultData.some(item => item.Total > 0);
    if (!hasMonthlyData) {
      const monthGroups: Record<string, { lunas: number; tunggakan: number }> = {};
      invoicesSource.forEach(inv => {
        const key = inv.month || 'Periode SPP';
        if (!monthGroups[key]) monthGroups[key] = { lunas: 0, tunggakan: 0 };
        if (inv.status === 'paid') {
          monthGroups[key].lunas += inv.amount;
        } else if (inv.status === 'partially_paid') {
          const paid = inv.amountPaid || 0;
          monthGroups[key].lunas += paid;
          monthGroups[key].tunggakan += Math.max(0, inv.amount - paid);
        } else {
          monthGroups[key].tunggakan += inv.amount;
        }
      });

      const groupedKeys = Object.keys(monthGroups);
      if (groupedKeys.length > 0) {
        return groupedKeys.map(k => ({
          name: k,
          'Lunas': monthGroups[k].lunas,
          'Tunggakan': monthGroups[k].tunggakan,
          'Total': monthGroups[k].lunas + monthGroups[k].tunggakan
        }));
      }
    }

    return resultData;
  };

  const weeklyAttendanceData = getWeeklyAttendanceData();
  const sppIncomeData = getSppIncomeData();
  const branchSppMonthlyData = getBranchSppMonthlyData();

  let branchTotalPaid = 0;
  let branchTotalUnpaid = 0;
  invoices.forEach(inv => {
    if (inv.status === 'paid') {
      branchTotalPaid += inv.amount;
    } else if (inv.status === 'partially_paid') {
      const paid = inv.amountPaid || 0;
      branchTotalPaid += paid;
      branchTotalUnpaid += Math.max(0, inv.amount - paid);
    } else {
      branchTotalUnpaid += inv.amount;
    }
  });
  const branchTotalSpp = branchTotalPaid + branchTotalUnpaid;
  const branchPaidPercentage = branchTotalSpp > 0 ? Math.round((branchTotalPaid / branchTotalSpp) * 100) : 100;

  // Handle adding custom task
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    onAddDashboardTask(newTaskText.trim());
    setNewTaskText('');
  };

  const sendInvoiceReminder = (invoice: Invoice) => {
    const student = students.find(s => s.id === invoice.studentId);
    if (!student) return;

    const message = `Halo Ibu/Bapak *${student.parentName}*,\n\nSemoga sehat selalu. Mengingatkan kembali untuk tagihan *SPP Les Privat Math Fingers* ananda *${student.name}* periode *${invoice.month}* yang jatuh tempo pada *${invoice.dueDate}*:\n\n🧾 No Invoice: ${invoice.invoiceNo}\n💵 Jumlah Tagihan: *${formatRupiah(invoice.amount)}*\n\n*Informasi Rekening Pembayaran:*\n🏦 Bank ${settings.bankName}: *${settings.bankAccountNo}*\n👤 Atas Nama: *${settings.bankAccountHolder}*\n\n_(Harap konfirmasi dengan mengirimkan bukti transfer jika pembayaran telah dilakukan. Terima kasih banyak!_ 🙏🌸)\n\n*Math Fingers* - Berhitung Cepat & Akurat Tanpa Alat! ✨`;
    const waLink = getWhatsAppLink(student.parentPhone, message);
    window.open(waLink, '_blank', 'noreferrer');
  };

  // Color theme class map
  const getAccentBgClass = () => {
    switch (settings.accentColor) {
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-500';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500';
      case 'sky': return 'bg-sky-600 hover:bg-sky-500';
      case 'emerald':
      default: return 'bg-emerald-600 hover:bg-emerald-500';
    }
  };

  const getAccentTextClass = () => {
    switch (settings.accentColor) {
      case 'indigo': return 'text-indigo-500';
      case 'violet': return 'text-violet-500';
      case 'amber': return 'text-amber-500';
      case 'rose': return 'text-rose-500';
      case 'sky': return 'text-sky-500';
      case 'emerald':
      default: return 'text-emerald-500';
    }
  };

  return (
    <div id="dashboard-overview-section" className="space-y-6">
      
      {/* Notice Banner for App Update (Cabang) */}
      {isUpdateAvailable && onOpenUpdateModal && (
        <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 shadow-md ${
          isLight
            ? 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border-amber-300 text-amber-950'
            : 'bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-emerald-950/40 border-amber-500/40 text-amber-100'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-black shrink-0 shadow-sm animate-bounce">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base">Pembaruan Aplikasi Math Fingers Tersedia!</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px]">v3.2.0</span>
              </div>
              <p className="text-xs opacity-90 mt-1 leading-relaxed">
                {currentUser?.role === 'branch_admin' ? `Cabang ${currentUser?.branch || ''}` : 'Sistem'} belum memperbarui ke versi Rilis v3.2.0. Dapatkan Grafik Analitik, QR Code Scanner, & Kuitansi PDF Resmi.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenUpdateModal}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all shrink-0 flex items-center justify-center gap-2"
          >
            <Download size={15} />
            <span>Update Aplikasi</span>
          </button>
        </div>
      )}

      {/* Brand Hero Welcome Banner */}
      <div className={`relative overflow-hidden transition-all duration-300 rounded-3xl border shadow-md ${
        isLight 
          ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50' 
          : 'bg-slate-900 border-slate-800 text-white shadow-emerald-950/30'
        } p-5 sm:p-7 backdrop-blur-md text-center`}
      >
        {/* Background decorative ambient glow */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-3.5 max-w-2xl mx-auto">
          {/* Logo mathfinger kecil di tengah paling atas dashboard */}
          <div className="flex justify-center px-4 py-2 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <MathFingerLogo size={36} textSize="md" theme="light" />
          </div>

          {/* Role and Date Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
              isLight ? 'bg-emerald-100/90 border-emerald-300 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{activeAdminRoleText}</span>
            </div>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              <CalendarDays size={13} className={isLight ? 'text-slate-600' : 'text-slate-400'} />
              <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Greeting & Name dengan Kontras Tinggi */}
          <div className="space-y-1">
            <p className={`text-xs sm:text-sm font-extrabold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Selamat datang kembali 👋
            </p>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {activeAdminName}
            </h1>
            <p className={`text-xs sm:text-sm font-semibold max-w-xl mx-auto leading-relaxed pt-1 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              Kelola presensi harian, tagihan SPP, serta perkembangan hasil kuis berhitung siswa Math Fingers.
            </p>
          </div>

          {/* Menu Dashboard: 3 Kolom Kesamping, Icon Only Tanpa Keterangan Teks, Sisa Menu di Bawahnya */}
          <div className="w-full max-w-xl mx-auto pt-3">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {(isSuperAdmin
                ? [
                    { id: 'overview', name: 'Statistik & Beranda', icon: Home },
                    { id: 'students', name: 'Data Siswa', icon: Users },
                    { id: 'classes', name: 'Manajemen Kelas', icon: Layers },
                    { id: 'qr_cards', name: 'Kartu QR Siswa', icon: QrCode },
                    { id: 'alumni', name: 'Alumni / Lulus', icon: GraduationCap },
                    { id: 'attendance', name: 'Presensi / Absensi', icon: CheckSquare },
                    { id: 'notes', name: 'Jurnal Guru', icon: FileText },
                    { id: 'journal_history', name: 'Riwayat Jurnal', icon: History },
                    { id: 'spp', name: 'Pembayaran SPP', icon: Receipt },
                    { id: 'spp_history', name: 'Riwayat Pembayaran SPP', icon: History },
                    { id: 'finance', name: 'Laporan Keuangan', icon: Wallet },
                    { id: 'grades', name: 'Input Nilai & Kuis', icon: Award },
                    { id: 'simulator', name: 'Kurikulum & Materi', icon: BookOpen },
                    { id: 'report', name: 'Rapor Perkembangan', icon: TrendingUp },
                    { id: 'branches_mgmt', name: 'Data Cabang & Admin', icon: Building },
                    { id: 'supabase_sql', name: 'SQL Editor Supabase', icon: Database },
                    { id: 'settings', name: 'Pengaturan & Backup', icon: Settings },
                  ]
                : [
                    { id: 'overview', name: 'Dashboard Cabang', icon: Home },
                    { id: 'students', name: 'Data Siswa', icon: Users },
                    { id: 'classes', name: 'Manajemen Kelas', icon: Layers },
                    { id: 'qr_cards', name: 'Kartu QR Siswa', icon: QrCode },
                    { id: 'alumni', name: 'Alumni / Lulus', icon: GraduationCap },
                    { id: 'attendance', name: 'Presensi / Absensi', icon: CheckSquare },
                    { id: 'notes', name: 'Jurnal Guru', icon: FileText },
                    { id: 'journal_history', name: 'Riwayat Jurnal', icon: History },
                    { id: 'spp', name: 'Pembayaran SPP', icon: Receipt },
                    { id: 'spp_history', name: 'Riwayat Pembayaran SPP', icon: History },
                    { id: 'finance', name: 'Laporan Keuangan', icon: Wallet },
                    { id: 'grades', name: 'Input Nilai & Kuis', icon: Award },
                    { id: 'simulator', name: 'Kurikulum & Materi', icon: BookOpen },
                    { id: 'report', name: 'Rapor Perkembangan', icon: TrendingUp },
                    { id: 'settings', name: 'Pengaturan Cabang', icon: Settings },
                  ]
              ).map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`dashboard-menu-icon-${item.id}`}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    title={item.name}
                    aria-label={item.name}
                    className={`h-13 sm:h-14 rounded-2xl flex items-center justify-center border transition-all duration-200 active:scale-95 cursor-pointer shadow-xs group ${
                      isLight
                        ? 'bg-slate-50/90 hover:bg-emerald-50/60 border-slate-200/90 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 shadow-slate-200/50'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 shadow-black/20'
                    }`}
                  >
                    <IconComponent
                      size={22}
                      className="transition-transform duration-200 group-hover:scale-110"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Super Admin: Statistik Keseluruhan Cabang */}
      {isSuperAdmin && (
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 backdrop-blur-md transition-all duration-300 ${
          isLight 
            ? 'bg-white/75 border-white/50 shadow-[0_8px_32px_rgba(148,163,184,0.05)]' 
            : 'bg-slate-900/60 border-emerald-500/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)]'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 mb-2 gap-2">
            <div className="flex items-center gap-2">
              <Building className={getAccentTextClass()} size={22} />
              <div>
                <h3 className={`text-lg font-bold font-sans ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  {activeBranch && activeBranch !== 'all' ? `Statistik Cabang (${activeBranch})` : 'Statistik Keseluruhan per Cabang'}
                </h3>
                <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">
                  {activeBranch && activeBranch !== 'all' ? `Data real-time khusus untuk ${activeBranch}` : 'Data real-time agregat untuk setiap cabang bimbingan Math Fingers'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-550/10 text-emerald-600 dark:text-emerald-400 border border-emerald-550/15 text-xs font-semibold self-start sm:self-center">
              <Sparkles size={12} className="animate-pulse text-emerald-500" />
              <span>{activeBranch && activeBranch !== 'all' ? `Cabang: ${activeBranch}` : 'Multi-Cabang Aktif'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchStats.map((b) => (
              <div 
                key={b.name} 
                className={`p-4 rounded-2xl border transition hover:shadow-md ${
                  isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-[#0f172a] border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-2.5 mb-3 border-slate-150 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className={`font-extrabold text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{b.name}</h4>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Cabang</span>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Siswa Aktif / Alumni</span>
                    <span className={`font-extrabold text-base ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      {b.activeCount} <span className="text-xs text-slate-500 font-normal">/ {b.alumniCount}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Rata-rata Skor</span>
                    <span className="font-extrabold text-base text-sky-500 dark:text-sky-400">
                      {b.avgScore} <span className="text-[10px] font-normal text-slate-500">/ 100</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Presensi Hari Ini</span>
                    <span className={`font-extrabold text-sm ${b.attendanceRate !== null ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {b.attendanceRate !== null ? `${b.attendanceRate}%` : 'Belum absen'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Tunggakan SPP</span>
                    <span className={`font-bold text-xs block truncate ${b.unpaidAmount > 0 ? 'text-rose-500 font-extrabold' : 'text-emerald-500'}`}>
                      {b.unpaidAmount > 0 ? formatRupiah(b.unpaidAmount) : 'Lunas'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed summary comparison table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-150 dark:border-slate-800/80 mt-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`${isLight ? 'bg-slate-50 text-slate-600' : 'bg-[#0f172a] text-slate-450'} border-b border-slate-150 dark:border-slate-800/80 font-bold`}>
                  <th className="p-3">Nama Cabang</th>
                  <th className="p-3 text-center">Siswa Aktif</th>
                  <th className="p-3 text-center">Alumni / Lulus</th>
                  <th className="p-3 text-center">Rata-rata Kuis</th>
                  <th className="p-3 text-center">Presensi Hari Ini</th>
                  <th className="p-3 text-right">Tunggakan SPP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
                {branchStats.map((b) => (
                  <tr key={b.name} className={`transition ${isLight ? 'hover:bg-slate-50/50' : 'hover:bg-slate-800/10'}`}>
                    <td className="p-3 font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>{b.name}</span>
                    </td>
                    <td className="p-3 text-center font-semibold">{b.activeCount} siswa</td>
                    <td className="p-3 text-center text-slate-400">{b.alumniCount} lulus</td>
                    <td className="p-3 text-center font-mono font-bold text-sky-500">{b.avgScore}/100</td>
                    <td className="p-3 text-center font-bold">
                      {b.attendanceRate !== null ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                          {b.attendanceRate}%
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Belum absen</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {b.unpaidAmount > 0 ? (
                        <span className="text-rose-500 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 inline-block text-[11px]">
                          {formatRupiah(b.unpaidAmount)} ({b.unpaidCount} tagihan)
                        </span>
                      ) : (
                        <span className="text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 inline-block text-[11px]">
                          Lunas
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visualisasi Data & Tren Analitik */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            
            {/* Chart 1: Tren Kehadiran Siswa Mingguan */}
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-[#0f172a] border-slate-800'} space-y-4`}>
              <div className="flex items-center gap-2 border-b pb-3 border-slate-150 dark:border-slate-800/80">
                <TrendingUp className="text-emerald-500" size={18} />
                <div>
                  <h4 className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {activeBranch && activeBranch !== 'all' ? `Tren Kehadiran Siswa Mingguan (${activeBranch})` : 'Tren Kehadiran Siswa Mingguan'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {activeBranch && activeBranch !== 'all' ? `Jumlah status kehadiran 6 minggu terakhir (${activeBranch})` : 'Agregat jumlah status kehadiran (Hadir, Izin, Absen) 6 minggu terakhir'}
                  </p>
                </div>
              </div>

              <div className="w-full h-[280px]">
                {weeklyAttendanceData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                    Belum ada data kehadiran mingguan
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={weeklyAttendanceData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorIzin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAbsen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} />
                      <XAxis 
                        dataKey="weekLabel" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className={`p-3 rounded-xl border shadow-lg ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} text-xs font-semibold space-y-1`}>
                                <p className="font-extrabold mb-1">{label}</p>
                                {payload.map((p: any) => (
                                  <p key={p.name} style={{ color: p.color }}>
                                    {p.name}: <span className="font-bold">{p.value} sesi</span>
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Hadir" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorHadir)" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Izin" 
                        stroke="#f59e0b" 
                        fillOpacity={1} 
                        fill="url(#colorIzin)" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Absen" 
                        stroke="#ef4444" 
                        fillOpacity={1} 
                        fill="url(#colorAbsen)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Pendapatan SPP per Cabang */}
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-[#0f172a] border-slate-800'} space-y-4`}>
              <div className="flex items-center gap-2 border-b pb-3 border-slate-150 dark:border-slate-800/80">
                <Receipt className="text-emerald-500" size={18} />
                <div>
                  <h4 className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {activeBranch && activeBranch !== 'all' ? `Pendapatan & Tunggakan SPP (${activeBranch})` : 'Pendapatan & Tunggakan SPP per Cabang'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {activeBranch && activeBranch !== 'all' ? `Perbandingan jumlah pembayaran lunas vs sisa tunggakan SPP (${activeBranch})` : 'Perbandingan jumlah pembayaran lunas vs sisa tunggakan SPP per cabang'}
                  </p>
                </div>
              </div>

              <div className="w-full h-[280px]">
                {sppIncomeData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                    Belum ada data cabang bimbingan
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sppIncomeData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                      />
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
                                {payload.length > 1 && (
                                  <p className="border-t pt-1 mt-1 text-[11px] opacity-80">
                                    Total: <span className="font-bold text-slate-500 dark:text-slate-400">
                                      {formatRupiah(payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0))}
                                    </span>
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }}
                      />
                      <Bar 
                        dataKey="Lunas" 
                        name="Lunas (Paid)" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={45}
                      />
                      <Bar 
                        dataKey="Tunggakan" 
                        name="Tunggakan (Unpaid)" 
                        fill="#ef4444" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={45}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
 
      {/* Metrics bento-grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        
        {/* Metric 1: Siswa Aktif */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('students')} 
          className={`p-4 sm:p-5 rounded-2xl border flex items-center gap-3.5 sm:gap-4 cursor-pointer transition-all duration-300 group ${
            isLight 
              ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-400' 
              : 'bg-slate-900 border-slate-800 shadow-sm hover:shadow-emerald-950/40 hover:border-emerald-500/40'
          }`}
        >
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Users size={22} className="group-hover:scale-110 transition-transform" />
          </div>
          <div className="min-w-0">
            <span className={`text-[10px] sm:text-xs font-black tracking-wider uppercase block truncate ${
              isLight ? 'text-slate-800' : 'text-slate-400'
            }`}>
              Siswa Aktif
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xl sm:text-2xl font-black ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {activeStudents.length}
              </span>
              <span className={`text-[11px] font-bold ${
                isLight ? 'text-emerald-700' : 'text-emerald-400'
              }`}>
                Anak
              </span>
            </div>
            <span className={`text-[10px] font-medium block truncate mt-0.5 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {students.length} Total terdaftar
            </span>
          </div>
        </motion.div>

        {/* Metric 2: Presensi Hari Ini */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('attendance')} 
          className={`p-4 sm:p-5 rounded-2xl border flex items-center gap-3.5 sm:gap-4 cursor-pointer transition-all duration-300 group ${
            isLight 
              ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-400' 
              : 'bg-slate-900 border-slate-800 shadow-sm hover:shadow-amber-950/40 hover:border-amber-500/40'
          }`}
        >
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <CheckSquare size={22} className="group-hover:scale-110 transition-transform" />
          </div>
          <div className="min-w-0">
            <span className={`text-[10px] sm:text-xs font-black tracking-wider uppercase block truncate ${
              isLight ? 'text-slate-800' : 'text-slate-400'
            }`}>
              Presensi Hari Ini
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xl sm:text-2xl font-black ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {todaysAttendance.length > 0 ? `${attendanceRate}%` : '0%'}
              </span>
            </div>
            <span className={`text-[10px] font-medium block truncate mt-0.5 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {todaysAttendance.length > 0 
                ? `${todaysAttendance.filter(a => a.status === 'present').length}/${todaysAttendance.length} Siswa hadir`
                : 'Belum diabsen hari ini'}
            </span>
          </div>
        </motion.div>

        {/* Metric 3: Tagihan SPP */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('spp')} 
          className={`p-4 sm:p-5 rounded-2xl border flex items-center gap-3.5 sm:gap-4 cursor-pointer transition-all duration-300 group ${
            isLight 
              ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-rose-400' 
              : 'bg-slate-900 border-slate-800 shadow-sm hover:shadow-rose-950/40 hover:border-rose-500/40'
          }`}
        >
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Receipt size={22} className="group-hover:scale-110 transition-transform" />
          </div>
          <div className="min-w-0">
            <span className={`text-[10px] sm:text-xs font-black tracking-wider uppercase block truncate ${
              isLight ? 'text-slate-800' : 'text-slate-400'
            }`}>
              Tagihan SPP
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xl sm:text-2xl font-black ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {unpaidInvoices.length}
              </span>
              <span className={`text-[11px] font-bold ${
                isLight ? 'text-rose-700' : 'text-rose-400'
              }`}>
                Tagihan
              </span>
            </div>
            <span className={`text-[10px] font-bold block truncate mt-0.5 ${
              isLight ? 'text-rose-700' : 'text-rose-400'
            }`}>
              {unpaidAmount > 0 ? formatRupiah(unpaidAmount) : 'Semua Lunas!'}
            </span>
          </div>
        </motion.div>

        {/* Metric 4: Rata-Rata Kelas */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('grades')} 
          className={`p-4 sm:p-5 rounded-2xl border flex items-center gap-3.5 sm:gap-4 cursor-pointer transition-all duration-300 group ${
            isLight 
              ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-sky-400' 
              : 'bg-slate-900 border-slate-800 shadow-sm hover:shadow-sky-950/40 hover:border-sky-500/40'
          }`}
        >
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-sky-500/25 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Award size={22} className="group-hover:scale-110 transition-transform" />
          </div>
          <div className="min-w-0">
            <span className={`text-[10px] sm:text-xs font-black tracking-wider uppercase block truncate ${
              isLight ? 'text-slate-800' : 'text-slate-400'
            }`}>
              Rata Kelas
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl sm:text-2xl font-black ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {avgClassScore}
              </span>
              <span className={`text-xs font-semibold ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                /100
              </span>
            </div>
            <span className={`text-[10px] font-medium block truncate mt-0.5 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              Akurasi kuis berhitung
            </span>
          </div>
        </motion.div>

      </div>

      {/* Admin Cabang: Visualisasi Data & Tren Analitik */}
      {!isSuperAdmin && (
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-6 backdrop-blur-md transition-all duration-300 ${
          isLight 
            ? 'bg-white/75 border-white/50 shadow-[0_8px_32px_rgba(148,163,184,0.05)]' 
            : 'bg-slate-900/60 border-emerald-500/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)]'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2 border-slate-150 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <TrendingUp className={getAccentTextClass()} size={22} />
              <div>
                <h3 className={`text-lg font-bold font-sans ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Grafik & Analitik Performa Cabang ({activeBranch && activeBranch !== 'all' ? activeBranch : (currentUser?.branch || 'Cabang')})
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 text-xs font-semibold self-start sm:self-center">
              <Sparkles size={12} className="animate-pulse text-emerald-500" />
              <span>Analitik Real-time</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Tren Kehadiran Siswa Mingguan */}
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-[#0f172a] border-slate-800'} space-y-4`}>
              <div className="flex items-center gap-2 border-b pb-3 border-slate-150 dark:border-slate-800/80">
                <TrendingUp className="text-emerald-500" size={18} />
                <div>
                  <h4 className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    Grafik Tren Kehadiran Siswa Mingguan
                  </h4>
                  <p className="text-[11px] text-slate-500">Jumlah status kehadiran (Hadir, Izin, Absen) 6 minggu terakhir</p>
                </div>
              </div>

              <div className="w-full h-[280px]">
                {weeklyAttendanceData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                    Belum ada data presensi siswa
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={weeklyAttendanceData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorHadirCabang" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorIzinCabang" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAbsenCabang" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} />
                      <XAxis dataKey="weekLabel" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className={`p-3 rounded-xl border shadow-lg ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} text-xs font-semibold space-y-1`}>
                                <p className="font-extrabold mb-1">{label}</p>
                                {payload.map((p: any) => (
                                  <p key={p.name} style={{ color: p.color }}>
                                    {p.name}: <span className="font-bold">{p.value} sesi</span>
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="Hadir" stroke="#10b981" fillOpacity={1} fill="url(#colorHadirCabang)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Izin" stroke="#f59e0b" fillOpacity={1} fill="url(#colorIzinCabang)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Absen" stroke="#ef4444" fillOpacity={1} fill="url(#colorAbsenCabang)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Grafik & Statistik Pendapatan dan Tunggakan SPP */}
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-[#0f172a] border-slate-800'} space-y-4`}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-150 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Receipt className="text-emerald-500" size={18} />
                  <div>
                    <h4 className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Grafik & Statistik Pendapatan & Tunggakan SPP
                    </h4>
                    <p className="text-[11px] text-slate-500">Perbandingan pembayaran Lunas vs Tunggakan cabang ini</p>
                  </div>
                </div>
              </div>

              {/* Mini SPP Stat Badges */}
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2.5 rounded-xl border text-center ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className="text-[10px] font-bold text-slate-400 block">LUNAS</span>
                  <span className="text-xs font-extrabold text-emerald-500 truncate block">{formatRupiah(branchTotalPaid)}</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className="text-[10px] font-bold text-slate-400 block">TUNGGAKAN</span>
                  <span className="text-xs font-extrabold text-rose-500 truncate block">{formatRupiah(branchTotalUnpaid)}</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className="text-[10px] font-bold text-slate-400 block">PELUNASAN</span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block">{branchPaidPercentage}%</span>
                </div>
              </div>

              <div className="w-full h-[210px]">
                {branchSppMonthlyData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                    Belum ada data tagihan SPP
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={branchSppMonthlyData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className={`p-3 rounded-xl border shadow-lg ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} text-xs font-semibold space-y-1`}>
                                <p className="font-extrabold mb-1">Periode {label}</p>
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
                      <Legend verticalAlign="top" height={30} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                      <Bar dataKey="Lunas" name="Lunas (Paid)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Tunggakan" name="Tunggakan (Unpaid)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SECTION: KEGIATAN & AGENDA HARI INI */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm backdrop-blur-md transition-all duration-300 ${
        isLight 
          ? 'bg-white/75 border-white/50 shadow-[0_8px_32px_rgba(148,163,184,0.05)]' 
          : 'bg-slate-900/60 border-emerald-500/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)]'
      }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 mb-5 gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className={getAccentTextClass()} size={22} />
                <h3 className={`text-lg font-bold font-sans ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Kegiatan & Agenda Hari Ini
                </h3>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950/60 text-slate-400'}`}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Panel 1: Sesi Belajar & Absensi */}
              <div className={`space-y-4 ${isBranchAdmin ? 'hidden md:block' : ''}`}>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Presensi Siswa Hari Ini</span>
                </h4>
                
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {learningSessions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Tidak ada siswa aktif terdaftar.</p>
                  ) : (
                    learningSessions.map(({ student, marked, status, notes: sNotes }) => (
                      <div 
                        key={student.id} 
                        className={`p-3 border rounded-xl flex items-center justify-between text-xs transition ${
                          isLight ? 'bg-slate-50 border-slate-150' : 'bg-slate-950/20 border-slate-800/80'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{student.name}</span>
                            <span className="text-[9px] font-mono font-bold px-1 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 rounded shrink-0">
                              #{getStudentUniqueCode(student)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">{student.level}</div>
                        </div>
                        
                        <div>
                          {marked ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              status === 'present' 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : status === 'absent'
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {status === 'present' ? 'Hadir' : status === 'absent' ? 'Absen' : 'Izin'}
                            </span>
                          ) : (
                            <button
                              onClick={() => onNavigate('attendance')}
                              className={`px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded font-bold text-[10px] transition`}
                            >
                              Catat Absen
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Panel 2: SPP Jatuh Tempo */}
              <div className={`space-y-4 ${isBranchAdmin ? 'hidden md:block' : ''}`}>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Tagihan Jatuh Tempo & Overdue</span>
                </h4>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {dueInvoices.length === 0 ? (
                    <div className={`p-4 text-center rounded-xl border border-dashed ${
                      isLight ? 'border-slate-200 bg-slate-50/50 text-slate-400' : 'border-slate-800 bg-slate-950/10 text-slate-500'
                    }`}>
                      <CheckCircle size={22} className="mx-auto text-emerald-500/70 mb-1.5" />
                      <p className="text-[11px] font-medium">Semua tagihan lunas/aman!</p>
                    </div>
                  ) : (
                    dueInvoices.map((inv) => (
                      <div 
                        key={inv.id} 
                        className={`p-3 border rounded-xl flex items-center justify-between text-xs transition ${
                          isLight ? 'bg-slate-50 border-slate-150' : 'bg-slate-950/20 border-slate-800/80'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{inv.studentName}</div>
                          <div className="text-[10px] text-rose-500 font-semibold mt-0.5">Tempo: {inv.dueDate}</div>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            {formatRupiah(inv.amount)}
                          </span>
                          <button
                            onClick={() => sendInvoiceReminder(inv)}
                            className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition"
                            title="Kirim Pengingat WA"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Panel 3: Agenda Kegiatan Mandiri Guru */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>Agenda Mandiri Pengajar</span>
                </h4>

                <div className="space-y-3">
                  {/* Simple inline task creator */}
                  <form onSubmit={handleAddTaskSubmit} className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Ketik tugas mandiri hari ini..."
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      className={`flex-1 px-3 py-1.5 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                      }`}
                    />
                    <button
                      type="submit"
                      className={`px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition`}
                    >
                      <Plus size={14} />
                    </button>
                  </form>

                  {/* Task list */}
                  <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                    {dashboardTasks.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic text-center py-4">Belum ada agenda mandiri dicatat.</p>
                    ) : (
                      dashboardTasks.map((task) => (
                        <div 
                          key={task.id} 
                          className={`px-3 py-2 border rounded-xl flex items-center justify-between gap-2 transition ${
                            task.completed 
                              ? 'opacity-60 bg-slate-100/10 border-slate-800/40' 
                              : isLight ? 'bg-slate-50 border-slate-150' : 'bg-slate-950/20 border-slate-800/80'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => onToggleDashboardTask(task.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            <span className={`text-xs truncate font-semibold select-none ${
                              task.completed 
                                ? 'line-through text-slate-500' 
                                : isLight ? 'text-slate-700' : 'text-slate-300'
                            }`}>
                              {task.text}
                            </span>
                          </label>
                          
                          <button
                            onClick={() => onDeleteDashboardTask(task.id)}
                            className="text-slate-500 hover:text-rose-500 p-0.5 rounded transition"
                            title="Hapus Agenda"
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left column: Action shortcuts */}
            {!isSuperAdmin && (
              <div className={`hidden md:block p-5 rounded-2xl border shadow-sm space-y-4 lg:col-span-1 backdrop-blur-md transition-all duration-300 ${
                isLight 
                  ? 'bg-white/75 border-white/50 shadow-[0_8px_32px_rgba(148,163,184,0.05)]' 
                  : 'bg-slate-900/60 border-emerald-500/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)]'
              }`}>
                <h3 className={`font-bold text-base ${isLight ? 'text-slate-850' : 'text-white'}`}>Menu Navigasi Pintar</h3>
                <div className="grid grid-cols-1 gap-2">
                  
                  <motion.button
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate('students')}
                    className={`flex items-center justify-between p-3 rounded-xl border transition text-left group ${
                      isLight ? 'border-slate-100 bg-slate-50 hover:bg-slate-100/70' : 'border-slate-800/80 bg-slate-950/30 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 border text-emerald-500 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}>1</div>
                      <div>
                        <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Kelola Data Siswa</div>
                        <div className="text-[10px] text-slate-400">Pendaftaran & info wali murid</div>
                      </div>
                    </div>
                    <Play size={12} className="text-slate-550 group-hover:text-emerald-550 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate('attendance')}
                    className={`flex items-center justify-between p-3 rounded-xl border transition text-left group ${
                      isLight ? 'border-slate-100 bg-slate-50 hover:bg-slate-100/70' : 'border-slate-800/80 bg-slate-950/30 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 border text-emerald-500 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}>2</div>
                      <div>
                        <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Cetak Presensi Hari Ini</div>
                        <div className="text-[10px] text-slate-400">Absen & kirim report harian</div>
                      </div>
                    </div>
                    <Play size={12} className="text-slate-550 group-hover:text-emerald-550 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate('spp')}
                    className={`flex items-center justify-between p-3 rounded-xl border transition text-left group ${
                      isLight ? 'border-slate-100 bg-slate-50 hover:bg-slate-100/70' : 'border-slate-800/80 bg-slate-950/30 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 border text-emerald-500 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}>3</div>
                      <div>
                        <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Keuangan & Tagihan SPP</div>
                        <div className="text-[10px] text-slate-400">Lunas/Belum bayar & kuitansi</div>
                      </div>
                    </div>
                    <Play size={12} className="text-slate-550 group-hover:text-emerald-550 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate('grades')}
                    className={`flex items-center justify-between p-3 rounded-xl border transition text-left group ${
                      isLight ? 'border-slate-100 bg-slate-50 hover:bg-slate-100/70' : 'border-slate-800/80 bg-slate-950/30 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 border text-emerald-500 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}>4</div>
                      <div>
                        <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Input Hasil Evaluasi & Nilai</div>
                        <div className="text-[10px] text-slate-400">Kecepatan refleks & akurasi uji</div>
                      </div>
                    </div>
                    <Play size={12} className="text-slate-550 group-hover:text-emerald-550 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>

                </div>
              </div>
            )}

            {/* Right column: Recent activity feed */}
            <div className={`p-5 rounded-2xl border shadow-sm ${
              isSuperAdmin ? 'lg:col-span-3' : 'lg:col-span-2'
            } flex flex-col justify-between backdrop-blur-md transition-all duration-300 ${
              isLight 
                ? 'bg-white/75 border-white/50 shadow-[0_8px_32px_rgba(148,163,184,0.05)]' 
                : 'bg-slate-900/60 border-emerald-500/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)]'
            } ${isBranchAdmin ? 'hidden md:flex' : ''}`}>
              <div>
                <h3 className={`font-bold text-base mb-3 ${isLight ? 'text-slate-800' : 'text-white'}`}>Aktivitas Uji Kompetensi Terakhir</h3>
                {recentGrades.length === 0 ? (
                  <div className={`p-8 text-center text-slate-500 border border-dashed rounded-xl ${
                    isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-950/10'
                  }`}>
                    <AlertTriangle size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-xs font-medium">Belum ada nilai kuis berhitung diinput</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentGrades.map((g) => (
                      <div key={g.id} className={`p-3.5 border rounded-xl flex items-center justify-between gap-3 ${
                        isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-950/30 border-slate-800'
                      }`}>
                        <div className="min-w-0">
                          <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{g.studentName}</div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <BookOpen size={12} className="text-slate-550" />
                            <span>Materi: {g.topic}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right font-mono">
                            <div className="text-xs font-bold text-emerald-500">Skor {g.score}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-0.5 justify-end">
                              <Clock size={10} />
                              <span>{g.speedSeconds}s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigate('report')}
                className={`w-full text-center py-2.5 font-bold text-xs rounded-xl border transition mt-4 ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-emerald-600 border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                }`}
              >
                Tampilkan Laporan Rapor Perkembangan Lengkap
              </button>
            </div>

          </div>

    </div>
  );
}
