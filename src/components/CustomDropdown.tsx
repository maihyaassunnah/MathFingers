import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  theme?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

// Framer Motion Variants for staggered entry
const containerVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95, 
    y: -8 
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.03,
      delayChildren: 0.03
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: {
      duration: 0.15,
      ease: [0.7, 0, 0.84, 0]
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: 'spring', 
      stiffness: 380, 
      damping: 24 
    } 
  }
};

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = 'Pilih salah satu...',
  theme = 'dark',
  className = '',
  id,
  disabled = false
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  const selectedOption = options.find(opt => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (!disabled) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [disabled]);

  return (
    <div 
      id={id} 
      ref={dropdownRef} 
      className={`relative inline-block w-full min-w-[160px] text-left ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all duration-300 outline-none focus:ring-1 focus:ring-emerald-500/50 ${
          disabled
            ? isLight
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-slate-900/40 border-slate-800 text-slate-550 cursor-not-allowed shadow-none'
            : isLight
              ? 'bg-white hover:bg-slate-50 border-slate-250 text-slate-800 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md'
              : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800 text-slate-200 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.3)] hover:shadow-lg'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex-shrink-0"
        >
          <ChevronDown size={14} className={isLight ? 'text-slate-500' : 'text-slate-400'} />
        </motion.div>
      </button>

      {/* Animated Options List */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ originY: 0 }}
            className={`absolute z-50 mt-2 w-full rounded-2xl border p-1.5 shadow-2xl max-h-[280px] overflow-y-auto ${
              isLight
                ? 'bg-white border-slate-250/90 shadow-slate-200/50'
                : 'bg-slate-950/95 border-slate-800/90 shadow-black/60 backdrop-blur-md'
            }`}
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 italic text-center">
                Tidak ada opsi
              </div>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <motion.button
                    variants={itemVariants}
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all duration-200 ${
                      isSelected
                        ? isLight
                          ? 'bg-slate-100 text-emerald-600'
                          : 'bg-slate-900/70 text-emerald-400'
                        : isLight
                        ? 'text-slate-700 hover:bg-slate-50'
                        : 'text-slate-300 hover:bg-slate-900/50'
                    }`}
                  >
                    <span className="truncate pr-2">{option.label}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="flex-shrink-0"
                      >
                        <Check size={14} className="text-emerald-500" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
