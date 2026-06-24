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
  RefreshCw,
  Smartphone,
  Download
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
    setBankAccountHolder('Admin Math Fingers');
    setDefaultSppAmount(250000);
    setAccentColor('emerald');
    setDefaultTeacherName('Admin Math Fingers');
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
                    placeholder="Contoh: Admin Math Fingers"
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

      {/* PWA / Install App Guide */}
      <div className={`mt-8 p-6 rounded-2xl border shadow-sm space-y-6 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-2 border-b pb-3 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
          <Smartphone size={16} className={getAccentTextClass()} />
          <span>Pasang Aplikasi di HP (Instal PWA)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Android Guide */}
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200/60' : 'bg-slate-950/30 border-slate-800/50'}`}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.523 15.3414C17.0601 15.3414 16.6853 14.9666 16.6853 14.5037C16.6853 14.0408 17.0601 13.666 17.523 13.666C17.9859 13.666 18.3607 14.0408 18.3607 14.5037C18.3607 14.9666 17.9859 15.3414 17.523 15.3414ZM6.47702 15.3414C6.0141 15.3414 5.63934 14.9666 5.63934 14.5037C5.63934 14.0408 6.0141 13.666 6.47702 13.666C6.93994 13.666 7.3147 14.0408 7.3147 14.5037C7.3147 14.9666 6.93994 15.3414 6.47702 15.3414ZM17.9621 9.94314L19.7891 6.77884C19.9231 6.54673 19.8435 6.24949 19.6114 6.11546C19.3793 5.98143 19.082 6.061 18.948 6.29312L17.0911 9.50937C15.626 8.84103 13.9103 8.46191 12 8.46191C10.0897 8.46191 8.37402 8.84103 6.90892 9.50937L5.05202 6.29312C4.918 6.061 4.62075 5.98143 4.38864 6.11546C4.15653 6.24949 4.07696 6.54673 4.21098 6.77884L6.03792 9.94314C2.62886 11.8341 0.355153 15.2101 0.0528277 19.2312C0.0308006 19.524 0.250554 19.778 0.543593 19.7997C0.558309 19.8008 0.573024 19.8014 0.587637 19.8014H23.4124C23.7067 19.8014 23.9452 19.5629 23.9452 19.2686C23.6429 15.2101 21.3711 11.8341 17.9621 9.94314Z"/>
                </svg>
              </div>
              <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Android (Google Chrome)</h4>
            </div>
            <ol className="text-xs space-y-2.5 text-slate-400 list-decimal pl-4 font-medium leading-relaxed">
              <li>Buka aplikasi lewat browser <strong>Google Chrome</strong> di HP Anda.</li>
              <li>Ketuk tombol menu <strong>Tiga Titik (⋮)</strong> di kanan atas browser Chrome.</li>
              <li>Pilih opsi <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>"Tambahkan ke Layar Utama"</strong> atau <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>"Instal Aplikasi"</strong>.</li>
              <li>Ikuti petunjuk di layar, dan aplikasi siap dibuka langsung melalui beranda HP Anda layaknya aplikasi Play Store.</li>
            </ol>
          </div>

          {/* iOS / iPhone Guide */}
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200/60' : 'bg-slate-950/30 border-slate-800/50'}`}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742c.03-.11.047-.225.047-.344a3.342 3.342 0 0 0-1.722-2.915 3.323 3.323 0 0 0-3.155.088c-.14.08-.262.18-.363.298a3.342 3.342 0 0 0 2.24 5.373h.001c.14-.022.28-.052.418-.09M10.5 4.5V3a1.5 1.5 0 0 0-3 0v1.5M10.5 4.5H18a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 18 19.5H10.5M10.5 4.5v15M10.5 19.5H6a2.25 2.25 0 0 1-2.25-2.25V14.25" />
                </svg>
              </div>
              <h4 className="text-xs font-bold text-sky-500 uppercase tracking-wider">Apple iOS (Safari iPhone/iPad)</h4>
            </div>
            <ol className="text-xs space-y-2.5 text-slate-400 list-decimal pl-4 font-medium leading-relaxed">
              <li>Buka aplikasi lewat browser <strong>Safari</strong> bawaan di iPhone Anda.</li>
              <li>Ketuk tombol <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>Bagikan (Share / <span className="inline-block border px-1 rounded bg-slate-800 text-[9px]">↑</span>)</strong> di bar bagian bawah layar.</li>
              <li>Geser ke bawah dan pilih menu <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen).</li>
              <li>Ketuk <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>"Tambah"</strong> di kanan atas, maka ikon aplikasi Math Fingers akan muncul di beranda iPhone Anda.</li>
            </ol>
          </div>
        </div>

        {/* Dynamic prompt message about installation support */}
        <div className={`p-4 rounded-xl flex items-start gap-3 border ${
          isLight ? 'bg-emerald-50/50 border-emerald-100/50' : 'bg-emerald-950/10 border-emerald-900/30'
        }`}>
          <Download className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />
          <div>
            <h5 className="text-xs font-bold text-slate-300">Mengapa Menggunakan PWA?</h5>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Dengan menginstal aplikasi sebagai PWA, Anda dapat membuka Math Fingers langsung dengan layar penuh (tanpa batas bilah browser) layaknya aplikasi natif, loading instan, hemat baterai, dan berjalan dengan sangat responsif di perangkat seluler Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
