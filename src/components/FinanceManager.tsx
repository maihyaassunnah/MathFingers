import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Search, 
  Plus, 
  Trash2, 
  FileText, 
  Download, 
  Printer, 
  Sparkles, 
  Edit,
  ChevronRight,
  Info,
  Layers,
  Image as ImageIcon,
  Wallet
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Student, Invoice, FinanceIncome, FinanceExpense, Branch } from '../types';
import { CustomDropdown } from './CustomDropdown';
import { OfflineIndicator } from './OfflineIndicator';

interface FinanceManagerProps {
  students: Student[];
  invoices: Invoice[];
  manualIncomes: FinanceIncome[];
  expenses: FinanceExpense[];
  onAddManualIncome: (data: Omit<FinanceIncome, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateManualIncome: (id: string, data: Partial<FinanceIncome>) => Promise<void>;
  onDeleteManualIncome: (id: string) => Promise<void>;
  onAddExpense: (data: Omit<FinanceExpense, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateExpense: (id: string, data: Partial<FinanceExpense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  branches: Branch[];
  isSuperAdmin: boolean;
  theme: 'light' | 'dark';
}

type TabType = 'ringkasan' | 'pemasukan' | 'pengeluaran' | 'buku_kas' | 'laporan';

export default function FinanceManager({
  students,
  invoices,
  manualIncomes,
  expenses,
  onAddManualIncome,
  onUpdateManualIncome,
  onDeleteManualIncome,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  branches,
  isSuperAdmin,
  theme
}: FinanceManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<TabType>('ringkasan');
  
  // Modals / Form States
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<FinanceIncome | null>(null);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  
  // Income Form Fields
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().slice(0, 10));
  const [incomeCategory, setIncomeCategory] = useState<'SPP' | 'Uang Pendaftaran' | 'Penjualan Buku' | 'Lainnya'>('Lainnya');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeNotes, setIncomeNotes] = useState('');
  const [incomeBranch, setIncomeBranch] = useState('Pusat');

  // Expense Form Fields
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseCategory, setExpenseCategory] = useState<'Gaji tutor' | 'Fee admin aplikasi' | 'Cetak buku' | 'ATK' | 'Reward siswa' | 'Promosi' | 'Listrik' | 'Internet' | 'Transport' | 'Lainnya'>('Lainnya');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaidTo, setExpensePaidTo] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'Transfer' | 'Tunai'>('Transfer');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseBranch, setExpenseBranch] = useState('Pusat');
  const [expenseReceipt, setExpenseReceipt] = useState<string>('');

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');

  // Date Range Filters for Reports
  const [reportFilterType, setReportFilterType] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'custom'>('bulanan');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));

  // --- DERIVE INCOMES FROM INVOICES ---
  const derivedIncomes = useMemo(() => {
    const list: FinanceIncome[] = [];
    invoices.forEach(inv => {
      // Helper to translate category
      const mapCategory = (cat?: string): 'SPP' | 'Uang Pendaftaran' | 'Penjualan Buku' | 'Lainnya' => {
        if (cat === 'spp') return 'SPP';
        if (cat === 'pendaftaran') return 'Uang Pendaftaran';
        if (cat === 'buku') return 'Penjualan Buku';
        return 'SPP';
      };

      const catName = mapCategory(inv.category);

      if (inv.status === 'paid') {
        if (inv.installments && inv.installments.length > 0) {
          inv.installments.forEach(inst => {
            list.push({
              id: `derived-inst-${inst.id}`,
              date: inst.paidAt,
              category: catName,
              amount: inst.amount,
              source: `Siswa: ${inv.studentName}`,
              notes: `Cicilan Pembayaran ${catName} (${inst.note || 'Lunas'})`,
              invoiceId: inv.id,
              branch: inv.branch || 'Pusat',
              createdAt: inv.createdAt
            });
          });
        } else {
          list.push({
            id: `derived-inv-${inv.id}`,
            date: inv.paidAt || new Date(inv.createdAt).toISOString().slice(0, 10),
            category: catName,
            amount: inv.amountPaid || inv.amount,
            source: `Siswa: ${inv.studentName}`,
            notes: `Pembayaran Lunas ${catName} - Bulan ${inv.month || '-'}`,
            invoiceId: inv.id,
            branch: inv.branch || 'Pusat',
            createdAt: inv.createdAt
          });
        }
      } else if (inv.status === 'partially_paid' && inv.installments && inv.installments.length > 0) {
        inv.installments.forEach(inst => {
          list.push({
            id: `derived-inst-${inst.id}`,
            date: inst.paidAt,
            category: catName,
            amount: inst.amount,
            source: `Siswa: ${inv.studentName}`,
            notes: `Cicilan Pembayaran ${catName} - Bulan ${inv.month || '-'} (${inst.note || ''})`,
            invoiceId: inv.id,
            branch: inv.branch || 'Pusat',
            createdAt: inv.createdAt
          });
        });
      }
    });
    return list;
  }, [invoices]);

  // Combine manual and derived incomes
  const allIncomes = useMemo(() => {
    return [...manualIncomes, ...derivedIncomes].sort((a, b) => b.date.localeCompare(a.date));
  }, [manualIncomes, derivedIncomes]);

  // Format IDR helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatMonthYear = (monthStr: string) => {
    if (!monthStr || monthStr === 'all') return 'Semua Bulan';
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIndex = parseInt(month, 10) - 1;
    return `${monthNames[mIndex] || month} ${year}`;
  };

  // Safe file upload handler for Receipt image
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExpenseReceipt(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isLight = theme === 'light';

  // --- LEDGER / CASH BOOK SEQUENCE GENERATION ---
  const chronologicalLedger = useMemo(() => {
    // Collect all transactions
    const ledgerItems: Array<{
      id: string;
      date: string;
      type: 'masuk' | 'keluar';
      category: string;
      amount: number;
      sourceOrDest: string;
      notes: string;
      branch?: string;
      createdAt: number;
    }> = [];

    // Add incomes
    allIncomes.forEach(inc => {
      ledgerItems.push({
        id: inc.id,
        date: inc.date,
        type: 'masuk',
        category: inc.category,
        amount: inc.amount,
        sourceOrDest: inc.source,
        notes: inc.notes,
        branch: inc.branch,
        createdAt: inc.createdAt
      });
    });

    // Add expenses
    expenses.forEach(exp => {
      ledgerItems.push({
        id: exp.id,
        date: exp.date,
        type: 'keluar',
        category: exp.category,
        amount: exp.amount,
        sourceOrDest: exp.paidTo,
        notes: exp.notes,
        branch: exp.branch,
        createdAt: exp.createdAt
      });
    });

    // Sort chronologically: Date ascending, then createdAt ascending
    ledgerItems.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.createdAt - b.createdAt;
    });

    // Compute running balances
    let runningBalance = 0;
    const ledgerWithBalance = ledgerItems.map(item => {
      if (item.type === 'masuk') {
        runningBalance += item.amount;
      } else {
        runningBalance -= item.amount;
      }
      return {
        ...item,
        balanceAfter: runningBalance
      };
    });

    // Return descending list for presentation, while preserving accurate running balance calculation!
    return ledgerWithBalance.reverse();
  }, [allIncomes, expenses]);

  // --- ACTIVE FILTERED SETS FOR TABLES ---
  const filteredIncomesList = useMemo(() => {
    return allIncomes.filter(inc => {
      const matchesSearch = inc.source.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            inc.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || inc.category === filterCategory;
      const matchesBranch = filterBranch === 'all' || inc.branch === filterBranch;
      const matchesMonth = filterMonth === 'all' || inc.date.slice(0, 7) === filterMonth;
      return matchesSearch && matchesCategory && matchesBranch && matchesMonth;
    });
  }, [allIncomes, searchTerm, filterCategory, filterBranch, filterMonth]);

  const filteredExpensesList = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = exp.paidTo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            exp.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || exp.category === filterCategory;
      const matchesBranch = filterBranch === 'all' || exp.branch === filterBranch;
      const matchesMonth = filterMonth === 'all' || exp.date.slice(0, 7) === filterMonth;
      return matchesSearch && matchesCategory && matchesBranch && matchesMonth;
    });
  }, [expenses, searchTerm, filterCategory, filterBranch, filterMonth]);

  const filteredLedgerList = useMemo(() => {
    return chronologicalLedger.filter(item => {
      const matchesSearch = item.sourceOrDest.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = filterBranch === 'all' || item.branch === filterBranch;
      const matchesMonth = filterMonth === 'all' || item.date.slice(0, 7) === filterMonth;
      return matchesSearch && matchesBranch && matchesMonth;
    });
  }, [chronologicalLedger, searchTerm, filterBranch, filterMonth]);

  // Extract unique months for filter dropdowns
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    // Always include current calendar month
    months.add(new Date().toISOString().slice(0, 7));
    allIncomes.forEach(inc => months.add(inc.date.slice(0, 7)));
    expenses.forEach(exp => months.add(exp.date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [allIncomes, expenses]);

  // --- REPORT FILTERING LOGIC ---
  const reportTransactions = useMemo(() => {
    const today = new Date();
    let startStr = '';
    let endStr = new Date().toISOString().slice(0, 10);

    if (reportFilterType === 'harian') {
      startStr = endStr;
    } else if (reportFilterType === 'mingguan') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startStr = weekAgo.toISOString().slice(0, 10);
    } else if (reportFilterType === 'bulanan') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      // Correct for timezone offset to get YYYY-MM-DD reliably
      startStr = new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    } else if (reportFilterType === 'tahunan') {
      const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
      startStr = new Date(firstDayOfYear.getTime() - firstDayOfYear.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    } else {
      startStr = customStartDate;
      endStr = customEndDate;
    }

    // Combine and filter by branch and date range
    const incomeSubset = allIncomes.filter(inc => {
      const matchesBranch = filterBranch === 'all' || inc.branch === filterBranch;
      return matchesBranch && inc.date >= startStr && inc.date <= endStr;
    });

    const expenseSubset = expenses.filter(exp => {
      const matchesBranch = filterBranch === 'all' || exp.branch === filterBranch;
      return matchesBranch && exp.date >= startStr && exp.date <= endStr;
    });

    return {
      incomes: incomeSubset,
      expenses: expenseSubset,
      startDate: startStr,
      endDate: endStr
    };
  }, [reportFilterType, customStartDate, customEndDate, allIncomes, expenses, filterBranch]);

  // Compute stats for current filter selection
  const currentTotalIncome = useMemo(() => {
    return reportTransactions.incomes.reduce((sum, item) => sum + item.amount, 0);
  }, [reportTransactions]);

  const currentTotalExpense = useMemo(() => {
    return reportTransactions.expenses.reduce((sum, item) => sum + item.amount, 0);
  }, [reportTransactions]);

  const currentNetProfit = currentTotalIncome - currentTotalExpense;

  // Total balance of entire cash book (filtered by selected branch)
  const currentCashBalance = useMemo(() => {
    const branchIncomes = allIncomes.filter(inc => filterBranch === 'all' || inc.branch === filterBranch);
    const branchExpenses = expenses.filter(exp => filterBranch === 'all' || exp.branch === filterBranch);
    const totalInc = branchIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExp = branchExpenses.reduce((sum, item) => sum + item.amount, 0);
    return totalInc - totalExp;
  }, [allIncomes, expenses, filterBranch]);

  // Overall statistics for the summary cards (filtered by selected branch and month)
  const summaryStats = useMemo(() => {
    const currentYearMonth = filterMonth === 'all' ? new Date().toISOString().slice(0, 7) : filterMonth;
    
    const branchIncomes = allIncomes.filter(inc => filterBranch === 'all' || inc.branch === filterBranch);
    const branchExpenses = expenses.filter(exp => filterBranch === 'all' || exp.branch === filterBranch);

    // Total income this month / selected month
    const incomeThisMonth = branchIncomes
      .filter(inc => inc.date.startsWith(currentYearMonth))
      .reduce((sum, inc) => sum + inc.amount, 0);

    // Total expense this month / selected month
    const expenseThisMonth = branchExpenses
      .filter(exp => exp.date.startsWith(currentYearMonth))
      .reduce((sum, exp) => sum + exp.amount, 0);

    return {
      balance: currentCashBalance,
      incomeThisMonth,
      expenseThisMonth,
      netThisMonth: incomeThisMonth - expenseThisMonth
    };
  }, [allIncomes, expenses, currentCashBalance, filterBranch, filterMonth]);

  // Category summary reports
  const categorySummary = useMemo(() => {
    const incomeCats: Record<string, number> = {};
    const expenseCats: Record<string, number> = {};

    reportTransactions.incomes.forEach(inc => {
      incomeCats[inc.category] = (incomeCats[inc.category] || 0) + inc.amount;
    });

    reportTransactions.expenses.forEach(exp => {
      expenseCats[exp.category] = (expenseCats[exp.category] || 0) + exp.amount;
    });

    return {
      incomes: Object.entries(incomeCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      expenses: Object.entries(expenseCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    };
  }, [reportTransactions]);

  // Financial Analytical Insights
  const financialInsights = useMemo(() => {
    const insights: string[] = [];
    
    // Analyze largest income source
    const sources: Record<string, number> = {};
    reportTransactions.incomes.forEach(inc => {
      sources[inc.source] = (sources[inc.source] || 0) + inc.amount;
    });
    const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
    if (topSource) {
      insights.push(`Sumber pemasukan terbesar berasal dari "${topSource[0]}" dengan total nominal ${formatIDR(topSource[1])}.`);
    }

    // Analyze largest expense category
    const topExpenseCat = categorySummary.expenses[0];
    if (topExpenseCat) {
      insights.push(`Kategori pengeluaran terbesar adalah "${topExpenseCat.name}" dengan total penyerapan kas sebesar ${formatIDR(topExpenseCat.value)}.`);
    }

    // Expense ratio insight
    if (currentTotalIncome > 0) {
      const ratio = (currentTotalExpense / currentTotalIncome) * 100;
      if (ratio > 80) {
        insights.push(`Rasio pengeluaran bimbingan belajar mencapai ${ratio.toFixed(1)}% dari total pendapatan. Disarankan melakukan efisiensi kas.`);
      } else if (ratio < 40) {
        insights.push(`Kondisi keuangan sangat sehat dengan rasio biaya operasional hanya sebesar ${ratio.toFixed(1)}% dari total pendapatan.`);
      }
    }

    // Growth insight (comparing with previous month if exists)
    if (insights.length === 0) {
      insights.push("Belum ada data transaksi yang cukup untuk menyusun analisis keuangan komprehensif.");
    }

    return insights;
  }, [reportTransactions, categorySummary, currentTotalIncome, currentTotalExpense]);

  // --- EXPORT FUNCTIONS ---
  const handleExportExcel = () => {
    // Generate clean arrays for Excel worksheets
    const incomeDataExcel = reportTransactions.incomes.map(item => ({
      Tanggal: item.date,
      Kategori: item.category,
      Sumber: item.source,
      Nominal: item.amount,
      Keterangan: item.notes,
      Cabang: item.branch || 'Pusat'
    }));

    const expenseDataExcel = reportTransactions.expenses.map(item => ({
      Tanggal: item.date,
      Kategori: item.category,
      Nominal: item.amount,
      'Dibayar Kepada': item.paidTo,
      'Metode Pembayaran': item.paymentMethod,
      Keterangan: item.notes,
      Cabang: item.branch || 'Pusat'
    }));

    const wb = XLSX.utils.book_new();
    
    const wsIncomes = XLSX.utils.json_to_sheet(incomeDataExcel);
    const wsExpenses = XLSX.utils.json_to_sheet(expenseDataExcel);

    XLSX.utils.book_append_sheet(wb, wsIncomes, "Pemasukan");
    XLSX.utils.book_append_sheet(wb, wsExpenses, "Pengeluaran");

    XLSX.writeFile(wb, `Laporan_Keuangan_MathFingers_${reportTransactions.startDate}_ke_${reportTransactions.endDate}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 14;
    const contentWidth = pageWidth - (marginX * 2); // 182mm
    const bottomMargin = 22;

    const branchLabel = filterBranch === 'all' ? 'Semua Cabang' : `Cabang ${filterBranch}`;
    const printDateStr = new Date().toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    const printDateTimeStr = new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Helper: Draw header on pages
    const drawPageHeader = (isFirstPage: boolean) => {
      if (isFirstPage) {
        // Emerald Header Banner
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.rect(0, 0, pageWidth, 36, "F");

        // Math Fingers Brand
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(18);
        doc.text("MATH FINGERS BIMBEL", marginX, 14);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text("Berhitung Cepat & Akurat Tanpa Alat | Sistem Keuangan Resmi", marginX, 20);

        // Report Title & Period
        doc.setFontSize(11);
        doc.setFont("Helvetica", "bold");
        doc.text("LAPORAN KEUANGAN PERIODIK", marginX, 29.5);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Periode: ${reportTransactions.startDate} s/d ${reportTransactions.endDate} | ${branchLabel}`, pageWidth - marginX, 29.5, { align: "right" });
      } else {
        // Sleek continuation running header for subsequent pages
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageWidth, 13, "F");

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(0, 13, pageWidth, 13);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(16, 185, 129);
        doc.text("MATH FINGERS BIMBEL", marginX, 8.5);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Laporan Keuangan (${reportTransactions.startDate} s/d ${reportTransactions.endDate}) - ${branchLabel}`, pageWidth - marginX, 8.5, { align: "right" });
      }
    };

    // Helper: Draw Incomes Table Header
    const drawIncomesTableHeader = (curY: number) => {
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.roundedRect(marginX, curY, contentWidth, 7, 1, 1, 'F');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("No", marginX + 5, curY + 4.8, { align: "center" });
      doc.text("Tanggal", marginX + 11, curY + 4.8);
      doc.text("Kategori", marginX + 35, curY + 4.8);
      doc.text("Sumber / Keterangan", marginX + 69, curY + 4.8);
      doc.text("Cabang", marginX + 133, curY + 4.8);
      doc.text("Nominal (Rp)", pageWidth - marginX - 3, curY + 4.8, { align: "right" });
      return curY + 7;
    };

    // Helper: Draw Expenses Table Header
    const drawExpensesTableHeader = (curY: number) => {
      doc.setFillColor(225, 29, 72); // rose-600
      doc.roundedRect(marginX, curY, contentWidth, 7, 1, 1, 'F');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("No", marginX + 5, curY + 4.8, { align: "center" });
      doc.text("Tanggal", marginX + 11, curY + 4.8);
      doc.text("Kategori", marginX + 35, curY + 4.8);
      doc.text("Dibayar Kepada / Keterangan", marginX + 67, curY + 4.8);
      doc.text("Metode", marginX + 121, curY + 4.8);
      doc.text("Cabang", marginX + 137, curY + 4.8);
      doc.text("Nominal (Rp)", pageWidth - marginX - 3, curY + 4.8, { align: "right" });
      return curY + 7;
    };

    // 1. Initial Page Header
    drawPageHeader(true);

    // 2. Executive Summary Cards on Page 1
    let y = 41;
    const cardW = (contentWidth - 6) / 3;
    const cardH = 21;

    // Card 1: Total Pemasukan
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(187, 247, 208); // emerald-200
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, y, cardW, cardH, 2, 2, 'FD');

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text("TOTAL PEMASUKAN", marginX + 3.5, y + 5);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(6, 95, 70);
    doc.text(formatIDR(currentTotalIncome), marginX + 3.5, y + 12);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`${reportTransactions.incomes.length} transaksi pemasukan`, marginX + 3.5, y + 17.5);

    // Card 2: Total Pengeluaran
    const card2X = marginX + cardW + 3;
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(254, 205, 211); // rose-200
    doc.roundedRect(card2X, y, cardW, cardH, 2, 2, 'FD');

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(225, 29, 72);
    doc.text("TOTAL PENGELUARAN", card2X + 3.5, y + 5);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(159, 18, 57);
    doc.text(formatIDR(currentTotalExpense), card2X + 3.5, y + 12);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`${reportTransactions.expenses.length} transaksi pengeluaran`, card2X + 3.5, y + 17.5);

    // Card 3: Laba / Rugi Bersih
    const card3X = marginX + (cardW + 3) * 2;
    const isProfit = currentNetProfit >= 0;
    if (isProfit) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
    } else {
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(254, 205, 211);
    }
    doc.roundedRect(card3X, y, cardW, cardH, 2, 2, 'FD');

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    if (isProfit) {
      doc.setTextColor(5, 150, 105);
    } else {
      doc.setTextColor(225, 29, 72);
    }
    doc.text("LABA / RUGI BERSIH", card3X + 3.5, y + 5);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    if (isProfit) {
      doc.setTextColor(6, 95, 70);
    } else {
      doc.setTextColor(159, 18, 57);
    }
    doc.text(formatIDR(currentNetProfit), card3X + 3.5, y + 12);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    if (isProfit) {
      doc.setTextColor(5, 150, 105);
    } else {
      doc.setTextColor(225, 29, 72);
    }
    doc.text(isProfit ? "STATUS: SURPLUS KAS" : "STATUS: DEFISIT KAS", card3X + 3.5, y + 17.5);

    y += cardH + 7;

    // 3. Section: Rincian Pemasukan (Complete List of ALL Incomes)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`1. Rincian Pemasukan (${reportTransactions.incomes.length} Transaksi)`, marginX, y);
    y += 4;

    y = drawIncomesTableHeader(y);

    if (reportTransactions.incomes.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y, contentWidth, 7, 'F');
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Tidak ada data transaksi pemasukan pada periode ini.", marginX + 5, y + 4.8);
      y += 7;
    } else {
      const rowHeight = 6.2;
      reportTransactions.incomes.forEach((inc, idx) => {
        // Page break check
        if (y + rowHeight > pageHeight - bottomMargin) {
          doc.addPage();
          drawPageHeader(false);
          y = 19;
          y = drawIncomesTableHeader(y);
        }

        // Alternating row background
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(marginX, y, contentWidth, rowHeight, 'F');
        }

        // Draw light bottom border
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(marginX, y + rowHeight, marginX + contentWidth, y + rowHeight);

        // Row Content
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);

        // No
        doc.text(String(idx + 1), marginX + 5, y + 4.3, { align: "center" });

        // Tanggal
        doc.text(inc.date, marginX + 11, y + 4.3);

        // Kategori
        doc.setFont("Helvetica", "bold");
        doc.text(inc.category, marginX + 35, y + 4.3);

        // Sumber / Keterangan (Truncate if excessively long)
        doc.setFont("Helvetica", "normal");
        const fullSource = inc.notes ? `${inc.source} (${inc.notes})` : inc.source;
        const formattedSource = fullSource.length > 38 ? fullSource.slice(0, 36) + '...' : fullSource;
        doc.text(formattedSource, marginX + 69, y + 4.3);

        // Cabang
        doc.setTextColor(100, 116, 139);
        doc.text(inc.branch || 'Pusat', marginX + 133, y + 4.3);

        // Nominal
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(5, 150, 105);
        doc.text(formatIDR(inc.amount), pageWidth - marginX - 3, y + 4.3, { align: "right" });

        y += rowHeight;
      });

      // Incomes Subtotal Bar
      if (y + 7 > pageHeight - bottomMargin) {
        doc.addPage();
        drawPageHeader(false);
        y = 19;
      }
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, y, contentWidth, 6.8, 1, 1, 'FD');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(6, 95, 70);
      doc.text(`Subtotal Pemasukan (${reportTransactions.incomes.length} Transaksi)`, marginX + 5, y + 4.6);
      doc.text(formatIDR(currentTotalIncome), pageWidth - marginX - 3, y + 4.6, { align: "right" });
      y += 6.8;
    }

    y += 7;

    // 4. Section: Rincian Pengeluaran (Complete List of ALL Expenses)
    // Check if there's enough room for section header + table header + at least 2 rows (approx 28mm)
    if (y + 28 > pageHeight - bottomMargin) {
      doc.addPage();
      drawPageHeader(false);
      y = 19;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`2. Rincian Pengeluaran (${reportTransactions.expenses.length} Transaksi)`, marginX, y);
    y += 4;

    y = drawExpensesTableHeader(y);

    if (reportTransactions.expenses.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y, contentWidth, 7, 'F');
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Tidak ada data transaksi pengeluaran pada periode ini.", marginX + 5, y + 4.8);
      y += 7;
    } else {
      const rowHeight = 6.2;
      reportTransactions.expenses.forEach((exp, idx) => {
        // Page break check
        if (y + rowHeight > pageHeight - bottomMargin) {
          doc.addPage();
          drawPageHeader(false);
          y = 19;
          y = drawExpensesTableHeader(y);
        }

        // Alternating row background
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(marginX, y, contentWidth, rowHeight, 'F');
        }

        // Draw light bottom border
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(marginX, y + rowHeight, marginX + contentWidth, y + rowHeight);

        // Row Content
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);

        // No
        doc.text(String(idx + 1), marginX + 5, y + 4.3, { align: "center" });

        // Tanggal
        doc.text(exp.date, marginX + 11, y + 4.3);

        // Kategori
        doc.setFont("Helvetica", "bold");
        doc.text(exp.category, marginX + 35, y + 4.3);

        // Dibayar Kepada / Keterangan
        doc.setFont("Helvetica", "normal");
        const fullDetail = exp.notes ? `${exp.paidTo} (${exp.notes})` : exp.paidTo;
        const formattedDetail = fullDetail.length > 32 ? fullDetail.slice(0, 30) + '...' : fullDetail;
        doc.text(formattedDetail, marginX + 67, y + 4.3);

        // Metode
        doc.setTextColor(100, 116, 139);
        doc.text(exp.paymentMethod || 'Transfer', marginX + 121, y + 4.3);

        // Cabang
        doc.text(exp.branch || 'Pusat', marginX + 137, y + 4.3);

        // Nominal
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(225, 29, 72);
        doc.text(formatIDR(exp.amount), pageWidth - marginX - 3, y + 4.3, { align: "right" });

        y += rowHeight;
      });

      // Expenses Subtotal Bar
      if (y + 7 > pageHeight - bottomMargin) {
        doc.addPage();
        drawPageHeader(false);
        y = 19;
      }
      doc.setFillColor(255, 241, 242); // rose-50
      doc.setDrawColor(254, 205, 211); // rose-200
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, y, contentWidth, 6.8, 1, 1, 'FD');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(159, 18, 57);
      doc.text(`Subtotal Pengeluaran (${reportTransactions.expenses.length} Transaksi)`, marginX + 5, y + 4.6);
      doc.text(formatIDR(currentTotalExpense), pageWidth - marginX - 3, y + 4.6, { align: "right" });
      y += 6.8;
    }

    y += 7;

    // 5. Final Summary & Official Signatures
    // Check if there is enough space for summary statement + signature block (approx 48mm)
    if (y + 48 > pageHeight - bottomMargin) {
      doc.addPage();
      drawPageHeader(false);
      y = 19;
    }

    // Final Statement Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, y, contentWidth, 14, 2, 2, 'FD');

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Rekapitulasi Arus Kas:`, marginX + 5, y + 5.5);
    doc.text(`Total Pemasukan: ${formatIDR(currentTotalIncome)}  |  Total Pengeluaran: ${formatIDR(currentTotalExpense)}`, marginX + 5, y + 10);

    doc.setFont("Helvetica", "bold");
    if (isProfit) {
      doc.setTextColor(5, 150, 105);
    } else {
      doc.setTextColor(225, 29, 72);
    }
    doc.text(`SALDO BERSIH: ${formatIDR(currentNetProfit)}`, pageWidth - marginX - 5, y + 8, { align: "right" });

    y += 18;

    // Signatures Section
    const sigY = y;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    // Left: Admin Keuangan
    doc.text(`Mengetahui,`, marginX + 15, sigY);
    doc.text(`Admin Keuangan Math Fingers`, marginX + 15, sigY + 4.5);

    // Right: Pimpinan Lembaga / Kepala Cabang
    doc.text(`Disahkan di Cabang ${filterBranch === 'all' ? 'Pusat' : filterBranch}, ${printDateStr}`, pageWidth - marginX - 65, sigY);
    doc.text(`Pimpinan / Kepala Cabang`, pageWidth - marginX - 65, sigY + 4.5);

    // Signature lines & names
    const sigNameY = sigY + 22;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    doc.text(`( ......................................... )`, marginX + 15, sigNameY);
    doc.line(marginX + 15, sigNameY + 1, marginX + 60, sigNameY + 1);

    doc.text(`( ......................................... )`, pageWidth - marginX - 65, sigNameY);
    doc.line(pageWidth - marginX - 65, sigNameY + 1, pageWidth - marginX - 20, sigNameY + 1);

    // 6. Running Footers & Page Numbering across ALL generated pages
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      // Footer Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, 287, pageWidth - marginX, 287);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);

      // Left Footer
      doc.text(`Sistem Keuangan Math Fingers • Dicetak: ${printDateTimeStr}`, marginX, 291.5);

      // Right Footer: Halaman X dari Y
      doc.setFont("Helvetica", "bold");
      doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - marginX, 291.5, { align: "right" });
    }

    doc.save(`Laporan_Keuangan_MathFingers_${reportTransactions.startDate}_ke_${reportTransactions.endDate}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCloseIncomeModal = () => {
    setEditingIncome(null);
    setIncomeAmount('');
    setIncomeSource('');
    setIncomeNotes('');
    setShowIncomeModal(false);
  };

  const handleCloseExpenseModal = () => {
    setEditingExpense(null);
    setExpenseAmount('');
    setExpensePaidTo('');
    setExpenseNotes('');
    setExpenseReceipt('');
    setShowExpenseModal(false);
  };

  const handleEditIncome = (inc: FinanceIncome) => {
    setEditingIncome(inc);
    setIncomeDate(inc.date);
    setIncomeCategory(inc.category);
    setIncomeAmount(String(inc.amount));
    setIncomeSource(inc.source);
    setIncomeNotes(inc.notes || '');
    setIncomeBranch(inc.branch || 'Pusat');
    setShowIncomeModal(true);
  };

  const handleEditExpense = (exp: FinanceExpense) => {
    setEditingExpense(exp);
    setExpenseDate(exp.date);
    setExpenseCategory(exp.category);
    setExpenseAmount(String(exp.amount));
    setExpensePaidTo(exp.paidTo);
    setExpensePaymentMethod(exp.paymentMethod);
    setExpenseNotes(exp.notes || '');
    setExpenseBranch(exp.branch || 'Pusat');
    setExpenseReceipt(exp.receiptImage || '');
    setShowExpenseModal(true);
  };

  // Handle forms submit
  const handleAddManualIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeAmount || isNaN(Number(incomeAmount)) || !incomeSource) return;
    
    if (editingIncome) {
      await onUpdateManualIncome(editingIncome.id, {
        date: incomeDate,
        category: incomeCategory,
        amount: Number(incomeAmount),
        source: incomeSource,
        notes: incomeNotes,
        branch: incomeBranch
      });
    } else {
      await onAddManualIncome({
        date: incomeDate,
        category: incomeCategory,
        amount: Number(incomeAmount),
        source: incomeSource,
        notes: incomeNotes,
        branch: incomeBranch
      });
    }
    handleCloseIncomeModal();
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || isNaN(Number(expenseAmount)) || !expensePaidTo) return;
    
    if (editingExpense) {
      await onUpdateExpense(editingExpense.id, {
        date: expenseDate,
        category: expenseCategory,
        amount: Number(expenseAmount),
        paidTo: expensePaidTo,
        paymentMethod: expensePaymentMethod,
        notes: expenseNotes,
        receiptImage: expenseReceipt || undefined,
        branch: expenseBranch
      });
    } else {
      await onAddExpense({
        date: expenseDate,
        category: expenseCategory,
        amount: Number(expenseAmount),
        paidTo: expensePaidTo,
        paymentMethod: expensePaymentMethod,
        notes: expenseNotes,
        receiptImage: expenseReceipt || undefined,
        branch: expenseBranch
      });
    }
    handleCloseExpenseModal();
  };

  return (
    <div className={`space-y-6 ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
      
      {/* --- HEADER --- */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dashed ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-500" />
            Manajemen Keuangan
          </h1>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Pantau arus kas masuk, keluar, buku ledger harian, serta analisis laba rugi bimbingan belajar.
          </p>
        </div>
        
        {/* Branch & Month Filters & Quick Stats info */}
        <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto md:items-center md:gap-3">
          {/* Month Filter */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs transition-colors justify-between md:justify-start ${
            isLight 
              ? 'bg-white border-slate-200 shadow-sm' 
              : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className={`hidden md:inline font-semibold ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>Bulan:</span>
            </div>
            <CustomDropdown
              value={filterMonth}
              onChange={(val) => setFilterMonth(val)}
              options={[
                { value: 'all', label: 'Semua Bulan' },
                ...uniqueMonths.map(m => ({
                  value: m,
                  label: formatMonthYear(m)
                }))
              ]}
              theme={theme}
              className="bg-transparent border-none outline-none font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer min-w-[110px]"
            />
          </div>

          {/* Branch Filter */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs transition-colors justify-between md:justify-start ${
            isLight 
              ? 'bg-white border-slate-200 shadow-sm' 
              : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className={`hidden md:inline font-semibold ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>Cabang:</span>
            </div>
            <CustomDropdown
              value={filterBranch}
              onChange={(val) => setFilterBranch(val)}
              options={[
                { value: 'all', label: 'Semua Cabang' },
                ...branches.map(b => ({
                  value: b.name,
                  label: b.name
                }))
              ]}
              theme={theme}
              className="bg-transparent border-none outline-none font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer min-w-[110px]"
            />
          </div>
        </div>
      </div>

      {/* --- INTERNAL MENUS (SUB TABS) --- */}
      <div className={`flex overflow-x-auto no-scrollbar flex-nowrap items-center gap-1.5 p-1 rounded-2xl border transition-all max-w-full md:max-w-2xl ${
        isLight 
          ? 'bg-white border-slate-200/80 shadow-sm' 
          : 'bg-slate-900/80 border-slate-800/30'
      }`}>
        {[
          { id: 'ringkasan', label: 'Ringkasan', icon: DollarSign },
          { id: 'pemasukan', label: 'Pemasukan', icon: ArrowUpRight },
          { id: 'pengeluaran', label: 'Pengeluaran', icon: ArrowDownRight },
          { id: 'buku_kas', label: 'Buku Kas (Ledger)', icon: Calendar },
          { id: 'laporan', label: 'Laporan & Ekspor', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as TabType);
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                isActive 
                  ? (isLight 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'bg-slate-800 text-emerald-400 shadow-sm') 
                  : (isLight 
                    ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' 
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50')
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* --- CONTENT ROUTER --- */}
      
      {/* 1. RINGKASAN */}
      {activeSubTab === 'ringkasan' && (
        <div className="space-y-6 animate-page-fade-in">
          {/* Core Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-5 rounded-3xl border shadow-sm relative overflow-hidden transition-all ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800' 
                : 'bg-emerald-950/20 border-emerald-900/50 text-slate-100'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] font-bold block tracking-wider uppercase ${isLight ? 'text-slate-400' : 'text-emerald-400'}`}>Saldo Kas Saat Ini</span>
                  <span className="text-2xl font-black mt-1.5 block tracking-tight text-emerald-600 dark:text-emerald-400">{formatIDR(summaryStats.balance)}</span>
                </div>
                <div className={`p-3 rounded-2xl ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/5 rounded-full" />
            </div>

            <div className={`p-5 rounded-3xl border shadow-sm transition-all ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800' 
                : 'bg-slate-900/50 border-slate-800/40 text-slate-100'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] font-bold block tracking-wider uppercase ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>
                    {filterMonth === 'all' ? 'Pemasukan Bulan Ini' : `Pemasukan ${formatMonthYear(filterMonth)}`}
                  </span>
                  <span className="text-2xl font-black mt-1.5 block tracking-tight text-emerald-600 dark:text-emerald-400">{formatIDR(summaryStats.incomeThisMonth)}</span>
                </div>
                <div className={`p-3 rounded-2xl ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-3xl border shadow-sm transition-all ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800' 
                : 'bg-slate-900/50 border-slate-800/40 text-slate-100'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] font-bold block tracking-wider uppercase ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>
                    {filterMonth === 'all' ? 'Pengeluaran Bulan Ini' : `Pengeluaran ${formatMonthYear(filterMonth)}`}
                  </span>
                  <span className="text-2xl font-black mt-1.5 block tracking-tight text-rose-600 dark:text-rose-400">{formatIDR(summaryStats.expenseThisMonth)}</span>
                </div>
                <div className={`p-3 rounded-2xl ${isLight ? 'bg-rose-50 text-rose-600' : 'bg-rose-500/10 text-rose-500'}`}>
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-3xl border shadow-sm transition-all ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800' 
                : (summaryStats.netThisMonth >= 0 
                  ? 'bg-sky-950/10 border-sky-900/40 text-slate-100' 
                  : 'bg-rose-950/10 border-rose-900/40 text-slate-100')
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] font-bold block tracking-wider uppercase ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>
                    {filterMonth === 'all' ? 'Profit Bersih Bulan Ini' : `Profit ${formatMonthYear(filterMonth)}`}
                  </span>
                  <span className={`text-2xl font-black mt-1.5 block tracking-tight ${
                    summaryStats.netThisMonth >= 0 
                      ? (isLight ? 'text-sky-600' : 'text-sky-400') 
                      : 'text-rose-600'
                  }`}>
                    {formatIDR(summaryStats.netThisMonth)}
                  </span>
                </div>
                <div className={`p-3 rounded-2xl ${
                  summaryStats.netThisMonth >= 0 
                    ? (isLight ? 'bg-sky-50 text-sky-600' : 'bg-sky-500/10 text-sky-500') 
                    : (isLight ? 'bg-rose-50 text-rose-600' : 'bg-rose-500/10 text-rose-500')
                }`}>
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Graphical Summary & Insight Blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Custom Interactive SVG Graph showing Category Distribution */}
            <div className={`lg:col-span-2 p-6 rounded-3xl border shadow-sm space-y-4 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800' 
                : 'bg-slate-900 border-slate-800/50 text-slate-100'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold">Sebaran Pemasukan & Pengeluaran Periodik</h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Saran representasi visual aliran dana masuk dan keluar bimbingan belajar.</p>
                </div>
              </div>

              {/* Custom SVG Bar Chart */}
              <div className={`h-64 flex items-end justify-between gap-4 pt-6 border-b pb-1 ${
                isLight ? 'border-slate-200' : 'border-slate-800/50'
              }`}>
                {/* Simulated Monthly Bars for the past 5 months */}
                {[
                  { month: 'Apr', in: 1200000, out: 800000 },
                  { month: 'Mei', in: 1850000, out: 1100000 },
                  { month: 'Jun', in: 2400000, out: 1450000 },
                  { month: 'Jul', in: 3100000, out: 1900000 },
                  { month: 'Agt (Kini)', in: summaryStats.incomeThisMonth || 800000, out: summaryStats.expenseThisMonth || 50000 }
                ].map((bar, idx) => {
                  const maxVal = 4000000;
                  const inHeight = Math.min(100, (bar.in / maxVal) * 100);
                  const outHeight = Math.min(100, (bar.out / maxVal) * 100);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="flex items-end gap-1 w-full max-w-[48px] h-full justify-center">
                        {/* Income Bar */}
                        <div 
                          style={{ height: `${inHeight}%` }} 
                          className="w-4 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 rounded-t-sm transition-all relative"
                          title={`Masuk: ${formatIDR(bar.in)}`}
                        >
                          <span className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10 font-sans">
                            + {formatIDR(bar.in)}
                          </span>
                        </div>
                        {/* Expense Bar */}
                        <div 
                          style={{ height: `${outHeight}%` }} 
                          className="w-4 bg-rose-400 hover:bg-rose-500 dark:bg-rose-500 rounded-t-sm transition-all relative"
                          title={`Keluar: ${formatIDR(bar.out)}`}
                        >
                          <span className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10 font-sans">
                            - {formatIDR(bar.out)}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{bar.month}</span>
                    </div>
                  );
                })}
              </div>

              {/* Legends */}
              <div className="flex items-center gap-4 text-xs pt-1 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Pemasukan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-rose-400 rounded-sm" />
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Pengeluaran</span>
                </div>
              </div>
            </div>

            {/* Smart Analytical Insight block */}
            <div className={`hidden lg:block p-6 rounded-3xl border shadow-sm space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900/40 border-slate-800/40 text-slate-100'
            }`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Analisis Keuangan Pintar
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-450' : 'text-slate-400'}`}>
                Kecerdasan analisis dari data transaksi kas bimbingan belajar periode ini.
              </p>

              <div className="space-y-3 pt-2">
                {financialInsights.map((insight, index) => (
                  <div key={index} className={`flex gap-2.5 items-start p-3 rounded-2xl border text-xs leading-relaxed transition-all ${
                    isLight 
                      ? 'bg-slate-50/70 border-slate-100 text-slate-700' 
                      : 'bg-slate-900 border-slate-800/50 text-slate-300'
                  }`}>
                    <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PEMASUKAN */}
      {activeSubTab === 'pemasukan' && (
        <div className="space-y-4 animate-page-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search and filter header */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari sumber/keterangan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-9 pr-4 py-2 text-xs rounded-xl border w-60 outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${
                    isLight 
                      ? 'border-slate-200 bg-white text-slate-800 shadow-sm' 
                      : 'border-slate-800 bg-slate-900 text-slate-100'
                  }`}
                />
              </div>

              <CustomDropdown
                value={filterCategory}
                onChange={(val) => setFilterCategory(val)}
                options={[
                  { value: 'all', label: 'Semua Kategori' },
                  { value: 'SPP', label: 'SPP' },
                  { value: 'Uang Pendaftaran', label: 'Uang Pendaftaran' },
                  { value: 'Penjualan Buku', label: 'Penjualan Buku' },
                  { value: 'Lainnya', label: 'Lainnya' }
                ]}
                theme={theme}
                className="w-40"
              />

              <CustomDropdown
                value={filterMonth}
                onChange={(val) => setFilterMonth(val)}
                options={[
                  { value: 'all', label: 'Semua Bulan' },
                  ...uniqueMonths.map(m => ({ value: m, label: m }))
                ]}
                theme={theme}
                className="w-40"
              />
            </div>

            <button
              onClick={() => setShowIncomeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/10"
            >
              <Plus className="w-4 h-4" />
              Tambah Pemasukan Manual
            </button>
          </div>

          {/* Table */}
          <div className={`overflow-x-auto rounded-2xl border ${
            isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800/60 bg-slate-900'
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-slate-500 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900 border-slate-800/60'
                }`}>
                  <th className="p-4 font-bold">No</th>
                  <th className="p-4 font-bold">Tanggal</th>
                  <th className="p-4 font-bold">Kategori</th>
                  <th className="p-4 font-bold">Sumber</th>
                  <th className="p-4 font-bold">Nominal</th>
                  <th className="p-4 font-bold">Keterangan</th>
                  <th className="p-4 font-bold">Cabang</th>
                  <th className="p-4 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isLight ? 'divide-slate-100' : 'divide-slate-800/40'
              }`}>
                {filteredIncomesList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                      Tidak ada transaksi pemasukan yang cocok dengan filter Anda.
                    </td>
                  </tr>
                ) : (
                  filteredIncomesList.map((inc, index) => (
                    <tr key={inc.id} className={isLight ? 'hover:bg-slate-50/50 transition-colors' : 'hover:bg-slate-800/20 transition-colors'}>
                      <td className={`p-4 font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{index + 1}</td>
                      <td className="p-4 font-semibold">{inc.date}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inc.category === 'SPP' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300' :
                          inc.category === 'Uang Pendaftaran' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                          inc.category === 'Penjualan Buku' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                          'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                        }`}>
                          {inc.category}
                        </span>
                      </td>
                      <td className="p-4 font-medium">{inc.source}</td>
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(inc.amount)}</td>
                      <td className={`p-4 max-w-xs truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{inc.notes || '-'}</td>
                      <td className={`p-4 font-medium ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>{inc.branch || 'Pusat'}</td>
                      <td className="p-4 text-center">
                        {inc.id.startsWith('derived-') ? (
                          <span className={`text-[10px] italic block ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Otomatis Pembayaran SPP</span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditIncome(inc)}
                              className="p-1 text-slate-400 hover:text-emerald-500 transition-colors"
                              title="Edit pemasukan manual"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteManualIncome(inc.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                              title="Hapus pemasukan manual"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PENGELUARAN */}
      {activeSubTab === 'pengeluaran' && (
        <div className="space-y-4 animate-page-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search and filter header */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari penerima/keterangan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-9 pr-4 py-2 text-xs rounded-xl border w-60 outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${
                    isLight 
                      ? 'border-slate-200 bg-white text-slate-800 shadow-sm' 
                      : 'border-slate-800 bg-slate-900 text-slate-100'
                  }`}
                />
              </div>

              <CustomDropdown
                value={filterCategory}
                onChange={(val) => setFilterCategory(val)}
                options={[
                  { value: 'all', label: 'Semua Kategori' },
                  { value: 'Gaji tutor', label: 'Gaji tutor' },
                  { value: 'Fee admin aplikasi', label: 'Fee admin aplikasi' },
                  { value: 'Cetak buku', label: 'Cetak buku' },
                  { value: 'ATK', label: 'ATK' },
                  { value: 'Reward siswa', label: 'Reward siswa' },
                  { value: 'Promosi', label: 'Promosi' },
                  { value: 'Listrik', label: 'Listrik' },
                  { value: 'Internet', label: 'Internet' },
                  { value: 'Transport', label: 'Transport' },
                  { value: 'Lainnya', label: 'Lainnya' }
                ]}
                theme={theme}
                className="w-40"
              />

              <CustomDropdown
                value={filterMonth}
                onChange={(val) => setFilterMonth(val)}
                options={[
                  { value: 'all', label: 'Semua Bulan' },
                  ...uniqueMonths.map(m => ({ value: m, label: m }))
                ]}
                theme={theme}
                className="w-40"
              />
            </div>

            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-600/10"
            >
              <Plus className="w-4 h-4" />
              Catat Pengeluaran Baru
            </button>
          </div>

          {/* Table */}
          <div className={`overflow-x-auto rounded-2xl border ${
            isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800/60 bg-slate-900'
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-slate-500 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900 border-slate-800/60'
                }`}>
                  <th className="p-4 font-bold">No</th>
                  <th className="p-4 font-bold">Tanggal</th>
                  <th className="p-4 font-bold">Kategori</th>
                  <th className="p-4 font-bold">Dibayar Kepada</th>
                  <th className="p-4 font-bold">Metode</th>
                  <th className="p-4 font-bold">Nominal</th>
                  <th className="p-4 font-bold">Bukti</th>
                  <th className="p-4 font-bold">Keterangan</th>
                  <th className="p-4 font-bold">Cabang</th>
                  <th className="p-4 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isLight ? 'divide-slate-100' : 'divide-slate-800/40'
              }`}>
                {filteredExpensesList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                      Tidak ada catatan pengeluaran yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredExpensesList.map((exp, index) => (
                    <tr key={exp.id} className={isLight ? 'hover:bg-slate-50/50 transition-colors' : 'hover:bg-slate-800/20 transition-colors'}>
                      <td className={`p-4 font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{index + 1}</td>
                      <td className="p-4 font-semibold">{exp.date}</td>
                      <td className="p-4 font-medium">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-4 font-medium">{exp.paidTo}</td>
                      <td className={`p-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{exp.paymentMethod}</td>
                      <td className="p-4 font-bold text-rose-600 dark:text-rose-400">{formatIDR(exp.amount)}</td>
                      <td className="p-4">
                        {exp.receiptImage ? (
                          <a 
                            href={exp.receiptImage} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                              isLight 
                                ? 'bg-slate-100 hover:bg-slate-200 text-emerald-600' 
                                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                            }`}
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            Lihat Bukti
                          </a>
                        ) : (
                          <span className={isLight ? 'text-slate-400 italic' : 'text-slate-500 italic'}>Tidak ada</span>
                        )}
                      </td>
                      <td className={`p-4 max-w-xs truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{exp.notes || '-'}</td>
                      <td className={`p-4 font-medium ${isLight ? 'text-slate-600' : 'text-slate-505'}`}>{exp.branch || 'Pusat'}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditExpense(exp)}
                            className="p-1 text-slate-400 hover:text-emerald-500 transition-colors"
                            title="Edit pengeluaran"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteExpense(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Hapus transaksi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BUKU KAS (LEDGER) */}
      {activeSubTab === 'buku_kas' && (
        <div className="space-y-4 animate-page-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Aliran Kas Chronological Ledger
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-9 pr-4 py-2 text-xs rounded-xl border w-60 outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${
                    isLight 
                      ? 'border-slate-200 bg-white text-slate-800 shadow-sm' 
                      : 'border-slate-800 bg-slate-900 text-slate-100'
                  }`}
                />
              </div>

              <CustomDropdown
                value={filterMonth}
                onChange={(val) => setFilterMonth(val)}
                options={[
                  { value: 'all', label: 'Semua Bulan' },
                  ...uniqueMonths.map(m => ({ value: m, label: m }))
                ]}
                theme={theme}
                className="w-40"
              />
            </div>
          </div>

          {/* Ledger view with progressive running balance calculation */}
          <div className={`overflow-x-auto rounded-2xl border ${
            isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800/60 bg-slate-900'
          }`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-slate-500 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900 border-slate-800/60'
                }`}>
                  <th className="p-4 font-bold">Tanggal</th>
                  <th className="p-4 font-bold">Keterangan</th>
                  <th className="p-4 font-bold text-emerald-600">Masuk</th>
                  <th className="p-4 font-bold text-rose-600">Keluar</th>
                  <th className={`p-4 font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Saldo Akhir</th>
                  <th className="p-4 font-bold">Cabang</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isLight ? 'divide-slate-100' : 'divide-slate-800/40'
              }`}>
                {filteredLedgerList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                      Buku kas masih kosong untuk filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredLedgerList.map((item) => (
                    <tr key={item.id} className={isLight ? 'hover:bg-slate-50/50 transition-colors' : 'hover:bg-slate-800/20 transition-colors'}>
                      <td className="p-4 font-semibold">{item.date}</td>
                      <td className="p-4">
                        <div className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{item.notes}</div>
                        <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.type === 'masuk' ? `Sumber: ${item.sourceOrDest}` : `Tujuan: ${item.sourceOrDest}`} | Kategori: {item.category}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {item.type === 'masuk' ? formatIDR(item.amount) : '-'}
                      </td>
                      <td className="p-4 font-bold text-rose-600 dark:text-rose-400">
                        {item.type === 'keluar' ? formatIDR(item.amount) : '-'}
                      </td>
                      <td className={`p-4 font-black font-mono ${
                        isLight ? 'text-slate-800 bg-slate-50/45' : 'text-white bg-slate-900/40'
                      }`}>
                        {formatIDR(item.balanceAfter)}
                      </td>
                      <td className={`p-4 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{item.branch || 'Pusat'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. LAPORAN & EKSPOR */}
      {activeSubTab === 'laporan' && (
        <div className="space-y-6 animate-page-fade-in">
          <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900/50 border-slate-800/40 text-slate-100'
          }`}>
            <h3 className="text-sm font-bold">Filter Rentang Laporan</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className={`text-[11px] font-bold block mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Rentang Waktu</label>
                <CustomDropdown
                  value={reportFilterType}
                  onChange={(val) => setReportFilterType(val as any)}
                  options={[
                    { value: 'harian', label: 'Hari Ini' },
                    { value: 'mingguan', label: '7 Hari Terakhir' },
                    { value: 'bulanan', label: 'Bulan Ini' },
                    { value: 'tahunan', label: 'Tahun Ini' },
                    { value: 'custom', label: 'Atur Manual (Rentang)' }
                  ]}
                  theme={theme}
                  className="w-full"
                />
              </div>

              {reportFilterType === 'custom' && (
                <>
                  <div>
                    <label className={`text-[11px] font-bold block mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Mulai Tanggal</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                        isLight 
                          ? 'border-slate-200 bg-white text-slate-800 shadow-sm' 
                          : 'border-slate-800 bg-slate-900 text-slate-100'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-[11px] font-bold block mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Sampai Tanggal</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                        isLight 
                          ? 'border-slate-200 bg-white text-slate-800 shadow-sm' 
                          : 'border-slate-800 bg-slate-900 text-slate-100'
                      }`}
                    />
                  </div>
                </>
              )}

              <div className="md:col-start-4 flex gap-2">
                <button
                  onClick={handleExportPDF}
                  className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/10"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-600/10"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={handlePrint}
                  className={`p-2 active:scale-95 rounded-xl transition-all ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title="Cetak Laporan"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Report Breakdown Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left side category breakdown */}
            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800/50 text-slate-100'
            }`}>
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Rekap Pemasukan per Kategori</h4>
              <div className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/40'}`}>
                {categorySummary.incomes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">Belum ada pemasukan pada rentang ini.</p>
                ) : (
                  categorySummary.incomes.map((cat, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2.5 text-xs">
                      <span className="font-semibold">{cat.name}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(cat.value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800/50 text-slate-100'
            }`}>
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Rekap Pengeluaran per Kategori</h4>
              <div className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/40'}`}>
                {categorySummary.expenses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">Belum ada pengeluaran pada rentang ini.</p>
                ) : (
                  categorySummary.expenses.map((cat, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2.5 text-xs">
                      <span className="font-semibold">{cat.name}</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{formatIDR(cat.value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Overall profit statement card */}
            <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900/50 border-slate-800/40 text-slate-100'
            }`}>
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Pernyataan Kas Laba/Rugi</h4>
                <div className="space-y-3 pt-4">
                  <div className={`flex justify-between items-center text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span>Total Pemasukan:</span>
                    <span className="font-bold text-emerald-600">{formatIDR(currentTotalIncome)}</span>
                  </div>
                  <div className={`flex justify-between items-center text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span>Total Pengeluaran:</span>
                    <span className="font-bold text-rose-600">{formatIDR(currentTotalExpense)}</span>
                  </div>
                  <hr className={`border-dashed ${isLight ? 'border-slate-200' : 'border-slate-800'}`} />
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Laba Bersih:</span>
                    <span className={currentNetProfit >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                      {formatIDR(currentNetProfit)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`pt-4 text-[11px] leading-relaxed border-t border-dashed mt-4 ${
                isLight ? 'text-slate-450 border-slate-200' : 'text-slate-500 border-slate-800'
              }`}>
                Pernyataan di atas didasarkan pada kalkulasi otomatis seluruh kas operasional (termasuk SPP, uang registrasi siswa, serta operasional bimbingan belajar).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD INCOME MODAL --- */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto z-50 pt-16 pb-16">
          <div className={`rounded-3xl max-w-md w-full border overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className={`p-5 border-b flex justify-between items-center ${
              isLight ? 'border-slate-100 bg-emerald-50' : 'border-slate-800 bg-emerald-500/5'
            }`}>
              <h3 className="font-black text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                {editingIncome ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingIncome ? 'Edit Pemasukan' : 'Tambah Pemasukan Manual'}
              </h3>
              <button 
                onClick={handleCloseIncomeModal} 
                className={`text-xs font-bold hover:underline ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Batal
              </button>
            </div>
            
            <form onSubmit={handleAddManualIncomeSubmit} className="p-5 space-y-4 text-xs">
              <OfflineIndicator theme={theme} className="mb-2" />
              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Tanggal Transaksi</label>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${
                    isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Kategori Pemasukan</label>
                <CustomDropdown
                  value={incomeCategory}
                  onChange={(val) => setIncomeCategory(val as any)}
                  options={[
                    { value: 'Lainnya', label: 'Lainnya (Sponsor, Jasa Lain)' },
                    { value: 'SPP', label: 'SPP' },
                    { value: 'Uang Pendaftaran', label: 'Uang Pendaftaran' },
                    { value: 'Penjualan Buku', label: 'Penjualan Buku' }
                  ]}
                  theme={theme}
                  className="w-full"
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Sumber Dana</label>
                <input
                  type="text"
                  placeholder="Contoh: Sponsor Utama, Kas Awal"
                  value={incomeSource}
                  onChange={(e) => setIncomeSource(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${
                    isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Nominal Pemasukan (IDR)</label>
                <input
                  type="number"
                  placeholder="Contoh: 500000"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:ring-1 focus:ring-emerald-500 font-bold transition-all ${
                    isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Keterangan Tambahan</label>
                <textarea
                  placeholder="Tulis detail singkat jika diperlukan..."
                  value={incomeNotes}
                  onChange={(e) => setIncomeNotes(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${
                    isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Cabang Alokasi</label>
                <CustomDropdown
                  value={incomeBranch}
                  onChange={(val) => setIncomeBranch(val)}
                  options={branches.map(b => ({ value: b.name, label: b.name }))}
                  theme={theme}
                  className="w-full"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/10"
              >
                {editingIncome ? 'Simpan Perubahan' : 'Simpan Pemasukan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD EXPENSE MODAL --- */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto z-50 pt-16 pb-16">
          <div className={`rounded-3xl max-w-md w-full border overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className={`p-5 border-b flex justify-between items-center ${
              isLight ? 'border-slate-100 bg-rose-50' : 'border-slate-800 bg-rose-500/5'
            }`}>
              <h3 className="font-black text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                {editingExpense ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingExpense ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}
              </h3>
              <button 
                onClick={handleCloseExpenseModal} 
                className={`text-xs font-bold hover:underline ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Batal
              </button>
            </div>
            
            <form onSubmit={handleAddExpenseSubmit} className="p-5 space-y-4 text-xs">
              <OfflineIndicator theme={theme} className="mb-2" />
              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Tanggal Transaksi</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:ring-1 focus:ring-rose-500 transition-all ${
                    isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Kategori Pengeluaran</label>
                <CustomDropdown
                  value={expenseCategory}
                  onChange={(val) => setExpenseCategory(val as any)}
                  options={[
                    { value: 'Lainnya', label: 'Lainnya' },
                    { value: 'Gaji tutor', label: 'Gaji tutor' },
                    { value: 'Fee admin aplikasi', label: 'Fee admin aplikasi' },
                    { value: 'Cetak buku', label: 'Cetak buku' },
                    { value: 'ATK', label: 'ATK' },
                    { value: 'Reward siswa', label: 'Reward siswa' },
                    { value: 'Promosi', label: 'Promosi' },
                    { value: 'Listrik', label: 'Listrik' },
                    { value: 'Internet', label: 'Internet' },
                    { value: 'Transport', label: 'Transport' }
                  ]}
                  theme={theme}
                  className="w-full"
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Dibayar Kepada</label>
                <input
                  type="text"
                  placeholder="Contoh: Percetakan Jaya, Ibu Maria (Tutor)"
                  value={expensePaidTo}
                  onChange={(e) => setExpensePaidTo(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:ring-1 focus:ring-rose-500 transition-all ${
                    isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Metode Pembayaran</label>
                <CustomDropdown
                  value={expensePaymentMethod}
                  onChange={(val) => setExpensePaymentMethod(val as any)}
                  options={[
                    { value: 'Transfer', label: 'Transfer Bank' },
                    { value: 'Tunai', label: 'Tunai / Cash' }
                  ]}
                  theme={theme}
                  className="w-full"
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Nominal Pengeluaran (IDR)</label>
                <input
                  type="number"
                  placeholder="Contoh: 150000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:ring-1 focus:ring-rose-500 font-bold transition-all ${
                    isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Unggah Bukti Pembayaran / Receipt (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                />
                {expenseReceipt && (
                  <div className="mt-2 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    Bukti pembayaran berhasil diunggah!
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Keterangan Tambahan</label>
                <textarea
                  placeholder="Tulis detail singkat jika diperlukan..."
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:ring-1 focus:ring-rose-500 transition-all ${
                    isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold mb-1.5 uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Cabang Alokasi</label>
                <CustomDropdown
                  value={expenseBranch}
                  onChange={(val) => setExpenseBranch(val)}
                  options={branches.map(b => ({ value: b.name, label: b.name }))}
                  theme={theme}
                  className="w-full"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-600/10"
              >
                {editingExpense ? 'Simpan Perubahan' : 'Catat Pengeluaran'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
