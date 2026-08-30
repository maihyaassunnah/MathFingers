import React, { useState } from 'react';
import { 
  Home, 
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
  Sun, 
  Moon, 
  LogOut, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  MoreHorizontal, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  ShieldCheck, 
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import { MathFingerLogo } from './MathFingerLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: any;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isSuperAdmin: boolean;
  activeBranch: string;
  onSelectBranch: (branch: string) => void;
  studentsCount: number;
  pendingSppCount?: number;
  todayAttendanceCount?: number;
  installedVersion: string;
  isUpdateAvailable: boolean;
  onOpenUpdateModal: () => void;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenSearch?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  theme,
  toggleTheme,
  isSuperAdmin,
  activeBranch,
  onSelectBranch,
  studentsCount,
  pendingSppCount = 0,
  todayAttendanceCount = 0,
  installedVersion,
  isUpdateAvailable,
  onOpenUpdateModal,
  onLogout,
  isCollapsed,
  setIsCollapsed,
  onOpenSearch
}) => {
  const [activeSegment, setActiveSegment] = useState<'UTAMA' | 'OPERASIONAL'>('UTAMA');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isLight = theme === 'light';

  // Admin avatar helper
  const getAvatarUrl = () => {
    if (currentUser?.avatarUrl) return currentUser.avatarUrl;
    const name = encodeURIComponent(currentUser?.name || 'Admin');
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=0d9488,0284c7,4f46e5`;
  };

  const isAssistant = currentUser?.role === 'branch_assistant';

  // Grouped Navigation Items
  const navGroups = [
    {
      title: 'UTAMA',
      items: [
        { id: 'overview', name: isSuperAdmin ? 'Pusat Komando' : 'Dashboard', icon: Home },
        { id: 'students', name: 'Siswa', icon: Users, badge: studentsCount, badgeColor: 'bg-lime-400 text-slate-950' },
        { id: 'classes', name: 'Kelas', icon: Layers },
        { id: 'qr_cards', name: 'Kartu QR Siswa', icon: QrCode }
      ]
    },
    {
      title: 'AKADEMIK & PRESENSI',
      items: [
        { id: 'attendance', name: 'Absensi Hari Ini', icon: CheckSquare, badge: todayAttendanceCount > 0 ? todayAttendanceCount : undefined, badgeColor: 'bg-emerald-500 text-white' },
        { id: 'notes', name: 'Jurnal Guru', icon: FileText },
        { id: 'journal_history', name: 'Riwayat Jurnal', icon: History },
        { id: 'grades', name: 'Input Nilai', icon: Award },
        { id: 'simulator', name: 'Kurikulum & Panduan', icon: BookOpen },
        { id: 'report', name: 'Rapor Siswa', icon: TrendingUp }
      ]
    },
    ...(!isAssistant ? [{
      title: 'KEUANGAN',
      items: [
        { id: 'spp', name: 'Pembayaran SPP', icon: Receipt, badge: pendingSppCount > 0 ? pendingSppCount : undefined, badgeColor: 'bg-amber-400 text-slate-950' },
        { id: 'spp_history', name: 'Riwayat SPP', icon: History },
        { id: 'finance', name: 'Arus Keuangan', icon: Wallet }
      ]
    }] : []),
    {
      title: 'AKUN & SISTEM',
      items: [
        { id: 'alumni', name: 'Alumni / Lulus', icon: GraduationCap },
        ...(isSuperAdmin ? [
          { id: 'branches_mgmt', name: 'Cabang & Admin', icon: Building },
          { id: 'google_sheets_sync', name: 'Database Sheets', icon: FileSpreadsheet },
          { id: 'supabase_sql', name: 'SQL Supabase', icon: Database }
        ] : []),
        { id: 'settings', name: 'Pengaturan', icon: Settings }
      ]
    }
  ];

  return (
    <aside className={`relative h-screen sticky top-0 flex flex-col transition-all duration-300 z-30 p-2 sm:p-3 select-none ${
      isCollapsed ? 'w-20' : 'w-64 sm:w-72'
    }`}>
      {/* Floating Edge Toggle Button on the Right Border */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute -right-2.5 top-7 z-40 p-1.5 rounded-full border shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-110 active:scale-95 ${
          isLight 
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-white shadow-emerald-950/20' 
            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-slate-900 shadow-black/50'
        }`}
        title={isCollapsed ? 'Perluas / Memperbesar Sidebar' : 'Mengecilkan Sidebar'}
      >
        {isCollapsed ? <ChevronRight size={16} className="font-extrabold" /> : <ChevronLeft size={16} className="font-extrabold" />}
      </button>

      {/* Outer Rounded Panel matching image styling */}
      <div className={`h-full w-full rounded-[24px] sm:rounded-[28px] border shadow-xl flex flex-col overflow-hidden transition-colors duration-200 ${
        isLight 
          ? 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-200/50' 
          : 'bg-[#0f172a] border-slate-800/80 text-white shadow-black/40'
      }`}>
        
        {/* 1. TOP HEADER (Traffic Lights + Logo + Search & Theme Toggle) */}
        <div className={`border-b flex flex-col shrink-0 ${
          isCollapsed ? 'p-2.5 gap-2 text-center' : 'p-4 gap-3'
        } ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
          
          {/* Expanded State Header */}
          {!isCollapsed ? (
            <>
              {/* Traffic Light Dots & Rail Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-xs" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-xs" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-xs" />
                </div>

                <div className="flex items-center gap-1">
                  {/* Theme Toggle Button */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      isLight 
                        ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' 
                        : 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                    }`}
                    title={isLight ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
                  >
                    {isLight ? <Moon size={14} /> : <Sun size={14} />}
                  </button>

                  {/* Expand / Collapse Button */}
                  <button
                    type="button"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      isLight 
                        ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Ciutkan / Kecilkan Sidebar"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>
              </div>

              {/* Logo & App Version Title */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <MathFingerLogo size={24} showText={false} theme={theme} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm tracking-tight truncate">Math Fingers</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md">
                        v3.3
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Sistem Olah Data Bimbingan</p>
                  </div>
                </div>

                {/* Version update button */}
                <button
                  type="button"
                  onClick={onOpenUpdateModal}
                  className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                    isUpdateAvailable
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title={isUpdateAvailable ? 'Pembaruan aplikasi tersedia' : 'Versi aplikasi terbaru'}
                >
                  <Sparkles size={13} />
                </button>
              </div>
            </>
          ) : (
            /* Collapsed State Header */
            <div className="flex flex-col items-center gap-2 pt-0.5">
              {/* Traffic light dots */}
              <div className="flex items-center justify-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              </div>

              {/* Dedicated Expand Sidebar Button */}
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className={`w-full py-2 px-1.5 rounded-xl border flex items-center justify-center gap-1 transition cursor-pointer group shadow-xs ${
                  isLight 
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' 
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-400'
                }`}
                title="Klik untuk Memperbesar Sidebar"
              >
                <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Clickable Logo */}
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 hover:scale-105 transition cursor-pointer"
                title="Klik untuk Memperbesar Sidebar"
              >
                <MathFingerLogo size={22} showText={false} theme={theme} />
              </button>

              {/* Theme Toggle in Collapsed mode */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`p-1.5 rounded-xl border transition cursor-pointer ${
                  isLight 
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' 
                    : 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                }`}
                title={isLight ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
              >
                {isLight ? <Moon size={13} /> : <Sun size={13} />}
              </button>
            </div>
          )}

          {/* 2. SEGMENTED SWITCHER / PILL TABS (In Expanded mode) */}
          {!isCollapsed && (
            <div className={`p-1 rounded-2xl border flex items-center gap-1 ${
              isLight ? 'bg-slate-100/80 border-slate-200/80' : 'bg-slate-900/90 border-slate-800'
            }`}>
              <button
                type="button"
                onClick={() => setActiveSegment('UTAMA')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                  activeSegment === 'UTAMA'
                    ? isLight
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                    : isLight
                      ? 'text-slate-500 hover:text-slate-800'
                      : 'text-slate-400 hover:text-white'
                }`}
              >
                UTAMA
              </button>
              <button
                type="button"
                onClick={() => setActiveSegment('OPERASIONAL')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                  activeSegment === 'OPERASIONAL'
                    ? isLight
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                    : isLight
                      ? 'text-slate-500 hover:text-slate-800'
                      : 'text-slate-400 hover:text-white'
                }`}
              >
                OPERASIONAL
              </button>
            </div>
          )}
        </div>

        {/* 3. NAVIGATION MENU SCROLL AREA */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 no-scrollbar">
          {navGroups.map((group, groupIdx) => {
            // Filter group items if segmented filter is active
            let groupItems = group.items;
            if (!isCollapsed && activeSegment === 'OPERASIONAL') {
              if (group.title === 'UTAMA') return null; // skip overview main
            }

            if (groupItems.length === 0) return null;

            return (
              <div key={group.title || groupIdx} className="space-y-1">
                {/* Group Header Label */}
                {!isCollapsed && (
                  <div className="px-3 pb-1 text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                    {group.title}
                  </div>
                )}

                {/* Group Items */}
                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const IconComp = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-between rounded-2xl transition-all duration-150 cursor-pointer relative ${
                          isCollapsed ? 'p-2.5 justify-center' : 'px-3.5 py-2.5'
                        } ${
                          isActive
                            ? isLight
                              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                              : 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                            : isLight
                              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                          <IconComp 
                            size={18} 
                            className={`shrink-0 ${
                              isActive 
                                ? isLight ? 'text-white' : 'text-slate-950'
                                : isLight ? 'text-slate-500' : 'text-slate-400'
                            }`} 
                          />
                          {!isCollapsed && (
                            <span className="text-xs font-semibold truncate tracking-tight">
                              {item.name}
                            </span>
                          )}
                        </div>

                        {/* Badges */}
                        {!isCollapsed && item.badge !== undefined && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                            item.badgeColor || 'bg-emerald-500 text-white'
                          }`}>
                            {item.badge}
                          </span>
                        )}

                        {/* Collapsed Dot Badge */}
                        {isCollapsed && item.badge !== undefined && (
                          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. BOTTOM FLOATING USER PROFILE CARD */}
        <div className={`p-3 border-t shrink-0 relative ${isLight ? 'border-slate-100 bg-slate-50/60' : 'border-slate-800/80 bg-slate-950/40'}`}>
          {/* User Options Dropdown Popup */}
          {isUserMenuOpen && (
            <div className={`absolute bottom-16 left-3 right-3 rounded-2xl border p-2 shadow-2xl z-50 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 ${
              isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-800 text-white'
            }`}>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSelectBranch('all');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition"
                >
                  <Building2 size={14} />
                  <span>Mode Super Admin</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setActiveTab('settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Settings size={14} />
                <span>Pengaturan Profil</span>
              </button>
              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition"
              >
                <LogOut size={14} />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          )}

          {/* Profile Card Pill Layout matching image */}
          <div className={`p-2.5 rounded-2xl border flex items-center justify-between transition ${
            isLight 
              ? 'bg-slate-100/90 border-slate-200/80 text-slate-800' 
              : 'bg-slate-900/90 border-slate-800 text-white'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={getAvatarUrl()}
                  alt={currentUser?.name || 'User'}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-300 dark:border-slate-700 shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>

              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="font-extrabold text-xs truncate leading-snug">
                    {currentUser?.name || 'Pengguna'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                    {isSuperAdmin ? (
                      <span className="text-amber-500 font-bold flex items-center gap-0.5">
                        <ShieldCheck size={10} /> Super Admin
                      </span>
                    ) : isAssistant ? (
                      <span className="text-purple-400 font-bold flex items-center gap-0.5">
                        <UserCheck size={10} /> Asisten {currentUser?.branch || 'Pusat'}
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                        <UserCheck size={10} /> Cabang {currentUser?.branch || 'Pusat'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer ${
                  isUserMenuOpen ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : ''
                }`}
                title="Opsi Akun"
              >
                <MoreHorizontal size={16} />
              </button>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
