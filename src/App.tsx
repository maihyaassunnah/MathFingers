import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMathFinggersDb } from './hooks/useMathFinggersDb';
import { useMediaQuery } from './hooks/useMediaQuery';
import { supabase } from './supabase';
import { DashboardOverview } from './components/DashboardOverview';
import { StudentManager } from './components/StudentManager';
import { AttendanceTracker } from './components/AttendanceTracker';
import { TeacherNotes } from './components/TeacherNotes';
import { SppInvoiceManager } from './components/SppInvoiceManager';
import { GradeManager } from './components/GradeManager';
import { MaterialList } from './components/MaterialList';
import { SettingsManager } from './components/SettingsManager';
import { StudentProgressReport } from './components/StudentProgressReport';
import { MathFingerLogo } from './components/MathFingerLogo';
import { LoginManager } from './components/LoginManager';
import { JournalHistory } from './components/JournalHistory';
import { SppHistory } from './components/SppHistory';
import { SupabaseSqlEditor } from './components/SupabaseSqlEditor';
import { AlumniManager } from './components/AlumniManager';
import { BranchesManager } from './components/BranchesManager';
import { ClassManager } from './components/ClassManager';
import FinanceManager from './components/FinanceManager';
import { StudentSelfAttendanceView } from './components/StudentSelfAttendanceView';
import { StudentQrCards } from './components/StudentQrCards';
import { AppUpdateModal, LATEST_APP_VERSION } from './components/AppUpdateModal';
import { MobileBottomNavigation } from './components/MobileBottomNavigation';
import { MobileDrawer } from './components/MobileDrawer';
import { Sidebar } from './components/Sidebar';
import { AdminUser, Branch } from './types';
import { getAdminAvatar, updateDynamicPwaIcon, getStudentUniqueCode } from './utils';

