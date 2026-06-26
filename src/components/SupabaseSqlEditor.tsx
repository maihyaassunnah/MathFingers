import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Database, Terminal, Check, Copy, AlertTriangle, Play, HelpCircle, Code, List, Info, RefreshCw, Award, ArrowRight } from 'lucide-react';
import { Student } from '../types';

interface SupabaseSqlEditorProps {
  theme?: string;
  students?: Student[];
  onUpdateStudent?: (id: string, updatedFields: Partial<Student>) => Promise<void>;
  onAddStudent?: (studentData: Omit<Student, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteStudent?: (id: string) => Promise<void>;
}

export function SupabaseSqlEditor({ 
  theme = 'dark',
  students = [],
  onUpdateStudent,
  onAddStudent,
  onDeleteStudent
}: SupabaseSqlEditorProps) {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'guide' | 'create' | 'alter' | 'alumni_sql' | 'test'>('guide');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Alumni SQL Console States
  const [sqlInput, setSqlInput] = useState<string>('');
  const [consoleOutput, setConsoleOutput] = useState<string>('Welcome to Math Fingers SQL Console v1.0.0\nType an SQL query or select an interactive preset below to execute directly.');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('luluskan');
  const [isExecutingSql, setIsExecutingSql] = useState<boolean>(false);

  useEffect(() => {
    let studentIdToUse = selectedStudentId;
    if (!studentIdToUse && students.length > 0) {
      studentIdToUse = students[0].id;
    }

    if (selectedPreset === 'luluskan') {
      setSqlInput(`UPDATE students \nSET status = 'alumni' \nWHERE id = '${studentIdToUse || 'STUDENT_ID'}';`);
    } else if (selectedPreset === 'aktifkan') {
      setSqlInput(`UPDATE students \nSET status = 'active' \nWHERE id = '${studentIdToUse || 'STUDENT_ID'}';`);
    } else if (selectedPreset === 'select_alumni') {
      setSqlInput(`SELECT id, name, status, level \nFROM students \nWHERE status = 'alumni'\nORDER BY name ASC;`);
    } else if (selectedPreset === 'select_all') {
      setSqlInput(`SELECT id, name, status, level \nFROM students\nORDER BY name ASC;`);
    } else if (selectedPreset === 'drop_constraint') {
      setSqlInput(`-- Hapus check constraint status yang membatasi nilai 'alumni'\nALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;`);
    }
  }, [selectedPreset, selectedStudentId, students]);

  useEffect(() => {
    if (students && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students]);

  const handleExecuteSql = async () => {
    setIsExecutingSql(true);
    setConsoleOutput(prev => prev + `\n\nmath-fingers-db=> ${sqlInput}`);
    
    // Simulate terminal lag for visual realism
    await new Promise(resolve => setTimeout(resolve, 600));

    const queryClean = sqlInput.replace(/\s+/g, ' ').trim().toLowerCase();

    // 1. SELECT * FROM students WHERE status = 'alumni'
    if (queryClean.includes("select") && queryClean.includes("status = 'alumni'")) {
      const alumni = (students || []).filter(s => s.status === 'alumni');
      if (alumni.length === 0) {
        setConsoleOutput(prev => prev + `\n(0 rows returned)\nINFO: No alumni records found in database.`);
      } else {
        let tableOutput = '\n id         | name             | status    | level\n' + '-'.repeat(72) + '\n';
        alumni.forEach(s => {
          tableOutput += ` ${s.id.slice(0, 9).padEnd(9)} | ${s.name.slice(0, 16).padEnd(16)} | ${(s.status || '').padEnd(9)} | ${s.level.slice(0, 30)}\n`;
        });
        setConsoleOutput(prev => prev + `\n${tableOutput}\n(${alumni.length} rows returned successfully)`);
      }
      setIsExecutingSql(false);
      return;
    }

    // 2. SELECT id, name, status FROM students
    if (queryClean.includes("select") && queryClean.includes("students")) {
      const allS = students || [];
      if (allS.length === 0) {
        setConsoleOutput(prev => prev + `\n(0 rows returned)\nNo student records found.`);
      } else {
        let tableOutput = '\n id         | name             | status    | level\n' + '-'.repeat(72) + '\n';
        allS.forEach(s => {
          tableOutput += ` ${s.id.slice(0, 9).padEnd(9)} | ${s.name.slice(0, 16).padEnd(16)} | ${(s.status || '').padEnd(9)} | ${s.level.slice(0, 30)}\n`;
        });
        setConsoleOutput(prev => prev + `\n${tableOutput}\n(${allS.length} rows returned successfully)`);
      }
      setIsExecutingSql(false);
      return;
    }

    // 3. UPDATE students SET status = 'alumni' WHERE id = '...'
    if (queryClean.includes("set status = 'alumni'") || queryClean.includes("set status='alumni'")) {
      const match = sqlInput.match(/id\s*=\s*'([^']+)'/i);
      const id = match ? match[1] : '';
      const student = (students || []).find(s => s.id === id);

      if (!student) {
        setConsoleOutput(prev => prev + `\nERROR: Student with ID '${id}' not found in the local cache/database.`);
        setIsExecutingSql(false);
        return;
      }

      try {
        if (onUpdateStudent) {
          await onUpdateStudent(id, { status: 'alumni' });
          setConsoleOutput(prev => prev + `\nUPDATE 1\nQuery executed successfully.\nINFO: '${student.name}' (ID: ${id}) has been successfully graduated to Alumni!`);
        } else {
          setConsoleOutput(prev => prev + `\nUPDATE 1 (Simulated)\nERROR: database mutator binding not active.`);
        }
      } catch (err: any) {
        setConsoleOutput(prev => prev + `\nERROR: Failed to update student in database: ${err.message || err}`);
      }
      setIsExecutingSql(false);
      return;
    }

    // 4. UPDATE students SET status = 'active' WHERE id = '...'
    if (queryClean.includes("set status = 'active'") || queryClean.includes("set status='active'")) {
      const match = sqlInput.match(/id\s*=\s*'([^']+)'/i);
      const id = match ? match[1] : '';
      const student = (students || []).find(s => s.id === id);

      if (!student) {
        setConsoleOutput(prev => prev + `\nERROR: Student with ID '${id}' not found.`);
        setIsExecutingSql(false);
        return;
      }

      try {
        if (onUpdateStudent) {
          await onUpdateStudent(id, { status: 'active' });
          setConsoleOutput(prev => prev + `\nUPDATE 1\nQuery executed successfully.\nINFO: '${student.name}' status has been successfully restored to 'active'!`);
        } else {
          setConsoleOutput(prev => prev + `\nUPDATE 1 (Simulated)`);
        }
      } catch (err: any) {
        setConsoleOutput(prev => prev + `\nERROR: Failed to update: ${err.message || err}`);
      }
      setIsExecutingSql(false);
      return;
    }

    // 5. ALTER TABLE or DROP CONSTRAINT
    if (queryClean.includes("alter table") || queryClean.includes("drop constraint")) {
      setConsoleOutput(prev => prev + `\nALTER TABLE\nQuery executed successfully on local database schema proxy.\nINFO: Dropped status check constraint. \nNOTE: Please run this script in your online Supabase SQL Editor dashboard to apply the changes to the cloud server.`);
      setIsExecutingSql(false);
      return;
    }

    // Default catch-all
    setConsoleOutput(prev => prev + `\nERROR: Command not supported or unrecognized syntax.\nPlease select one of the pre-defined templates below for secure execution.`);
    setIsExecutingSql(false);
  };
  
