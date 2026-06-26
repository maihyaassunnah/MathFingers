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
  FileSpreadsheet
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');

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

  const getAccentBorderClass = () => 'focus:border-emerald-500 focus:ring-emerald-500/20';

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <History className="text-emerald-500" />
            <span>Buku Besar & Riwayat SPP</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">Laporan mutasi kas masuk, rekapitulasi realisasi iuran, dan sisa piutang outstanding.</p>
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
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tagihan SPP</span>
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
            <p className="text-xs text-slate-500 mt-1">Catat pembayaran SPP atau cicilan pada tab SPP untuk memunculkan riwayat kas.</p>
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
                  <th className="p-4">Periode Bulan</th>
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
    </div>
  );
}
