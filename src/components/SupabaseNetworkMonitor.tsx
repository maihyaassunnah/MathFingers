import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Database, 
  AlertTriangle, 
  Search, 
  Trash2, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Clock, 
  HardDrive, 
  RefreshCw, 
  ShieldAlert, 
  Copy, 
  Check, 
  Layers, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import { networkMonitor, NetworkLogEntry, NetworkStats, formatBytes } from '../services/networkMonitor';
import { supabase } from '../supabase';

interface SupabaseNetworkMonitorProps {
  theme?: 'light' | 'dark';
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean; // When rendered directly inside SQL Editor or Settings tab
}

interface TableAuditResult {
  table: string;
  count: number;
  totalSizeBytes: number;
  avgRowSizeBytes: number;
  status: 'optimal' | 'moderate' | 'heavy' | 'error';
  errorMsg?: string;
  heavyFields?: string[];
}

export const SupabaseNetworkMonitor: React.FC<SupabaseNetworkMonitorProps> = ({
  theme = 'dark',
  isOpen = true,
  onClose,
  isEmbedded = false
}) => {
  const [logs, setLogs] = useState<NetworkLogEntry[]>([]);
  const [stats, setStats] = useState<NetworkStats>({
    totalRequests: 0,
    totalEgressBytes: 0,
    totalIngressBytes: 0,
    avgDurationMs: 0,
    largeTransfersCount: 0,
    tableStats: {}
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [tableFilter, setTableFilter] = useState<string>('ALL');
  const [onlyLargeTransfers, setOnlyLargeTransfers] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Table audit benchmarking states
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<TableAuditResult[] | null>(null);
  const [auditProgress, setAuditProgress] = useState<string>('');

  const isLight = theme === 'light';

  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe((newLogs, newStats) => {
      setLogs(newLogs);
      setStats(newStats);
    });
    return () => unsubscribe();
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (onlyLargeTransfers && !log.isLargeEgress && !log.isLargeIngress) return false;
      if (methodFilter !== 'ALL' && log.method !== methodFilter) return false;
      if (tableFilter !== 'ALL' && log.table !== tableFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesUrl = log.url.toLowerCase().includes(q);
        const matchesTable = log.table.toLowerCase().includes(q);
        const matchesStatus = log.status.toString().includes(q);
        if (!matchesUrl && !matchesTable && !matchesStatus) return false;
      }
      return true;
    });
  }, [logs, searchQuery, methodFilter, tableFilter, onlyLargeTransfers]);

  // Unique tables recorded in logs
  const recordedTables = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.table) set.add(l.table);
    });
    return Array.from(set);
  }, [logs]);

  // Handle Copy Payload
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Run Table Payload Audit Benchmark
  const runTableAudit = async () => {
    if (!supabase) {
      alert('Klien Supabase belum dikonfigurasi.');
      return;
    }

    setIsAuditing(true);
    setAuditResults(null);

    const tablesToAudit = [
      'students',
      'attendance',
      'grades',
      'notes',
      'invoices',
      'classes',
      'materials',
      'branches',
      'admin_users',
      'finance_incomes',
      'finance_expenses',
      'behavior_assessments',
      'app_settings'
    ];

    const results: TableAuditResult[] = [];

    for (let i = 0; i < tablesToAudit.length; i++) {
      const tbl = tablesToAudit[i];
      setAuditProgress(`Mengukur tabel ${tbl} (${i + 1}/${tablesToAudit.length})...`);
      try {
        const { data, error } = await supabase.from(tbl).select('*');
        if (error) {
          results.push({
            table: tbl,
            count: 0,
            totalSizeBytes: 0,
            avgRowSizeBytes: 0,
            status: 'error',
            errorMsg: error.message
          });
        } else {
          const jsonStr = JSON.stringify(data || []);
          const totalSizeBytes = new Blob([jsonStr]).size;
          const count = Array.isArray(data) ? data.length : 0;
          const avgRowSizeBytes = count > 0 ? Math.round(totalSizeBytes / count) : 0;

          // Identify heavy fields
          const heavyFields: string[] = [];
          if (Array.isArray(data) && data.length > 0) {
            const firstFew = data.slice(0, 5);
            firstFew.forEach((row: any) => {
              Object.entries(row).forEach(([k, v]) => {
                if (v && typeof v === 'string' && v.length > 2000) {
                  if (!heavyFields.includes(k)) heavyFields.push(k);
                }
              });
            });
          }

          let status: 'optimal' | 'moderate' | 'heavy' = 'optimal';
          if (totalSizeBytes > 500 * 1024) status = 'heavy';
          else if (totalSizeBytes > 100 * 1024) status = 'moderate';

          results.push({
            table: tbl,
            count,
            totalSizeBytes,
            avgRowSizeBytes,
            status,
            heavyFields
          });
        }
      } catch (err: any) {
        results.push({
          table: tbl,
          count: 0,
          totalSizeBytes: 0,
          avgRowSizeBytes: 0,
          status: 'error',
          errorMsg: err.message || 'Gagal memuat'
        });
      }
    }

    // Sort heaviest first
    results.sort((a, b) => b.totalSizeBytes - a.totalSizeBytes);
    setAuditResults(results);
    setIsAuditing(false);
    setAuditProgress('');
  };

  // Export logs to JSON file
  const exportTelemetry = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      stats,
      logs
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen && !isEmbedded) return null;

  const content = (
    <div className={`space-y-6 ${isEmbedded ? '' : 'p-6'}`}>
      {/* Top Banner / Header (if modal) */}
      {!isEmbedded && (
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Real-Time Supabase Network & Payload Monitor
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Live Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Memantau ukuran transfer data (Egress & Ingress) per-tabel untuk mencegah kuota Supabase berlebih.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportTelemetry}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                isLight ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Ekspor Log Lalu Lintas ke JSON"
            >
              <Download size={13} />
              <span>Ekspor JSON</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Egress (Download) */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ArrowDownCircle size={14} className="text-sky-500" />
              Total Egress (Download)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Sesi Ini
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight text-sky-600 dark:text-sky-400 font-mono">
            {formatBytes(stats.totalEgressBytes)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Dari {stats.totalRequests} Permintaan</span>
            <span className="font-semibold text-emerald-500">Hemat Kuota ✓</span>
          </div>
        </div>

        {/* Card 2: Ingress (Upload) */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ArrowUpCircle size={14} className="text-emerald-500" />
              Total Ingress (Upload)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Kirim
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
            {formatBytes(stats.totalIngressBytes)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Data Tersimpan ke DB</span>
            <span className="font-semibold text-slate-300">Terkonfirmasi</span>
          </div>
        </div>

        {/* Card 3: Large Objects Warnings */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden ${
          stats.largeTransfersCount > 0 
            ? 'bg-amber-500/5 border-amber-500/30' 
            : isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AlertTriangle size={14} className={stats.largeTransfersCount > 0 ? 'text-amber-500' : 'text-slate-400'} />
              Transfer Besar (&gt;30 KB)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              stats.largeTransfersCount > 0 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'bg-slate-500/10 text-slate-400'
            }`}>
              {stats.largeTransfersCount} Terdeteksi
            </span>
          </div>
          <div className={`text-2xl font-black tracking-tight font-mono ${stats.largeTransfersCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
            {stats.largeTransfersCount}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            {stats.largeTransfersCount > 0 ? 'Periksa objek berukuran besar di tabel di bawah' : 'Semua transfer berukuran aman & ringan'}
          </div>
        </div>

        {/* Card 4: Avg Response Time */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap size={14} className="text-purple-500" />
              Rata-rata Respon
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Latensi
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400 font-mono">
            {stats.avgDurationMs} <span className="text-sm font-sans font-normal text-slate-400">ms</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            {stats.avgDurationMs < 200 ? 'Koneksi database sangat cepat' : 'Koneksi normal'}
          </div>
        </div>
      </div>

      {/* Table Payload Auditor Section */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <HardDrive size={16} className="text-indigo-400" />
              Audit Ukuran Seluruh Tabel Supabase (Live Database Footprint)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hitung beban ukuran asli per-tabel di server Supabase Anda untuk mendeteksi data yang menyedot Egress.
            </p>
          </div>

          <button
            type="button"
            onClick={runTableAudit}
            disabled={isAuditing}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0 ${
              isAuditing
                ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
            }`}
          >
            <RefreshCw size={13} className={isAuditing ? 'animate-spin' : ''} />
            <span>{isAuditing ? auditProgress || 'Mengukur Tabel...' : '🔍 Jalankan Audit Ukuran Tabel'}</span>
          </button>
        </div>

        {/* Audit Results Table */}
        {auditResults && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${isLight ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-slate-950/60 text-slate-300 border-slate-800'}`}>
                    <th className="p-3 font-extrabold">Nama Tabel</th>
                    <th className="p-3 font-extrabold">Jumlah Baris</th>
                    <th className="p-3 font-extrabold">Total Ukuran Payload</th>
                    <th className="p-3 font-extrabold">Rata-rata / Baris</th>
                    <th className="p-3 font-extrabold">Status Beban</th>
                    <th className="p-3 font-extrabold">Kolom Besar / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {auditResults.map((res) => (
                    <tr key={res.table} className={isLight ? 'hover:bg-slate-50/80' : 'hover:bg-slate-850/50'}>
                      <td className="p-3">
                        <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {res.table}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{res.count} baris</td>
                      <td className="p-3 font-mono font-bold">
                        {res.status === 'error' ? '—' : formatBytes(res.totalSizeBytes)}
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        {res.status === 'error' ? '—' : formatBytes(res.avgRowSizeBytes)}
                      </td>
                      <td className="p-3">
                        {res.status === 'optimal' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                            <CheckCircle2 size={11} /> Ringan (&lt;100 KB)
                          </span>
                        )}
                        {res.status === 'moderate' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 inline-flex items-center gap-1">
                            <AlertTriangle size={11} /> Sedang (100–500 KB)
                          </span>
                        )}
                        {res.status === 'heavy' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 inline-flex items-center gap-1">
                            <ShieldAlert size={11} /> Berat (&gt;500 KB)
                          </span>
                        )}
                        {res.status === 'error' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            Tabel Kosong / Belum Ada
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-slate-400">
                        {res.heavyFields && res.heavyFields.length > 0 ? (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            ⚠️ Kolom panjang: {res.heavyFields.join(', ')}
                          </span>
                        ) : res.errorMsg ? (
                          <span className="text-rose-400">{res.errorMsg}</span>
                        ) : (
                          <span className="text-emerald-500">Struktur optimal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>
                Total Seluruh Database saat ini: <strong className="text-white font-mono font-bold">
                  {formatBytes(auditResults.reduce((acc, r) => acc + r.totalSizeBytes, 0))}
                </strong>
              </span>
              <span className="text-emerald-400 font-semibold">
                ✓ Selesai diuji langsung terhadap REST API Supabase
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Traffic Log Stream */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" />
              Live Network Stream (Lalu Lintas Supabase Real-Time)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Setiap kali Anda menambah data, absensi, atau memperbarui nilai, aliran request dan ukurannya dicatat di sini.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => networkMonitor.clearLogs()}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Bersihkan riwayat log"
            >
              <Trash2 size={13} />
              <span>Bersihkan Log</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari URL, tabel, atau status..."
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none font-medium ${
                isLight ? 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-800' : 'bg-slate-950/60 border-slate-800 focus:border-emerald-500 text-white'
              }`}
            />
          </div>

          {/* Table Filter */}
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className={`px-3 py-2 text-xs rounded-xl border outline-none font-bold cursor-pointer ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-300'
            }`}
          >
            <option value="ALL">Semua Tabel</option>
            {recordedTables.map(t => (
              <option key={t} value={t}>Tabel: {t}</option>
            ))}
          </select>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className={`px-3 py-2 text-xs rounded-xl border outline-none font-bold cursor-pointer ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-300'
            }`}
          >
            <option value="ALL">Semua Metode</option>
            <option value="GET">GET (Query / Ambil Data)</option>
            <option value="POST">POST (Insert / Tambah)</option>
            <option value="PATCH">PATCH (Update / Edit)</option>
            <option value="DELETE">DELETE (Hapus)</option>
          </select>

          {/* Toggle Large Only */}
          <button
            type="button"
            onClick={() => setOnlyLargeTransfers(prev => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              onlyLargeTransfers
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 ring-1 ring-amber-500/30'
                : isLight ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle size={13} className={onlyLargeTransfers ? 'text-amber-400' : 'text-slate-400'} />
            <span>Hanya Transfer Besar (&gt;30 KB)</span>
          </button>
        </div>

        {/* Traffic Log Stream List */}
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Activity size={32} className="mx-auto text-slate-600 animate-pulse" />
            <p className="text-xs font-semibold">Belum ada lalu lintas data yang terekam atau cocok dengan filter.</p>
            <p className="text-[11px] text-slate-500">Lakukan aksi seperti menambah data atau menekan tombol Sinkron Data untuk melihat live stream.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const isExpanded = selectedLogId === log.id;
              const isSuccess = log.status >= 200 && log.status < 300;

              return (
                <div
                  key={log.id}
                  className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                    log.isLargeEgress || log.isLargeIngress
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : isLight
                        ? isExpanded ? 'border-emerald-500/40 bg-emerald-50/20' : 'border-slate-200 bg-white hover:border-slate-300'
                        : isExpanded ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  {/* Row Header */}
                  <div
                    onClick={() => setSelectedLogId(isExpanded ? null : log.id)}
                    className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Status icon */}
                      {isSuccess ? (
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={15} className="text-rose-500 shrink-0" />
                      )}

                      {/* Method Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                        log.method === 'GET' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' :
                        log.method === 'POST' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        log.method === 'PATCH' || log.method === 'PUT' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {log.method}
                      </span>

                      {/* Table Name */}
                      <span className="font-bold text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                        {log.table}
                      </span>

                      {/* Endpoint preview */}
                      <span className="text-[11px] text-slate-400 font-mono truncate max-w-[220px] sm:max-w-xs" title={log.url}>
                        {log.endpoint || log.url}
                      </span>

                      {/* Warning pill if large */}
                      {log.isLargeEgress && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                          ⚡ Egress Tinggi ({formatBytes(log.responseSizeBytes)})
                        </span>
                      )}
                      {log.isLargeIngress && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          ⬆️ Payload Besar ({formatBytes(log.requestSizeBytes)})
                        </span>
                      )}
                    </div>

                    {/* Metrics right side */}
                    <div className="flex items-center gap-3 text-xs font-mono shrink-0 ml-auto md:ml-0">
                      {/* Egress / Ingress size */}
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-sky-400">
                          ↓ {formatBytes(log.responseSizeBytes)}
                        </span>
                        {log.requestSizeBytes > 0 && (
                          <span className="text-[10px] text-emerald-400 ml-2">
                            ↑ {formatBytes(log.requestSizeBytes)}
                          </span>
                        )}
                      </div>

                      {/* Latency */}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={11} /> {log.durationMs}ms
                      </span>

                      {/* Expand Arrow */}
                      <div className="p-1 rounded text-slate-400">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Inspector */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/60 space-y-3.5 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <span className="text-slate-400 block font-bold mb-0.5">Full Target URL:</span>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300 break-all select-all">
                            {log.url}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-bold mb-0.5">Ringkasan Status:</span>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono flex items-center justify-between">
                            <span>Status: <strong className={isSuccess ? 'text-emerald-400' : 'text-rose-400'}>{log.status} {log.statusText}</strong></span>
                            <span>Waktu: <strong>{new Date(log.timestamp).toLocaleTimeString()}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Large field alert detector */}
                      {log.detectedLargeFields && log.detectedLargeFields.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                          <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                            <ShieldAlert size={14} />
                            <span>Objek / Kolom Besar Terdeteksi dalam Payload:</span>
                          </div>
                          <div className="space-y-1">
                            {log.detectedLargeFields.map((f, idx) => (
                              <div key={idx} className="text-[11px] font-mono text-amber-300 flex items-center justify-between">
                                <span>Kolom: <strong>{f.field}</strong> ({formatBytes(f.sizeBytes)})</span>
                                <span className="opacity-75">{f.preview}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Request Payload preview (if exists) */}
                      {log.requestBodyPreview && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-emerald-400 text-[11px] flex items-center gap-1">
                              <ArrowUpCircle size={12} /> Outgoing Request Payload (Dikirim):
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(log.requestBodyPreview || '', `req-${log.id}`)}
                              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === `req-${log.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              <span>{copiedId === `req-${log.id}` ? 'Disalin' : 'Salin JSON'}</span>
                            </button>
                          </div>
                          <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-36 select-all">
                            {log.requestBodyPreview}
                          </pre>
                        </div>
                      )}

                      {/* Response Payload preview */}
                      {log.responseBodyPreview && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sky-400 text-[11px] flex items-center gap-1">
                              <ArrowDownCircle size={12} /> Incoming Response Payload (Diterima / Egress):
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(log.responseBodyPreview || '', `res-${log.id}`)}
                              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === `res-${log.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              <span>{copiedId === `res-${log.id}` ? 'Disalin' : 'Salin JSON'}</span>
                            </button>
                          </div>
                          <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-sky-300 overflow-x-auto max-h-36 select-all">
                            {log.responseBodyPreview}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  // Modal Overlay Layout
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden my-8 ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#0f172a] border-slate-800 text-white'
      }`}>
        <div className="max-h-[90vh] overflow-y-auto">
          {content}
        </div>
      </div>
    </div>
  );
};
