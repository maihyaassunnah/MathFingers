import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { AppSettings, AdminUser } from '../types';
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
  Download,
  Upload,
  Image,
  Trash2,
  Database,
  FileJson,
  AlertCircle,
  FileText,
  Users,
  GraduationCap,
  CheckSquare,
  Award,
  History,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';

interface SettingsManagerProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  theme?: string;
  students?: any[];
  grades?: any[];
  attendance?: any[];
  notes?: any[];
  invoices?: any[];
  dashboardTasks?: any[];
  onImportBackup?: (backupPayload: any) => Promise<{ success: boolean; error?: string }>;
  currentUser?: AdminUser | null;
  activeBranch?: string;
}

const ACCENT_COLORS = [
  { id: 'emerald', name: 'Emerald Green', colorClass: 'bg-emerald-500', hoverClass: 'hover:bg-emerald-600', ringClass: 'ring-emerald-400' },
  { id: 'indigo', name: 'Indigo Blue', colorClass: 'bg-indigo-500', hoverClass: 'hover:bg-indigo-600', ringClass: 'ring-indigo-400' },
  { id: 'violet', name: 'Violet Purple', colorClass: 'bg-violet-500', hoverClass: 'hover:bg-violet-600', ringClass: 'ring-violet-400' },
  { id: 'amber', name: 'Amber Yellow', colorClass: 'bg-amber-500', hoverClass: 'hover:bg-amber-600', ringClass: 'ring-amber-400' },
  { id: 'rose', name: 'Rose Red', colorClass: 'bg-rose-500', hoverClass: 'hover:bg-rose-600', ringClass: 'ring-rose-400' },
  { id: 'sky', name: 'Sky Blue', colorClass: 'bg-sky-500', hoverClass: 'hover:bg-sky-600', ringClass: 'ring-sky-400' },
] as const;

