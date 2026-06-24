import { useState, useEffect } from 'react';
import { Student, Attendance } from '../types';
import { getWhatsAppLink } from '../utils';
import { Calendar, Check, X, ShieldAlert, Send, Save, CheckSquare } from 'lucide-react';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: Attendance[];
  onAddAttendanceBatch: (records: Omit<Attendance, 'id'>[]) => Promise<void>;
  theme?: string;
}

export function AttendanceTracker({ 
  students, 
  attendance, 
  onAddAttendanceBatch,
  theme = 'dark'
}: AttendanceTrackerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: 'present' | 'absent' | 'permission'; notes: string }>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Filter only active students for attendance
  const activeStudents = students.filter(s => s.status === 'active');

  // Load existing attendance for selectedDate
  useEffect(() => {
    const existingForDate = attendance.filter(a => a.date === selectedDate);
    
    const initialMap: Record<string, { status: 'present' | 'absent' | 'permission'; notes: string }> = {};
    
    activeStudents.forEach(student => {
      const record = existingForDate.find(r => r.studentId === student.id);
      if (record) {
        initialMap[student.id] = {
          status: record.status,
          notes: record.notes || ''
        };
      } else {
        // Default to 'present' for untracked active students
        initialMap[student.id] = {
          status: 'present',
          notes: ''
        };
      }
    });

    setAttendanceMap(initialMap);
    setSaveStatus('idle');
  }, [selectedDate, students, attendance]);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'permission') => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
    setSaveStatus('idle');
  };

  const handleNoteChange = (studentId: string, notes: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
    setSaveStatus('idle');
  };

  const handleMarkAllPresent = () => {
    const updated = { ...attendanceMap };
    activeStudents.forEach(student => {
      updated[student.id] = {
        ...updated[student.id],
        status: 'present'
      };
    });
    setAttendanceMap(updated);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    const recordsToSave = activeStudents.map(student => {
      const state = attendanceMap[student.id] || { status: 'present', notes: '' };
      return {
        studentId: student.id,
        studentName: student.name,
        date: selectedDate,
        status: state.status,
        notes: state.notes
      };
    });

    try {
      await onAddAttendanceBatch(recordsToSave);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
      alert('Gagal menyimpan absensi!');
    }
  };

  const sendWhatsAppNotification = (student: Student) => {
    const state = attendanceMap[student.id] || { status: 'present', notes: '' };
    
    // Convert status to readable Indonesian
    const statusMap = {
      present: 'HADIR ✅',
      absent: 'ALPA (TIDAK HADIR) ❌',
      permission: 'IZIN ✉️'
    };
    
    const readableStatus = statusMap[state.status];
    const notesString = state.notes.trim() ? `\nCatatan Guru: "${state.notes}"` : '';
    
    const message = `Halo Ibu/Bapak *${student.parentName}*,\n\nKami menginfokan kehadiran ananda *${student.name}* untuk bimbingan Les Privat *Math Fingers* pada:\n\n📅 Tanggal: ${selectedDate}\n📌 Status Kehadiran: *${readableStatus}*${notesString}\n\nTerima kasih atas kepercayaannya. Mari belajar berhitung cepat & akurat tanpa alat! ✨`;
    
    const waLink = getWhatsAppLink(student.parentPhone, message);
    window.open(waLink, '_blank', 'noreferrer');
  };

  const isLight = theme === 'light';

  return (
    <div id="attendance-tracker-section" className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold font-sans ${isLight ? 'text-slate-800' : 'text-white'}`}>Absensi Siswa</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Pencatatan kehadiran harian les privat Math Fingers.</p>
        </div>
        
        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl shadow-sm text-sm ${
            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}>
            <Calendar size={16} className="text-emerald-500" />
            <input
              id="attendance-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`bg-transparent focus:outline-none font-medium ${isLight ? 'text-slate-800' : 'text-white'}`}
            />
          </div>
          
          <button
            id="btn-mark-all-present"
            onClick={handleMarkAllPresent}
            className={`flex items-center gap-1.5 font-medium px-3.5 py-2.5 rounded-xl transition text-sm border ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50'
            }`}
          >
            <CheckSquare size={16} />
            <span>Hadir Semua</span>
          </button>
        </div>
      </div>

      {/* Main Form list */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {activeStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldAlert size={44} className="mx-auto text-slate-700 mb-3" />
            <p className="font-medium text-slate-400">Tidak ada siswa aktif terdaftar</p>
            <p className="text-xs text-slate-500 mt-1">Silakan tambahkan siswa atau aktifkan status siswa terlebih dahulu di tab Siswa.</p>
          </div>
        ) : (
          <div className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
            {activeStudents.map((student) => {
              const state = attendanceMap[student.id] || { status: 'present', notes: '' };
              
              return (
                <div key={student.id} className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-150 ${
                  isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20'
                }`}>
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider">LEVEL {student.level.match(/\d/)?.[0] || '1'}</span>
                    <h3 className={`font-bold text-base ${isLight ? 'text-slate-800' : 'text-white'}`}>{student.name}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Wali: {student.parentName} ({student.parentPhone})</p>
                  </div>

                  {/* Attendance Controls */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    {/* Status Toggle Buttons */}
                    <div className={`flex p-1 rounded-xl border ${
                      isLight ? 'bg-slate-100 border-slate-250' : 'bg-slate-950/40 border-slate-800/60'
                    }`}>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'present')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                          state.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        <Check size={14} />
                        <span>Hadir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'permission')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                          state.status === 'permission'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        <span>Izin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'absent')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                          state.status === 'absent'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        <X size={14} />
                        <span>Absen</span>
                      </button>
                    </div>

                    {/* Quick Attendance Notes Input */}
                    <input
                      type="text"
                      placeholder="Catatan kecil (misal: telat 10m)..."
                      value={state.notes}
                      onChange={(e) => handleNoteChange(student.id, e.target.value)}
                      className={`px-3 py-1.5 border rounded-xl text-xs w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-550 ${
                        isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950/30 border-slate-800 text-white'
                      }`}
                    />

                    {/* Send WhatsApp notification button */}
                    <button
                      type="button"
                      onClick={() => sendWhatsAppNotification(student)}
                      className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 transition flex items-center gap-1 self-stretch justify-center"
                      title="Kirim Konfirmasi WA Orang Tua"
                    >
                      <Send size={14} />
                      <span className="text-xs font-semibold">Kirim WA</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Save Footer Bar */}
        {activeStudents.length > 0 && (
          <div className={`p-4 border-t flex justify-end ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'
          }`}>
            <button
              id="btn-save-attendance"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition shadow-sm"
            >
              <Save size={16} />
              <span>
                {saveStatus === 'saving' ? 'Menyimpan...' : saveStatus === 'saved' ? 'Selesai Disimpan!' : 'Simpan Semua Absensi'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
