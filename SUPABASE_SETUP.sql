-- ==================================================================================
-- SCRIPT FULL SETUP DATABASE SUPABASE (POSTGRESQL) - MATH FINGERS (LATEST v3.2.0) --
-- ==================================================================================
-- Jalankan seluruh script ini pada menu SQL Editor di Dashboard Supabase Anda.
-- Script ini sudah mencakup pembuatan tabel baru, RLS policies, indexing,
-- serta skrip migrasi kolom (ALTER TABLE ADD COLUMN IF NOT EXISTS) yang aman
-- dijalankan berulang kali tanpa merusak data yang sudah ada.
-- ==================================================================================

-- 1. TABEL STUDENTS (Data Siswa Lengkap + Cabang & Filter Kelas)
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
  "hariLes" TEXT,
  "uniqueCode" TEXT,
  kelas TEXT,
  "photoUrl" TEXT
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for students" ON students;
CREATE POLICY "Allow public read-write for students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);


-- 2. TABEL MATERIALS (Daftar Kurikulum & Capaian Pembelajaran)
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  "capaianPembelajaran" TEXT,
  "kompetensiDasar" TEXT,
  "materiPembelajaran" TEXT,
  "indikatorPencapaian" TEXT,
  title TEXT,
  description TEXT,
  formulas TEXT[] DEFAULT '{}'::TEXT[],
  steps TEXT[] DEFAULT '{}'::TEXT[],
  "videoUrl" TEXT,
  "tutorialImages" TEXT[] DEFAULT '{}'::TEXT[]
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for materials" ON materials;
CREATE POLICY "Allow public read-write for materials" ON materials FOR ALL USING (true) WITH CHECK (true);


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
DROP POLICY IF EXISTS "Allow public read-write for attendance" ON attendance;
CREATE POLICY "Allow public read-write for attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance("studentId");
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_branch ON attendance(branch);


-- 4. TABEL NOTES (Jurnal Harian Guru & Rekap Perkembangan)
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
DROP POLICY IF EXISTS "Allow public read-write for notes" ON notes;
CREATE POLICY "Allow public read-write for notes" ON notes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_notes_student ON notes("studentId");
CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(date);
CREATE INDEX IF NOT EXISTS idx_notes_branch ON notes(branch);


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
DROP POLICY IF EXISTS "Allow public read-write for invoices" ON invoices;
CREATE POLICY "Allow public read-write for invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices("studentId");
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_branch ON invoices(branch);


-- 6. TABEL GRADES (Nilai Kuis, Kecepatan & Refleks Jari Siswa)
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
DROP POLICY IF EXISTS "Allow public read-write for grades" ON grades;
CREATE POLICY "Allow public read-write for grades" ON grades FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades("studentId");
CREATE INDEX IF NOT EXISTS idx_grades_date ON grades(date);
CREATE INDEX IF NOT EXISTS idx_grades_branch ON grades(branch);


-- 7. TABEL BRANCHES (Daftar Cabang-cabang Les Privat)
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  "createdAt" BIGINT NOT NULL
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for branches" ON branches;
CREATE POLICY "Allow public read-write for branches" ON branches FOR ALL USING (true) WITH CHECK (true);


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
DROP POLICY IF EXISTS "Allow public read-write for admin_users" ON admin_users;
CREATE POLICY "Allow public read-write for admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);


-- 9. TABEL CLASSES (Manajemen Rombel / Kelompok Belajar Cabang)
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "scheduleDays" TEXT,
  "scheduleTime" TEXT,
  "teacherName" TEXT,
  quota NUMERIC DEFAULT 12,
  room TEXT,
  level TEXT,
  branch TEXT DEFAULT 'Pusat',
  "createdAt" BIGINT NOT NULL
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for classes" ON classes;
CREATE POLICY "Allow public read-write for classes" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_classes_branch ON classes(branch);


-- 10. TABEL FINANCE_INCOMES (Pemasukan Keuangan Cabang & Pusat)
CREATE TABLE IF NOT EXISTS finance_incomes (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL,
  notes TEXT,
  "invoiceId" TEXT,
  branch TEXT DEFAULT 'Pusat',
  "createdAt" BIGINT NOT NULL
);

ALTER TABLE finance_incomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for finance_incomes" ON finance_incomes;
CREATE POLICY "Allow public read-write for finance_incomes" ON finance_incomes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON finance_incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_branch ON finance_incomes(branch);


