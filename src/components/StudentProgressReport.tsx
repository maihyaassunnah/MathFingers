import { useState, useMemo, useEffect } from 'react';
import { Student, Attendance, TeacherNote, Grade, ClassGroup, AdminUser } from '../types';
import { getWhatsAppLink } from '../utils';
import { generateStudentPDFReport, getTeacherSignatureName } from '../utils/pdfGenerator';
import { 
  TrendingUp, 
  MessageSquare, 
  CheckSquare, 
  Award, 
  Send, 
  ShieldAlert, 
  Download,
  Calendar,
  Eye,
  Printer,
  X,
  FileText,
  Users,
  CheckCircle2,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';

interface StudentProgressReportProps {
  students: Student[];
  attendance: Attendance[];
  notes: TeacherNote[];
  grades: Grade[];
  classes?: ClassGroup[];
  currentUser?: AdminUser | null;
  theme?: string;
}

export function StudentProgressReport({ 
  students, 
  attendance, 
  notes, 
  grades, 
  classes = [], 
  currentUser,
  theme = 'dark' 
}: StudentProgressReportProps) {
  const activeStudents = useMemo(() => students.filter(s => s.status === 'active'), [students]);

  // Class Filter state
  const [classFilter, setClassFilter] = useState<string>('All');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Available unique classes list
  const availableClasses = useMemo(() => {
    return Array.from(
      new Set([
        ...classes.map(c => c.name),
        ...activeStudents.map(s => s.kelas).filter((k): k is string => Boolean(k && k.trim()))
      ])
    )
      .filter(Boolean)
      .filter(c => {
        const lower = c.toLowerCase();
        return (
          !lower.includes('pengenalan') &&
          !lower.includes('simbol jari') &&
          !lower.includes('kelas dasar') &&
          !lower.includes('level dasar')
        );
      })
      .sort();
  }, [classes, activeStudents]);

  // Filtered active students according to class filter
  const filteredStudents = useMemo(() => {
    return activeStudents.filter(s => {
      if (classFilter === 'All') return true;
      if (classFilter === 'UNASSIGNED') return !s.kelas;
      return s.kelas === classFilter;
    });
  }, [activeStudents, classFilter]);

  // Selected student state
  const [currentStudentId, setSelectedStudentId] = useState<string>(filteredStudents[0]?.id || activeStudents[0]?.id || '');

  // Keep selected student synced when filter changes
  useEffect(() => {
    if (filteredStudents.length > 0) {
      if (!filteredStudents.some(s => s.id === currentStudentId)) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [filteredStudents, currentStudentId]);

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

  // Teacher signature resolution based on branch
  const teacherSignature = getTeacherSignatureName(currentStudent, currentUser, studentNotes);

  // jsPDF report generation function
  const downloadPDFReport = () => {
    if (!currentStudent) return;
    generateStudentPDFReport(currentStudent, attendance, notes, grades, currentUser);
  };

  const handlePrint = () => {
    window.print();
  };

  const isLight = theme === 'light';

  return (
    <div id="progress-report-section" className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Laporan Perkembangan Siswa</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Rapor digital harian untuk memantau nilai, kehadiran, dan ulasan guru.</p>
        </div>

        {activeStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Filter Kelas Dropdown */}
            <div className="w-full sm:w-[200px]">
              <CustomDropdown
                id="report-class-filter"
                value={classFilter}
                onChange={(val) => setClassFilter(val)}
                options={[
                  { value: 'All', label: 'Semua Kelas' },
                  ...availableClasses.map(c => ({ value: c, label: `Kelas: ${c}` })),
                  ...(activeStudents.some(s => !s.kelas) ? [{ value: 'UNASSIGNED', label: 'Tanpa Kelas' }] : [])
                ]}
                theme={theme}
                className="w-full"
              />
            </div>

            {/* Student Selector Dropdown */}
            <div className="w-full sm:w-[260px]">
              <CustomDropdown
                id="report-student-selector"
                value={currentStudentId}
                onChange={(val) => setSelectedStudentId(val)}
                options={
                  filteredStudents.length > 0
                    ? filteredStudents.map(s => ({
                        value: s.id,
                        label: `${s.name}${s.kelas ? ` (${s.kelas})` : ''}`
                      }))
                    : [{ value: '', label: '-- Tidak Ada Siswa --' }]
                }
                theme={theme}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {!currentStudent ? (
        <div className={`p-12 rounded-2xl border text-center shadow-sm ${
          isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
          <ShieldAlert size={44} className="mx-auto text-slate-500 mb-3" />
          <p className={`font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {filteredStudents.length === 0 && classFilter !== 'All' 
              ? `Tidak ada siswa di ${classFilter === 'UNASSIGNED' ? 'kategori Tanpa Kelas' : `Kelas ${classFilter}`}`
              : 'Belum ada data laporan'
            }
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {filteredStudents.length === 0 && classFilter !== 'All'
              ? 'Silakan ubah filter kelas atau daftarkan siswa ke kelas ini.'
              : 'Silakan daftarkan siswa aktif terlebih dahulu untuk meninjau laporan.'
            }
          </p>
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                    RAPOR DIGITAL
                  </span>
                  {currentStudent.kelas && (
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-md">
                      🏫 {currentStudent.kelas}
                    </span>
                  )}
                </div>
                <h3 className={`text-lg font-extrabold mt-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Ringkasan Prestasi: {currentStudent.name}
                </h3>
                <p className="text-slate-400 text-xs">
                  Mulai belajar: {currentStudent.joinDate} &bull; Wali: {currentStudent.parentName}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Preview Report Button */}
                <button
                  id="btn-preview-report"
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition duration-150 shadow-sm cursor-pointer"
                >
                  <Eye size={16} />
                  <span>Preview Raport</span>
                </button>

                {/* PDF Download Button */}
                <button
                  id="btn-download-report-pdf"
                  type="button"
                  onClick={downloadPDFReport}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition duration-150 shadow-sm cursor-pointer"
                >
                  <Download size={15} />
                  <span>Unduh PDF</span>
                </button>

                {/* Share WA Button */}
                <button
                  id="btn-share-report-wa"
                  type="button"
                  onClick={shareWhatsAppReport}
                  className={`flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl border transition duration-150 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                      : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                  }`}
                >
                  <Send size={15} />
                  <span>Bagikan WA</span>
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
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

              {/* Middle Column: Attendance History list */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="text-slate-500" size={16} />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daftar Riwayat Presensi</h4>
                </div>

                {studentAttendance.length === 0 ? (
                  <p className={`text-sm italic p-4 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}>Belum ada riwayat absensi harian di database.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {studentAttendance.map((a) => (
                      <div key={a.id} className={`p-3 border rounded-xl flex items-start justify-between gap-2.5 ${
                        isLight ? 'bg-slate-50 border-slate-100' : 'bg-slate-950/40 border-slate-800'
                      }`}>
                        <div className="space-y-1 min-w-0">
                          <div className="text-xs font-bold font-mono text-slate-400">
                            {(() => {
                              try {
                                return new Date(a.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                              } catch {
                                return a.date;
                              }
                            })()}
                          </div>
                          {a.notes && (
                            <p className={`text-[11px] italic leading-tight ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`} title={a.notes}>
                              "{a.notes}"
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                          a.status === 'present'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : a.status === 'permission'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-rose-500/15 text-rose-500'
                        }`}>
                          {a.status === 'present' ? 'Hadir' : a.status === 'permission' ? 'Izin' : 'Alpa'}
                        </span>
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

      {/* FULL REPORT PREVIEW MODAL (FULLSCREEN) */}
      {isPreviewOpen && currentStudent && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col w-screen h-screen overflow-hidden">
          {/* Modal Container */}
          <div className="w-full h-full bg-slate-900 flex flex-col overflow-hidden text-slate-100">
            {/* Modal Header Controls */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <span>Preview Rapor Digital Siswa</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">Dokumen Resmi A4</span>
                  </h3>
                  <p className="text-xs text-slate-400">Tampilan penuh rapor {currentStudent.name} sebelum dicetak atau diunduh PDF.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Printer size={16} />
                  <span>Cetak Rapor</span>
                </button>

                <button
                  type="button"
                  onClick={downloadPDFReport}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Download size={16} />
                  <span>Unduh PDF</span>
                </button>

                <button
                  type="button"
                  onClick={shareWhatsAppReport}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Send size={16} />
                  <span className="hidden sm:inline">Kirim WA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition cursor-pointer flex items-center gap-1.5 ml-2"
                  title="Tutup Preview Fullscreen"
                >
                  <X size={18} />
                  <span>Tutup</span>
                </button>
              </div>
            </div>

            {/* Modal Body - Fullscreen Canvas */}
            <div className="p-4 sm:p-8 md:p-12 overflow-y-auto bg-slate-950/80 flex-1 flex justify-center items-start">
              {/* Paper Sheet A4 View */}
              <div id="printable-report-paper" className="w-full max-w-4xl bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 p-8 sm:p-12 md:p-14 font-sans space-y-8 my-auto">
                
                {/* Header Banner */}
                <div className="bg-emerald-600 text-white p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase flex items-center gap-2.5">
                      <Sparkles size={28} className="text-amber-300" />
                      <span>MATH FINGERS</span>
                    </h1>
                    <p className="text-emerald-100 text-xs sm:text-sm font-medium mt-1">Berhitung Cepat & Akurat Tanpa Alat</p>
                    <p className="text-emerald-200/80 text-xs">Sistem Rapor Keterampilan Berhitung Jari Digital</p>
                  </div>
                  <div className="text-right sm:border-l sm:border-emerald-500/50 sm:pl-6">
                    <span className="text-xs font-extrabold uppercase bg-emerald-800/60 text-emerald-100 px-3.5 py-1.5 rounded-lg tracking-wider border border-emerald-400/30">
                      RAPOR DIGITAL
                    </span>
                    <p className="text-xs text-emerald-100 mt-2 font-mono font-semibold">
                      {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Student Info Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs sm:text-sm text-slate-700 space-y-4">
                  <div className="font-extrabold text-slate-900 border-b border-slate-200 pb-2.5 text-sm uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck size={18} className="text-emerald-600" />
                      <span>INFORMASI SISWA</span>
                    </div>
                    {currentStudent.photoUrl && (
                      <span className="text-[11px] font-normal text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Foto Terverifikasi
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    {currentStudent.photoUrl && (
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-emerald-500/30 bg-white shrink-0 shadow-sm">
                        <img 
                          src={currentStudent.photoUrl} 
                          alt={currentStudent.name} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 flex-1">
                      <div>
                        <span className="text-slate-400 inline-block w-32">Nama Lengkap</span>
                        <strong className="text-slate-900">: {currentStudent.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 inline-block w-32">Kelas Bimbingan</span>
                        <strong className="text-emerald-700">: {currentStudent.kelas || '-'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 inline-block w-32">Wali / Orang Tua</span>
                        <span className="font-semibold text-slate-800">: {currentStudent.parentName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 inline-block w-32">Level Bimbingan</span>
                        <span className="font-semibold text-slate-800">: {currentStudent.level}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 inline-block w-32">Nomor Kontak</span>
                        <span className="font-semibold text-slate-800">: {currentStudent.parentPhone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 inline-block w-32">Mulai Bergabung</span>
                        <span className="font-semibold text-slate-800">: {currentStudent.joinDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stat Summary Boxes */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">PERSENTASE PRESENSI</span>
                    <span className="text-3xl sm:text-4xl font-black text-emerald-600 my-1 block">{attendanceRate}%</span>
                    <span className="text-xs text-emerald-700 font-medium">{presentCount} dari {totalAttendance} Sesi Hadir</span>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">SKOR RATA-RATA UJI</span>
                    <span className="text-3xl sm:text-4xl font-black text-amber-600 my-1 block">{averageScore ? `${averageScore}/100` : 'N/A'}</span>
                    <span className="text-xs text-amber-700 font-medium">{studentGrades.length} Sesi Evaluasi</span>
                  </div>
                </div>

                {/* Section: Grades History */}
                <div className="space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
                    <span>RIWAYAT UJI KETERAMPILAN JARI (AKURASI)</span>
                    <span className="text-xs text-slate-500 font-normal">{studentGrades.length} Record</span>
                  </h4>

                  {studentGrades.length === 0 ? (
                    <p className="text-xs italic text-slate-400 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      Belum ada riwayat uji keterampilan berhitung.
                    </p>
                  ) : (
                    <table className="w-full text-xs sm:text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">Materi / Bab Uji</th>
                          <th className="py-2.5 px-3 text-right">Skor Akurasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentGrades.slice(0, 8).map((g, idx) => (
                          <tr key={g.id || idx} className="border-b border-slate-100 hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-mono text-slate-500">{g.date}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{g.topic}</td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">
                              {g.score} / 100
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Section: Teacher Notes */}
                <div className="space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                    CATATAN & EVALUASI BELAJAR GURU
                  </h4>

                  {studentNotes.length === 0 ? (
                    <p className="text-xs italic text-slate-400 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      Belum ada catatan evaluasi tertulis dari pengajar.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {studentNotes.slice(0, 3).map((n) => (
                        <div key={n.id} className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-1.5 text-xs sm:text-sm">
                          <div className="flex justify-between text-amber-900 font-bold">
                            <span>Materi: {n.topic}</span>
                            <span className="font-mono text-xs font-normal text-amber-700">{n.date}</span>
                          </div>
                          <p className="text-slate-700 italic leading-relaxed">"{n.content}"</p>
                          <p className="text-xs text-right text-slate-500 font-semibold">&mdash; {n.teacherName}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Signatures & Footer (Tanda Tangan Orang Tua & Pengajar) */}
                <div className="pt-10 border-t border-slate-200 text-xs sm:text-sm">
                  <div className="grid grid-cols-2 gap-12 text-center pt-2">
                    <div>
                      <p className="text-slate-500 font-medium text-xs mb-16">Orang Tua / Wali Siswa</p>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1.5 inline-block px-10">
                        ( {currentStudent.parentName} )
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 font-medium text-xs mb-16">Pengajar / Tutor Math Fingers</p>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1.5 inline-block px-8 sm:px-10">
                        ( {teacherSignature} )
                      </p>
                    </div>
                  </div>

                  <div className="mt-10 text-center text-xs text-slate-400 italic">
                    Math Fingers - Berhitung Cepat & Akurat Tanpa Alat. Dokumen Rapor Resmi Math Fingers Digital.
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
