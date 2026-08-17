import React from 'react';
import { motion } from 'motion/react';
import { 
  Home, 
  Users, 
  CheckSquare, 
  Award, 
  Menu, 
  Building, 
  Settings,
  LucideIcon
} from 'lucide-react';

interface MobileBottomNavigationProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenDrawer: () => void;
  isSuperAdmin: boolean;
  theme: 'light' | 'dark';
  accentClass: string;
  hiddenCount?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  isDrawer?: boolean;
}

export function MobileBottomNavigation({
  activeTab,
  onSelectTab,
  onOpenDrawer,
  isSuperAdmin,
  theme,
  hiddenCount = 0
}: MobileBottomNavigationProps) {
  const isDark = theme === 'dark';

  // Unified items configuration for consistent mobile experience across all roles
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'students', label: 'Siswa', icon: Users },
    { id: 'attendance', label: 'Absensi', icon: CheckSquare },
    { id: 'grades', label: 'Nilai', icon: Award },
    { id: 'more', label: 'Lainnya', icon: Menu, isDrawer: true },
  ];

  // Determine which nav item is active
  const activeIndex = (() => {
    const directMatch = navItems.findIndex(item => item.id === activeTab);
    if (directMatch !== -1) return directMatch;
    // If activeTab is one of the secondary tabs opened via drawer, default to "Lainnya"
    const moreIndex = navItems.findIndex(item => item.isDrawer);
    return moreIndex !== -1 ? moreIndex : 0;
  })();

  const activeItem = navItems[activeIndex] || navItems[0];
  const ActiveIcon = activeItem.icon;
  const totalTabs = navItems.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-2 pt-6 pointer-events-none">
      <nav
        id="mobile-bottom-navigation"
        aria-label="Mobile Navigation"
        className={`relative max-w-md mx-auto pointer-events-auto rounded-[28px] border transition-colors duration-200 shadow-[0_-8px_25px_rgba(0,0,0,0.14)] ${
          isDark 
            ? 'bg-[#0f172a] border-slate-800 text-white' 
            : 'bg-[#e9ecf2] border-slate-300/80 text-slate-800'
        }`}
      >
        {/* Animated Notch & Floating Green Bubble Indicator */}
        <motion.div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ width: `${100 / totalTabs}%` }}
          animate={{ left: `${(activeIndex * 100) / totalTabs}%` }}
          transition={{ 
            type: 'spring', 
            stiffness: 420, 
            damping: 32, 
            mass: 0.8 
          }}
        >
          {/* 1. Curved Dome Notch SVG seamlessly extending out of the top border */}
          <svg 
            className="absolute -top-[24px] left-1/2 -translate-x-1/2 w-[86px] h-[26px] pointer-events-none" 
            viewBox="0 0 86 26" 
            fill="none"
          >
            {/* Notch Fill matching bar background */}
            <path 
              d="M 0,26 C 20,26 26,1 43,1 C 60,1 66,26 86,26 Z" 
              className={isDark ? 'fill-[#0f172a]' : 'fill-[#e9ecf2]'}
            />
            {/* Smooth Top Contour Border */}
            <path 
              d="M 0,26 C 20,26 26,1 43,1 C 60,1 66,26 86,26" 
              stroke={isDark ? 'rgb(30 41 59)' : 'rgba(203, 213, 225, 0.9)'} 
              strokeWidth="1.2" 
              strokeLinecap="round"
              fill="none" 
            />
          </svg>

          {/* 2. Floating Circular Green Icon Badge */}
          <div className="absolute -top-[27px] left-1/2 -translate-x-1/2 flex items-center justify-center">
            <motion.div 
              key={activeItem.id}
              initial={{ scale: 0.65, y: 6 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              className={`w-[52px] h-[52px] rounded-full flex items-center justify-center border-[3px] border-emerald-500 shadow-[0_8px_18px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20 ${
                isDark 
                  ? 'bg-[#021f15] text-emerald-400' 
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <ActiveIcon size={24} className="stroke-[2.5]" />
            </motion.div>
          </div>
        </motion.div>

        {/* Navigation Items Grid */}
        <div className="relative flex items-center justify-around h-[62px] px-1 z-10">
          {navItems.map((item, idx) => {
            const isActive = idx === activeIndex;
            const ItemIcon = item.icon;

            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                type="button"
                onClick={() => {
                  if (item.isDrawer) {
                    onOpenDrawer();
                  } else {
                    onSelectTab(item.id);
                  }
                }}
                className="relative flex flex-col items-center justify-center flex-1 h-full py-1 px-1 transition-all cursor-pointer select-none group"
              >
                {isActive ? (
                  // Active Item: Leaves upper space for the floating circle and renders bold label below
                  <motion.div 
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col items-center justify-end h-full pb-1.5"
                  >
                    <span className={`text-[11px] font-black tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {item.label}
                    </span>
                  </motion.div>
                ) : (
                  // Inactive Item: Standard Icon + Label
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">
                    <div className="relative">
                      <ItemIcon size={20} className="stroke-[1.8] transition-transform group-hover:scale-105" />
                      {item.isDrawer && hiddenCount > 0 && (
                        <span className="absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-[#0f172a] animate-pulse">
                          {hiddenCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold tracking-tight">
                      {item.label}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Home Indicator Bar as shown in the mockup */}
        <div className="pb-1 pt-0.5 flex justify-center">
          <div className={`w-28 h-1 rounded-full ${
            isDark ? 'bg-slate-700/60' : 'bg-slate-400/50'
          }`} />
        </div>
      </nav>
    </div>
  );
}

