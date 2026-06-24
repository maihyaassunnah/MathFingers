-- ==========================================
-- SUPABASE SQL DATABASE SCHEMA SETUP
-- Math Fingers - Easy Learning House
-- ==========================================

-- Enable any extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STUDENTS TABLE
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
    "jenisPaket" TEXT,
    "jenisKelamin" TEXT,
    alamat TEXT,
    "createdAt" BIGINT NOT NULL
);

-- Enable Row Level Security (RLS) on students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for demo/applet purposes" ON students FOR ALL USING (true);


-- 2. MATERIALS TABLE
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    formulas TEXT[] DEFAULT '{}'::TEXT[],
    steps TEXT[] DEFAULT '{}'::TEXT[]
);

-- Enable RLS on materials
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for demo/applet purposes" ON materials FOR ALL USING (true);


-- 3. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'permission')),
    notes TEXT
);

-- Enable RLS on attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for demo/applet purposes" ON attendance FOR ALL USING (true);


-- 4. TEACHER NOTES TABLE (JURNAL GURU)
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    date TEXT NOT NULL,
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    "teacherName" TEXT NOT NULL
);

-- Enable RLS on notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for demo/applet purposes" ON notes FOR ALL USING (true);


-- 5. INVOICES TABLE
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
    "paymentMethod" TEXT CHECK ("paymentMethod" IN ('Transfer', 'Tunai')),
    "createdAt" BIGINT NOT NULL
);

-- Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for demo/applet purposes" ON invoices FOR ALL USING (true);


-- 6. GRADES TABLE (INPUT NILAI)
CREATE TABLE IF NOT EXISTS grades (
    id TEXT PRIMARY KEY,
    "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    date TEXT NOT NULL,
    topic TEXT NOT NULL,
    score INTEGER NOT NULL,
    "speedSeconds" INTEGER NOT NULL,
    notes TEXT
);

-- Enable RLS on grades
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for demo/applet purposes" ON grades FOR ALL USING (true);
