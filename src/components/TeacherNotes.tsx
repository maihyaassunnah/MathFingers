import React, { useState } from 'react';
import { Student, TeacherNote } from '../types';
import { getWhatsAppLink } from '../utils';
import { BookOpen, FileText, Plus, Search, Calendar, User, Trash2, Send, AlertCircle, CheckSquare, Square } from 'lucide-react';

interface TeacherNotesProps {
  students: Student[];
  notes: TeacherNote[];
  onAddNote: (data: Omit<TeacherNote, 'id'>) => Promise<void>;
  onAddNotesBatch: (data: Omit<TeacherNote, 'id'>[]) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  theme?: string;
}

export function TeacherNotes({ 
  students, 
  notes, 
  onAddNote, 
  onAddNotesBatch,
  onDeleteNote,
  theme = 'dark'
}: TeacherNotesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [topic, setTopic] = useState('');
  const [generalContent, setGeneralContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [teacherName, setTeacherName] = useState('Kak Guru');
  
  // Selection map for bulk students in note dialog
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});
  // Specific notes per student
  const [studentSpecificNotes, setStudentSpecificNotes] = useState<Record<string, string>>({});
  const [studentSearchInForm, setStudentSearchInForm] = useState('');

  const activeStudents = [...students]
    .filter(s => s.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleOpenForm = () => {
    setTopic('');
    setGeneralContent('');
    setDate(new Date().toISOString().slice(0, 10));
    setStudentSearchInForm('');
    
    // Select all active students by default
    const initialSelected: Record<string, boolean> = {};
    const initialSpecificNotes: Record<string, string> = {};
    activeStudents.forEach(s => {
      initialSelected[s.id] = true;
      initialSpecificNotes[s.id] = '';
    });
    setSelectedStudentIds(initialSelected);
    setStudentSpecificNotes(initialSpecificNotes);
    
    setIsFormOpen(true);
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleToggleSelectAll = () => {
    const allSelected = activeStudents.every(s => selectedStudentIds[s.id]);
    const nextSelected: Record<string, boolean> = {};
    activeStudents.forEach(s => {
      nextSelected[s.id] = !allSelected;
    });
    setSelectedStudentIds(nextSelected);
  };

  const handleSpecificNoteChange = (studentId: string, value: string) => {
    setStudentSpecificNotes(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      alert('Mohon isi Topik / Materi Pembahasan!');
      return;
    }

    const studentsToSave = activeStudents.filter(s => selectedStudentIds[s.id]);
    if (studentsToSave.length === 0) {
      alert('Mohon pilih setidaknya satu siswa untuk catatan jurnal!');
      return;
    }

    const batchData: Omit<TeacherNote, 'id'>[] = studentsToSave.map(student => {
      const specificContent = studentSpecificNotes[student.id]?.trim();
      const content = specificContent || generalContent.trim() || `Telah mengikuti sesi pembelajaran materi: ${topic}.`;
      return {
        studentId: student.id,
        studentName: student.name,
        date,
        topic: topic.trim(),
        content,
        teacherName: teacherName.trim() || 'Kak Guru'
      };
    });

    try {
      await onAddNotesBatch(batchData);
      setIsFormOpen(false);
      alert(`Berhasil menyimpan jurnal harian untuk ${batchData.length} siswa!`);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan catatan jurnal.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus jurnal harian ini?')) {
      await onDeleteNote(id);
    }
  };

  const sendWhatsAppJournal = (note: TeacherNote) => {
    const student = students.find(s => s.id === note.studentId);
    if (!student) return;

    const message = `Halo Ibu/Bapak *${student.parentName}*,\n\nIni adalah *Catatan Harian Belajar* ananda *${student.name}* hari ini di les privat *Math Fingers*:\n\n📅 Tanggal: ${note.date}\n📚 Topik Belajar: *${note.topic}*\n📝 Catatan Guru: "${note.content}"\n\n_Mari dampingi ananda melatih gerakan jarinya di rumah ya Bapak/Ibu! Berhitung Cepat & Akurat Tanpa Alat!_ ⚡\n\nSalam Hangat,\n*${note.teacherName}* - Math Fingers`;

    const waLink = getWhatsAppLink(student.parentPhone, message);
    window.open(waLink, '_blank', 'noreferrer');
  };

  // Format date to Indonesian style (e.g., "Sabtu, 27 Juni 2026")
  const formatIndonesianDate = (dateString: string) => {
    try {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) return dateString;
      const dayName = days[dateObj.getDay()];
      const dateNum = dateObj.getDate();
      const monthName = months[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      return `${dayName}, ${dateNum} ${monthName} ${year}`;
    } catch (e) {
      return dateString;
    }
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStudent = studentFilter === 'All' || note.studentId === studentFilter;
    return matchesSearch && matchesStudent;
  });

  // Group filtered notes by date (descending order)
  const groupedNotes: Record<string, TeacherNote[]> = {};
  filteredNotes.forEach(note => {
    if (!groupedNotes[note.date]) {
      groupedNotes[note.date] = [];
    }
    groupedNotes[note.date].push(note);
  });

  const sortedDates = Object.keys(groupedNotes).sort((a, b) => b.localeCompare(a));

  const isLight = theme === 'light';

  // Filter students shown in the modal form
  const modalFilteredStudents = activeStudents.filter(s => 
    s.name.toLowerCase().includes(studentSearchInForm.toLowerCase())
  );

  return (
    <div id="teacher-notes-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Catatan Jurnal Guru</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>
            Input satu kali jurnal untuk semua siswa aktif yang hadir secara bersamaan berdasarkan hari.
          </p>
        </div>
        
        <button
          id="btn-add-note"
          onClick={handleOpenForm}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl transition duration-150 shadow-sm"
        >
          <Plus size={18} />
          <span>Buat Jurnal Harian Kelas</span>
        </button>
      </div>

      {/* Filter and search */}
      <div className={`p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-4 items-center ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
          <input
            id="note-search-input"
            type="text"
            placeholder="Cari materi jurnal, catatan, atau nama siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm placeholder:text-slate-550 ${
              isLight 
                ? 'bg-slate-50 border-slate-200 text-slate-800' 
                : 'bg-slate-950/40 border-slate-800 text-white'
            }`}
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            id="filter-note-student"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-750' 
                : 'bg-slate-950/40 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Semua Siswa</option>
            {students.map(s => (
              <option key={s.id} value={s.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Journal Entry Dialog (Bulk Dialog based on Date) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`rounded-2xl w-full max-w-2xl shadow-2xl border my-8 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800 text-white'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div>
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Buat Jurnal Harian Kelas</h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>Input materi kelas untuk semua siswa sekaligus & sesuaikan per anak jika diperlukan.</p>
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} className={`${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'} font-medium text-lg`}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Row 1: Date & Teacher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Tanggal Pertemuan *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800 font-medium' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Nama Pengajar</label>
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800 font-medium' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Row 2: Topic */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Materi / Topik Pembahasan *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Penjumlahan Teman Kecil (+4, +3)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800 font-medium' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                />
              </div>

              {/* Row 3: General Class Content */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                  Catatan Evaluasi Umum Kelas (Default)
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Sesi melatih reflek jari berjalan lancar. Ananda semua mampu mempraktikkan gerakan lipat jari dengan baik."
                  value={generalContent}
                  onChange={(e) => setGeneralContent(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800 font-medium' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                />
                <span className={`text-[10px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>Catatan ini akan dipakai untuk siswa terpilih yang kolom catatan khususnya dikosongkan.</span>
              </div>

              {/* Checklist & Customize Per Student */}
              <div className="border-t pt-4 border-slate-200 dark:border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                    Siswa Yang Terlibat & Catatan Khusus
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Cari siswa..."
                      value={studentSearchInForm}
                      onChange={(e) => setStudentSearchInForm(e.target.value)}
                      className={`px-2.5 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded border transition uppercase ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-750'
                      }`}
                    >
                      Pilih Semua
                    </button>
                  </div>
                </div>

                {activeStudents.length === 0 ? (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle size={14} /> Belum ada siswa aktif yang terdaftar.
                  </p>
                ) : (
                  <div className={`border rounded-xl divide-y max-h-56 overflow-y-auto ${
                    isLight ? 'border-slate-150 divide-slate-100 bg-slate-50/50' : 'border-slate-800/80 divide-slate-800/40 bg-slate-950/40'
                  }`}>
                    {modalFilteredStudents.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-500">Siswa tidak ditemukan.</p>
                    ) : (
                      modalFilteredStudents.map(student => {
                        const isSelected = !!selectedStudentIds[student.id];
                        return (
                          <div key={student.id} className={`p-3 flex flex-col gap-2 transition ${
                            isSelected ? '' : 'opacity-40'
                          }`}>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleStudent(student.id)}
                                className="text-emerald-500 hover:scale-105 transition"
                              >
                                {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-500" />}
                              </button>
                              
                              <div className="flex-1 flex flex-col">
                                <span className="text-xs font-bold">{student.name}</span>
                                <span className="text-[10px] text-slate-400">Kelas {student.level}</span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="pl-7">
                                <input
                                  type="text"
                                  placeholder="Tulis catatan khusus untuk anak ini saja (Opsional)..."
                                  value={studentSpecificNotes[student.id] || ''}
                                  onChange={(e) => handleSpecificNoteChange(student.id, e.target.value)}
                                  className={`w-full px-2.5 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                                  }`}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Submit / Action buttons */}
              <div className={`pt-4 border-t flex gap-3 justify-end ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={activeStudents.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  Simpan Jurnal Kelas ({activeStudents.filter(s => selectedStudentIds[s.id]).length} Siswa)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Log Displayed Grouped by Date ("Berdasarkan Hari") */}
      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className={`p-12 text-center text-slate-500 rounded-2xl border shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <FileText size={44} className="mx-auto text-slate-600 mb-3" />
            <p className="font-medium text-slate-400">Belum ada catatan jurnal mengajar</p>
            <p className="text-xs text-slate-500 mt-1">Buat catatan jurnal pertamamu untuk mendokumentasikan progres harian kelas.</p>
          </div>
        ) : (
          sortedDates.map((dateKey) => {
            const dayNotes = groupedNotes[dateKey];
            return (
              <div key={dateKey} className="space-y-3">
                {/* Day Header */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px bg-slate-200 dark:bg-slate-800/80 flex-1"></div>
                  <span className={`px-4 py-1.5 text-xs font-extrabold rounded-full border shadow-sm tracking-wide uppercase flex items-center gap-1.5 ${
                    isLight 
                      ? 'bg-slate-100 text-slate-750 border-slate-200' 
                      : 'bg-slate-950/80 text-emerald-400 border-emerald-500/20'
                  }`}>
                    <Calendar size={13} className="text-emerald-500" />
                    {formatIndonesianDate(dateKey)}
                  </span>
                  <div className="h-px bg-slate-200 dark:bg-slate-800/80 flex-1"></div>
                </div>

                {/* Day's notes list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dayNotes.map((note) => (
                    <div key={note.id} className={`p-5 rounded-2xl border transition hover:scale-[1.01] flex flex-col justify-between gap-4 shadow-sm ${
                      isLight 
                        ? 'bg-white border-slate-200 hover:border-slate-300' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700/80'
                    }`}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className={`font-extrabold text-base ${isLight ? 'text-slate-800' : 'text-white'}`}>
                              {note.studentName}
                            </span>
                            <h4 className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold mt-1 flex items-center gap-1">
                              <BookOpen size={13} />
                              <span>Materi: {note.topic}</span>
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => sendWhatsAppJournal(note)}
                              className="inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-emerald-500/20 transition"
                              title="Kirim Catatan WA ke Orang Tua"
                            >
                              <Send size={11} />
                              <span>Kirim</span>
                            </button>
                            <button
                              onClick={() => handleDelete(note.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Hapus Jurnal"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className={`p-3.5 rounded-xl text-xs leading-relaxed border italic font-medium ${
                          isLight ? 'bg-amber-500/5 border-amber-500/10 text-slate-700' : 'bg-slate-950/40 border-slate-800/60 text-slate-300'
                        }`}>
                          "{note.content}"
                        </div>
                      </div>

                      <div className={`flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t ${
                        isLight ? 'border-slate-150' : 'border-slate-800/60'
                      }`}>
                        <span className="flex items-center gap-1 font-semibold">
                          <User size={11} />
                          <span>Oleh: {note.teacherName}</span>
                        </span>
                        <span className="font-mono">Ref: #{note.id.slice(0, 6)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
