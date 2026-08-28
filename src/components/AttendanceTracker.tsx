import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Attendance, ClassGroup } from '../types';
import { getWhatsAppLink, getStudentUniqueCode } from '../utils';
import { Calendar, Check, X, ShieldAlert, Send, Save, CheckSquare, Clock, Search, Users, TrendingUp, ChevronDown, MessageSquare, Trash2, Layers, DoorClosed, User, QrCode, Printer, Copy, ExternalLink, CheckCircle, RefreshCw } from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';
import { OfflineIndicator } from './OfflineIndicator';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: Attendance[];
  classes?: ClassGroup[];
  onAddAttendanceBatch: (records: Omit<Attendance, 'id'>[]) => Promise<void>;
  onDeleteAttendanceByDate?: (date: string) => Promise<void>;
  onDeleteSingleAttendance?: (id: string) => Promise<void>;
  onUpdateSingleAttendance?: (id: string, updatedFields: Partial<Attendance>) => Promise<void>;
  theme?: string;
  loading?: boolean;
}

export function AttendanceTracker({ 
  students, 
  attendance, 
  classes = [],
  onAddAttendanceBatch,
  onDeleteAttendanceByDate,
  onDeleteSingleAttendance,
  onUpdateSingleAttendance,
  theme = 'dark',
  loading = false
}: AttendanceTrackerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'record' | 'history'>('record');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [recordSearchQuery, setRecordSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewingDetailDate, setViewingDetailDate] = useState<string | null>(null);
  
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('ALL');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { included: boolean; status: 'present' | 'absent' | 'permission'; notes: string }>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedRecordsCount, setSavedRecordsCount] = useState(0);
  const [expandedStudentNotes, setExpandedStudentNotes] = useState<Record<string, boolean>>({});
  const [filterBySchedule, setFilterBySchedule] = useState(false);
  const [selectedMissingStudent, setSelectedMissingStudent] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastLoadedDate, setLastLoadedDate] = useState<string>('');

  const [toastNotification, setToastNotification] = useState<{
    show: boolean;
    message: string;
    detail?: string;
    type?: 'success' | 'error';
  } | null>(null);

  const triggerToast = (message: string, detail?: string, type: 'success' | 'error' = 'success') => {
    setToastNotification({ show: true, message, detail, type });
    setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  };

  const toggleNotes = (studentId: string) => {
    setExpandedStudentNotes(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Filter active students sorted alphabetically
  const activeStudents = [...students]
    .filter(s => s.status === 'active')
    .sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  // Filter active students by class selection
  const classFilteredActiveStudents = activeStudents.filter(student => {
    if (selectedClassFilter === 'ALL') return true;
    if (selectedClassFilter === 'UNASSIGNED') return !student.kelas;
    return student.kelas === selectedClassFilter;
  });

  // Selected class object if a specific class filter is selected
  const selectedClassObj = classes.find(c => c.name === selectedClassFilter);

  // Check if student is scheduled for the day
  const isScheduledForDay = (student: Student) => {
    if (!filterBySchedule) return true;
    if (!student.hariLes) return true; // Show by default if no schedule specified
    
    const dateObj = new Date(selectedDate);
    const day = dateObj.getDay(); // 0 = Sunday (Ahad), 5 = Friday (Jumat), 6 = Saturday (Sabtu)
    
    if (student.hariLes === "Hari Jumat dan Ahad") {
      return day === 5 || day === 0;
    }
    if (student.hariLes === "Sabtu dan Ahad") {
      return day === 6 || day === 0;
    }
    
    return true;
  };

  const scheduledActiveStudents = classFilteredActiveStudents.filter(isScheduledForDay);

  const filteredActiveStudents = scheduledActiveStudents.filter(s => {
    return s.name.toLowerCase().includes(recordSearchQuery.toLowerCase());
  });

  // Check if all filtered students are included
  const isAllFilteredSelected = filteredActiveStudents.length > 0 && 
    filteredActiveStudents.every(s => attendanceMap[s.id]?.included);

  const includedFilteredCount = filteredActiveStudents.filter(s => attendanceMap[s.id]?.included).length;

  // Load existing attendance for selectedDate safely without overwriting unsaved user edits
  useEffect(() => {
    // Only re-sync if the selected date changed, or if user hasn't modified state (isDirty=false), or after save completed
    if (lastLoadedDate !== selectedDate || !isDirty || saveStatus === 'saved') {
      const existingForDate = attendance.filter(a => a.date === selectedDate);
      const hasExistingRecords = existingForDate.length > 0;
      
      const initialMap: Record<string, { included: boolean; status: 'present' | 'absent' | 'permission'; notes: string }> = {};
      
      activeStudents.forEach(student => {
        const record = existingForDate.find(r => r.studentId === student.id);
        if (record) {
          initialMap[student.id] = {
            included: true,
            status: record.status,
            notes: record.notes || ''
          };
        } else {
          // If records exist for this date, unrecorded students are unchecked (included: false)
          // If brand new date with no records, default to included: true for easy initial check
          initialMap[student.id] = {
            included: !hasExistingRecords,
            status: 'present',
            notes: ''
          };
        }
      });

      setAttendanceMap(initialMap);
      setLastLoadedDate(selectedDate);
      if (saveStatus === 'saved') {
        setIsDirty(false);
      } else {
        setSaveStatus('idle');
      }
    }
  }, [selectedDate, students, attendance, saveStatus]);

  const handleToggleStudent = (studentId: string, included?: boolean) => {
    setAttendanceMap(prev => {
      const current = prev[studentId] || { included: false, status: 'present', notes: '' };
      const nextIncluded = included !== undefined ? included : !current.included;
      return {
        ...prev,
        [studentId]: {
          ...current,
          included: nextIncluded
        }
      };
    });
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleToggleSelectAll = (included: boolean) => {
    setAttendanceMap(prev => {
      const updated = { ...prev };
      filteredActiveStudents.forEach(student => {
        const current = updated[student.id] || { included: false, status: 'present', notes: '' };
        updated[student.id] = {
          ...current,
          included
        };
      });
      return updated;
    });
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'permission') => {
    setAttendanceMap(prev => {
      const current = prev[studentId] || { included: true, status: 'present', notes: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          included: true, // Auto check when status changed
          status
        }
      };
    });

    // Auto-expand notes input whenever student status is set to 'permission' or toggled
    if (status === 'permission') {
      setExpandedStudentNotes(prev => ({
        ...prev,
        [studentId]: true
      }));
    }

    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleStatusCycle = (studentId: string, currentStatus: 'present' | 'absent' | 'permission') => {
    const nextStatusMap: Record<string, 'present' | 'absent' | 'permission'> = {
      present: 'permission',
      permission: 'absent',
      absent: 'present'
    };
    const nextStatus = nextStatusMap[currentStatus];
    handleStatusChange(studentId, nextStatus);
  };

  const handleNoteChange = (studentId: string, notes: string) => {
    setAttendanceMap(prev => {
      const current = prev[studentId] || { included: true, status: 'present', notes: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          included: true, // Auto check when note added
          notes
        }
      };
    });
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleAppendNotePill = (studentId: string, textToAppend: string) => {
    setAttendanceMap(prev => {
      const current = prev[studentId] || { included: true, status: 'permission', notes: '' };
      const existingNote = current.notes ? current.notes.trim() : '';
      const newNote = existingNote ? `${existingNote}, ${textToAppend}` : textToAppend;
      return {
        ...prev,
        [studentId]: {
          ...current,
          included: true,
          notes: newNote
        }
      };
    });
    setExpandedStudentNotes(prev => ({
      ...prev,
      [studentId]: true
    }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleMarkAllPresent = () => {
    const updated = { ...attendanceMap };
    filteredActiveStudents.forEach(student => {
      updated[student.id] = {
        ...(updated[student.id] || { notes: '' }),
        included: true,
        status: 'present'
      };
    });
    setAttendanceMap(updated);
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    // Only save active students that are CHECKED (included: true)
    const recordsToSave = activeStudents
      .filter(student => attendanceMap[student.id]?.included)
      .map(student => {
        const state = attendanceMap[student.id];
        return {
          studentId: student.id,
          studentName: student.name,
          date: selectedDate,
          status: state.status,
          notes: state.notes ? state.notes.trim() : '',
          branch: student.branch || 'Pusat'
        };
      });

    if (recordsToSave.length === 0) {
      triggerToast(
        'Belum Ada Siswa Dicentang',
        'Centang setidaknya satu nama siswa untuk menyimpan data absensi sesi ini.',
        'error'
      );
      return;
    }

    setSaveStatus('saving');

    try {
      await onAddAttendanceBatch(recordsToSave);
      setSaveStatus('saved');
      setIsDirty(false);
      setSavedRecordsCount(recordsToSave.length);
      setShowSuccessModal(true);
      
      const formattedDateText = (() => {
        try {
          return new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
          return selectedDate;
        }
      })();

      triggerToast(
        'Presensi Berhasil Disimpan! 🎉',
        `${recordsToSave.length} data kehadiran siswa tanggal ${formattedDateText} telah tersimpan ke database. Siswa yang tidak dicentang tidak disimpan.`,
        'success'
      );

      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
      triggerToast(
        'Gagal Menyimpan Presensi',
        'Terjadi kesalahan saat menyimpan data absensi. Silakan coba lagi.',
        'error'
      );
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

  // --- HISTORY CALCULATIONS (FILTERED PER KELAS) ---
  const classFilteredAttendance = attendance.filter(a => {
    if (historyClassFilter === 'ALL') return true;
    const student = students.find(s => s.id === a.studentId);
    if (historyClassFilter === 'UNASSIGNED') return !student || !student.kelas;
    return student?.kelas === historyClassFilter;
  });

  const uniqueDates = Array.from(new Set(classFilteredAttendance.map(a => a.date))).sort((a, b) => b.localeCompare(a));

  const dateStats = uniqueDates.map(date => {
    const records = classFilteredAttendance.filter(a => a.date === date);
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
  const totalRecordedRecords = classFilteredAttendance.length;
  const totalPresentRecords = classFilteredAttendance.filter(a => a.status === 'present').length;
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
    const matchesClass = historyClassFilter === 'ALL' || 
      (historyClassFilter === 'UNASSIGNED' ? !item.student.kelas : item.student.kelas === historyClassFilter);
    const matchesSearch = item.student.name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
           item.student.parentName.toLowerCase().includes(historySearchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const isLight = theme === 'light';

  return (
    <div id="attendance-tracker-section" className="space-y-6">
      {/* Top Header & Sub-Tabs Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <h2 className={`text-2xl font-bold font-sans ${isLight ? 'text-slate-800' : 'text-white'}`}>Absensi Siswa</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm hidden sm:block`}>Pencatatan harian dan rekapitulasi riwayat kehadiran Math Fingers.</p>
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
                <p className="text-xs text-slate-400 hidden sm:block">Siswa aktif terdaftar bimbingan privat.</p>
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

          {/* Class Filter Bar & Banner */}
          <div className={`p-4 rounded-2xl border shadow-sm space-y-3.5 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Layers className="text-emerald-500" size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pilih Kelas Bimbingan untuk Mengabsen:
                </span>
              </div>

              <div className="relative min-w-[210px] w-full sm:w-auto">
                <CustomDropdown
                  value={selectedClassFilter}
                  onChange={(val) => setSelectedClassFilter(val)}
                  options={[
                    { value: 'ALL', label: `Semua Kelas (${activeStudents.length} Siswa)` },
                    ...classes.map(c => {
                      const count = activeStudents.filter(s => s.kelas === c.name).length;
                      return { value: c.name, label: `${c.name} (${count} Siswa)` };
                    }),
                    ...(activeStudents.some(s => !s.kelas) ? [
                      { value: 'UNASSIGNED', label: `Tanpa Kelas (${activeStudents.filter(s => !s.kelas).length} Siswa)` }
                    ] : [])
                  ]}
                  theme={theme}
                  className="w-full"
                />
              </div>
            </div>

            {/* Quick Class Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedClassFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                  selectedClassFilter === 'ALL'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                    : isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Users size={13} />
                <span>Semua Kelas ({activeStudents.length})</span>
              </button>

              {classes.map(cls => {
                const classCount = activeStudents.filter(s => s.kelas === cls.name).length;
                const isSelected = selectedClassFilter === cls.name;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setSelectedClassFilter(cls.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                        : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Layers size={13} className={isSelected ? 'text-white' : 'text-emerald-400'} />
                    <span>{cls.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {classCount}
                    </span>
                  </button>
                );
              })}

              {activeStudents.some(s => !s.kelas) && (
                <button
                  type="button"
                  onClick={() => setSelectedClassFilter('UNASSIGNED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                    selectedClassFilter === 'UNASSIGNED'
                      ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                      : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>Tanpa Kelas ({activeStudents.filter(s => !s.kelas).length})</span>
                </button>
              )}
            </div>

            {/* Active Class Info Banner */}
            {selectedClassObj && (
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 ${
                isLight ? 'bg-emerald-50/70 border-emerald-200 text-slate-800' : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-100'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                      Cabang {selectedClassObj.branch || 'Pusat'}
                    </span>
                    <h4 className={`font-extrabold text-base ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                      {selectedClassObj.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-400 flex-wrap pt-0.5">
                    <span className="flex items-center gap-1">
                      <User size={13} className="text-emerald-500" />
                      Tentor: <strong className={isLight ? 'text-slate-700' : 'text-slate-200'}>{selectedClassObj.teacherName || 'Pengajar Utama'}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-emerald-500" />
                      {selectedClassObj.scheduleDays || 'Jadwal'} ({selectedClassObj.scheduleTime || '-'})
                    </span>
                    <span className="flex items-center gap-1">
                      <DoorClosed size={13} className="text-amber-500" />
                      {selectedClassObj.room || 'Ruangan'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Siswa Terdaftar</span>
                    <span className="text-sm font-black text-emerald-500">
                      {activeStudents.filter(s => s.kelas === selectedClassObj.name).length} / {selectedClassObj.quota || 12} Siswa
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="py-2 px-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare size={14} />
                    <span>Hadir Semua Kelas Ini</span>
                  </button>
                </div>
              </div>
            )}
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
                <div className="relative shrink-0 min-w-[140px] w-full sm:w-auto">
                  <CustomDropdown
                    value={sortOrder}
                    onChange={(val) => setSortOrder(val as 'asc' | 'desc')}
                    options={[
                      { value: 'asc', label: 'Nama: A - Z' },
                      { value: 'desc', label: 'Nama: Z - A' }
                    ]}
                    theme={theme}
                    className="w-full"
                  />
                </div>

                {(recordSearchQuery || sortOrder !== 'asc') && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecordSearchQuery('');
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
            </div>
          )}

          <OfflineIndicator theme={theme} className="mb-4" />

          <div className={`rounded-2xl border shadow-sm overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            {/* Master Selection & Action Bar */}
            {filteredActiveStudents.length > 0 && !loading && (
              <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    />
                    <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      {isAllFilteredSelected ? 'Batalkan Semua' : 'Centang Semua'}
                    </span>
                  </label>

                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

                  <span className={`text-xs font-medium ${
                    includedFilteredCount > 0 
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
                      : 'text-amber-500 font-semibold'
                  }`}>
                    {includedFilteredCount} dari {filteredActiveStudents.length} Siswa Dicentang
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                      isLight 
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-250 shadow-2xs' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                      isLight 
                        ? 'bg-white hover:bg-slate-100 text-rose-600 border-slate-250 shadow-2xs' 
                        : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border-slate-700'
                    }`}
                  >
                    Hapus Centang
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="p-4 sm:p-5 animate-pulse">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                      <div className="flex items-start gap-4">
                        <div className={`h-9 w-9 rounded-full shrink-0 flex items-center justify-center ${isLight ? 'bg-slate-200' : 'bg-slate-850'}`} />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={`h-5 w-24 rounded ${isLight ? 'bg-slate-250' : 'bg-slate-800'}`} />
                            <div className={`h-4 w-14 rounded ${isLight ? 'bg-slate-250' : 'bg-slate-800'}`} />
                            <div className={`h-4 w-10 rounded ${isLight ? 'bg-slate-250' : 'bg-slate-800'}`} />
                          </div>
                          <div className={`h-4 w-32 rounded ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`} />
                          <div className={`h-3.5 w-48 rounded ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-28 rounded-xl ${isLight ? 'bg-slate-200' : 'bg-slate-850'}`} />
                        <div className={`h-10 w-20 rounded-xl ${isLight ? 'bg-slate-200' : 'bg-slate-850'}`} />
                        <div className={`h-10 w-10 rounded-xl ${isLight ? 'bg-slate-200' : 'bg-slate-850'}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeStudents.length === 0 ? (
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
                    filteredActiveStudents.map((student, index) => {
                      const state = attendanceMap[student.id] || { included: false, status: 'present', notes: '' };
                      const isIncluded = !!state.included;
                      const isExpanded = !!expandedStudentNotes[student.id] || state.status === 'permission' || !!state.notes;
                    
                      return (
                        <div key={student.id} className={`p-4 sm:p-5 transition duration-150 ${
                          !isIncluded 
                            ? isLight ? 'bg-slate-50/70 opacity-60' : 'bg-slate-950/40 opacity-50'
                            : isLight ? 'hover:bg-slate-50/90' : 'hover:bg-slate-800/20'
                        }`}>
                          {/* === MOBILE ONLY COMPACT ROW === */}
                          <div className="md:hidden flex items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => handleToggleStudent(student.id)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                                title={isIncluded ? 'Batalkan pilih siswa ini' : 'Centang untuk merekam absensi siswa ini'}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] font-bold text-emerald-500 font-mono tracking-wider px-1 rounded bg-emerald-500/10">
                                    {student.level.toLowerCase().includes('dasar') 
                                      ? 'L. DASAR' 
                                      : `LEVEL ${student.level.match(/\d+/)?.[0] || '1'}`}
                                  </span>
                                  {student.kelas ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15">
                                      🏫 {student.kelas}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-semibold px-1 rounded bg-slate-500/10 text-slate-400">
                                      Tanpa Kelas
                                    </span>
                                  )}
                                  {!isIncluded && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                      Kosong (Tidak Disimpan)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                    {index + 1}
                                  </span>
                                  <h4 className={`font-bold text-sm truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{student.name}</h4>
                                  <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                                    #{getStudentUniqueCode(student)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Option expand button (Notes & WA) */}
                              <button
                                type="button"
                                onClick={() => toggleNotes(student.id)}
                                className={`p-2.5 rounded-xl border transition duration-150 shrink-0 relative ${
                                  isExpanded
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : isLight
                                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                }`}
                                title="Tulis Catatan / Kirim WA"
                              >
                                <MessageSquare size={15} />
                                {state.notes && (
                                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900 animate-pulse" />
                                )}
                              </button>

                              {/* One-Tap Cycle Trigger Circle (Innovative mobile UX) */}
                              <button
                                type="button"
                                onClick={() => handleStatusCycle(student.id, state.status)}
                                className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-sm active:scale-90 shrink-0 border ${
                                  !isIncluded
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                                    : state.status === 'present'
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
                            <div className="flex items-center gap-3.5 flex-1">
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => handleToggleStudent(student.id)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                                title={isIncluded ? 'Batalkan pilih siswa ini' : 'Centang untuk merekam absensi siswa ini'}
                              />
                              <div className="flex-1 flex flex-col">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-emerald-500 font-mono tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10">
                                      {student.level.toLowerCase().includes('dasar') 
                                        ? 'LEVEL DASAR' 
                                        : `LEVEL ${student.level.match(/\d+/)?.[0] || '1'}`}
                                    </span>
                                    {student.kelas ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 flex items-center gap-1">
                                        <Layers size={11} />
                                        <span>{student.kelas}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/15">
                                        Tanpa Kelas
                                      </span>
                                    )}
                                    {!isIncluded && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        Kosong (Tidak Disimpan)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                                    {index + 1}
                                  </span>
                                  <h3 className={`font-bold text-base ${isLight ? 'text-slate-800' : 'text-white'}`}>{student.name}</h3>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                                    #{getStudentUniqueCode(student)}
                                  </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Wali: {student.parentName} ({student.parentPhone})</p>
                              </div>
                            </div>

                            {/* Desktop Controls */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <div className="flex flex-row items-center gap-3">
                                <div className={`flex p-1 rounded-xl border ${
                                  isLight ? 'bg-slate-100 border-slate-250' : 'bg-slate-950/40 border-slate-800/60'
                                }`}>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(student.id, 'present')}
                                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-150 flex items-center justify-center gap-1.5 ${
                                      state.status === 'present' && isIncluded
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
                                      state.status === 'permission' && isIncluded
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
                                      state.status === 'absent' && isIncluded
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
                                    className={`px-3 py-1.5 border rounded-xl text-xs w-44 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-500 ${
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

                              {/* Desktop Quick Note Pills */}
                              <div className="flex items-center gap-1.5 flex-wrap justify-end pt-0.5">
                                <span className="text-[9.5px] text-slate-500 font-semibold">Pintasan Catatan:</span>
                                <button
                                  type="button"
                                  onClick={() => handleAppendNotePill(student.id, 'Izin makan')}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition cursor-pointer"
                                >
                                  + Izin Makan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAppendNotePill(student.id, 'Hadir kembali')}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition cursor-pointer"
                                >
                                  + Hadir Kembali
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAppendNotePill(student.id, 'Izin sakit')}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition cursor-pointer"
                                >
                                  + Izin Sakit
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* === COLLAPSIBLE OPTION PANEL (For Mobile notes & WhatsApp trigger when expanded) === */}
                          {isExpanded && (
                            <div className="md:hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5 w-full">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                    Catatan Kehadiran Siswa
                                  </label>
                                  {state.notes && (
                                    <button
                                      type="button"
                                      onClick={() => handleNoteChange(student.id, '')}
                                      className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                                    >
                                      Hapus Catatan
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  placeholder="Tulis catatan (misal: Izin makan, telat 10 menit)..."
                                  value={state.notes}
                                  onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                  className={`px-3 py-2 border rounded-xl text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-550 ${
                                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/30 border-slate-800 text-white'
                                  }`}
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => sendWhatsAppNotification(student)}
                                  className="flex-1 py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/25 transition duration-150 flex items-center gap-2 justify-center shrink-0 cursor-pointer"
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
                  <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'
                  }`}>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                      <span>Siswa Akan Disimpan: <strong className="font-bold text-emerald-600 dark:text-emerald-400">{includedFilteredCount} Siswa Dicentang</strong> (dari {scheduledActiveStudents.length} total)</span>
                    </div>

                    <button
                      id="btn-save-attendance"
                      onClick={handleSave}
                      disabled={saveStatus === 'saving'}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-sm px-7 py-3 rounded-xl transition duration-200 shadow-md ${
                        saveStatus === 'saving'
                          ? 'bg-slate-700 text-slate-300 cursor-not-allowed animate-pulse'
                          : saveStatus === 'saved'
                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                            : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-emerald-600/20 hover:shadow-lg'
                      }`}
                    >
                      {saveStatus === 'saving' ? (
                        <>
                          <RefreshCw size={18} className="animate-spin text-emerald-400" />
                          <span>Menyimpan ke Database...</span>
                        </>
                      ) : saveStatus === 'saved' ? (
                        <>
                          <CheckCircle size={18} className="animate-bounce text-white" />
                          <span>Presensi Disimpan! 🎉</span>
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          <span>Simpan Absensi ({includedFilteredCount} Dicentang)</span>
                        </>
                      )}
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
          {/* Quick Class Selector Bar for History */}
          <div className={`p-4 rounded-2xl border shadow-sm space-y-2 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center gap-2">
              <Layers className="text-emerald-500" size={16} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pilih Riwayat & Rekap Per Kelas:
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setHistoryClassFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                  historyClassFilter === 'ALL'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                    : isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Users size={13} />
                <span>Semua Kelas ({attendance.length} Total Absensi)</span>
              </button>

              {classes.map(cls => {
                const classRecordsCount = attendance.filter(a => {
                  const s = students.find(std => std.id === a.studentId);
                  return s?.kelas === cls.name;
                }).length;
                const isSelected = historyClassFilter === cls.name;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setHistoryClassFilter(cls.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                        : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Layers size={13} className={isSelected ? 'text-white' : 'text-emerald-400'} />
                    <span>{cls.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {classRecordsCount} Data
                    </span>
                  </button>
                );
              })}

              {students.some(s => !s.kelas) && (
                <button
                  type="button"
                  onClick={() => setHistoryClassFilter('UNASSIGNED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                    historyClassFilter === 'UNASSIGNED'
                      ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                      : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>Tanpa Kelas</span>
                </button>
              )}
            </div>
          </div>
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
                
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Class Filter Dropdown for History */}
                  <CustomDropdown
                    value={historyClassFilter}
                    onChange={(val) => setHistoryClassFilter(val)}
                    options={[
                      { value: 'ALL', label: 'Semua Kelas' },
                      ...classes.map(c => ({ value: c.name, label: c.name })),
                      { value: 'UNASSIGNED', label: 'Tanpa Kelas' }
                    ]}
                    theme={theme}
                    className="w-full sm:w-auto sm:min-w-[140px]"
                  />

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-48">
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
                              <div className="flex items-center gap-2">
                                <span className={`font-bold block ${isLight ? 'text-slate-850' : 'text-white'}`}>{student.name}</span>
                                <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                                  #{getStudentUniqueCode(student)}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium block">Wali: {student.parentName}</span>
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
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-450 font-semibold">{student?.level || 'Math Fingers'}</span>
                              {student?.kelas && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  🏫 {student.kelas}
                                </span>
                              )}
                            </div>
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
                    <div className="flex gap-2.5 items-center w-full">
                      <div className="flex-1 min-w-[150px]">
                        <CustomDropdown
                          value={selectedMissingStudent}
                          onChange={(val) => setSelectedMissingStudent(val)}
                          options={[
                            { value: '', label: '-- Pilih Siswa --' },
                            ...missingStudents.map(s => ({ value: s.id, label: s.name }))
                          ]}
                          theme={theme}
                          className="w-full"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedMissingStudent) {
                            const student = students.find(s => s.id === selectedMissingStudent);
                            if (student) {
                              await onAddAttendanceBatch([{
                                studentId: student.id,
                                studentName: student.name,
                                date: viewingDetailDate!,
                                status: 'present',
                                notes: ''
                              }]);
                              setSelectedMissingStudent("");
                              triggerToast(
                                'Siswa Berhasil Ditambahkan!',
                                `${student.name} berhasil ditambahkan ke sesi presensi.`
                              );
                            }
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap h-[38px] flex items-center justify-center"
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

      {/* === SUCCESS MODAL POPUP === */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 15 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`rounded-2xl w-full max-w-sm shadow-2xl border p-6 text-center ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#090d16] border-slate-800 text-white'
              }`}
            >
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <CheckCircle size={38} className="animate-bounce text-emerald-500" />
                <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
              </div>
              
              <h3 className={`text-lg font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Presensi Berhasil Disimpan! 🎉
              </h3>
              
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Sebanyak <strong className="text-emerald-500 font-extrabold">{savedRecordsCount} data kehadiran siswa</strong> pada tanggal{' '}
                <strong className={isLight ? 'text-slate-800 font-bold' : 'text-slate-200 font-bold'}>
                  {(() => {
                    try {
                      return new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                    } catch {
                      return selectedDate;
                    }
                  })()}
                </strong>{' '}
                telah aman disimpan ke database.
              </p>
              
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-md shadow-emerald-600/10 active:scale-95 cursor-pointer"
                >
                  Tutup & Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === FLOATING TOAST NOTIFICATION === */}
      <AnimatePresence>
        {toastNotification && toastNotification.show && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            className="fixed top-5 right-5 z-[9999] max-w-sm w-full pointer-events-auto"
          >
            <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl relative overflow-hidden flex items-start gap-3.5 ${
              toastNotification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/40'
                : isLight
                  ? 'bg-white/95 border-emerald-400 text-slate-800 shadow-emerald-500/15'
                  : 'bg-slate-900/95 border-emerald-500/40 text-white shadow-emerald-950/60'
            }`}>
              {/* Left animated icon indicator */}
              <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center relative ${
                toastNotification.type === 'error'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-emerald-500/15 text-emerald-500'
              }`}>
                {toastNotification.type === 'error' ? (
                  <ShieldAlert size={22} className="animate-pulse" />
                ) : (
                  <>
                    <CheckCircle size={22} className="z-10 text-emerald-500 animate-bounce" />
                    <span className="absolute inset-0 rounded-xl bg-emerald-500/30 animate-ping opacity-75" />
                  </>
                )}
              </div>

              {/* Toast Text Content */}
              <div className="flex-1 pr-2">
                <h4 className="font-extrabold text-sm tracking-tight">
                  {toastNotification.message}
                </h4>
                {toastNotification.detail && (
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                    {toastNotification.detail}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setToastNotification(null)}
                className="text-slate-400 hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-800/40 cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Bottom animated progress timer bar */}
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 4.5, ease: "linear" }}
                className={`absolute bottom-0 left-0 h-1.5 ${
                  toastNotification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === QR CODE ABSEN MANDIRI MODAL === */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-3xl w-full max-w-md shadow-2xl border p-6 sm:p-7 transform transition-all scale-100 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#090d16] border-slate-800 text-white'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-850 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-xl">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className={`font-black text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    QR Absen Mandiri
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                    Math Fingers Attendance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className={`p-1.5 rounded-xl transition ${
                  isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-600' : 'hover:bg-slate-800/60 text-slate-500 hover:text-slate-300'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Session Info Details */}
            <div className={`p-3.5 rounded-2xl border mb-5 text-xs space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-850/60'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-450 font-semibold">Kelas Target:</span>
                <span className="text-indigo-500 font-extrabold">{selectedClassFilter === 'ALL' ? 'Semua Kelas' : selectedClassFilter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 font-semibold">Sesi Tanggal:</span>
                <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {(() => {
                    try {
                      return new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                    } catch {
                      return selectedDate;
                    }
                  })()}
                </span>
              </div>
            </div>

            {/* QR Image Display */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200/80 max-w-[240px] mx-auto shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  `${window.location.origin}${window.location.pathname}?absen=1&kelas=${encodeURIComponent(selectedClassFilter)}&tanggal=${selectedDate}`
                )}&color=059669`}
                alt="QR Code Absen"
                className="w-48 h-48 object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] text-emerald-600 font-black mt-2 tracking-widest uppercase">
                PINDAI QR UNTUK ABSEN
              </span>
            </div>

            {/* Share Link Input + Copy Button */}
            <div className="mt-5 space-y-2">
              <label className={`block text-[11px] font-bold tracking-wide uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Link Absen Mandiri Siswa
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${window.location.pathname}?absen=1&kelas=${encodeURIComponent(selectedClassFilter)}&tanggal=${selectedDate}`}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-mono font-medium border focus:outline-none ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 text-slate-700' 
                      : 'bg-slate-950/50 border-slate-850 text-slate-350'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?absen=1&kelas=${encodeURIComponent(selectedClassFilter)}&tanggal=${selectedDate}`;
                    navigator.clipboard.writeText(url);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className={`px-3 py-2 rounded-xl transition border text-xs font-bold flex items-center gap-1 shrink-0 ${
                    copiedLink
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  <Copy size={14} />
                  <span>{copiedLink ? 'Disalin' : 'Salin'}</span>
                </button>
              </div>
            </div>

            {/* Primary Action Controls */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?absen=1&kelas=${encodeURIComponent(selectedClassFilter)}&tanggal=${selectedDate}`;
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Cetak QR Code Absensi - Math Fingers</title>
                        <style>
                          body {
                            font-family: system-ui, -apple-system, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 90vh;
                            margin: 0;
                            text-align: center;
                            color: #334155;
                          }
                          .card {
                            border: 2px solid #e2e8f0;
                            border-radius: 24px;
                            padding: 40px;
                            max-width: 450px;
                            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                          }
                          .logo {
                            font-size: 24px;
                            font-weight: 800;
                            color: #059669;
                            margin-bottom: 8px;
                          }
                          .title {
                            font-size: 20px;
                            font-weight: 700;
                            color: #1e293b;
                            margin-bottom: 20px;
                          }
                          .qr-image {
                            width: 260px;
                            height: 260px;
                            margin: 20px 0;
                            border: 1px solid #f1f5f9;
                            padding: 10px;
                            background: white;
                            border-radius: 12px;
                          }
                          .info {
                            background: #f8fafc;
                            border-radius: 12px;
                            padding: 16px;
                            font-size: 14px;
                            margin-top: 20px;
                            text-align: left;
                            border: 1px solid #e2e8f0;
                          }
                          .info-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 6px;
                          }
                          .info-row:last-child {
                            margin-bottom: 0;
                          }
                          .label {
                            font-weight: 600;
                            color: #64748b;
                          }
                          .value {
                            font-weight: 700;
                            color: #334155;
                          }
                          .footer-text {
                            font-size: 11px;
                            color: #94a3b8;
                            margin-top: 24px;
                          }
                          @media print {
                            body { min-height: auto; }
                            .card { border: none; box-shadow: none; padding: 0; }
                          }
                        </style>
                      </head>
                      <body>
                        <div class="card">
                          <div class="logo">Math Fingers</div>
                          <div class="title">SCAN UNTUK ABSEN MANDIRI</div>
                          <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=\${encodeURIComponent(url)}&color=059669" alt="QR Code" />
                          <div class="info">
                            <div class="info-row">
                              <span class="label">Kelas:</span>
                              <span class="value" style="color: #059669;">\${selectedClassFilter === 'ALL' ? 'Semua Kelas' : selectedClassFilter}</span>
                            </div>
                            <div class="info-row">
                              <span class="label">Tanggal:</span>
                              <span class="value">\${(() => {
                                try {
                                  return new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                } catch {
                                  return selectedDate;
                                }
                              })()}</span>
                            </div>
                          </div>
                          <div class="footer-text">Silakan scan menggunakan smartphone Anda, pilih nama, dan masukkan Kode Unik Siswa.</div>
                        </div>
                        <script>
                          window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                          };
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <Printer size={14} />
                <span>Cetak QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?absen=1&kelas=${encodeURIComponent(selectedClassFilter)}&tanggal=${selectedDate}`;
                  const formattedDateText = (() => {
                    try {
                      return new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                    } catch {
                      return selectedDate;
                    }
                  })();
                  const message = `Halo siswa-siswi Math Fingers! Silakan lakukan absensi mandiri untuk sesi bimbingan:\n\n📅 Hari/Tgl: ${formattedDateText}\n🏫 Kelas: ${selectedClassFilter === 'ALL' ? 'Semua Kelas' : selectedClassFilter}\n\nLakukan absensi mandiri melalui link berikut ini:\n🔗 ${url}\n\nTerima kasih! 😊`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                }}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Bagikan ke WA</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
