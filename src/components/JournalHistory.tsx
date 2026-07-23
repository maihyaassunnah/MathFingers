import React, { useState } from 'react';
import { Student, TeacherNote } from '../types';
import { formatRupiah, getWhatsAppLink } from '../utils';
import { 
  History, 
  Search, 
  Calendar, 
  BookOpen, 
  User, 
  Send, 
  Award,
  Clock,
  Sparkles
} from 'lucide-react';

interface JournalHistoryProps {
  students: Student[];
  notes: TeacherNote[];
  theme?: string;
}

export function JournalHistory({ students, notes, theme = 'dark' }: JournalHistoryProps) {
  const isLight = theme === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');

  // Utility to map color classes based on accent
  const getAccentBgClass = () => 'bg-emerald-500';
  const getAccentBorderClass = () => 'focus:border-emerald-500 focus:ring-emerald-500/20';

  // Get unique months from journals
  const availableMonths = Array.from(new Set(notes.map(note => {
    try {
      const date = new Date(note.date);
      return date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  }))).filter(Boolean);

  // Filter journals
  const filteredNotes = notes.filter(note => {
    const student = students.find(s => s.id === note.studentId);
    const studentName = student ? student.name : '';
    
    const matchesSearch = 
      note.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStudent = selectedStudentId === 'All' || note.studentId === selectedStudentId;
    
    let noteMonth = '';
    try {
      noteMonth = new Date(note.date).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    } catch (_) {}
    
    const matchesMonth = selectedMonth === 'All' || noteMonth === selectedMonth;

    return matchesSearch && matchesStudent && matchesMonth;
  });

  // Calculate stats
  const totalLessons = filteredNotes.length;
  const uniqueStudents = new Set(filteredNotes.map(n => n.studentId)).size;
  const totalDuration = totalLessons * 60; // Estimate 60 minutes per lesson

  const handleSendWhatsApp = (note: TeacherNote) => {
    const student = students.find(s => s.id === note.studentId);
    if (!student) return;
    
    const message = `Halo Ibu/Bapak *${student.parentName}*,\n\nIni adalah *Catatan Harian Belajar* ananda *${student.name}* hari ini di les privat *Math Fingers*:\n\n📅 Tanggal: ${note.date}\n📚 Topik Belajar: *${note.topic}*\n📝 Catatan Guru: "${note.content}"\n\n_Mari dampingi ananda melatih gerakan jarinya di rumah ya Bapak/Ibu! Berhitung Cepat & Akurat Tanpa Alat!_ ⚡\n\nSalam Hangat,\n*${note.teacherName}* - Math Fingers`;
    
    const link = getWhatsAppLink(student.parentPhone, message);
    window.open(link, '_blank', 'noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
            <History className="text-emerald-500" />
            <span>Riwayat Jurnal Mengajar</span>
          </h2>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>Daftar arsip lengkap aktivitas belajar-mengajar guru dan catatan kemajuan siswa.</p>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border transition shadow-sm flex items-center gap-4 ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <BookOpen size={24} />
          </div>
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Total Sesi Mengajar</div>
            <div className="text-2xl font-black font-mono mt-0.5">{totalLessons}</div>
            <div className={`text-[10px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>Jurnal tersimpan</div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition shadow-sm flex items-center gap-4 ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <User size={24} />
          </div>
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Siswa Terjangkau</div>
            <div className="text-2xl font-black font-mono mt-0.5">{uniqueStudents}</div>
            <div className={`text-[10px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>Dari total {students.length} siswa aktif</div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition shadow-sm flex items-center gap-4 ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
            <Clock size={24} />
          </div>
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Estimasi Jam Belajar</div>
            <div className="text-2xl font-black font-mono mt-0.5">{Math.round(totalDuration / 60)} Jam</div>
            <div className={`text-[10px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>Akumulasi durasi belajar</div>
          </div>
        </div>
      </div>

      {/* Filtering and Search Controls */}
      <div className={`p-4 rounded-2xl border ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari fokus materi, catatan, atau siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
              }`}
            />
          </div>

          {/* Student Filter */}
          <div className="relative">
            <User className="absolute left-3 top-3.5 text-slate-400" size={16} />
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
              }`}
            >
              <option value="All">Semua Siswa</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-3.5 text-slate-400" size={16} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 ${getAccentBorderClass()} ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
              }`}
            >
              <option value="All">Semua Bulan</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Timeline of Teacher Notes */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border ${
            isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            <History size={44} className="mx-auto text-slate-650 mb-3" />
            <p className="font-medium text-slate-400">Tidak ada riwayat jurnal mengajar</p>
            <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map((note) => {
              const student = students.find(s => s.id === note.studentId);
              
              return (
                <div 
                  key={note.id} 
                  className={`p-5 rounded-2xl border transition hover:shadow-md flex flex-col justify-between gap-4 ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Date and Student Details */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-sm text-emerald-500 flex items-center gap-1.5">
                          <Sparkles size={14} />
                          <span>{note.studentName}</span>
                        </div>
                        <div className={`text-xs flex items-center gap-1 mt-0.5 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          <Calendar size={11} />
                          <span>{note.date}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleSendWhatsApp(note)}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold"
                        title="Kirim Catatan Melalui WA"
                      >
                        <Send size={13} />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                    </div>

                    {/* Class Topic Focus */}
                    <div className={`p-3 rounded-xl border text-xs font-semibold ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-850 text-emerald-400'
                    }`}>
                      <span className={`mr-1.5 font-bold uppercase tracking-wider text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Fokus Kelas:</span>
                      {note.topic}
                    </div>

                    {/* Teacher Notes Content */}
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                      {note.content}
                    </p>
                  </div>

                  {/* Footer details like materials or levels */}
                  <div className={`border-t pt-3 flex items-center justify-between text-[10px] font-semibold ${isLight ? 'border-slate-150 text-slate-600' : 'border-slate-800 text-slate-500'}`}>
                    <div>
                      <span>Pengajar: {note.teacherName}</span>
                    </div>
                    {student?.level && (
                      <div className="flex items-center gap-1 text-blue-400 font-bold bg-blue-500/5 px-2 py-0.5 border border-blue-500/10 rounded-md">
                        <Award size={10} />
                        <span>{student.level}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