-- 11. TABEL FINANCE_EXPENSES (Pengeluaran Operasional & Honor Cabang)
CREATE TABLE IF NOT EXISTS finance_expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  "paidTo" TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  notes TEXT,
  "receiptImage" TEXT,
  branch TEXT DEFAULT 'Pusat',
  "createdAt" BIGINT NOT NULL
);

ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for finance_expenses" ON finance_expenses;
CREATE POLICY "Allow public read-write for finance_expenses" ON finance_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON finance_expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON finance_expenses(branch);


-- 12. TABEL APP_SETTINGS (Konfigurasi Aplikasi, Hero Carousel & Pengaturan Cabang)
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  "bankName" TEXT,
  "bankAccountNo" TEXT,
  "bankAccountHolder" TEXT,
  "defaultSppAmount" NUMERIC,
  "accentColor" TEXT,
  "defaultTeacherName" TEXT,
  "invoicePrefix" TEXT,
  "invoiceLogo" TEXT,
  "invoiceSignature" TEXT,
  "appIcon" TEXT,
  branch TEXT,
  branches TEXT,
  "heroSlides" JSONB DEFAULT '[]'::jsonb,
  "mobileHeroTitle" TEXT,
  "mobileHeroSubtitle" TEXT,
  "mobileHeroBannerUrl" TEXT,
  "mobileHeroBadgeText" TEXT,
  "mobileHeroPrimaryBtnText" TEXT,
  "mobileHeroPrimaryBtnAction" TEXT,
  "mobileHeroSecondaryBtnText" TEXT,
  "mobileHeroSecondaryBtnAction" TEXT,
  "mobilePopularServicesTitle" TEXT,
  "mobileRecommendedTitle" TEXT,
  "updatedAt" BIGINT
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for app_settings" ON app_settings;
CREATE POLICY "Allow public read-write for app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);


-- 13. TABEL DASHBOARD_TASKS (Catatan To-Do List Harian)
CREATE TABLE IF NOT EXISTS dashboard_tasks (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  date TEXT NOT NULL,
  branch TEXT DEFAULT 'Pusat'
);

ALTER TABLE dashboard_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for dashboard_tasks" ON dashboard_tasks;
CREATE POLICY "Allow public read-write for dashboard_tasks" ON dashboard_tasks FOR ALL USING (true) WITH CHECK (true);


-- ==================================================================================
-- MIGRASI PENYELARASAN SKEMA (ALTER TABLE - JALANKAN UNTUK UPGRADE TABEL LAMA)
-- ==================================================================================
-- Perintah ini aman dijalankan karena menggunakan klausul ADD COLUMN IF NOT EXISTS:

ALTER TABLE students ADD COLUMN IF NOT EXISTS keterangan TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tempatLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "tanggalLahir" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisPaket" TEXT DEFAULT '4P';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "jenisKelamin" TEXT DEFAULT 'Laki-laki';
ALTER TABLE students ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "activeMaterialId" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE students ADD COLUMN IF NOT EXISTS "hariLes" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "uniqueCode" TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS kelas TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

ALTER TABLE materials ADD COLUMN IF NOT EXISTS "capaianPembelajaran" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "kompetensiDasar" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "materiPembelajaran" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "indikatorPencapaian" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "tutorialImages" TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';
ALTER TABLE grades ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Pusat';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'spp';

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password TEXT;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "heroSlides" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "mobileHeroTitle" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "mobileHeroSubtitle" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "mobileHeroBannerUrl" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "mobileHeroBadgeText" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "mobileHeroPrimaryBtnText" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "mobileHeroPrimaryBtnAction" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "mobileHeroSecondaryBtnText" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "mobileHeroSecondaryBtnAction" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "mobilePopularServicesTitle" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "mobileRecommendedTitle" TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "appIcon" TEXT;

-- Periksa dan perbaiki Foreign Key Constraints (Cascade Delete)
ALTER TABLE IF EXISTS attendance DROP CONSTRAINT IF EXISTS attendance_studentId_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS notes DROP CONSTRAINT IF EXISTS notes_studentId_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS invoices DROP CONSTRAINT IF EXISTS invoices_studentId_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS grades DROP CONSTRAINT IF EXISTS grades_studentId_fkey;
ALTER TABLE grades ADD CONSTRAINT grades_studentId_fkey FOREIGN KEY ("studentId") REFERENCES students(id) ON DELETE CASCADE;


-- ==================================================================================
-- SEED DATA AWAL (DEFAULT CABANG, USER ADMIN & PENGATURAN)
-- ==================================================================================

