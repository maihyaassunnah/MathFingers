import React from 'react';
import { 
  Sparkles, 
  X, 
  LogOut, 
  Home, 
  Users, 
  CheckSquare, 
  FileText, 
  Receipt, 
  Award, 
  BookOpen, 
  TrendingUp, 
  Settings, 
  History, 
  Database, 
  GraduationCap, 
  Building, 
  Layers, 
  Wallet, 
  QrCode 
} from 'lucide-react';
import { AdminUser } from '../types';
import { getAdminAvatar } from '../utils';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: Array<{ id: string; name: string; icon: any }>;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  currentUser: AdminUser | null;
  onLogout: () => void;
  theme: 'light' | 'dark';
  accentBgClass: string;
}

export function MobileDrawer({
  isOpen,
  onClose,
  navigationItems,
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  theme,
  accentBgClass
}: MobileDrawerProps) {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer menu content */}
      <div 
        id="mobile-drawer-panel"
        className={`relative w-80 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 p-3 ${
          isDark ? 'bg-[#0b1329] text-white' : 'bg-slate-100 text-slate-800'
        }`}
      >
        {/* Outer panel container matching image */}
        <div className={`h-full w-full rounded-[24px] border shadow-xl flex flex-col overflow-hidden ${
          isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {/* Header with Traffic Light Dots */}
          <div className={`p-4 border-b flex flex-col gap-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-xs" />
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white flex items-center justify-center text-slate-400 transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm block">Math Fingers</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md">v2.5</span>
                </div>
                <span className="text-[10px] text-slate-400">Sistem Olah Data Bimbingan</span>
              </div>
            </div>
          </div>

          {/* Navigation Item List */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              const isAcademicDivider = item.id === 'attendance';
              const isSystemDivider = item.id === 'branches_mgmt' || (item.id === 'settings' && currentUser?.role !== 'super_admin');

              return (
                <div key={item.id} className="space-y-1">
                  {isAcademicDivider && (
                    <div className="pt-3 pb-1 px-3">
                      <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} mb-2`} />
                      <span className={`text-[10px] font-bold tracking-wider uppercase block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        AKADEMIK & OPERASIONAL
                      </span>
                    </div>
                  )}
                  {isSystemDivider && (
                    <div className="pt-3 pb-1 px-3">
                      <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} mb-2`} />
                      <span className={`text-[10px] font-bold tracking-wider uppercase block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        AKUN & SISTEM
                      </span>
                    </div>
                  )}
                  <button
                    id={`drawer-item-${item.id}`}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-extrabold' 
                        : isDark
                          ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <IconComponent size={16} className={isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500'} />
                    <span className="truncate">{item.name}</span>
                  </button>
                </div>
              );
            })}
          </nav>

          {/* User Footer & Logout Pill Card */}
          <div className={`p-3 border-t flex flex-col gap-2 ${isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/60'}`}>
            <div className={`p-2.5 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-slate-100/90 border-slate-200/80 text-slate-800'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={getAdminAvatar(currentUser || { username: 'guest' })}
                    alt={currentUser?.name}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-xl object-cover border border-slate-300 dark:border-slate-700 shadow-xs"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-xs font-extrabold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{currentUser?.name}</h4>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {currentUser?.role === 'super_admin' ? 'Super Admin' : `Admin Cabang ${currentUser?.branch}`}
                  </span>
                </div>
              </div>
              
              <button
                id="mobile-drawer-logout-btn"
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-xl hover:bg-rose-500/10 text-rose-500 transition cursor-pointer"
                title="Keluar"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
