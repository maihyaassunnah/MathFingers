import React, { useState } from 'react';
import { Student, Invoice, Installment } from '../types';
import { formatRupiah } from '../utils';
import { 
  History, 
  Search, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Download, 
  CreditCard, 
  Landmark,
  User,
  CheckCircle,
  FileSpreadsheet,
  Printer
} from 'lucide-react';

interface SppHistoryProps {
  students: Student[];
  invoices: Invoice[];
  theme?: string;
}

interface PaymentLedgerEntry {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  month: string;
  amount: number;
  paidAt: string;
  paymentMethod: 'Transfer' | 'Tunai';
  note?: string;
  isPartial: boolean;
}

export function SppHistory({ students, invoices, theme = 'dark' }: SppHistoryProps) {
  const isLight = theme === 'light';
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'ledger'>('history');
  
  // History Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');

  // Leger Filters State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerCategory, setLedgerCategory] = useState<'All' | 'spp' | 'pendaftaran' | 'buku'>('spp');

  // Build the chronological general payment ledger by flattening all installments and paid invoices
  const ledgerEntries: PaymentLedgerEntry[] = [];

  invoices.forEach(inv => {
    if (inv.status === 'paid' && (!inv.installments || inv.installments.length === 0)) {
      // Pre-existing paid invoices or fully paid without installment array
      ledgerEntries.push({
        id: `full-${inv.id}`,
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        studentId: inv.studentId,
        studentName: inv.studentName,
        month: inv.month,
        amount: inv.amount,
        paidAt: inv.paidAt || new Date(inv.createdAt).toISOString().slice(0, 10),
        paymentMethod: inv.paymentMethod || 'Transfer',
        note: 'Pelunasan Penuh',
        isPartial: false
      });
    } else if (inv.installments && inv.installments.length > 0) {
      // Modern invoices with an installments list
      inv.installments.forEach(inst => {
        ledgerEntries.push({
          id: inst.id,
          invoiceId: inv.id,
          invoiceNo: inv.invoiceNo,
          studentId: inv.studentId,
          studentName: inv.studentName,
          month: inv.month,
          amount: inst.amount,
          paidAt: inst.paidAt,
          paymentMethod: inst.paymentMethod,
          note: inst.note || 'Pembayaran Cicilan',
          isPartial: true
        });
      });
    }
  });

  // Sort chronological ledger with most recent first
  const sortedLedger = ledgerEntries.sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  // Filter ledger based on user criteria
  const filteredLedger = sortedLedger.filter(entry => {
    const matchesSearch = 
      entry.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.note && entry.note.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStudent = selectedStudentId === 'All' || entry.studentId === selectedStudentId;
    const matchesMethod = paymentMethodFilter === 'All' || entry.paymentMethod === paymentMethodFilter;

    return matchesSearch && matchesStudent && matchesMethod;
  });

  // Calculate high-level financial metrics from invoices
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  
  const totalRealized = invoices.reduce((sum, inv) => {
    if (inv.status === 'paid') {
      return sum + inv.amount;
    } else if (inv.status === 'partially_paid') {
      return sum + (inv.amountPaid || 0);
    }
    return sum;
  }, 0);

  const totalOutstanding = totalBilled - totalRealized;
  const collectionRate = totalBilled > 0 ? (totalRealized / totalBilled) * 100 : 0;

  // Filter students for the ledger view
  const filteredStudentsForLedger = students.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (st.level && st.level.toLowerCase().includes(ledgerSearch.toLowerCase()));
    return matchesSearch;
  });

  // Export current filtered ledger to JSON for manual backup
  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(filteredLedger, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `Laporan_Mutasi_SPP_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      alert('Gagal mengekspor riwayat pembayaran.');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Nama Siswa', 'Pendaftaran', 'SPP', 'Buku', 'Total Terbayar (Rp)'];
      const rows = filteredStudentsForLedger.map(st => {
        const studentInvoices = invoices.filter(inv => inv.studentId === st.id);
        
        // Pendaftaran
        const regInvoices = studentInvoices.filter(inv => inv.category === 'pendaftaran');
        const regText = regInvoices.map(inv => {
          if (inv.status === 'paid') return 'LUNAS';
          if (inv.status === 'partially_paid') {
            const ratio = inv.amountPaid && inv.amount ? (inv.amountPaid / inv.amount) : 0.5;
            return `CICIL (${Math.round(ratio * 100)}%)`;
          }
          return 'BELUM';
        }).join('; ') || '-';

        // SPP
        const sppInvoices = studentInvoices.filter(inv => inv.category === 'spp');
        const sppText = sppInvoices.map(inv => {
          const statusStr = inv.status === 'paid' ? 'LUNAS' : inv.status === 'partially_paid' ? 'CICIL' : 'BELUM';
          return `${inv.month}: ${statusStr}`;
        }).join('; ') || '-';

        // Buku
        const bookInvoices = studentInvoices.filter(inv => inv.category === 'buku');
        const bookText = bookInvoices.map(inv => {
          const statusStr = inv.status === 'paid' ? 'LUNAS' : inv.status === 'partially_paid' ? 'CICIL' : 'BELUM';
          return `Uang Buku: ${statusStr}`;
        }).join('; ') || '-';

        // Total Paid
        let totalPaidAmount = 0;
        studentInvoices.forEach(inv => {
          if (inv.status === 'paid') {
            totalPaidAmount += inv.amount;
          } else if (inv.status === 'partially_paid') {
            totalPaidAmount += inv.amountPaid || 0;
          }
        });

        return [
          st.name,
          regText,
          sppText,
          bookText,
          totalPaidAmount
        ];
      });
      
      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Leger_Pembayaran_Siswa_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Gagal mengekspor CSV.');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Mohon izinkan popup untuk mencetak leger.');
      return;
    }
    
    let tableRowsHtml = '';
    filteredStudentsForLedger.forEach(st => {
      const studentInvoices = invoices.filter(inv => inv.studentId === st.id);
      
      // Pendaftaran cell
      const regInvoices = studentInvoices.filter(inv => inv.category === 'pendaftaran');
      let regHtml = '<span style="color: #64748b;">-</span>';
      if (regInvoices.length > 0) {
        regHtml = regInvoices.map(inv => {
          if (inv.status === 'paid') {
            return '<span style="color: #059669; font-weight: bold; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">LUNAS</span>';
          } else if (inv.status === 'partially_paid') {
            const ratio = inv.amountPaid && inv.amount ? (inv.amountPaid / inv.amount) : 0.5;
            return `<span style="color: #d97706; font-weight: bold; background: #fffbeb; padding: 2px 6px; border-radius: 4px; border: 1px solid #fde68a;">CICIL (${Math.round(ratio * 100)}%)</span>`;
          } else {
            return '<span style="color: #dc2626; font-weight: bold; background: #fef2f2; padding: 2px 6px; border-radius: 4px; border: 1px solid #fca5a5;">BELUM</span>';
          }
        }).join(' ');
      }

      // SPP cell
      const sppInvoices = studentInvoices.filter(inv => inv.category === 'spp');
      let sppHtml = '<span style="color: #64748b;">-</span>';
      if (sppInvoices.length > 0) {
        sppHtml = sppInvoices.map(inv => {
          const statusText = inv.status === 'paid' ? 'LUNAS' : inv.status === 'partially_paid' ? 'CICIL' : 'BELUM';
          const bg = inv.status === 'paid' ? '#ecfdf5' : inv.status === 'partially_paid' ? '#fffbeb' : '#fef2f2';
          const color = inv.status === 'paid' ? '#059669' : inv.status === 'partially_paid' ? '#d97706' : '#dc2626';
          const borderColor = inv.status === 'paid' ? '#a7f3d0' : inv.status === 'partially_paid' ? '#fde68a' : '#fca5a5';
          return `<span style="display: inline-block; font-size: 10px; color: ${color}; background: ${bg}; padding: 2px 6px; border-radius: 4px; margin: 2px; border: 1px solid ${borderColor};">${inv.month.split(' ')[0]}: ${statusText}</span>`;
        }).join('');
      }

      // Buku cell
      const bookInvoices = studentInvoices.filter(inv => inv.category === 'buku');
      let bookHtml = '<span style="color: #64748b;">-</span>';
      if (bookInvoices.length > 0) {
        bookHtml = bookInvoices.map(inv => {
          const statusText = inv.status === 'paid' ? 'LUNAS' : inv.status === 'partially_paid' ? 'CICIL' : 'BELUM';
          const bg = inv.status === 'paid' ? '#ecfdf5' : inv.status === 'partially_paid' ? '#fffbeb' : '#fef2f2';
          const color = inv.status === 'paid' ? '#059669' : inv.status === 'partially_paid' ? '#d97706' : '#dc2626';
          const borderColor = inv.status === 'paid' ? '#a7f3d0' : inv.status === 'partially_paid' ? '#fde68a' : '#fca5a5';
          return `<span style="display: inline-block; font-size: 10px; color: ${color}; background: ${bg}; padding: 2px 6px; border-radius: 4px; margin: 2px; border: 1px solid ${borderColor};">${statusText}</span>`;
        }).join('');
      }

      // Total Paid
      let totalPaidAmount = 0;
      studentInvoices.forEach(inv => {
        if (inv.status === 'paid') {
          totalPaidAmount += inv.amount;
        } else if (inv.status === 'partially_paid') {
          totalPaidAmount += inv.amountPaid || 0;
        }
      });
      
      tableRowsHtml += `
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 600;">${st.name}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${regHtml}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${sppHtml}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: center;">${bookHtml}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right; font-family: monospace;">Rp ${totalPaidAmount.toLocaleString('id-ID')}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>LEGER PEMBAYARAN - MATH FINGERS</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 24px; font-weight: 800; tracking: -0.025em; }
            p { text-align: center; margin-top: 0; font-size: 13px; color: #64748b; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { border: 1px solid #e2e8f0; padding: 10px; text-align: left; background: #f8fafc; font-weight: 700; color: #475569; }
            tr:nth-child(even) { background-color: #f8fafc; }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <h1>LEGER REKAPITULASI PEMBAYARAN SISWA</h1>
          <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Cabang: ${students[0]?.branch || 'Semua Cabang'}</p>
          <table>
            <thead>
              <tr>
                <th style="border: 1px solid #e2e8f0; padding: 10px; background: #f8fafc;">NAMA SISWA</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px; background: #f8fafc; text-align: center;">PENDAFTARAN</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px; background: #f8fafc; text-align: center;">SPP BULANAN</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px; background: #f8fafc; text-align: center;">BUKU</th>
                <th style="border: 1px solid #e2e8f0; padding: 10px; background: #f8fafc; text-align: right;">TOTAL TERBAYAR</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getAccentBorderClass = () => 'focus:border-emerald-500 focus:ring-emerald-500/20';

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <History className="text-emerald-500" />
            <span>Buku Besar & Riwayat Pembayaran</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">Laporan mutasi kas masuk, rekapitulasi realisasi iuran pendaftaran, SPP, buku, dan sisa piutang outstanding.</p>
        </div>

        <button
          onClick={handleExportJSON}
          disabled={filteredLedger.length === 0}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-500"
        >
          <FileSpreadsheet size={16} />
          <span>Ekspor Jurnal Mutasi (JSON)</span>
        </button>
      </div>

      {/* Financial Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border transition shadow-sm ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tagihan</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><DollarSign size={14} /></span>
          </div>
          <div className="text-xl font-extrabold font-mono mt-2">{formatRupiah(totalBilled)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Akumulasi iuran terbit</div>
        </div>

        <div className={`p-4 rounded-2xl border transition shadow-sm ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kas Masuk (Realisasi)</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500"><TrendingUp size={14} /></span>
          </div>
          <div className="text-xl font-extrabold font-mono mt-2 text-emerald-500">{formatRupiah(totalRealized)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Lunas + Hasil Cicilan</div>
        </div>

        <div className={`p-4 rounded-2xl border transition shadow-sm ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding (Piutang)</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500"><TrendingDown size={14} /></span>
          </div>
          <div className="text-xl font-extrabold font-mono mt-2 text-rose-500">{formatRupiah(totalOutstanding)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Tagihan belum terbayar</div>
        </div>

        <div className={`p-4 rounded-2xl border transition shadow-sm ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tingkat Kolektibilitas</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500"><Percent size={14} /></span>
          </div>
          <div className="text-xl font-extrabold font-mono mt-2 text-purple-400">{collectionRate.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-500 mt-1">Persentase keberhasilan bayar</div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className={`flex border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} mb-2`}>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`pb-3 px-5 font-bold text-sm border-b-2 transition-all ${
            activeSubTab === 'history'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Riwayat Transaksi & Buku Besar
        </button>
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`pb-3 px-5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'ledger'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>Leger Pembayaran Siswa</span>
        </button>
      </div>

      {activeSubTab === 'history' ? (
        <>
          {/* Filters Area */}
          <div className={`p-4 rounded-2xl border ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari No Invoice, nama siswa, catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                  }`}
                />
              </div>

              {/* Student Filter */}
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-slate-400" size={16} />
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                  }`}
                >
                  <option value="All">Semua Siswa</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="relative">
                <CreditCard className="absolute left-3 top-3.5 text-slate-400" size={16} />
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                  }`}
                >
                  <option value="All">Semua Metode Pembayaran</option>
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Tunai">Uang Tunai</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Ledger Stream */}
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            {filteredLedger.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <History size={44} className="mx-auto text-slate-650 mb-3" />
                <p className="font-medium text-slate-400">Belum ada kas masuk tercatat</p>
                <p className="text-xs text-slate-500 mt-1">Catat pembayaran atau cicilan pada menu Pembayaran untuk memunculkan riwayat kas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                    }`}>
                      <th className="p-4">Tanggal Terima</th>
                      <th className="p-4">No Invoice</th>
                      <th className="p-4">Siswa</th>
                      <th className="p-4">Keterangan / Periode</th>
                      <th className="p-4">Metode & Jenis</th>
                      <th className="p-4">Keterangan</th>
                      <th className="p-4 text-right">Nominal Masuk</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                    {filteredLedger.map((entry) => (
                      <tr key={entry.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-805/10'}`}>
                        <td className="p-4 font-mono text-xs font-semibold">
                          {entry.paidAt}
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-500">
                          {entry.invoiceNo}
                        </td>
                        <td className={`p-4 font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                          {entry.studentName}
                        </td>
                        <td className="p-4 font-medium">
                          {entry.month}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {entry.paymentMethod === 'Transfer' ? (
                              <span className="p-1 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center" title="Transfer Bank">
                                <Landmark size={12} />
                              </span>
                            ) : (
                              <span className="p-1 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center" title="Tunai">
                                <CreditCard size={12} />
                              </span>
                            )}
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                              entry.isPartial 
                                ? 'bg-blue-500/5 text-blue-400 border border-blue-500/10' 
                                : 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/10'
                            }`}>
                              {entry.isPartial ? 'CICILAN' : 'LUNAS'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-xs italic text-slate-400 max-w-xs truncate" title={entry.note}>
                          {entry.note || '-'}
                        </td>
                        <td className="p-4 text-right font-mono font-black text-emerald-500">
                          + {formatRupiah(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        // === LEGER PEMBAYARAN SISWA MATRIX VIEW ===
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Search Input matching exact UI */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari siswa di leger..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                }`}
              />
            </div>

            {/* Print & Export buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Download size={14} />
                <span>Unduh CSV</span>
              </button>

              <button
                onClick={handlePrint}
                className={`border text-xs font-extrabold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer ${
                  isLight 
                    ? 'border-slate-300 hover:bg-slate-100 text-slate-750' 
                    : 'border-slate-700 hover:bg-slate-800 text-white'
                }`}
              >
                <Printer size={14} />
                <span>Cetak Leger</span>
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-800'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-xs font-bold uppercase tracking-wider text-slate-400 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b1329] border-slate-800'
                  }`}>
                    <th className={`p-4 border-r min-w-[200px] ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>Nama Siswa</th>
                    <th className={`p-4 border-r text-center min-w-[150px] ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>Pendaftaran</th>
                    <th className={`p-4 border-r text-center min-w-[200px] ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>SPP Bulanan</th>
                    <th className={`p-4 border-r text-center min-w-[150px] ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>Buku</th>
                    <th className="p-4 text-right min-w-[130px]">Total Bayar</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-sm ${
                  isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800 text-slate-300'
                }`}>
                  {filteredStudentsForLedger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Tidak ada siswa yang cocok dengan pencarian
                      </td>
                    </tr>
                  ) : (
                    filteredStudentsForLedger.map((st) => {
                      const studentInvoices = invoices.filter(inv => inv.studentId === st.id);
                      
                      const regInvoices = studentInvoices.filter(inv => inv.category === 'pendaftaran');
                      const sppInvoices = studentInvoices.filter(inv => inv.category === 'spp');
                      const bookInvoices = studentInvoices.filter(inv => inv.category === 'buku');

                      let totalPaidAmount = 0;
                      studentInvoices.forEach(inv => {
                        if (inv.status === 'paid') {
                          totalPaidAmount += inv.amount;
                        } else if (inv.status === 'partially_paid') {
                          totalPaidAmount += inv.amountPaid || 0;
                        }
                      });

                      return (
                        <tr key={st.id} className={`transition ${
                          isLight ? 'hover:bg-slate-50' : 'hover:bg-[#131d35]'
                        }`}>
                          <td className={`p-4 font-bold border-r ${isLight ? 'border-slate-200' : 'border-slate-800/60'} ${isLight ? 'text-slate-800' : 'text-white'} truncate max-w-[220px]`}>
                            {st.name}
                          </td>
                          
                          {/* Pendaftaran Column */}
                          <td className={`p-4 text-center border-r ${isLight ? 'border-slate-200' : 'border-slate-800/60'}`}>
                            {regInvoices.length === 0 ? (
                              <span className="text-slate-500 font-mono text-xs">-</span>
                            ) : (
                              <div className="flex flex-col gap-1 items-center">
                                {regInvoices.map(inv => (
                                  <span key={inv.id} className={`inline-flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                    inv.status === 'paid'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                      : inv.status === 'partially_paid'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  }`}>
                                    {inv.status === 'paid' ? 'LUNAS' : inv.status === 'partially_paid' ? 'CICIL' : 'BELUM'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* SPP Column */}
                          <td className={`p-4 border-r ${isLight ? 'border-slate-200' : 'border-slate-800/60'}`}>
                            {sppInvoices.length === 0 ? (
                              <div className="text-center text-slate-500 font-mono text-xs">-</div>
                            ) : (
                              <div className="flex flex-wrap gap-1 justify-center max-w-xs mx-auto">
                                {sppInvoices.map(inv => (
                                  <span key={inv.id} className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                                    inv.status === 'paid'
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                      : inv.status === 'partially_paid'
                                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                                      : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                                  }`}>
                                    {inv.month.split(' ')[0]}: {inv.status === 'paid' ? 'LUNAS' : inv.status === 'partially_paid' ? 'CICIL' : 'BELUM'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Buku Column */}
                          <td className={`p-4 text-center border-r ${isLight ? 'border-slate-200' : 'border-slate-800/60'}`}>
                            {bookInvoices.length === 0 ? (
                              <span className="text-slate-500 font-mono text-xs">-</span>
                            ) : (
                              <div className="flex flex-col gap-1 items-center">
                                {bookInvoices.map(inv => (
                                  <span key={inv.id} className={`inline-flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                    inv.status === 'paid'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                      : inv.status === 'partially_paid'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  }`}>
                                    {inv.status === 'paid' ? 'LUNAS' : inv.status === 'partially_paid' ? 'CICIL' : 'BELUM'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Total Terbayar Column */}
                          <td className="p-4 text-right font-mono font-black text-xs text-emerald-400">
                            {formatRupiah(totalPaidAmount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
