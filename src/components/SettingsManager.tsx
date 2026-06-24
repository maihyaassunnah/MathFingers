import React, { useState } from 'react';
import { AppSettings } from '../types';
import { 
  Settings, 
  Receipt, 
  Palette, 
  User, 
  Landmark, 
  Check, 
  Sparkles, 
  Save, 
  RefreshCw 
} from 'lucide-react';

interface SettingsManagerProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  theme?: string;
}

const ACCENT_COLORS = [
  { id: 'emerald', name: 'Emerald Green', colorClass: 'bg-emerald-500', hoverClass: 'hover:bg-emerald-600', ringClass: 'ring-emerald-400' },
  { id: 'indigo', name: 'Indigo Blue', colorClass: 'bg-indigo-500', hoverClass: 'hover:bg-indigo-600', ringClass: 'ring-indigo-400' },
  { id: 'violet', name: 'Violet Purple', colorClass: 'bg-violet-500', hoverClass: 'hover:bg-violet-600', ringClass: 'ring-violet-400' },
  { id: 'amber', name: 'Amber Yellow', colorClass: 'bg-amber-500', hoverClass: 'hover:bg-amber-600', ringClass: 'ring-amber-400' },
  { id: 'rose', name: 'Rose Red', colorClass: 'bg-rose-500', hoverClass: 'hover:bg-rose-600', ringClass: 'ring-rose-400' },
  { id: 'sky', name: 'Sky Blue', colorClass: 'bg-sky-500', hoverClass: 'hover:bg-sky-600', ringClass: 'ring-sky-400' },
] as const;

