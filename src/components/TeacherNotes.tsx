import React, { useState } from 'react';
import { Student, TeacherNote } from '../types';
import { getWhatsAppLink } from '../utils';
import { BookOpen, FileText, Plus, Search, Calendar, User, Trash2, Send, AlertCircle } from 'lucide-react';

interface TeacherNotesProps {
  students: Student[];
  notes: TeacherNote[];
  onAddNote: (data: Omit<TeacherNote, 'id'>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  theme?: string;
}

export function TeacherNotes({ 
  students, 
  notes, 
  onAddNote, 
  onDeleteNote,
  theme = 'dark'
}: TeacherNotesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [teacherName, setTeacherName] = useState('Kak Guru');

  const activeStudents = students.filter(s => s.status === 'active');

  const handleOpenForm = () => {
    setSelectedStudentId(activeStudents[0]?.id || '');
    setTopic('');
    setContent('');
    setDate(new Date().toISOString().slice(0, 10));
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !topic.trim() || !content.trim()) {
      alert('Mohon lengkapi semua field!');
      return;
    }

    const studentObj = students.find(s => s.id === selectedStudentId);
    if (!studentObj) return;

    await onAddNote({
      studentId: selectedStudentId,
      studentName: studentObj.name,
      date,
      topic,
      content,
      teacherName
    });

    setIsFormOpen(false);
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

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStudent = studentFilter === 'All' || note.studentId === studentFilter;
    return matchesSearch && matchesStudent;
  });

  const isLight = theme === 'light';

  return (
    <div id="teacher-notes-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Catatan Jurnal Guru</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Dokumentasikan materi belajar harian dan progres masing-masing siswa.</p>
        </div>
        
        <button
          id="btn-add-note"
          onClick={handleOpenForm}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl transition duration-150 shadow-sm"
        >
          <Plus size={18} />
          <span>Buat Catatan Baru</span>
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
            placeholder="Cari kata kunci jurnal atau nama siswa..."
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

      {/* Journal Entry Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-lg shadow-2xl border ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800 text-white'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Buat Catatan Jurnal Baru</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white font-medium text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Siswa *</label>
                {activeStudents.length === 0 ? (
                  <p className="text-sm text-amber-500 flex items-center gap-1"><AlertCircle size={15} /> Tidak ada siswa aktif. Daftarkan siswa terlebih dahulu.</p>
                ) : (
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-750' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    {activeStudents.map(s => (
                      <option key={s.id} value={s.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>{s.name} ({s.level})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Pertemuan *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nama Pengajar</label>
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Topik / Materi Pembahasan *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Teman Kecil Tambah 4"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Hasil Evaluasi / Catatan Guru *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Misal: Ananda mulai lancar melipat telunjuk, namun masih agak ragu saat mengurangkan teman besar 2."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex gap-3 justify-end ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={activeStudents.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 rounded-xl transition shadow-sm disabled:bg-slate-350 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History log display cards */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <div className={`p-12 text-center text-slate-500 rounded-2xl border shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <FileText size={44} className="mx-auto text-slate-600 mb-3" />
            <p className="font-medium text-slate-400">Belum ada catatan jurnal mengajar</p>
            <p className="text-xs text-slate-500 mt-1">Buat catatan pertamamu untuk mendokumentasikan progres mengajar.</p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div key={note.id} className={`p-5 rounded-2xl border transition space-y-4 shadow-sm ${
              isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-bold text-base ${isLight ? 'text-slate-800' : 'text-white'}`}>{note.studentName}</span>
                    <span className={`text-xs px-2 py-0.5 font-medium rounded-md flex items-center gap-1 ${
                      isLight ? 'bg-slate-100 text-slate-550' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Calendar size={10} />
                      {note.date}
                    </span>
                  </div>
                  <h4 className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold mt-1 flex items-center gap-1">
                    <BookOpen size={14} />
                    <span>Topik: {note.topic}</span>
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => sendWhatsAppJournal(note)}
                    className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/20 transition"
                    title="Kirim Catatan WA ke Orang Tua"
                  >
                    <Send size={12} />
                    <span>Kirim Catatan</span>
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-550 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Hapus Jurnal"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className={`p-4 rounded-xl text-sm leading-relaxed border italic ${
                isLight ? 'bg-amber-500/5 border-amber-500/10 text-slate-700' : 'bg-slate-950/30 border-slate-800/80 text-slate-300'
              }`}>
                {note.content}
              </div>

              <div className={`flex items-center justify-between text-xs text-slate-500 pt-1 border-t ${
                isLight ? 'border-slate-150' : 'border-slate-800/60'
              }`}>
                <span className="flex items-center gap-1">
                  <User size={12} />
                  <span>Pengajar: {note.teacherName}</span>
                </span>
                <span>Ref: #{note.id.slice(0, 6)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
