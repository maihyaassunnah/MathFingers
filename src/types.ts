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
  hariLes?: string; // e.g. "Hari Jumat dan Ahad", "Sabtu dan Ahad"
  uniqueCode?: string; // 5-digit random/unique code
  kelas?: string; // e.g. "Kelas Reguler A (Senin & Rabu)"
  photoUrl?: string; // Profile photo URL or base64 data URI
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

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  bannerUrl?: string;
  primaryBtnText?: string;
  primaryBtnAction?: string;
  secondaryBtnText?: string;
  secondaryBtnAction?: string;
  enabled?: boolean;
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
  appIcon?: string;
  branch?: string;
  branches?: string;
  // Custom Mobile App Experience Settings (Diatur oleh Super Admin)
  heroSlides?: HeroSlide[];
  mobileHeroTitle?: string;
  mobileHeroSubtitle?: string;
  mobileHeroBannerUrl?: string;
  mobileHeroBadgeText?: string;
  mobileHeroPrimaryBtnText?: string;
  mobileHeroPrimaryBtnAction?: string;
  mobileHeroSecondaryBtnText?: string;
  mobileHeroSecondaryBtnAction?: string;
  mobilePopularServicesTitle?: string;
  mobileRecommendedTitle?: string;
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

export interface ClassGroup {
  id: string;
  name: string;
  scheduleDays?: string;
  scheduleTime?: string;
  teacherName?: string;
  quota?: number;
  room?: string;
  level?: string;
  branch?: string;
  createdAt: number;
}

export interface FinanceIncome {
  id: string;
  date: string; // YYYY-MM-DD
  category: 'SPP' | 'Uang Pendaftaran' | 'Penjualan Buku' | 'Lainnya';
  amount: number;
  source: string; // e.g. "Siswa Aisyah", "Sponsor Utama"
  notes: string;
  invoiceId?: string; // Ref to invoice if integrated
  branch?: string;
  createdAt: number;
}

export interface FinanceExpense {
  id: string;
  date: string; // YYYY-MM-DD
  category: 'Gaji tutor' | 'Fee admin aplikasi' | 'Cetak buku' | 'ATK' | 'Reward siswa' | 'Promosi' | 'Listrik' | 'Internet' | 'Transport' | 'Lainnya';
  amount: number;
  paidTo: string;
  paymentMethod: 'Transfer' | 'Tunai';
  notes: string;
  receiptImage?: string; // Base64 or image url (optional)
  branch?: string;
  createdAt: number;
}


