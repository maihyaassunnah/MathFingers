import { jsPDF } from 'jspdf';
import { Student, Attendance, TeacherNote, Grade } from '../types';

// Predict speed categorizations for Indonesian Jaritmatika Reflex levels
export const getAgilityBadge = (score: number, seconds: number) => {
  if (score < 80) return { text: 'Perlu Latihan', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  if (seconds <= 5) return { text: 'Refleks Kilat (Dewa)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/25' };
  if (seconds <= 10) return { text: 'Sangat Tangkas', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  if (seconds <= 18) return { text: 'Tangkas Baik', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  return { text: 'Cukup Refleks', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
};

export function generateStudentPDFReport(
  currentStudent: Student,
  attendance: Attendance[],
  notes: TeacherNote[],
  grades: Grade[]
) {
  const doc = new jsPDF();
  
  // Filter data for the specific student
  const studentAttendance = attendance.filter(a => a.studentId === currentStudent.id);
  const studentNotes = notes.filter(n => n.studentId === currentStudent.id);
  const studentGrades = grades.filter(g => g.studentId === currentStudent.id);

  // Calculations
  const totalAttendance = studentAttendance.length;
  const presentCount = studentAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const averageScore = studentGrades.length > 0
    ? Math.round(studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length)
    : 0;

  // Header Banner
  doc.setFillColor(16, 185, 129); // Emerald Green
  doc.rect(0, 0, 210, 40, 'F');
  
  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MATH FINGERS", 15, 18);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Berhitung Cepat & Akurat Tanpa Alat", 15, 24);
  doc.text("Sistem Rapor Keterampilan Berhitung Jari Digital", 15, 29);
  
  doc.setFontSize(14);
  doc.setFont("Helvetica", "bold");
  doc.text("RAPOR DIGITAL", 150, 24);
  
  // Student Meta Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 48, 180, 42, 'F');
  doc.rect(15, 48, 180, 42, 'S');
  
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.setFont("Helvetica", "bold");
  doc.text("INFORMASI SISWA", 20, 54);
  doc.line(20, 56, 190, 56);
  
  doc.setFont("Helvetica", "normal");
  doc.text(`Nama Lengkap    : ${currentStudent.name}`, 20, 63);
  doc.text(`Wali / Orang Tua : ${currentStudent.parentName}`, 20, 69);
  doc.text(`Nomor Kontak    : ${currentStudent.parentPhone}`, 20, 75);
  doc.text(`Status Keaktifan: ${currentStudent.status === 'active' ? 'Aktif' : 'Nonaktif'}`, 20, 81);
  
  doc.text(`Level Bimbingan : ${currentStudent.level}`, 110, 63);
  doc.text(`Mulai Bergabung : ${currentStudent.joinDate}`, 110, 69);
  doc.text(`Tanggal Cetak   : ${new Date().toLocaleDateString('id-ID')}`, 110, 75);
  
  // Statistics Blocks
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 96, 86, 22, 'F');
  doc.rect(109, 96, 86, 22, 'F');
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("PERSENTASE PRESENSI", 18, 102);
  doc.text("SKOR RATA-RATA", 112, 102);
  
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`${attendanceRate}%`, 18, 110);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(averageScore ? `${averageScore} / 100` : 'N/A', 112, 110);
  
  // Section Title: Perkembangan Nilai
  doc.setTextColor(30, 41, 59);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RIWAYAT UJI KETERAMPILAN JARI (AKURASI)", 15, 130);
  doc.line(15, 132, 195, 132);
  
  // Grades Table
  let y = 138;
  doc.setFontSize(9);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("Tanggal", 18, y);
  doc.text("Materi / Bab Uji Kompetensi", 45, y);
  doc.text("Skor Akurasi", 155, y);
  
  doc.line(15, y+2, 195, y+2);
  
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  
  if (studentGrades.length === 0) {
    y += 10;
    doc.text("Belum ada riwayat uji kompetensi berhitung.", 20, y);
  } else {
    studentGrades.slice(0, 8).forEach((g) => {
      y += 8;
      doc.text(g.date, 18, y);
      const topicTxt = g.topic.length > 55 ? g.topic.slice(0, 52) + '...' : g.topic;
      doc.text(topicTxt, 45, y);
      doc.text(`${g.score}/100`, 155, y);
    });
  }
  
  // Section Title: Notes
  y += 14;
  doc.setTextColor(30, 41, 59);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CATATAN & EVALUASI BELAJAR GURU", 15, y);
  doc.line(15, y+2, 195, y+2);
  
  y += 8;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  
  if (studentNotes.length === 0) {
    doc.text("Belum ada catatan evaluasi dari pengajar.", 20, y);
  } else {
    studentNotes.slice(0, 3).forEach((n) => {
      const fullText = `[${n.date}] - Materi: ${n.topic}. Catatan: "${n.content}" (${n.teacherName})`;
      const splitText = doc.splitTextToSize(fullText, 170);
      doc.text(splitText, 18, y);
      y += splitText.length * 5 + 2;
    });
  }
  
  // Footer / Signature block
  y = Math.max(y + 15, 245);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);
  
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Math Fingers - Berhitung Cepat & Akurat Tanpa Alat. Seluruh hak cipta dilindungi.", 15, y + 5);
  
  doc.setFont("Helvetica", "bold");
  doc.text("Diverifikasi Oleh,", 150, y + 10);
  doc.text("Sistem Math Fingers", 150, y + 25);
  
  doc.save(`Rapor_${currentStudent.name.replace(/\s+/g, '_')}.pdf`);
}
