import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Database, Terminal, Check, Copy, AlertTriangle, Play, HelpCircle, Code, List, Info, RefreshCw, Award, ArrowRight } from 'lucide-react';
import { Student, Branch, AdminUser } from '../types';

interface SupabaseSqlEditorProps {
  theme?: string;
  students?: Student[];
  branches?: Branch[];
  adminUsers?: AdminUser[];
  onUpdateStudent?: (id: string, updatedFields: Partial<Student>) => Promise<void>;
  onAddStudent?: (studentData: Omit<Student, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteStudent?: (id: string) => Promise<void>;
}

export function SupabaseSqlEditor({ 
  theme = 'dark',
  students = [],
  branches = [],
  adminUsers = [],
  onUpdateStudent,
  onAddStudent,
  onDeleteStudent
}: SupabaseSqlEditorProps) {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'guide' | 'create' | 'alter' | 'test'>('guide');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Dynamic SQL Generators following current database state
  const branchesSqlValues = (branches && branches.length > 0 ? branches : [
    { id: 'br-1', name: 'Pusat', address: 'Kantor Pusat Math Fingers', phone: '08123456789', createdAt: 1719600000 },
    { id: 'br-2', name: 'Bandung', address: 'Cabang Kota Bandung', phone: '08123456780', createdAt: 1719600000 }
  ]).map(b => `  ('${b.id}', '${b.name.replace(/'/g, "''")}', '${(b.address || '').replace(/'/g, "''")}', '${(b.phone || '').replace(/'/g, "''")}', ${b.createdAt || 1719600000})`).join(',\n');

  const adminUsersSqlValues = (adminUsers && adminUsers.length > 0 ? adminUsers : [
    { username: 'febrianti', name: 'Febrianti Dewi', role: 'super_admin' as const, branch: 'Pusat', password: 'admin123', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200' },
    { username: 'dewi', name: 'Dewi Safitri', role: 'branch_admin' as const, branch: 'Pusat', password: 'dewi123', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200' },
    { username: 'les_bandung', name: 'Les Privat Bandung', role: 'branch_admin' as const, branch: 'Bandung', password: 'bdg123', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200' }
  ]).map(u => `  ('${u.username}', '${u.name.replace(/'/g, "''")}', '${u.role}', '${u.branch.replace(/'/g, "''")}', '${(u.password || '123456').replace(/'/g, "''")}', ${u.avatarUrl ? `'${u.avatarUrl.replace(/'/g, "''")}'` : 'NULL'})`).join(',\n');

  
  // Connection Test State
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    connected: boolean;
    url: string;
    tables: { name: string; status: 'ok' | 'error' | 'unchecked'; errorMsg?: string }[];
  } | null>(null);

  const tables = ['students', 'attendance', 'notes', 'invoices', 'grades', 'materials', 'branches', 'admin_users', 'hari_les'];

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
    all: `-- ====================================================================
-- SCRIPT FULL SETUP DATABASE MATH FINGERS (MULTI-CABANG & LATEST SCHEMA) --
-- ====================================================================

-- 1. TABEL STUDENTS (Data Siswa Lengkap)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "parentName" TEXT NOT NULL,
  "parentPhone" TEXT NOT NULL,
  "joinDate" TEXT NOT NULL,
  level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  keterangan TEXT,
  "tempatLahir" TEXT,
  "tanggalLahir" TEXT,
  "jenisPaket" TEXT DEFAULT '4P',
  "jenisKelamin" TEXT DEFAULT 'Laki-laki',
  alamat TEXT,
  "createdAt" BIGINT NOT NULL,
  "activeMaterialId" TEXT,
  branch TEXT DEFAULT 'Pusat',
  "hariLes" TEXT DEFAULT 'Hari Jumat dan Ahad',
  "uniqueCode" TEXT
);

-- Enable RLS & Bypass for simple usage
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON students;
CREATE POLICY "Allow public read-write for demo" ON students FOR ALL USING (true) WITH CHECK (true);


-- 2. TABEL MATERIALS (Daftar Materi & Kurikulum)
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  "capaianPembelajaran" TEXT,
  "kompetensiDasar" TEXT,
  "materiPembelajaran" TEXT,
  "indikatorPencapaian" TEXT,
  "videoUrl" TEXT,
  "tutorialImages" TEXT[] DEFAULT '{}'::TEXT[]
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON materials;
CREATE POLICY "Allow public read-write for demo" ON materials FOR ALL USING (true) WITH CHECK (true);


-- 3. TABEL ATTENDANCE (Presensi Absensi Kehadiran Siswa)
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'permission')),
  notes TEXT,
  branch TEXT DEFAULT 'Pusat'
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON attendance;
CREATE POLICY "Allow public read-write for demo" ON attendance FOR ALL USING (true) WITH CHECK (true);


-- 4. TABEL NOTES (Jurnal Harian & Catatan Guru)
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  "teacherName" TEXT NOT NULL,
  branch TEXT DEFAULT 'Pusat'
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON notes;
CREATE POLICY "Allow public read-write for demo" ON notes FOR ALL USING (true) WITH CHECK (true);


-- 5. TABEL INVOICES (Tagihan SPP Bulanan, Pendaftaran, Buku & Cicilan)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  "invoiceNo" TEXT NOT NULL,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  month TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid', 'partially_paid')),
  "paidAt" TEXT,
  "paymentMethod" TEXT,
  "createdAt" BIGINT NOT NULL,
  "amountPaid" NUMERIC DEFAULT 0,
  installments JSONB DEFAULT '[]'::jsonb,
  category TEXT DEFAULT 'spp',
  branch TEXT DEFAULT 'Pusat'
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON invoices;
CREATE POLICY "Allow public read-write for demo" ON invoices FOR ALL USING (true) WITH CHECK (true);


-- 6. TABEL GRADES (Input & Riwayat Nilai Perkembangan Siswa)
CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  score NUMERIC NOT NULL,
  "speedSeconds" NUMERIC NOT NULL,
  notes TEXT,
  branch TEXT DEFAULT 'Pusat'
);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON grades;
CREATE POLICY "Allow public read-write for demo" ON grades FOR ALL USING (true) WITH CHECK (true);


-- 7. TABEL BRANCHES (Daftar Cabang-cabang Les Privat)
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  "createdAt" BIGINT NOT NULL
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON branches;
CREATE POLICY "Allow public read-write for demo" ON branches FOR ALL USING (true) WITH CHECK (true);


-- 8. TABEL ADMIN_USERS (Akun Super Admin & Admin Cabang)
CREATE TABLE IF NOT EXISTS admin_users (
  username TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'branch_admin')),
  branch TEXT NOT NULL,
  password TEXT,
  "avatarUrl" TEXT,
  "createdAt" BIGINT DEFAULT 1719600000
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON admin_users;
CREATE POLICY "Allow public read-write for demo" ON admin_users FOR ALL USING (true) WITH CHECK (true);

-- Pastikan kolom avatarUrl ada jika tabel admin_users sudah ada sebelumnya
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;


-- 9. TABEL HARI_LES (Daftar Hari Les / Jadwal Bimbingan)
CREATE TABLE IF NOT EXISTS hari_les (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  "createdAt" BIGINT NOT NULL DEFAULT 1719600000,
  branch TEXT DEFAULT 'Pusat'
);

ALTER TABLE hari_les ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON hari_les;
CREATE POLICY "Allow public read-write for demo" ON hari_les FOR ALL USING (true) WITH CHECK (true);


-- ====================================================================
-- SEED DATA AWAL (Jalankan Sekali Saja)
-- ====================================================================
INSERT INTO branches (id, name, address, phone, "createdAt")
VALUES 
` + branchesSqlValues + `
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_users (username, name, role, branch, password, "avatarUrl")
VALUES 
` + adminUsersSqlValues + `
ON CONFLICT (username) DO NOTHING;

INSERT INTO hari_les (id, name, description, "createdAt", branch)
VALUES
  ('hl-1', 'Hari Jumat dan Ahad', 'Jadwal les hari Jumat sore dan Minggu pagi', 1719600000, 'Pusat'),
  ('hl-2', 'Sabtu dan Ahad', 'Jadwal les akhir pekan (Weekend)', 1719600000, 'Pusat'),
  ('hl-3', 'Senin dan Kamis', 'Jadwal les tengah pekan (Weekday)', 1719600000, 'Pusat'),
  ('hl-4', 'Selasa dan Jumat', 'Jadwal les alternatif tengah pekan', 1719600000, 'Pusat')
ON CONFLICT (id) DO NOTHING;`,
    students: `CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "parentName" TEXT NOT NULL,
  "parentPhone" TEXT NOT NULL,
  "joinDate" TEXT NOT NULL,
  level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  keterangan TEXT,
  "tempatLahir" TEXT,
  "tanggalLahir" TEXT,
  "jenisPaket" TEXT DEFAULT '4P',
  "jenisKelamin" TEXT DEFAULT 'Laki-laki',
  alamat TEXT,
  "createdAt" BIGINT NOT NULL,
  branch TEXT DEFAULT 'Pusat',
  "hariLes" TEXT DEFAULT 'Hari Jumat dan Ahad',
  "uniqueCode" TEXT
);`,

    attendance: `CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'permission')),
  notes TEXT,
  branch TEXT DEFAULT 'Pusat'
);`,

    notes: `CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  "teacherName" TEXT NOT NULL,
  branch TEXT DEFAULT 'Pusat'
);`,

    invoices: `CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  "invoiceNo" TEXT NOT NULL,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  month TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid', 'partially_paid')),
  "paidAt" TEXT,
  "paymentMethod" TEXT,
  "createdAt" BIGINT NOT NULL,
  "amountPaid" NUMERIC DEFAULT 0,
  installments JSONB DEFAULT '[]'::jsonb,
  category TEXT DEFAULT 'spp',
  branch TEXT DEFAULT 'Pusat'
);`,

    grades: `CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  score NUMERIC NOT NULL,
  "speedSeconds" NUMERIC NOT NULL,
  notes TEXT,
  branch TEXT DEFAULT 'Pusat'
);`,

    materials: `CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  "capaianPembelajaran" TEXT,
  "kompetensiDasar" TEXT,
  "materiPembelajaran" TEXT,
  "indikatorPencapaian" TEXT,
  "videoUrl" TEXT,
  "tutorialImages" TEXT[] DEFAULT '{}'::TEXT[]
);`,

    hari_les: `CREATE TABLE IF NOT EXISTS hari_les (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  "createdAt" BIGINT NOT NULL DEFAULT 1719600000,
  branch TEXT DEFAULT 'Pusat'
);

ALTER TABLE hari_les ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON hari_les;
CREATE POLICY "Allow public read-write for demo" ON hari_les FOR ALL USING (true) WITH CHECK (true);

INSERT INTO hari_les (id, name, description, "createdAt", branch)
VALUES
  ('hl-1', 'Hari Jumat dan Ahad', 'Jadwal les hari Jumat sore dan Minggu pagi', 1719600000, 'Pusat'),
  ('hl-2', 'Sabtu dan Ahad', 'Jadwal les akhir pekan (Weekend)', 1719600000, 'Pusat'),
  ('hl-3', 'Senin dan Kamis', 'Jadwal les tengah pekan (Weekday)', 1719600000, 'Pusat'),
  ('hl-4', 'Selasa dan Jumat', 'Jadwal les alternatif tengah pekan', 1719600000, 'Pusat')
ON CONFLICT (id) DO NOTHING;`
  };

  const alterSqlScripts = {
    all: `-- ====================================================================
-- MIGRASI MULTI-CABANG & SAFETY PENYELARASAN (TANPA MENGHAPUS DATA LAMA) --
-- ====================================================================

-- 1. Tambah kolom 'branch' dengan default 'Pusat' ke seluruh tabel transaksi
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE grades ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';

-- 2. Membuat tabel baru 'branches' (Daftar Cabang)
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  "createdAt" BIGINT NOT NULL
);
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON branches;
CREATE POLICY "Allow public read-write for demo" ON branches FOR ALL USING (true) WITH CHECK (true);

-- 3. Membuat tabel baru 'admin_users' (Daftar Akun)
CREATE TABLE IF NOT EXISTS admin_users (
  username TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'branch_admin')),
  branch TEXT NOT NULL,
  password TEXT,
  "avatarUrl" TEXT,
  "createdAt" BIGINT DEFAULT 1719600000
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON admin_users;
CREATE POLICY "Allow public read-write for demo" ON admin_users FOR ALL USING (true) WITH CHECK (true);

-- Pastikan kolom avatarUrl ada jika tabel admin_users sudah ada sebelumnya
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- 4. Isi seed data awal untuk Cabang & Admin (jika belum ada)
INSERT INTO branches (id, name, address, phone, "createdAt")
VALUES 
` + branchesSqlValues + `
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_users (username, name, role, branch, password, "avatarUrl")
VALUES 
` + adminUsersSqlValues + `
ON CONFLICT (username) DO NOTHING;

-- 5. Tambah kolom kelengkapan lain (jika ada yang tertinggal)
ALTER TABLE students ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tempatLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tanggalLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisPaket" TEXT DEFAULT '4P';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisKelamin" TEXT DEFAULT 'Laki-laki';
ALTER TABLE students ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "activeMaterialId" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "hariLes" TEXT DEFAULT 'Hari Jumat dan Ahad';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "uniqueCode" TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'spp';

ALTER TABLE materials ADD COLUMN IF NOT EXISTS "capaianPembelajaran" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "kompetensiDasar" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "materiPembelajaran" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "indikatorPencapaian" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "tutorialImages" TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE materials ALTER COLUMN title DROP NOT NULL;
ALTER TABLE materials ALTER COLUMN description DROP NOT NULL;

-- 6. Atur ulang relasi Cascade Delete agar data terhapus otomatis saat siswa dihapus
ALTER TABLE IF EXISTS attendance DROP CONSTRAINT IF EXISTS attendance_studentId_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notes DROP CONSTRAINT IF EXISTS notes_studentId_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS invoices DROP CONSTRAINT IF EXISTS invoices_studentId_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS grades DROP CONSTRAINT IF EXISTS grades_studentId_fkey;
ALTER TABLE grades ADD CONSTRAINT grades_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

-- 7. Tambah Tabel Hari Les & Jadwal Bimbingan (Migrasi Mandiri)
CREATE TABLE IF NOT EXISTS hari_les (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  "createdAt" BIGINT NOT NULL DEFAULT 1719600000,
  branch TEXT DEFAULT 'Pusat'
);

ALTER TABLE hari_les ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON hari_les;
CREATE POLICY "Allow public read-write for demo" ON hari_les FOR ALL USING (true) WITH CHECK (true);

INSERT INTO hari_les (id, name, description, "createdAt", branch)
VALUES
  ('hl-1', 'Hari Jumat dan Ahad', 'Jadwal les hari Jumat sore dan Minggu pagi', 1719600000, 'Pusat'),
  ('hl-2', 'Sabtu dan Ahad', 'Jadwal les akhir pekan (Weekend)', 1719600000, 'Pusat'),
  ('hl-3', 'Senin dan Kamis', 'Jadwal les tengah pekan (Weekday)', 1719600000, 'Pusat'),
  ('hl-4', 'Selasa dan Jumat', 'Jadwal les alternatif tengah pekan', 1719600000, 'Pusat')
ON CONFLICT (id) DO NOTHING;`,

    students: `-- Melengkapi kolom students tanpa merubah data lama
ALTER TABLE students ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tempatLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tanggalLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisPaket" TEXT DEFAULT '4P';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisKelamin" TEXT DEFAULT 'Laki-laki';
ALTER TABLE students ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "hariLes" TEXT DEFAULT 'Hari Jumat dan Ahad';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "uniqueCode" TEXT;`,

    invoices: `-- Melengkapi kolom invoice untuk Cicilan & Riwayat Pembayaran & Kategori Pembayaran
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'spp';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';`,

    materials: `-- Melengkapi kolom materials untuk Video & Foto Kurikulum (Kurikulum)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "capaianPembelajaran" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "kompetensiDasar" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "materiPembelajaran" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "indikatorPencapaian" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "tutorialImages" TEXT[];
ALTER TABLE materials ALTER COLUMN title DROP NOT NULL;
ALTER TABLE materials ALTER COLUMN description DROP NOT NULL;`,

    constraints: `-- Mengatur Cascade Delete Supabase agar Menu Hapus bekerja dengan mulus
ALTER TABLE IF EXISTS attendance DROP CONSTRAINT IF EXISTS attendance_studentId_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notes DROP CONSTRAINT IF EXISTS notes_studentId_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS invoices DROP CONSTRAINT IF EXISTS invoices_studentId_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS grades DROP CONSTRAINT IF EXISTS grades_studentId_fkey;
ALTER TABLE grades ADD CONSTRAINT grades_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;`,

    hari_les: `-- Pembuatan Tabel Hari Les & Jadwal Bimbingan (Migrasi Mandiri)
CREATE TABLE IF NOT EXISTS hari_les (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  "createdAt" BIGINT NOT NULL DEFAULT 1719600000,
  branch TEXT DEFAULT 'Pusat'
);

ALTER TABLE hari_les ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON hari_les;
CREATE POLICY "Allow public read-write for demo" ON hari_les FOR ALL USING (true) WITH CHECK (true);

INSERT INTO hari_les (id, name, description, "createdAt", branch)
VALUES
  ('hl-1', 'Hari Jumat dan Ahad', 'Jadwal les hari Jumat sore dan Minggu pagi', 1719600000, 'Pusat'),
  ('hl-2', 'Sabtu dan Ahad', 'Jadwal les akhir pekan (Weekend)', 1719600000, 'Pusat'),
  ('hl-3', 'Senin dan Kamis', 'Jadwal les tengah pekan (Weekday)', 1719600000, 'Pusat'),
  ('hl-4', 'Selasa dan Jumat', 'Jadwal les alternatif tengah pekan', 1719600000, 'Pusat')
ON CONFLICT (id) DO NOTHING;`
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
                  onClick={() => setSelectedTable('materials')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedTable === 'materials'
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-950/40 text-slate-400 hover:text-white'
                  }`}
                >
                  Kolom Kurikulum & Video
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



        </div>
      </div>
    </div>
  );
}
