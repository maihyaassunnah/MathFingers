import { useState, useEffect } from 'react';
import { useMathFinggersDb } from './hooks/useMathFinggersDb';
import { DashboardOverview } from './components/DashboardOverview';
import { StudentManager } from './components/StudentManager';
import { AttendanceTracker } from './components/AttendanceTracker';
import { TeacherNotes } from './components/TeacherNotes';
import { SppInvoiceManager } from './components/SppInvoiceManager';
import { GradeManager } from './components/GradeManager';
import { MaterialList } from './components/MaterialList';
import { StudentProgressReport } from './components/StudentProgressReport';
import { SettingsManager } from './components/SettingsManager';
import { MathFingerLogo } from './components/MathFingerLogo';

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
  Settings
} from 'lucide-react';

export default function App() {
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

  const {
    students,
    attendance,
    notes,
    invoices,
    grades,
    materials,
    settings,
    dashboardTasks,
    loading,
    isOfflineFallback,
    addStudent,
    updateStudent,
    deleteStudent,
    addAttendanceBatch,
    addTeacherNote,
    deleteTeacherNote,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    addGrade,
    deleteGrade,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    updateSettings,
    addDashboardTask,
    toggleDashboardTask,
    deleteDashboardTask
  } = useMathFinggersDb();

  const navigationItems = [
    { id: 'overview', name: 'Dashboard', icon: Home },
    { id: 'students', name: 'Siswa', icon: Users },
    { id: 'attendance', name: 'Absensi', icon: CheckSquare },
    { id: 'notes', name: 'Jurnal Guru', icon: FileText },
    { id: 'spp', name: 'SPP & Invoice', icon: Receipt },
    { id: 'grades', name: 'Input Nilai', icon: Award },
    { id: 'simulator', name: 'Daftar Materi', icon: BookOpen },
    { id: 'report', name: 'Rapor Perkembangan', icon: TrendingUp },
    { id: 'settings', name: 'Pengaturan', icon: Settings },
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

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <DashboardOverview 
            students={students} 
            attendance={attendance} 
            invoices={invoices} 
            grades={grades} 
            settings={settings}
            dashboardTasks={dashboardTasks}
            onAddDashboardTask={addDashboardTask}
            onToggleDashboardTask={toggleDashboardTask}
            onDeleteDashboardTask={deleteDashboardTask}
            onNavigate={(tab) => setActiveTab(tab)} 
            theme={theme}
          />
        );
      case 'students':
        return (
          <StudentManager 
            students={students} 
            materials={materials}
            onAddStudent={addStudent} 
            onUpdateStudent={updateStudent} 
            onDeleteStudent={deleteStudent} 
            theme={theme}
          />
        );
      case 'attendance':
        return (
          <AttendanceTracker 
            students={students} 
            attendance={attendance} 
            onAddAttendanceBatch={addAttendanceBatch} 
            theme={theme}
          />
        );
      case 'notes':
        return (
          <TeacherNotes 
            students={students} 
            notes={notes} 
            onAddNote={addTeacherNote} 
            onDeleteNote={deleteTeacherNote} 
            theme={theme}
          />
        );
      case 'spp':
        return (
          <SppInvoiceManager 
            students={students} 
            invoices={invoices} 
            settings={settings}
            onCreateInvoice={createInvoice} 
            onUpdateInvoiceStatus={updateInvoiceStatus} 
            onDeleteInvoice={deleteInvoice} 
            theme={theme}
          />
        );
      case 'grades':
        return (
          <GradeManager 
            students={students} 
            grades={grades} 
            onAddGrade={addGrade} 
            onDeleteGrade={deleteGrade} 
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
            theme={theme} 
          />
        );
      case 'report':
        return (
          <StudentProgressReport 
            students={students} 
            attendance={attendance} 
            notes={notes} 
            grades={grades} 
            theme={theme}
          />
        );
      case 'settings':
        return (
          <SettingsManager 
            settings={settings} 
            onUpdateSettings={updateSettings} 
            theme={theme}
          />
        );
      default:
        return (
          <DashboardOverview 
            students={students} 
            attendance={attendance} 
            invoices={invoices} 
            grades={grades} 
            settings={settings}
            dashboardTasks={dashboardTasks}
            onAddDashboardTask={addDashboardTask}
            onToggleDashboardTask={toggleDashboardTask}
            onDeleteDashboardTask={deleteDashboardTask}
            onNavigate={(tab) => setActiveTab(tab)} 
            theme={theme} 
          />
        );
    }
  };

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

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-xl hover:bg-slate-800/50 ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
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

        {/* Footer info panel */}
        <div className={`p-4 border-t text-[10px] text-slate-500 text-center ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
          &copy; {new Date().getFullYear()} Math Fingers System v1.1.0
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

            <div className={`p-4 border-t text-[10px] text-slate-500 text-center ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              Math Fingers Privat Tutor
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN WORKSPACE CONTENT WINDOW */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {renderContent()}
      </main>

    </div>
  );
}
