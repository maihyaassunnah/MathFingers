import { jsPDF } from 'jspdf';
import { Student, Attendance, TeacherNote, Grade } from '../types';
import { getStudentUniqueCode } from '../utils';

// Helper to convert QR URL or Image into a canvas DataURL for crisp embedding into jsPDF
export async function getQrDataUrlForPdf(student: Student, size: number = 300, inkSaver: boolean = false): Promise<string> {
  const dataUrl = `https://mathfingers.app/scan?scan_student=${student.id}`;
  const qrColor = inkSaver ? '000000' : '059669';
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(dataUrl)}&color=${qrColor}`;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || size;
        canvas.height = img.height || size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (err) {
        console.warn('Canvas toDataURL failed in QR export, fallback to URL:', err);
      }
      resolve(qrImgUrl);
    };
    img.onerror = () => {
      resolve(qrImgUrl);
    };
    img.src = qrImgUrl;
  });
}

// Predict speed categorizations for Indonesian Jaritmatika Reflex levels
export const getAgilityBadge = (score: number, seconds: number) => {
  if (score < 80) return { text: 'Perlu Latihan', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  if (seconds <= 5) return { text: 'Refleks Kilat (Dewa)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/25' };
  if (seconds <= 10) return { text: 'Sangat Tangkas', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  if (seconds <= 18) return { text: 'Tangkas Baik', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  return { text: 'Cukup Refleks', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
};

// Helper to automatically resolve teacher signature based on branch or user
export function getTeacherSignatureName(
  student?: { branch?: string } | null,
  currentUser?: { name?: string; branch?: string } | null,
  notes?: { teacherName?: string; branch?: string }[]
): string {
  // Normalize strings
  const sBranch = (student?.branch || '').trim().toLowerCase();
  const uBranch = (currentUser?.branch || '').trim().toLowerCase();
  const uName = (currentUser?.name || '').trim().toLowerCase();

  // 1. Direct match on student's branch
  if (sBranch.includes('bangko')) return 'Dewi Safitri, S.H';
  if (sBranch.includes('singkut')) return 'Febrianti Dewi, S.Pd';

  // 2. Direct match on current logged-in account branch
  if (uBranch.includes('bangko')) return 'Dewi Safitri, S.H';
  if (uBranch.includes('singkut')) return 'Febrianti Dewi, S.Pd';

  // 3. Match on current user's name
  if (uName.includes('safitri') || uName.includes('dewi safitri') || uName.includes('bangko')) {
    return 'Dewi Safitri, S.H';
  }
  if (uName.includes('febrianti') || uName.includes('singkut')) {
    return 'Febrianti Dewi, S.Pd';
  }

  // 4. Check notes for branch or teacher name
  if (notes && notes.length > 0) {
    for (const note of notes) {
      const nBranch = (note.branch || '').toLowerCase();
      if (nBranch.includes('bangko')) return 'Dewi Safitri, S.H';
      if (nBranch.includes('singkut')) return 'Febrianti Dewi, S.Pd';

      const tName = (note.teacherName || '').toLowerCase();
      if (tName.includes('safitri') || tName.includes('dewi safitri') || tName.includes('bangko')) {
        return 'Dewi Safitri, S.H';
      }
      if (tName.includes('febrianti') || tName.includes('singkut')) {
        return 'Febrianti Dewi, S.Pd';
      }
    }
  }

  // Default fallback if branch not explicitly Singkut
  return 'Dewi Safitri, S.H';
}

// Generate Official Printable Single QR Card PDF matching Fullscreen Preview Exactly
export async function generateStudentQrCardPDF(
  student: Student,
  currentUser?: { name?: string; branch?: string } | null,
  notes?: TeacherNote[],
  inkSaver: boolean = false
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const studentNotes = (notes || []).filter(n => n.studentId === student.id);
  const teacherSignature = getTeacherSignatureName(student, currentUser, studentNotes);
  const qrDataUrl = await getQrDataUrlForPdf(student, 300, inkSaver);

  const primaryColor: [number, number, number] = inkSaver ? [30, 41, 59] : [5, 150, 105]; // #059669
  const secondaryColor: [number, number, number] = inkSaver ? [100, 116, 139] : [52, 211, 153]; // #34d399

  // Card dimensions on A4: centered card
  const cardX = 35;
  const cardY = 24;
  const cardW = 140;
  const cardH = 248;

  // 1. Card Container Background
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cardX, cardY, cardW, cardH, 8, 8, 'F');

  // 2. Outer Border (Solid)
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1.1);
  doc.roundedRect(cardX, cardY, cardW, cardH, 8, 8, 'S');

  // 3. Inner Dashed Border
  doc.setDrawColor(...secondaryColor);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2.5, 1.8], 0);
  doc.roundedRect(cardX + 2.5, cardY + 2.5, cardW - 5, cardH - 5, 6, 6, 'S');
  doc.setLineDashPattern([], 0); // Reset dash

  // 4. Header Branding
  doc.setTextColor(...primaryColor);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MATH FINGERS", 105, cardY + 13, { align: "center" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Berhitung Cepat & Akurat Tanpa Alat", 105, cardY + 17.5, { align: "center" });

  // Badge: KARTU PRESENSI RESMI
  if (inkSaver) {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(80, cardY + 20.5, 50, 5.5, 1.5, 1.5, 'FD');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
  } else {
    doc.setFillColor(...primaryColor);
    doc.roundedRect(80, cardY + 20.5, 50, 5.5, 1.5, 1.5, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
  }
  doc.text("KARTU PRESENSI RESMI", 105, cardY + 24.3, { align: "center" });

  // 5. QR Code & Student Photo Box
  if (student.photoUrl) {
    // Side-by-Side: Photo on Left, QR on Right
    const itemBoxSize = 48;
    const gap = 6;
    const totalW = itemBoxSize * 2 + gap;
    const startX = 105 - totalW / 2;
    const boxY = cardY + 32;

    // 5a. Photo Frame
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(startX, boxY, itemBoxSize, itemBoxSize, 4, 4, 'FD');

    try {
      doc.addImage(student.photoUrl, 'JPEG', startX + 2, boxY + 2, itemBoxSize - 4, itemBoxSize - 4);
    } catch (e) {
      console.warn('Could not add student photo to PDF:', e);
    }

    // 5b. QR Box
    const qrBoxX = startX + itemBoxSize + gap;
    if (inkSaver) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
    } else {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
    }
    doc.roundedRect(qrBoxX, boxY, itemBoxSize, itemBoxSize, 4, 4, 'FD');

    try {
      doc.addImage(qrDataUrl, 'PNG', qrBoxX + 2, boxY + 2, itemBoxSize - 4, itemBoxSize - 4);
    } catch (e) {
      console.error('Failed to draw QR image into PDF:', e);
    }
  } else {
    // Standard Centered QR Box
    const qrBoxSize = 58;
    const qrBoxX = 105 - qrBoxSize / 2;
    const qrBoxY = cardY + 29;

    if (inkSaver) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
    } else {
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.setDrawColor(187, 247, 208); // emerald-200
    }
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 4, 4, 'FD');

    // Insert QR Code image
    const qrImgSize = 50;
    const qrImgX = 105 - qrImgSize / 2;
    const qrImgY = qrBoxY + 4;
    try {
      doc.addImage(qrDataUrl, 'PNG', qrImgX, qrImgY, qrImgSize, qrImgSize);
    } catch (e) {
      console.error('Failed to draw QR image into PDF:', e);
    }
  }

  // 6. Student Name & Code
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  const studentNameFormatted = student.name.length > 28 ? student.name.slice(0, 26) + '...' : student.name;
  doc.text(studentNameFormatted, 105, cardY + 94, { align: "center" });

  // Student ID Badge
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(85, cardY + 97, 40, 6, 2, 2, 'FD');
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`ID: #${getStudentUniqueCode(student)}`, 105, cardY + 101.2, { align: "center" });

  // 7. Student Info Details Box
  const infoBoxX = cardX + 8;
  const infoBoxY = cardY + 106;
  const infoBoxW = cardW - 16;
  const infoBoxH = 46;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(infoBoxX, infoBoxY, infoBoxW, infoBoxH, 3, 3, 'FD');

  doc.setFontSize(8.5);
  // Row 1: Cabang & Kelas
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Cabang", infoBoxX + 4, infoBoxY + 7);
  doc.text(":", infoBoxX + 22, infoBoxY + 7);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(student.branch || 'Pusat', infoBoxX + 25, infoBoxY + 7);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Kelas", infoBoxX + 68, infoBoxY + 7);
  doc.text(":", infoBoxX + 80, infoBoxY + 7);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(5, 150, 105);
  doc.text(student.kelas || '-', infoBoxX + 83, infoBoxY + 7);

  // Row 2: Level & Status
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Level", infoBoxX + 4, infoBoxY + 15);
  doc.text(":", infoBoxX + 22, infoBoxY + 15);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  const lvlText = student.level ? student.level.split(':')[0] : 'Dasar';
  doc.text(lvlText, infoBoxX + 25, infoBoxY + 15);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Status", infoBoxX + 68, infoBoxY + 15);
  doc.text(":", infoBoxX + 80, infoBoxY + 15);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(student.status === 'active' ? 5 : 100, student.status === 'active' ? 150 : 116, student.status === 'active' ? 105 : 139);
  doc.text(student.status === 'active' ? 'Aktif' : 'Nonaktif', infoBoxX + 83, infoBoxY + 15);

  // Row 3: Wali / Orang Tua
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Wali / Ortu", infoBoxX + 4, infoBoxY + 23);
  doc.text(":", infoBoxX + 22, infoBoxY + 23);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  const parentNameFormatted = (student.parentName || '-').length > 25 ? (student.parentName || '').slice(0, 23) + '...' : (student.parentName || '-');
  doc.text(parentNameFormatted, infoBoxX + 25, infoBoxY + 23);

  // Row 4: No. Kontak
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("No. Kontak", infoBoxX + 4, infoBoxY + 31);
  doc.text(":", infoBoxX + 22, infoBoxY + 31);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(student.parentPhone || '-', infoBoxX + 25, infoBoxY + 31);

  // Row 5: Mulai Bergabung
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Bergabung", infoBoxX + 4, infoBoxY + 39);
  doc.text(":", infoBoxX + 22, infoBoxY + 39);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(student.joinDate || '-', infoBoxX + 25, infoBoxY + 39);

  // 8. Parent & Tutor Signature Space (Crucial User Requirement)
  const sigDividerY = cardY + 156;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(cardX + 8, sigDividerY, cardX + cardW - 8, sigDividerY);

  const sigTitleY = cardY + 162;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Orang Tua / Wali Siswa", cardX + 32, sigTitleY, { align: "center" });
  doc.text("Pengajar / Tutor Math Fingers", cardX + cardW - 32, sigTitleY, { align: "center" });

  // Signature lines & names
  const sigNameY = cardY + 185;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  // Parent signature block
  doc.text(`( ${student.parentName || '................................'} )`, cardX + 32, sigNameY, { align: "center" });
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(cardX + 12, sigNameY + 1, cardX + 52, sigNameY + 1);

  // Teacher signature block
  doc.text(`( ${teacherSignature} )`, cardX + cardW - 32, sigNameY, { align: "center" });
  doc.line(cardX + cardW - 52, sigNameY + 1, cardX + cardW - 12, sigNameY + 1);

  // 9. Official Footer Instructions
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(7.2);
  doc.setTextColor(148, 163, 184);
  doc.text("Simpan kartu ini di ID Card holder atau tempel pada buku modul siswa.", 105, cardY + 196, { align: "center" });
  doc.text("Tunjukkan kode QR kepada tutor saat masuk kelas untuk mencatat presensi.", 105, cardY + 200, { align: "center" });
  doc.text("Math Fingers - Berhitung Cepat & Akurat Tanpa Alat.", 105, cardY + 204, { align: "center" });

  // Download the resulting PDF
  doc.save(`Kartu_QR_${student.name.replace(/\s+/g, '_')}_MathFingers.pdf`);
}

