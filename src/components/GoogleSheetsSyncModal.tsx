import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  FolderSync, 
  Unlink, 
  Copy, 
  Key, 
  HelpCircle,
  Database,
  ArrowRight
} from 'lucide-react';
import { 
  googleSheetsService, 
  GoogleSheetsConfig, 
  SHEET_NAMES 
} from '../services/googleSheetsService';
import { Student, Attendance, TeacherNote, Invoice, Grade, Branch, AdminUser, ClassGroup, FinanceIncome, FinanceExpense, StudentBehaviorAssessment } from '../types';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
  // App data for initial / sync operations
  students: Student[];
  classes: ClassGroup[];
  attendance: Attendance[];
  notes: TeacherNote[];
  invoices: Invoice[];
  grades: Grade[];
  behaviorAssessments: StudentBehaviorAssessment[];
  manualIncomes: FinanceIncome[];
  expenses: FinanceExpense[];
  branches: Branch[];
  adminUsers: AdminUser[];
  onApplyPulledData?: (data: {
    students: Student[];
    classes: ClassGroup[];
    attendance: Attendance[];
    notes: TeacherNote[];
    invoices: Invoice[];
    grades: Grade[];
    behaviorAssessments: StudentBehaviorAssessment[];
    manualIncomes: FinanceIncome[];
    expenses: FinanceExpense[];
    branches: Branch[];
    adminUsers: AdminUser[];
  }) => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  students,
  classes,
  attendance,
  notes,
  invoices,
  grades,
  behaviorAssessments,
  manualIncomes,
  expenses,
  branches,
  adminUsers,
  onApplyPulledData
}) => {
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(() => googleSheetsService.loadConfig());
  const [customSheetId, setCustomSheetId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const isLight = theme === 'light';

  useEffect(() => {
    if (isOpen) {
      const current = googleSheetsService.loadConfig();
      setConfig(current);
      if (current?.spreadsheetId) {
        setCustomSheetId(current.spreadsheetId);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Buat Spreadsheet Master Baru di Google Drive
  const handleCreateNewSheet = async () => {
    try {
      setIsLoading(true);
      setActiveAction('create');
      setStatusMessage({ type: 'info', text: 'Menghubungkan ke Google Drive & membuat Spreadsheet Master...' });

      const newConfig = await googleSheetsService.createMasterSpreadsheet('Database Master Math Fingers');
      
      // Langsung ekspor data yang ada ke Sheet baru tersebut
      setStatusMessage({ type: 'info', text: 'Mengunggah seluruh data awal aplikasi ke tab-tab Google Sheets...' });
      await googleSheetsService.pushAllDataToSpreadsheet({
        students,
        classes,
        attendance,
        notes,
        invoices,
        grades,
        behaviorAssessments,
        manualIncomes,
        expenses,
        branches,
        adminUsers
      });

      setConfig(newConfig);
      setStatusMessage({ 
        type: 'success', 
        text: 'Google Spreadsheet Master berhasil dibuat dan seluruh data awal berhasil disinkronkan!' 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ 
        type: 'error', 
        text: err?.message || 'Gagal membuat Google Spreadsheet baru.' 
      });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // 2. Hubungkan Spreadsheet yang Sudah Ada (Pakai ID / URL)
  const handleConnectExisting = async () => {
    let cleanId = customSheetId.trim();
    // Ekstrak ID jika pengguna menempelkan URL lengkap
    if (cleanId.includes('/spreadsheets/d/')) {
      const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanId = match[1];
      }
    }

    if (!cleanId) {
      setStatusMessage({ type: 'error', text: 'Silakan masukkan Spreadsheet ID atau URL Google Sheets yang valid.' });
      return;
    }

    try {
      setIsLoading(true);
      setActiveAction('connect');
      setStatusMessage({ type: 'info', text: 'Memverifikasi hak akses ke Spreadsheet...' });

      // Ambil detail metadata dan pastikan struktur tab ada
      const metadata = await googleSheetsService.getSpreadsheetMetadata(cleanId);
      setStatusMessage({ type: 'info', text: `Memeriksa struktur tab pada "${metadata.title}"...` });
      
      const data = await googleSheetsService.pullAllDataFromSpreadsheet(cleanId);
      
      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: cleanId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        spreadsheetTitle: metadata.title || 'Google Sheets Math Fingers',
        autoSyncEnabled: true,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success'
      };

      googleSheetsService.saveConfig(newConfig);
      setConfig(newConfig);

      if (onApplyPulledData) {
        onApplyPulledData(data);
      }

      setStatusMessage({ 
        type: 'success', 
        text: `Berhasil terhubung ke "${metadata.title}"! Struktur 11 tab sheet telah divalidasi dan data (${data.students.length} siswa, ${data.invoices.length} tagihan SPP) berhasil disinkronkan.` 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ 
        type: 'error', 
        text: `Gagal terhubung: ${err?.message || 'Pastikan file dibagikan atau akun Google Anda memiliki akses edit.'}` 
      });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // 3. PUSH: Kirim / Timpa Data dari Aplikasi ke Google Sheets
  const handlePushData = async () => {
    if (!config?.spreadsheetId) return;
    try {
      setIsLoading(true);
      setActiveAction('push');
      setStatusMessage({ type: 'info', text: 'Mengirim seluruh data aplikasi terbaru ke Google Sheets...' });

      await googleSheetsService.pushAllDataToSpreadsheet({
        students,
        classes,
        attendance,
        notes,
        invoices,
        grades,
        behaviorAssessments,
        manualIncomes,
        expenses,
        branches,
        adminUsers
      });

      const updated = googleSheetsService.loadConfig();
      setConfig(updated);

      setStatusMessage({ 
        type: 'success', 
        text: 'Data berhasil disinkronkan ke Google Sheets! Seluruh baris di spreadsheet telah terisi data terbaru.' 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ 
        type: 'error', 
        text: err?.message || 'Gagal mengirim data ke Google Sheets.' 
      });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // 4. PULL: Tarik Data dari Google Sheets ke Aplikasi
  const handlePullData = async () => {
    if (!config?.spreadsheetId) return;
    try {
      setIsLoading(true);
      setActiveAction('pull');
      setStatusMessage({ type: 'info', text: 'Mengambil data terbaru dari Google Sheets...' });

      const data = await googleSheetsService.pullAllDataFromSpreadsheet();
      
      if (onApplyPulledData) {
        onApplyPulledData(data);
      }

      const updated = googleSheetsService.loadConfig();
      setConfig(updated);

      setStatusMessage({ 
        type: 'success', 
        text: `Sinkronisasi Sukses! Memperbarui aplikasi dengan ${data.students.length} siswa, ${data.attendance.length} presensi, dan ${data.invoices.length} kuitansi dari Google Sheets.` 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ 
        type: 'error', 
        text: err?.message || 'Gagal mengambil data dari Google Sheets.' 
      });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // 5. Putuskan Hubungan Spreadsheet
  const handleDisconnect = () => {
    if (window.confirm('Apakah Anda yakin ingin memutuskan tautan ke Google Sheets? Data di spreadsheet dan lokal Anda tidak akan dihapus.')) {
      googleSheetsService.clearConfig();
      setConfig(null);
      setCustomSheetId('');
      setStatusMessage({ type: 'info', text: 'Tautan Google Sheets telah dilepas.' });
    }
  };

  const handleCopyLink = () => {
    if (config?.spreadsheetUrl) {
      navigator.clipboard.writeText(config.spreadsheetUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div 
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isLight 
            ? 'bg-white border-slate-200 text-slate-900' 
            : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header Modal */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isLight ? 'bg-emerald-50/60 border-emerald-100' : 'bg-emerald-950/20 border-emerald-900/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Sinkronisasi Dua Arah Google Sheets</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Realtime DB
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Jadikan Google Spreadsheet sebagai penyimpanan basis data utama & rekap langsung di Google Drive Anda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition ${
              isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Status Message Banner */}
          {statusMessage && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : statusMessage.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
            }`}>
              {statusMessage.type === 'success' && <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
              {statusMessage.type === 'error' && <AlertCircle size={18} className="shrink-0 mt-0.5" />}
              {statusMessage.type === 'info' && <RefreshCw size={18} className="shrink-0 mt-0.5 animate-spin" />}
              <div className="flex-1">
                <span className="font-semibold">{statusMessage.text}</span>
              </div>
            </div>
          )}

          {/* KONDISI 1: SUDAH TERHUBUNG KE SPREADSHEET */}
          {config?.spreadsheetId ? (
            <div className="space-y-5">
              
              {/* Connected Info Card */}
              <div className={`p-5 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Spreadsheet Terhubung & Aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                      title="Salin Tautan"
                    >
                      <Copy size={12} />
                      <span>{isCopied ? 'Tersalin!' : 'Salin URL'}</span>
                    </button>
                    <a
                      href={config.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Buka di Google Sheets</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Spreadsheet:</span>
                    <span className="font-bold">{config.spreadsheetTitle || 'Math Fingers Master DB'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Terakhir Disinkronkan:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleString('id-ID') : 'Baru saja'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dua Arah Sync Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Tombol PUSH (Aplikasi -> Sheet) */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  <div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-1">
                      <ArrowUpCircle size={18} />
                      <span>Kirim ke Google Sheets (Push)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Unggah seluruh data lokal saat ini (siswa, absensi, tagihan SPP, nilai) ke dalam sheet.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePushData}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md shadow-emerald-600/20"
                  >
                    <RefreshCw size={14} className={isLoading && activeAction === 'push' ? 'animate-spin' : ''} />
                    <span>{isLoading && activeAction === 'push' ? 'Menyinkronkan...' : 'Kirim Data ke Sheet'}</span>
                  </button>
                </div>

                {/* Tombol PULL (Sheet -> Aplikasi) */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  <div>
                    <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm mb-1">
                      <ArrowDownCircle size={18} />
                      <span>Tarik dari Google Sheets (Pull)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Muat data yang Anda edit langsung di spreadsheet ke dalam antarmuka aplikasi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePullData}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md shadow-sky-600/20"
                  >
                    <FolderSync size={14} className={isLoading && activeAction === 'pull' ? 'animate-spin' : ''} />
                    <span>{isLoading && activeAction === 'pull' ? 'Mengambil Data...' : 'Tarik Data ke Aplikasi'}</span>
                  </button>
                </div>

              </div>

              {/* Daftar Sheet Tab yang Didukung */}
              <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'
              }`}>
                <div className="flex items-center justify-between font-bold text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Database size={14} className="text-emerald-500" />
                    <span>Struktur Sheet yang Tersinkron Otomatis:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">11 Tab Terhubung</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.values(SHEET_NAMES).map((name) => (
                    <span 
                      key={name}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Disconnect Action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl text-red-500 hover:bg-red-500/10 text-xs font-bold transition flex items-center gap-1.5 border border-red-500/20"
                >
                  <Unlink size={13} />
                  <span>Putuskan Sambungan Spreadsheet</span>
                </button>
              </div>

            </div>
          ) : (
            
            /* KONDISI 2: BELUM TERHUBUNG - PILIHAN INISIALISASI */
            <div className="space-y-6">
              
              {/* Opsi 1: Otomatis Buat Spreadsheet Master Baru */}
              <div className={`p-5 rounded-3xl border-2 border-emerald-500/40 relative overflow-hidden transition ${
                isLight ? 'bg-emerald-50/40' : 'bg-emerald-950/10'
              }`}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                      Rekomendasi Utama
                    </span>
                    <h4 className="text-sm font-black">Buat Spreadsheet Master Otomatis</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Sistem akan membuat file Google Spreadsheet baru di Google Drive Anda secara instan dengan 11 tab sheet (*Data_Siswa, Presensi, SPP, Jurnal, Nilai, dll.*) beserta format header kolom yang sudah terstandar.
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleCreateNewSheet}
                    disabled={isLoading}
                    className="w-full py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                  >
                    {isLoading && activeAction === 'create' ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Membuat File Spreadsheet di Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Buat Spreadsheet & Ekspor Data Sekarang</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Opsi 2: Hubungkan File Spreadsheet yang Sudah Ada */}
              <div className={`p-5 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
              }`}>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Atau Hubungkan File Google Spreadsheet yang Sudah Ada:
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tempelkan link (URL) atau Spreadsheet ID Google Sheet Anda yang telah memiliki hak akses edit.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdB.../edit"
                      value={customSheetId}
                      onChange={(e) => setCustomSheetId(e.target.value)}
                      className={`flex-1 px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none ${
                        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleConnectExisting}
                      disabled={isLoading || !customSheetId.trim()}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                    >
                      {isLoading && activeAction === 'connect' ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <FolderSync size={14} />
                      )}
                      <span>Hubungkan</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between text-xs ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/50 border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center gap-1.5 text-[11px]">
            <HelpCircle size={14} className="text-emerald-500" />
            <span>Format tabel di Google Sheets kompatibel dengan rumus Excel & Looker Studio.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
