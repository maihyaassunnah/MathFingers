import { LearningMaterial, Student } from './types';

// Helper to format currency to Rupiah
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Clean phone number for WhatsApp link (must start with 62)
export function formatWhatsAppPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

// Generate WhatsApp link with prefilled text
export function getWhatsAppLink(phone: string, text: string): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}

// Default/Seed Learning Materials for Math Fingers
export const SEED_MATERIALS: LearningMaterial[] = [
  {
    id: 'mat-1',
    level: 'Level 1: Dasar Satuan',
    capaianPembelajaran: 'Siswa mampu melakukan operasi penambahan dan pengurangan sederhana menggunakan metode jari tangan kanan (satuan 1-9) secara refleks dan mandiri.',
    kompetensiDasar: 'Memahami konsep nilai satuan pada jari tangan kanan (1-9) dan mempraktikkan gerakan membuka/menutup jari secara runtut.',
    materiPembelajaran: 'Formasi angka 1 sampai 9 pada jari tangan kanan, teknik penambahan dan pengurangan dasar tanpa rumus teman kecil.',
    indikatorPencapaian: 'Siswa dapat melambangkan angka 1-9 dengan jari kanan secara cepat, serta menyelesaikan kuis penambahan/pengurangan satuan dengan akurasi 100%.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 'mat-2',
    level: 'Level 2: Teman Kecil',
    capaianPembelajaran: 'Siswa mampu memecahkan perhitungan penambahan dan pengurangan dengan rumus "Teman Kecil" (kombinasi jumlah 5) menggunakan bantuan jari jempol.',
    kompetensiDasar: 'Menerapkan konsep Teman Kecil untuk operasi penambahan dan pengurangan (+1 s.d +4 dan -1 s.d -4).',
    materiPembelajaran: 'Rumus Teman Kecil Tambah (+4 = +5 -1, +3 = +5 -2, +2 = +5 -3, +1 = +5 -4) dan Teman Kecil Kurang (-4 = -5 +1, -3 = -5 +2, -2 = -5 +3, -1 = -5 +4).',
    indikatorPencapaian: 'Siswa terampil melipat dan membuka jari jempol serta jari lainnya secara serentak untuk mengaplikasikan rumus Teman Kecil dalam waktu kurang dari 3 detik per soal.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 'mat-3',
    level: 'Level 3: Teman Besar',
    capaianPembelajaran: 'Siswa mampu menyelesaikan operasi penambahan dan pengurangan puluhan menggunakan kombinasi jari tangan kiri dan rumus "Teman Besar" (kombinasi jumlah 10).',
    kompetensiDasar: 'Menganalisis dan mempraktikkan rumus Teman Besar (+1 s.d +9 dan -1 s.d -9) pada kombinasi jari tangan kanan dan kiri.',
    materiPembelajaran: 'Rumus Teman Besar Tambah (+9 = +10 -1, +8 = +10 -2, dst) dan Teman Besar Kurang (-9 = -10 +1, -8 = -10 +2, dst) serta penggabungan tangan kanan & kiri.',
    indikatorPencapaian: 'Siswa mampu mengoordinasikan gerakan tangan kiri (puluhan) dan tangan kanan (satuan) secara sinkron saat mengaplikasikan rumus Teman Besar.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  }
];

// Helper to generate a unique Invoice Number
export function generateInvoiceNo(prefix: string = 'INV/MF'): string {
  const dateStr = new Date().toISOString().slice(2, 7).replace('-', ''); // e.g., "2606"
  const rand = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `${prefix}/${dateStr}/${rand}`;
}

// Helper to get thematic avatar for an admin based on their details
export function getAdminAvatar(admin: { name?: string; username: string; avatarUrl?: string }): string {
  if (admin.avatarUrl && admin.avatarUrl.trim().length > 0) {
    return admin.avatarUrl;
  }

  const name = (admin.name || '').toLowerCase();
  
  // High-quality, friendly educator portraits from Unsplash matching the Math Fingers tutoring theme
  if (name.includes('wahyudin') || name.includes('hafiz')) {
    return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200';
  }
  if (name.includes('febrianti') || name.includes('dewi')) {
    return 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200';
  }
  if (name.includes('safitri') || name.includes('dewi safitri')) {
    return 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200';
  }
  if (name.includes('budi') || name.includes('santoso')) {
    return 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200';
  }

  // Generative selection using a simple character code sum
  const thematicPresets = [
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', // Female tutor (glasses)
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', // Female educator (bright)
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200', // Male tutor
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', // Female teacher
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', // Male educator
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'  // Female educator
  ];
  
  let charSum = 0;
  const key = admin.username + (admin.name || '');
  for (let i = 0; i < key.length; i++) {
    charSum += key.charCodeAt(i);
  }
  const index = charSum % thematicPresets.length;
  return thematicPresets[index];
}

// Helper to get or generate a deterministic 5-digit unique code for a student
export function getStudentUniqueCode(student: Student): string {
  if (student.uniqueCode && student.uniqueCode.trim().length === 5) {
    return student.uniqueCode;
  }
  
  // Fallback: generate a stable, deterministic 5-digit number from student ID
  let hash = 0;
  const idStr = student.id || '';
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const code = Math.abs(hash % 90000) + 10000; // ensures 5 digits between 10000 and 99999
  return code.toString();
}