export function SettingsManager({ 
  settings, 
  onUpdateSettings, 
  theme = 'dark',
  students = [],
  grades = [],
  attendance = [],
  notes = [],
  invoices = [],
  dashboardTasks = [],
  onImportBackup,
  currentUser = null,
  activeBranch = 'all'
}: SettingsManagerProps) {
  const [bankName, setBankName] = useState(settings.bankName);
  const [bankAccountNo, setBankAccountNo] = useState(settings.bankAccountNo);
  const [bankAccountHolder, setBankAccountHolder] = useState(settings.bankAccountHolder);
  const [defaultSppAmount, setDefaultSppAmount] = useState(settings.defaultSppAmount);
  const [accentColor, setAccentColor] = useState<AppSettings['accentColor']>(settings.accentColor);
  const [defaultTeacherName, setDefaultTeacherName] = useState(settings.defaultTeacherName);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix || 'INV/MF');
  const [invoiceLogo, setInvoiceLogo] = useState<string | undefined>(settings.invoiceLogo);
  const [invoiceSignature, setInvoiceSignature] = useState<string | undefined>(settings.invoiceSignature);
  
  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<null | { success: boolean; error?: string }>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    try {
      setIsExporting(true);
      const backupData = {
        appName: "Math Fingers System Backup",
        backupDate: new Date().toISOString(),
        data: {
          students,
          grades,
          attendance,
          notes,
          invoices,
          dashboardTasks,
          settings
        }
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `math_fingers_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting backup:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportBackup) return;

    try {
      setIsImporting(true);
      setImportStatus(null);
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const content = event.target?.result;
          if (typeof content !== 'string') {
            throw new Error('Format file tidak didukung');
          }

          const parsed = JSON.parse(content);
          const result = await onImportBackup(parsed);
          
          if (result.success) {
            setImportStatus({ success: true });
          } else {
            setImportStatus({ success: false, error: result.error || 'Gagal memulihkan data cadangan' });
          }
        } catch (parseErr: any) {
          setImportStatus({ success: false, error: 'File bukan format JSON yang valid: ' + parseErr.message });
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      reader.readAsText(file);
    } catch (err: any) {
      setImportStatus({ success: false, error: 'Gagal membaca berkas: ' + err.message });
      setIsImporting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (type === 'logo') {
            setInvoiceLogo(reader.result);
          } else {
            setInvoiceSignature(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      bankName,
      bankAccountNo,
      bankAccountHolder,
      defaultSppAmount: Number(defaultSppAmount),
      accentColor,
      defaultTeacherName,
      invoicePrefix,
      invoiceLogo,
      invoiceSignature
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
    setInvoicePrefix('INV/MF');
    setInvoiceLogo(undefined);
    setInvoiceSignature(undefined);
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

  // HELPER FUNCTIONS FOR EXPORT SYSTEM
  const truncate = (str: any, len: number) => {
    if (str === null || str === undefined) return '';
    const stringified = String(str);
    return stringified.length > len ? stringified.substring(0, len) + '...' : stringified;
  };

  const formatRupiahValue = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const getBranchText = () => {
    if (currentUser?.role === 'branch_admin') {
      return currentUser.branch;
    }
    return activeBranch === 'all' ? 'Semua Cabang' : activeBranch;
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const content = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const drawPdfHeader = (doc: any, title: string, branchName: string) => {
    doc.setFillColor(16, 185, 129); // Emerald Green
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MATH FINGERS SYSTEM", 15, 12);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Sistem Manajemen Jaritmatika Indonesia • Berhitung Cepat & Akurat Tanpa Alat", 15, 18);
    doc.text(`Laporan: ${title} | Cabang: ${branchName} | Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 15, 23);
  };

  const exportToPDFTable = (
    title: string,
    headers: string[],
    widths: number[],
    rows: string[][],
    branchName: string
  ) => {
    const doc = new jsPDF();
    let y = 42;
    const pageHeight = 297;
    const margin = 15;
    const rowHeight = 8;
    const fontSize = 8;
    
    drawPdfHeader(doc, title, branchName);
    
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 5, 180, rowHeight, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(51, 65, 85);
    
    headers.forEach((h, i) => {
      doc.text(h, widths[i], y);
    });
    doc.line(margin, y + 2, 195, y + 2);
    
    y += rowHeight;
    
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    
    rows.forEach((row) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 42;
        drawPdfHeader(doc, title, branchName);
        
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y - 5, 180, rowHeight, 'F');
        doc.setFont("Helvetica", "bold");
        headers.forEach((h, i) => {
          doc.text(h, widths[i], y);
        });
        doc.line(margin, y + 2, 195, y + 2);
        y += rowHeight;
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(71, 85, 105);
      }
      
      row.forEach((cell, i) => {
        let maxChar = 18;
        if (i === 1 || i === 2) maxChar = 22;
        if (i === 4) maxChar = 26;
        const text = truncate(cell || '', maxChar);
        doc.text(text, widths[i], y);
      });
      
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 2, 195, y + 2);
      
      y += rowHeight;
    });
    
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${branchName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const handleExportSiswa = (format: 'pdf' | 'excel') => {
    const branchName = getBranchText();
    const activeStudents = students.filter(s => s.status !== 'alumni');
    
    if (format === 'excel') {
      const headers = ["No", "Kode Siswa", "Nama Siswa", "Orang Tua/Wali", "No. WhatsApp", "Paket", "Level Bimbingan", "Jenis Kelamin", "Alamat", "Cabang"];
      const rows = activeStudents.map((s, idx) => [
        (idx + 1).toString(),
        s.uniqueCode || s.id.substring(0, 5).toUpperCase(),
        s.name || '',
        s.parentName || '',
        s.parentPhone || '',
        s.jenisPaket || 'Reguler',
        s.level || '',
        s.jenisKelamin || '',
        s.alamat || '',
        s.branch || 'Pusat'
      ]);
      downloadCSV(`data_siswa_aktif_${branchName.toLowerCase().replace(/\s+/g, '_')}.csv`, headers, rows);
    } else {
      const headers = ["No", "Kode", "Nama Siswa", "Orang Tua/Wali", "No. WhatsApp", "Paket", "Level Bimbingan"];
      const widths = [15, 23, 40, 80, 115, 145, 160];
      const rows = activeStudents.map((s, idx) => [
        (idx + 1).toString(),
        s.uniqueCode || s.id.substring(0, 5).toUpperCase(),
        s.name || '',
        s.parentName || '',
        s.parentPhone || '',
        s.jenisPaket || 'Reguler',
        s.level || ''
      ]);
      exportToPDFTable("Data Siswa Aktif", headers, widths, rows, branchName);
    }
  };

  const handleExportAlumni = (format: 'pdf' | 'excel') => {
    const branchName = getBranchText();
    const alumniList = students.filter(s => s.status === 'alumni');
    
    if (format === 'excel') {
      const headers = ["No", "Kode Siswa", "Nama Alumni", "Orang Tua/Wali", "No. WhatsApp", "Paket", "Level Terakhir", "Jenis Kelamin", "Alamat", "Cabang"];
      const rows = alumniList.map((s, idx) => [
        (idx + 1).toString(),
        s.uniqueCode || s.id.substring(0, 5).toUpperCase(),
        s.name || '',
        s.parentName || '',
        s.parentPhone || '',
        s.jenisPaket || 'Reguler',
        s.level || '',
        s.jenisKelamin || '',
        s.alamat || '',
        s.branch || 'Pusat'
      ]);
      downloadCSV(`data_alumni_${branchName.toLowerCase().replace(/\s+/g, '_')}.csv`, headers, rows);
    } else {
      const headers = ["No", "Kode", "Nama Alumni", "Orang Tua/Wali", "No. WhatsApp", "Paket", "Level Terakhir"];
      const widths = [15, 23, 40, 80, 115, 145, 160];
      const rows = alumniList.map((s, idx) => [
        (idx + 1).toString(),
        s.uniqueCode || s.id.substring(0, 5).toUpperCase(),
        s.name || '',
        s.parentName || '',
        s.parentPhone || '',
        s.jenisPaket || 'Reguler',
        s.level || ''
      ]);
      exportToPDFTable("Data Alumni Lulus", headers, widths, rows, branchName);
    }
  };

  const handleExportAbsensi = (format: 'pdf' | 'excel') => {
    const branchName = getBranchText();
    
    if (format === 'excel') {
      const headers = ["No", "Tanggal", "Nama Siswa", "Status Kehadiran", "Catatan Presensi", "Cabang"];
      const rows = attendance.map((a, idx) => [
        (idx + 1).toString(),
        a.date || '',
        a.studentName || '',
        a.status === 'present' ? 'Hadir' : a.status === 'absent' ? 'Alpa' : 'Izin',
        a.notes || '',
        a.branch || 'Pusat'
      ]);
      downloadCSV(`rekap_absensi_${branchName.toLowerCase().replace(/\s+/g, '_')}.csv`, headers, rows);
    } else {
      const headers = ["No", "Tanggal", "Nama Siswa", "Status", "Catatan Presensi", "Cabang"];
      const widths = [15, 25, 52, 95, 120, 175];
      const rows = attendance.map((a, idx) => [
        (idx + 1).toString(),
        a.date || '',
        a.studentName || '',
        a.status === 'present' ? 'Hadir' : a.status === 'absent' ? 'Alpa' : 'Izin',
        a.notes || '',
        a.branch || 'Pusat'
      ]);
      exportToPDFTable("Rekapitulasi Absensi Siswa", headers, widths, rows, branchName);
    }
  };

  const handleExportJurnalGuru = (format: 'pdf' | 'excel') => {
    const branchName = getBranchText();
    
    if (format === 'excel') {
      const headers = ["No", "Tanggal", "Nama Siswa", "Topik Belajar", "Catatan / Jurnal Guru", "Nama Guru", "Cabang"];
      const rows = notes.map((n, idx) => [
        (idx + 1).toString(),
        n.date || '',
        n.studentName || '',
        n.topic || '',
        n.content || '',
        n.teacherName || '',
        n.branch || 'Pusat'
      ]);
      downloadCSV(`jurnal_guru_${branchName.toLowerCase().replace(/\s+/g, '_')}.csv`, headers, rows);
    } else {
      const headers = ["No", "Tanggal", "Nama Siswa", "Topik Belajar", "Jurnal Perkembangan", "Guru"];
      const widths = [15, 25, 48, 85, 120, 172];
      const rows = notes.map((n, idx) => [
        (idx + 1).toString(),
        n.date || '',
        n.studentName || '',
        n.topic || '',
        n.content || '',
        n.teacherName || ''
      ]);
      exportToPDFTable("Riwayat Jurnal Mengajar Guru", headers, widths, rows, branchName);
    }
  };

  const handleExportRiwayatPembayaran = (format: 'pdf' | 'excel') => {
    const branchName = getBranchText();
    
    if (format === 'excel') {
      const headers = ["No", "No. Invoice", "Nama Siswa", "Bulan Tagihan", "Jumlah Tagihan", "Jumlah Dibayar", "Metode Pembayaran", "Status SPP", "Cabang"];
      const rows = invoices.map((inv, idx) => [
        (idx + 1).toString(),
        inv.invoiceNo || '',
        inv.studentName || '',
        inv.month || '',
        inv.amount.toString(),
        (inv.amountPaid || (inv.status === 'paid' ? inv.amount : 0)).toString(),
        inv.paymentMethod || 'Transfer',
        inv.status === 'paid' ? 'Lunas' : inv.status === 'partially_paid' ? 'Sisa Tagihan' : 'Belum Bayar',
        inv.branch || 'Pusat'
      ]);
      downloadCSV(`riwayat_pembayaran_spp_${branchName.toLowerCase().replace(/\s+/g, '_')}.csv`, headers, rows);
    } else {
      const headers = ["No", "No. Invoice", "Nama Siswa", "Bulan", "Tagihan", "Dibayar", "Status", "Metode"];
      const widths = [15, 23, 60, 95, 115, 135, 155, 175];
      const rows = invoices.map((inv, idx) => [
        (idx + 1).toString(),
        inv.invoiceNo || '',
        inv.studentName || '',
        inv.month || '',
        formatRupiahValue(inv.amount),
        formatRupiahValue(inv.amountPaid || (inv.status === 'paid' ? inv.amount : 0)),
        inv.status === 'paid' ? 'Lunas' : inv.status === 'partially_paid' ? 'Sebagian' : 'Belum Bayar',
        inv.paymentMethod || 'Transfer'
      ]);
      exportToPDFTable("Laporan Riwayat Pembayaran SPP", headers, widths, rows, branchName);
    }
  };

  const handleExportNilai = (format: 'pdf' | 'excel') => {
    const branchName = getBranchText();
    
    const getSpeedCategory = (score: number, seconds: number) => {
      if (score < 80) return 'Perlu Latihan';
      if (seconds <= 5) return 'Refleks Kilat';
      if (seconds <= 10) return 'Sangat Tangkas';
      if (seconds <= 18) return 'Tangkas Baik';
      return 'Cukup Refleks';
    };

    if (format === 'excel') {
      const headers = ["No", "Tanggal", "Nama Siswa", "Materi / Topik Uji", "Skor Akurasi", "Kecepatan (Detik)", "Ket. Refleks Jari", "Catatan Guru", "Cabang"];
      const rows = grades.map((g, idx) => [
        (idx + 1).toString(),
        g.date || '',
        g.studentName || '',
        g.topic || '',
        g.score.toString(),
        g.speedSeconds.toString(),
        getSpeedCategory(g.score, g.speedSeconds),
        g.notes || '',
        g.branch || 'Pusat'
      ]);
      downloadCSV(`riwayat_nilai_evaluasi_${branchName.toLowerCase().replace(/\s+/g, '_')}.csv`, headers, rows);
    } else {
      const headers = ["No", "Tanggal", "Nama Siswa", "Materi Uji", "Skor", "Waktu", "Ket. Refleks", "Catatan"];
      const widths = [15, 23, 45, 83, 123, 135, 150, 175];
      const rows = grades.map((g, idx) => [
        (idx + 1).toString(),
        g.date || '',
        g.studentName || '',
        g.topic || '',
        g.score.toString(),
        `${g.speedSeconds}s`,
        getSpeedCategory(g.score, g.speedSeconds),
        g.notes || ''
      ]);
      exportToPDFTable("Laporan Nilai Evaluasi Siswa", headers, widths, rows, branchName);
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

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Format / Awalan Nomor Invoice *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: INV/MF atau KUITANSI"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-1 text-sm font-mono font-bold ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-800' 
                        : 'bg-slate-950/40 border-slate-800 text-white'
                    } ${getAccentBorderClass()}`}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Mengubah format penomoran invoice (contoh hasil: <code>{invoicePrefix}/2606/4231</code>).</p>
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

        {/* Row 1.5: Logo & Signature Settings */}
        <div className={`p-6 rounded-2xl border shadow-sm space-y-5 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-2 border-b pb-3 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
            <Image size={16} className={getAccentTextClass()} />
            <span>Kustomisasi Dokumen Kuitansi (Logo & Tanda Tangan)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Logo Upload Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'
            }`}>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Logo Instansi / Les (Menggantikan Default)
                </label>
                <p className="text-[10px] text-slate-500 mb-3">
                  Upload logo format PNG/JPG dengan rasio persegi/lanskap. Logo akan dicetak pada header kiri atas kuitansi.
                </p>
                
                {invoiceLogo ? (
                  <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-100 dark:bg-slate-950/40 flex items-center justify-center h-28 group">
                    <img 
                      src={invoiceLogo} 
                      alt="Invoice Logo Preview" 
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setInvoiceLogo(undefined)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition shadow-sm"
                      title="Hapus Logo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center h-28 hover:border-slate-400 transition cursor-pointer relative group ${
                    isLight ? 'border-slate-300' : 'border-slate-800'
                  }`}>
                    <Upload size={22} className="text-slate-500 group-hover:text-slate-400 transition mb-1.5" />
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">Pilih berkas Logo</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">Maks. 1MB (PNG/JPG)</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Signature Upload Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'
            }`}>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Tanda Tangan Elektronik Penerima (Format PNG)
                </label>
                <p className="text-[10px] text-slate-500 mb-3">
                  Upload tanda tangan dengan background transparan (PNG) untuk ditempelkan secara otomatis di atas nama pengajar.
                </p>
                
                {invoiceSignature ? (
                  <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-100 dark:bg-slate-950/40 flex items-center justify-center h-28 group">
                    <img 
                      src={invoiceSignature} 
                      alt="Invoice Signature Preview" 
                      className="max-h-full max-w-full object-contain animate-fade-in"
                    />
                    <button
                      type="button"
                      onClick={() => setInvoiceSignature(undefined)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition shadow-sm"
                      title="Hapus Tanda Tangan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center h-28 hover:border-slate-400 transition cursor-pointer relative group ${
                    isLight ? 'border-slate-300' : 'border-slate-800'
                  }`}>
                    <Upload size={22} className="text-slate-500 group-hover:text-slate-400 transition mb-1.5" />
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">Pilih berkas TTD</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">Disarankan PNG transparan</span>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => handleImageUpload(e, 'signature')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
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

        {/* Row 3: Manual Backup & Restore Settings */}
        <div className={`p-6 rounded-2xl border shadow-sm space-y-5 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-2 border-b pb-3 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
            <Database size={16} className={getAccentTextClass()} />
            <span>Penyimpanan & Cadangan Data (Manual Backup)</span>
          </h3>

          <div className="space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              Ekspor seluruh data siswa, absensi, jurnal guru, tagihan, dan nilai ke format JSON untuk disimpan secara lokal di perangkat Anda sebagai cadangan data manual. Anda juga dapat mengimpor file tersebut untuk memulihkan seluruh data sistem ke kondisi semula.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Export Panel */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-950/20 border-slate-800'
              }`}>
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'} flex items-center gap-1.5`}>
                    <FileJson size={14} className="text-emerald-500" />
                    <span>Ekspor Data Utama</span>
                  </h4>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Unduh salinan cadangan lengkap data siswa, nilai akademis, dan seluruh riwayat sistem dalam bentuk berkas JSON tunggal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 border ${
                    isLight 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent' 
                      : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  <Download size={14} className={isExporting ? 'animate-bounce' : ''} />
                  <span>{isExporting ? 'Memproses Ekspor...' : 'Unduh File Cadangan (.JSON)'}</span>
                </button>
              </div>

              {/* Import Panel */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-950/20 border-slate-800'
              }`}>
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'} flex items-center gap-1.5`}>
                    <Upload size={14} className="text-amber-500" />
                    <span>Impor / Pulihkan Data</span>
                  </h4>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Unggah berkas JSON cadangan Anda yang sebelumnya telah diunduh untuk memulihkan seluruh data siswa dan riwayat nilai sistem.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 border ${
                      isLight 
                        ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200' 
                        : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
                    }`}
                  >
                    <Upload size={14} className={isImporting ? 'animate-pulse' : ''} />
                    <span>{isImporting ? 'Memproses Impor...' : 'Pilih & Impor Berkas JSON'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Import Status Alert */}
            {importStatus && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
                importStatus.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}>
                {importStatus.success ? (
                  <>
                    <Check size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider">Pemulihan Sukses</h5>
                      <p className="text-xs opacity-90 mt-0.5">
                        Berhasil memulihkan seluruh data siswa dan nilai dari berkas cadangan lokal! Antarmuka otomatis memuat data terbaru.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider">Kesalahan Impor</h5>
                      <p className="text-xs opacity-90 mt-0.5">
                        {importStatus.error}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
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

      {/* SECTION: EKSPOR DATA ADMINISTRATIF CABANG */}
      <div className={`p-6 rounded-2xl border shadow-sm space-y-6 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-2 border-b pb-3 ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`}>
          <FileDown size={16} className={getAccentTextClass()} />
          <span>Ekspor Data Administratif ({getBranchText()})</span>
        </h3>
        
        <p className="text-xs text-slate-500 leading-relaxed">
          Pilih dan unduh data administratif Math Fingers untuk keperluan dokumentasi, pencetakan fisik, atau analisis data eksternal. Semua data terikat pada cabang saat ini.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Data Siswa Aktif */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-slate-50/50 border-slate-200/60' : 'bg-slate-950/20 border-slate-800/50'
          }`}>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Data Siswa Aktif</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Data lengkap seluruh siswa bimbingan yang saat ini berstatus aktif ({students.filter(s => s.status !== 'alumni').length} siswa).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleExportSiswa('pdf')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' 
                    : 'bg-red-950/20 hover:bg-red-950/30 text-red-400 border-red-500/20'
                }`}
              >
                <FileText size={12} />
                <span>Unduh PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportSiswa('excel')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200' 
                    : 'bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <FileSpreadsheet size={12} />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          {/* Card 2: Data Alumni */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-slate-50/50 border-slate-200/60' : 'bg-slate-950/20 border-slate-800/50'
          }`}>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap size={16} className="text-indigo-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Data Alumni / Lulus</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Daftar alumni atau siswa yang telah menyelesaikan bimbingan jaritmatika ({students.filter(s => s.status === 'alumni').length} alumni).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleExportAlumni('pdf')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' 
                    : 'bg-red-950/20 hover:bg-red-950/30 text-red-400 border-red-500/20'
                }`}
              >
                <FileText size={12} />
                <span>Unduh PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportAlumni('excel')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200' 
                    : 'bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <FileSpreadsheet size={12} />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          {/* Card 3: Absensi / Kehadiran */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-slate-50/50 border-slate-200/60' : 'bg-slate-950/20 border-slate-800/50'
          }`}>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare size={16} className="text-sky-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Absensi Kehadiran</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Riwayat catatan kehadiran dan keterlambatan siswa harian dalam sesi bimbingan ({attendance.length} catatan).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleExportAbsensi('pdf')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' 
                    : 'bg-red-950/20 hover:bg-red-950/30 text-red-400 border-red-500/20'
                }`}
              >
                <FileText size={12} />
                <span>Unduh PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportAbsensi('excel')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200' 
                    : 'bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <FileSpreadsheet size={12} />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          {/* Card 4: Jurnal Guru */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-slate-50/50 border-slate-200/60' : 'bg-slate-950/20 border-slate-800/50'
          }`}>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <History size={16} className="text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Jurnal Harian Guru</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Catatan materi belajar, progres keterampilan gerak jari, dan jurnal kemajuan harian dari guru ({notes.length} jurnal).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleExportJurnalGuru('pdf')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' 
                    : 'bg-red-950/20 hover:bg-red-950/30 text-red-400 border-red-500/20'
                }`}
              >
                <FileText size={12} />
                <span>Unduh PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportJurnalGuru('excel')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200' 
                    : 'bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <FileSpreadsheet size={12} />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          {/* Card 5: Riwayat Pembayaran */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-slate-50/50 border-slate-200/60' : 'bg-slate-950/20 border-slate-800/50'
          }`}>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Receipt size={16} className="text-rose-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Riwayat Pembayaran SPP</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Rekap kuitansi pembayaran, status lunas, uang pendaftaran, tagihan buku, dan spp ({invoices.length} transaksi).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleExportRiwayatPembayaran('pdf')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' 
                    : 'bg-red-950/20 hover:bg-red-950/30 text-red-400 border-red-500/20'
                }`}
              >
                <FileText size={12} />
                <span>Unduh PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportRiwayatPembayaran('excel')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200' 
                    : 'bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <FileSpreadsheet size={12} />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          {/* Card 6: Nilai Evaluasi */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-slate-50/50 border-slate-200/60' : 'bg-slate-950/20 border-slate-800/50'
          }`}>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Award size={16} className="text-violet-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Nilai Kuis & Evaluasi</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Skor akurasi dan catatan kecepatan refleks berhitung jari (jaritmatika) siswa saat ujian ({grades.length} uji kuis).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleExportNilai('pdf')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' 
                    : 'bg-red-950/20 hover:bg-red-950/30 text-red-400 border-red-500/20'
                }`}
              >
                <FileText size={12} />
                <span>Unduh PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportNilai('excel')}
                className={`py-2 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5 border ${
                  isLight 
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200' 
                    : 'bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <FileSpreadsheet size={12} />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
