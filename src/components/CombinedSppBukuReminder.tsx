import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Invoice, AppSettings, Installment } from '../types';
import { formatRupiah, getWhatsAppLink } from '../utils';
import { CustomDropdown } from './CustomDropdown';
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  Search, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  BookOpen, 
  Receipt, 
  Users, 
  Sparkles, 
  RotateCcw, 
  Eye, 
  Phone, 
  CheckSquare, 
  Square, 
  Layers, 
  Download, 
  Printer, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  CreditCard,
  Plus,
  X,
  UserCheck,
  Filter
} from 'lucide-react';

export const DEFAULT_COMBINED_REMINDER_TEMPLATE = `Assalamu'alaikum Wr. Wb. Ibu/Bapak *{parentName}*,

Semoga Ibu/Bapak dan keluarga senantiasa dalam keadaan sehat dan penuh berkah.

Melalui pesan ini, kami dari pengelola Bimbingan Belajar *Math Fingers* ingin menginformasikan rekapitulasi tagihan ananda *{studentName}* (Kelas: {studentClass}):

━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *RINCIAN TAGIHAN GABUNGAN:*
━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ *SPP Math Fingers:*
{sppDetails}
   • Subtotal SPP: *{sppTotal}* ({sppStatus})

2️⃣ *Paket Buku Pegangan:*
{bukuDetails}
   • Subtotal Buku: *{bukuTotal}* ({bukuStatus})
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL KESELURUHAN: {grandTotal}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 *Jatuh Tempo:* {dueDate}

🏦 *Informasi Rekening Pembayaran:*
Bank {bankName}: *{bankAccountNo}*
Atas Nama: *{bankAccountHolder}*

Mohon konfirmasi dengan mengirimkan foto bukti transfer jika pembayaran telah dilakukan.
_(Abaikan pesan pengingat ini apabila telah melunasi. Terima kasih banyak atas kepercayaan dan kerja samanya!)_ 🙏✨

Salam Hangat,
*{teacherName}*
*Math Fingers - Easy Learning House*`;

export interface StudentCombinedBill {
  student: Student;
  sppInvoices: Invoice[];
  bukuInvoices: Invoice[];
  sppUnpaidInvoices: Invoice[];
  bukuUnpaidInvoices: Invoice[];
  sppUnpaidTotal: number;
  bukuUnpaidTotal: number;
  grandUnpaidTotal: number;
  hasUnpaidSpp: boolean;
  hasUnpaidBuku: boolean;
  hasBothUnpaid: boolean;
  isFullyPaid: boolean;
  nearestDueDate: string;
}

interface CombinedSppBukuReminderProps {
  students: Student[];
  invoices: Invoice[];
  settings: AppSettings;
  theme?: string;
  onCreateInvoice?: (data: Omit<Invoice, 'id' | 'invoiceNo' | 'createdAt'>) => Promise<void>;
  onCreateInvoicesBatch?: (data: Omit<Invoice, 'id' | 'invoiceNo' | 'createdAt'>[]) => Promise<void>;
  onUpdateInvoiceStatus?: (
    id: string, 
    status: 'paid' | 'unpaid' | 'partially_paid', 
    details?: { 
      paidAt?: string; 
      paymentMethod?: 'Transfer' | 'Tunai';
      amountPaid?: number;
      installments?: Installment[];
    }
  ) => Promise<void>;
}