INSERT INTO branches (id, name, address, phone, "createdAt")
VALUES 
  ('br-1', 'Pusat', 'Kantor Pusat Math Fingers', '08123456789', 1719600000),
  ('br-2', 'Bandung', 'Cabang Kota Bandung', '08123456780', 1719600000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_users (username, name, role, branch, password, "avatarUrl")
VALUES 
  ('wahyudin', 'Wahyudin Hafiz, S.Pd', 'super_admin', 'Pusat', 'admin123', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200'),
  ('febrianti', 'Febrianti Dewi, S.Pd', 'branch_admin', 'Pusat', 'admin123', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'),
  ('dewi', 'Dewi Safitri, S.H', 'branch_admin', 'Pusat', 'dewi123', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200'),
  ('les_bandung', 'Les Privat Bandung', 'branch_admin', 'Bandung', 'bdg123', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200')
ON CONFLICT (username) DO NOTHING;

INSERT INTO classes (id, name, "scheduleDays", "scheduleTime", "teacherName", quota, room, level, branch, "createdAt")
VALUES 
  ('cls-1', 'Kelas Reguler A (Senin & Rabu)', 'Senin & Rabu', '14:00 - 15:30', 'Febrianti Dewi', 12, 'Ruang A1', 'Level 1 : Penjumlahan & Pengurangan Angka Satuan', 'Pusat', 1719600000),
  ('cls-2', 'Kelas Reguler B (Selasa & Kamis)', 'Selasa & Kamis', '15:30 - 17:00', 'Dewi Safitri', 10, 'Ruang A2', 'Level 2 : Penjumlahan & Pengurangan Angka Puluhan', 'Pusat', 1719600000),
  ('cls-3', 'Kelas Weekend Bandung', 'Sabtu & Ahad', '09:00 - 10:30', 'Les Privat Bandung', 15, 'Ruang Utama', 'Level 1 : Penjumlahan & Pengurangan Angka Satuan', 'Bandung', 1719600000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_settings (
  id, "bankName", "bankAccountNo", "bankAccountHolder", "defaultSppAmount",
  "accentColor", "defaultTeacherName", "invoicePrefix", branch, branches,
  "mobileHeroTitle", "mobileHeroSubtitle", "mobileHeroBannerUrl", "mobileHeroBadgeText",
  "mobileHeroPrimaryBtnText", "mobileHeroPrimaryBtnAction",
  "mobileHeroSecondaryBtnText", "mobileHeroSecondaryBtnAction",
  "mobilePopularServicesTitle", "mobileRecommendedTitle", "heroSlides"
)
VALUES (
  'default', 'Bank BCA', '1234567890', 'Admin Math Fingers', 250000,
  'emerald', 'Admin Math Fingers', 'INV/MF', 'Semua', 'Semua',
  'Bimbingan Cepat & Akurat?', 'Sistem Jaritmatika Math Fingers siap mendampingi presensi, kuis, dan administrasi cabang Anda.',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800',
  '⚡ Operasional Cabang Siap 100%', 'Catat Absen', 'attendance', 'Tagihan SPP', 'spp',
  'Layanan Populer Cabang', 'Rekomendasi Aksi Cepat',
  '[
    {
      "id": "slide-1",
      "title": "Bimbingan Cepat & Akurat?",
      "subtitle": "Sistem Jaritmatika Math Fingers siap mendampingi presensi, kuis, dan administrasi cabang Anda.",
      "badgeText": "⚡ Operasional Cabang Siap 100%",
      "bannerUrl": "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800",
      "primaryBtnText": "Catat Absen",
      "primaryBtnAction": "attendance",
      "secondaryBtnText": "Tagihan SPP",
      "secondaryBtnAction": "spp",
      "enabled": true
    },
    {
      "id": "slide-2",
      "title": "Berhitung Cepat Tanpa Alat",
      "subtitle": "Metode Jaritmatika Math Fingers melatih ketajaman dan refleks motorik berhitung anak usia dini.",
      "badgeText": "⭐ Metode Unggulan Teruji",
      "bannerUrl": "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800",
      "primaryBtnText": "Input Nilai",
      "primaryBtnAction": "grades",
      "secondaryBtnText": "Jurnal Guru",
      "secondaryBtnAction": "notes",
      "enabled": true
    },
    {
      "id": "slide-3",
      "title": "Administrasi SPP Otomatis",
      "subtitle": "Kirim kuitansi dan cetak invoice resmi SPP langsung ke WhatsApp orang tua murid dalam hitungan detik.",
      "badgeText": "🧾 Pembayaran Praktis & Rapih",
      "bannerUrl": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800",
      "primaryBtnText": "Buat Tagihan",
      "primaryBtnAction": "spp",
      "secondaryBtnText": "Scan Kartu QR",
      "secondaryBtnAction": "qr_cards",
      "enabled": true
    }
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
