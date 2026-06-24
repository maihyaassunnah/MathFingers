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
    level: 'Level 1: Dasar Satuan (0 - 9)',
    title: 'Pengenalan Jari Tangan Kanan',
    description: 'Menggunakan jari tangan kanan untuk melambangkan nilai satuan 0 sampai 9. Kunci dasar berhitung cepat.',
    formulas: [
      'Jempol Kanan = 5',
      'Telunjuk Kanan = 1',
      'Jari Tengah Kanan = 1',
      'Jari Manis Kanan = 1',
      'Jari Kelingking Kanan = 1',
      'Semua jari kanan ditutup = 0'
    ],
    steps: [
      'Posisikan tangan kanan mengepal di depan dada (nilai 0).',
      'Buka jari telunjuk untuk melambangkan nilai 1.',
      'Buka berturut-turut jari tengah (2), manis (3), kelingking (4).',
      'Tutup empat jari dan buka jempol kanan untuk melambangkan nilai 5.',
      'Buka kembali telunjuk bersama jempol untuk 6, tengah untuk 7, manis untuk 8, kelingking untuk 9.'
    ]
  },
  {
    id: 'mat-2',
    level: 'Level 2: Teman Kecil (+/-)',
    title: 'Metode Teman Kecil (Kombinasi Angka 5)',
    description: 'Digunakan saat jari satu-satuan tidak cukup untuk ditambah atau dikurangi, menggunakan basis angka 5.',
    formulas: [
      'Teman Kecil +4 = +5 - 1',
      'Teman Kecil +3 = +5 - 2',
      'Teman Kecil +2 = +5 - 3',
      'Teman Kecil +1 = +5 - 4',
      'Teman Kecil -4 = -5 + 1',
      'Teman Kecil -3 = -5 + 2',
      'Teman Kecil -2 = -5 + 3',
      'Teman Kecil -1 = -5 + 4'
    ],
    steps: [
      'Latih siswa mengenali pasangannya: 4 temannya 1, 3 temannya 2.',
      'Contoh Kasus 1 + 4: Mulai dari 1 (telunjuk terbuka). Jari satuan sisa 3 (kurang untuk +4). Terapkan rumus +4 yaitu buka jempol (+5) dan tutup telunjuk (-1). Hasilnya 5 (jempol terbuka).',
      'Berikan drill soal secara lisan dengan ritme cepat untuk melatih refleks gerakan jari.'
    ]
  },
  {
    id: 'mat-3',
    level: 'Level 3: Dasar Puluhan (10 - 90)',
    title: 'Pengenalan Jari Tangan Kiri',
    description: 'Menggunakan tangan kiri untuk melambangkan nilai puluhan (10 sampai 90), dikombinasikan dengan tangan kanan.',
    formulas: [
      'Jempol Kiri = 50',
      'Telunjuk Kiri = 10',
      'Jari Tengah Kiri = 10',
      'Jari Manis Kiri = 10',
      'Jari Kelingking Kiri = 10',
      'Kedua tangan digunakan bersama untuk angka 11 sampai 99'
    ],
    steps: [
      'Latih tangan kiri terpisah terlebih dahulu untuk melambangkan puluhan: 10, 20, 30, 40, 50 (jempol kiri), 60, 70, 80, 90.',
      'Gabungkan latihan: Tangan kiri menunjukkan puluhan, tangan kanan menunjukkan satuan (Contoh: 24 = 2 jari kiri terbuka, 4 jari kanan terbuka).',
      'Lakukan penambahan langsung tanpa rumus (Contoh: 12 + 22 = buka 10 & 20 di kiri, buka 2 & 2 di kanan).'
    ]
  },
  {
    id: 'mat-4',
    level: 'Level 4: Teman Besar (+/-)',
    title: 'Metode Teman Besar (Kombinasi Angka 10)',
    description: 'Menggunakan basis angka 10 (melibatkan gerakan jari tangan kiri puluhan) untuk penambahan/pengurangan melampaui batas tangan kanan.',
    formulas: [
      'Teman Besar +9 = +10 - 1',
      'Teman Besar +8 = +10 - 2',
      'Teman Besar +7 = +10 - 3',
      'Teman Besar +6 = +10 - 4',
      'Teman Besar +5 = +10 - 5',
      'Teman Besar -9 = -10 + 1',
      'Teman Besar -8 = -10 + 2',
      'Teman Besar -7 = -10 + 3',
      'Teman Besar -6 = -10 + 4'
    ],
    steps: [
      'Minta siswa menghafal pasangannya: 9 kawannya 1, 8 kawannya 2, 7 kawannya 3, 6 kawannya 4, 5 kawannya 5.',
      'Contoh 7 + 8: Tampilkan 7 di tangan kanan (jempol + 2 jari). Untuk +8, karena sisa jari kanan kurang, buka 10 di kiri (+10) dan tutup 2 jari di kanan (-2). Hasilnya 15 (1 di kiri, 5 di kanan).',
      'Latih konsistensi koordinasi jempol kiri dan gerakan tangan kanan.'
    ]
  },
  {
    id: 'mat-5',
    level: 'Level 5: Kombinasi & Perkalian',
    title: 'Perkalian Cepat Satu Jari',
    description: 'Berhitung perkalian 1-digit dengan 2-digit menggunakan simulasi jari berkecepatan tinggi.',
    formulas: [
      'Perkalian 9: Menutup jari ke-N dari kiri ke kanan memberikan hasil (Contoh: Jari ke-3 ditutup = 2 di kiri, 7 di kanan = 27)',
      'Perkalian 6-10: Mengatupkan jari-jari bernilai di atas 5 (Jari terbuka bernilai puluhan, jari tertutup dikalikan).'
    ],
    steps: [
      'Ajarkan trik perkalian 9 terlebih dahulu untuk membangun kepercayaan diri siswa.',
      'Untuk perkalian umum, latih siswa membayangkan penjumlahan berulang beruntun dengan metode Math Fingers tingkat tinggi.'
    ]
  }
];

// Helper to generate a unique Invoice Number
export function generateInvoiceNo(): string {
  const dateStr = new Date().toISOString().slice(2, 7).replace('-', ''); // e.g., "2606"
  const rand = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `INV/MF/${dateStr}/${rand}`;
}
