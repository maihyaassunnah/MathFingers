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
    level: 'Level Dasar: Pengenalan Simbol Jari',
    title: 'Pengenalan Jari Tangan Kanan & Kiri',
    description: 'Menggunakan jari tangan kanan untuk satuan (1-9) dan tangan kiri untuk puluhan (10-90) sebagai pondasi dasar berhitung cepat.',
    formulas: [
      'Jempol Kanan = 5',
      'Jempol Kiri = 50',
      'Telunjuk Kanan = 1, Telunjuk Kiri = 10',
      'Semua jari ditutup = 0'
    ],
    steps: [
      'Posisikan kedua tangan mengepal di depan dada (nilai 0).',
      'Buka jari telunjuk kanan untuk melambangkan nilai 1.',
      'Tutup empat jari kanan dan buka jempol kanan untuk melambangkan nilai 5.',
      'Buka jari telunjuk kiri untuk melambangkan nilai 10.',
      'Buka jempol kiri untuk melambangkan nilai 50.'
    ]
  },
  {
    id: 'mat-2',
    level: 'Level 1 : Penjumlahan & Pengurangan Angka Satuan',
    title: 'Operasi Jari Satuan Langsung (Direct Single-Digit)',
    description: 'Melatih refleks penjumlahan dan pengurangan langsung di tangan kanan tanpa menggunakan rumus bantuan.',
    formulas: [
      '+1 s.d +4 secara langsung pada tangan kanan',
      '-1 s.d -4 secara langsung pada tangan kanan'
    ],
    steps: [
      'Posisikan tangan kanan mengepal (0).',
      'Latih soal penambahan langsung, contoh: 2 + 2 - 1 = buka 2 jari, buka 2 jari lagi, tutup 1 jari. Hasil akhir = 3.',
      'Latih kombinasi jempol (5), contoh: 1 + 5 + 2 = buka telunjuk (1), buka jempol (5), buka 2 jari lagi (2). Hasil akhir = 8.'
    ]
  },
  {
    id: 'mat-3',
    level: 'Level 2 : Penjumlahan & Pengurangan Angka Puluhan',
    title: 'Operasi Jari Puluhan Langsung (Direct Tens)',
    description: 'Melatih koordinasi tangan kiri untuk nilai puluhan dan tangan kanan untuk nilai satuan dalam operasi langsung.',
    formulas: [
      '+10 s.d +40 secara langsung pada tangan kiri',
      '-10 s.d -40 secara langsung pada tangan kiri'
    ],
    steps: [
      'Gunakan tangan kiri untuk melambangkan nilai puluhan (10, 20, 30, dst).',
      'Contoh soal: 20 + 20 - 10 = buka 2 jari kiri (20), buka 2 jari kiri lagi (20), tutup 1 jari kiri (10). Hasil akhir = 30.',
      'Gabungkan latihan puluhan dan satuan, contoh: 12 + 22 = 34 (3 jari kiri, 4 jari kanan).'
    ]
  },
  {
    id: 'mat-4',
    level: 'Level 3 : Penjumlahan & Pengurangan Angka Ratusan',
    title: 'Operasi Jari Ratusan & Visualisasi Bayangan',
    description: 'Mengembangkan visualisasi ingatan ratusan di otak sementara jari aktif melakukan perhitungan puluhan dan satuan.',
    formulas: [
      'Simpan ratusan di dalam memori/ingatan visual',
      'Gunakan jari tangan kiri (puluhan) dan kanan (satuan) untuk sisa nilai'
    ],
    steps: [
      'Latih siswa untuk menyimpan angka ratusan dalam bayangan visual pikiran.',
      'Lakukan operasi hitung puluhan dan satuan secara aktif di jari kedua tangan.',
      'Sebutkan hasil akhir dengan menggabungkan ratusan di memori dan puluhan/satuan di jari.'
    ]
  },
  {
    id: 'mat-5',
    level: 'Level 4 : Perkalian Dasar 1-5',
    title: 'Konsep Perkalian Jari & Penjumlahan Berulang',
    description: 'Memahami konsep dasar perkalian di bawah 5 menggunakan simulasi gerakan jari penjumlahan berulang yang cepat.',
    formulas: [
      'A x B = Penjumlahan berulang angka A sebanyak B kali'
    ],
    steps: [
      'Ajarkan bahwa perkalian adalah penambahan berulang secara sistematis.',
      'Latih gerakan jari refleks untuk menambahkan angka berulang (Contoh: 3 x 4 = lakukan 3 + 3 + 3 + 3 di jari dengan lincah).',
      'Siswa merekam tempo ketukan jari agar hasil hitung stabil dan tepat.'
    ]
  },
  {
    id: 'mat-6',
    level: 'Level 5 : Perkalian Dasar 6-10',
    title: 'Metode Lipat Jari Formasi Jaritmatika',
    description: 'Menggunakan formasi melipat jari-jari di atas nilai 5 untuk menghitung perkalian 6 sampai 10 secara instan.',
    formulas: [
      'Jari ditekuk/dilipat = Bernilai puluhan (ditambahkan)',
      'Jari berdiri/terbuka = Bernilai satuan (dikalikan)'
    ],
    steps: [
      'Tentukan formasi lipat jari untuk angka di atas 5 (contoh: 7 melipat 2 jari, 8 melipat 3 jari).',
      'Untuk 7 x 8, lipat 2 jari kiri dan 3 jari kanan. Jumlah jari dilipat: 2 + 3 = 5 (bernilai 50).',
      'Kalikan sisa jari yang berdiri: 3 (kiri) x 2 (kanan) = 6.',
      'Jumlahkan hasil puluhan dan satuan: 50 + 6 = 56.'
    ]
  },
  {
    id: 'mat-7',
    level: 'Level 6 : Perkalian Angka Puluhan & Satuan',
    title: 'Metode Pembagian Distributif Cepat',
    description: 'Melakukan perkalian angka dua digit (belasan/puluhan) dengan angka satu digit menggunakan urutan distributif jari.',
    formulas: [
      '(A0 + B) x C = (A0 x C) + (B x C)'
    ],
    steps: [
      'Kalikan angka puluhan dengan pengali terlebih dahulu, simpan hasilnya dalam memori.',
      'Kalikan angka satuan dengan pengali tersebut di jari tangan.',
      'Gabungkan hasil perkalian puluhan di memori dengan hasil satuan di jari.'
    ]
  },
  {
    id: 'mat-8',
    level: 'Level 7 : Perkalian Angka Puluhan & Puluhan',
    title: 'Perkalian Silang Kilat Jaritmatika',
    description: 'Metode tingkat mahir untuk menghitung perkalian dua digit dengan dua digit menggunakan gerak refleks silang.',
    formulas: [
      'Langkah 1: Satuan x Satuan',
      'Langkah 2: (Puluhan x Satuan) + (Satuan x Puluhan) [Kali Silang]',
      'Langkah 3: Puluhan x Puluhan'
    ],
    steps: [
      'Gunakan teknik simpan-tambah di jari untuk menampung angka sisa (carry over).',
      'Latih siswa melakukan kalkulasi mental silang secara berurutan dengan panduan ketukan jari refleks.',
      'Berikan drill harian untuk memperkuat memori jangka pendek anak.'
    ]
  }
];

// Helper to generate a unique Invoice Number
export function generateInvoiceNo(prefix: string = 'INV/MF'): string {
  const dateStr = new Date().toISOString().slice(2, 7).replace('-', ''); // e.g., "2606"
  const rand = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `${prefix}/${dateStr}/${rand}`;
}
