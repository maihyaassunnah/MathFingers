import { useState } from 'react';
import { Student, Attendance, TeacherNote, Grade } from '../types';
import { getWhatsAppLink } from '../utils';
import { generateStudentPDFReport } from '../utils/pdfGenerator';
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

  // WhatsApp formatted progress report message sender
  const shareWhatsAppReport = () => {
    if (!currentStudent) return;

    const notesSummary = studentNotes.length > 0 
      ? studentNotes.slice(0, 2).map(n => `• ${n.topic}: "${n.content}"`).join('\n')
      : 'Belum ada catatan tertulis harian.';

    const gradesSummary = studentGrades.length > 0
      ? studentGrades.slice(0, 3).map(g => `• ${g.topic}: Skor ${g.score}/100`).join('\n')
      : 'Belum ada rekaman tes keterampilan.';

    const message = `*LAPORAN PERKEMBANGAN BELAJAR - MATH FINGERS* 📊🌸\n\nHalo Ayah/Bunda dari ananda *${currentStudent.name}*,\nBerikut adalah perkembangan ananda di bimbingan Jaritmatika harian:\n\n📅 *Ringkasan Sesi Presensi:*\n- Kehadiran: *${attendanceRate}%* (${presentCount} dari ${totalAttendance} sesi)\n\n⚡ *Rata-Rata Keterampilan Jari:*\n- Akurasi Berhitung: *${averageScore ? `${averageScore}/100` : 'Belum Ada Tes'}*\n\n📈 *Riwayat Ujian Terakhir:*\n${gradesSummary}\n\n📝 *Catatan Pengajar & Saran Pendampingan:*\n${notesSummary}\n\n_Mari terus latih jari ananda di rumah minimal 10 menit setiap hari ya Ayah/Bunda agar refleks jari semakin lincah dan kilat! Terima kasih_ 🌸✨`;

    window.open(getWhatsAppLink(currentStudent.parentPhone, message), '_blank');
  };

  // jsPDF report generation function
  const downloadPDFReport = () => {
    if (!currentStudent) return;
    generateStudentPDFReport(currentStudent, attendance, notes, grades);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
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
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perkembangan Akurasi & Nilai</h4>
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
                        
                        {/* Custom progress bars mapping for visual score */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Akurasi Jawaban:</span>
                            <span className="font-semibold text-emerald-500">{g.score}/100</span>
                          </div>
                          <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${g.score}%` }} />
                          </div>
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