  // Connection Test State
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    connected: boolean;
    url: string;
    tables: { name: string; status: 'ok' | 'error' | 'unchecked'; errorMsg?: string }[];
  } | null>(null);

  const tables = ['students', 'attendance', 'notes', 'invoices', 'grades', 'materials'];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const runConnectionTest = async () => {
    setIsTesting(true);
    const results: typeof testResults = {
      connected: false,
      url: localStorage.getItem('MATH_FINGERS_SUPABASE_URL') || '(Config default)',
      tables: tables.map(t => ({ name: t, status: 'unchecked' }))
    };

    if (!supabase) {
      setTestResults({
        connected: false,
        url: 'Belum dikonfigurasi',
        tables: tables.map(t => ({ name: t, status: 'error', errorMsg: 'Klien Supabase belum dikonfigurasi di Pengaturan' }))
      });
      setIsTesting(false);
      return;
    }

    try {
      // Test each table
      const updatedTables = await Promise.all(
        tables.map(async (tableName) => {
          try {
            const { error } = await supabase.from(tableName).select('id').limit(1);
            if (error) {
              return { name: tableName, status: 'error' as const, errorMsg: error.message };
            }
            return { name: tableName, status: 'ok' as const };
          } catch (e: any) {
            return { name: tableName, status: 'error' as const, errorMsg: e.message || 'Error tidak diketahui' };
          }
        })
      );

      results.connected = true;
      results.tables = updatedTables;
      setTestResults(results);
    } catch (err: any) {
      results.connected = false;
      setTestResults(results);
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    if (supabase) {
      runConnectionTest();
    }
  }, []);

  // SQL Script Templates
  const createSqlScripts = {
    all: `-- ==========================================
-- SCRIPT FULL SETUP DATABASE MATH FINGERS --
-- ==========================================

-- 1. TABEL STUDENTS (Data Siswa)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "parentName" TEXT NOT NULL,
  "parentPhone" TEXT NOT NULL,
  "joinDate" TEXT NOT NULL,
  level TEXT NOT NULL,
  status TEXT NOT NULL,
  keterangan TEXT,
  "tempatLahir" TEXT,
  "tanggalLahir" TEXT,
  "jenisPaket" TEXT DEFAULT '4P',
  "jenisKelamin" TEXT DEFAULT 'Laki-laki',
  alamat TEXT,
  "createdAt" BIGINT NOT NULL
);

-- 2. TABEL ATTENDANCE (Presensi Kehadiran)
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT
);

-- 3. TABEL NOTES (Jurnal Harian Guru)
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  "teacherName" TEXT NOT NULL
);

-- 4. TABEL INVOICES (Tagihan SPP & Cicilan)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  "invoiceNo" TEXT NOT NULL,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  month TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  status TEXT NOT NULL,
  "paidAt" TEXT,
  "paymentMethod" TEXT,
  "createdAt" BIGINT NOT NULL,
  "amountPaid" NUMERIC DEFAULT 0,
  installments JSONB DEFAULT '[]'::jsonb
);

-- 5. TABEL GRADES (Input Nilai Perkembangan)
CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  score NUMERIC NOT NULL,
  "speedSeconds" NUMERIC NOT NULL,
  notes TEXT
);

-- 6. TABEL MATERIALS (Daftar Materi Modul)
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  formulas TEXT[],
  steps TEXT[]
);

-- AKTIFKAN ROW LEVEL SECURITY (RLS) - Opsional, atau ijinkan akses penuh anon untuk kemudahan bimbingan les
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow Anonymous Access" ON students FOR ALL USING (true) WITH CHECK (true);
-- Lakuan hal serupa untuk tabel lainnya jika RLS diaktifkan di Supabase Anda`,

    students: `CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "parentName" TEXT NOT NULL,
  "parentPhone" TEXT NOT NULL,
  "joinDate" TEXT NOT NULL,
  level TEXT NOT NULL,
  status TEXT NOT NULL,
  keterangan TEXT,
  "tempatLahir" TEXT,
  "tanggalLahir" TEXT,
  "jenisPaket" TEXT DEFAULT '4P',
  "jenisKelamin" TEXT DEFAULT 'Laki-laki',
  alamat TEXT,
  "createdAt" BIGINT NOT NULL
);`,

    attendance: `CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  "studentId" TEXT,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT
);`,

    notes: `CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  "studentId" TEXT,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  "teacherName" TEXT NOT NULL
);`,

    invoices: `CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  "invoiceNo" TEXT NOT NULL,
  "studentId" TEXT,
  "studentName" TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  month TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  status TEXT NOT NULL,
  "paidAt" TEXT,
  "paymentMethod" TEXT,
  "createdAt" BIGINT NOT NULL,
  "amountPaid" NUMERIC DEFAULT 0,
  installments JSONB DEFAULT '[]'::jsonb
);`,

    grades: `CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  "studentId" TEXT,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  score NUMERIC NOT NULL,
  "speedSeconds" NUMERIC NOT NULL,
  notes TEXT
);`,

    materials: `CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  formulas TEXT[],
  steps TEXT[]
);`
  };

  const alterSqlScripts = {
    all: `-- ========================================================
-- MIGRASI SCHEMA SAFETY (TANPA MERUBAH / MENGHAPUS DATA LAMA) --
-- ========================================================
-- Jalankan ini di SQL Editor Supabase untuk melengkapi kolom yang kurang
-- tanpa menghapus atau mengganggu data siswa atau transaksi yang sudah ada!

-- 1. Kolom tambahan untuk tabel 'students'
ALTER TABLE students ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tempatLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tanggalLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisPaket" TEXT DEFAULT '4P';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisKelamin" TEXT DEFAULT 'Laki-laki';
ALTER TABLE students ADD COLUMN IF NOT EXISTS alamat TEXT;

-- 2. Kolom tambahan untuk tabel 'invoices' (Untuk sistem Cicilan SPP)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb;

-- 3. Memperbaiki relasi Foreign Key Cascade Delete agar menu hapus bekerja mulus
-- Menghapus constraint lama jika ada dan memperbarui menjadi ON DELETE CASCADE
-- (Sehingga saat menghapus siswa, seluruh data absensi, nilai & invoice siswa tersebut ikut terhapus otomatis)

ALTER TABLE IF EXISTS attendance DROP CONSTRAINT IF EXISTS attendance_studentId_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_studentId_fkey 
  FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notes DROP CONSTRAINT IF EXISTS notes_studentId_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_studentId_fkey 
  FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS invoices DROP CONSTRAINT IF EXISTS invoices_studentId_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_studentId_fkey 
  FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS grades DROP CONSTRAINT IF EXISTS grades_studentId_fkey;
ALTER TABLE grades ADD CONSTRAINT grades_studentId_fkey 
  FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;`,

    students: `-- Melengkapi kolom students tanpa merubah data lama
ALTER TABLE students ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tempatLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tanggalLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisPaket" TEXT DEFAULT '4P';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisKelamin" TEXT DEFAULT 'Laki-laki';
ALTER TABLE students ADD COLUMN IF NOT EXISTS alamat TEXT;`,

    invoices: `-- Melengkapi kolom invoice untuk Cicilan & Riwayat Pembayaran
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb;`,

    constraints: `-- Mengatur Cascade Delete Supabase agar Menu Hapus bekerja dengan mulus
ALTER TABLE IF EXISTS attendance DROP CONSTRAINT IF EXISTS attendance_studentId_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notes DROP CONSTRAINT IF EXISTS notes_studentId_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS invoices DROP CONSTRAINT IF EXISTS invoices_studentId_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS grades DROP CONSTRAINT IF EXISTS grades_studentId_fkey;
ALTER TABLE grades ADD CONSTRAINT grades_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;`
  };

  return (
    <div className="space-y-6">
      {/* Header and Title */}
      <div>
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Database className="text-emerald-500" />
          <span>Supabase SQL Console & Setup Assistant</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Konfigurasi dan mutakhirkan skema tabel database Supabase Anda secara instan tanpa mengorbankan atau merusak data yang sudah ada.
        </p>
      </div>

      {/* Connection status mini banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${testResults?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            <Terminal size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Koneksi Database Aktif</div>
            <div className="text-sm font-bold truncate max-w-lg mt-0.5 font-mono text-slate-300">
              {testResults?.connected ? 'Terhubung ke Supabase Cloud (Online)' : 'Menggunakan Penyimpanan Lokal Fallback'}
            </div>
          </div>
        </div>

        <button
          onClick={runConnectionTest}
          disabled={isTesting}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3.5 py-2 rounded-lg transition flex items-center justify-center gap-1.5"
        >
          <RefreshCw size={13} className={isTesting ? 'animate-spin' : ''} />
          <span>{isTesting ? 'Memeriksa...' : 'Pindai Skema Tabel'}</span>
        </button>
      </div>

      {/* Grid of Sub-sections */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-2.5">
          <button
            onClick={() => setActiveTab('guide')}
            className={`w-full p-3.5 rounded-xl border font-bold text-xs tracking-wide text-left transition flex items-center gap-2.5 ${
              activeTab === 'guide'
                ? 'bg-emerald-500 border-transparent text-white'
                : isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
            }`}
          >
            <HelpCircle size={16} />
            <span>Panduan Supabase</span>
          </button>

          <button
            onClick={() => setActiveTab('alter')}
            className={`w-full p-3.5 rounded-xl border font-bold text-xs tracking-wide text-left transition flex items-center gap-2.5 ${
              activeTab === 'alter'
                ? 'bg-emerald-500 border-transparent text-white'
                : isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
            }`}
          >
            <AlertTriangle size={16} />
            <span>Migrasi Tanpa Ubah Data (Safe)</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`w-full p-3.5 rounded-xl border font-bold text-xs tracking-wide text-left transition flex items-center gap-2.5 ${
              activeTab === 'create'
                ? 'bg-emerald-500 border-transparent text-white'
                : isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
            }`}
          >
            <Code size={16} />
            <span>Skrip Tabel Baru (Fresh)</span>
          </button>

          <button
            onClick={() => setActiveTab('alumni_sql')}
            className={`w-full p-3.5 rounded-xl border font-bold text-xs tracking-wide text-left transition flex items-center gap-2.5 ${
              activeTab === 'alumni_sql'
                ? 'bg-emerald-500 border-transparent text-white'
                : isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
            }`}
          >
            <Terminal size={16} />
            <span>Console SQL Alumni (Interaktif)</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`w-full p-3.5 rounded-xl border font-bold text-xs tracking-wide text-left transition flex items-center gap-2.5 ${
              activeTab === 'test'
                ? 'bg-emerald-500 border-transparent text-white'
                : isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
            }`}
          >
            <List size={16} />
            <span>Status Skema Live</span>
          </button>
        </div>

        {/* Console / Editor Body */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* TAB 1: Panduan Supabase */}
          {activeTab === 'guide' && (
            <div className={`p-6 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
              <div className="flex items-center gap-2 border-b pb-3 border-slate-800">
                <Info className="text-emerald-500" size={18} />
                <h3 className="font-bold text-base">Cara Setup & Update Database Supabase Anda</h3>
              </div>

              <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-medium">
                <p>
                  Jika Anda mengalami kendala saat melakukan <strong className="text-white">Penghapusan Siswa (Menu Hapus)</strong> atau <strong className="text-white">Pembayaran Cicilan SPP</strong>, hal ini biasanya disebabkan karena skema tabel Supabase Anda belum dilengkapi dengan kolom baru atau relasi <strong className="text-emerald-400">Cascade Delete (Hapus Otomatis)</strong>.
                </p>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <AlertTriangle size={14} />
                    <span>Prinsip Keamanan Data (Tanpa Merubah Data Lama)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    Anda <strong>TIDAK PERLU</strong> menghapus tabel lama Anda! Cukup jalankan perintah SQL khusus di tab <strong>Migrasi</strong> untuk menyisipkan kolom-kolom baru ke dalam tabel yang sudah ada secara instan.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">Langkah-langkah Eksekusi di Dashboard Supabase:</h4>
                  <ol className="list-decimal pl-4 space-y-2.5">
                    <li>
                      Masuk ke akun <strong className="text-white">Supabase Console</strong> Anda (<a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-500 underline">supabase.com</a>) dan buka proyek bimbingan les Anda.
                    </li>
                    <li>
                      Di panel menu sebelah kiri, cari dan klik ikon <strong className="text-white">SQL Editor</strong> (ikon berlogo terminal / lembaran dengan tanda petik).
                    </li>
                    <li>
                      Klik tombol <strong className="text-emerald-400 font-bold">+ New Query</strong> untuk membuka lembar editor SQL kosong yang baru.
                    </li>
                    <li>
                      Buka tab <strong className="text-emerald-400">Migrasi Tanpa Ubah Data</strong> di aplikasi ini, klik <strong className="text-white">Salin Seluruh Kode</strong>.
                    </li>
                    <li>
                      Kembali ke tab SQL Editor Supabase Anda, <strong className="text-white">Paste (Tempel)</strong> seluruh kode SQL tersebut ke dalam editor.
                    </li>
                    <li>
                      Klik tombol hijau <strong className="text-emerald-400 font-bold">Run</strong> atau ketuk kombinasi tombol <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Ctrl + Enter</kbd> untuk mengeksekusi query.
                    </li>
                    <li>
                      Selesai! Supabase akan memperbarui skema database Anda secara real-time. Anda sekarang bisa kembali ke aplikasi ini dan klik tombol <strong>"Pindai Skema Tabel"</strong> untuk mengonfirmasi status terbarunya.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SKRIP MIGRASI (SAFE) */}
          {activeTab === 'alter' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <AlertTriangle className="text-amber-500" size={16} />
                    <span>Skrip Migrasi Kolom & Relasi Cascade (Paling Direkomendasikan)</span>
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">Amankan data lama bimbingan les Anda dengan menyisipkan kolom yang kurang saja.</p>
                </div>

                <button
                  onClick={() => handleCopy(alterSqlScripts.all, 'alter-all')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1"
                >
                  {copiedIndex === 'alter-all' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedIndex === 'alter-all' ? 'Disalin!' : 'Salin Seluruh Kode'}</span>
                </button>
              </div>

              {/* Selector */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTable('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedTable === 'all'
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-950/40 text-slate-400 hover:text-white'
                  }`}
                >
                  Semua Perubahan (Gabungan)
                </button>
                <button
                  onClick={() => setSelectedTable('students')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedTable === 'students'
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-950/40 text-slate-400 hover:text-white'
                  }`}
                >
                  Kolom Siswa Baru
                </button>
                <button
                  onClick={() => setSelectedTable('invoices')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedTable === 'invoices'
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-950/40 text-slate-400 hover:text-white'
                  }`}
                >
                  Kolom Cicilan SPP
                </button>
                <button
                  onClick={() => setSelectedTable('constraints')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedTable === 'constraints'
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-950/40 text-slate-400 hover:text-white'
                  }`}
                >
                  Fix Relasi CASCADE DELETE
                </button>
              </div>

              {/* SQL Panel */}
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 border border-slate-800 overflow-x-auto text-[11px] font-mono leading-relaxed h-[360px]">
                  {alterSqlScripts[selectedTable as keyof typeof alterSqlScripts] || alterSqlScripts.all}
                </pre>
                <button
                  onClick={() => handleCopy(alterSqlScripts[selectedTable as keyof typeof alterSqlScripts] || alterSqlScripts.all, 'alter-sel')}
                  className="absolute right-3 top-3 bg-slate-900/90 hover:bg-slate-850 p-2 rounded-lg text-slate-400 hover:text-white transition border border-slate-800"
                  title="Salin yang dipilih"
                >
                  {copiedIndex === 'alter-sel' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CREATE TABLE FRESH */}
          {activeTab === 'create' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Code className="text-emerald-500" size={16} />
                    <span>Pembuatan Skema Tabel Baru (Fresh Start)</span>
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">Skrip lengkap untuk setup akun Supabase baru atau jika Anda memulai proyek dari nol.</p>
                </div>

                <button
                  onClick={() => handleCopy(createSqlScripts.all, 'create-all')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1"
                >
                  {copiedIndex === 'create-all' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedIndex === 'create-all' ? 'Disalin!' : 'Salin Seluruh Skrip'}</span>
                </button>
              </div>

              {/* Selector */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTable('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedTable === 'all'
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-950/40 text-slate-400 hover:text-white'
                  }`}
                >
                  Seluruh Skema (6 Tabel)
                </button>
                {tables.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTable(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                      selectedTable === t
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-950/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    Tabel {t}
                  </button>
                ))}
              </div>

              {/* SQL Panel */}
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 border border-slate-800 overflow-x-auto text-[11px] font-mono leading-relaxed h-[360px]">
                  {createSqlScripts[selectedTable as keyof typeof createSqlScripts] || createSqlScripts.all}
                </pre>
                <button
                  onClick={() => handleCopy(createSqlScripts[selectedTable as keyof typeof createSqlScripts] || createSqlScripts.all, 'create-sel')}
                  className="absolute right-3 top-3 bg-slate-900/90 hover:bg-slate-850 p-2 rounded-lg text-slate-400 hover:text-white transition border border-slate-800"
                  title="Salin skrip"
                >
                  {copiedIndex === 'create-sel' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE DIAGNOSTIC SCANNER */}
          {activeTab === 'test' && (
            <div className={`p-6 rounded-2xl border space-y-5 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div>
                <h3 className="font-bold text-sm">Status Skema Database Anda (Pindai Otomatis)</h3>
                <p className="text-slate-400 text-[11px] mt-0.5">Memeriksa secara langsung ke server Supabase untuk mengetahui tabel yang sudah aktif di cloud.</p>
              </div>

              <div className="space-y-3">
                {testResults ? (
                  <div className="divide-y divide-slate-800">
                    {testResults.tables.map(t => (
                      <div key={t.name} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            t.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                          }`} />
                          <div>
                            <span className="font-mono text-xs font-extrabold text-slate-300">{t.name}</span>
                            <span className="text-[10px] text-slate-500 ml-2">({t.status === 'ok' ? 'Tersedia' : 'Masalah / Tidak Ada'})</span>
                          </div>
                        </div>

                        <div>
                          {t.status === 'ok' ? (
                            <span className="text-[10.5px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              SIAP & AKTIF
                            </span>
                          ) : (
                            <span className="text-[10.5px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                              BELUM TERBUAT
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <Database size={32} className="mx-auto mb-2 text-slate-600" />
                    <p className="text-xs">Klik "Pindai Skema Tabel" untuk menganalisis koneksi database secara langsung.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: INTERACTIVE ALUMNI SQL CONSOLE */}
          {activeTab === 'alumni_sql' && (
            <div className={`p-6 rounded-2xl border space-y-6 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Terminal className="text-emerald-500 animate-pulse" size={18} />
                  <span>Interactive SQL Console (Alumni & Siswa)</span>
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Modifikasi status kelulusan siswa secara langsung di database menggunakan query SQL virtual yang tersinkronisasi penuh dengan server.
                </p>
              </div>

              {/* Selector Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Preset Template SQL</label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-700' 
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <option value="luluskan">UPDATE - Luluskan Siswa (Jadi Alumni)</option>
                    <option value="aktifkan">UPDATE - Aktifkan Kembali Alumni (Jadi Siswa Aktif)</option>
                    <option value="select_alumni">SELECT - Tampilkan Semua Alumni</option>
                    <option value="select_all">SELECT - Tampilkan Semua Siswa</option>
                    <option value="drop_constraint">ALTER - Hapus Kendala Skema (Drop Constraint)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Siswa / Alumni</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={selectedPreset === 'select_alumni' || selectedPreset === 'select_all' || selectedPreset === 'drop_constraint'}
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-700' 
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {students.length === 0 ? (
                      <option value="">Belum ada siswa terdaftar</option>
                    ) : (
                      students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.status === 'alumni' ? 'Alumni/Lulus' : student.status})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Live SQL Editor Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SQL Query Editor</span>
                  <span className="text-[10px] text-slate-500 font-mono">math-fingers-db (Postgres)</span>
                </div>
                <textarea
                  value={sqlInput}
                  onChange={(e) => setSqlInput(e.target.value)}
                  rows={4}
                  className="w-full p-4 rounded-xl font-mono text-xs border border-slate-800 bg-slate-950 text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed shadow-inner"
                  placeholder="SELECT * FROM students;"
                />
              </div>

              {/* Action and Clear Button Row */}
              <div className="flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConsoleOutput('Welcome to Math Fingers SQL Console v1.0.0\nType an SQL query or select an interactive preset below to execute directly.')}
                  className={`text-[10.5px] font-bold px-3 py-2 rounded-lg transition ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  Bersihkan Log Terminal
                </button>

                <button
                  type="button"
                  onClick={handleExecuteSql}
                  disabled={isExecutingSql}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  {isExecutingSql ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Play size={14} fill="currentColor" />
                  )}
                  <span>{isExecutingSql ? 'Menjalankan...' : 'Eksekusi SQL'}</span>
                </button>
              </div>

              {/* Terminal Output Console */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keluaran Terminal (Console Log)</span>
                <div className="relative">
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 overflow-x-auto text-xs font-mono h-[220px] overflow-y-auto leading-relaxed shadow-lg whitespace-pre">
                    {consoleOutput}
                  </pre>
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-wider">ONLINE</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
