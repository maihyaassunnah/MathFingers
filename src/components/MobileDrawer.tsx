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
        className={`relative w-80 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 border-r animate-slide-right ${
          isDark ? 'bg-[#020617] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="font-extrabold text-sm block">Menu Aplikasi</span>
              <span className="text-[10px] text-slate-400">Math Fingers Privat Tutor</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white flex items-center justify-center text-slate-400 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Item List */}
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
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
                      Akademik & Operasional
                    </span>
                  </div>
                )}
                {isSystemDivider && (
                  <div className="pt-3 pb-1 px-3">
                    <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} mb-2`} />
                    <span className={`text-[10px] font-bold tracking-wider uppercase block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Administrasi & Sistem
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    isActive 
                      ? accentBgClass 
                      : isDark
                        ? 'text-slate-300 hover:text-white hover:bg-slate-800/40'
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

        {/* User Footer & Logout */}
        <div className={`p-4 border-t flex flex-col gap-3 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={getAdminAvatar(currentUser || { username: 'guest' })}
                alt={currentUser?.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-cover border border-slate-300 dark:border-slate-700 shadow-xs"
              />
              <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                currentUser?.role === 'super_admin' ? 'bg-indigo-500' : 'bg-amber-500'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{currentUser?.name}</h4>
              <span className="text-[10px] text-slate-500 block truncate">
                {currentUser?.role === 'super_admin' ? 'Super Admin' : `Admin Cabang ${currentUser?.branch}`}
              </span>
            </div>
          </div>
          
          <button
            id="mobile-drawer-logout-btn"
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              isDark
                ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
            }`}
          >
            <LogOut size={13} />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
