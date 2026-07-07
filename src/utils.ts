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
export const SEED_MATERIALS: LearningMaterial[] = [];

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
