import { useState, useEffect, FormEvent } from 'react';
import { Student, ClassGroup, Attendance } from '../types';
import { getStudentUniqueCode } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ShieldAlert, Sparkles, User, Calendar, Award, ArrowLeft, RefreshCw, KeyRound, Building, Layers } from 'lucide-react';

interface StudentSelfAttendanceViewProps {
  students: Student[];
  classes: ClassGroup[];
  targetClass: string;
  targetDate: string;
  onAddAttendanceBatch: (records: Omit<Attendance, 'id'>[]) => Promise<void>;
  onClose: () => void;
  theme?: string;
}

export function StudentSelfAttendanceView({
  students,
  classes,
  targetClass,
  targetDate,
  onAddAttendanceBatch,
  onClose,
  theme = 'dark'
}: StudentSelfAttendanceViewProps) {
  const isLight = theme === 'light';

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successStudentName, setSuccessStudentName] = useState<string>('');

  // Get active students for self-attendance based on the target class
  const filteredStudents = students
    .filter(s => s.status === 'active')
    .filter(s => {
      if (!targetClass || targetClass === 'ALL') return true;
      if (targetClass === 'UNASSIGNED') return !s.kelas;
      return s.kelas === targetClass;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedStudent = filteredStudents.find(s => s.id === selectedStudentId);
  const isCodeValid = selectedStudent && inputCode.trim() === getStudentUniqueCode(selectedStudent);

  // Auto-reset error when student or code changes
  useEffect(() => {
    setErrorMessage('');
  }, [selectedStudentId, inputCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMessage('Silakan pilih nama Anda terlebih dahulu.');
      return;
    }

    const expectedCode = getStudentUniqueCode(selectedStudent);
    if (inputCode.trim() !== expectedCode) {
      setErrorMessage('Kode Unik yang Anda masukkan salah. Silakan tanyakan ke tentor jika lupa.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Prepare attendance object to save
      const record: Omit<Attendance, 'id'> = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        date: targetDate,
        status: 'present',
        notes: 'Absen Mandiri via QR',
        branch: selectedStudent.branch || 'Pusat'
      };

      await onAddAttendanceBatch([record]);
      setSuccessStudentName(selectedStudent.name);
      setIsSuccess(true);
      // Reset input fields
      setSelectedStudentId('');
      setInputCode('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Gagal memproses absensi. Silakan hubungi tentor Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = (() => {
    try {
      return new Date(targetDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return targetDate;
    }
  })();

  const selectedClassObj = classes.find(c => c.name === targetClass);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-200 ${
      isLight ? 'bg-gradient-to-br from-slate-50 to-emerald-50/30 text-slate-800' : 'bg-gradient-to-br from-slate-950 to-emerald-950/20 text-slate-100'
    }`}>
      {/* Decorative background grid and shapes */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="attendance-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className={`rounded-3xl border shadow-2xl p-6 sm:p-8 ${
                isLight ? 'bg-white border-slate-200/80' : 'bg-slate-900/90 border-slate-800/80 backdrop-blur-md'
              }`}
            >
              {/* Top Branding Header */}
              <div className="text-center pb-6 border-b border-slate-200/50 dark:border-slate-800/60">
                <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-black text-2xl px-4 py-1.5 rounded-2xl border border-emerald-500/15 mb-2.5">
                  <span>Math Fingers</span>
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <h1 className={`text-xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Presensi Mandiri Siswa
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Mari belajar berhitung cepat & akurat tanpa alat!
                </p>
              </div>

              {/* Class and Session Information Banner */}
              <div className={`my-6 p-4 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/55 border-slate-800/70'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={15} className="text-emerald-500 shrink-0" />
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {formattedDate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-emerald-500 shrink-0" />
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Kelas: <span className="text-emerald-500">{targetClass === 'ALL' ? 'Semua Kelas' : targetClass}</span>
                  </span>
                </div>
                {selectedClassObj && (
                  <div className="text-[11px] text-slate-500 mt-1.5 pl-5 border-l border-emerald-500/35">
                    Tentor: <strong className={isLight ? 'text-slate-700' : 'text-slate-350'}>{selectedClassObj.teacherName || 'Pengajar Utama'}</strong>
                  </div>
                )}
              </div>

              {/* Attendance Submission Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Banner */}
                {errorMessage && (
                  <div className="bg-rose-500/10 border border-rose-500/25 p-3.5 rounded-2xl flex items-start gap-2.5 text-rose-500 text-xs">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <span className="font-semibold leading-relaxed">{errorMessage}</span>
                  </div>
                )}

                {/* Step 1: Select Student Name */}
                <div className="space-y-2">
                  <label className={`block text-xs font-bold tracking-wide uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    1. Pilih Nama Anda
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={16} />
                    </div>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      required
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-semibold border transition focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                        isLight 
                          ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100' 
                          : 'bg-slate-950/40 border-slate-800 text-white hover:bg-slate-950'
                      }`}
                    >
                      <option value="">-- Cari & Pilih Nama Anda --</option>
                      {filteredStudents.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name} (Level {student.level.match(/\d+/)?.[0] || 'Dasar'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 2: Confirm Security Code */}
                <div className="space-y-2">
                  <label className={`block text-xs font-bold tracking-wide uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    2. Masukkan Kode Unik Siswa (5 Digit)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound size={16} />
                    </div>
                    <input
                      type="text"
                      maxLength={5}
                      pattern="\d{5}"
                      placeholder="Masukkan 5 digit kode unik..."
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                      required
                      disabled={!selectedStudentId}
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-semibold border transition focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        !selectedStudentId
                          ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-950/20 border-slate-200 dark:border-slate-850'
                          : isCodeValid
                            ? 'border-emerald-500/70 bg-emerald-500/5 text-emerald-400'
                            : inputCode.length === 5
                              ? 'border-rose-500/70 bg-rose-500/5 text-rose-400'
                              : isLight
                                ? 'bg-slate-50 border-slate-200 text-slate-800'
                                : 'bg-slate-950/40 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  {selectedStudentId && (
                    <p className="text-[11px] text-slate-450 leading-normal font-medium">
                      *Masukkan Kode Unik Anda yang ada pada kartu les atau di WhatsApp bimbingan.
                    </p>
                  )}
                </div>

                {/* Submission Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isCodeValid}
                  className={`w-full py-3.5 px-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition duration-150 shadow-md ${
                    isCodeValid
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/10'
                      : 'bg-slate-300 dark:bg-slate-850 text-slate-500 dark:text-slate-500 cursor-not-allowed shadow-none border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Memproses Kehadiran...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} className="stroke-[3]" />
                      <span>Kirim Kehadiran Saya</span>
                    </>
                  )}
                </button>
              </form>

              {/* Close / Return to dashboard button (if admin wants to switch back) */}
              <div className="mt-6 pt-5 border-t border-slate-150 dark:border-slate-800/60 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-450 hover:text-emerald-500 transition cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Kembali ke Halaman Utama</span>
                </button>
              </div>
            </motion.div>
          ) : (
            // Success view
            <motion.div
              key="attendance-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 15 }}
              className={`rounded-3xl border shadow-2xl p-6 sm:p-8 text-center ${
                isLight ? 'bg-white border-slate-200/80 text-slate-800' : 'bg-slate-900/90 border-slate-800/80 backdrop-blur-md text-white'
              }`}
            >
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 animate-bounce">
                <Check size={44} className="stroke-[3]" />
              </div>

              <span className="text-[10px] font-extrabold tracking-widest text-emerald-500 uppercase px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                PRESENSI SELESAI
              </span>

              <h2 className={`text-2xl font-black mt-4 leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Hadir Berhasil Dicatat! 🎉
              </h2>

              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Halo <strong className="text-emerald-400 font-extrabold text-base block my-1">{successStudentName}</strong>
                Kehadiran Anda pada sesi bimbingan hari ini telah aman terkirim ke sistem Math Fingers.
              </p>

              {/* Attendance Details Card */}
              <div className={`my-6 p-4 rounded-2xl text-left border text-xs space-y-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
              }`}>
                <div className="flex justify-between border-b pb-1.5 border-slate-200/50 dark:border-slate-850">
                  <span className="text-slate-450 font-semibold">Siswa:</span>
                  <span className={`font-black ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{successStudentName}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-slate-200/50 dark:border-slate-850">
                  <span className="text-slate-450 font-semibold">Kelas:</span>
                  <span className="text-emerald-400 font-bold">{targetClass === 'ALL' ? 'Semua Kelas' : targetClass}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5 border-slate-200/50 dark:border-slate-850">
                  <span className="text-slate-450 font-semibold">Hari & Tanggal:</span>
                  <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450 font-semibold">Status Kehadiran:</span>
                  <span className="text-emerald-500 font-black flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                    HADIR
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsSuccess(false)}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl transition shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>Absen untuk Saudara / Teman</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className={`w-full py-3 px-4 rounded-2xl font-bold text-xs border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50'
                  }`}
                >
                  <ArrowLeft size={13} />
                  <span>Keluar & Selesai</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
