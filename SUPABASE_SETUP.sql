-- ====================================================================
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
  branch TEXT DEFAULT 'Pusat'
);

-- Enable RLS & Bypass for simple usage
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON students;
CREATE POLICY "Allow public read-write for demo" ON students FOR ALL USING (true) WITH CHECK (true);


-- 2. TABEL MATERIALS (Daftar Materi & Kurikulum)
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
  "createdAt" BIGINT DEFAULT 1719600000
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for demo" ON admin_users;
CREATE POLICY "Allow public read-write for demo" ON admin_users FOR ALL USING (true) WITH CHECK (true);


-- ====================================================================
-- SEED DATA AWAL (Jalankan Sekali Saja)
-- ====================================================================
INSERT INTO branches (id, name, address, phone, "createdAt")
VALUES 
  ('br-1', 'Pusat', 'Kantor Pusat Math Fingers', '08123456789', 1719600000),
  ('br-2', 'Bandung', 'Cabang Kota Bandung', '08123456780', 1719600000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_users (username, name, role, branch, password)
VALUES 
  ('febrianti', 'Febrianti Dewi', 'super_admin', 'Pusat', 'admin123'),
  ('dewi', 'Dewi Safitri', 'branch_admin', 'Pusat', 'dewi123'),
  ('les_bandung', 'Les Privat Bandung', 'branch_admin', 'Bandung', 'bdg123')
ON CONFLICT (username) DO NOTHING;


-- ====================================================================
-- MIGRASI PENYELARASAN SCHEMA (Mencegah Error Jika Sudah Ada Data)
-- ====================================================================
-- Perintah penambahan kolom jika tabel sudah ada namun ingin di-upgrade:

ALTER TABLE students ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tempatLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tanggalLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisPaket" TEXT DEFAULT '4P';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisKelamin" TEXT DEFAULT 'Laki-laki';
ALTER TABLE students ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "activeMaterialId" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE grades ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';

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