export function SettingsManager({ settings, onUpdateSettings, theme = 'dark' }: SettingsManagerProps) {
  const [bankName, setBankName] = useState(settings.bankName);
  const [bankAccountNo, setBankAccountNo] = useState(settings.bankAccountNo);
  const [bankAccountHolder, setBankAccountHolder] = useState(settings.bankAccountHolder);
  const [defaultSppAmount, setDefaultSppAmount] = useState(settings.defaultSppAmount);
  const [accentColor, setAccentColor] = useState<AppSettings['accentColor']>(settings.accentColor);
  const [defaultTeacherName, setDefaultTeacherName] = useState(settings.defaultTeacherName);
  
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      bankName,
      bankAccountNo,
      bankAccountHolder,
      defaultSppAmount: Number(defaultSppAmount),
      accentColor,
      defaultTeacherName
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    setBankName('Bank BCA');
    setBankAccountNo('1234567890');
    setBankAccountHolder('Admin Math Finggers');
    setDefaultSppAmount(250000);
    setAccentColor('emerald');
    setDefaultTeacherName('Admin Math Finggers');
  };

  const isLight = theme === 'light';

  // Accent helper to get color styling
  const getAccentBgClass = () => {
    switch (accentColor) {
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-500 text-white';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500 text-white';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-slate-900';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'sky': return 'bg-sky-600 hover:bg-sky-500 text-slate-900';
      case 'emerald':
      default: return 'bg-emerald-600 hover:bg-emerald-500 text-white';
    }
  };

  const getAccentTextClass = () => {
    switch (accentColor) {
      case 'indigo': return 'text-indigo-500';
      case 'violet': return 'text-violet-500';
      case 'amber': return 'text-amber-500';
      case 'rose': return 'text-rose-500';
      case 'sky': return 'text-sky-500';
      case 'emerald':
      default: return 'text-emerald-500';
    }
  };

  const getAccentBorderClass = () => {
    switch (accentColor) {
      case 'indigo': return 'focus:ring-indigo-500 focus:border-indigo-500';
      case 'violet': return 'focus:ring-violet-500 focus:border-violet-500';
      case 'amber': return 'focus:ring-amber-500 focus:border-amber-500';
      case 'rose': return 'focus:ring-rose-500 focus:border-rose-500';
      case 'sky': return 'focus:ring-sky-500 focus:border-sky-500';
      case 'emerald':
      default: return 'focus:ring-emerald-500 focus:border-emerald-500';
    }
  };

  return (
    <div id="settings-manager-section" className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'} flex items-center gap-2.5`}>
            <Settings size={26} className={getAccentTextClass()} />
            <span>Pengaturan Aplikasi</span>
          </h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm mt-1`}>
            Atur default invoice SPP, nomor rekening bank, pengajar utama, serta skema warna dekoratif sistem.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Row 1: Invoice & Bank Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Pengaturan Invoice & Pengajar */}
          <div className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-2 border-b pb-3 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
              <Receipt size={16} className={getAccentTextClass()} />
              <span>Default SPP & Person (Pengajar)</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nominal SPP Default (Rupiah) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm text-slate-500 font-bold">Rp</span>
                  <input
                    type="number"
                    required
                    value={defaultSppAmount}
                    onChange={(e) => setDefaultSppAmount(Number(e.target.value))}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-1 font-mono font-bold text-sm ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-800' 
                        : 'bg-slate-950/40 border-slate-800 text-white'
                    } ${getAccentBorderClass()}`}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Digunakan sebagai pengisian otomatis saat pembuatan kuitansi SPP baru.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Person / Pengajar Utama *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 text-slate-500" size={16} />
                  <input
                    type="text"
                    required
                    value={defaultTeacherName}
                    onChange={(e) => setDefaultTeacherName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-1 text-sm font-semibold ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-800' 
                        : 'bg-slate-950/40 border-slate-800 text-white'
                    } ${getAccentBorderClass()}`}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Dicantumkan pada kuitansi digital atau default pembuat Jurnal Catatan Guru.</p>
              </div>
            </div>
          </div>

          {/* Card 2: Pengaturan Bank */}
          <div className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-2 border-b pb-3 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
              <Landmark size={16} className={getAccentTextClass()} />
              <span>Detail Informasi Rekening Bank</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Bank *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bank BCA, Bank Mandiri"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-1 text-sm font-semibold ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 text-slate-800' 
                      : 'bg-slate-950/40 border-slate-800 text-white'
                  } ${getAccentBorderClass()}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nomor Rekening *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1234567890"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-1 font-mono text-sm font-bold ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-800' 
                        : 'bg-slate-950/40 border-slate-800 text-white'
                    } ${getAccentBorderClass()}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nama Atas Nama (Pemilik) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Admin Math Finggers"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-1 text-sm font-semibold ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-800' 
                        : 'bg-slate-950/40 border-slate-800 text-white'
                    } ${getAccentBorderClass()}`}
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Rincian bank ini akan dimasukkan secara otomatis dalam template pesan tagihan WhatsApp dan kuitansi PDF SPP.</p>
            </div>
          </div>
        </div>

        {/* Row 2: Visual Style / Theme Color Settings */}
        <div className={`p-6 rounded-2xl border shadow-sm space-y-5 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-2 border-b pb-3 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
            <Palette size={16} className={getAccentTextClass()} />
            <span>Skema Warna Aksen Aplikasi (Warna)</span>
          </h3>

          <div>
            <p className="text-sm text-slate-500 mb-4">
              Pilih warna aksen visual yang akan digunakan untuk menu navigasi aktif, warna tombol utama, status sukses, dan sorotan antarmuka sistem.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {ACCENT_COLORS.map((color) => {
                const isSelected = accentColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setAccentColor(color.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2.5 transition text-left relative ${
                      isSelected 
                        ? `border-slate-700/80 ring-2 ${color.ringClass} ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}` 
                        : isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-800 hover:bg-slate-800/20'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${color.colorClass} shadow-sm flex items-center justify-center text-white`}>
                      {isSelected && <Check size={14} />}
                    </div>
                    <span className="text-xs font-bold">{color.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form Actions footer */}
        <div className="flex items-center justify-between pt-3">
          <button
            type="button"
            onClick={handleReset}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition ${
              isLight 
                ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' 
                : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <RefreshCw size={14} />
            <span>Kembalikan Default</span>
          </button>

          <div className="flex items-center gap-3">
            {isSaved && (
              <span className="text-emerald-500 font-bold text-xs flex items-center gap-1 animate-fade-in">
                <Sparkles size={14} />
                <span>Pengaturan berhasil disimpan!</span>
              </span>
            )}
            <button
              type="submit"
              className={`flex items-center justify-center gap-2 font-bold text-xs px-5 py-3 rounded-xl transition shadow-md ${getAccentBgClass()}`}
            >
              <Save size={14} />
              <span>Simpan Konfigurasi</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
