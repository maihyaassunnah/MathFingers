export interface Student {
  id: string;
  name: string;
  parentName: string;
  parentPhone: string; // WhatsApp number
  joinDate: string; // YYYY-MM-DD
  level: string; // e.g. "Level 1: Basic"
  status: 'active' | 'inactive' | 'alumni';
  keterangan?: string; // notes / description when registering
  tempatLahir?: string;
  tanggalLahir?: string; // YYYY-MM-DD
  jenisPaket?: string; // e.g. "4P", "8P"
  jenisKelamin?: 'Laki-laki' | 'Perempuan';
  alamat?: string;
  createdAt: number;
  activeMaterialId?: string;
  branch?: string; // e.g. "Pusat", "Bandung"
  hariLes?: string; // e.g. "Hari Jum'at dan Ahad", "Sabtu dan Ahad"
}

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'permission';
  notes: string;
  branch?: string;
}

export interface TeacherNote {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  topic: string;
  content: string; // the journal detail
  teacherName: string;
  branch?: string;
}

export interface Installment {
  id: string;
  amount: number;
  paidAt: string;
  paymentMethod: 'Transfer' | 'Tunai';
  note?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  amount: number;
  month: string; // e.g. "Juni 2026"
  dueDate: string; // YYYY-MM-DD
  status: 'paid' | 'unpaid' | 'partially_paid';
  paidAt?: string; // YYYY-MM-DD
  paymentMethod?: 'Transfer' | 'Tunai';
  createdAt: number;
  amountPaid?: number; // Cumulative payment amount
  installments?: Installment[]; // List of installment records
  category?: 'spp' | 'pendaftaran' | 'buku';
  branch?: string;
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
  branch?: string;
}

export interface LearningMaterial {
  id: string;
  level: string; // Level
  capaianPembelajaran: string; // Capaian Pembelajaran
  kompetensiDasar: string; // Kompetensi Dasar
  materiPembelajaran: string; // Materi Pembelajaran
  indikatorPencapaian: string; // Indikator Pencapaian Kompetensi
  videoUrl?: string;
  tutorialImages?: string[];
}

export interface AppSettings {
  bankName: string;
  bankAccountNo: string;
  bankAccountHolder: string;
  defaultSppAmount: number;
  accentColor: 'emerald' | 'indigo' | 'violet' | 'amber' | 'rose' | 'sky';
  defaultTeacherName: string;
  invoicePrefix?: string;
  invoiceLogo?: string;
  invoiceSignature?: string;
}

export interface DashboardTask {
  id: string;
  text: string;
  completed: boolean;
  date: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt: number;
}

export interface AdminUser {
  username: string; // unik, sbg ID
  name: string;
  role: 'super_admin' | 'branch_admin';
  branch: string; // nama cabang (misal "Pusat", "Bandung")
  password?: string;
  avatarUrl?: string;
}

