export interface Student {
  id: string;
  name: string;
  parentName: string;
  parentPhone: string; // WhatsApp number
  joinDate: string; // YYYY-MM-DD
  level: string; // e.g. "Level 1: Basic"
  status: 'active' | 'inactive';
  keterangan?: string; // notes / description when registering
  tempatLahir?: string;
  tanggalLahir?: string; // YYYY-MM-DD
  jenisPaket?: string; // e.g. "Reguler", "Privat", "Kelompok"
  jenisKelamin?: 'Laki-laki' | 'Perempuan';
  alamat?: string;
  createdAt: number;
}

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'permission';
  notes: string;
}

export interface TeacherNote {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  topic: string;
  content: string; // the journal detail
  teacherName: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  amount: number;
  month: string; // e.g. "Juni 2026"
  dueDate: string; // YYYY-MM-DD
  status: 'paid' | 'unpaid';
  paidAt?: string; // YYYY-MM-DD
  paymentMethod?: 'Transfer' | 'Tunai';
  createdAt: number;
}

export interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  topic: string; // e.g. "Penjumlahan Teman Kecil (+4)"
  score: number; // 0 - 100
  speedSeconds: number; // Time taken to complete trial
  notes: string;
}

export interface LearningMaterial {
  id: string;
  level: string;
  title: string;
  description: string;
  formulas: string[]; // finger combinations, e.g., "Teman Kecil +4 = +5 -1"
  steps: string[]; // how to practice
}

export interface AppSettings {
  bankName: string;
  bankAccountNo: string;
  bankAccountHolder: string;
  defaultSppAmount: number;
  accentColor: 'emerald' | 'indigo' | 'violet' | 'amber' | 'rose' | 'sky';
  defaultTeacherName: string;
}

export interface DashboardTask {
  id: string;
  text: string;
  completed: boolean;
  date: string;
}

