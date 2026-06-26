import { useState, useEffect } from 'react';
import { Student, Attendance } from '../types';
import { getWhatsAppLink } from '../utils';
import { Calendar, Check, X, ShieldAlert, Send, Save, CheckSquare, Clock, Search, Users, TrendingUp } from 'lucide-react';

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
  const [activeSubTab, setActiveSubTab] = useState<'record' | 'history'>('record');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [viewingDetailDate, setViewingDetailDate] = useState<string | null>(null);
  
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

  // --- HISTORY CALCULATIONS ---
  const uniqueDates = Array.from(new Set(attendance.map(a => a.date))).sort((a, b) => b.localeCompare(a));

  const dateStats = uniqueDates.map(date => {
    const records = attendance.filter(a => a.date === date);
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const permission = records.filter(r => r.status === 'permission').length;
    return {
      date,
      total: records.length,
      present,
      absent,
      permission
    };
  });

  const totalRecordedDays = uniqueDates.length;
  const totalRecordedRecords = attendance.length;
  const totalPresentRecords = attendance.filter(a => a.status === 'present').length;
  const averageAttendanceRate = totalRecordedRecords > 0 
    ? Math.round((totalPresentRecords / totalRecordedRecords) * 100) 
    : 100;

  const studentRecapList = students.map(student => {
    const studentRecords = attendance.filter(a => a.studentId === student.id).sort((a,b) => b.date.localeCompare(a.date));
    const total = studentRecords.length;
    const present = studentRecords.filter(r => r.status === 'present').length;
    const permission = studentRecords.filter(r => r.status === 'permission').length;
    const absent = studentRecords.filter(r => r.status === 'absent').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;
    const lastFive = studentRecords.slice(0, 5).map(r => r.status);

    return {
      student,
      total,
      present,
      permission,
      absent,
      rate,
      lastFive
    };
  });

  const filteredStudentRecap = studentRecapList.filter(item => {
    return item.student.name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
           item.student.parentName.toLowerCase().includes(historySearchQuery.toLowerCase());
  });

  const isLight = theme === 'light';

  return (
    <div id="attendance-tracker-section" className="space-y-6">
      {/* Top Header & Sub-Tabs Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <h2 className={`text-2xl font-bold font-sans ${isLight ? 'text-slate-800' : 'text-white'}`}>Absensi Siswa</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Pencatatan harian dan rekapitulasi riwayat kehadiran Math Fingers.</p>
        </div>
        
        <div className={`flex p-1 rounded-xl border self-start md:self-center ${
          isLight ? 'bg-slate-100 border-slate-250' : 'bg-slate-950/40 border-slate-800/60'
        }`}>
          <button
            type="button"
            onClick={() => setActiveSubTab('record')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'record'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Calendar size={14} />
            <span>Pencatatan Hari Ini</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'history'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Clock size={14} />
            <span>Riwayat & Rekap Absensi</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'record' ? (
        // === DAILY RECORDING VIEW ===
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
            <div>
              <h3 className={`font-semibold text-base ${isLight ? 'text-slate-850' : 'text-white'}`}>Pilih Tanggal Sesi Bimbingan</h3>
              <p className="text-xs text-slate-400 mt-0.5">Semua data siswa aktif otomatis terdaftar di bawah.</p>
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
                        <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider">
                          {student.level.toLowerCase().includes('dasar') 
                            ? 'LEVEL DASAR' 
                            : `LEVEL ${student.level.match(/\d+/)?.[0] || '1'}`}
                        </span>
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
      ) : (
        // === DETAILED HISTORICAL & REKAP VIEW ===
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Calendar size={22} />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-450 uppercase tracking-wider">Total Hari Les</span>
                <span className="text-2xl font-black">{totalRecordedDays} Hari</span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <TrendingUp size={22} />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-450 uppercase tracking-wider">Rata-rata Kehadiran</span>
                <span className="text-2xl font-black text-emerald-500">{averageAttendanceRate}%</span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <Users size={22} />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-450 uppercase tracking-wider">Total Rekor Absensi</span>
                <span className="text-2xl font-black">{totalRecordedRecords} Entri</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Sesi Riwayat Tanggal */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`font-bold text-base ${isLight ? 'text-slate-800' : 'text-white'}`}>Riwayat Sesi Belajar</h3>
                <span className="text-xs text-slate-450 font-medium">Klik Baris Untuk Detail</span>
              </div>

              <div className={`rounded-2xl border shadow-sm overflow-hidden divide-y ${
                isLight ? 'bg-white border-slate-200 divide-slate-200' : 'bg-slate-900 border-slate-800 divide-slate-800/80'
              }`}>
                {uniqueDates.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <ShieldAlert size={32} className="mx-auto text-slate-700 mb-2" />
                    <p className="text-sm font-medium">Belum ada riwayat absensi</p>
                  </div>
                ) : (
                  uniqueDates.map(date => {
                    const stats = dateStats.find(s => s.date === date);
                    return (
                      <button
                        key={date}
                        onClick={() => setViewingDetailDate(date)}
                        className={`w-full text-left p-4 flex items-center justify-between transition hover:bg-slate-500/5 ${
                          isLight ? 'hover:bg-slate-50' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <span className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                            {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          <span className="block font-mono text-[10px] text-slate-500">{date}</span>
                        </div>

                        {stats && (
                          <div className="flex gap-1.5 text-xs">
                            <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-500" title="Hadir">{stats.present}H</span>
                            <span className="px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-500" title="Izin">{stats.permission}I</span>
                            <span className="px-2 py-0.5 rounded font-bold bg-rose-500/15 text-rose-500" title="Absen">{stats.absent}A</span>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Rekapitulasi Per Siswa */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className={`font-bold text-base ${isLight ? 'text-slate-800' : 'text-white'}`}>Rekap Kehadiran Siswa</h3>
                
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                  <input
                    type="text"
                    placeholder="Cari siswa..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${
                      isLight 
                        ? 'bg-white border-slate-200 text-slate-800' 
                        : 'bg-slate-950/40 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className={`rounded-2xl border shadow-sm overflow-hidden ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b font-semibold uppercase tracking-wider text-slate-500 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                      }`}>
                        <th className="p-3">Siswa</th>
                        <th className="p-3 text-center">Sesi</th>
                        <th className="p-3 text-center">H - I - A</th>
                        <th className="p-3 text-center">Laju Kehadiran</th>
                        <th className="p-3 text-center">5 Sesi Terakhir</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                      {filteredStudentRecap.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">Siswa tidak ditemukan</td>
                        </tr>
                      ) : (
                        filteredStudentRecap.map(({ student, total, present, permission, absent, rate, lastFive }) => (
                          <tr key={student.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/10'}`}>
                            <td className="p-3">
                              <span className={`font-bold block ${isLight ? 'text-slate-850' : 'text-white'}`}>{student.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">Wali: {student.parentName}</span>
                            </td>
                            <td className="p-3 text-center font-bold font-mono text-slate-400">{total}x</td>
                            <td className="p-3 text-center font-semibold font-mono">
                              <span className="text-emerald-500">{present}</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-amber-500">{permission}</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-rose-500">{absent}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2 justify-center">
                                <span className={`font-bold font-mono text-xs w-8 text-right ${
                                  rate >= 90 ? 'text-emerald-500' : rate >= 75 ? 'text-amber-500' : 'text-rose-500'
                                }`}>
                                  {rate}%
                                </span>
                                <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1 justify-center">
                                {lastFive.length === 0 ? (
                                  <span className="text-[10px] text-slate-500">-</span>
                                ) : (
                                  lastFive.map((status, idx) => (
                                    <div 
                                      key={idx} 
                                      className={`w-2 h-2 rounded-full ${
                                        status === 'present' ? 'bg-emerald-500' : status === 'permission' ? 'bg-amber-500' : 'bg-rose-500'
                                      }`}
                                      title={status === 'present' ? 'Hadir' : status === 'permission' ? 'Izin' : 'Alpa'}
                                    />
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === DETAIL SESSION MODAL === */}
      {viewingDetailDate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-xl shadow-2xl border flex flex-col max-h-[85vh] ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800 text-white'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-850' : 'text-white'}`}>Detail Absensi Kelas</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {new Date(viewingDetailDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={() => setViewingDetailDate(null)}
                className="text-slate-400 hover:text-white font-black text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className={`p-4 rounded-xl border flex justify-around text-center text-xs font-semibold ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'
              }`}>
                <div>
                  <span className="block text-slate-400">Total Terdaftar</span>
                  <span className="text-lg font-black">{attendance.filter(a => a.date === viewingDetailDate).length} Siswa</span>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <span className="block text-emerald-500">Hadir (✅)</span>
                  <span className="text-lg font-black text-emerald-500">
                    {attendance.filter(a => a.date === viewingDetailDate && a.status === 'present').length}
                  </span>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <span className="block text-amber-500">Izin (✉️)</span>
                  <span className="text-lg font-black text-amber-500">
                    {attendance.filter(a => a.date === viewingDetailDate && a.status === 'permission').length}
                  </span>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <span className="block text-rose-500">Alpa (❌)</span>
                  <span className="text-lg font-black text-rose-500">
                    {attendance.filter(a => a.date === viewingDetailDate && a.status === 'absent').length}
                  </span>
                </div>
              </div>

              <div className={`rounded-xl border overflow-hidden ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b font-semibold text-slate-550 uppercase tracking-wider ${
                      isLight ? 'bg-slate-100' : 'bg-slate-950/20'
                    }`}>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
                    {attendance.filter(a => a.date === viewingDetailDate).map(record => {
                      const student = students.find(s => s.id === record.studentId);
                      return (
                        <tr key={record.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}>
                          <td className="p-3">
                            <span className="font-bold block">{record.studentName}</span>
                            <span className="text-[10px] text-slate-450 font-semibold">{student?.level || 'Math Fingers'}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-1.5 rounded-lg text-[10px] font-bold ${
                              record.status === 'present' 
                                ? 'bg-emerald-600/15 text-emerald-500' 
                                : record.status === 'permission'
                                ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-rose-500/15 text-rose-500'
                            }`}>
                              {record.status === 'present' ? 'HADIR' : record.status === 'permission' ? 'IZIN' : 'ABSEN'}
                            </span>
                          </td>
                          <td className="p-3 italic text-slate-400">
                            {record.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`p-4 border-t flex justify-between items-center ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
              <p className="text-[11px] text-slate-400 italic">
                * Untuk mengubah kehadiran s/d tgl ini, pilih tanggal tersebut di tab utama "Pencatatan Kehadiran" lalu Simpan.
              </p>
              <button
                type="button"
                onClick={() => setViewingDetailDate(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
