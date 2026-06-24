import { useState } from 'react';
import { Student, Attendance, TeacherNote, Grade } from '../types';
import { getWhatsAppLink } from '../utils';
import { 
  TrendingUp, 
  MessageSquare, 
  CheckSquare, 
  Award, 
  Clock, 
  Send, 
  ShieldAlert, 
  Download,
  Calendar,
  Sparkles
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface StudentProgressReportProps {
  students: Student[];
  attendance: Attendance[];
  notes: TeacherNote[];
  grades: Grade[];
  theme?: string;
}

export function StudentProgressReport({ students, attendance, notes, grades, theme = 'dark' }: StudentProgressReportProps) {
  const activeStudents = students.filter(s => s.status === 'active');
  const [currentStudentId, setSelectedStudentId] = useState<string>(activeStudents[0]?.id || '');

  const currentStudent = students.find(s => s.id === currentStudentId);

  // Filter attendance, notes and grades for current student
  const studentAttendance = attendance.filter(a => a.studentId === currentStudentId);
  const studentNotes = notes.filter(n => n.studentId === currentStudentId);
  const studentGrades = grades.filter(g => g.studentId === currentStudentId);

  // Calculations
  const totalAttendance = studentAttendance.length;
  const presentCount = studentAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const averageScore = studentGrades.length > 0
    ? Math.round(studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length)
    : 0;

  const averageSpeed = studentGrades.length > 0
    ? Number((studentGrades.reduce((sum, g) => sum + g.speedSeconds, 0) / studentGrades.length).toFixed(1))
    : 0;

  // Predict speed categorizations for Indonesian Jaritmatika Reflex levels
  const getAgilityBadge = (score: number, seconds: number) => {
    if (score < 80) return { text: 'Perlu Latihan', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    if (seconds <= 5) return { text: 'Refleks Kilat (Dewa)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/25' };
    if (seconds <= 10) return { text: 'Sangat Tangkas', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (seconds <= 18) return { text: 'Tangkas Baik', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    return { text: 'Cukup Refleks', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
  };

  // WhatsApp formatted progress report message sender
  const shareWhatsAppReport = () => {
    if (!currentStudent) return;

    const notesSummary = studentNotes.length > 0 
      ? studentNotes.slice(0, 2).map(n => `• ${n.topic}: "${n.content}"`).join('\n')
      : 'Belum ada catatan tertulis harian.';

    const gradesSummary = studentGrades.length > 0
      ? studentGrades.slice(0, 3).map(g => `• ${g.topic}: Skor ${g.score}/100, Kecepatan: ${g.speedSeconds} Detik`).join('\n')
      : 'Belum ada rekaman tes keterampilan.';

    const message = `*LAPORAN PERKEMBANGAN BELAJAR - MATH FINGGERS* 📊🌸\n\nHalo Ayah/Bunda dari ananda *${currentStudent.name}*,\nBerikut adalah perkembangan ananda di bimbingan Jaritmatika harian:\n\n📅 *Ringkasan Sesi Presensi:*\n- Kehadiran: *${attendanceRate}%* (${presentCount} dari ${totalAttendance} sesi)\n\n⚡ *Rata-Rata Keterampilan Jari:*\n- Akurasi Berhitung: *${averageScore ? `${averageScore}/100` : 'Belum Ada Tes'}*\n- Kecepatan Gerak Refleks: *${averageSpeed ? `${averageSpeed} detik` : 'Belum Ada Tes'}* (Semakin cepat semakin luar biasa!)\n\n📈 *Riwayat Ujian Terakhir:*\n${gradesSummary}\n\n📝 *Catatan Pengajar & Saran Pendampingan:*\n${notesSummary}\n\n_Mari terus latih jari ananda di rumah minimal 10 menit setiap hari ya Ayah/Bunda agar refleks jari semakin lincah dan kilat! Terima kasih_ 🌸✨`;

    window.open(getWhatsAppLink(currentStudent.parentPhone, message), '_blank');
  };

  // jsPDF report generation function
  const downloadPDFReport = () => {
    if (!currentStudent) return;
    
    const doc = new jsPDF();
    
    // Header Banner
    doc.setFillColor(16, 185, 129); // Emerald Green
    doc.rect(0, 0, 210, 40, 'F');
    
    // Logo text
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("MATH FINGGERS", 15, 18);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Berhitung cepat tanpa alat hanya sekejap", 15, 24);
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
    doc.rect(15, 96, 56, 22, 'F');
    doc.rect(77, 96, 56, 22, 'F');
    doc.rect(139, 96, 56, 22, 'F');
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("PERSENTASE PRESENSI", 18, 102);
    doc.text("SKOR RATA-RATA", 80, 102);
    doc.text("KECEPATAN RATA-RATA", 142, 102);
    
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(`${attendanceRate}%`, 18, 110);
    doc.setTextColor(245, 158, 11); // Amber
    doc.text(averageScore ? `${averageScore} / 100` : 'N/A', 80, 110);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text(averageSpeed ? `${averageSpeed} detik` : 'N/A', 142, 110);
    
    // Section Title: Perkembangan Nilai
    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("RIWAYAT UJI KETERAMPILAN JARI (AKURASI & DURASI)", 15, 130);
    doc.line(15, 132, 195, 132);
    
    // Grades Table
    let y = 138;
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text("Tanggal", 18, y);
    doc.text("Materi / Bab Uji Kompetensi", 45, y);
    doc.text("Skor Akurasi", 125, y);
    doc.text("Durasi", 155, y);
    doc.text("Predikat", 175, y);
    
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
        const topicTxt = g.topic.length > 38 ? g.topic.slice(0, 35) + '...' : g.topic;
        doc.text(topicTxt, 45, y);
        doc.text(`${g.score}/100`, 125, y);
        doc.text(`${g.speedSeconds} detik`, 155, y);
        const agility = getAgilityBadge(g.score, g.speedSeconds);
        doc.text(agility.text, 175, y);
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
    doc.text("Math Fingers - Berhitung cepat tanpa alat hanya sekejap. Seluruh hak cipta dilindungi.", 15, y + 5);
    
    doc.setFont("Helvetica", "bold");
    doc.text("Diverifikasi Oleh,", 150, y + 10);
    doc.text("Sistem Math Fingers", 150, y + 25);
    
    doc.save(`Rapor_${currentStudent.name.replace(/\s+/g, '_')}.pdf`);
  };

  const isLight = theme === 'light';

  return (
    <div id="progress-report-section" className="space-y-6">
      {/* Header and Student Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Laporan Perkembangan Siswa</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Rapor digital harian untuk memantau nilai, kehadiran, dan ulasan guru.</p>
        </div>

        {activeStudents.length > 0 && (
          <div className="w-full sm:w-64">
            <select
              id="report-student-selector"
              value={currentStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm ${
                isLight 
                  ? 'bg-white border-slate-200 text-slate-700' 
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {activeStudents.map(s => (
                <option key={s.id} value={s.id} className={isLight ? 'bg-white text-slate-850' : 'bg-[#020617] text-white'}>{s.name} ({s.level})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!currentStudent ? (
        <div className={`p-12 rounded-2xl border text-center shadow-sm ${
          isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
          <ShieldAlert size={44} className="mx-auto text-slate-500 mb-3" />
          <p className={`font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Belum ada data laporan</p>
          <p className="text-xs text-slate-400 mt-1">Silakan daftarkan siswa aktif terlebih dahulu untuk meninjau laporan.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Attendance percentage */}
            <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center font-bold">
                <CheckSquare size={20} />
              </div>
              <div>
                <span className="text-slate-500 text-xs font-semibold block tracking-wider">PRESENSI</span>
                <span className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{attendanceRate}%</span>
                <span className="text-xs text-slate-400 block mt-0.5">{presentCount} dari {totalAttendance} Sesi</span>
              </div>
            </div>

            {/* Card 2: Average Quiz Score */}
            <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center font-bold">
                <Award size={20} />
              </div>
              <div>
                <span className="text-slate-500 text-xs font-semibold block tracking-wider">SKOR RATA-RATA</span>
                <span className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{averageScore ? `${averageScore}/100` : 'N/A'}</span>
                <span className="text-xs text-slate-400 block mt-0.5">{studentGrades.length} Sesi Latihan</span>
              </div>
            </div>

            {/* Card 3: Speed Score */}
            <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center font-bold">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-slate-500 text-xs font-semibold block tracking-wider">KECEPATAN RATA-RATA</span>
                <span className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{averageSpeed ? `${averageSpeed}s` : 'N/A'}</span>
                <span className="text-xs text-slate-400 block mt-0.5 font-mono">Semakin rendah semakin kilat</span>
              </div>
            </div>
          </div>

          {/* Visual Report Card Canvas layout */}
          <div className={`border rounded-2xl shadow-sm overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className={`p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/40 border-slate-800'
            }`}>
              <div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md">RAPOR DIGITAL</span>
                <h3 className={`text-lg font-extrabold mt-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>Ringkasan Prestasi: {currentStudent.name}</h3>
                <p className="text-slate-400 text-xs">Mulai belajar: {currentStudent.joinDate} &bull; Wali: {currentStudent.parentName}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* PDF Download Button */}
                <button
                  id="btn-download-report-pdf"
                  onClick={downloadPDFReport}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition duration-150 shadow-sm"
                >
                  <Download size={15} />
                  <span>Unduh PDF</span>
                </button>

                {/* Share WA Button */}
                <button
                  id="btn-share-report-wa"
                  onClick={shareWhatsAppReport}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition duration-150"
                >
                  <Send size={15} />
                  <span>Bagikan ke WA</span>
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Grade history list & speed visualization */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="text-slate-500" size={16} />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perkembangan Uji Refleks Jari</h4>
                </div>

                {studentGrades.length === 0 ? (
                  <p className={`text-sm italic p-4 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}>Belum ada riwayat tes keterampilan berhitung harian.</p>
                ) : (
                  <div className="space-y-3">
                    {studentGrades.map((g) => (
                      <div key={g.id} className={`p-3.5 border rounded-xl space-y-2 ${
                        isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-950/40 border-slate-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-sm truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{g.topic}</span>
                          <span className="text-xs text-slate-500 font-mono">{g.date}</span>
                        </div>
                        
                        {/* Custom progress bars mapping for visual speed and score */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Akurasi Jawaban:</span>
                            <span className="font-semibold text-emerald-500">{g.score}/100</span>
                          </div>
                          <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${g.score}%` }} />
                          </div>

                          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                            <span>Durasi Penyelesaian:</span>
                            <span className="font-semibold text-blue-500">{g.speedSeconds} detik</span>
                          </div>
                          <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                            {/* Max representation is 30 seconds for speed bar scale */}
                            <div className="bg-blue-500 h-full transition-all" style={{ width: `${Math.min((g.speedSeconds / 30) * 100, 100)}%` }} />
                          </div>
                        </div>

                        {/* Predicate Speed Badge */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-500">Hasil Predikat:</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getAgilityBadge(g.score, g.speedSeconds).color}`}>
                            {getAgilityBadge(g.score, g.speedSeconds).text}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Teacher Notes logs */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="text-slate-500" size={16} />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catatan & Saran Pengajar</h4>
                </div>

                {studentNotes.length === 0 ? (
                  <p className={`text-sm italic p-4 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}>Belum ada evaluasi atau catatan belajar tertulis.</p>
                ) : (
                  <div className="space-y-3">
                    {studentNotes.map((n) => (
                      <div key={n.id} className={`p-4 rounded-xl border space-y-2 ${
                        isLight ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-500/5 border-amber-500/10'
                      }`}>
                        <div className="flex items-center justify-between border-b border-amber-500/10 pb-1.5">
                          <span className="font-semibold text-amber-500 text-xs">Materi: {n.topic}</span>
                          <span className="text-[10px] text-amber-500/70 font-mono">{n.date}</span>
                        </div>
                        <p className={`text-xs sm:text-sm leading-relaxed italic ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          "{n.content}"
                        </p>
                        <div className="text-[10px] text-right text-slate-500 font-medium">
                          &mdash; {n.teacherName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
