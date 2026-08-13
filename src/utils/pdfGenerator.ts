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
  doc.text(`Kelas Bimbingan  : ${currentStudent.kelas || '-'}`, 110, 61);
  doc.text(`Level Bimbingan  : ${currentStudent.level}`, 110, 68);
  doc.text(`Mulai Bergabung  : ${currentStudent.joinDate}`, 110, 75);

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
  doc.text("( ......................................... )", 160, y, { align: "center" });
  doc.line(135, y + 1, 185, y + 1);
  
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

