import React, { useState } from 'react';
import { Student, Invoice, AppSettings } from '../types';
import { formatRupiah, getWhatsAppLink } from '../utils';
import { 
  Receipt, 
  Plus, 
  Search, 
  Calendar, 
  Landmark, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Send, 
  CreditCard,
  Download,
  AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface SppInvoiceManagerProps {
  students: Student[];
  invoices: Invoice[];
  settings: AppSettings;
  onCreateInvoice: (data: Omit<Invoice, 'id' | 'invoiceNo' | 'createdAt'>) => Promise<void>;
  onUpdateInvoiceStatus: (id: string, status: 'paid' | 'unpaid', details?: { paidAt: string; paymentMethod: 'Transfer' | 'Tunai' }) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  theme?: string;
}

export function SppInvoiceManager({ 
  students, 
  invoices, 
  settings,
  onCreateInvoice, 
  onUpdateInvoiceStatus, 
  onDeleteInvoice,
  theme = 'dark'
}: SppInvoiceManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Payment confirmation states
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Transfer' | 'Tunai'>('Transfer');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));

  // Invoice creator form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState(settings.defaultSppAmount); // default SPP
  const [month, setMonth] = useState('');
  const [dueDate, setDueDate] = useState('');

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const currentYear = new Date().getFullYear();

  const activeStudents = students.filter(s => s.status === 'active');

  const handleOpenForm = () => {
    setSelectedStudentId(activeStudents[0]?.id || '');
    setAmount(settings.defaultSppAmount);
    
    // Set default month to current month + year
    const curMonthName = months[new Date().getMonth()];
    setMonth(`${curMonthName} ${currentYear}`);
    
    // Set default due date to 10th of next month or 10th of this month
    const nextDue = new Date();
    nextDue.setDate(10);
    setDueDate(nextDue.toISOString().slice(0, 10));

    setIsFormOpen(true);
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !month || !dueDate) {
      alert('Mohon lengkapi semua data!');
      return;
    }

    const studentObj = students.find(s => s.id === selectedStudentId);
    if (!studentObj) return;

    await onCreateInvoice({
      studentId: selectedStudentId,
      studentName: studentObj.name,
      amount,
      month,
      dueDate,
      status: 'unpaid'
    });

    setIsFormOpen(false);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoiceId) return;

    await onUpdateInvoiceStatus(payingInvoiceId, 'paid', {
      paidAt,
      paymentMethod
    });

    setPayingInvoiceId(null);
  };

  const handleDelete = async (id: string, invoiceNo: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus tagihan ${invoiceNo}?`)) {
      await onDeleteInvoice(id);
    }
  };

  const sendInvoiceWhatsApp = (invoice: Invoice) => {
    const student = students.find(s => s.id === invoice.studentId);
    if (!student) return;

    let message = '';
    if (invoice.status === 'unpaid') {
      message = `Halo Ibu/Bapak *${student.parentName}*,\n\nSemoga sehat selalu. Kami menginfokan *Invoice SPP bimbingan Les Privat Math Fingers* ananda *${student.name}* untuk periode *${invoice.month}*:\n\n🧾 No Invoice: ${invoice.invoiceNo}\n💵 Jumlah Tagihan: *${formatRupiah(invoice.amount)}*\n📅 Tanggal Jatuh Tempo: ${invoice.dueDate}\n\n*Informasi Rekening Pembayaran:*\n🏦 Bank ${settings.bankName}: *${settings.bankAccountNo}*\n👤 Atas Nama: *${settings.bankAccountHolder}*\n\n_(Mohon kirimkan konfirmasi berupa foto bukti transfer jika pembayaran telah dilakukan. Terima kasih!_ 🙏🌸)\n\n*Math Fingers* - Berhitung Cepat & Akurat Tanpa Alat! ✨`;
    } else {
      message = `Halo Ibu/Bapak *${student.parentName}*,\n\nTerima kasih! Kami telah menerima pembayaran SPP Les Privat *Math Fingers* ananda *${student.name}* periode *${invoice.month}*. Berikut kuitansi tanda terima digital:\n\n🧾 No Invoice: ${invoice.invoiceNo}\n💵 Jumlah Pembayaran: *${formatRupiah(invoice.amount)}*\n📅 Tanggal Bayar: ${invoice.paidAt || '-'}\n💳 Metode Pembayaran: *${invoice.paymentMethod || 'Transfer'}*\n📌 Status: *LUNAS (PAID)* ✅\n\nTerima kasih banyak atas dukungannya. Mari terus dukung motivasi belajar matematika ananda! ⚡\n\nSalam Hangat,\n*${settings.defaultTeacherName}*`;
    }

    const waLink = getWhatsAppLink(student.parentPhone, message);
    window.open(waLink, '_blank', 'noreferrer');
  };

// Helper to convert number to Indonesian words (Terbilang)
function angkaKeTerbilang(nominal: number): string {
  const words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  if (nominal < 12) return words[nominal];
  if (nominal < 20) return angkaKeTerbilang(nominal - 10) + " Belas";
  if (nominal < 100) return angkaKeTerbilang(Math.floor(nominal / 10)) + " Puluh " + angkaKeTerbilang(nominal % 10);
  if (nominal < 200) return "Seratus " + angkaKeTerbilang(nominal - 100);
  if (nominal < 1000) return angkaKeTerbilang(Math.floor(nominal / 100)) + " Ratus " + angkaKeTerbilang(nominal % 100);
  if (nominal < 2000) return "Seribu " + angkaKeTerbilang(nominal - 1000);
  if (nominal < 1000000) return angkaKeTerbilang(Math.floor(nominal / 1000)) + " Ribu " + angkaKeTerbilang(nominal % 1000);
  if (nominal < 1000000000) return angkaKeTerbilang(Math.floor(nominal / 1000000)) + " Juta " + angkaKeTerbilang(nominal % 1000000);
  return nominal.toString();
}

  // jsPDF Receipt Invoice function
  const downloadInvoicePDF = (invoice: Invoice) => {
    const student = students.find(s => s.id === invoice.studentId);
    
    // Landscape A5 dimensions: width 210mm, height 148mm
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5'
    });
    
    // Background card border & padding lines
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(1);
    doc.rect(8, 8, 194, 132); // Outer border frame
    
    doc.setDrawColor(5, 150, 105); // Emerald-600 inner border frame
    doc.setLineWidth(0.3);
    doc.rect(9.5, 9.5, 191, 129);

    // Decorative pastel dots/stars
    doc.setFillColor(254, 252, 233); // Soft yellow
    doc.circle(15, 15, 18, 'F');
    doc.setFillColor(236, 253, 245); // Soft green
    doc.circle(195, 15, 15, 'F');
    doc.setFillColor(254, 243, 199); // Amber
    doc.circle(20, 130, 12, 'F');

    // 1. TOP LEFT: MATH FINGERS BRANDING
    const brandX = 14;
    const brandY = 16;
    
    // Tiny cute hand drawing
    doc.setFillColor(5, 150, 105); // Emerald
    doc.circle(brandX + 5, brandY + 6, 3.5, 'F'); // palm
    doc.rect(brandX + 4.2, brandY + 8.5, 1.6, 2, 'F'); // wrist
    // Fingers
    doc.setFillColor(245, 158, 11); // Amber
    doc.rect(brandX + 1, brandY + 4, 1.2, 3, 'F'); // thumb
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(brandX + 3, brandY + 1.5, 1.2, 4.5, 'F'); // index
    doc.setFillColor(239, 68, 68); // Red
    doc.rect(brandX + 5, brandY + 0.5, 1.2, 5.5, 'F'); // middle
    doc.setFillColor(139, 92, 246); // Purple
    doc.rect(brandX + 7, brandY + 1.5, 1.2, 4.5, 'F'); // ring
    doc.setFillColor(249, 115, 22); // Orange
    doc.rect(brandX + 9, brandY + 3, 1.2, 3, 'F'); // pinky

    // Brand Titles
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text("MATH FINGERS", brandX + 13, brandY + 5);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text("Easy Learning House • Berhitung Cepat", brandX + 13, brandY + 9);

    // 2. TOP MIDDLE: KUITANSI TITLE
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105);
    doc.text("KUITANSI", 105, 19, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(245, 158, 11); // Amber-500
    doc.text("TANDA TERIMA RESMI SPP", 105, 23.5, { align: 'center' });

    // 3. TOP RIGHT: INVOICE META BOX
    const metaX = 148;
    const metaY = 13;
    const metaW = 48;
    const metaH = 14;
    
    doc.setFillColor(248, 250, 252); // Slate-50 light background
    doc.setDrawColor(226, 232, 240); // Slate-200 border
    doc.setLineWidth(0.4);
    doc.rect(metaX, metaY, metaW, metaH, 'FD');
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("No. Kuitansi :", metaX + 3, metaY + 5);
    doc.setFont("Courier", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(invoice.invoiceNo, metaX + 19, metaY + 5.2);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Tanggal       :", metaX + 3, metaY + 10);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const dateToPrint = invoice.paidAt || invoice.dueDate || new Date().toISOString().slice(0, 10);
    doc.text(dateToPrint, metaX + 19, metaY + 10);

    // Horizontal separator line under header
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(12, 31, 198, 31);

    // 4. MAIN RECEIPT CONTENT
    const contentY = 38;
    const labelX = 14;
    const valueX = 52;
    
    // Rows heights
    const r1 = contentY;
    const r2 = contentY + 9;
    const r3 = contentY + 18;
    const r4 = contentY + 27;

    // Telah Diterima Dari
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Telah Diterima Dari", labelX, r1);
    doc.text(":", valueX - 4, r1);
    
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    const parentNameVal = student ? student.parentName : '-';
    doc.text(`Ibu / Bapak ${parentNameVal}`, valueX, r1);
    
    doc.setDrawColor(241, 245, 249); // Clean slate-100 line
    doc.setLineWidth(0.3);
    doc.line(valueX, r1 + 1.5, 196, r1 + 1.5);

    // Nama Siswa / Kelas
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Untuk Nama Siswa", labelX, r2);
    doc.text(":", valueX - 4, r2);
    
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    const genderSuffix = student?.jenisKelamin ? ` (${student.jenisKelamin === 'Laki-laki' ? 'L' : 'P'})` : '';
    const packageText = student?.jenisPaket ? ` • Paket ${student.jenisPaket}` : ' • Paket Reguler';
    const levelText = student?.level ? ` • ${student.level}` : '';
    doc.text(`${invoice.studentName}${genderSuffix}${packageText}${levelText}`, valueX, r2);
    doc.line(valueX, r2 + 1.5, 196, r2 + 1.5);

    // Untuk Pembayaran
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Guna Membayar", labelX, r3);
    doc.text(":", valueX - 4, r3);
    
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(5, 150, 105); // Accent color
    doc.text(`Iuran Bulanan (SPP) Periode ${invoice.month}`, valueX, r3);
    doc.line(valueX, r3 + 1.5, 196, r3 + 1.5);

    // Terbilang Uang Band
    doc.setFillColor(240, 253, 250); // Emerald-50 light green band
    doc.rect(labelX, r4, 182, 10, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105);
    doc.text("Uang Sejumlah", labelX + 3, r4 + 6.5);
    doc.text(":", valueX - 4, r4 + 6.5);
    
    doc.setFont("Helvetica", "bolditalic");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 118, 110); // Teal-800
    const amountInWords = `### ${angkaKeTerbilang(invoice.amount)} Rupiah ###`;
    doc.text(amountInWords, valueX, r4 + 6.5);

    // 5. FOOTER SECTION
    const footerY = 90;
    
    // Amount display box (Left bottom)
    doc.setFillColor(5, 150, 105); // Deep emerald solid background
    doc.rect(labelX, footerY, 68, 14, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255); // White font
    const formattedAmount = `Rp ${invoice.amount.toLocaleString('id-ID')},-`;
    doc.text(formattedAmount, labelX + 34, footerY + 9.5, { align: 'center' });
    
    // Info details below Amount Box
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    const payMethodText = invoice.paymentMethod ? `Metode Pembayaran: ${invoice.paymentMethod}` : 'Metode Pembayaran: Lunas';
    doc.text(payMethodText, labelX, footerY + 19);

    // Motto middle
    const mottoX = 114;
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('"Berhitung Cepat & Akurat Tanpa Alat"', mottoX, footerY + 6, { align: 'center' });
    
    // Little hand icon decoration in middle
    doc.setFillColor(209, 250, 229); // Emerald-100
    doc.circle(mottoX, footerY - 2, 2, 'F');

    // Right bottom: Signature
    const signX = 168;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Penerima,", signX, footerY, { align: 'center' });
    
    // Signature underline line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(signX - 20, footerY + 15, signX + 20, footerY + 15);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(settings.defaultTeacherName, signX, footerY + 19, { align: 'center' });

    doc.save(`Receipt_SPP_${invoice.invoiceNo.replace(/\//g, '_')}.pdf`);
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          invoice.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          invoice.month.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isLight = theme === 'light';

  const getAccentBgClass = () => {
    switch (settings.accentColor) {
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-500';
      case 'violet': return 'bg-violet-600 hover:bg-violet-500';
      case 'amber': return 'bg-amber-600 hover:bg-amber-500 text-slate-900';
      case 'rose': return 'bg-rose-600 hover:bg-rose-500';
      case 'sky': return 'bg-sky-600 hover:bg-sky-500 text-slate-900';
      case 'emerald':
      default: return 'bg-emerald-600 hover:bg-emerald-500';
    }
  };

  const getAccentTextClass = () => {
    switch (settings.accentColor) {
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
    switch (settings.accentColor) {
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
    <div id="spp-invoice-manager-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>SPP & Invoice Manajemen</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Terbitkan tagihan SPP bulanan, catat pembayaran lunas, dan ekspor kuitansi PDF serta kirim via WhatsApp.</p>
        </div>
        
        <button
          id="btn-create-invoice"
          onClick={handleOpenForm}
          className={`flex items-center justify-center gap-2 ${getAccentBgClass()} text-white font-medium px-4 py-2.5 rounded-xl transition duration-150 shadow-sm`}
        >
          <Receipt size={18} />
          <span>Buat Invoice Baru</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className={`p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-4 items-center ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
          <input
            id="invoice-search-input"
            type="text"
            placeholder="Cari nama siswa, nomor invoice, atau periode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm placeholder:text-slate-550 ${
              isLight 
                ? 'bg-slate-50 border-slate-200 text-slate-800' 
                : 'bg-slate-950/40 border-slate-800 text-white'
            }`}
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            id="filter-invoice-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700' 
                : 'bg-slate-950/40 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Semua Pembayaran</option>
            <option value="unpaid" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Belum Lunas</option>
            <option value="paid" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Lunas</option>
          </select>
        </div>
      </div>

      {/* SPP Invoice Creator Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-lg shadow-2xl border ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Terbitkan Invoice SPP Baru</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white font-medium text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmitInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Siswa *</label>
                {activeStudents.length === 0 ? (
                  <p className="text-sm text-amber-500 flex items-center gap-1"><AlertCircle size={15} /> Tidak ada siswa aktif. Daftarkan siswa terlebih dahulu.</p>
                ) : (
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-750' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    {activeStudents.map(s => (
                      <option key={s.id} value={s.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>{s.name} ({s.level})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Jumlah SPP Bulanan (IDR) *</label>
                <input
                  type="number"
                  required
                  placeholder="Misal: 250000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 font-mono font-semibold ${getAccentBorderClass()} ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Periode Bulan SPP *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Juni 2026"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Jatuh Tempo *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800 font-medium' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className={`pt-4 border-t flex gap-3 justify-end ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={activeStudents.length === 0}
                  className={`${getAccentBgClass()} text-white font-medium px-5 py-2 rounded-xl transition shadow-sm disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600`}
                >
                  Terbitkan Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Update Overlay Dialog */}
      {payingInvoiceId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-md shadow-2xl border p-6 space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800'
          }`}>
            <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Konfirmasi Pelunasan SPP</h3>
            <p className="text-slate-500 text-sm">Catat detail transaksi pelunasan invoice ini.</p>
            
            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Metode Bayar</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Transfer')}
                    className={`p-3 rounded-xl border text-sm font-medium transition flex items-center justify-center gap-2 ${
                      paymentMethod === 'Transfer'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <Landmark size={16} />
                    <span>Transfer Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Tunai')}
                    className={`p-3 rounded-xl border text-sm font-medium transition flex items-center justify-center gap-2 ${
                      paymentMethod === 'Tunai'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <CreditCard size={16} />
                    <span>Uang Tunai</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Pembayaran</label>
                <input
                  type="date"
                  required
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800 font-medium' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex gap-3 justify-end ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setPayingInvoiceId(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`${getAccentBgClass()} text-white font-medium px-5 py-2.5 rounded-xl transition shadow-sm`}
                >
                  Konfirmasi Lunas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice list output */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt size={44} className="mx-auto text-slate-600 mb-3" />
            <p className="font-medium text-slate-400">Tidak ada tagihan SPP diterbitkan</p>
            <p className="text-xs text-slate-500 mt-1">Gunakan tombol diatas untuk menerbitkan tagihan pertama.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <th className="p-4">No Invoice</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Periode & Tempo</th>
                  <th className="p-4">Jumlah Biaya</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20'}`}>
                    <td className="p-4 font-mono text-xs font-semibold text-slate-500">
                      {invoice.invoiceNo}
                    </td>
                    <td className={`p-4 font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      {invoice.studentName}
                    </td>
                    <td className="p-4">
                      <div className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{invoice.month}</div>
                      <div className="text-xs flex items-center gap-1 mt-0.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span className="text-slate-400">Tempo: {invoice.dueDate}</span>
                      </div>
                    </td>
                    <td className={`p-4 font-mono font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      {formatRupiah(invoice.amount)}
                    </td>
                    <td className="p-4">
                      {invoice.status === 'paid' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                            <CheckCircle size={10} />
                            <span>LUNAS</span>
                          </span>
                          <div className="text-[10px] font-mono text-slate-500">
                            {invoice.paidAt} ({invoice.paymentMethod})
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md">
                          <Clock size={10} />
                          <span>BELUM BAYAR</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {invoice.status === 'unpaid' && (
                          <button
                            onClick={() => {
                              setPayingInvoiceId(invoice.id);
                              setPaidAt(new Date().toISOString().slice(0, 10));
                            }}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                          >
                            Tandai Lunas
                          </button>
                        )}
                        {invoice.status === 'paid' && (
                          <button
                            onClick={() => onUpdateInvoiceStatus(invoice.id, 'unpaid')}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                          >
                            Batalkan Lunas
                          </button>
                        )}
                        
                        {/* PDF Download receipt button */}
                        <button
                          onClick={() => downloadInvoicePDF(invoice)}
                          className="p-1.5 text-slate-500 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Unduh Kuitansi PDF"
                        >
                          <Download size={16} />
                        </button>

                        <button
                          onClick={() => sendInvoiceWhatsApp(invoice)}
                          className="p-1.5 text-slate-500 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Kirim WA"
                        >
                          <Send size={16} />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(invoice.id, invoice.invoiceNo)}
                          className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Hapus Invoice"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
