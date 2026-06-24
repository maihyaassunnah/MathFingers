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
      message = `Halo Ibu/Bapak *${student.parentName}*,\n\nSemoga sehat selalu. Kami menginfokan *Invoice SPP bimbingan Les Privat Math Fingers* ananda *${student.name}* untuk periode *${invoice.month}*:\n\n🧾 No Invoice: ${invoice.invoiceNo}\n💵 Jumlah Tagihan: *${formatRupiah(invoice.amount)}*\n📅 Tanggal Jatuh Tempo: ${invoice.dueDate}\n\n*Informasi Rekening Pembayaran:*\n🏦 Bank ${settings.bankName}: *${settings.bankAccountNo}*\n👤 Atas Nama: *${settings.bankAccountHolder}*\n\n_(Mohon kirimkan konfirmasi berupa foto bukti transfer jika pembayaran telah dilakukan. Terima kasih!_ 🙏🌸)\n\n*Math Fingers* - Berhitung cepat tanpa alat hanya sekejap! ✨`;
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
    
    // Draw decorative corner pastel waves/blobs
    // Top-Left Wave
    doc.setFillColor(254, 252, 233); // Soft yellow
    doc.circle(0, 0, 24, 'F');
    // Top-Right Wave
    doc.setFillColor(232, 245, 233); // Soft green
    doc.circle(210, 0, 18, 'F');
    // Bottom-Left Wave
    doc.setFillColor(255, 243, 224); // Soft orange
    doc.circle(0, 148, 20, 'F');
    // Bottom-Right Wave
    doc.setFillColor(252, 228, 236); // Soft pink
    doc.circle(210, 148, 22, 'F');

    // Decor sprinkles (Stars/Plus)
    doc.setFillColor(255, 202, 40); // Yellow star
    doc.triangle(90, 30, 92, 34, 88, 34, 'F');
    doc.setFillColor(244, 143, 177); // Pink star
    doc.circle(18, 90, 1.5, 'F');
    doc.setFillColor(144, 202, 249); // Blue plus
    doc.setDrawColor(41, 182, 246);
    doc.setLineWidth(0.4);
    doc.line(60, 25, 64, 25);
    doc.line(62, 23, 62, 27);

    // 1. LEFT HEADER: EASY LEARNING HOUSE LOGO
    const logoX = 28;
    const logoY = 18;
    
    // House roof (Green #4bae4f)
    doc.setFillColor(75, 174, 79);
    doc.triangle(logoX - 8, logoY + 8, logoX + 8, logoY + 8, logoX, logoY, 'F');
    // House base (Yellow #ffca28)
    doc.setFillColor(255, 202, 40);
    doc.rect(logoX - 6, logoY + 8, 12, 10, 'F');
    // House windows (White)
    doc.setFillColor(255, 255, 255);
    doc.rect(logoX - 4, logoY + 10, 3, 3, 'F');
    doc.rect(logoX + 1, logoY + 10, 3, 3, 'F');
    // Chimney / Love on house
    doc.setFillColor(239, 83, 80); // Red
    doc.circle(logoX + 8, logoY + 2, 1.2, 'F');

    // Brand text
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(46, 125, 50); // Dark Green
    doc.text("EASY", logoX, logoY + 23, { align: 'center' });
    doc.setFontSize(6.5);
    doc.text("LEARNING HOUSE", logoX, logoY + 26, { align: 'center' });
    
    // Small pink heart below text
    doc.setFillColor(239, 83, 80);
    doc.circle(logoX, logoY + 29, 0.8, 'F');

    // 2. MIDDLE HEADER: KUITANSI
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(46, 125, 50); // Green
    doc.text("KUITANSI", 105, 25, { align: 'center' });
    
    // Yellow decorative rays around KUITANSI text
    doc.setDrawColor(255, 167, 38);
    doc.setLineWidth(0.8);
    // Left rays
    doc.line(72, 20, 75, 22);
    doc.line(70, 24, 74, 24);
    doc.line(71, 28, 75, 26);
    // Right rays
    doc.line(138, 22, 135, 20);
    doc.line(136, 24, 140, 24);
    doc.line(135, 26, 139, 28);

    // 3. RIGHT HEADER: No. & Tanggal lines
    const fieldRightX = 150;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    
    doc.text("No.       :", fieldRightX, 19);
    doc.setFont("Courier", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(invoice.invoiceNo, fieldRightX + 18, 19);
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.3);
    doc.line(fieldRightX + 17, 20, 200, 20);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Tanggal :", fieldRightX, 26);
    doc.setTextColor(30, 41, 59);
    const dateToPrint = invoice.status === 'paid' ? (invoice.paidAt || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
    doc.text(dateToPrint, fieldRightX + 18, 26);
    doc.line(fieldRightX + 17, 27, 200, 27);

    // 4. RECEIPT FIELDS (Main rows with dotted lines)
    const contentStartY = 45;
    const labelX = 18;
    const valueStartX = 55;
    const lineEndX = 198;
    
    // Telah terima dari
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text("Telah terima dari", labelX, contentStartY);
    doc.text(":", valueStartX - 4, contentStartY);
    
    doc.setFont("Helvetica", "bold");
    const parentName = student ? student.parentName : '-';
    doc.text(`Ibu/Bapak ${parentName} (Wali ananda ${invoice.studentName})`, valueStartX, contentStartY);
    
    // Draw fine dotted line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(valueStartX, contentStartY + 1, lineEndX, contentStartY + 1);

    // Uang sejumlah (with a horizontal pastel light green band)
    const bandY = contentStartY + 6;
    doc.setFillColor(232, 245, 233); // Light green band (#e8f5e9)
    doc.rect(valueStartX - 2, bandY, (lineEndX - valueStartX) + 4, 8, 'F');
    
    doc.setFont("Helvetica", "normal");
    doc.text("Uang sejumlah", labelX, bandY + 5.5);
    doc.text(":", valueStartX - 4, bandY + 5.5);
    
    doc.setFont("Helvetica", "bolditalic");
    const amountInWords = angkaKeTerbilang(invoice.amount) + " Rupiah";
    doc.text(amountInWords, valueStartX, bandY + 5.5);
    doc.line(valueStartX, bandY + 8, lineEndX, bandY + 8);

    // Untuk pembayaran
    const payY = contentStartY + 20;
    doc.setFont("Helvetica", "normal");
    doc.text("Untuk pembayaran", labelX, payY);
    doc.text(":", valueStartX - 4, payY);
    
    doc.setFont("Helvetica", "semibold");
    const paymentDesc = `Iuran Bulanan (SPP) Les Privat Math Fingers - Periode ${invoice.month}`;
    doc.text(paymentDesc, valueStartX, payY);
    doc.line(valueStartX, payY + 1, lineEndX, payY + 1);

    // Placeholder dotted lines to look like an authentic blank kuitansi
    doc.line(labelX, payY + 10, lineEndX, payY + 10);
    doc.line(labelX, payY + 18, lineEndX, payY + 18);

    // 5. FOOTER LEFT: RP BOX
    const rpBoxY = payY + 26;
    doc.setDrawColor(75, 174, 79); // Green border
    doc.setFillColor(232, 245, 233); // Soft green background
    doc.setLineWidth(0.6);
    doc.rect(labelX, rpBoxY, 62, 13, 'FD');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(46, 125, 50); // Dark Green
    const formattedAmount = `Rp. ${invoice.amount.toLocaleString('id-ID')},-`;
    doc.text(formattedAmount, labelX + 31, rpBoxY + 8.5, { align: 'center' });

    // 6. FOOTER MIDDLE: CUSTOM MATH FINGER LOGO
    const logoFooterX = 110;
    const logoFooterY = rpBoxY + 2;
    
    // Hand vector representation
    // Palm
    doc.setFillColor(129, 199, 132); // Green #81c784
    doc.setDrawColor(46, 125, 50);
    doc.setLineWidth(0.3);
    doc.circle(logoFooterX, logoFooterY + 1, 4.5, 'FD');
    
    // Wrist
    doc.rect(logoFooterX - 1.5, logoFooterY + 4, 3, 2, 'FD');

    // Colored Fingers (1 to 5)
    // Thumb (Yellow)
    doc.setFillColor(255, 202, 40);
    doc.rect(logoFooterX - 6.5, logoFooterY - 2, 2, 3, 'FD');
    // Index (Blue)
    doc.setFillColor(41, 182, 246);
    doc.rect(logoFooterX - 4, logoFooterY - 6, 1.8, 5, 'FD');
    // Middle (Red)
    doc.setFillColor(239, 83, 80);
    doc.rect(logoFooterX - 1, logoFooterY - 8, 1.8, 7, 'FD');
    // Ring (Purple)
    doc.setFillColor(171, 71, 188);
    doc.rect(logoFooterX + 2, logoFooterY - 6, 1.8, 5, 'FD');
    // Pinky (Orange)
    doc.setFillColor(255, 167, 38);
    doc.rect(logoFooterX + 5, logoFooterY - 4, 1.8, 3, 'FD');

    // Smiley face on palm (cute happy curved line)
    doc.setDrawColor(46, 125, 50);
    doc.setLineWidth(0.4);
    doc.line(logoFooterX - 1.5, logoFooterY + 1, logoFooterX + 1.5, logoFooterY + 1);
    doc.line(logoFooterX - 1.5, logoFooterY + 1, logoFooterX - 1.2, logoFooterY + 0.6);
    doc.line(logoFooterX + 1.5, logoFooterY + 1, logoFooterX + 1.2, logoFooterY + 0.6);

    // Title text: Math Finger Class in colorful letters
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    // Colorful letters
    doc.setTextColor(239, 83, 80); doc.text("M", logoFooterX - 18, logoFooterY + 10.5);
    doc.setTextColor(255, 167, 38); doc.text("a", logoFooterX - 14.5, logoFooterY + 10.5);
    doc.setTextColor(41, 182, 246); doc.text("t", logoFooterX - 11.5, logoFooterY + 10.5);
    doc.setTextColor(75, 174, 79); doc.text("h", logoFooterX - 8.5, logoFooterY + 10.5);
    
    doc.setTextColor(75, 174, 79); doc.text("F", logoFooterX - 2.5, logoFooterY + 10.5);
    doc.setTextColor(41, 182, 246); doc.text("i", logoFooterX + 1.5, logoFooterY + 10.5);
    doc.setTextColor(171, 71, 188); doc.text("n", logoFooterX + 3.5, logoFooterY + 10.5);
    doc.setTextColor(75, 174, 79); doc.text("g", logoFooterX + 7.5, logoFooterY + 10.5);
    doc.setTextColor(255, 167, 38); doc.text("e", logoFooterX + 11.5, logoFooterY + 10.5);
    doc.setTextColor(171, 71, 188); doc.text("r", logoFooterX + 15.5, logoFooterY + 10.5);

    // Class green bubble
    doc.setFillColor(75, 174, 79);
    doc.rect(logoFooterX - 7, logoFooterY + 12, 14, 3, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255);
    doc.text("Class", logoFooterX, logoFooterY + 14.3, { align: 'center' });

    // Motto underneath
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('"Berhitung Cepat, Tanpa Alat & Akurat"', logoFooterX, logoFooterY + 18.5, { align: 'center' });

    // 7. FOOTER RIGHT: SIGNATURE BLOCK
    const signX = 175;
    const signY = rpBoxY + 1;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text("Hormat kami,", signX, signY, { align: 'center' });
    
    // Underline for signature
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.3);
    doc.line(signX - 22, signY + 16, signX + 22, signY + 16);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(settings.defaultTeacherName, signX, signY + 20, { align: 'center' });

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
