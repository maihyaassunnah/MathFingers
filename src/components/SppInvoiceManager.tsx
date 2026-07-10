import React, { useState } from 'react';
import { Student, Invoice, AppSettings, Installment } from '../types';
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
  AlertCircle,
  ChevronDown,
  ChevronUp,
  History,
  UserPlus,
  BookOpen
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface SppInvoiceManagerProps {
  students: Student[];
  invoices: Invoice[];
  settings: AppSettings;
  onCreateInvoice: (data: Omit<Invoice, 'id' | 'invoiceNo' | 'createdAt'>) => Promise<void>;
  onUpdateInvoiceStatus: (
    id: string, 
    status: 'paid' | 'unpaid' | 'partially_paid', 
    details?: { 
      paidAt?: string; 
      paymentMethod?: 'Transfer' | 'Tunai';
      amountPaid?: number;
      installments?: Installment[];
    }
  ) => Promise<void>;
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
  
  const [activeCategory, setActiveCategory] = useState<'spp' | 'pendaftaran' | 'buku'>('spp');
  const [invoiceCategory, setInvoiceCategory] = useState<'spp' | 'pendaftaran' | 'buku'>('spp');

  // Payment confirmation states
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Transfer' | 'Tunai'>('Transfer');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));

  // Expanded rows for installment lists
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Installment payment options inside payment modal
  const [paymentType, setPaymentType] = useState<'full' | 'installment'>('full');
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [installmentNote, setInstallmentNote] = useState<string>('');

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

  const handleInvoiceCategoryChange = (cat: 'spp' | 'pendaftaran' | 'buku') => {
    setInvoiceCategory(cat);
    if (cat === 'spp') {
      setAmount(settings.defaultSppAmount);
      const curMonthName = months[new Date().getMonth()];
      setMonth(`${curMonthName} ${currentYear}`);
    } else if (cat === 'pendaftaran') {
      setAmount(100000);
      setMonth('Pendaftaran Siswa Baru');
    } else {
      setAmount(150000);
      setMonth('Paket Buku Pegangan');
    }
  };

  const handleOpenForm = () => {
    setSelectedStudentId(activeStudents[0]?.id || '');
    setInvoiceCategory(activeCategory);
    
    if (activeCategory === 'spp') {
      setAmount(settings.defaultSppAmount);
      const curMonthName = months[new Date().getMonth()];
      setMonth(`${curMonthName} ${currentYear}`);
    } else if (activeCategory === 'pendaftaran') {
      setAmount(100000);
      setMonth('Pendaftaran Siswa Baru');
    } else {
      setAmount(150000);
      setMonth('Paket Buku Pegangan');
    }
    
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
      status: 'unpaid',
      category: invoiceCategory
    });

    setIsFormOpen(false);
  };

  const handleOpenPaymentModal = (invoice: Invoice) => {
    setPayingInvoiceId(invoice.id);
    setPaidAt(new Date().toISOString().slice(0, 10));
    const currentPaid = invoice.amountPaid || 0;
    const remaining = invoice.amount - currentPaid;
    setInstallmentAmount(remaining);
    setPaymentType('full');
    setInstallmentNote('');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoiceId) return;

    const invoiceObj = invoices.find(inv => inv.id === payingInvoiceId);
    if (!invoiceObj) return;

    const currentPaid = invoiceObj.amountPaid || 0;
    const totalAmount = invoiceObj.amount;
    const remaining = totalAmount - currentPaid;

    if (paymentType === 'full') {
      const newInstallment: Installment = {
        id: Math.random().toString(36).substring(2, 9),
        amount: remaining,
        paidAt,
        paymentMethod,
        note: 'Pelunasan Penuh'
      };
      const newInstallments = [...(invoiceObj.installments || []), newInstallment];
      await onUpdateInvoiceStatus(payingInvoiceId, 'paid', {
        paidAt,
        paymentMethod,
        amountPaid: totalAmount,
        installments: newInstallments
      });
    } else {
      if (installmentAmount <= 0 || installmentAmount > remaining) {
        alert(`Jumlah pembayaran harus antara Rp 1 dan ${formatRupiah(remaining)}!`);
        return;
      }
      const newInstallment: Installment = {
        id: Math.random().toString(36).substring(2, 9),
        amount: installmentAmount,
        paidAt,
        paymentMethod,
        note: installmentNote.trim() || `Cicilan ke-${(invoiceObj.installments || []).length + 1}`
      };
      const newInstallments = [...(invoiceObj.installments || []), newInstallment];
      const newAmountPaid = currentPaid + installmentAmount;
      const isNowFullyPaid = newAmountPaid >= totalAmount;
      const nextStatus = isNowFullyPaid ? 'paid' : 'partially_paid';

      await onUpdateInvoiceStatus(payingInvoiceId, nextStatus, {
        paidAt: isNowFullyPaid ? paidAt : undefined,
        paymentMethod: isNowFullyPaid ? paymentMethod : undefined,
        amountPaid: newAmountPaid,
        installments: newInstallments
      });
    }

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
      message = `Assalamu'alaikum warahmatullahi wabarakatuh. Ibu/Bapak *${student.parentName}*,\n\nSemoga sehat selalu. Kami menginfokan *Invoice SPP bimbingan Les Privat Math Fingers* ananda *${student.name}* untuk periode *${invoice.month}*:\n\n🧾 No Invoice: ${invoice.invoiceNo}\n💵 Jumlah Tagihan: *${formatRupiah(invoice.amount)}*\n📅 Tanggal Jatuh Tempo: ${invoice.dueDate}\n\n*Informasi Rekening Pembayaran:*\n🏦 Bank ${settings.bankName}: *${settings.bankAccountNo}*\n👤 Atas Nama: *${settings.bankAccountHolder}*\n\n_(Mohon kirimkan konfirmasi berupa foto bukti transfer jika pembayaran telah dilakukan. Terima kasih!_ 🙏)\n\n*Math Fingers* - Berhitung Cepat & Akurat Tanpa Alat! ✨`;
    } else {
      message = `Assalamu'alaikum warahmatullahi wabarakatuh. Ibu/Bapak *${student.parentName}*,\n\nTerima kasih! Kami telah menerima pembayaran SPP Les Privat *Math Fingers* ananda *${student.name}* periode *${invoice.month}*. Berikut kuitansi tanda terima digital:\n\n🧾 No Invoice: ${invoice.invoiceNo}\n💵 Jumlah Pembayaran: *${formatRupiah(invoice.amount)}*\n📅 Tanggal Bayar: ${invoice.paidAt || '-'}\n💳 Metode Pembayaran: *${invoice.paymentMethod || 'Transfer'}*\n📌 Status: *LUNAS (PAID)* ✅\n\nTerima kasih banyak atas dukungannya. Mari terus dukung motivasi belajar matematika ananda! ⚡\n\nSalam Hangat,\n*${settings.defaultTeacherName}*`;
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
    
    // Dynamic Accent Color Helper
    const getAccentRGB = (): [number, number, number] => {
      switch (settings.accentColor) {
        case 'indigo': return [79, 70, 229];
        case 'violet': return [124, 58, 237];
        case 'amber': return [217, 119, 6];
        case 'rose': return [225, 29, 72];
        case 'sky': return [14, 165, 233];
        case 'emerald':
        default: return [5, 150, 105];
      }
    };
    
    const getAccentLightRGB = (): [number, number, number] => {
      switch (settings.accentColor) {
        case 'indigo': return [240, 242, 254];
        case 'violet': return [245, 243, 255];
        case 'amber': return [254, 243, 199];
        case 'rose': return [255, 241, 242];
        case 'sky': return [240, 249, 255];
        case 'emerald':
        default: return [240, 253, 250];
      }
    };

    const [accentR, accentG, accentB] = getAccentRGB();
    const [lightR, lightG, lightB] = getAccentLightRGB();

    // Background card border & padding lines
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(1);
    doc.rect(8, 8, 194, 132); // Outer border frame
    
    doc.setDrawColor(accentR, accentG, accentB); // Dynamic brand inner border frame
    doc.setLineWidth(0.3);
    doc.rect(9.5, 9.5, 191, 129);

    // Subtle modern pastel dot watermarks in 4 corners instead of giant overlapping circles
    doc.setFillColor(lightR, lightG, lightB);
    doc.circle(12, 12, 6, 'F');
    doc.circle(198, 12, 6, 'F');
    doc.circle(12, 136, 6, 'F');
    doc.circle(198, 136, 6, 'F');

    // 1. TOP LEFT: BRANDING & CUSTOM LOGO
    const brandX = 14;
    const brandY = 16;
    
    if (settings.invoiceLogo) {
      try {
        // Embed uploaded custom Logo
        doc.addImage(settings.invoiceLogo, 'PNG', brandX, brandY - 5, 22, 15);
      } catch (err) {
        console.error("Failed to draw custom logo in PDF, drawing fallback", err);
        drawFallbackLogo(brandX, brandY);
      }
    } else {
      drawFallbackLogo(brandX, brandY);
    }

    // Brand Titles
    const textOffset = settings.invoiceLogo ? 25 : 13;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(accentR, accentG, accentB);
    doc.text("MATH FINGERS", brandX + textOffset, brandY + 4.5);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text("Easy Learning House • Berhitung Cepat", brandX + textOffset, brandY + 8.5);

    // Helper to draw default hand logo icon
    function drawFallbackLogo(bx: number, by: number) {
      doc.setFillColor(accentR, accentG, accentB); // Dynamic
      doc.circle(bx + 5, by + 6, 3.5, 'F'); // palm
      doc.rect(bx + 4.2, by + 8.5, 1.6, 2, 'F'); // wrist
      // Fingers
      doc.setFillColor(245, 158, 11); // Amber
      doc.rect(bx + 1, by + 4, 1.2, 3, 'F'); // thumb
      doc.setFillColor(59, 130, 246); // Blue
      doc.rect(bx + 3, by + 1.5, 1.2, 4.5, 'F'); // index
      doc.setFillColor(239, 68, 68); // Red
      doc.rect(bx + 5, by + 0.5, 1.2, 5.5, 'F'); // middle
      doc.setFillColor(139, 92, 246); // Purple
      doc.rect(bx + 7, by + 1.5, 1.2, 4.5, 'F'); // ring
      doc.setFillColor(249, 115, 22); // Orange
      doc.rect(bx + 9, by + 3, 1.2, 3, 'F'); // pinky
    }

    // 2. TOP MIDDLE: KUITANSI TITLE
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(accentR, accentG, accentB);
    doc.text("KUITANSI", 105, 18.5, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(245, 158, 11); // Amber-500 title highlight
    doc.text("TANDA TERIMA RESMI SPP", 105, 23, { align: 'center' });

    // 3. TOP RIGHT: INVOICE META BOX
    const metaX = 148;
    const metaY = 13;
    const metaW = 48;
    const metaH = 14;
    
    doc.setFillColor(248, 250, 252); // Slate-50 light background
    doc.setDrawColor(226, 232, 240); // Slate-200 border
    doc.setLineWidth(0.4);
    doc.roundedRect(metaX, metaY, metaW, metaH, 1.5, 1.5, 'FD');
    
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
    const packageText = student?.jenisPaket ? ` • Paket ${student.jenisPaket}` : ' • Paket 4P';
    const levelText = student?.level ? ` • ${student.level}` : '';
    doc.text(`${invoice.studentName}${genderSuffix}${packageText}${levelText}`, valueX, r2);
    doc.line(valueX, r2 + 1.5, 196, r2 + 1.5);

    // Untuk Pembayaran
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Guna Membayar", labelX, r3);
    doc.text(":", valueX - 4, r3);
    
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(accentR, accentG, accentB); // Accent Color text
    doc.text(`Iuran Bulanan (SPP) Periode ${invoice.month}`, valueX, r3);
    doc.line(valueX, r3 + 1.5, 196, r3 + 1.5);

    // Terbilang Uang Band - Rounding rect for gorgeous card look
    doc.setFillColor(lightR, lightG, lightB); // Accent Light banner
    doc.roundedRect(labelX, r4, 182, 10, 2, 2, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(accentR, accentG, accentB);
    doc.text("Uang Sejumlah", labelX + 3, r4 + 6.5);
    doc.text(":", valueX - 4, r4 + 6.5);
    
    doc.setFont("Helvetica", "bolditalic");
    doc.setFontSize(9.5);
    doc.setTextColor(Math.max(0, accentR - 35), Math.max(0, accentG - 35), Math.max(0, accentB - 35)); // High contrast dark version of accent
    const printAmount = invoice.status === 'partially_paid' ? (invoice.amountPaid || 0) : invoice.amount;
    const amountInWords = `### ${angkaKeTerbilang(printAmount)} Rupiah ###`;
    doc.text(amountInWords, valueX, r4 + 6.5);

    // 5. FOOTER SECTION
    const footerY = 92;
    
    // Amount display box (Left bottom) - Gorgeous rounded rectangle
    doc.setFillColor(accentR, accentG, accentB); // Dynamic solid background
    doc.roundedRect(labelX, footerY, 70, 14, 2, 2, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13.5);
    doc.setTextColor(255, 255, 255); // White font
    const formattedAmount = `Rp ${printAmount.toLocaleString('id-ID')},-`;
    doc.text(formattedAmount, labelX + 35, footerY + 9.2, { align: 'center' });
    
    // Info details below Amount Box
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    const payMethodText = invoice.paymentMethod 
      ? `Metode Pembayaran: ${invoice.paymentMethod}` 
      : invoice.status === 'partially_paid' 
        ? 'Status: Dicicil (Pembayaran Parsial)' 
        : 'Metode Pembayaran: Lunas';
    doc.text(payMethodText, labelX + 2, footerY + 18);

    if (invoice.status === 'partially_paid') {
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(217, 119, 6); // Amber
      const remainingAmount = invoice.amount - printAmount;
      doc.text(`Sisa Tagihan: Rp ${remainingAmount.toLocaleString('id-ID')},-`, labelX + 2, footerY + 22);
    }

    // Motto middle
    const mottoX = 116;
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('"Berhitung Cepat & Akurat Tanpa Alat"', mottoX, footerY + 6, { align: 'center' });
    
    // Little hand icon decoration in middle
    doc.setFillColor(lightR, lightG, lightB);
    doc.circle(mottoX, footerY - 2, 2.5, 'F');

    // Right bottom: Signature
    const signX = 168;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Penerima,", signX, footerY, { align: 'center' });
    
    // Draw electronic signature if uploaded by user
    if (settings.invoiceSignature) {
      try {
        doc.addImage(settings.invoiceSignature, 'PNG', signX - 16, footerY + 1.5, 32, 12);
      } catch (err) {
        console.error("Failed to render custom electronic signature onto PDF", err);
      }
    }

    // Signature underline line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(signX - 22, footerY + 14.5, signX + 22, footerY + 14.5);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(settings.defaultTeacherName, signX, footerY + 18.5, { align: 'center' });

    doc.save(`Receipt_SPP_${invoice.invoiceNo.replace(/\//g, '_')}.pdf`);
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const invoiceCat = invoice.category || 'spp';
    if (invoiceCat !== activeCategory) return false;

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
      {/* Sub-navigation Tabs for Payments */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 print:hidden mb-2">
        <button
          type="button"
          onClick={() => setActiveCategory('pendaftaran')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-150 flex items-center gap-2 ${
            activeCategory === 'pendaftaran'
              ? 'border-emerald-500 text-emerald-500 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-350'
          }`}
        >
          <UserPlus size={16} />
          <span>Pembayaran Pendaftaran</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('spp')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-150 flex items-center gap-2 ${
            activeCategory === 'spp'
              ? 'border-emerald-500 text-emerald-500 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-350'
          }`}
        >
          <Receipt size={16} />
          <span>SPP</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('buku')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-150 flex items-center gap-2 ${
            activeCategory === 'buku'
              ? 'border-emerald-500 text-emerald-500 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-350'
          }`}
        >
          <BookOpen size={16} />
          <span>Buku</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
            {activeCategory === 'pendaftaran' ? 'Pembayaran Pendaftaran' : activeCategory === 'spp' ? 'SPP & Invoice Manajemen' : 'Pembayaran Buku'}
          </h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>
            {activeCategory === 'pendaftaran' 
              ? 'Kelola pembayaran pendaftaran siswa baru, terbitkan invoice pendaftaran, dan cetak kuitansi resmi.'
              : activeCategory === 'spp'
              ? 'Terbitkan tagihan SPP bulanan, catat pembayaran lunas/cicilan, dan ekspor kuitansi PDF serta kirim via WhatsApp.'
              : 'Kelola pembayaran pembelian paket buku materi siswa, catat pelunasan, dan buat kuitansi digital.'}
          </p>
        </div>
        
        <button
          id="btn-create-invoice"
          onClick={handleOpenForm}
          className={`flex items-center justify-center gap-2 ${getAccentBgClass()} text-white font-medium px-4 py-2.5 rounded-xl transition duration-150 shadow-sm`}
        >
          {activeCategory === 'pendaftaran' ? <UserPlus size={18} /> : activeCategory === 'spp' ? <Receipt size={18} /> : <BookOpen size={18} />}
          <span>
            {activeCategory === 'pendaftaran' ? 'Buat Tagihan Baru' : activeCategory === 'spp' ? 'Buat Invoice Baru' : 'Buat Tagihan Buku'}
          </span>
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
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                Buat Tagihan {invoiceCategory === 'pendaftaran' ? 'Pendaftaran' : invoiceCategory === 'spp' ? 'SPP' : 'Buku'} Baru
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white font-medium text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmitInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Kategori Pembayaran *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleInvoiceCategoryChange('pendaftaran')}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition ${
                      invoiceCategory === 'pendaftaran'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-extrabold'
                        : isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    Pendaftaran
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInvoiceCategoryChange('spp')}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition ${
                      invoiceCategory === 'spp'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-extrabold'
                        : isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    SPP
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInvoiceCategoryChange('buku')}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition ${
                      invoiceCategory === 'buku'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-extrabold'
                        : isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    Buku
                  </button>
                </div>
              </div>

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
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-750 font-semibold' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    {activeStudents.map(s => (
                      <option key={s.id} value={s.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>{s.name} ({s.level})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  {invoiceCategory === 'pendaftaran' ? 'Jumlah Biaya Pendaftaran (IDR) *' : invoiceCategory === 'spp' ? 'Jumlah SPP Bulanan (IDR) *' : 'Jumlah Biaya Buku (IDR) *'}
                </label>
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
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    {invoiceCategory === 'pendaftaran' ? 'Keterangan Pendaftaran *' : invoiceCategory === 'spp' ? 'Periode Bulan SPP *' : 'Keterangan Buku *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={invoiceCategory === 'pendaftaran' ? 'Misal: Pendaftaran Siswa Baru' : invoiceCategory === 'spp' ? 'Misal: Juni 2026' : 'Misal: Buku Level 1'}
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
      {payingInvoiceId && (() => {
        const selectedInvoiceObj = invoices.find(inv => inv.id === payingInvoiceId);
        if (!selectedInvoiceObj) return null;

        const currentPaid = selectedInvoiceObj.amountPaid || 0;
        const remaining = selectedInvoiceObj.amount - currentPaid;

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`rounded-2xl w-full max-w-md shadow-2xl border p-6 space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800 text-white'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Catat Pembayaran SPP</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Siswa: <span className="font-semibold">{selectedInvoiceObj.studentName}</span> • Periode: <span className="font-semibold">{selectedInvoiceObj.month}</span></p>
                </div>
                <button onClick={() => setPayingInvoiceId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-medium text-lg">✕</button>
              </div>

              {/* Outstanding balance breakdown info card */}
              <div className={`p-4 rounded-xl space-y-1.5 border text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-850'}`}>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Tagihan SPP:</span>
                  <span className="font-bold">{formatRupiah(selectedInvoiceObj.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sudah Dibayar (Cicilan):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(currentPaid)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 mt-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Sisa Outstanding:</span>
                  <span className="font-black text-rose-500">{formatRupiah(remaining)}</span>
                </div>
              </div>
              
              <form onSubmit={handleConfirmPayment} className="space-y-4">
                {/* Payment Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tipe Pembayaran</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('full');
                        setInstallmentAmount(remaining);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                        paymentType === 'full'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : isLight ? 'border-slate-200 text-slate-650 hover:bg-slate-50' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <span>Pelunasan Penuh</span>
                      <span className="text-[10px] font-normal font-mono">({formatRupiah(remaining)})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('installment');
                        setInstallmentAmount(Math.min(remaining, 100000));
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                        paymentType === 'installment'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : isLight ? 'border-slate-200 text-slate-655 hover:bg-slate-50' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <span>Cicil / Parsial</span>
                      <span className="text-[10px] font-normal">Tentukan nominal</span>
                    </button>
                  </div>
                </div>

                {/* Amount to Pay (only for installment type) */}
                {paymentType === 'installment' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nominal Bayar (IDR) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={remaining}
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(Number(e.target.value))}
                      className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 font-mono font-bold ${getAccentBorderClass()} ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Masukkan jumlah cicilan saat ini. Maksimal {formatRupiah(remaining)}.</p>
                  </div>
                )}

                {/* Note / Keterangan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Keterangan / Catatan</label>
                  <input
                    type="text"
                    placeholder={paymentType === 'full' ? 'Contoh: Lunas Penuh' : 'Contoh: Cicilan ke-1'}
                    value={installmentNote}
                    onChange={(e) => setInstallmentNote(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 text-xs ${getAccentBorderClass()} ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>

                {/* Payment Method & Date in Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Metode Bayar</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'Transfer' | 'Tunai')}
                      className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 text-xs font-medium ${getAccentBorderClass()} ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    >
                      <option value="Transfer">Transfer Bank</option>
                      <option value="Tunai">Tunai / Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Bayar</label>
                    <input
                      type="date"
                      required
                      value={paidAt}
                      onChange={(e) => setPaidAt(e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 text-xs font-medium ${getAccentBorderClass()} ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    />
                  </div>
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
                    className={`${getAccentBgClass()} text-white font-medium px-5 py-2.5 rounded-xl transition shadow-sm text-xs font-bold`}
                  >
                    {paymentType === 'full' ? 'Konfirmasi Lunas' : 'Simpan Cicilan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Invoice list output */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {activeCategory === 'pendaftaran' ? <UserPlus size={44} className="mx-auto text-slate-600 mb-3" /> : activeCategory === 'spp' ? <Receipt size={44} className="mx-auto text-slate-600 mb-3" /> : <BookOpen size={44} className="mx-auto text-slate-600 mb-3" />}
            <p className="font-medium text-slate-400">
              Tidak ada tagihan {activeCategory === 'pendaftaran' ? 'pendaftaran' : activeCategory === 'spp' ? 'SPP' : 'buku'} diterbitkan
            </p>
            <p className="text-xs text-slate-500 mt-1">Gunakan tombol diatas untuk mencatat tagihan pertama.</p>
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
                  <th className="p-4">
                    {activeCategory === 'pendaftaran' ? 'Keterangan' : activeCategory === 'spp' ? 'Periode & Tempo' : 'Keterangan & Tempo'}
                  </th>
                  <th className="p-4">Jumlah Biaya</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                {filteredInvoices.map((invoice) => {
                  const hasInstallments = invoice.installments && invoice.installments.length > 0;
                  const isExpanded = expandedInvoiceId === invoice.id;
                  const currentPaid = invoice.amountPaid || 0;
                  const remaining = invoice.amount - currentPaid;

                  return (
                    <React.Fragment key={invoice.id}>
                      <tr className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-850/20'} ${isExpanded ? (isLight ? 'bg-slate-50/70' : 'bg-slate-900/40') : ''}`}>
                        <td className="p-4 font-mono text-xs font-semibold text-slate-500">
                          <div className="flex items-center gap-1.5">
                            {hasInstallments ? (
                              <button
                                onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice.id)}
                                className={`p-1 rounded-md transition ${isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400'}`}
                                title={isExpanded ? "Sembunyikan Riwayat Cicilan" : "Tampilkan Riwayat Cicilan"}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            ) : (
                              <span className="w-6" /> // spacer
                            )}
                            <span>{invoice.invoiceNo}</span>
                          </div>
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
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                                <CheckCircle size={10} />
                                <span>LUNAS</span>
                              </span>
                              <div className="text-[10px] font-mono text-slate-500">
                                {invoice.paidAt} ({invoice.paymentMethod})
                              </div>
                            </div>
                          ) : invoice.status === 'partially_paid' ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md">
                                <History size={10} />
                                <span>DICICIL ({invoice.installments?.length || 0}x)</span>
                              </span>
                              <div className="text-[10px] text-slate-500">
                                Dibayar: <span className="font-semibold">{formatRupiah(currentPaid)}</span>
                              </div>
                              <div className="text-[10px] text-rose-500 font-bold">
                                Sisa: {formatRupiah(remaining)}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md">
                              <Clock size={10} />
                              <span>BELUM BAYAR</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {invoice.status !== 'paid' ? (
                              <button
                                onClick={() => handleOpenPaymentModal(invoice)}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                              >
                                Bayar / Cicil
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm('Apakah Anda yakin ingin membatalkan semua pembayaran untuk invoice ini dan mereset status menjadi BELUM BAYAR?')) {
                                    onUpdateInvoiceStatus(invoice.id, 'unpaid', {
                                      paidAt: undefined,
                                      paymentMethod: undefined,
                                      amountPaid: 0,
                                      installments: []
                                    });
                                  }
                                }}
                                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                              >
                                Batal Lunas
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

                      {/* Expandable Installment Row */}
                      {isExpanded && invoice.installments && invoice.installments.length > 0 && (
                        <tr>
                          <td colSpan={6} className={`p-4 ${isLight ? 'bg-slate-50/50' : 'bg-slate-950/30'}`}>
                            <div className="max-w-3xl pl-8 space-y-2">
                              <div className="flex items-center gap-2">
                                <History size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rincian Pembayaran Cicilan ({invoice.installments.length}x):</span>
                              </div>
                              <div className={`border rounded-xl divide-y overflow-hidden text-xs ${isLight ? 'bg-white border-slate-200 divide-slate-200' : 'bg-[#020617] border-slate-850 divide-slate-850'}`}>
                                {invoice.installments.map((inst, idx) => (
                                  <div key={inst.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-extrabold text-[10px]">
                                        {idx + 1}
                                      </span>
                                      <div>
                                        <div className="font-bold text-slate-700 dark:text-white">{formatRupiah(inst.amount)}</div>
                                        <div className="text-[10px] text-slate-500">{inst.paidAt} • {inst.paymentMethod}</div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-slate-500 italic max-w-md">
                                      {inst.note || 'Tanpa catatan'}
                                    </div>
                                    <div className="text-right">
                                      {/* Allows deleting an individual installment payment */}
                                      <button
                                        onClick={() => {
                                          if (confirm(`Hapus cicilan ke-${idx + 1} sejumlah ${formatRupiah(inst.amount)}?`)) {
                                            const updatedInst = invoice.installments?.filter(i => i.id !== inst.id) || [];
                                            const newAmountPaid = updatedInst.reduce((sum, item) => sum + item.amount, 0);
                                            const newStatus = newAmountPaid === 0 ? 'unpaid' : 'partially_paid';
                                            onUpdateInvoiceStatus(invoice.id, newStatus, {
                                              paidAt: undefined,
                                              paymentMethod: undefined,
                                              amountPaid: newAmountPaid,
                                              installments: updatedInst
                                            });
                                          }
                                        }}
                                        className="text-rose-500 hover:text-rose-700 font-semibold text-[10.5px]"
                                      >
                                        Hapus Pembayaran
                                      </button>
                                    </div>
                                  </div>
                                ))}
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
    </div>
  );
}