// Generate Multi/Batch Student QR Cards PDF
export async function generateBatchStudentQrCardsPDF(
  students: Student[],
  currentUser?: { name?: string; branch?: string } | null,
  notes?: TeacherNote[],
  inkSaver: boolean = false
) {
  if (students.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor: [number, number, number] = inkSaver ? [30, 41, 59] : [5, 150, 105];

  // 2 cards per A4 page (Top & Bottom), beautifully aligned with signatures
  const cardsPerPage = 2;
  const totalPages = Math.ceil(students.length / cardsPerPage);

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const pageIndex = Math.floor(i / cardsPerPage);
    const cardSlot = i % cardsPerPage; // 0 for top, 1 for bottom

    if (i > 0 && cardSlot === 0) {
      doc.addPage();
    }

    const studentNotes = (notes || []).filter(n => n.studentId === student.id);
    const teacherSignature = getTeacherSignatureName(student, currentUser, studentNotes);
    const qrDataUrl = await getQrDataUrlForPdf(student, 250, inkSaver);

    // Position of card slot
    const cardX = 18;
    const cardY = cardSlot === 0 ? 12 : 152;
    const cardW = 174;
    const cardH = 132;

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, 'F');

    // Outer border
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.8);
    doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, 'S');

    // Inner dashed cut border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([2, 1.5], 0);
    doc.roundedRect(cardX + 2, cardY + 2, cardW - 4, cardH - 4, 4, 4, 'S');
    doc.setLineDashPattern([], 0);

    // Left Column: QR Code & Header
    doc.setTextColor(...primaryColor);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("MATH FINGERS", cardX + 32, cardY + 10, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("KARTU PRESENSI RESMI", cardX + 32, cardY + 14, { align: "center" });

    // QR Box
    const qrBoxSize = 42;
    const qrBoxX = cardX + 11;
    const qrBoxY = cardY + 17;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 3, 3, 'FD');

    try {
      doc.addImage(qrDataUrl, 'PNG', qrBoxX + 2.5, qrBoxY + 2.5, qrBoxSize - 5, qrBoxSize - 5);
    } catch (e) {}

    // ID Badge below QR
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cardX + 14, cardY + 62, 36, 5, 1.5, 1.5, 'FD');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`ID: #${getStudentUniqueCode(student)}`, cardX + 32, cardY + 65.5, { align: "center" });

    // Right Column: Student Info
    const rightColX = cardX + 58;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(student.name, rightColX, cardY + 11);

    // Info details table
    const infoW = cardW - 64;
    const infoH = 34;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(rightColX, cardY + 16, infoW, infoH, 2, 2, 'FD');

    doc.setFontSize(7.5);
    // Info items
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Cabang :", rightColX + 3, cardY + 22);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(student.branch || 'Pusat', rightColX + 18, cardY + 22);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Kelas :", rightColX + 55, cardY + 22);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text(student.kelas || '-', rightColX + 66, cardY + 22);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Level   :", rightColX + 3, cardY + 29);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(student.level ? student.level.split(':')[0] : 'Dasar', rightColX + 18, cardY + 29);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Wali    :", rightColX + 3, cardY + 36);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(student.parentName || '-', rightColX + 18, cardY + 36);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Kontak :", rightColX + 3, cardY + 43);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(student.parentPhone || '-', rightColX + 18, cardY + 43);

    // Signatures in Batch card
    const sigY = cardY + 54;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Orang Tua / Wali Siswa", rightColX + 22, sigY, { align: "center" });
    doc.text("Pengajar / Tutor", rightColX + infoW - 22, sigY, { align: "center" });

    // Underlines & Names
    const sigNameY = cardY + 70;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    doc.text(`( ${student.parentName || '....................'} )`, rightColX + 22, sigNameY, { align: "center" });
    doc.line(rightColX + 4, sigNameY + 1, rightColX + 40, sigNameY + 1);

    doc.text(`( ${teacherSignature} )`, rightColX + infoW - 22, sigNameY, { align: "center" });
    doc.line(rightColX + infoW - 40, sigNameY + 1, rightColX + infoW - 4, sigNameY + 1);

    // Footer notice
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Math Fingers - Berhitung Cepat & Akurat Tanpa Alat. Tempel pada buku modul siswa.", cardX + cardW / 2, cardY + cardH - 4, { align: "center" });
  }

  doc.save(`Koleksi_Kartu_QR_MathFingers_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function generateStudentPDFReport(
  currentStudent: Student,
  attendance: Attendance[],
  notes: TeacherNote[],
  grades: Grade[],
  currentUser?: { name?: string; branch?: string } | null
) {
  const doc = new jsPDF();
  
  // Filter data for the specific student
  const studentAttendance = attendance.filter(a => a.studentId === currentStudent.id);
  const studentNotes = notes.filter(n => n.studentId === currentStudent.id);
  const studentGrades = grades.filter(g => g.studentId === currentStudent.id);

  // Auto-resolve teacher signature name based on branch
  const teacherSignature = getTeacherSignatureName(currentStudent, currentUser, studentNotes);

  // Calculations
  const totalAttendance = studentAttendance.length;
  const presentCount = studentAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const averageScore = studentGrades.length > 0
    ? Math.round(studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length)
    : 0;

  // Header Banner (Emerald Green)
  doc.setFillColor(16, 185, 129); // Emerald Green #10b981
  doc.rect(0, 0, 210, 38, 'F');
  
  // Logo & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MATH FINGERS", 15, 16);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Berhitung Cepat & Akurat Tanpa Alat", 15, 22);
  doc.text("Sistem Rapor Keterampilan Berhitung Jari Digital", 15, 27);
  
  // Header Badge (Right side)
  doc.setFontSize(13);
  doc.setFont("Helvetica", "bold");
  doc.text("RAPOR DIGITAL", 148, 18);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(printDateStr, 148, 25);
  
  // Student Information Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 44, 180, 46, 'F');
  doc.rect(15, 44, 180, 46, 'S');
  
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(10);
  doc.setFont("Helvetica", "bold");
  doc.text("INFORMASI SISWA", 20, 52);
  doc.setDrawColor(203, 213, 225);
  doc.line(20, 54, 190, 54);
  
  doc.setFontSize(9);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(51, 65, 85);

  // Left Column Info
  doc.text(`Nama Lengkap     : ${currentStudent.name}`, 20, 61);
  doc.text(`Wali / Orang Tua  : ${currentStudent.parentName}`, 20, 68);
  doc.text(`Nomor Kontak     : ${currentStudent.parentPhone}`, 20, 75);
  doc.text(`Status Keaktifan : ${currentStudent.status === 'active' ? 'Aktif' : 'Nonaktif'}`, 20, 82);
  
  // Right Column Info
  doc.text(`Kelas Bimbingan  : ${currentStudent.kelas || '-'}`, 104, 61);
  doc.text(`Level Bimbingan  : ${currentStudent.level}`, 104, 68);
  doc.text(`Mulai Bergabung  : ${currentStudent.joinDate}`, 104, 75);

  // Photo in Report if available
  if (currentStudent.photoUrl) {
    try {
      const photoSize = 24;
      const photoX = 168;
      const photoY = 58;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, 'FD');
      doc.addImage(currentStudent.photoUrl, 'JPEG', photoX + 1, photoY + 1, photoSize - 2, photoSize - 2);
    } catch (e) {
      console.warn('Could not add student photo to report:', e);
    }
  }

  // Statistics Summary Blocks
  // Block 1: Presensi
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.rect(15, 96, 86, 22, 'FD');
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text("PERSENTASE PRESENSI", 18, 102);
  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`${attendanceRate}%`, 18, 110);
  doc.setFontSize(8);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(4, 120, 87);
  doc.text(`${presentCount} dari ${totalAttendance} Sesi Hadir`, 45, 110);

  // Block 2: Skor Rata-rata
  doc.setFillColor(254, 243, 199); // amber-50
  doc.setDrawColor(253, 230, 138); // amber-200
  doc.rect(109, 96, 86, 22, 'FD');
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text("SKOR RATA-RATA UJI", 112, 102);
  doc.setFontSize(13);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(averageScore ? `${averageScore}/100` : 'N/A', 112, 110);
  doc.setFontSize(8);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(180, 83, 9);
  doc.text(`${studentGrades.length} Sesi Evaluasi`, 152, 110);

  // Section 1: Grades History
  let y = 126;
  doc.setTextColor(15, 23, 42);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.text("RIWAYAT UJI KETERAMPILAN JARI (AKURASI)", 15, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y + 2, 195, y + 2);
  
  y += 8;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 7, 'F');
  
  doc.setFontSize(8);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Tanggal", 18, y + 5);
  doc.text("Materi / Bab Uji Kompetensi", 50, y + 5);
  doc.text("Skor Akurasi", 160, y + 5);
  
  y += 7;
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  
  if (studentGrades.length === 0) {
    y += 6;
    doc.text("Belum ada riwayat uji keterampilan berhitung.", 18, y);
    y += 2;
  } else {
    studentGrades.slice(0, 6).forEach((g) => {
      y += 6;
      doc.text(g.date, 18, y);
      const topicTxt = g.topic.length > 50 ? g.topic.slice(0, 47) + '...' : g.topic;
      doc.text(topicTxt, 50, y);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(5, 150, 105);
      doc.text(`${g.score} / 100`, 160, y);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 2, 195, y + 2);
    });
  }

  // Section 2: Teacher Notes
  y += 12;
  doc.setTextColor(15, 23, 42);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CATATAN & EVALUASI BELAJAR GURU", 15, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y + 2, 195, y + 2);
  
  y += 8;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  
  if (studentNotes.length === 0) {
    doc.text("Belum ada catatan evaluasi tertulis dari pengajar.", 18, y);
    y += 6;
  } else {
    studentNotes.slice(0, 3).forEach((n) => {
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(180, 83, 9);
      doc.text(`Materi: ${n.topic} (${n.date})`, 18, y);
      y += 4.5;
      
      doc.setFont("Helvetica", "italic");
      doc.setTextColor(71, 85, 105);
      const splitContent = doc.splitTextToSize(`"${n.content}" - (${n.teacherName})`, 175);
      doc.text(splitContent, 18, y);
      y += splitContent.length * 4 + 3;
    });
  }

  // Signatures & Footer Section (Tanda Tangan)
  y = Math.max(y + 10, 235);
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y, 195, y);
  
  y += 8;
  
  // Left Column: Tanda Tangan Orang Tua
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Orang Tua / Wali Siswa", 35, y, { align: "center" });
  
  // Right Column: Tanda Tangan Pengajar
  doc.text("Pengajar / Tutor Math Fingers", 160, y, { align: "center" });
  
  // Signature Lines & Names
  y += 22; // Signature spacing area
  
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  
  // Parent Name Line
  doc.text(`( ${currentStudent.parentName} )`, 35, y, { align: "center" });
  doc.line(15, y + 1, 55, y + 1);
  
  // Teacher Name Line
  doc.text(`( ${teacherSignature} )`, 160, y, { align: "center" });
  doc.line(130, y + 1, 190, y + 1);
  
  // Bottom Footer Notice
  y += 10;
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Math Fingers - Berhitung Cepat & Akurat Tanpa Alat. Dokumen Rapor Resmi Math Fingers Digital.",
    105,
    y,
    { align: "center" }
  );

  doc.save(`Rapor_${currentStudent.name.replace(/\s+/g, '_')}.pdf`);
}

