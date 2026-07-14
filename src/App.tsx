import { useState, useEffect } from 'react';
import { useMathFinggersDb } from './hooks/useMathFinggersDb';
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
import { AdminUser, Branch } from './types';
import { getAdminAvatar } from './utils';

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
  Building
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    const savedObj = localStorage.getItem('math_finggers_current_user_obj');
    if (savedObj) {
      try {
        return JSON.parse(savedObj);
      } catch (e) {
        // Fallback
      }
    }
    const legacyStringUser = localStorage.getItem('math_finggers_current_user');
    if (legacyStringUser) {
      return { username: 'febrianti', name: legacyStringUser, role: 'super_admin', branch: 'Pusat' };
    }
    return null;
  });
  const [activeBranch, setActiveBranch] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('math_finggers_theme') as 'light' | 'dark') || 'dark';
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
      } else {
        setActiveBranch('all');
      }
      
      // Ensure activeTab is always one of the valid tabs for the role
      const validTabIds = currentUser.role === 'super_admin'
        ? ['overview', 'branches_mgmt', 'settings', 'supabase_sql']
        : ['overview', 'students', 'alumni', 'attendance', 'notes', 'journal_history', 'spp', 'spp_history', 'grades', 'report', 'settings', 'simulator'];
      if (!validTabIds.includes(activeTab)) {
        setActiveTab('overview');
      }
    }
  }, [currentUser, activeTab]);

  const {
    students,
    attendance,
    notes,
    invoices,
    grades,
    materials,
    branches,
    adminUsers,
    settings,
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
    importBackupData
  } = useMathFinggersDb();

  // Active branch automatic filtering for all data types
  const filteredStudents = students.filter(s => {
    const b = s.branch || 'Pusat';
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredAttendance = attendance.filter(a => {
    const b = a.branch || 'Pusat';
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredNotes = notes.filter(n => {
    const b = n.branch || 'Pusat';
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredInvoices = invoices.filter(i => {
    const b = i.branch || 'Pusat';
    return activeBranch === 'all' || b === activeBranch;
  });

  const filteredGrades = grades.filter(g => {
    const b = g.branch || 'Pusat';
    return activeBranch === 'all' || b === activeBranch;
  });

  // Multi-branch aware writers
  const handleAddStudent = async (studentData: any) => {
    const branchToSet = studentData.branch || (currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : 'Pusat'));
    await addStudent({
      ...studentData,
      branch: branchToSet
    });
  };

  const handleAddAttendanceBatch = async (records: any[]) => {
    const branchToSet = currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : 'Pusat');
    const updatedRecords = records.map(r => ({
      ...r,
      branch: branchToSet
    }));
    await addAttendanceBatch(updatedRecords);
  };

  const handleAddTeacherNote = async (noteData: any) => {
    const branchToSet = currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : 'Pusat');
    await addTeacherNote({
      ...noteData,
      branch: branchToSet
    });
  };

  const handleAddTeacherNotesBatch = async (notesData: any[]) => {
    const branchToSet = currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : 'Pusat');
    const updatedNotes = notesData.map(n => ({
      ...n,
      branch: branchToSet
    }));
    await addTeacherNotesBatch(updatedNotes);
  };

  const handleCreateInvoice = async (invoiceData: any) => {
    const branchToSet = currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : 'Pusat');
    await createInvoice({
      ...invoiceData,
      branch: branchToSet
    });
  };

  const handleAddGrade = async (gradeData: any) => {
    const branchToSet = currentUser?.role === 'branch_admin' ? currentUser.branch : (activeBranch !== 'all' ? activeBranch : 'Pusat');
    await addGrade({
      ...gradeData,
      branch: branchToSet
    });
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const navigationItems = isSuperAdmin
    ? [
        { id: 'overview', name: 'Statistik', icon: Home },
        { id: 'branches_mgmt', name: 'Data Cabang & Admin', icon: Building },
        { id: 'settings', name: 'Pengaturan & Backup', icon: Settings },
        { id: 'supabase_sql', name: 'SQL Editor Supabase', icon: Database },
      ]
    : [
        { id: 'overview', name: 'Dashboard Cabang', icon: Home },
        { id: 'students', name: 'Siswa', icon: Users },
        { id: 'alumni', name: 'Alumni / Lulus', icon: GraduationCap },
        { id: 'attendance', name: 'Absensi', icon: CheckSquare },
        { id: 'notes', name: 'Jurnal Guru', icon: FileText },
        { id: 'journal_history', name: 'Riwayat Jurnal', icon: History },
        { id: 'spp', name: 'Pembayaran SPP', icon: Receipt },
        { id: 'spp_history', name: 'Riwayat Pembayaran', icon: History },
        { id: 'grades', name: 'Input Nilai', icon: Award },
        { id: 'simulator', name: 'Kurikulum', icon: BookOpen },
        { id: 'report', name: 'Rapor Perkembangan', icon: TrendingUp },
        { id: 'settings', name: 'Pengaturan Cabang', icon: Settings },
      ];

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
    switch (activeTab) {
      case 'overview':
        return (
          <DashboardOverview 
            students={filteredStudents} 
            attendance={filteredAttendance} 
            invoices={filteredInvoices} 
            grades={filteredGrades} 
            settings={settings}
            dashboardTasks={dashboardTasks}
            onAddDashboardTask={addDashboardTask}
            onToggleDashboardTask={toggleDashboardTask}
            onDeleteDashboardTask={deleteDashboardTask}
            onNavigate={(tab) => setActiveTab(tab)} 
            theme={theme}
            isSuperAdmin={isSuperAdmin}
            branches={branches}
            allStudents={students}
            allAttendance={attendance}
            allInvoices={invoices}
            allGrades={grades}
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
            onAddStudent={handleAddStudent} 
            onUpdateStudent={updateStudent} 
            onDeleteStudent={deleteStudent} 
            theme={theme}
            isSuperAdmin={isSuperAdmin}
            branches={branches}
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
            onAddAttendanceBatch={handleAddAttendanceBatch} 
            onDeleteAttendanceByDate={deleteAttendanceByDate}
            onDeleteSingleAttendance={deleteSingleAttendance}
            onUpdateSingleAttendance={updateSingleAttendance}
            theme={theme}
          />
        );
      case 'notes':
        return (
          <TeacherNotes 
            students={filteredStudents} 
            notes={filteredNotes} 
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
            theme={theme}
          />
        );
      case 'spp':
        return (
          <SppInvoiceManager 
            students={filteredStudents} 
            invoices={filteredInvoices} 
            settings={settings}
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
      case 'grades':
        return (
          <GradeManager 
            students={filteredStudents} 
            grades={filteredGrades} 
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
            settings={settings} 
            onUpdateSettings={updateSettings} 
            theme={theme}
            students={filteredStudents}
            grades={filteredGrades}
            attendance={filteredAttendance}
            notes={filteredNotes}
            invoices={filteredInvoices}
            dashboardTasks={dashboardTasks}
            onImportBackup={importBackupData}
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
            settings={settings}
            dashboardTasks={dashboardTasks}
            onAddDashboardTask={addDashboardTask}
            onToggleDashboardTask={toggleDashboardTask}
            onDeleteDashboardTask={deleteDashboardTask}
            onNavigate={(tab) => setActiveTab(tab)} 
            theme={theme} 
            isSuperAdmin={isSuperAdmin}
            branches={branches}
            allStudents={students}
            allAttendance={attendance}
            allInvoices={invoices}
            allGrades={grades}
          />
        );
    }
  };

  if (!currentUser) {
    return (
      <LoginManager 
        onLogin={(adminUser) => {
          setCurrentUser(adminUser);
          localStorage.setItem('math_finggers_current_user_obj', JSON.stringify(adminUser));
          localStorage.setItem('math_finggers_current_user', adminUser.name);
        }} 
        adminUsers={adminUsers}
        branches={branches}
        theme={theme} 
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-150 ${theme === 'dark' ? 'bg-[#0f172a] text-slate-300' : 'bg-[#fdfcf2] text-slate-700'}`}>
      
      {/* 1. TOP NAVBAR (MOBILE ONLY) */}
      <header className={`md:hidden px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm border-b transition-colors duration-150 ${
        theme === 'dark' ? 'bg-[#020617] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <MathFingerLogo size={36} textSize="sm" theme={theme} />

        <div className="flex items-center gap-2">
          {/* Light/Dark Toggle (Mobile) */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition ${theme === 'dark' ? 'text-amber-400 hover:bg-slate-800/50' : 'text-slate-600 hover:bg-slate-100'}`}
            title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Mobile Offline Status indicator */}
          {isOfflineFallback ? (
            <span className="p-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md" title="Local Storage Mode">
              <CloudLightning size={14} />
            </span>
          ) : (
            <span className="p-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md" title="Supabase Connected">
              <Wifi size={14} />
            </span>
          )}
        </div>
      </header>

      {/* 2. SIDEBAR (DESKTOP ONLY) */}
      <aside className={`hidden md:flex flex-col w-64 border-r sticky top-0 h-screen overflow-y-auto transition-colors duration-150 ${
        theme === 'dark' ? 'bg-[#020617] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {/* Brand Identity */}
        <div className={`p-5 border-b flex flex-col items-center text-center space-y-3 ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <MathFingerLogo size={64} textSize="md" theme={theme} />
          
          {/* Light/Dark Toggle (Desktop) */}
          <button
            onClick={toggleTheme}
            className={`mt-1.5 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-white hover:bg-slate-800' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} />
                <span>Mode Terang</span>
              </>
            ) : (
              <>
                <Moon size={14} />
                <span>Mode Gelap</span>
              </>
            )}
          </button>
        </div>

        {/* Database Sync Status */}
        <div className={`px-6 py-2.5 border-b flex items-center justify-between text-xs ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-slate-500 font-medium">Database:</span>
          {isOfflineFallback ? (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <CloudLightning size={10} />
              <span>Lokal Safe</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Wifi size={10} />
              <span>Supabase Cloud</span>
            </span>
          )}
        </div>

        {/* Branch Switcher (Desktop - Super Admin Only) */}
        {currentUser?.role === 'super_admin' && (
          <div className={`px-6 py-3 border-b flex flex-col gap-1.5 text-xs ${
            theme === 'dark' ? 'bg-slate-950/20 border-slate-800/60' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cabang Aktif</span>
            <select
              value={activeBranch}
              onChange={(e) => setActiveBranch(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none border transition ${
                theme === 'dark' 
                  ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-slate-700' 
                  : 'bg-white border-slate-200 text-slate-700 focus:border-slate-300'
              }`}
            >
              <option value="all">Semua Cabang (Super)</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Desktop Navigation Links */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 relative ${
                  isActive 
                    ? getAccentBgClass() 
                    : theme === 'dark'
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <IconComponent size={18} className={isActive ? 'text-white dark:text-slate-950' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} />
                <span className="whitespace-nowrap truncate">{item.name}</span>
                {isActive && (
                  <span className="absolute right-3 top-4.5 w-1.5 h-1.5 bg-white dark:bg-slate-950 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin Profile & Logout (Desktop) */}
        <div className={`p-4 border-t flex flex-col gap-3.5 ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={getAdminAvatar(currentUser || { username: 'guest' })}
                alt={currentUser?.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl object-cover border border-slate-250 dark:border-slate-700 shadow-xs"
              />
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 ${
                currentUser?.role === 'super_admin' ? 'bg-indigo-500' : 'bg-amber-500'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{currentUser?.name}</h4>
              <span className="text-[10px] text-slate-500 font-medium block">
                {currentUser?.role === 'super_admin' ? 'Super Admin' : `Admin Cabang ${currentUser?.branch}`}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => {
              setCurrentUser(null);
              localStorage.removeItem('math_finggers_current_user_obj');
              localStorage.removeItem('math_finggers_current_user');
            }}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
              theme === 'dark'
                ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/10 text-red-400 hover:text-red-300'
                : 'bg-red-50/50 hover:bg-red-100/50 border-red-200/50 text-red-600'
            }`}
          >
            <LogOut size={13} />
            <span>Keluar Sesi</span>
          </button>

          <div className="text-[9px] text-slate-500 text-center mt-1">
            &copy; {new Date().getFullYear()} Math Fingers System v1.1.0
          </div>
        </div>
      </aside>

      {/* 3. MOBILE MENU SIDE-DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer menu content */}
          <div className={`relative w-72 max-w-[80vw] h-full shadow-2xl flex flex-col z-10 border-r animate-slide-right ${
            theme === 'dark' ? 'bg-[#020617] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Sparkles className="text-emerald-500" size={20} />
                <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Navigasi Aplikasi</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white font-medium"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-xs transition ${
                      isActive 
                        ? getAccentBgClass() 
                        : theme === 'dark'
                          ? 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <IconComponent size={16} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            {/* Admin Profile & Logout (Mobile Drawer) */}
            <div className={`p-4 border-t flex flex-col gap-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src={getAdminAvatar(currentUser || { username: 'guest' })}
                    alt={currentUser?.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-lg object-cover border border-slate-250 dark:border-slate-700 shadow-xs"
                  />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                    currentUser?.role === 'super_admin' ? 'bg-indigo-500' : 'bg-amber-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{currentUser?.name}</h4>
                  <span className="text-[9px] text-slate-500">
                    {currentUser?.role === 'super_admin' ? 'Super Admin' : `Admin Cabang ${currentUser?.branch}`}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setCurrentUser(null);
                  localStorage.removeItem('math_finggers_current_user_obj');
                  localStorage.removeItem('math_finggers_current_user');
                }}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  theme === 'dark'
                    ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/10 text-red-400'
                    : 'bg-red-50/50 hover:bg-red-100/50 border-red-200/50 text-red-600'
                }`}
              >
                <LogOut size={12} />
                <span>Keluar Sesi</span>
              </button>
              
              <div className="text-[8px] text-slate-500 text-center mt-1">
                Math Fingers Privat Tutor
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN WORKSPACE CONTENT WINDOW */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <div key={activeTab} className="animate-page-fade-in">
          {renderContent()}
        </div>
      </main>

      {/* 5. MOBILE BOTTOM NAVIGATION */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-lg transition-colors duration-150 ${
        theme === 'dark' ? 'bg-[#020617]/90 border-slate-850 text-white' : 'bg-white/95 border-slate-200 text-slate-800'
      } pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.08)]`}>
        <div className="flex items-center justify-around py-2.5 px-1">
          {isSuperAdmin ? (
            <>
              {/* Statistik Shortcut */}
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all ${
                  activeTab === 'overview' 
                    ? getAccentTextClass() 
                    : 'text-slate-400 hover:text-slate-300 dark:text-slate-500'
                }`}
              >
                <Home size={20} className={activeTab === 'overview' ? 'scale-110 transition-transform' : 'transition-transform'} />
                <span className="text-[10px] font-bold tracking-tight">Statistik</span>
              </button>

              {/* Data Cabang Shortcut */}
              <button
                onClick={() => setActiveTab('branches_mgmt')}
                className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all ${
                  activeTab === 'branches_mgmt' 
                    ? getAccentTextClass() 
                    : 'text-slate-400 hover:text-slate-300 dark:text-slate-500'
                }`}
              >
                <Building size={20} className={activeTab === 'branches_mgmt' ? 'scale-110 transition-transform' : 'transition-transform'} />
                <span className="text-[10px] font-bold tracking-tight">Data Cabang</span>
              </button>

              {/* Backup / Pengaturan Shortcut */}
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all ${
                  activeTab === 'settings' 
                    ? getAccentTextClass() 
                    : 'text-slate-400 hover:text-slate-300 dark:text-slate-500'
                }`}
              >
                <Settings size={20} className={activeTab === 'settings' ? 'scale-110 transition-transform' : 'transition-transform'} />
                <span className="text-[10px] font-bold tracking-tight">Pengaturan</span>
              </button>
            </>
          ) : (
            <>
              {/* Dashboard Shortcut */}
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all ${
                  activeTab === 'overview' 
                    ? getAccentTextClass() 
                    : 'text-slate-400 hover:text-slate-300 dark:text-slate-500'
                }`}
              >
                <Home size={20} className={activeTab === 'overview' ? 'scale-110 transition-transform' : 'transition-transform'} />
                <span className="text-[10px] font-bold tracking-tight">Dashboard</span>
              </button>

              {/* Siswa Shortcut */}
              <button
                onClick={() => setActiveTab('students')}
                className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all ${
                  activeTab === 'students' 
                    ? getAccentTextClass() 
                    : 'text-slate-400 hover:text-slate-300 dark:text-slate-500'
                }`}
              >
                <Users size={20} className={activeTab === 'students' ? 'scale-110 transition-transform' : 'transition-transform'} />
                <span className="text-[10px] font-bold tracking-tight">Siswa</span>
              </button>

              {/* Absensi Shortcut */}
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all ${
                  activeTab === 'attendance' 
                    ? getAccentTextClass() 
                    : 'text-slate-400 hover:text-slate-300 dark:text-slate-500'
                }`}
              >
                <CheckSquare size={20} className={activeTab === 'attendance' ? 'scale-110 transition-transform' : 'transition-transform'} />
                <span className="text-[10px] font-bold tracking-tight">Absensi</span>
              </button>

              {/* Input Nilai Shortcut */}
              <button
                onClick={() => setActiveTab('grades')}
                className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all ${
                  activeTab === 'grades' 
                    ? getAccentTextClass() 
                    : 'text-slate-400 hover:text-slate-300 dark:text-slate-500'
                }`}
              >
                <Award size={20} className={activeTab === 'grades' ? 'scale-110 transition-transform' : 'transition-transform'} />
                <span className="text-[10px] font-bold tracking-tight text-center">Input Nilai</span>
              </button>
            </>
          )}

          {/* Menu Lainnya Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex flex-col items-center gap-1 flex-1 py-1 px-1 transition-all ${
              isMobileMenuOpen 
                ? getAccentTextClass() 
                : 'text-slate-400 hover:text-slate-300 dark:text-slate-500'
            }`}
          >
            <Menu size={20} className="transition-transform" />
            <span className="text-[10px] font-bold tracking-tight">Lainnya</span>
          </button>
        </div>
      </div>

    </div>
  );
}
