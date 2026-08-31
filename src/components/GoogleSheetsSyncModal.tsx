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
  Copy, 
  Key, 
  HelpCircle,
  Database,
  ArrowRight,
  Lock,
  ShieldCheck,
  Globe,
  Settings,
  ChevronDown,
  ChevronUp,
  LogIn
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
  const [customClientId, setCustomClientId] = useState(() => googleSheetsService.getCustomClientId());
  const [directToken, setDirectToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isCopiedUrl, setIsCopiedUrl] = useState(false);
  const [isCopiedOrigin, setIsCopiedOrigin] = useState(false);
  const [showDomainSettings, setShowDomainSettings] = useState(false);
  const [hasAuthToken, setHasAuthToken] = useState(() => googleSheetsService.hasValidToken());

  const isLight = theme === 'light';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://mathfingers.my.id';
  const effectiveClientId = googleSheetsService.getEffectiveClientId();

  useEffect(() => {
    if (isOpen) {
      const current = googleSheetsService.loadConfig();
      setConfig(current);
      setHasAuthToken(googleSheetsService.hasValidToken());
      setCustomClientId(googleSheetsService.getCustomClientId());
      if (current?.spreadsheetId) {
        setCustomSheetId(current.spreadsheetId);
      }
    }
  }, [isOpen]);

  // Listener status sinkronisasi realtime
  useEffect(() => {
    const unsubscribe = googleSheetsService.subscribe((_status, cfg, error) => {
      setConfig(cfg);
      setHasAuthToken(googleSheetsService.hasValidToken());
      if (error) {
        setStatusMessage({ type: 'error', text: error });
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  // 1. Otorisasi Login Google
  const handleAuthorizeGoogle = async () => {
    try {
      setIsLoading(true);
      setActiveAction('auth');
      setStatusMessage({ type: 'info', text: 'Membuka jendela otorisasi Google...' });
      
      await googleSheetsService.requestOAuthToken();
      setHasAuthToken(true);
      setStatusMessage({ 
        type: 'success', 
        text: 'Akun Google berhasil diotorisasi! Akses Google Sheets aktif.' 
      });
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Gagal otorisasi Google.';
      setStatusMessage({ type: 'error', text: msg });
      if (msg.includes('origin_mismatch') || msg.includes('400')) {
        setShowDomainSettings(true);
      }
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // 2. Simpan Custom Client ID
  const handleSaveCustomClientId = () => {
    googleSheetsService.setCustomClientId(customClientId);
    setStatusMessage({
      type: 'success',
      text: 'Custom Google Client ID berhasil disimpan. Silakan klik tombol "Login / Otorisasi Google".'
    });
  };

  // 3. Simpan Manual Direct Access Token (Bypass instan)
  const handleApplyDirectToken = () => {
    if (!directToken.trim()) {
      setStatusMessage({ type: 'error', text: 'Masukkan Access Token yang valid.' });
      return;
    }
    googleSheetsService.setAccessToken(directToken.trim(), 3600);
    setHasAuthToken(true);
    setDirectToken('');
    setStatusMessage({
      type: 'success',
      text: 'Access Token manual berhasil diterapkan! Anda kini dapat melakukan Push/Pull data ke Google Sheets.'
    });
  };

  // 4. Buat Spreadsheet Master Baru di Google Drive
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
      setHasAuthToken(true);
      setStatusMessage({ 
        type: 'success', 
        text: 'Google Spreadsheet Master berhasil dibuat, dikunci permanen, dan seluruh data awal telah tersinkron!' 
      });
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Gagal membuat Google Spreadsheet baru.';
      setStatusMessage({ type: 'error', text: msg });
      if (msg.includes('origin_mismatch')) {
        setShowDomainSettings(true);
      }
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // 5. Hubungkan Spreadsheet yang Sudah Ada (Pakai ID / URL) & Kunci Permanen
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
        spreadsheetTitle: metadata.title || 'Google Sheets Math Fingers Master',
        autoSyncEnabled: true,
        isPermanent: true,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success'
      };

      googleSheetsService.saveConfig(newConfig);
      setConfig(newConfig);
      setHasAuthToken(true);

      if (onApplyPulledData) {
        onApplyPulledData(data);
      }

      setStatusMessage({ 
        type: 'success', 
        text: `Berhasil terhubung ke "${metadata.title}"! ID Spreadsheet telah dikunci permanen dan seluruh data (${data.students.length} siswa, ${data.invoices.length} tagihan SPP) telah disinkronkan.` 
      });
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Pastikan file dibagikan atau akun Google Anda memiliki akses edit.';
      setStatusMessage({ type: 'error', text: `Gagal terhubung: ${msg}` });
      if (msg.includes('origin_mismatch')) {
        setShowDomainSettings(true);
      }
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // 6. PUSH: Kirim / Timpa Data dari Aplikasi ke Google Sheets
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
      setHasAuthToken(true);

      setStatusMessage({ 
        type: 'success', 
        text: 'Data berhasil disinkronkan ke Google Sheets! Seluruh baris di spreadsheet telah terisi data terbaru.' 
      });
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Gagal mengirim data ke Google Sheets.';
      setStatusMessage({ type: 'error', text: msg });
      if (msg.includes('origin_mismatch')) {
        setShowDomainSettings(true);
      }
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // 7. PULL: Tarik Data dari Google Sheets ke Aplikasi
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
      setHasAuthToken(true);

      setStatusMessage({ 
        type: 'success', 
        text: `Sinkronisasi Sukses! Memperbarui aplikasi dengan ${data.students.length} siswa, ${data.attendance.length} presensi, dan ${data.invoices.length} kuitansi dari Google Sheets.` 
      });
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Gagal mengambil data dari Google Sheets.';
      setStatusMessage({ type: 'error', text: msg });
      if (msg.includes('origin_mismatch')) {
        setShowDomainSettings(true);
      }
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleCopyLink = () => {
    if (config?.spreadsheetUrl) {
      navigator.clipboard.writeText(config.spreadsheetUrl);
      setIsCopiedUrl(true);
      setTimeout(() => setIsCopiedUrl(false), 2000);
    }
  };

  const handleCopyOrigin = () => {
    navigator.clipboard.writeText(currentOrigin);
    setIsCopiedOrigin(true);
    setTimeout(() => setIsCopiedOrigin(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div 
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors ${
          isLight 
            ? 'bg-white border-slate-200 text-slate-900' 
            : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header Modal */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between ${
          isLight ? 'bg-emerald-50/70 border-emerald-100' : 'bg-emerald-950/20 border-emerald-900/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Sinkronisasi Google Sheets</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Realtime DB
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Integrasi spreadsheet master otomatis untuk penyimpanan rekap data Math Fingers.
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
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
                <span className="font-semibold leading-relaxed">{statusMessage.text}</span>
              </div>
            </div>
          )}

          {/* Otorisasi Google Bar */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            hasAuthToken 
              ? (isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40')
              : (isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-amber-950/20 border-amber-800/40')
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${hasAuthToken ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div>
                <span className="text-xs font-bold block">
                  {hasAuthToken ? 'Akun Google Terotorisasi' : 'Perlu Izin Akses Akun Google'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {hasAuthToken 
                    ? 'Koneksi ke Google Drive & Sheets aktif' 
                    : 'Diperlukan untuk membaca & menulis data ke spreadsheet'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAuthorizeGoogle}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                {isLoading && activeAction === 'auth' ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <LogIn size={13} />
                )}
                <span>{hasAuthToken ? 'Perbarui Izin' : 'Login Google'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDomainSettings(!showDomainSettings)}
                className={`p-1.5 rounded-xl border text-xs transition ${
                  showDomainSettings 
                    ? 'bg-slate-800 text-emerald-400 border-emerald-500/40' 
                    : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Pengaturan Domain & OAuth Client ID"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          {/* Section: Pengaturan Domain & Solusi Error origin_mismatch */}
          {showDomainSettings && (
            <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 text-xs animate-fade-in ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                  <Globe size={16} className="text-emerald-500" />
                  <span>Pengaturan Domain & Google Cloud OAuth</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-mono">
                  {currentOrigin}
                </span>
              </div>

              {/* Panduan Origin Mismatch */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Jika muncul Error 400: origin_mismatch pada {currentOrigin}:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1">
                  <li>Buka <strong>Google Cloud Console</strong> &gt; <strong>APIs &amp; Services</strong> &gt; <strong>Credentials</strong>.</li>
                  <li>Klik <strong>OAuth 2.0 Client IDs</strong> proyek Anda.</li>
                  <li>Pada bagian <strong>Authorized JavaScript origins</strong>, klik <strong>+ ADD URI</strong> lalu tempelkan origin domain:</li>
                </ol>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={currentOrigin}
                    className={`flex-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono select-all ${
                      isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleCopyOrigin}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <Copy size={11} />
                    <span>{isCopiedOrigin ? 'Tersalin!' : 'Salin Origin'}</span>
                  </button>
                </div>
              </div>

              {/* Custom Client ID Input */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Custom Google OAuth Client ID (Opsional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: 123456-abcde.apps.googleusercontent.com"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomClientId}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0"
                  >
                    Simpan Client ID
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Client ID aktif: <span className="font-mono">{effectiveClientId}</span>
                </p>
              </div>

              {/* Direct Access Token Bypass */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Key size={13} className="text-emerald-500" />
                  <span>Bypass Instan dengan Direct Access Token:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Tempelkan Google OAuth Access Token (ya29...)"
                    value={directToken}
                    onChange={(e) => setDirectToken(e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyDirectToken}
                    disabled={!directToken.trim()}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shrink-0 disabled:opacity-50"
                  >
                    Terapkan Token
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* KONDISI 1: SUDAH TERHUBUNG & TERKUNCI PERMANEN */}
          {config?.spreadsheetId ? (
            <div className="space-y-5">
              
              {/* Connected & Permanently Locked Card */}
              <div className={`p-5 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-500">
                      <Lock size={14} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          ID Spreadsheet Master Terkunci (Permanen)
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 text-[10px] font-bold">
                          🔒 Permanen
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                      title="Salin Tautan"
                    >
                      <Copy size={12} />
                      <span>{isCopiedUrl ? 'Tersalin!' : 'Salin URL'}</span>
                    </button>
                    <a
                      href={config.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Buka Spreadsheet</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Read-Only Locked Spreadsheet ID Display */}
                <div className="pt-3 space-y-3">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px] font-medium block">
                      Spreadsheet ID Terkunci:
                    </span>
                    <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                    }`}>
                      <Lock size={14} className="text-emerald-500 shrink-0" />
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex-1 select-all">
                        {config.spreadsheetId}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Nama Dokumen:</span>
                      <span className="font-bold">{config.spreadsheetTitle || 'Database Master Math Fingers'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Terakhir Sinkron:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleString('id-ID') : 'Baru saja'}
                      </span>
                    </div>
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
                      Unggah seluruh data lokal saat ini (siswa, absensi, tagihan SPP, nilai) ke dalam sheet master.
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
                    <span>11 Tab Sheet Tersinkron Permanen:</span>
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

              {/* Permanent Notice Banner */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center gap-2.5 text-xs text-slate-400">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span>
                  Spreadsheet ID dikunci secara permanen untuk menjaga konsistensi dan integritas data sinkronisasi antar perangkat.
                </span>
              </div>

            </div>
          ) : (
            
            /* KONDISI 2: BELUM TERHUBUNG - PILIHAN INISIALISASI & KUNCI PERMANEN */
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
                    Sistem akan membuat file Google Spreadsheet baru di Google Drive Anda secara instan dengan 11 tab sheet (*Data_Siswa, Presensi, SPP, Jurnal, Nilai, dll.*) dan langsung menguncinya sebagai basis data permanen.
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
                        <span>Buat Spreadsheet Master & Kunci Permanen</span>
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
                    Atau Masukkan Spreadsheet ID / Link Google Sheet yang Sudah Ada:
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tempelkan link (URL) atau Spreadsheet ID Google Sheet Anda.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdB... atau https://docs.google.com/spreadsheets/d/..."
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
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 shrink-0 flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      {isLoading && activeAction === 'connect' ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Lock size={14} />
                      )}
                      <span>Hubungkan &amp; Kunci Permanen</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-2">
                    <ShieldCheck size={15} className="shrink-0" />
                    <span>
                      <strong>Catatan:</strong> Setelah ID Spreadsheet dimasukkan dan berhasil terhubung, ID ini akan <strong>dikunci permanen</strong> dan tidak dapat diubah lagi demi menjaga integritas data aplikasi.
                    </span>
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