import { 
  Home, 
  Users, 
  CheckSquare, 
  FileText, 
  Receipt, 
  Award, 
  BookOpen, 
  TrendingUp, 
  Sparkles, 
  Menu, 
  X,
  CloudLightning,
  Wifi,
  Smartphone,
  Sun,
  Moon,
  Settings,
  LogOut,
  History,
  Database,
  GraduationCap,
  Building,
  Layers,
  Wallet,
  QrCode,
  CheckCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [isSelfAttendanceMode, setIsSelfAttendanceMode] = useState<boolean>(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let intervalId: any;

    const checkPing = async () => {
      if (!supabase) {
        if (active) setPingLatency(null);
        return;
      }
      const startTime = performance.now();
      try {
        const { error } = await supabase.from('branches').select('id').limit(1);
        if (error) throw error;
        const duration = Math.round(performance.now() - startTime);
        if (active) {
          setPingLatency(duration);
        }
      } catch (err) {
        if (active) {
          setPingLatency(null);
        }
      }
    };

    checkPing();
    intervalId = setInterval(checkPing, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);
  const [selfAttendanceClass, setSelfAttendanceClass] = useState<string>('');
  const [selfAttendanceDate, setSelfAttendanceDate] = useState<string>('');
  const [scannedStudentId, setScannedStudentId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'present' | 'absent' | 'permission'>('present');
  const [scanNotes, setScanNotes] = useState<string>('');
  const [scanDate, setScanDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [scanSuccess, setScanSuccess] = useState<boolean>(false);
  const [scanSaving, setScanSaving] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('absen') === '1') {
      setIsSelfAttendanceMode(true);
      setSelfAttendanceClass(params.get('kelas') || 'ALL');
      setSelfAttendanceDate(params.get('tanggal') || new Date().toISOString().slice(0, 10));
    }
    const scanId = params.get('scan_student');
    if (scanId) {
      setScannedStudentId(scanId);
    }
  }, []);

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
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
    const legacyStringUser = localStorage.getItem('math_finggers_current_user');
    if (legacyStringUser) {
      const lower = legacyStringUser.toLowerCase();
      if (lower.includes('wahyudin') || lower.includes('hafiz')) {
        return { username: 'wahyudin', name: 'Wahyudin Hafiz, S.Pd', role: 'super_admin', branch: 'Pusat' };
      }
      if (lower.includes('febrianti')) {
        return { username: 'febrianti', name: 'Febrianti Dewi, S.Pd', role: 'branch_admin', branch: 'Pusat' };
      }
      if (lower.includes('dewi') || lower.includes('safitri')) {
        return { username: 'dewi', name: 'Dewi Safitri, S.H', role: 'branch_admin', branch: 'Pusat' };
      }
      return { username: 'dewi', name: legacyStringUser, role: 'branch_admin', branch: 'Pusat' };
    }
    return null;
  });
  const [activeBranch, setActiveBranch] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('math_finggers_theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [installedVersion, setInstalledVersion] = useState<string>(() => {
    return localStorage.getItem('math_finggers_installed_version') || 'v2.5.0';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('math_finggers_theme', nextTheme);
  };

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'branch_admin') {
        setActiveBranch(currentUser.branch);
        // Check version specifically for this branch account
        const branchKey = `math_finggers_installed_version_branch_${currentUser.branch}`;
        const userKey = `math_finggers_installed_version_user_${currentUser.username}`;
        const savedBranchVersion = localStorage.getItem(branchKey) || localStorage.getItem(userKey) || 'v2.5.0';
        setInstalledVersion(savedBranchVersion);
        if (savedBranchVersion !== LATEST_APP_VERSION) {
          setIsUpdateModalOpen(true);
        }
      } else {
        setActiveBranch('all');
        const userKey = `math_finggers_installed_version_user_${currentUser.username}`;
        const savedVersion = localStorage.getItem(userKey) || localStorage.getItem('math_finggers_installed_version') || 'v2.5.0';
        setInstalledVersion(savedVersion);
        if (savedVersion !== LATEST_APP_VERSION) {
          setIsUpdateModalOpen(true);
        }
      }

      // Ensure activeTab is always one of the valid tabs for the role
      const validTabIds = currentUser.role === 'super_admin'
        ? ['overview', 'students', 'classes', 'qr_cards', 'alumni', 'attendance', 'notes', 'journal_history', 'spp', 'spp_history', 'finance', 'grades', 'report', 'branches_mgmt', 'supabase_sql', 'settings', 'simulator']
        : ['overview', 'students', 'classes', 'qr_cards', 'alumni', 'attendance', 'notes', 'journal_history', 'spp', 'spp_history', 'finance', 'grades', 'report', 'settings', 'simulator'];
      if (!validTabIds.includes(activeTab)) {
        setActiveTab('overview');
      }
    }
  }, [currentUser]);

  const {
    students,
    attendance,
    notes,
    invoices,
    grades,
    materials,
    branches,
    adminUsers,
    classes,
    manualIncomes,
    expenses,
    settings,
    allSettingsMap,
    getBranchSettings,
    dashboardTasks,
    loading,
    isOfflineFallback,
    addStudent,
    updateStudent,
    deleteStudent,
    addAttendanceBatch,
    deleteAttendanceByDate,
    deleteSingleAttendance,
    updateSingleAttendance,
    addTeacherNote,
    addTeacherNotesBatch,
    deleteTeacherNote,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    addGrade,
    deleteGrade,
    updateGrade,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    clearAllMaterials,
    updateSettings,
    addDashboardTask,
    toggleDashboardTask,
    deleteDashboardTask,
    addBranch,
    updateBranch,
    deleteBranch,
    addAdminUser,
    updateAdminUser,
    deleteAdminUser,
    addClassGroup,
    updateClassGroup,
    deleteClassGroup,
    addManualIncome,
    updateManualIncome,
    deleteManualIncome,
    addExpense,
    updateExpense,
    deleteExpense,
    importBackupData
  } = useMathFinggersDb();

  useEffect(() => {
    if (settings?.appIcon) {
      updateDynamicPwaIcon(settings.appIcon);
    }
  }, [settings?.appIcon]);

  // Safe branch resolver that maps legacy or unspecified branches ('Pusat' or null) 
  // to the first active branch if there's no branch named 'Pusat' in the database.
  const getAssignedBranch = (recordBranch: string | undefined | null) => {
    const b = recordBranch || 'Pusat';
    const actualBranchNames = branches.map(br => br.name);
    const isPusatMissing = !actualBranchNames.includes('Pusat');
    if (isPusatMissing && (b === 'Pusat' || !actualBranchNames.includes(b))) {
      return branches[0]?.name || 'Pusat';
    }
    return b;
  };

  // Active branch automatic filtering for all data types
  const filteredStudents = students.filter(s => {
    const b = getAssignedBranch(s.branch);
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredAttendance = attendance.filter(a => {
    const b = getAssignedBranch(a.branch);
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredNotes = notes.filter(n => {
    const b = getAssignedBranch(n.branch);
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredInvoices = invoices.filter(i => {
    const b = getAssignedBranch(i.branch);
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredGrades = grades.filter(g => {
    const b = getAssignedBranch(g.branch);
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredClasses = classes.filter(c => {
    const b = getAssignedBranch(c.branch);
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredManualIncomes = manualIncomes.filter(mi => {
    const b = getAssignedBranch(mi.branch);
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredExpenses = expenses.filter(e => {
    const b = getAssignedBranch(e.branch);
    return activeBranch === 'all' || b === activeBranch;
  });

  // Multi-branch aware writers
  const handleAddManualIncome = async (incomeData: any) => {
    const defaultBranchName = branches[0]?.name || 'Pusat';
    const branchToSet = incomeData.branch || (currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : defaultBranchName));
    await addManualIncome({
      ...incomeData,
      branch: branchToSet
    });
  };

  const handleAddExpense = async (expenseData: any) => {
    const defaultBranchName = branches[0]?.name || 'Pusat';
    const branchToSet = expenseData.branch || (currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : defaultBranchName));
    await addExpense({
      ...expenseData,
      branch: branchToSet
    });
  };

  const handleAddStudent = async (studentData: any) => {
    const defaultBranchName = branches[0]?.name || 'Pusat';
    const branchToSet = studentData.branch || (currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : defaultBranchName));
    await addStudent({
      ...studentData,
      branch: branchToSet
    });
  };

  const handleAddClass = async (classData: any) => {
    const defaultBranchName = branches[0]?.name || 'Pusat';
    const branchToSet = classData.branch || (currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : defaultBranchName));
    await addClassGroup({
      ...classData,
      branch: branchToSet
    });
  };

  const handleAddAttendanceBatch = async (records: any[]) => {
    const defaultBranchName = branches[0]?.name || 'Pusat';
    const branchToSet = currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : defaultBranchName);
    const updatedRecords = records.map(r => ({
      ...r,
      branch: branchToSet
    }));
    await addAttendanceBatch(updatedRecords);
  };

  const handleSaveScannedAttendance = async () => {
    if (!scannedStudentId) return;
    const student = students.find(s => s.id === scannedStudentId);
    if (!student) return;

    setScanSaving(true);
    try {
      const defaultBranchName = branches[0]?.name || 'Pusat';
      const branchToSet = student.branch || currentUser?.branch || defaultBranchName;
      
      const record = {
        studentId: student.id,
        studentName: student.name,
        date: scanDate,
        status: scanStatus,
        notes: scanNotes,
        branch: branchToSet
      };

      await addAttendanceBatch([record]);
      setScanSuccess(true);
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        setScannedStudentId(null);
        setScanSuccess(false);
        setScanNotes('');
        setScanStatus('present');
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Gagal mencatat presensi QR!');
    } finally {
      setScanSaving(false);
    }
  };

  const handleAddTeacherNote = async (noteData: any) => {
    const defaultBranchName = branches[0]?.name || 'Pusat';
    const branchToSet = currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : defaultBranchName);
    await addTeacherNote({
      ...noteData,
      branch: branchToSet
    });
  };

  const handleAddTeacherNotesBatch = async (notesData: any[]) => {
    const defaultBranchName = branches[0]?.name || 'Pusat';
    const branchToSet = currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : defaultBranchName);
    const updatedNotes = notesData.map(n => ({
      ...n,
      branch: branchToSet
    }));
    await addTeacherNotesBatch(updatedNotes);
  };

  const handleCreateInvoice = async (invoiceData: any) => {
    const defaultBranchName = branches[0]?.name || 'Pusat';
    const branchToSet = currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : defaultBranchName);
    await createInvoice({
      ...invoiceData,
      branch: branchToSet
    });
  };

  const handleAddGrade = async (gradeData: any) => {
    const defaultBranchName = branches[0]?.name || 'Pusat';
    const branchToSet = currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : defaultBranchName);
    await addGrade({
      ...gradeData,
      branch: branchToSet
    });
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const navigationItems = isSuperAdmin
    ? [
        { id: 'overview', name: 'Statistik', icon: Home },
        { id: 'students', name: 'Siswa', icon: Users },
        { id: 'classes', name: 'Kelas', icon: Layers },
        { id: 'qr_cards', name: 'Kartu QR Siswa', icon: QrCode },
        { id: 'alumni', name: 'Alumni / Lulus', icon: GraduationCap },
        { id: 'attendance', name: 'Absensi', icon: CheckSquare },
        { id: 'notes', name: 'Jurnal Guru', icon: FileText },
        { id: 'journal_history', name: 'Riwayat Jurnal', icon: History },
        { id: 'spp', name: 'Pembayaran SPP', icon: Receipt },
        { id: 'spp_history', name: 'Riwayat Pembayaran', icon: History },
        { id: 'finance', name: 'Keuangan', icon: Wallet },
        { id: 'grades', name: 'Input Nilai', icon: Award },
        { id: 'simulator', name: 'Kurikulum', icon: BookOpen },
        { id: 'report', name: 'Rapor Perkembangan', icon: TrendingUp },
        { id: 'branches_mgmt', name: 'Data Cabang & Admin', icon: Building },
        { id: 'supabase_sql', name: 'SQL Editor Supabase', icon: Database },
        { id: 'settings', name: 'Pengaturan & Backup', icon: Settings },
      ]
    : [
        { id: 'overview', name: 'Dashboard Cabang', icon: Home },
        { id: 'students', name: 'Siswa', icon: Users },
        { id: 'classes', name: 'Kelas', icon: Layers },
        { id: 'qr_cards', name: 'Kartu QR Siswa', icon: QrCode },
        { id: 'alumni', name: 'Alumni / Lulus', icon: GraduationCap },
        { id: 'attendance', name: 'Absensi', icon: CheckSquare },
        { id: 'notes', name: 'Jurnal Guru', icon: FileText },
        { id: 'journal_history', name: 'Riwayat Jurnal', icon: History },
        { id: 'spp', name: 'Pembayaran SPP', icon: Receipt },
        { id: 'spp_history', name: 'Riwayat Pembayaran', icon: History },
        { id: 'finance', name: 'Keuangan', icon: Wallet },
        { id: 'grades', name: 'Input Nilai', icon: Award },
        { id: 'simulator', name: 'Kurikulum', icon: BookOpen },
        { id: 'report', name: 'Rapor Perkembangan', icon: TrendingUp },
        { id: 'settings', name: 'Pengaturan Cabang', icon: Settings },
      ];

  const visibleMobileTabIds = isSuperAdmin 
    ? ['overview', 'branches_mgmt', 'settings']
    : ['overview', 'students', 'attendance', 'grades'];

  const hiddenMobileItemsCount = navigationItems.filter(item => !visibleMobileTabIds.includes(item.id)).length;

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-[#0f172a] text-slate-300' : 'bg-[#fdfbf7] text-slate-700'}`}>
        <div className="animate-bounce">
          <MathFingerLogo size={100} showText={false} theme={theme} />
        </div>
        <h2 className={`text-2xl font-black mt-6 tracking-wider`}>
          <span className="text-rose-500">M</span>
          <span className="text-amber-500">a</span>
          <span className="text-sky-400">t</span>
          <span className="text-emerald-500">h</span>
          <span className="text-slate-400 ml-2">F</span>
          <span className="text-indigo-400">i</span>
          <span className="text-teal-400">n</span>
          <span className="text-purple-500">g</span>
          <span className="text-orange-500">e</span>
          <span className="text-pink-500">r</span>
        </h2>
        <p className="text-xs text-slate-500 mt-4 animate-pulse">Menghubungkan ke Database Supabase...</p>
      </div>
    );
  }

  const getAccentBgClass = () => {
    switch (settings.accentColor) {
      case 'indigo': return 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15';
      case 'violet': return 'bg-violet-600 text-white shadow-md shadow-violet-600/15';
      case 'amber': return 'bg-amber-600 text-slate-950 shadow-md shadow-amber-600/15';
      case 'rose': return 'bg-rose-600 text-white shadow-md shadow-rose-600/15';
      case 'sky': return 'bg-sky-600 text-slate-950 shadow-md shadow-sky-600/15';
      case 'emerald':
      default: return 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15';
    }
  };

  const getAccentTextClass = () => {
    switch (settings.accentColor) {
      case 'indigo': return 'text-indigo-600 dark:text-indigo-400';
      case 'violet': return 'text-violet-600 dark:text-violet-400';
      case 'amber': return 'text-amber-600 dark:text-amber-400';
      case 'rose': return 'text-rose-600 dark:text-rose-400';
      case 'sky': return 'text-sky-600 dark:text-sky-400';
      case 'emerald':
      default: return 'text-emerald-600 dark:text-emerald-400';
    }
  };

  const renderContent = () => {
    const currentBranchSettings = getBranchSettings ? getBranchSettings(activeBranch) : settings;

    switch (activeTab) {
      case 'overview':
        return (
          <DashboardOverview 
            students={filteredStudents} 
            attendance={filteredAttendance} 
            invoices={filteredInvoices} 
            grades={filteredGrades} 
            settings={currentBranchSettings}
            dashboardTasks={dashboardTasks}
            onAddDashboardTask={addDashboardTask}
            onToggleDashboardTask={toggleDashboardTask}
            onDeleteDashboardTask={deleteDashboardTask}
            onNavigate={(tab) => setActiveTab(tab)} 
            theme={theme}
            isSuperAdmin={isSuperAdmin}
            branches={branches}
            activeBranch={activeBranch}
            allStudents={students}
            allAttendance={attendance}
            allInvoices={invoices}
            allGrades={grades}
            currentUser={currentUser}
            onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
            isUpdateAvailable={installedVersion !== LATEST_APP_VERSION}
            onSelectBranch={setActiveBranch}
            onToggleTheme={toggleTheme}
          />
        );
      case 'students':
        return (
          <StudentManager 
            students={filteredStudents} 
            materials={materials}
            attendance={filteredAttendance}
            notes={filteredNotes}
            grades={filteredGrades}
            classes={filteredClasses}
            onAddStudent={handleAddStudent} 
            onUpdateStudent={updateStudent} 
            onDeleteStudent={deleteStudent} 
            theme={theme}
            isSuperAdmin={isSuperAdmin}
            branches={branches}
            loading={loading}
          />
        );
      case 'qr_cards':
        return (
          <StudentQrCards 
            students={filteredStudents}
            classes={filteredClasses}
            branches={branches}
            attendance={attendance}
            notes={notes}
            currentUser={currentUser}
            onAddAttendanceBatch={addAttendanceBatch}
            theme={theme}
            isSuperAdmin={isSuperAdmin}
          />
        );
      case 'classes':
        return (
          <ClassManager
            classes={filteredClasses}
            students={filteredStudents}
            branches={branches}
            onAddClass={handleAddClass}
            onUpdateClass={updateClassGroup}
            onDeleteClass={deleteClassGroup}
            theme={theme}
            isSuperAdmin={isSuperAdmin}
            activeBranch={activeBranch}
          />
        );
      case 'alumni':
        return (
          <AlumniManager
            students={filteredStudents}
            onUpdateStudent={updateStudent}
            onDeleteStudent={deleteStudent}
            theme={theme}
          />
        );
      case 'attendance':
        return (
          <AttendanceTracker 
            students={filteredStudents} 
            attendance={filteredAttendance} 
            classes={filteredClasses}
            onAddAttendanceBatch={handleAddAttendanceBatch} 
            onDeleteAttendanceByDate={deleteAttendanceByDate}
            onDeleteSingleAttendance={deleteSingleAttendance}
            onUpdateSingleAttendance={updateSingleAttendance}
            theme={theme}
            loading={loading}
          />
        );
      case 'notes':
        return (
          <TeacherNotes 
            students={filteredStudents} 
            notes={filteredNotes} 
            classes={filteredClasses}
            onAddNote={handleAddTeacherNote} 
            onAddNotesBatch={handleAddTeacherNotesBatch}
            onDeleteNote={deleteTeacherNote} 
            theme={theme}
          />
        );
      case 'journal_history':
        return (
          <JournalHistory 
            students={filteredStudents} 
            notes={filteredNotes} 
            classes={filteredClasses}
            theme={theme}
          />
        );
      case 'spp':
        return (
          <SppInvoiceManager 
            students={filteredStudents} 
            invoices={filteredInvoices} 
            settings={currentBranchSettings}
            onCreateInvoice={handleCreateInvoice} 
            onUpdateInvoiceStatus={updateInvoiceStatus} 
            onDeleteInvoice={deleteInvoice} 
            theme={theme}
          />
        );
      case 'spp_history':
        return (
          <SppHistory 
            students={filteredStudents} 
            invoices={filteredInvoices} 
            theme={theme}
          />
        );
      case 'finance':
        return (
          <FinanceManager 
            students={filteredStudents}
            invoices={filteredInvoices}
            manualIncomes={filteredManualIncomes}
            expenses={filteredExpenses}
            onAddManualIncome={handleAddManualIncome}
            onUpdateManualIncome={updateManualIncome}
            onDeleteManualIncome={deleteManualIncome}
            onAddExpense={handleAddExpense}
            onUpdateExpense={updateExpense}
            onDeleteExpense={deleteExpense}
            branches={branches}
            isSuperAdmin={isSuperAdmin}
            theme={theme}
          />
        );
      case 'grades':
        return (
          <GradeManager 
            students={filteredStudents} 
            grades={filteredGrades} 
            classes={filteredClasses}
            onAddGrade={handleAddGrade} 
            onDeleteGrade={deleteGrade} 
            onUpdateGrade={updateGrade}
            theme={theme}
          />
        );
      case 'simulator':
        return (
          <MaterialList 
            materials={materials} 
            onAddMaterial={addMaterial}
            onUpdateMaterial={updateMaterial}
            onDeleteMaterial={deleteMaterial}
            onClearMaterials={clearAllMaterials}
            theme={theme} 
          />
        );
      case 'report':
        return (
          <StudentProgressReport 
            students={filteredStudents} 
            attendance={filteredAttendance} 
            notes={filteredNotes} 
            grades={filteredGrades} 
            classes={filteredClasses}
            currentUser={currentUser}
            theme={theme}
          />
        );
      case 'branches_mgmt':
        return (
          <BranchesManager
            theme={theme}
            branches={branches}
            adminUsers={adminUsers}
            onAddBranch={addBranch}
            onUpdateBranch={updateBranch}
            onDeleteBranch={deleteBranch}
            onAddAdminUser={addAdminUser}
            onUpdateAdminUser={updateAdminUser}
            onDeleteAdminUser={deleteAdminUser}
          />
        );
      case 'settings':
        return (
          <SettingsManager 
            settings={currentBranchSettings} 
            onUpdateSettings={updateSettings} 
            theme={theme}
            students={filteredStudents}
            grades={filteredGrades}
            attendance={filteredAttendance}
            notes={filteredNotes}
            invoices={filteredInvoices}
            dashboardTasks={dashboardTasks}
            onImportBackup={importBackupData}
            currentUser={currentUser}
            activeBranch={activeBranch}
            branches={branches}
            allSettingsMap={allSettingsMap}
            getBranchSettings={getBranchSettings}
            onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
          />
        );
      case 'supabase_sql':
        return (
          <SupabaseSqlEditor 
            theme={theme}
            students={filteredStudents}
            branches={branches}
            adminUsers={adminUsers}
            onUpdateStudent={updateStudent}
            onAddStudent={handleAddStudent}
            onDeleteStudent={deleteStudent}
          />
        );
      default:
        return (
          <DashboardOverview 
            students={filteredStudents} 
            attendance={filteredAttendance} 
            invoices={filteredInvoices} 
            grades={filteredGrades} 
            settings={currentBranchSettings}
            dashboardTasks={dashboardTasks}
            onAddDashboardTask={addDashboardTask}
            onToggleDashboardTask={toggleDashboardTask}
            onDeleteDashboardTask={deleteDashboardTask}
            onNavigate={(tab) => setActiveTab(tab)} 
            theme={theme} 
            isSuperAdmin={isSuperAdmin}
            branches={branches}
            activeBranch={activeBranch}
            allStudents={students}
            allAttendance={attendance}
            allInvoices={invoices}
            allGrades={grades}
            currentUser={currentUser}
            onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
            isUpdateAvailable={installedVersion !== LATEST_APP_VERSION}
            onSelectBranch={setActiveBranch}
            onToggleTheme={toggleTheme}
          />
        );
    }
  };

  if (isSelfAttendanceMode) {
    return (
      <StudentSelfAttendanceView
        students={students}
        classes={classes}
        targetClass={selfAttendanceClass}
        targetDate={selfAttendanceDate}
        onAddAttendanceBatch={addAttendanceBatch}
        onClose={() => {
          // Clear search parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsSelfAttendanceMode(false);
        }}
        theme={theme}
      />
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginManager 
          onLogin={(adminUser) => {
            setCurrentUser(adminUser);
            try {
              localStorage.setItem('math_finggers_current_user_obj', JSON.stringify(adminUser));
              localStorage.setItem('math_finggers_current_user', adminUser.name);
            } catch (err) {
              console.warn('LocalStorage quota exceeded when storing user session:', err);
              try {
                const lightweightUser = { ...adminUser, avatarUrl: adminUser.avatarUrl?.startsWith('data:') ? '' : adminUser.avatarUrl };
                localStorage.setItem('math_finggers_current_user_obj', JSON.stringify(lightweightUser));
                localStorage.setItem('math_finggers_current_user', adminUser.name);
              } catch {
                // Ignore if localStorage is completely full
              }
            }

            // Immediately check version for logged in user & open update modal if outdated
            const userKey = `math_finggers_installed_version_user_${adminUser.username}`;
            const branchKey = `math_finggers_installed_version_branch_${adminUser.branch}`;
            const savedVer = localStorage.getItem(branchKey) || localStorage.getItem(userKey) || localStorage.getItem('math_finggers_installed_version') || 'v2.5.0';
            setInstalledVersion(savedVer);
            if (savedVer !== LATEST_APP_VERSION) {
              setIsUpdateModalOpen(true);
            }
          }} 
          adminUsers={adminUsers}
          branches={branches}
          theme={theme}
          onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          onOpenSelfAttendance={() => setIsSelfAttendanceMode(true)}
          installedVersion={installedVersion}
          onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        />

        <AppUpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          currentUser={null}
          theme={theme}
          isMandatory={installedVersion !== LATEST_APP_VERSION}
          installedVersion={installedVersion}
          onUpdateSuccess={() => {
            setInstalledVersion(LATEST_APP_VERSION);
            localStorage.setItem('math_finggers_installed_version', LATEST_APP_VERSION);
            setIsUpdateModalOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-150 relative ${theme === 'dark' ? 'bg-[#0f172a] math-pattern-dark text-slate-300' : 'bg-[#fdfcf2] math-pattern-light text-slate-700'}`}>
      
      {/* 1. TOP NAVBAR (MOBILE ONLY) */}
      {!isDesktop && (
        <header className={`px-4 pt-7 pb-3 flex items-center justify-between sticky top-0 z-40 shadow-sm border-b transition-colors duration-150 ${
          theme === 'dark' ? 'bg-[#020617] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <MathFingerLogo size={36} textSize="sm" theme={theme} />

          <div className="flex items-center gap-2">
            {/* Mobile Offline Status indicator with real-time ping latency and rating */}
            {isOfflineFallback || pingLatency === null ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs shadow-xs" title="Koneksi Terputus - Mode Penyimpanan Lokal Aktif">
                <CloudLightning size={14} className="animate-pulse text-amber-500" />
                <span className="font-extrabold text-[10px] tracking-wider uppercase">Lokal Safe</span>
              </span>
            ) : (
              (() => {
                const rating = pingLatency < 100 ? { label: 'Sangat Baik', colorClass: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20', pingColor: 'bg-emerald-400' } :
                               pingLatency < 250 ? { label: 'Cukup', colorClass: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20', pingColor: 'bg-amber-400' } :
                               { label: 'Lambat', colorClass: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20', pingColor: 'bg-rose-400' };
                return (
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-xl text-xs transition-all shadow-xs ${rating.colorClass}`} title={`Supabase Terhubung - Latensi: ${pingLatency}ms (${rating.label})`}>
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${rating.pingColor}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${rating.pingColor.replace('400', '500')}`}></span>
                    </span>
                    <Wifi size={14} />
                    <span className="font-extrabold text-[10px]">{pingLatency} ms</span>
                    <span className="text-[8px] opacity-75 font-bold uppercase tracking-wider hidden xs:inline">({rating.label})</span>
                  </span>
                );
              })()
            )}
          </div>
        </header>
      )}

      {/* 2. SIDEBAR (DESKTOP ONLY via isDesktop) */}
      {isDesktop && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          theme={theme}
          toggleTheme={toggleTheme}
          isSuperAdmin={isSuperAdmin}
          activeBranch={activeBranch}
          onSelectBranch={setActiveBranch}
          studentsCount={filteredStudents.length}
          pendingSppCount={filteredInvoices.filter(i => i.status === 'unpaid' || i.status === 'overdue').length}
          todayAttendanceCount={filteredAttendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length}
          installedVersion={installedVersion}
          isUpdateAvailable={installedVersion !== LATEST_APP_VERSION}
          onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
          onLogout={() => {
            setCurrentUser(null);
            localStorage.removeItem('math_finggers_current_user_obj');
            localStorage.removeItem('math_finggers_current_user');
          }}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      )}

      {/* 3. MOBILE MENU SIDE-DRAWER OVERLAY (ONLY ON NON-DESKTOP) */}
      {!isDesktop && (
        <MobileDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          navigationItems={navigationItems}
          activeTab={activeTab}
          onSelectTab={(tabId) => setActiveTab(tabId)}
          currentUser={currentUser}
          onLogout={() => {
            setCurrentUser(null);
            localStorage.removeItem('math_finggers_current_user_obj');
            localStorage.removeItem('math_finggers_current_user');
          }}
          theme={theme}
          accentBgClass={getAccentBgClass()}
        />
      )}

      {/* 4. MAIN WORKSPACE CONTENT WINDOW */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab} 
            initial={{ opacity: 0, scale: 0.995, y: 4 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.995, y: -4 }} 
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 5. MOBILE BOTTOM NAVIGATION (ONLY ON NON-DESKTOP) */}
      {!isDesktop && (
        <MobileBottomNavigation
          activeTab={activeTab}
          onSelectTab={(tabId) => setActiveTab(tabId)}
          onOpenDrawer={() => setIsMobileMenuOpen(true)}
          isSuperAdmin={isSuperAdmin}
          theme={theme}
          accentClass={getAccentTextClass()}
          hiddenCount={hiddenMobileItemsCount}
        />
      )}

      {/* SCAN STUDENT QR ATTENDANCE MODAL OVERLAY */}
      {scannedStudentId && (() => {
        const student = students.find(s => s.id === scannedStudentId);
        const isLight = theme === 'light';
        
        const existingAttendance = attendance.find(
          a => a.studentId === scannedStudentId && a.date === scanDate
        );

        const handleCloseScan = () => {
          window.history.replaceState({}, document.title, window.location.pathname);
          setScannedStudentId(null);
          setScanNotes('');
          setScanStatus('present');
          setScanSuccess(false);
        };

        if (!student) {
          return (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-4 sm:pt-12 md:pt-16 overflow-y-auto">
              <div className={`rounded-3xl p-6 text-center max-w-sm w-full border ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
              }`}>
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                  <X size={24} />
                </div>
                <h3 className="font-bold text-lg">Siswa Tidak Ditemukan</h3>
                <p className="text-sm text-slate-400 mt-1 mb-5">
                  ID QR Code tidak valid atau data siswa telah dihapus dari sistem.
                </p>
                <button
                  type="button"
                  onClick={handleCloseScan}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup / Batalkan
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-4 sm:pt-12 md:pt-16 overflow-y-auto">
            <div className={`rounded-3xl w-full max-w-md shadow-2xl border p-6 relative animate-page-fade-in ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#090d16] border-slate-850 text-white'
            }`}>
              
              {scanSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="font-black text-xl text-emerald-500">Presensi Berhasil!</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Data kehadiran untuk <strong>{student.name}</strong> berhasil dicatat pada tanggal {scanDate}.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2.5 mb-5 border-b border-slate-800/80 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black tracking-widest text-emerald-500 uppercase">SCAN QR BERHASIL</div>
                      <h3 className="font-extrabold text-base">Konfirmasi Kehadiran Siswa</h3>
                    </div>
                  </div>

                  {/* Student profile summary */}
                  <div className={`p-4 rounded-2xl border mb-4 text-sm ${
                    isLight ? 'bg-slate-50 border-slate-200/60' : 'bg-slate-950/40 border-slate-850/85'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                        #{getStudentUniqueCode(student)}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-450 border border-indigo-500/15">
                        Cabang: {student.branch || 'Pusat'}
                      </span>
                    </div>
                    <div className={`font-extrabold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {student.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-2">
                      <span>Kelas: <strong className="text-emerald-500">{student.kelas || '-'}</strong></span>
                      <span>•</span>
                      <span>Level: <strong className="text-slate-350">{student.level ? student.level.split(':')[0] : 'Dasar'}</strong></span>
                    </div>
                  </div>

                  {/* Warning if already attended today */}
                  {existingAttendance && (
                    <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-500 mb-4 text-xs flex gap-2 items-start">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        Siswa ini sudah diabsen hari ini dengan status:{' '}
                        <strong className="uppercase text-amber-400">
                          {existingAttendance.status === 'present' ? 'HADIR' : existingAttendance.status === 'permission' ? 'IZIN' : 'ALPA'}
                        </strong>
                        . Menyimpan ulang akan memperbarui data sebelumnya.
                      </div>
                    </div>
                  )}

                  {/* Input form */}
                  <div className="space-y-3.5">
                    {/* Date picker */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Absensi</label>
                      <input
                        type="date"
                        value={scanDate}
                        onChange={(e) => setScanDate(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-850 text-white'
                        }`}
                      />
                    </div>

                    {/* Status Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Kehadiran</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'present', label: 'Hadir', activeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold' },
                          { value: 'permission', label: 'Izin', activeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/30 font-bold' },
                          { value: 'absent', label: 'Alpa', activeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/30 font-bold' }
                        ].map(opt => {
                          const isActive = scanStatus === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setScanStatus(opt.value as any)}
                              className={`py-2 px-1 rounded-xl text-xs text-center border transition cursor-pointer ${
                                isActive 
                                  ? opt.activeClass 
                                  : isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-850 text-slate-400 hover:bg-slate-900'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Catatan (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Contoh: Datang terlambat, lupa bawa modul..."
                        value={scanNotes}
                        onChange={(e) => setScanNotes(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500 ${
                          isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-850 text-white'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-850/80">
                    <button
                      type="button"
                      onClick={handleCloseScan}
                      disabled={scanSaving}
                      className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-850 text-slate-400'
                      }`}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveScannedAttendance}
                      disabled={scanSaving}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {scanSaving ? 'Menyimpan...' : 'Simpan Presensi'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Floating Update Notification Trigger for Branch Accounts */}
      {currentUser && installedVersion !== LATEST_APP_VERSION && !isUpdateModalOpen && (
        <div className="fixed bottom-5 right-5 z-40 animate-bounce">
          <button
            onClick={() => setIsUpdateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl border border-amber-300 transition-all cursor-pointer"
          >
            <Sparkles size={16} className="text-slate-950" />
            <span>Update Versi Cabang ({currentUser.role === 'branch_admin' ? currentUser.branch : 'Sistem'})</span>
          </button>
        </div>
      )}

      {/* App Update Modal */}
      <AppUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        currentUser={currentUser}
        theme={theme}
        isMandatory={installedVersion !== LATEST_APP_VERSION}
        installedVersion={installedVersion}
        onUpdateSuccess={() => {
          setInstalledVersion(LATEST_APP_VERSION);
          localStorage.setItem('math_finggers_installed_version', LATEST_APP_VERSION);
          if (currentUser?.branch) {
            localStorage.setItem(`math_finggers_installed_version_branch_${currentUser.branch}`, LATEST_APP_VERSION);
          }
          if (currentUser?.username) {
            localStorage.setItem(`math_finggers_installed_version_user_${currentUser.username}`, LATEST_APP_VERSION);
          }
          setIsUpdateModalOpen(false);
        }}
      />

    </div>
  );
}