export function CombinedSppBukuReminder({
  students,
  invoices,
  settings,
  theme = 'dark',
  onCreateInvoicesBatch
}: CombinedSppBukuReminderProps) {
  const isLight = theme === 'light';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'unpaid_any' | 'unpaid_both' | 'unpaid_spp_only' | 'unpaid_buku_only' | 'paid_all' | 'all'>('unpaid_any');
  
  // Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [combinedTemplate, setCombinedTemplate] = useState<string>(() => {
    return localStorage.getItem('spp_buku_reminder_template') || DEFAULT_COMBINED_REMINDER_TEMPLATE;
  });

  // Preview Modal
  const [previewStudentData, setPreviewStudentData] = useState<StudentCombinedBill | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Batch Sender Modal
  const [isBatchSenderOpen, setIsBatchSenderOpen] = useState(false);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [sentStudentIds, setSentStudentIds] = useState<Record<string, boolean>>({});

  // Quick Combined Invoice Modal
  const [isQuickInvoiceModalOpen, setIsQuickInvoiceModalOpen] = useState(false);
  const [quickSppAmount, setQuickSppAmount] = useState(settings.defaultSppAmount || 150000);
  const [quickSppMonth, setQuickSppMonth] = useState(() => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[new Date().getMonth()]} ${new Date().getFullYear()}`;
  });
  const [quickBukuAmount, setQuickBukuAmount] = useState(150000);
  const [quickBukuTitle, setQuickBukuTitle] = useState('Paket Buku Pegangan Siswa');
  const [quickDueDate, setQuickDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [isCreatingQuickInvoice, setIsCreatingQuickInvoice] = useState(false);

  // Active students only
  const activeStudents = useMemo(() => {
    return students.filter(s => s.status === 'active');
  }, [students]);

  // Aggregate combined billing data for each active student
  const studentBills: StudentCombinedBill[] = useMemo(() => {
    return activeStudents.map(student => {
      const studentInvoices = invoices.filter(inv => inv.studentId === student.id);
      
      const sppInvoices = studentInvoices.filter(inv => (inv.category || 'spp') === 'spp');
      const bukuInvoices = studentInvoices.filter(inv => inv.category === 'buku');

      const sppUnpaidInvoices = sppInvoices.filter(inv => inv.status !== 'paid');
      const bukuUnpaidInvoices = bukuInvoices.filter(inv => inv.status !== 'paid');

      const sppUnpaidTotal = sppUnpaidInvoices.reduce((sum, inv) => {
        const paid = inv.amountPaid || 0;
        return sum + (inv.status === 'partially_paid' ? (inv.amount - paid) : inv.amount);
      }, 0);

      const bukuUnpaidTotal = bukuUnpaidInvoices.reduce((sum, inv) => {
        const paid = inv.amountPaid || 0;
        return sum + (inv.status === 'partially_paid' ? (inv.amount - paid) : inv.amount);
      }, 0);

      const grandUnpaidTotal = sppUnpaidTotal + bukuUnpaidTotal;

      const hasUnpaidSpp = sppUnpaidInvoices.length > 0;
      const hasUnpaidBuku = bukuUnpaidInvoices.length > 0;
      const hasBothUnpaid = hasUnpaidSpp && hasUnpaidBuku;
      const isFullyPaid = !hasUnpaidSpp && !hasUnpaidBuku && (sppInvoices.length > 0 || bukuInvoices.length > 0);

      // Find nearest due date
      const allUnpaid = [...sppUnpaidInvoices, ...bukuUnpaidInvoices];
      const dueDates = allUnpaid.map(i => i.dueDate).filter(Boolean).sort();
      const nearestDueDate = dueDates[0] || new Date().toISOString().slice(0, 10);

      return {
        student,
        sppInvoices,
        bukuInvoices,
        sppUnpaidInvoices,
        bukuUnpaidInvoices,
        sppUnpaidTotal,
        bukuUnpaidTotal,
        grandUnpaidTotal,
        hasUnpaidSpp,
        hasUnpaidBuku,
        hasBothUnpaid,
        isFullyPaid,
        nearestDueDate
      };
    });
  }, [activeStudents, invoices]);

  // Available classes for filtering
  const availableClasses = useMemo(() => {
    const classesSet = new Set(activeStudents.map(s => s.kelas).filter(Boolean) as string[]);
    return Array.from(classesSet);
  }, [activeStudents]);

  // Filtered bills
  const filteredStudentBills = useMemo(() => {
    return studentBills.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        item.student.name.toLowerCase().includes(q) ||
        (item.student.parentName && item.student.parentName.toLowerCase().includes(q)) ||
        (item.student.parentPhone && item.student.parentPhone.includes(q)) ||
        (item.student.kelas && item.student.kelas.toLowerCase().includes(q)) ||
        (item.student.level && item.student.level.toLowerCase().includes(q));

      const matchesClass = classFilter === 'ALL' || item.student.kelas === classFilter;

      let matchesStatus = true;
      if (statusFilter === 'unpaid_any') {
        matchesStatus = item.hasUnpaidSpp || item.hasUnpaidBuku;
      } else if (statusFilter === 'unpaid_both') {
        matchesStatus = item.hasBothUnpaid;
      } else if (statusFilter === 'unpaid_spp_only') {
        matchesStatus = item.hasUnpaidSpp && !item.hasUnpaidBuku;
      } else if (statusFilter === 'unpaid_buku_only') {
        matchesStatus = item.hasUnpaidBuku && !item.hasUnpaidSpp;
      } else if (statusFilter === 'paid_all') {
        matchesStatus = item.isFullyPaid;
      } else if (statusFilter === 'all') {
        matchesStatus = true;
      }

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [studentBills, searchQuery, classFilter, statusFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalWithAnyDebt = studentBills.filter(b => b.hasUnpaidSpp || b.hasUnpaidBuku).length;
    const totalWithBothDebt = studentBills.filter(b => b.hasBothUnpaid).length;
    const totalSppDebtAmount = studentBills.reduce((acc, b) => acc + b.sppUnpaidTotal, 0);
    const totalBukuDebtAmount = studentBills.reduce((acc, b) => acc + b.bukuUnpaidTotal, 0);
    const grandDebtAmount = totalSppDebtAmount + totalBukuDebtAmount;
    const totalFullyPaid = studentBills.filter(b => b.isFullyPaid).length;

    return {
      totalWithAnyDebt,
      totalWithBothDebt,
      totalSppDebtAmount,
      totalBukuDebtAmount,
      grandDebtAmount,
      totalFullyPaid
    };
  }, [studentBills]);

  // Format message builder for a given student bill
  const buildCombinedMessage = (bill: StudentCombinedBill): string => {
    const { student, sppUnpaidInvoices, bukuUnpaidInvoices, sppUnpaidTotal, bukuUnpaidTotal, grandUnpaidTotal, nearestDueDate } = bill;
    
    // Build SPP breakdown lines
    let sppDetails = '';
    if (sppUnpaidInvoices.length === 0) {
      sppDetails = '   • (Lunas / Tidak ada tagihan)';
    } else {
      sppDetails = sppUnpaidInvoices.map((inv, idx) => {
        const remaining = inv.status === 'partially_paid' ? (inv.amount - (inv.amountPaid || 0)) : inv.amount;
        const partialTag = inv.status === 'partially_paid' ? ' [Dicicil]' : '';
        return `   • ${inv.month}: *${formatRupiah(remaining)}*${partialTag}`;
      }).join('\n');
    }

    // Build Buku breakdown lines
    let bukuDetails = '';
    if (bukuUnpaidInvoices.length === 0) {
      bukuDetails = '   • (Lunas / Tidak ada tagihan)';
    } else {
      bukuDetails = bukuUnpaidInvoices.map((inv, idx) => {
        const remaining = inv.status === 'partially_paid' ? (inv.amount - (inv.amountPaid || 0)) : inv.amount;
        const partialTag = inv.status === 'partially_paid' ? ' [Dicicil]' : '';
        return `   • ${inv.month}: *${formatRupiah(remaining)}*${partialTag}`;
      }).join('\n');
    }

    const sppStatus = sppUnpaidInvoices.length > 0 ? `${sppUnpaidInvoices.length} Tagihan Belum Lunas` : 'Lunas ✅';
    const bukuStatus = bukuUnpaidInvoices.length > 0 ? `${bukuUnpaidInvoices.length} Paket Belum Lunas` : 'Lunas ✅';

    return combinedTemplate
      .replace(/\{parentName\}/g, student.parentName || 'Wali Siswa')
      .replace(/\{studentName\}/g, student.name || 'Siswa')
      .replace(/\{studentClass\}/g, student.kelas || 'Reguler')
      .replace(/\{studentLevel\}/g, student.level || 'Dasar')
      .replace(/\{sppDetails\}/g, sppDetails)
      .replace(/\{sppTotal\}/g, formatRupiah(sppUnpaidTotal))
      .replace(/\{sppStatus\}/g, sppStatus)
      .replace(/\{bukuDetails\}/g, bukuDetails)
      .replace(/\{bukuTotal\}/g, formatRupiah(bukuUnpaidTotal))
      .replace(/\{bukuStatus\}/g, bukuStatus)
      .replace(/\{grandTotal\}/g, formatRupiah(grandUnpaidTotal))
      .replace(/\{dueDate\}/g, nearestDueDate || '-')
      .replace(/\{bankName\}/g, settings.bankName || 'BCA')
      .replace(/\{bankAccountNo\}/g, settings.bankAccountNo || '-')
      .replace(/\{bankAccountHolder\}/g, settings.bankAccountHolder || '-')
      .replace(/\{teacherName\}/g, settings.defaultTeacherName || 'Admin Math Fingers')
      .replace(/\{branchName\}/g, student.branch || 'Pusat');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendSingleWhatsApp = (bill: StudentCombinedBill) => {
    const msg = buildCombinedMessage(bill);
    const phone = bill.student.parentPhone || '';
    if (!phone) {
      alert(`Nomor WhatsApp wali siswa untuk ${bill.student.name} belum dicantumkan di data siswa.`);
      return;
    }
    const waLink = getWhatsAppLink(phone, msg);
    window.open(waLink, '_blank', 'noreferrer');

    setSentStudentIds(prev => ({ ...prev, [bill.student.id]: true }));
    showToast(`Membuka WhatsApp untuk wali dari ${bill.student.name}...`);
  };

  const handleCopyMessage = (bill: StudentCombinedBill) => {
    const msg = buildCombinedMessage(bill);
    navigator.clipboard.writeText(msg);
    showToast(`Pesan pengingat gabungan untuk ${bill.student.name} berhasil disalin!`);
  };

  const handleSaveTemplate = (newTpl: string) => {
    setCombinedTemplate(newTpl);
    localStorage.setItem('spp_buku_reminder_template', newTpl);
    showToast('Template pengingat gabungan berhasil disimpan!');
    setIsTemplateModalOpen(false);
  };

  const handleResetTemplate = () => {
    if (confirm('Kembalikan format kata-kata template ke standar Math Fingers?')) {
      setCombinedTemplate(DEFAULT_COMBINED_REMINDER_TEMPLATE);
      localStorage.setItem('spp_buku_reminder_template', DEFAULT_COMBINED_REMINDER_TEMPLATE);
      showToast('Template dikembalikan ke standar.');
    }
  };

  const insertTemplateToken = (token: string) => {
    setCombinedTemplate(prev => prev + ` ${token} `);
  };

  // Selection handlers
  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredStudentBills.map(b => b.student.id);
    setSelectedStudentIds(ids);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  // Selected student bills for batch operations
  const selectedBills = useMemo(() => {
    return studentBills.filter(b => selectedStudentIds.includes(b.student.id));
  }, [studentBills, selectedStudentIds]);

  // Start batch sender modal
  const handleOpenBatchSender = () => {
    if (selectedBills.length === 0) {
      alert('Pilih minimal 1 siswa untuk memulai pengiriman masal.');
      return;
    }
    setBatchCurrentIndex(0);
    setIsBatchSenderOpen(true);
  };

  // Copy Summary Recap (for teacher archive or group)
  const handleCopyRecapSummary = () => {
    const listToRecap = selectedBills.length > 0 ? selectedBills : filteredStudentBills;
    if (listToRecap.length === 0) {
      alert('Tidak ada data siswa untuk disalin.');
      return;
    }

    let summaryText = `*REKAPITULASI TAGIHAN GABUNGAN SPP & BUKU - MATH FINGERS*\n`;
    summaryText += `Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}\n`;
    summaryText += `Jumlah Siswa: ${listToRecap.length} Siswa\n`;
    summaryText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    listToRecap.forEach((b, idx) => {
      summaryText += `${idx + 1}. *${b.student.name}* (Kelas: ${b.student.kelas || '-'})\n`;
      summaryText += `   • SPP: ${formatRupiah(b.sppUnpaidTotal)} (${b.sppUnpaidInvoices.length} tagihan)\n`;
      summaryText += `   • Buku: ${formatRupiah(b.bukuUnpaidTotal)} (${b.bukuUnpaidInvoices.length} tagihan)\n`;
      summaryText += `   👉 *Total: ${formatRupiah(b.grandUnpaidTotal)}*\n`;
      summaryText += `   Wali: ${b.student.parentName || '-'} (${b.student.parentPhone || '-'})\n\n`;
    });

    const totalAll = listToRecap.reduce((sum, b) => sum + b.grandUnpaidTotal, 0);
    summaryText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    summaryText += `💰 *GRAND TOTAL SEMUA TAGIHAN: ${formatRupiah(totalAll)}*\n`;
    summaryText += `Rekening ${settings.bankName}: ${settings.bankAccountNo} a.n ${settings.bankAccountHolder}\n`;

    navigator.clipboard.writeText(summaryText);
    showToast(`Rekap ${listToRecap.length} siswa berhasil disalin ke clipboard!`);
  };

  // Create combined invoice batch
  const handleCreateCombinedInvoiceBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      alert('Pilih siswa terlebih dahulu.');
      return;
    }
    if (!onCreateInvoicesBatch) {
      alert('Fitur pembuatan batch invoice tidak didukung.');
      return;
    }

    try {
      setIsCreatingQuickInvoice(true);
      const invoicesToCreate: Omit<Invoice, 'id' | 'invoiceNo' | 'createdAt'>[] = [];

      selectedStudentIds.forEach(stId => {
        const student = students.find(s => s.id === stId);
        if (!student) return;

        // SPP Invoice
        if (quickSppAmount > 0) {
          invoicesToCreate.push({
            studentId: student.id,
            studentName: student.name,
            amount: quickSppAmount,
            month: quickSppMonth,
            dueDate: quickDueDate,
            status: 'unpaid',
            amountPaid: 0,
            installments: [],
            category: 'spp',
            branch: student.branch || settings.branch || 'Pusat'
          });
        }

        // Buku Invoice
        if (quickBukuAmount > 0) {
          invoicesToCreate.push({
            studentId: student.id,
            studentName: student.name,
            amount: quickBukuAmount,
            month: quickBukuTitle,
            dueDate: quickDueDate,
            status: 'unpaid',
            amountPaid: 0,
            installments: [],
            category: 'buku',
            branch: student.branch || settings.branch || 'Pusat'
          });
        }
      });

      await onCreateInvoicesBatch(invoicesToCreate);
      showToast(`Berhasil membuat ${invoicesToCreate.length} tagihan gabungan untuk ${selectedStudentIds.length} siswa!`);
      setIsQuickInvoiceModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat invoice gabungan.');
    } finally {
      setIsCreatingQuickInvoice(false);
    }
  };

  return (
    <div id="combined-spp-buku-reminder-view" className="space-y-6 animate-page-fade-in">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-[100] max-w-md p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 border border-emerald-400"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-100">WhatsApp Pengingat</p>
              <p className="text-sm font-bold text-white">{toastMessage}</p>
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Info & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={13} />
              <span>Pesan Otomatis WhatsApp</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              SPP + Buku Pegangan
            </span>
          </div>
          <h2 className={`text-2xl font-black mt-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>
            Pengingat WhatsApp Gabungan (SPP & Buku)
          </h2>
          <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-xs sm:text-sm mt-0.5 max-w-3xl`}>
            Kirim pengingat tagihan gabungan SPP bulanan dan paket buku langsung ke WhatsApp orang tua/wali siswa dalam 1 pesan terintegrasi yang rapi dan profesional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-extrabold transition shadow-xs cursor-pointer ${
              isLight 
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' 
                : 'bg-slate-900 border-slate-750 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles size={15} className="text-emerald-500" />
            <span>Format Pesan WA</span>
          </button>

          <button
            type="button"
            onClick={handleCopyRecapSummary}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-extrabold transition shadow-xs cursor-pointer ${
              isLight 
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' 
                : 'bg-slate-900 border-slate-750 text-slate-200 hover:bg-slate-800'
            }`}
            title="Salin rekap semua tagihan terpilih ke teks WhatsApp"
          >
            <Copy size={15} className="text-indigo-400" />
            <span>Salin Rekap Tagihan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedStudentIds.length === 0) {
                setSelectedStudentIds(activeStudents.map(s => s.id));
              }
              setIsQuickInvoiceModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Buat Tagihan SPP & Buku</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className={`p-4 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-slate-200/80 shadow-xs' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Perlu Diingatkan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500">
            {stats.totalWithAnyDebt} <span className="text-xs font-semibold text-slate-400">Siswa</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.totalWithBothDebt} siswa ada tagihan SPP & Buku sekaligus
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-slate-200/80 shadow-xs' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tunggakan SPP</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${isLight ? 'text-slate-800' : 'text-white'}`}>
            {formatRupiah(stats.totalSppDebtAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total akumulasi SPP belum terbayar
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-slate-200/80 shadow-xs' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tunggakan Buku</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
              <BookOpen size={16} />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${isLight ? 'text-slate-800' : 'text-white'}`}>
            {formatRupiah(stats.totalBukuDebtAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total paket buku belum lunas
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isLight ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-xs text-emerald-950' : 'bg-gradient-to-br from-emerald-950/40 to-teal-950/30 border-emerald-800/60 text-emerald-100'
        }`}>
          <div className="flex items-center justify-between opacity-80 mb-2">
            <span className="text-xs font-black uppercase tracking-wider">Grand Total Gabungan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatRupiah(stats.grandDebtAmount)}
          </div>
          <div className="text-[11px] opacity-80 mt-1">
            Total tagihan gabungan SPP & Buku
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className={`p-4 rounded-2xl shadow-sm border space-y-3 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row gap-3 items-center">
          {/* Search Input */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Cari nama siswa, nama wali, no WA, atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs sm:text-sm ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
              }`}
            />
          </div>

          {/* Class Filter */}
          <div className="w-full md:w-56">
            <CustomDropdown
              id="filter-class-combined"
              value={classFilter}
              onChange={(val) => setClassFilter(val)}
              options={[
                { value: 'ALL', label: 'Semua Kelas' },
                ...availableClasses.map(c => ({ value: c, label: c }))
              ]}
              theme={theme}
              className="w-full text-xs"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-64">
            <CustomDropdown
              id="filter-status-combined"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={[
                { value: 'unpaid_any', label: 'Ada Tagihan (SPP / Buku)' },
                { value: 'unpaid_both', label: 'Tagihan SPP & Buku Keduanya' },
                { value: 'unpaid_spp_only', label: 'Hanya Tagihan SPP' },
                { value: 'unpaid_buku_only', label: 'Hanya Tagihan Buku' },
                { value: 'paid_all', label: 'Sudah Lunas Keduanya' },
                { value: 'all', label: 'Semua Siswa Aktif' }
              ]}
              theme={theme}
              className="w-full text-xs"
            />
          </div>
        </div>

        {/* Quick Batch Selection Bar */}
        <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
          isLight ? 'border-slate-100' : 'border-slate-800/80'
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              disabled={filteredStudentBills.length === 0}
              className={`px-3 py-1.5 rounded-lg border font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
              }`}
            >
              <CheckSquare size={14} className="text-emerald-500" />
              <span>Pilih Semua Hasil ({filteredStudentBills.length})</span>
            </button>

            {selectedStudentIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold transition cursor-pointer"
                >
                  Batal Pilih ({selectedStudentIds.length})
                </button>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  {selectedStudentIds.length} siswa terpilih
                </span>
              </>
            )}
          </div>

          {selectedStudentIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenBatchSender}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Send size={14} />
                <span>Kirim WA Masal ({selectedStudentIds.length} Siswa)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Student Combined Bills Table */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {filteredStudentBills.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <MessageSquare size={44} className="mx-auto text-slate-600 mb-3" />
            <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">Tidak ada siswa ditemukan</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Tidak ada data siswa yang cocok dengan filter atau kata kunci pencarian yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-extrabold uppercase tracking-wider text-slate-500 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                }`}>
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.length > 0 && selectedStudentIds.length === filteredStudentBills.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAllFiltered();
                        } else {
                          handleClearSelection();
                        }
                      }}
                      className="rounded accent-emerald-500 cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="p-4">Siswa & Wali Murid</th>
                  <th className="p-4">Tagihan SPP</th>
                  <th className="p-4">Tagihan Buku</th>
                  <th className="p-4">Total Gabungan</th>
                  <th className="p-4">Status Tagihan</th>
                  <th className="p-4 text-center">Aksi Pengingat WhatsApp</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs sm:text-sm ${
                isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'
              }`}>
                {filteredStudentBills.map((bill) => {
                  const isSelected = selectedStudentIds.includes(bill.student.id);
                  const isExpanded = expandedStudentId === bill.student.id;
                  const isSent = sentStudentIds[bill.student.id];

                  return (
                    <React.Fragment key={bill.student.id}>
                      <tr className={`transition ${
                        isSelected 
                          ? (isLight ? 'bg-emerald-50/70' : 'bg-emerald-950/20') 
                          : (isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-850/30')
                      }`}>
                        {/* Checkbox */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(bill.student.id)}
                            className="rounded accent-emerald-500 cursor-pointer w-4 h-4"
                          />
                        </td>

                        {/* Student and Parent Info */}
                        <td className="p-4">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                              {bill.student.name ? bill.student.name.substring(0, 2).toUpperCase() : 'ST'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-extrabold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                  {bill.student.name}
                                </span>
                                {isSent && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                                    <Check size={10} /> Terkirim
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-x-2 items-center">
                                <span>Wali: <strong className="text-slate-700 dark:text-slate-200">{bill.student.parentName || '-'}</strong></span>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <Phone size={11} />
                                  {bill.student.parentPhone || 'No WA Kosong'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Kelas: <strong className="text-slate-600 dark:text-slate-300">{bill.student.kelas || '-'}</strong> • Level: {bill.student.level ? bill.student.level.split(':')[0] : '-'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* SPP Breakdown */}
                        <td className="p-4">
                          {bill.sppUnpaidInvoices.length > 0 ? (
                            <div>
                              <div className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                                {formatRupiah(bill.sppUnpaidTotal)}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {bill.sppUnpaidInvoices.length} tagihan ({bill.sppUnpaidInvoices.map(i => i.month).join(', ')})
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              <CheckCircle size={12} />
                              <span>Lunas</span>
                            </div>
                          )}
                        </td>

                        {/* Buku Breakdown */}
                        <td className="p-4">
                          {bill.bukuUnpaidInvoices.length > 0 ? (
                            <div>
                              <div className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                                {formatRupiah(bill.bukuUnpaidTotal)}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {bill.bukuUnpaidInvoices.length} paket ({bill.bukuUnpaidInvoices.map(i => i.month).join(', ')})
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              <CheckCircle size={12} />
                              <span>Lunas / Bebas</span>
                            </div>
                          )}
                        </td>

                        {/* Grand Total */}
                        <td className="p-4 font-mono font-black text-sm">
                          {bill.grandUnpaidTotal > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(bill.grandUnpaidTotal)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">Rp 0 (Lunas)</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="p-4">
                          {bill.hasBothUnpaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <Clock size={11} />
                              <span>SPP & Buku Belum Lunas</span>
                            </span>
                          ) : bill.hasUnpaidSpp ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              <Receipt size={11} />
                              <span>SPP Belum Lunas</span>
                            </span>
                          ) : bill.hasUnpaidBuku ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                              <BookOpen size={11} />
                              <span>Buku Belum Lunas</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle size={11} />
                              <span>Lunas Semua</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Send WhatsApp Button */}
                            <button
                              type="button"
                              onClick={() => handleSendSingleWhatsApp(bill)}
                              disabled={!bill.student.parentPhone}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Buka WhatsApp & Kirim Pesan Gabungan"
                            >
                              <Send size={13} />
                              <span>Kirim WA</span>
                            </button>

                            {/* Preview Message */}
                            <button
                              type="button"
                              onClick={() => setPreviewStudentData(bill)}
                              className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                              title="Pratinjau Pesan WA"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Copy Message */}
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(bill)}
                              className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                              title="Salin Teks Pesan"
                            >
                              <Copy size={15} />
                            </button>

                            {/* Toggle Invoice Details */}
                            <button
                              type="button"
                              onClick={() => setExpandedStudentId(isExpanded ? null : bill.student.id)}
                              className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                                isExpanded ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                              title="Lihat Rincian Invoice"
                            >
                              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Invoice List per Student */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className={`p-4 ${isLight ? 'bg-slate-50/90 border-y border-slate-200' : 'bg-slate-950/70 border-y border-slate-850'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* SPP Invoices List */}
                              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-extrabold text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                    <Receipt size={14} />
                                    <span>Riwayat Tagihan SPP ({bill.sppInvoices.length})</span>
                                  </span>
                                  <span className="text-xs font-mono font-bold">
                                    Belum Lunas: {formatRupiah(bill.sppUnpaidTotal)}
                                  </span>
                                </div>
                                {bill.sppInvoices.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">Belum ada tagihan SPP.</p>
                                ) : (
                                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {bill.sppInvoices.map(inv => (
                                      <div key={inv.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800/50">
                                        <div>
                                          <span className="font-semibold">{inv.month}</span>
                                          <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({inv.invoiceNo})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold">{formatRupiah(inv.amount)}</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${
                                            inv.status === 'paid' ? 'bg-emerald-500/15 text-emerald-500' : inv.status === 'partially_paid' ? 'bg-blue-500/15 text-blue-500' : 'bg-rose-500/15 text-rose-500'
                                          }`}>
                                            {inv.status === 'paid' ? 'LUNAS' : inv.status === 'partially_paid' ? 'DICICIL' : 'BELUM'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Buku Invoices List */}
                              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-extrabold text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                    <BookOpen size={14} />
                                    <span>Riwayat Tagihan Paket Buku ({bill.bukuInvoices.length})</span>
                                  </span>
                                  <span className="text-xs font-mono font-bold">
                                    Belum Lunas: {formatRupiah(bill.bukuUnpaidTotal)}
                                  </span>
                                </div>
                                {bill.bukuInvoices.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">Belum ada tagihan buku.</p>
                                ) : (
                                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {bill.bukuInvoices.map(inv => (
                                      <div key={inv.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 dark:border-slate-800/50">
                                        <div>
                                          <span className="font-semibold">{inv.month}</span>
                                          <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({inv.invoiceNo})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold">{formatRupiah(inv.amount)}</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${
                                            inv.status === 'paid' ? 'bg-emerald-500/15 text-emerald-500' : inv.status === 'partially_paid' ? 'bg-blue-500/15 text-blue-500' : 'bg-rose-500/15 text-rose-500'
                                          }`}>
                                            {inv.status === 'paid' ? 'LUNAS' : inv.status === 'partially_paid' ? 'DICICIL' : 'BELUM'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: PREVIEW PESAN WHATSAPP GABUNGAN */}
      {previewStudentData && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`rounded-3xl w-full max-w-xl shadow-2xl border my-auto overflow-hidden animate-page-fade-in ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-850 text-white'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-850'}`}>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                  <MessageSquare className="text-emerald-500" size={20} />
                  <span>Pratinjau Pesan Pengingat SPP & Buku</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kepada: <strong>{previewStudentData.student.parentName || 'Wali'}</strong> ({previewStudentData.student.name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStudentData(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Format Teks WhatsApp:</span>
                <span className="font-mono text-emerald-500 font-bold">
                  {previewStudentData.student.parentPhone || 'Tanpa No WhatsApp'}
                </span>
              </div>

              <div className={`p-4 rounded-2xl font-mono text-xs leading-relaxed border whitespace-pre-wrap ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-slate-200'
              }`}>
                {buildCombinedMessage(previewStudentData)}
              </div>
            </div>

            <div className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-850'
            }`}>
              <button
                type="button"
                onClick={() => setPreviewStudentData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyMessage(previewStudentData)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Copy size={14} />
                  <span>Salin Teks</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSendSingleWhatsApp(previewStudentData);
                    setPreviewStudentData(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Kirim ke WhatsApp Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOM TEMPLATE WHATSAPP GABUNGAN */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`rounded-3xl w-full max-w-2xl shadow-2xl border my-auto overflow-hidden animate-page-fade-in ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-850 text-white'
          }`}>
            <div className={`p-5 sm:p-6 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-850'}`}>
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Sparkles className="text-emerald-500" size={20} />
                  <span>Kustomisasi Format Pesan WhatsApp Gabungan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atur susunan kata dan tag variabel otomatis untuk pengingat SPP + Buku
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Token Chips */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-2">
                  Klik Variabel Otomatis untuk Menyisipkan ke Template:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: '{parentName}', label: 'Nama Wali' },
                    { tag: '{studentName}', label: 'Nama Siswa' },
                    { tag: '{studentClass}', label: 'Kelas' },
                    { tag: '{studentLevel}', label: 'Level' },
                    { tag: '{sppDetails}', label: 'Rincian SPP' },
                    { tag: '{sppTotal}', label: 'Subtotal SPP' },
                    { tag: '{sppStatus}', label: 'Status SPP' },
                    { tag: '{bukuDetails}', label: 'Rincian Buku' },
                    { tag: '{bukuTotal}', label: 'Subtotal Buku' },
                    { tag: '{bukuStatus}', label: 'Status Buku' },
                    { tag: '{grandTotal}', label: 'Total Keseluruhan' },
                    { tag: '{dueDate}', label: 'Jatuh Tempo' },
                    { tag: '{bankName}', label: 'Nama Bank' },
                    { tag: '{bankAccountNo}', label: 'No Rekening' },
                    { tag: '{bankAccountHolder}', label: 'Atas Nama' },
                    { tag: '{teacherName}', label: 'Nama Guru/Admin' },
                    { tag: '{branchName}', label: 'Cabang' },
                  ].map(ph => (
                    <button
                      key={ph.tag}
                      type="button"
                      onClick={() => insertTemplateToken(ph.tag)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 border cursor-pointer ${
                        isLight 
                          ? 'bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 border-slate-200' 
                          : 'bg-slate-800 hover:bg-emerald-950/60 hover:border-emerald-500/50 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span className="text-emerald-500 font-black">+</span>
                      <span>{ph.tag}</span>
                      <span className="text-[10px] text-slate-400">({ph.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    Template Pesan WhatsApp:
                  </label>
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reset ke Standar</span>
                  </button>
                </div>

                <textarea
                  rows={11}
                  value={combinedTemplate}
                  onChange={(e) => setCombinedTemplate(e.target.value)}
                  className={`w-full p-4 rounded-2xl font-mono text-xs leading-relaxed border transition focus:outline-hidden ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 focus:border-emerald-500'
                      : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-emerald-500'
                  }`}
                  placeholder="Tuliskan template kata-kata pengingat gabungan di sini..."
                />
              </div>

              {/* Sample Preview */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1.5">
                  Simulasi Tampilan Pesan WhatsApp (Data Sampel):
                </label>
                <div className={`p-4 rounded-2xl font-mono text-xs leading-relaxed border whitespace-pre-wrap ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-slate-200'
                }`}>
                  {buildCombinedMessage(studentBills[0] || {
                    student: {
                      id: 'sample',
                      name: 'Ahmad Faiz',
                      parentName: 'Ibu Rahmawati',
                      parentPhone: '081234567890',
                      status: 'active',
                      level: 'Level 1: Basic',
                      kelas: 'Kelas Reguler A',
                      branch: 'Pusat',
                      joinDate: '2026-01-01',
                      createdAt: Date.now()
                    },
                    sppInvoices: [],
                    bukuInvoices: [],
                    sppUnpaidInvoices: [
                      {
                        id: 'spp-1',
                        invoiceNo: 'INV/202608/001',
                        studentId: 'sample',
                        studentName: 'Ahmad Faiz',
                        amount: 150000,
                        month: 'Agustus 2026',
                        dueDate: '2026-08-15',
                        status: 'unpaid',
                        category: 'spp',
                        createdAt: Date.now()
                      }
                    ],
                    bukuUnpaidInvoices: [
                      {
                        id: 'bk-1',
                        invoiceNo: 'INV/202608/BK-001',
                        studentId: 'sample',
                        studentName: 'Ahmad Faiz',
                        amount: 150000,
                        month: 'Paket Buku Level 1',
                        dueDate: '2026-08-15',
                        status: 'unpaid',
                        category: 'buku',
                        createdAt: Date.now()
                      }
                    ],
                    sppUnpaidTotal: 150000,
                    bukuUnpaidTotal: 150000,
                    grandUnpaidTotal: 300000,
                    hasUnpaidSpp: true,
                    hasUnpaidBuku: true,
                    hasBothUnpaid: true,
                    isFullyPaid: false,
                    nearestDueDate: '2026-08-15'
                  })}
                </div>
              </div>
            </div>

            <div className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-850'
            }`}>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => handleSaveTemplate(combinedTemplate)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={16} />
                <span>Simpan Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BATCH WHATSAPP SENDER STEPPER */}
      {isBatchSenderOpen && selectedBills.length > 0 && (() => {
        const currentBill = selectedBills[batchCurrentIndex] || selectedBills[0];
        const isCurrentSent = sentStudentIds[currentBill.student.id];

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className={`rounded-3xl w-full max-w-xl shadow-2xl border my-auto overflow-hidden animate-page-fade-in ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-850 text-white'
            }`}>
              {/* Header */}
              <div className={`p-5 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-850'}`}>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase">
                    PENGIRIMAN MASAL WHATSAPP ({batchCurrentIndex + 1} DARI {selectedBills.length})
                  </span>
                  <h3 className="font-extrabold text-base sm:text-lg mt-0.5">
                    {currentBill.student.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBatchSenderOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-1.5">
                <div 
                  className="bg-emerald-500 h-1.5 transition-all duration-300"
                  style={{ width: `${((batchCurrentIndex + 1) / selectedBills.length) * 100}%` }}
                />
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'
                }`}>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold">Wali Murid:</div>
                    <div className="font-extrabold text-sm">{currentBill.student.parentName || 'Wali'}</div>
                    <div className="text-xs font-mono text-emerald-500 mt-0.5">
                      {currentBill.student.parentPhone || 'Tanpa No HP'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-semibold">Total Tagihan:</div>
                    <div className="font-mono font-black text-base text-rose-500">
                      {formatRupiah(currentBill.grandUnpaidTotal)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      SPP: {formatRupiah(currentBill.sppUnpaidTotal)} • Buku: {formatRupiah(currentBill.bukuUnpaidTotal)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="font-bold text-slate-400">Isi Pesan WhatsApp yang Dikirim:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(currentBill)}
                      className="text-emerald-500 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Salin Teks</span>
                    </button>
                  </div>
                  <div className={`p-4 rounded-2xl font-mono text-xs leading-relaxed border whitespace-pre-wrap max-h-56 overflow-y-auto ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-slate-200'
                  }`}>
                    {buildCombinedMessage(currentBill)}
                  </div>
                </div>
              </div>

              {/* Footer Stepper */}
              <div className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-850'
              }`}>
                <button
                  type="button"
                  disabled={batchCurrentIndex === 0}
                  onClick={() => setBatchCurrentIndex(prev => Math.max(0, prev - 1))}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  ← Siswa Sebelumnya
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendSingleWhatsApp(currentBill)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Kirim WA Siswa Ini</span>
                  </button>

                  {batchCurrentIndex < selectedBills.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setBatchCurrentIndex(prev => prev + 1)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold border transition flex items-center gap-1 cursor-pointer ${
                        isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                      }`}
                    >
                      <span>Lanjut ({batchCurrentIndex + 2}/{selectedBills.length})</span>
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsBatchSenderOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Selesai
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: QUICK COMBINED INVOICE GENERATOR */}
      {isQuickInvoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`rounded-3xl w-full max-w-xl shadow-2xl border my-auto overflow-hidden animate-page-fade-in ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-850 text-white'
          }`}>
            <div className={`p-5 sm:p-6 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-850'}`}>
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Plus className="text-emerald-500" size={20} />
                  <span>Terbitkan Tagihan SPP & Buku Sekaligus</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Buat invoice SPP bulanan dan paket buku sekaligus untuk <strong>{selectedStudentIds.length}</strong> siswa terpilih
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickInvoiceModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCombinedInvoiceBatch} className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* SPP Section */}
              <div className={`p-4 rounded-2xl border ${isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
                <h4 className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Receipt size={15} />
                  <span>Tagihan 1: SPP Bulanan</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Periode Bulan SPP</label>
                    <input
                      type="text"
                      required
                      value={quickSppMonth}
                      onChange={(e) => setQuickSppMonth(e.target.value)}
                      placeholder="Misal: Agustus 2026"
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold ${
                        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-750 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Nominal SPP (Rp)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={quickSppAmount}
                      onChange={(e) => setQuickSppAmount(Number(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold ${
                        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-750 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Buku Section */}
              <div className={`p-4 rounded-2xl border ${isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-blue-950/20 border-blue-800/40'}`}>
                <h4 className="font-extrabold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen size={15} />
                  <span>Tagihan 2: Paket Buku Pegangan</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Keterangan Buku</label>
                    <input
                      type="text"
                      required
                      value={quickBukuTitle}
                      onChange={(e) => setQuickBukuTitle(e.target.value)}
                      placeholder="Misal: Paket Buku Pegangan Siswa"
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold ${
                        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-750 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Nominal Buku (Rp)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={quickBukuAmount}
                      onChange={(e) => setQuickBukuAmount(Number(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold ${
                        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-750 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Due Date & Total */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Jatuh Tempo *</label>
                  <input
                    type="date"
                    required
                    value={quickDueDate}
                    onChange={(e) => setQuickDueDate(e.target.value)}
                    className={`w-full px-3.5 py-2 border rounded-xl text-xs font-semibold ${
                      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-750 text-white'
                    }`}
                  />
                </div>
                <div className={`p-3 rounded-xl border flex flex-col justify-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  <span className="text-[11px] text-slate-400 font-semibold">Total per Siswa:</span>
                  <span className="text-base font-black font-mono text-emerald-500">
                    {formatRupiah(quickSppAmount + quickBukuAmount)}
                  </span>
                </div>
              </div>

              <div className={`pt-4 border-t flex items-center justify-between gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsQuickInvoiceModalOpen(false)}
                  disabled={isCreatingQuickInvoice}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isCreatingQuickInvoice || selectedStudentIds.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingQuickInvoice ? (
                    <span>Menerbitkan...</span>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Terbitkan Tagihan ({selectedStudentIds.length} Siswa)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
