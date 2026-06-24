import React, { useState } from 'react';
import { Student, Grade } from '../types';
import { getWhatsAppLink } from '../utils';
import { Award, Plus, Search, Calendar, Zap, Timer, Trash2, Send, AlertCircle } from 'lucide-react';

interface GradeManagerProps {
  students: Student[];
  grades: Grade[];
  onAddGrade: (data: Omit<Grade, 'id'>) => Promise<void>;
  onDeleteGrade: (id: string) => Promise<void>;
  theme?: string;
}

export function GradeManager({ 
  students, 
  grades, 
  onAddGrade, 
  onDeleteGrade,
  theme = 'dark'
}: GradeManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [topic, setTopic] = useState('');
  const [score, setScore] = useState(90);
  const [speedSeconds, setSpeedSeconds] = useState(15);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const activeStudents = students.filter(s => s.status === 'active');

  // Badge calculator based on accuracy and speed
  const getAgilityBadge = (sc: number, sp: number) => {
    if (sc >= 90 && sp <= 12) {
      return { text: 'Kilat Akurat ⚡🏆', style: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-550/20' };
    }
    if (sc >= 90 && sp <= 20) {
      return { text: 'Master Akurasi 🎯', style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    }
    if (sc < 90 && sp <= 12) {
      return { text: 'Kecepatan Tinggi 🏎️', style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
    }
    return { text: 'Praktisi Jari 👍', style: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
  };

  const handleOpenForm = () => {
    setSelectedStudentId(activeStudents[0]?.id || '');
    setTopic('');
    setScore(90);
    setSpeedSeconds(15);
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !topic.trim() || score < 0 || speedSeconds <= 0) {
      alert('Mohon isi data nilai dengan benar!');
      return;
    }

    const studentObj = students.find(s => s.id === selectedStudentId);
    if (!studentObj) return;

    await onAddGrade({
      studentId: selectedStudentId,
      studentName: studentObj.name,
      date,
      topic,
      score,
      speedSeconds,
      notes
    });

    setIsFormOpen(false);
  };

  const handleDelete = async (id: string, topicName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus nilai topik "${topicName}"?`)) {
      await onDeleteGrade(id);
    }
  };

  const sendWhatsAppGrade = (grade: Grade) => {
    const student = students.find(s => s.id === grade.studentId);
    if (!student) return;

    const badge = getAgilityBadge(grade.score, grade.speedSeconds).text;
    const optionalNotes = grade.notes.trim() ? `\n\n_Catatan Guru: "${grade.notes}"_` : '';

    const message = `Halo Ibu/Bapak *${student.parentName}*,\n\nKabar gembira! 🎉 Ananda *${student.name}* baru saja menyelesaikan sesi latihan uji berhitung cepat *Math Finggers*:\n\n📚 Materi Uji: *${grade.topic}*\n🎯 Skor Akurasi: *${grade.score} / 100*\n⚡ Kecepatan Berhitung: *${grade.speedSeconds} detik*\n🏆 Lencana Kelincahan: *${badge}*${optionalNotes}\n\n_Sungguh perkembangan yang luar biasa! Mari terus semangati ananda untuk menggerakkan jarinya setiap hari agar makin terampil. Berhitung cepat tanpa alat hanya sekejap!_ ⚡🌟\n\nSalam Hangat,\n*Tim Math Finggers*`;

    const waLink = getWhatsAppLink(student.parentPhone, message);
    window.open(waLink, '_blank', 'noreferrer');
  };

  // Filter list
  const filteredGrades = grades.filter(grade => {
    const matchesSearch = grade.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          grade.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStudent = studentFilter === 'All' || grade.studentId === studentFilter;
    return matchesSearch && matchesStudent;
  });

  const isLight = theme === 'light';

  return (
    <div id="grade-manager-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Input Nilai & Uji Kecepatan</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Rekam akurasi jawaban dan kecepatan berhitung (detik) siswa untuk mengukur kelincahan otak.</p>
        </div>
        
        <button
          id="btn-add-grade"
          onClick={handleOpenForm}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl transition duration-150 shadow-sm"
        >
          <Award size={18} />
          <span>Input Nilai Baru</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className={`p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-4 items-center ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
          <input
            id="grade-search-input"
            type="text"
            placeholder="Cari materi uji atau nama siswa..."
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
            id="filter-grade-student"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-755' 
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Semua Siswa</option>
            {students.map(s => (
              <option key={s.id} value={s.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grade Form dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-lg shadow-2xl border ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800 text-white'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Input Nilai & Kecepatan Uji</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white font-medium text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Siswa *</label>
                {activeStudents.length === 0 ? (
                  <p className="text-sm text-amber-500 flex items-center gap-1"><AlertCircle size={15} /> Tidak ada siswa aktif.</p>
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

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Materi / Bab Uji Kompetensi *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Penjumlahan Kombinasi 5 (+4, +3)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Skor Akurasi (0 - 100) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Durasi Selesai (Detik) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={speedSeconds}
                    onChange={(e) => setSpeedSeconds(Number(e.target.value))}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Ujian *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800 font-medium' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Catatan Tambahan</label>
                  <input
                    type="text"
                    placeholder="Sangat cepat, fokus tinggi"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
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
                  Simpan Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grades list table */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {filteredGrades.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Award size={44} className="mx-auto text-slate-600 mb-3" />
            <p className="font-medium text-slate-400">Belum ada rekaman nilai latihan</p>
            <p className="text-xs text-slate-500 mt-1">Gunakan tombol diatas untuk mulai merekam skor ujian siswa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <th className="p-4">Siswa</th>
                  <th className="p-4">Materi Uji</th>
                  <th className="p-4">Skor Akurasi</th>
                  <th className="p-4">Kecepatan</th>
                  <th className="p-4">Lencana Refleks</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                {filteredGrades.map((grade) => {
                  const badge = getAgilityBadge(grade.score, grade.speedSeconds);
                  return (
                    <tr key={grade.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20'}`}>
                      <td className={`p-4 font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        {grade.studentName}
                      </td>
                      <td className="p-4">
                        <div className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{grade.topic}</div>
                        {grade.notes && <div className="text-xs text-slate-500 italic">"{grade.notes}"</div>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Zap size={14} className="text-amber-500 fill-amber-500/10" />
                          <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{grade.score} / 100</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 font-mono text-slate-500 dark:text-slate-300">
                          <Timer size={14} className="text-slate-400" />
                          <span>{grade.speedSeconds} detik</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full border ${badge.style}`}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{grade.date}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => sendWhatsAppGrade(grade)}
                            className="p-2 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Kirim Nilai WA"
                          >
                            <Send size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(grade.id, grade.topic)}
                            className="p-2 text-slate-500 hover:text-rose-550 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Hapus Nilai"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
