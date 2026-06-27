-- ========================================================
-- SCRIPT FULL SETUP DATABASE MATH FINGERS (LATEST SCHEMA) --
-- ========================================================

-- Disable Row Level Security (RLS) enforcement warnings or keep it simple.
-- Kami sarankan mengijinkan akses baca-tulis penuh untuk demo & kelancaran aplikasi.

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
  "activeMaterialId" TEXT
);

-- Enable RLS & Bypass for simple usage
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON students;
CREATE POLICY "Allow public read-write for demo" ON students FOR ALL USING (true) WITH CHECK (true);


-- 2. TABEL MATERIALS (Daftar Materi & Kurikulum Baru)
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  formulas TEXT[] DEFAULT '{}'::TEXT[],
  steps TEXT[] DEFAULT '{}'::TEXT[],
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
  notes TEXT
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
  "teacherName" TEXT NOT NULL
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
  status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid')),
  "paidAt" TEXT,
  "paymentMethod" TEXT,
  "createdAt" BIGINT NOT NULL,
  "amountPaid" NUMERIC DEFAULT 0,
  installments JSONB DEFAULT '[]'::jsonb,
  category TEXT DEFAULT 'spp'
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
  notes TEXT
);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON grades;
CREATE POLICY "Allow public read-write for demo" ON grades FOR ALL USING (true) WITH CHECK (true);


-- ========================================================
-- MIGRASI PENYELARASAN SCHEMA (Mencegah Error Jika Sudah Ada Data)
-- ========================================================
-- Jalankan bagian ini jika tabel Anda sudah ada sebelumnya tapi ingin ditambahkan kolom barunya saja:

ALTER TABLE students ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tempatLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tanggalLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisPaket" TEXT DEFAULT '4P';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisKelamin" TEXT DEFAULT 'Laki-laki';
ALTER TABLE students ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "activeMaterialId" TEXT;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'spp';

ALTER TABLE materials ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "tutorialImages" TEXT[] DEFAULT '{}'::TEXT[];

-- Pastikan relasi Cascade Delete aktif agar data terhapus otomatis saat siswa dihapus
ALTER TABLE IF EXISTS attendance DROP CONSTRAINT IF EXISTS attendance_studentId_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notes DROP CONSTRAINT IF EXISTS notes_studentId_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS invoices DROP CONSTRAINT IF EXISTS invoices_studentId_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS grades DROP CONSTRAINT IF EXISTS grades_studentId_fkey;
ALTER TABLE grades ADD CONSTRAINT grades_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;
