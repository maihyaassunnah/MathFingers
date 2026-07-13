import { useState, useEffect } from 'react';
import { Student, Attendance } from '../types';
import { getWhatsAppLink } from '../utils';
import { Calendar, Check, X, ShieldAlert, Send, Save, CheckSquare, Clock, Search, Users, TrendingUp, ChevronDown, MessageSquare, Trash2 } from 'lucide-react';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: Attendance[];
  onAddAttendanceBatch: (records: Omit<Attendance, 'id'>[]) => Promise<void>;
  onDeleteAttendanceByDate?: (date: string) => Promise<void>;
  onDeleteSingleAttendance?: (id: string) => Promise<void>;
  onUpdateSingleAttendance?: (id: string, updatedFields: Partial<Attendance>) => Promise<void>;
  theme?: string;
}

export function AttendanceTracker({ 
  students, 
  attendance, 
  onAddAttendanceBatch,
  onDeleteAttendanceByDate,
  onDeleteSingleAttendance,
  onUpdateSingleAttendance,
  theme = 'dark'
}: AttendanceTrackerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'record' | 'history'>('record');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [recordSearchQuery, setRecordSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewingDetailDate, setViewingDetailDate] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: 'present' | 'absent' | 'permission'; notes: string }>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [expandedStudentNotes, setExpandedStudentNotes] = useState<Record<string, boolean>>({});
  const [filterBySchedule, setFilterBySchedule] = useState(true);

  const toggleNotes = (studentId: string) => {
    setExpandedStudentNotes(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Filter only active students for attendance & sort alphabetically based on sortOrder
  const activeStudents = [...students]
    .filter(s => s.status === 'active')
    .sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  // Check if student is scheduled for the day
  const isScheduledForDay = (student: Student) => {
    if (!filterBySchedule) return true;
    if (!student.hariLes) return true; // Show by default if no schedule specified (backward compatibility)
    
    const dateObj = new Date(selectedDate);
    const day = dateObj.getDay(); // 0 = Sunday (Ahad), 5 = Friday (Jum'at), 6 = Saturday (Sabtu)
    
    if (student.hariLes === "Hari Jum'at dan Ahad") {
      return day === 5 || day === 0;
    }
    if (student.hariLes === "Sabtu dan Ahad") {
      return day === 6 || day === 0;
    }
    
    return true;
  };

  const scheduledActiveStudents = activeStudents.filter(isScheduledForDay);

  // Extract initial letters of active students to render as quick filter buttons
  const availableLetters = Array.from(
    new Set(
      scheduledActiveStudents
        .map(s => s.name.trim().charAt(0).toUpperCase())
        .filter(char => /[A-Z]/.test(char))
    )
  ).sort();

  const filteredActiveStudents = scheduledActiveStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(recordSearchQuery.toLowerCase());
    const matchesLetter = selectedLetter === 'ALL' || s.name.trim().toUpperCase().startsWith(selectedLetter);
    return matchesSearch && matchesLetter;
  });

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

  const handleStatusCycle = (studentId: string, currentStatus: 'present' | 'absent' | 'permission') => {
    const nextStatusMap: Record<string, 'present' | 'absent' | 'permission'> = {
      present: 'permission',
      permission: 'absent',
      absent: 'present'
    };
    handleStatusChange(studentId, nextStatusMap[currentStatus]);
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
    scheduledActiveStudents.forEach(student => {
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
    const recordsToSave = scheduledActiveStudents.map(student => {
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-2.5 gap-y-1 mt-0.5">
                <p className="text-xs text-slate-400">Siswa aktif otomatis disaring sesuai jadwal.</p>
                <span className="hidden sm:inline text-slate-500 text-xs">•</span>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 dark:text-emerald-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterBySchedule}
                    onChange={(e) => setFilterBySchedule(e.target.checked)}
                    className="rounded border-emerald-500/30 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 bg-emerald-500/5 cursor-pointer"
                  />
                  <span>Filter Jadwal Hari Les</span>
                </label>
              </div>
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

          {/* Student Name Filter for Attendance */}
          {activeStudents.length > 0 && (
            <div className={`p-4 rounded-2xl shadow-sm border flex flex-col gap-3.5 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
                  <input
                    id="attendance-record-search"
                    type="text"
                    placeholder="Cari nama siswa..."
                    value={recordSearchQuery}
                    onChange={(e) => setRecordSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm placeholder:text-slate-550 ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-800' 
                        : 'bg-slate-950/40 border-slate-800 text-white'
                    }`}
                  />
                </div>

                {/* Sort Dropdown Selector */}
                <div className="relative shrink-0 min-w-[140px]">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className={`w-full pl-4 pr-10 py-2 border rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-medium transition duration-150 cursor-pointer ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-850 hover:bg-slate-100' 
                        : 'bg-slate-950/40 border-emerald-500/80 text-emerald-400 hover:bg-slate-900'
                    }`}
                  >
                    <option value="asc">Nama: A - Z</option>
                    <option value="desc">Nama: Z - A</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-emerald-500/80">
                    <ChevronDown size={16} />
                  </div>
                </div>

                {(recordSearchQuery || selectedLetter !== 'ALL' || sortOrder !== 'asc') && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecordSearchQuery('');
                      setSelectedLetter('ALL');
                      setSortOrder('asc');
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition shrink-0 ${
                      isLight 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Alphabet Quick Filter Bar */}
              {availableLetters.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">Inisial Abjad:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedLetter('ALL')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                      selectedLetter === 'ALL'
                        ? 'bg-emerald-600 text-white'
                        : isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Semua
                  </button>
                  {availableLetters.map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setSelectedLetter(letter)}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition shrink-0 ${
                        selectedLetter === letter
                          ? 'bg-emerald-600 text-white'
                          : isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Spanduk Tip Mobile (Only on Mobile screens) */}
          <div className="md:hidden bg-indigo-500/10 border border-indigo-500/20 p-3.5 rounded-2xl flex items-start gap-2.5">
            <CheckSquare className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
              <strong>Tip Mengabsen Mobile:</strong> Ketuk tombol lingkaran berwarna di sisi kanan nama siswa untuk mengganti status bimbingan (Hadir ➜ Izin ➜ Absen) secara langsung dengan satu sentuhan jari!
            </div>
          </div>

          <div className={`rounded-2xl border shadow-sm overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            {activeStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <ShieldAlert size={44} className="mx-auto text-slate-700 mb-3" />
                <p className="font-medium text-slate-400">Tidak ada siswa aktif terdaftar</p>
                <p className="text-xs text-slate-550 mt-1">Silakan tambahkan siswa atau aktifkan status siswa terlebih dahulu di tab Siswa.</p>
              </div>
            ) : (
              <>
                <div className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
                  {filteredActiveStudents.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      {filterBySchedule && scheduledActiveStudents.length === 0 ? (
                        <div className="max-w-md mx-auto">
                          <Calendar size={44} className="mx-auto text-emerald-500/80 mb-3 animate-pulse" />
                          <p className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>Tidak ada siswa yang dijadwalkan les hari ini</p>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            Berdasarkan jadwal bimbingan, tidak ada siswa aktif yang memiliki jadwal les pada hari ini ({
                              new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long' })
                            }).
                          </p>
                          <button
                            type="button"
                            onClick={() => setFilterBySchedule(false)}
                            className="mt-4 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition duration-150 shadow-sm cursor-pointer"
                          >
                            Tampilkan Semua Siswa Aktif
                          </button>
                        </div>
                      ) : (
                        <>
                          <Search size={44} className="mx-auto text-slate-700 mb-3" />
                          <p className="font-medium text-slate-400">Tidak ada siswa yang cocok dengan pencarian</p>
                          <p className="text-xs text-slate-550 mt-1">Coba cari dengan nama siswa lain.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredActiveStudents.map((student) => {
                      const state = attendanceMap[student.id] || { status: 'present', notes: '' };
                      const isExpanded = !!expandedStudentNotes[student.id];
                    
                      return (
                        <div key={student.id} className={`p-4 sm:p-5 transition duration-150 ${
                          isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20'
                        }`}>
                          {/* === MOBILE ONLY COMPACT ROW === */}
                          <div className="md:hidden flex items-center justify-between gap-3 w-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-bold text-emerald-500 font-mono tracking-wider px-1 rounded bg-emerald-500/10">
                                  {student.level.toLowerCase().includes('dasar') 
                                    ? 'L. DASAR' 
                                    : `LEVEL ${student.level.match(/\d+/)?.[0] || '1'}`}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate">Wali: {student.parentName}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <h4 className={`font-bold text-sm truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{student.name}</h4>
                                {student.hariLes && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15">
                                    📅 {student.hariLes}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Option expand button (Notes & WA) */}
                              <button
                                type="button"
                                onClick={() => toggleNotes(student.id)}
                                className={`p-2.5 rounded-xl border transition duration-150 shrink-0 ${
                                  isExpanded
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : isLight
                                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                }`}
                                title="Tulis Catatan / Kirim WA"
                              >
                                <MessageSquare size={15} />
                              </button>

                              {/* One-Tap Cycle Trigger Circle (Innovative mobile UX) */}
                              <button
                                type="button"
                                onClick={() => handleStatusCycle(student.id, state.status)}
                                className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-sm active:scale-90 shrink-0 border ${
                                  state.status === 'present'
                                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/15'
                                    : state.status === 'permission'
                                      ? 'bg-amber-500 border-amber-400 text-white shadow-amber-500/15'
                                      : 'bg-rose-500 border-rose-400 text-white shadow-rose-500/15'
                                }`}
                              >
                                {state.status === 'present' && <Check size={16} className="stroke-[3]" />}
                                {state.status === 'permission' && <Calendar size={14} className="stroke-[3]" />}
                                {state.status === 'absent' && <X size={16} className="stroke-[3]" />}
                                <span className="text-[7.5px] font-extrabold tracking-tight mt-0.5 uppercase">
                                  {state.status === 'present' ? 'Hadir' : state.status === 'permission' ? 'Izin' : 'Absen'}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* === DESKTOP ONLY ROW === */}
                          <div className="hidden md:flex md:flex-row md:items-center justify-between gap-4 w-full">
                            <div className="flex-1 flex flex-col">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-emerald-500 font-mono tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10">
                                    {student.level.toLowerCase().includes('dasar') 
                                      ? 'LEVEL DASAR' 
                                      : `LEVEL ${student.level.match(/\d+/)?.[0] || '1'}`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                <h3 className={`font-bold text-base ${isLight ? 'text-slate-800' : 'text-white'}`}>{student.name}</h3>
                                {student.hariLes && (
                                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15">
                                    📅 {student.hariLes}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-400 text-xs mt-0.5">Wali: {student.parentName} ({student.parentPhone})</p>
                            </div>

                            {/* Desktop Controls */}
                            <div className="flex flex-row items-center gap-3 shrink-0">
                              <div className={`flex p-1 rounded-xl border ${
                                isLight ? 'bg-slate-100 border-slate-250' : 'bg-slate-950/40 border-slate-800/60'
                              }`}>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, 'present')}
                                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-150 flex items-center justify-center gap-1.5 ${
                                    state.status === 'present'
                                      ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                  }`}
                                >
                                  <Check size={14} />
                                  <span>Hadir</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, 'permission')}
                                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-150 flex items-center justify-center gap-1.5 ${
                                    state.status === 'permission'
                                      ? 'bg-amber-500 text-white shadow-md font-extrabold'
                                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                  }`}
                                >
                                  <Calendar size={13} />
                                  <span>Izin</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, 'absent')}
                                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-150 flex items-center justify-center gap-1.5 ${
                                    state.status === 'absent'
                                      ? 'bg-rose-500 text-white shadow-md font-extrabold'
                                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                  }`}
                                >
                                  <X size={14} />
                                  <span>Absen</span>
                                </button>
                              </div>

                              {/* Desktop always visible notes and WA block */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Catatan..."
                                  value={state.notes}
                                  onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                  className={`px-3 py-1.5 border rounded-xl text-xs w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-500 ${
                                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/30 border-slate-800 text-white'
                                  }`}
                                />

                                <button
                                  type="button"
                                  onClick={() => sendWhatsAppNotification(student)}
                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/25 transition duration-150 flex items-center justify-center shrink-0"
                                  title="Kirim Konfirmasi WA Orang Tua"
                                >
                                  <Send size={13} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* === COLLAPSIBLE OPTION PANEL (For Mobile notes & WhatsApp trigger when expanded) === */}
                          {isExpanded && (
                            <div className="md:hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch gap-2.5 w-full">
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Catatan Kehadiran</label>
                                <input
                                  type="text"
                                  placeholder="Tulis catatan (misal: telat 10 menit)..."
                                  value={state.notes}
                                  onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                  className={`px-3 py-2 border rounded-xl text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-550 ${
                                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/30 border-slate-800 text-white'
                                  }`}
                                />
                              </div>

                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() => sendWhatsAppNotification(student)}
                                  className="w-full py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/25 transition duration-150 flex items-center gap-2 justify-center shrink-0"
                                  title="Kirim Konfirmasi WA Orang Tua"
                                >
                                  <Send size={13} />
                                  <span className="text-xs font-bold">Kirim WA Orang Tua</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

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
              </>
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
                      <div
                        key={date}
                        className={`w-full p-4 flex items-center justify-between transition border-b last:border-b-0 ${
                          isLight ? 'hover:bg-slate-55 border-slate-100' : 'hover:bg-slate-800/10 border-slate-800/50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setViewingDetailDate(date)}
                          className="flex-1 text-left space-y-1 focus:outline-none cursor-pointer"
                        >
                          <span className={`font-bold text-sm block ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                            {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          <span className="block font-mono text-[10px] text-slate-500">{date}</span>
                        </button>

                        <div className="flex items-center gap-3">
                          {stats && (
                            <div className="flex gap-1.5 text-[10px] sm:text-xs">
                              <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-500" title="Hadir">{stats.present}H</span>
                              <span className="px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-500" title="Izin">{stats.permission}I</span>
                              <span className="px-2 py-0.5 rounded font-bold bg-rose-500/15 text-rose-500" title="Absen">{stats.absent}A</span>
                            </div>
                          )}

                          {onDeleteAttendanceByDate && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Apakah Anda yakin ingin menghapus seluruh sesi absensi tanggal ${date}? Tindakan ini akan menghapus data dari database.`)) {
                                  try {
                                    await onDeleteAttendanceByDate(date);
                                    alert('Sesi absensi berhasil dihapus.');
                                  } catch (err) {
                                    console.error(err);
                                    alert('Gagal menghapus sesi absensi.');
                                  }
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                              title="Hapus Sesi Absensi"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
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
                      <th className="p-3 text-center">Aksi</th>
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
                          <td className="p-3">
                            <div className="flex justify-center gap-1">
                              {(['present', 'permission', 'absent'] as const).map((st) => {
                                const active = record.status === st;
                                const colors = {
                                  present: active ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10',
                                  permission: active ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10',
                                  absent: active ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10'
                                };
                                const labels = {
                                  present: 'H',
                                  permission: 'I',
                                  absent: 'A'
                                };
                                const titles = {
                                  present: 'Hadir',
                                  permission: 'Izin',
                                  absent: 'Alpa'
                                };
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    title={titles[st]}
                                    onClick={async () => {
                                      if (onUpdateSingleAttendance) {
                                        await onUpdateSingleAttendance(record.id, { status: st });
                                      }
                                    }}
                                    className={`w-6 h-6 rounded-md text-[10px] font-black transition flex items-center justify-center cursor-pointer ${colors[st]}`}
                                  >
                                    {labels[st]}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={record.notes || ''}
                              onChange={async (e) => {
                                if (onUpdateSingleAttendance) {
                                  await onUpdateSingleAttendance(record.id, { notes: e.target.value });
                                }
                              }}
                              placeholder="Tambah catatan..."
                              className={`w-full px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                              }`}
                            />
                          </td>
                          <td className="p-3 text-center">
                            {onDeleteSingleAttendance && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Hapus rekor absensi ${record.studentName} pada tanggal ${viewingDetailDate}?`)) {
                                    await onDeleteSingleAttendance(record.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                                title="Hapus Rekor"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Missing Student Option */}
              {(() => {
                const recordsForDate = attendance.filter(a => a.date === viewingDetailDate);
                const missingStudents = activeStudents.filter(s => !recordsForDate.some(r => r.studentId === s.id));
                if (missingStudents.length === 0) return null;
                return (
                  <div className={`p-4 rounded-xl border mt-4 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/20 border-slate-800'
                  }`}>
                    <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Tambah Siswa Ke Sesi Ini</h4>
                    <div className="flex gap-2">
                      <select
                        id="select-add-missing-student"
                        className={`flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                        }`}
                      >
                        <option value="">-- Pilih Siswa --</option>
                        {missingStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          const selectEl = document.getElementById('select-add-missing-student') as HTMLSelectElement | null;
                          if (selectEl && selectEl.value) {
                            const studentId = selectEl.value;
                            const student = students.find(s => s.id === studentId);
                            if (student) {
                              await onAddAttendanceBatch([{
                                studentId: student.id,
                                studentName: student.name,
                                date: viewingDetailDate!,
                                status: 'present',
                                notes: ''
                              }]);
                              selectEl.value = "";
                            }
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap"
                      >
                        Tambah Kehadiran
                      </button>
                    </div>
                  </div>
                );
              })()}
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
